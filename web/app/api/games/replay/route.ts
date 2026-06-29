import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    if (!gameId) {
        return NextResponse.json({ error: 'gameId es obligatorio' }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
            player1: { select: { id: true, username: true } },
            player2: { select: { id: true, username: true } },
            replay: true,
            identityStats: {
                select: { playerId: true, identityId: true },
            },
        },
    });

    if (!game) {
        return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }

    if (game.player1Id !== session.user.id && game.player2Id !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!game.replay) {
        return NextResponse.json({ error: 'Replay no disponible' }, { status: 404 });
    }

    const identityMap: Record<string, string> = {};
    for (const is of game.identityStats) {
        identityMap[is.playerId] = is.identityId;
    }

    return NextResponse.json({
        rngSeed: game.replay.rngSeed,
        actions: game.replay.actions,
        gameHistory: game.replay.gameHistory ?? [],
        playerMapping: { p1: game.player1.id, p2: game.player2.id },
        players: {
            [game.player1.id]: { username: game.player1.username, identityId: identityMap[game.player1.id] ?? null },
            [game.player2.id]: { username: game.player2.username, identityId: identityMap[game.player2.id] ?? null },
        },
    });
}
