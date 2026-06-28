import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') ?? session.user.id;

    if (userId !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const skip = (page - 1) * limit;

    const [games, total] = await Promise.all([
        prisma.game.findMany({
            where: {
                OR: [{ player1Id: userId }, { player2Id: userId }],
            },
            include: {
                player1: { select: { id: true, username: true } },
                player2: { select: { id: true, username: true } },
                replay: { select: { gameId: true } },
                performances: { where: { playerId: userId }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.game.count({
            where: {
                OR: [{ player1Id: userId }, { player2Id: userId }],
            },
        }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = games.map((game) => {
        const isPlayer1 = game.player1Id === userId;
        const opponent = isPlayer1 ? game.player2 : game.player1;
        const won = game.winnerId === userId;
        const eloChange = calcEloChange(userId, game.player1Id, game.player2Id, game.winnerId, game.type);
        const perf = game.performances?.[0] ?? null;

        return {
            id: game.id,
            opponent: opponent.username,
            result: won ? 'victoria' : 'derrota',
            eloChange,
            type: game.type,
            date: game.createdAt.toISOString(),
            duration: game.duration,
            totalTurns: game.totalTurns,
            hasReplay: game.replay !== null,
            performance: perf ? {
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
            } : null,
        };
    });

    return NextResponse.json({ games: result, total, page, totalPages });
}

function calcEloChange(userId: string, p1Id: string, p2Id: string, winnerId: string | null, type: string): string | null {
    if (!winnerId || type !== 'ranked') return null;
    const won = winnerId === userId;
    const eloDiff = 16;
    return won ? `+${eloDiff}` : `-${eloDiff}`;
}
