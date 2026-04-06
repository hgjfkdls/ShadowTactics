import { debugStore } from '@client/debug/DebugStore';
import { GameAction } from '@shared';
import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000',
    {
        autoConnect: true
    }
);

socket.on('connect', () => {
    debugStore.add({
        type: 'SOCKET_CONNECT',
        time: Date.now(),
    });
});

export function sendAction(action: GameAction) {
    debugStore.add({
        type: 'ACTION_SENT',
        action,
        time: Date.now(),
    });

    socket.emit('ACTION', action);
}
