import { useEffect, useRef, useState } from 'react';
import { useGameState } from './game/useGameState';
import { HexBoard } from './game/board/HexBoard';
import { PreparationScreen } from './prep/PreparationScreen';
import { DeploymentScreen } from './prep/DeploymentScreen';
import { PlayerSidebar } from './game/layout/PlayerSidebar';
import { RightPanel } from './game/layout/RightPanel';
import { AlertPanel, useAlerts } from './game/layout/AlertPanel';
import { KeyBindingsProvider, useKeyBindings } from './game/KeyBindingsContext';
import { TurnTimer } from './game/layout/TurnTimer';
import { HamburgerMenu } from './game/layout/HamburgerMenu';
import { GameOverModal } from './game/layout/GameOverModal';
import { DisconnectModal } from './game/layout/DisconnectModal';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string } | null;

export function App() {
    const {
        state,
        gameId,
        role,
        bothPlayersReady,
        joinGame,
        leaveGame,
        sendAction,
        connected,
        lastBlockedReason,
        clearBlockedReason,
        opponentDisconnectedAt,
    } = useGameState();

    const [gameIdInput, setGameIdInput] = useState('');
    const [prepDone, setPrepDone] = useState(false);
    const [selectedInfo, setSelectedInfo] = useState<SelectedInfo>(null);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const { alerts, addAlert, removeAlert } = useAlerts();

    // Auto-join desde URL: /game/<id>
    useEffect(() => {
        const match = window.location.pathname.match(/^\/game\/([a-zA-Z0-9_-]+)$/);
        if (match && !gameId) {
            joinGame(match[1]);
        }
    }, []);

    useEffect(() => {
        if (state?.gamePhase === 'PREPARATION') {
            setPrepDone(false);
            setSelectedInfo(null);
        }
    }, [state?.gamePhase]);

    useEffect(() => {
        if (lastBlockedReason) {
            addAlert(lastBlockedReason, 'warning');
            clearBlockedReason();
        }
    }, [lastBlockedReason]);

    const playerId = role?.role === 'player' ? role.playerId : 'p1';
    const isGameOrOver = state && (state.gamePhase === 'GAME' || state.gamePhase === 'GAME_OVER');

    const wasInDrawRef = useRef(false);
    useEffect(() => {
        if (state?.turnPhase === 'DRAW' && state.gamePhase === 'GAME') {
            const handSize = state.players[playerId]?.cardsInHand?.length ?? 0;
            if (handSize > 3 && !wasInDrawRef.current) {
                wasInDrawRef.current = true;
                addAlert('Debes descartar 1 carta antes de realizar cualquier acción', 'warning');
            }
        } else {
            wasInDrawRef.current = false;
        }
    }, [state?.turnPhase, state?.gamePhase]);

    const lastHealKeyRef = useRef<string | null>(null);
    useEffect(() => {
        if (state?.lastIdentityHeal) {
            const key = `${state.lastIdentityHeal.unitId}-${state.turn}-${state.activePlayer}`;
            if (key !== lastHealKeyRef.current) {
                lastHealKeyRef.current = key;
                const unit = state.units[state.lastIdentityHeal.unitId];
                const ownerLabel = unit?.owner === 'p1' ? 'Jugador 1' : 'Jugador 2';
                addAlert(`🩹 ${ownerLabel}: Robar a los ricos — un arquero recupera 1 HP`, 'success');
            }
        }
    }, [state?.lastIdentityHeal]);

    const lastCaminoRef = useRef<boolean>(false);
    useEffect(() => {
        if (state?.lastCaminoDelGuerrero && !lastCaminoRef.current) {
            lastCaminoRef.current = true;
            addAlert('⚔️ Jugador: Camino del guerrero — +1 PA por kill a rango 1', 'success');
        }
        if (!state?.lastCaminoDelGuerrero) {
            lastCaminoRef.current = false;
        }
    }, [state?.lastCaminoDelGuerrero]);

    const lastMeditacionRef = useRef<boolean>(false);
    useEffect(() => {
        if (state?.lastMeditacion && !lastMeditacionRef.current) {
            lastMeditacionRef.current = true;
            addAlert('🧘 El Monje Shaolin ha recuperado 3 HP con Meditación', 'success');
        }
        if (!state?.lastMeditacion) {
            lastMeditacionRef.current = false;
        }
    }, [state?.lastMeditacion]);

    return (
        <KeyBindingsProvider>
        <div className="h-screen w-screen bg-zinc-900 text-white grid grid-rows-[auto_1fr]">
            <header className="border-b border-zinc-700 px-4 py-2 text-lg font-semibold flex gap-4 items-center">
                <div>Shadow Tactics</div>
                {gameId && <>
                    <div className="font-normal text-sm text-zinc-300">
                        [{gameId} · {role?.role ?? 'unknown'}
                        {role?.role === 'player' && ` (${role.playerId})`}]
                    </div>
                    <div className="ml-auto">
                        <HamburgerMenu
                            onLeaveGame={() => setConfirmLeave(true)}
                            onSurrender={state && state.gamePhase === 'GAME' && role?.role === 'player' ? () => sendAction({ type: 'SURRENDER', playerId }) : undefined}
                        />
                    </div>
                    {confirmLeave && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setConfirmLeave(false)}>
                            <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl px-8 py-6 shadow-2xl min-w-72 text-center space-y-4" onClick={e => e.stopPropagation()}>
                                <div className="text-base text-zinc-200 font-semibold">Abandonar partida</div>
                                <div className="text-sm text-zinc-400">Si abandonas la partida, se contará como rendición.</div>
                                <div className="flex gap-3 justify-center pt-2">
                                    <button
                                        onClick={() => { setConfirmLeave(false); leaveGame(); }}
                                        className="bg-red-600 hover:bg-red-500 transition text-white px-4 py-1.5 rounded-md font-semibold cursor-pointer"
                                    >
                                        Abandonar
                                    </button>
                                    <button
                                        onClick={() => setConfirmLeave(false)}
                                        className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md font-semibold cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>}
            </header>

            {gameId ? (
                state && state.gamePhase === 'PREPARATION' && !prepDone ? (
                    <PreparationScreen
                        state={state}
                        sendAction={sendAction}
                        role={role}
                        bothPlayersReady={bothPlayersReady}
                        onDone={() => setPrepDone(true)}
                    />
                ) : state && state.preparationPhase === 'DEPLOYMENT' ? (
                    <DeploymentScreen
                        state={state}
                        sendAction={sendAction}
                        role={role}
                        selectedInfo={selectedInfo}
                        onInfoSelect={setSelectedInfo}
                    />
                ) : isGameOrOver ? (
                    <div className="grid grid-cols-[240px_1fr_280px] overflow-hidden h-full">
                        <PlayerSidebar
                            state={state}
                            playerId={playerId}
                            mode="GAME"
                            selectedInfo={selectedInfo}
                            onSelectIdentity={pid => setSelectedInfo(
                                selectedInfo?.type === 'identity' && selectedInfo.playerId === pid ? null : { type: 'identity', playerId: pid }
                            )}
                            onInfoSelect={setSelectedInfo}
                            sendAction={sendAction}
                        />
                        <main className="relative overflow-hidden">
                            <HexBoard
                                state={state}
                                sendAction={sendAction}
                                playerId={playerId}
                                selectedInfo={selectedInfo}
                                onInfoSelect={setSelectedInfo}
                                addAlert={addAlert}
                                disableInput={!!opponentDisconnectedAt}
                            />
                            {role?.role === 'player' && state.gamePhase === 'GAME' && (
                                <EndTurnBtn role={role} state={state} sendAction={sendAction} />
                            )}
                            <AlertPanel alerts={alerts} removeAlert={removeAlert} />
                            {state?.gamePhase !== 'GAME_OVER' && opponentDisconnectedAt && (
                                <DisconnectModal disconnectedAt={opponentDisconnectedAt} />
                            )}
                            {state?.gamePhase === 'GAME_OVER' && (
                                <GameOverModal state={state} playerId={playerId} onLeaveGame={leaveGame} />
                            )}
                            {state && (state.gamePhase === 'GAME' || state.gamePhase === 'GAME_OVER') && (
                                <TurnTimer
                                    activePlayer={state.activePlayer}
                                    turnPhase={state.turnPhase ?? ''}
                                    paused={!!opponentDisconnectedAt}
                                />
                            )}
                        </main>
                        <RightPanel
                            state={state}
                            playerId={playerId}
                            selectedInfo={selectedInfo}
                            sendAction={sendAction}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400">
                        Waiting for game state…
                    </div>
                )
            ) : (
                <main className="flex items-start justify-center h-full">
                    <div className="flex flex-col items-center gap-4 mt-24">
                        <input
                            className="bg-zinc-950 rounded-md px-3 py-2 text-sm border border-zinc-800 focus:outline-none focus:border-blue-600"
                            type="text"
                            placeholder="Game ID"
                            value={gameIdInput}
                            onChange={e => setGameIdInput(e.target.value)}
                        />
                        <button
                            className="bg-blue-600 hover:bg-blue-500 transition text-white px-4 py-1.5 rounded-md disabled:opacity-50 cursor-pointer"
                            disabled={!connected || !gameIdInput.trim()}
                            onClick={() => joinGame(gameIdInput)}
                        >
                            Join game
                        </button>
                        {!connected && (
                            <div className="text-xs text-zinc-500">
                                Connecting to server…
                            </div>
                        )}
                    </div>
                </main>
            )}
        </div>
        </KeyBindingsProvider>
    );
}

function EndTurnBtn({ role, state, sendAction }: { role: { role: string; playerId: string } | null; state: GameState; sendAction: (action: GameAction) => void }) {
    const { bindings } = useKeyBindings();
    const keyLabel = bindings.END_TURN === 'escape' ? 'ESC' : bindings.END_TURN.toUpperCase();
    return (
        <button
            className="absolute top-4 left-4 bg-purple-600 hover:bg-purple-500 transition text-white px-3 py-1 rounded-md disabled:opacity-50 cursor-pointer"
            disabled={state.activePlayer !== role?.playerId}
            onClick={() => sendAction({ type: 'END_TURN', playerId: role!.playerId })}
        >
            End Turn [{keyLabel}]
        </button>
    );
}
