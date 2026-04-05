import { useEffect, useState } from 'react';
import { socket } from '../net/socket';
import type { GameState, GameAction } from '@shared';

export function useGameState() {
    const [state, setState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        function onConnect() {
            setConnected(true);
        }

        function onDisconnect() {
            setConnected(false);
        }

        function onState(newState: GameState) {
            setState(newState);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('STATE', onState);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('STATE', onState);
        };
    }, []);

    function sendAction(action: GameAction) {
        socket.emit('ACTION', action);
    }

    return {
        connected,
        state,
        sendAction
    };
}
