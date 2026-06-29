import { prisma } from './prisma';

const GAME_SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 60_000;
const INVITE_TIMEOUT_MS = 30_000;
const MATCH_TIMEOUT_MS = 900_000;

type QueueType = 'quickplay' | 'ranked';

export type ActiveMatchInfo = {
    gameId: string;
    userIds: string[];
    type: QueueType;
    isRanked: boolean;
};

// Solo para invitaciones: necesitamos cancelar el timeout al aceptar
const inviteTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function emitToUser(userId: string, event: string, data: unknown) {
    const doFetch = () => fetch(`${GAME_SERVER}/__emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, event, data }),
    });
    doFetch().catch(() => setTimeout(() => doFetch().catch(() => {}), 500));
}

function generateGameId(): string {
    return crypto.randomUUID().slice(0, 8);
}

// ─── Colas ───

export async function joinQueue(userId: string, type: QueueType): Promise<
    | { status: 'searching'; position: number }
    | { status: 'matched'; gameId: string; opponent?: { username: string; elo: number } }
> {
    // Limpiar entrada previa del usuario y MatchSessions huérfanas
    await prisma.queueEntry.deleteMany({ where: { userId } });
    const orphanCutoff = new Date(Date.now() - MATCH_TIMEOUT_MS);
    await prisma.matchSession.deleteMany({ where: { matchedAt: { lt: orphanCutoff } } });

    // Verificar si ya está en un match activo
    const alreadyMatched = await prisma.matchSession.findFirst({
        where: { players: { some: { userId } } },
    });
    if (alreadyMatched) {
        return { status: 'matched', gameId: alreadyMatched.gameId };
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, elo: true },
    });
    if (!user) throw new Error('User not found');

    const now = Date.now();
    const joinedAt = new Date(now);

    // Buscar oponente
    const candidate = await findMatchInDB(userId, type, user.elo, joinedAt);

    if (candidate) {
        const gameId = generateGameId();

        const raceLost = await prisma.$transaction(async (tx) => {
            const deleted = await tx.queueEntry.deleteMany({ where: { userId: candidate.userId } });
            if (deleted.count === 0) return true;
            await tx.queueEntry.deleteMany({ where: { userId } });
            await tx.matchSession.create({
                data: {
                    gameId,
                    userIds: [userId, candidate.userId],
                    type,
                    isRanked: type === 'ranked',
                    matchedAt: joinedAt,
                    players: {
                        create: [
                            { userId },
                            { userId: candidate.userId },
                        ],
                    },
                },
            });
            return false;
        });

        if (raceLost) {
            await prisma.queueEntry.create({
                data: { userId, username: user.username, elo: user.elo, type },
            });
            const position = await prisma.queueEntry.count({ where: { type, joinedAt: { lte: joinedAt } } });
            return { status: 'searching', position };
        }

        emitToUser(userId, 'match_found', {
            gameId,
            opponent: { username: candidate.username, elo: candidate.elo },
        });
        emitToUser(candidate.userId, 'match_found', {
            gameId,
            opponent: { username: user.username, elo: user.elo },
        });

        return {
            status: 'matched',
            gameId,
            opponent: { username: candidate.username, elo: candidate.elo },
        };
    }

    // No hay oponente — entrar en cola
    await prisma.queueEntry.create({
        data: { userId, username: user.username, elo: user.elo, type },
    });

    const position = await prisma.queueEntry.count({ where: { type, joinedAt: { lte: joinedAt } } });
    return { status: 'searching', position };
}

async function findMatchInDB(
    userId: string,
    type: QueueType,
    elo: number,
    now: Date,
): Promise<{ userId: string; username: string; elo: number } | null> {
    const cutoff = new Date(now.getTime() - TIMEOUT_MS);

    const candidates = await prisma.queueEntry.findMany({
        where: {
            type,
            userId: { not: userId },
            joinedAt: { gte: cutoff },
        },
        orderBy: { joinedAt: 'asc' },
    });

    if (candidates.length === 0) return null;

    if (type === 'quickplay') {
        return candidates[0];
    }

    // Ranked: filtrar por margen ELO progresivo según tiempo esperando del candidato
    for (const c of candidates) {
        const cElapsed = (now.getTime() - c.joinedAt.getTime()) / 1000;
        const margin = Math.min(50 + Math.floor(cElapsed / 5) * 50, 300);
        if (Math.abs(c.elo - elo) <= margin) {
            return c;
        }
    }

    return null;
}

export async function getQueueStatus(userId: string): Promise<
    | { status: 'searching'; queueLength: number; elapsed: number }
    | { status: 'matched'; gameId: string; opponent?: { username: string; elo: number } }
    | { status: 'timeout' }
> {
    // Limpiar entradas expiradas y MatchSessions huérfanas
    const cutoff = new Date(Date.now() - TIMEOUT_MS);
    await prisma.queueEntry.deleteMany({ where: { joinedAt: { lt: cutoff } } });
    const matchCutoff = new Date(Date.now() - MATCH_TIMEOUT_MS);
    await prisma.matchSession.deleteMany({ where: { matchedAt: { lt: matchCutoff } } });

    const matched = await prisma.matchSession.findFirst({
        where: { players: { some: { userId } } },
    });
    if (matched) {
        return { status: 'matched', gameId: matched.gameId };
    }

    const entry = await prisma.queueEntry.findUnique({ where: { userId } });
    if (!entry) return { status: 'timeout' };

    const elapsed = Math.floor((Date.now() - entry.joinedAt.getTime()) / 1000);
    if (elapsed >= TIMEOUT_MS / 1000) {
        await prisma.queueEntry.deleteMany({ where: { userId } });
        return { status: 'timeout' };
    }

    const queueLength = await prisma.queueEntry.count({ where: { type: entry.type } });
    return { status: 'searching', queueLength, elapsed };
}

export async function leaveQueue(userId: string): Promise<void> {
    await prisma.queueEntry.deleteMany({ where: { userId } });
}

export async function confirmGameStarted(gameId: string): Promise<boolean> {
    const existing = await prisma.matchSession.findUnique({ where: { gameId } });
    if (!existing) return false;
    // El MatchSession se limpia on-read en joinQueue/getQueueStatus.
    // Ya no dependemos de él para el reporte (steps 1-2).
    return true;
}

// ─── Invitaciones ───

export async function createInvite(inviterId: string, invitedUsername: string): Promise<
    { status: 'invited'; gameId: string }
    | { status: 'error'; message: string }
> {
    const invited = await prisma.user.findUnique({
        where: { username: invitedUsername },
        select: { id: true },
    });
    if (!invited) return { status: 'error', message: 'Usuario no encontrado' };
    if (invited.id === inviterId) return { status: 'error', message: 'No puedes invitarte a ti mismo' };

    // Limpiar MatchSessions huérfanas
    const orphanCutoff = new Date(Date.now() - MATCH_TIMEOUT_MS);
    await prisma.matchSession.deleteMany({ where: { matchedAt: { lt: orphanCutoff } } });

    // Verificar match activo o cola
    const existingMatch = await prisma.matchSession.findFirst({
        where: {
            players: {
                some: { userId: { in: [inviterId, invited.id] } },
            },
        },
    });
    if (existingMatch) return { status: 'error', message: 'Uno de los jugadores ya está en una partida' };

    const inQueueCheck = await prisma.queueEntry.findMany({
        where: { userId: { in: [inviterId, invited.id] } },
    });
    if (inQueueCheck.length > 0) {
        return { status: 'error', message: 'Uno de los jugadores está en cola de matchmaking' };
    }

    const gameId = generateGameId();

    const inviter = await prisma.user.findUnique({
        where: { id: inviterId },
        select: { username: true },
    });

    const pendingInvite = await prisma.$transaction(async (tx) => {
        await tx.matchSession.create({
            data: {
                gameId,
                userIds: [inviterId, invited.id],
                type: 'quickplay',
                isRanked: false,
                players: {
                    create: [
                        { userId: inviterId },
                        { userId: invited.id },
                    ],
                },
            },
        });
        return await tx.pendingInvite.create({
            data: {
                inviterId,
                inviterName: inviter?.username ?? 'Desconocido',
                invitedId: invited.id,
                gameId,
            },
        });
    });

    emitToUser(invited.id, 'invite', {
        id: pendingInvite.id,
        inviterName: inviter?.username ?? 'Desconocido',
        gameId,
    });

    const timeoutId = setTimeout(async () => {
        await prisma.pendingInvite.deleteMany({ where: { gameId } }).catch(() => {});
        await prisma.matchSession.deleteMany({ where: { gameId } }).catch(() => {});
        emitToUser(invited.id, 'invite_cancelled', { inviteId: pendingInvite.id });
        inviteTimeouts.delete(`invite:${pendingInvite.id}`);
    }, INVITE_TIMEOUT_MS);
    inviteTimeouts.set(`invite:${pendingInvite.id}`, timeoutId);

    return { status: 'invited', gameId };
}

export async function getPendingInvites(userId: string): Promise<{ id: string; inviterName: string; gameId: string }[]> {
    const cutoff = new Date(Date.now() - INVITE_TIMEOUT_MS);
    await prisma.pendingInvite.deleteMany({ where: { createdAt: { lt: cutoff }, invitedId: userId } });

    const invites = await prisma.pendingInvite.findMany({
        where: { invitedId: userId },
        select: { id: true, inviterName: true, gameId: true },
    });
    return invites;
}

export async function acceptInvite(
    inviteId: string,
    userId: string,
    username?: string,
): Promise<{ status: 'accepted'; gameId: string } | { status: 'error'; message: string }> {
    // Limpiar huérfanos y verificar que el usuario no esté ya en partida o cola
    const matchCutoff = new Date(Date.now() - MATCH_TIMEOUT_MS);
    await prisma.matchSession.deleteMany({ where: { matchedAt: { lt: matchCutoff } } });

    const existingMatch = await prisma.matchSession.findFirst({
        where: { players: { some: { userId } } },
    });
    if (existingMatch) {
        return { status: 'error', message: 'Ya estás en una partida activa' };
    }
    const inQueue = await prisma.queueEntry.findUnique({ where: { userId } });
    if (inQueue) {
        return { status: 'error', message: 'Ya estás en cola de matchmaking' };
    }

    const invite = await prisma.$transaction(async (tx) => {
        const invite = await tx.pendingInvite.findUnique({ where: { id: inviteId } });
        if (!invite || invite.invitedId !== userId) return null;
        await tx.pendingInvite.delete({ where: { id: inviteId } });
        return invite;
    });

    if (!invite) {
        return { status: 'error', message: 'Invitación no encontrada o expirada' };
    }

    emitToUser(invite.inviterId, 'invite_accepted', {
        gameId: invite.gameId,
        invitedName: username ?? 'Desconocido',
    });

    const tid = inviteTimeouts.get(`invite:${invite.id}`);
    if (tid) { clearTimeout(tid); inviteTimeouts.delete(`invite:${invite.id}`); }

    return { status: 'accepted', gameId: invite.gameId };
}
