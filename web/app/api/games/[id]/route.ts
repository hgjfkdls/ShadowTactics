import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const game = await prisma.game.findUnique({
        where: { id },
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

    if (!game) {
        return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    if (game.player1Id !== session.user.id && game.player2Id !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const isRanked = game.type === 'ranked';
    let eloChanges: Record<string, { old: number; new: number; diff: number }> | null = null;

    if (isRanked && game.winnerId) {
        const eloDiff = 16;
        const p1Change = game.player1Id === game.winnerId ? eloDiff : -eloDiff;
        const p2Change = game.player2Id === game.winnerId ? eloDiff : -eloDiff;

        eloChanges = {
            [game.player1Id]: {
                old: game.player1.elo - p1Change,
                new: game.player1.elo,
                diff: p1Change,
            },
            [game.player2Id]: {
                old: game.player2.elo - p2Change,
                new: game.player2.elo,
                diff: p2Change,
            },
        };
    }

    const isPlayer1 = session.user.id === game.player1Id;

    return NextResponse.json({
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
    });
}
