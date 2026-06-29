import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { GameDetailClient } from '../GameDetailClient';

type PageProps = {
    params: Promise<{ gameId: string }>;
};

export default async function PartidaPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login');
    }

    const { gameId } = await params;

    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
            player1: { select: { id: true, username: true, elo: true } },
            player2: { select: { id: true, username: true, elo: true } },
            winner: { select: { id: true, username: true } },
            replay: { select: { gameId: true } },
            performances: {
                include: { player: { select: { id: true, username: true } } },
            },
            classStats: {
                include: { player: { select: { id: true, username: true } } },
                orderBy: [{ playerId: 'asc' }, { unitClass: 'asc' }],
            },
            identityStats: {
                include: { player: { select: { id: true, username: true } } },
                orderBy: [{ playerId: 'asc' }, { identityId: 'asc' }],
            },
        },
    });

    if (!game) notFound();

    if (game.player1Id !== session.user.id && game.player2Id !== session.user.id) {
        redirect('/');
    }

    const isRanked = game.type === 'ranked';
    let eloChanges: Record<string, { old: number; new: number; diff: number }> | null = null;

    if (isRanked && game.winnerId) {
        const eloDiff = 16;
        const p1Change = game.player1Id === game.winnerId ? eloDiff : -eloDiff;
        const p2Change = game.player2Id === game.winnerId ? eloDiff : -eloDiff;

        eloChanges = {
            [game.player1Id]: { old: game.player1.elo - p1Change, new: game.player1.elo, diff: p1Change },
            [game.player2Id]: { old: game.player2.elo - p2Change, new: game.player2.elo, diff: p2Change },
        };
    }

    const isPlayer1 = session.user.id === game.player1Id;

    const data: GameDetailData = {
        id: game.id,
        player1: { id: game.player1.id, username: game.player1.username, elo: game.player1.elo },
        player2: { id: game.player2.id, username: game.player2.username, elo: game.player2.elo },
        winnerId: game.winnerId,
        winner: game.winner?.username ?? null,
        result: game.winnerId ? (game.winnerId === session.user.id ? 'victoria' : 'derrota') : null,
        type: game.type as 'ranked' | 'quickplay',
        duration: game.duration,
        totalTurns: game.totalTurns,
        createdAt: game.createdAt.toISOString(),
        hasReplay: game.replay !== null,
        isPlayer1,
        eloChanges,
        performances: game.performances.map((p) => ({
            playerId: p.playerId,
            username: p.player.username,
            score: p.score,
            winBonus: p.winBonus,
            hitRate: p.hitRate,
            damageTradeRatio: p.damageTradeRatio,
            survivalRate: p.survivalRate,
            killParticipation: p.killParticipation,
            counterEfficiency: p.counterEfficiency,
            cardsPlayedPerTurn: p.cardsPlayedPerTurn,
            generalProtection: p.generalProtection,
            firstBlood: p.firstBlood,
            comeback: p.comeback,
        })),
        classStats: game.classStats.map((cs) => ({
            playerId: cs.playerId,
            username: cs.player.username,
            unitClass: cs.unitClass,
            count: cs.count,
            survived: cs.survived,
            attacksMade: cs.attacksMade,
            attacksHit: cs.attacksHit,
            attacksMissed: cs.attacksMissed,
            criticalHits: cs.criticalHits,
            counterAttacks: cs.counterAttacks,
            damageDealt: cs.damageDealt,
            damageReceived: cs.damageReceived,
            damageMitigated: cs.damageMitigated,
            counterDamage: cs.counterDamage,
            kills: cs.kills,
            killsByCounter: cs.killsByCounter,
            timesKilled: cs.timesKilled,
            totalMoves: cs.totalMoves,
            totalHexesMoved: cs.totalHexesMoved,
        })),
        identityStats: game.identityStats.map((is) => ({
            playerId: is.playerId,
            username: is.player.username,
            identityId: is.identityId,
            won: is.won,
            kills: is.kills,
            damageDealt: is.damageDealt,
            damageReceived: is.damageReceived,
            abilityUses: is.abilityUses,
            cardsPlayed: is.cardsPlayed,
        })),
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-bg-dark">
                <div className="mx-auto max-w-5xl px-4 py-8 mt-16">
                    <GameDetailClient data={data} gameId={gameId} />
                </div>
            </div>
            <Footer />
        </>
    );
}

export type GameDetailData = {
    id: string;
    player1: { id: string; username: string; elo: number };
    player2: { id: string; username: string; elo: number };
    winnerId: string | null;
    winner: string | null;
    result: 'victoria' | 'derrota' | null;
    type: 'ranked' | 'quickplay';
    duration: number | null;
    totalTurns: number | null;
    createdAt: string;
    hasReplay: boolean;
    isPlayer1: boolean;
    eloChanges: Record<string, { old: number; new: number; diff: number }> | null;
    performances: PerformanceEntry[];
    classStats: ClassStatEntry[];
    identityStats: IdentityStatEntry[];
};

export type PerformanceEntry = {
    playerId: string;
    username: string;
    score: number;
    winBonus: number;
    hitRate: number;
    damageTradeRatio: number;
    survivalRate: number;
    killParticipation: number;
    counterEfficiency: number;
    cardsPlayedPerTurn: number;
    generalProtection: number;
    firstBlood: number;
    comeback: number;
};

export type ClassStatEntry = {
    playerId: string;
    username: string;
    unitClass: string;
    count: number;
    survived: boolean;
    attacksMade: number;
    attacksHit: number;
    attacksMissed: number;
    criticalHits: number;
    counterAttacks: number;
    damageDealt: number;
    damageReceived: number;
    damageMitigated: number;
    counterDamage: number;
    kills: number;
    killsByCounter: number;
    timesKilled: number;
    totalMoves: number;
    totalHexesMoved: number;
};

export type IdentityStatEntry = {
    playerId: string;
    username: string;
    identityId: string;
    won: boolean;
    kills: number;
    damageDealt: number;
    damageReceived: number;
    abilityUses: number;
    cardsPlayed: number;
};
