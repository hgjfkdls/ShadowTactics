import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeCoins } from '@/lib/pricing';

const EXPECTED_API_KEY = process.env.REPORT_API_KEY ?? 'dev-key-change-me';

async function getStreak(userId: string): Promise<number> {
    const recent = await prisma.game.findMany({
        where: {
            OR: [{ player1Id: userId }, { player2Id: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { winnerId: true },
    });
    let streak = 0;
    for (const g of recent) {
        if (g.winnerId === userId) streak++;
        else break;
    }
    return streak;
}

async function isFirstGameToday(userId: string): Promise<boolean> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const count = await prisma.transaction.count({
        where: {
            userId,
            concept: { startsWith: 'Partida completada' },
            createdAt: { gte: today },
        },
    });
    return count === 0;
}

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== EXPECTED_API_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, winnerId, loserId, winnerScore, loserScore, isRanked } = body as {
        gameId: string;
        winnerId: string;
        loserId: string;
        winnerScore?: number;
        loserScore?: number;
        isRanked?: boolean;
    };

    if (!gameId || !winnerId || !loserId) {
        return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    const alreadyRewarded = await prisma.transaction.findFirst({
        where: { concept: `Partida completada:${gameId}` },
    });
    if (alreadyRewarded) {
        return NextResponse.json({ error: 'Partida ya recompensada' }, { status: 400 });
    }

    const [winnerStreak, loserStreak, winnerFirst, loserFirst] = await Promise.all([
        getStreak(winnerId),
        getStreak(loserId),
        isFirstGameToday(winnerId),
        isFirstGameToday(loserId),
    ]);

    const ranked = isRanked ?? false;

    const winnerCoins = computeCoins(true, winnerStreak, ranked, winnerFirst, winnerScore ?? 50);
    const loserCoins = computeCoins(false, loserStreak, ranked, loserFirst, loserScore ?? 50);

    const [winner, loser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: winnerId },
            data: { coins: { increment: winnerCoins } },
        }),
        prisma.user.update({
            where: { id: loserId },
            data: { coins: { increment: loserCoins } },
        }),
        prisma.transaction.create({
            data: {
                userId: winnerId,
                amount: winnerCoins,
                type: 'EARN',
                concept: `Partida completada:${gameId}`,
            },
        }),
        prisma.transaction.create({
            data: {
                userId: loserId,
                amount: loserCoins,
                type: 'EARN',
                concept: `Partida completada:${gameId}`,
            },
        }),
    ]);

    return NextResponse.json({
        status: 'ok',
        coins: {
            winner: { earned: winnerCoins, total: winner.coins },
            loser: { earned: loserCoins, total: loser.coins },
        },
    });
}
