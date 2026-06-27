import { prisma } from './prisma';

type QueueType = 'quickplay' | 'ranked';

type QueueEntry = {
    userId: string;
    username: string;
    elo: number;
    type: QueueType;
    joinedAt: number;
};

type ActiveMatch = {
    gameId: string;
    userIds: string[];
    type: QueueType;
    matchedAt: number;
};

type PendingInvite = {
    id: string;
    inviterId: string;
    inviterName: string;
    invitedId: string;
    gameId: string;
    createdAt: number;
};

const TIMEOUT_MS = 60_000;
const INVITE_TIMEOUT_MS = 30_000;

const quickplayQueue: QueueEntry[] = [];
const rankedQueue: QueueEntry[] = [];
const activeMatches: ActiveMatch[] = [];
const pendingInvites: PendingInvite[] = [];

function getQueue(type: QueueType): QueueEntry[] {
    return type === 'quickplay' ? quickplayQueue : rankedQueue;
}

function findMatch(entry: QueueEntry): QueueEntry | null {
    const queue = getQueue(entry.type);
    const elapsed = (Date.now() - entry.joinedAt) / 1000;

    const inQueue = queue.filter(
        (c) => c.userId !== entry.userId && Date.now() - c.joinedAt < TIMEOUT_MS
    );

    if (entry.type === 'quickplay') {
        return inQueue.sort((a, b) => a.joinedAt - b.joinedAt)[0] ?? null;
    }

    const margin = Math.min(50 + Math.floor(elapsed / 5) * 50, 300);
    const candidates = inQueue
        .filter((c) => Math.abs(c.elo - entry.elo) <= margin)
        .sort((a, b) => a.joinedAt - b.joinedAt);

    return candidates[0] ?? null;
}

function generateGameId(): string {
    return crypto.randomUUID().slice(0, 8);
}

export async function joinQueue(userId: string, type: QueueType): Promise<
    | { status: 'searching'; position: number }
    | { status: 'matched'; gameId: string; opponent?: { username: string; elo: number } }
> {
    const queue = getQueue(type);

    const existing = queue.find((e) => e.userId === userId);
    if (existing) {
        return { status: 'searching', position: queue.indexOf(existing) + 1 };
    }

    const alreadyMatched = activeMatches.find((m) => m.userIds.includes(userId));
    if (alreadyMatched) {
        return {
            status: 'matched',
            gameId: alreadyMatched.gameId,
        };
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, elo: true },
    });

    if (!user) throw new Error('User not found');

    const entry: QueueEntry = {
        userId,
        username: user.username,
        elo: user.elo,
        type,
        joinedAt: Date.now(),
    };

    const match = findMatch(entry);
    if (match) {
        queue.splice(queue.indexOf(match), 1);

        const gameId = generateGameId();
        const matched: ActiveMatch = {
            gameId,
            userIds: [entry.userId, match.userId],
            type,
            matchedAt: Date.now(),
        };
        activeMatches.push(matched);

        setTimeout(() => {
            const idx = activeMatches.indexOf(matched);
            if (idx !== -1) activeMatches.splice(idx, 1);
        }, 30_000);

        return {
            status: 'matched',
            gameId,
            opponent: { username: match.username, elo: match.elo },
        };
    }

    queue.push(entry);
    setTimeout(() => {
        const idx = queue.indexOf(entry);
        if (idx !== -1) queue.splice(idx, 1);
    }, TIMEOUT_MS);

    return { status: 'searching', position: queue.length };
}

export function getQueueStatus(userId: string):
    | { status: 'searching'; queueLength: number; elapsed: number }
    | { status: 'matched'; gameId: string; opponent?: { username: string; elo: number } }
    | { status: 'timeout' }
{
    const matched = activeMatches.find((m) => m.userIds.includes(userId));
    if (matched) {
        return { status: 'matched', gameId: matched.gameId };
    }

    const allQueues = [...quickplayQueue, ...rankedQueue];
    const entry = allQueues.find((e) => e.userId === userId);
    if (!entry) return { status: 'timeout' };

    const elapsed = Math.floor((Date.now() - entry.joinedAt) / 1000);
    if (elapsed >= TIMEOUT_MS / 1000) {
        const queue = getQueue(entry.type);
        const idx = queue.indexOf(entry as QueueEntry);
        if (idx !== -1) queue.splice(idx, 1);
        return { status: 'timeout' };
    }

    return {
        status: 'searching',
        queueLength: getQueue(entry.type).length,
        elapsed,
    };
}

export function leaveQueue(userId: string): void {
    for (const queue of [quickplayQueue, rankedQueue]) {
        const idx = queue.findIndex((e) => e.userId === userId);
        if (idx !== -1) {
            queue.splice(idx, 1);
            return;
        }
    }
}

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

    const inMatch = activeMatches.find((m) => m.userIds.includes(inviterId) || m.userIds.includes(invited.id));
    if (inMatch) return { status: 'error', message: 'Uno de los jugadores ya está en una partida' };

    const inQueueCheck = [...quickplayQueue, ...rankedQueue].find(
        (e) => e.userId === inviterId || e.userId === invited.id
    );
    if (inQueueCheck) return { status: 'error', message: 'Uno de los jugadores está en cola de matchmaking' };

    const gameId = generateGameId();
    const matched: ActiveMatch = {
        gameId,
        userIds: [inviterId, invited.id],
        type: 'quickplay',
        matchedAt: Date.now(),
    };
    activeMatches.push(matched);

    const inviter = await prisma.user.findUnique({
        where: { id: inviterId },
        select: { username: true },
    });

    const invite: PendingInvite = {
        id: crypto.randomUUID().slice(0, 8),
        inviterId,
        inviterName: inviter?.username ?? 'Desconocido',
        invitedId: invited.id,
        gameId,
        createdAt: Date.now(),
    };
    pendingInvites.push(invite);

    setTimeout(() => {
        const idx = pendingInvites.indexOf(invite);
        if (idx !== -1) {
            pendingInvites.splice(idx, 1);
            const matchIdx = activeMatches.indexOf(matched);
            if (matchIdx !== -1) activeMatches.splice(matchIdx, 1);
        }
    }, INVITE_TIMEOUT_MS);

    return { status: 'invited', gameId };
}

export function getPendingInvites(userId: string): PendingInvite[] {
    return pendingInvites.filter((i) => i.invitedId === userId);
}

export function acceptInvite(inviteId: string, userId: string): { status: 'accepted'; gameId: string } | { status: 'error'; message: string } {
    const idx = pendingInvites.findIndex((i) => i.id === inviteId && i.invitedId === userId);
    if (idx === -1) return { status: 'error', message: 'Invitación no encontrada o expirada' };

    const invite = pendingInvites[idx];
    pendingInvites.splice(idx, 1);

    return { status: 'accepted', gameId: invite.gameId };
}
