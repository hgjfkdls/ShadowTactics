'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

type WSEvents = {
    onInvite?: (data: { id: string; inviterName: string; gameId: string }) => void;
    onInviteCancelled?: (data: { inviteId: string }) => void;
    onInviteAccepted?: (data: { gameId: string; invitedName: string }) => void;
    onMatchFound?: (data: { gameId: string; opponent?: { username: string; elo: number } }) => void;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3000';

export function useSocket(handlers: WSEvents) {
    const { data: session } = useSession();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!session?.user?.id) return;

        let cancelled = false;

        fetch('/api/socket/token')
            .then((r) => r.json())
            .then((data) => {
                if (cancelled || !data.token) return;

                const socket = io(WS_URL, {
                    auth: { token: data.token },
                    reconnection: true,
                    reconnectionDelay: 2000,
                });

                socket.on('connect', () => setConnected(true));
                socket.on('disconnect', () => setConnected(false));

                if (handlers.onInvite) socket.on('invite', handlers.onInvite);
                if (handlers.onInviteCancelled) socket.on('invite_cancelled', handlers.onInviteCancelled);
                if (handlers.onInviteAccepted) socket.on('invite_accepted', handlers.onInviteAccepted);
                if (handlers.onMatchFound) socket.on('match_found', handlers.onMatchFound);

                socketRef.current = socket;
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [session?.user?.id]);

    return { connected };
}
