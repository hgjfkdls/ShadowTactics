import { useEffect, useState } from 'react';
import { socket } from '../net/socket';
import type { GameState, GameAction } from '@shared';
import { debugStore } from '../debug/DebugStore';
import { PlayerRole } from '@server/GameRoom';

export function useGameState() {
    const [connected, setConnected] = useState(false);
    const [gameId, setGameId] = useState<string | null>(null);
    const [role, setRole] = useState<PlayerRole | null>(null);
    const [state, setState] = useState<GameState | null>(null);

    useEffect(() => {
        function onConnect() {
            debugStore.add({
                type: 'SOCKET_CONNECT',
                time: Date.now(),
            });
            setConnected(true);
        }

        function onLeftGame() {
            setGameId(null);
            setRole(null);
            setState(null);
        }

        function onDisconnect() {
            setConnected(false);
            setRole(null);
            setState(null);
        }

        function onRole(payload: PlayerRole) {
            setRole(payload);
        }

        function onState(newState: GameState) {
            debugStore.add({
                type: 'STATE_RECEIVED',
                state: newState,
                time: Date.now(),
            });
            setState(newState);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('ROLE', onRole);
        socket.on('STATE', onState);
        socket.on('LEFT_GAME', onLeftGame);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('ROLE', onRole);
            socket.off('STATE', onState);
            socket.off('LEFT_GAME', onLeftGame);
        };
    }, []);

    function joinGame(newGameId: string) {
        if (!newGameId.trim()) return;

        setGameId(newGameId);

        socket.emit('JOIN_GAME', {
            gameId: newGameId,
        });
    }

    function leaveGame() {
        if (!gameId) return;

        socket.emit('LEAVE_GAME', { gameId });

        setGameId(null);
        setRole(null);
        setState(null);
        debugStore.clear();
    }

    function sendAction(action: GameAction) {
        if (!gameId) return;
        if (!role || role.role !== 'player') return;
        if (!state) return;


        if (state.activePlayer !== role.playerId) {
            console.warn(
                `Acción bloqueada: no es tu turno (${role.playerId})`
            );
            return;
        }

        debugStore.add({
            type: 'ACTION_SENT',
            action,
            time: Date.now(),
        });

        socket.emit('ACTION', {
            gameId,
            action,
            playerId: role.playerId,
        });
    }

    return {
        connected,

        gameId,
        role,
        isPlayer: role?.role === 'player',
        playerId: role?.role === 'player' ? role.playerId : null,

        state,

        joinGame,
        leaveGame,
        sendAction,
    };
}