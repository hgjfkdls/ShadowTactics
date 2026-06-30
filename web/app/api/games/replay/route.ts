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

    const typedActions = (game.replay.actions as { index: number; playerId: string; phase: string; turn: number; action: { type: string; unitId?: string; position?: { q: number; r: number }; playerId?: string } }[]) ?? [];

    // Computar initialDeployments desde las acciones DEPLOY_UNIT
    function getUnitClass(unitId: string): string {
        const match = unitId.match(/^u(\d+)$/);
        if (!match) return 'unknown';
        const n = parseInt(match[1], 10);
        if (n >= 1 && n <= 13) {
            if (n <= 3) return 'cavalry';
            if (n <= 6) return 'lancer';
            if (n <= 9) return 'infantry';
            if (n <= 12) return 'archer';
            return 'general';
        }
        if (n >= 14 && n <= 26) {
            if (n <= 16) return 'cavalry';
            if (n <= 19) return 'lancer';
            if (n <= 22) return 'infantry';
            if (n <= 25) return 'archer';
            return 'general';
        }
        return 'unknown';
    }

    const initialDeployments = typedActions
        .filter(a => a.action?.type === 'DEPLOY_UNIT')
        .map(a => ({
            unitId: a.action.unitId ?? '',
            unitClass: getUnitClass(a.action.unitId ?? ''),
            playerId: a.playerId,
            q: a.action.position?.q ?? 0,
            r: a.action.position?.r ?? 0,
        }));

    const lastAction = typedActions[typedActions.length - 1]?.action as { type?: string; reason?: string; winner?: string } | undefined;
    const gameOver = lastAction?.type === 'GAME_OVER'
        ? { reason: lastAction.reason ?? 'general_killed', winner: lastAction.winner }
        : null;

    // Extraer resultado de dados desde gameHistory
    const diceResults = (game.replay.gameHistory as Array<{ type: string; phaseName?: string; details?: string }>)
        ?.filter(e => e.type === 'phase' && e.phaseName === 'roll')
        .map(e => e.details)
        .filter(Boolean) ?? [];

    return NextResponse.json({
        rngSeed: game.replay.rngSeed,
        actions: typedActions,
        gameHistory: game.replay.gameHistory ?? [],
        initialDeployments,
        diceResults,
        playerMapping: { p1: game.player1.id, p2: game.player2.id },
        players: {
            [game.player1.id]: { username: game.player1.username, identityId: identityMap[game.player1.id] ?? null },
            [game.player2.id]: { username: game.player2.username, identityId: identityMap[game.player2.id] ?? null },
        },
        totalTurns: game.totalTurns,
        duration: game.duration,
        gameOver,
    });
}
