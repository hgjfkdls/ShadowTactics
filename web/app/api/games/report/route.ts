import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EXPECTED_API_KEY = process.env.REPORT_API_KEY ?? 'dev-key-change-me';

function eloExpected(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function eloChange(current: number, expected: number, won: boolean): number {
    return Math.round(current + 32 * ((won ? 1 : 0) - expected));
}

type ReportBody = {
    gameId: string;
    winnerId: string;
    player1Id: string;
    player2Id: string;
    type: 'quickplay' | 'ranked';
    rngSeed: number;
    actions: { index: number; playerId: string; phase: string; turn: number; action: object }[];
    gameHistory?: unknown[];
    duration: number;
    totalTurns: number;
    deployment: Record<string, { unitId: string; class: string; q: number; r: number; step: number }[]>;
    classStats: Record<string, {
        unitClass: string;
        count: number; survived: boolean;
        attacksMade: number; attacksHit: number; attacksMissed: number;
        criticalHits: number; counterAttacks: number;
        damageDealt: number; damageReceived: number;
        damageMitigated: number; counterDamage: number;
        kills: number; killsByCounter: number; timesKilled: number;
        totalMoves: number; totalHexesMoved: number;
        actionLog?: object[]; deployment?: object[];
    }[]>;
    identityStats: Record<string, {
        identityId: string;
        kills: number; damageDealt: number; damageReceived: number;
        abilityUses: number; cardsPlayed: number;
    }>;
    performance: Record<string, {
        score: number; winBonus: number; hitRate: number;
        damageTradeRatio: number; survivalRate: number; killParticipation: number;
        counterEfficiency: number; cardsPlayedPerTurn: number;
        generalProtection: number; firstBlood: number; comeback: number;
    }>;
};

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== EXPECTED_API_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: ReportBody;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { gameId, winnerId, player1Id, player2Id, type, rngSeed, actions, gameHistory, duration, totalTurns, deployment, classStats, identityStats, performance } = body;

    if (!gameId || !winnerId || !player1Id || !player2Id || !type || rngSeed === undefined || !actions?.length) {
        return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    if (type !== 'quickplay' && type !== 'ranked') {
        return NextResponse.json({ error: 'type debe ser quickplay o ranked' }, { status: 400 });
    }

    const userIds = [player1Id, player2Id];
    if (!userIds.includes(winnerId)) {
        return NextResponse.json({ error: 'winnerId no pertenece a esta partida' }, { status: 400 });
    }

    const existing = await prisma.game.findUnique({ where: { id: gameId } });
    if (existing) {
        return NextResponse.json({ error: 'Partida ya reportada' }, { status: 400 });
    }

    const loserId = player1Id === winnerId ? player2Id : player1Id;
    const isRanked = type === 'ranked';

    let eloChanges: { ganador: { old: number; new: number }; perdedor: { old: number; new: number } } | undefined;

    await prisma.$transaction(async (tx) => {
        const game = await tx.game.create({
            data: {
                id: gameId,
                player1Id: userIds[0],
                player2Id: userIds[1],
                winnerId,
                rngSeed,
                type,
                duration,
                totalTurns,
            },
        });

        await tx.gameReplay.create({
            data: {
                gameId: game.id,
                rngSeed,
                actions,
                gameHistory: (gameHistory ?? []) as object,
            },
        });

        for (const [playerId, stats] of Object.entries(classStats)) {
            for (const stat of stats) {
                await tx.gameClassStats.create({
                    data: {
                        gameId: game.id,
                        playerId,
                        unitClass: stat.unitClass,
                        count: stat.count,
                        survived: stat.survived,
                        attacksMade: stat.attacksMade,
                        attacksHit: stat.attacksHit,
                        attacksMissed: stat.attacksMissed,
                        criticalHits: stat.criticalHits,
                        counterAttacks: stat.counterAttacks,
                        damageDealt: stat.damageDealt,
                        damageReceived: stat.damageReceived,
                        damageMitigated: stat.damageMitigated,
                        counterDamage: stat.counterDamage,
                        kills: stat.kills,
                        killsByCounter: stat.killsByCounter,
                        timesKilled: stat.timesKilled,
                        totalMoves: stat.totalMoves,
                        totalHexesMoved: stat.totalHexesMoved,
                        actionLog: stat.actionLog ?? undefined,
                        deployment: stat.deployment ?? undefined,
                    },
                });
            }
        }

        const playerIds = Object.keys(identityStats);
        for (const playerId of playerIds) {
            const idStat = identityStats[playerId];
            await tx.gameIdentityStats.create({
                data: {
                    gameId: game.id,
                    playerId,
                    identityId: idStat.identityId,
                    won: playerId === winnerId,
                    kills: idStat.kills,
                    damageDealt: idStat.damageDealt,
                    damageReceived: idStat.damageReceived,
                    abilityUses: idStat.abilityUses,
                    cardsPlayed: idStat.cardsPlayed,
                },
            });
        }

        if (performance) {
            for (const [playerId, perf] of Object.entries(performance)) {
                await tx.gamePlayerPerformance.create({
                    data: {
                        gameId: game.id,
                        playerId,
                        score: perf.score,
                        winBonus: perf.winBonus,
                        hitRate: perf.hitRate,
                        damageTradeRatio: perf.damageTradeRatio,
                        survivalRate: perf.survivalRate,
                        killParticipation: perf.killParticipation,
                        counterEfficiency: perf.counterEfficiency,
                        cardsPlayedPerTurn: perf.cardsPlayedPerTurn,
                        generalProtection: perf.generalProtection,
                        firstBlood: perf.firstBlood,
                        comeback: perf.comeback,
                    },
                });
            }
        }

        if (isRanked) {
            const winner = await tx.user.findUnique({ where: { id: winnerId }, select: { elo: true } });
            const loser = await tx.user.findUnique({ where: { id: loserId }, select: { elo: true } });
            if (!winner || !loser) throw new Error('Usuario no encontrado');

            const winnerExpected = eloExpected(winner.elo, loser.elo);
            const loserExpected = eloExpected(loser.elo, winner.elo);

            const newWinnerElo = eloChange(winner.elo, winnerExpected, true);
            const newLoserElo = eloChange(loser.elo, loserExpected, false);

            await tx.user.update({
                where: { id: winnerId },
                data: { elo: newWinnerElo, wins: { increment: 1 } },
            });
            await tx.user.update({
                where: { id: loserId },
                data: { elo: newLoserElo, losses: { increment: 1 } },
            });

            eloChanges = {
                ganador: { old: winner.elo, new: newWinnerElo },
                perdedor: { old: loser.elo, new: newLoserElo },
            };
        } else {
            await tx.user.update({
                where: { id: winnerId },
                data: { wins: { increment: 1 } },
            });
            await tx.user.update({
                where: { id: loserId },
                data: { losses: { increment: 1 } },
            });
        }
    });

    await prisma.matchSession.deleteMany({ where: { gameId } });

    return NextResponse.json({
        status: 'ok',
        eloChanges,
    });
}
