import { useEffect, useState } from 'react';
import { socket } from '../net/socket';
import type { GameState, GameAction } from '@shared';
import type { TimerInfo } from '@shared/game/timer';
import { l } from '@shared/i18n';
import { debugStore } from '../debug/DebugStore';
import { PlayerRole } from '@server/GameRoom';

export function useGameState() {
    const [connected, setConnected] = useState(false);

    const [gameId, setGameId] = useState<string | null>(null);
    const [role, setRole] = useState<PlayerRole | null>(null);
    const [bothPlayersReady, setBothPlayersReady] = useState(false);

    const [state, setState] = useState<GameState | null>(null);
    const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null);
    const [opponentDisconnectedAt, setOpponentDisconnectedAt] = useState<number | null>(null);
    const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
    const [pausedTimerInfo, setPausedTimerInfo] = useState<TimerInfo | null>(null);

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
            setBothPlayersReady(false);
        }

        function onDisconnect() {
            setConnected(false);
            setRole(null);
            setState(null);
            setBothPlayersReady(false);
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

        function onBothPlayersReady() {
            setBothPlayersReady(true);
        }

        function onOpponentDisconnected(payload: { playerId: string }) {
            setOpponentDisconnectedAt(Date.now());
        }

        function onOpponentReconnected() {
            setOpponentDisconnectedAt(null);
        }

        function onTimer(payload: { active: TimerInfo | null; paused: TimerInfo | null }) {
            setTimerInfo(payload.active);
            setPausedTimerInfo(payload.paused);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('ROLE', onRole);
        socket.on('STATE', onState);
        socket.on('LEFT_GAME', onLeftGame);
        socket.on('BOTH_PLAYERS_READY', onBothPlayersReady);
        socket.on('OPPONENT_DISCONNECTED', onOpponentDisconnected);
        socket.on('OPPONENT_RECONNECTED', onOpponentReconnected);
        socket.on('TIMER', onTimer);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('ROLE', onRole);
            socket.off('STATE', onState);
            socket.off('LEFT_GAME', onLeftGame);
            socket.off('BOTH_PLAYERS_READY', onBothPlayersReady);
            socket.off('OPPONENT_DISCONNECTED', onOpponentDisconnected);
            socket.off('OPPONENT_RECONNECTED', onOpponentReconnected);
            socket.off('TIMER', onTimer);
        };
    }, []);

    function joinGame(newGameId: string, userId?: string, matchType?: string) {
        if (!newGameId.trim()) return;

        setGameId(newGameId);

        socket.emit('JOIN_GAME', {
            gameId: newGameId,
            userId,
            matchType,
        });
    }

    function leaveGame() {
        if (!gameId) return;

        // Si el juego está en curso, enviar rendición primero
        if (state && state.gamePhase === 'GAME') {
            const pid = role?.role === 'player' ? role.playerId : 'p1';
            socket.emit('SURRENDER', { gameId, playerId: pid });
        }

        socket.emit('LEAVE_GAME', { gameId });

        setGameId(null);
        setRole(null);
        setState(null);
        debugStore.clear();
    }

    function sendRevealDismiss() {
        if (!gameId || !role || role.role !== 'player') return;
        socket.emit('DISMISS_REVEAL', { gameId, playerId: role.playerId });
    }

    function sendRollResultDismiss() {
        if (!gameId || !role || role.role !== 'player') return;
        socket.emit('DISMISS_ROLL_RESULT', { gameId, playerId: role.playerId });
    }

    function sendAction(action: GameAction) {
        if (!gameId) return;
        if (!role || role.role !== 'player') return;
        if (!state) return;


        // Durante PREPARATION no se aplica el guard de activePlayer
        // Durante COUNTER, el rival puede jugar cartas COUNTER o pasar
        if (state.gamePhase !== 'PREPARATION' && state.activePlayer !== role.playerId) {
            if (state.turnPhase === 'COUNTER' && (action.type === 'USE_CARD' || action.type === 'PASS_COUNTER')) {
                // permitir
            } else if (action.type === 'SURRENDER') {
                // permitir rendirse en cualquier turno
            } else {
                setLastBlockedReason(l('ui.notYourTurn'));
                console.warn(`Acción bloqueada: no es tu turno (${role.playerId})`);
                return;
            }
        }

        // DRAW phase: mano llena, solo se permite descartar (o rendirse)
        if (state.turnPhase === 'DRAW' && state.gamePhase === 'GAME') {
            const handSize = state.players[state.activePlayer]?.cardsInHand?.length ?? 0;
            if (handSize > 3 && action.type !== 'DISCARD_CARD' && action.type !== 'SURRENDER') {
                setLastBlockedReason(l('ui.mustDiscardFirst'));
                return;
            }
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
        bothPlayersReady,
        isPlayer: role?.role === 'player',
        playerId: role?.role === 'player' ? role.playerId : null,

        state,
        opponentDisconnectedAt,
        timerInfo,
        pausedTimerInfo,

        joinGame,
        leaveGame,
        sendAction,
        sendRevealDismiss,
        sendRollResultDismiss,
        lastBlockedReason,
        clearBlockedReason: () => setLastBlockedReason(null),
    };
}