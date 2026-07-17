import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                username: true,
                elo: true,
                wins: true,
                losses: true,
            },
            orderBy: { elo: 'desc' },
            skip,
            take: limit,
        }),
        prisma.user.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const players = users.map((u, i) => {
        const totalGames = u.wins + u.losses;
        return {
            position: skip + i + 1,
            username: u.username,
            elo: u.elo,
            wins: u.wins,
            losses: u.losses,
            winrate: totalGames > 0 ? Math.round((u.wins / totalGames) * 100) : 0,
            total: totalGames,
        };
    });

    return NextResponse.json({ players, total, page, totalPages });
}
