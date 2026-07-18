
import { useEffect, useRef, useState } from 'react';
import { useGameState } from './game/useGameState';
import { createAIGame } from './net/socket';
import { HexBoard } from './game/board/Board';
import { PreparationScreen } from './prep/PreparationScreen';
import { DeploymentScreen } from './prep/DeploymentScreen';
import { PlayerSidebar } from './game/layout/panel/player/PlayerSidebar';
import { RightPanel } from './game/layout/RightPanel';
import { AlertPanel, useAlerts } from './game/layout/AlertPanel';
import { KeyBindingsProvider, useKeyBindings } from './game/KeyBindingsContext';
import { AnimationProvider } from './game/animation/AnimationContext';
import { SoundProvider } from './game/sound/SoundContext';
import { SoundEngine } from './game/sound/SoundEngine';
import { WebAudioRenderer } from './game/sound/render/WebAudioRenderer';
import type { SoundEvent } from './game/sound/types';
import { LoadingScreen } from './game/assets/LoadingScreen';
import { TurnTimer } from './game/layout/TurnTimer';
import { HamburgerMenu } from './game/layout/HamburgerMenu';
import { GameOverModal } from './game/layout/GameOverModal';
import { DisconnectModal } from './game/layout/DisconnectModal';
import { ThemeProvider } from './game/theme/ThemeProvider';
import { l } from '@shared/i18n';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string; fromRect?: DOMRect; _ck?: number; isReclick?: boolean } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number } | null;

export function App() {
    const [localeKey, setLocaleKey] = useState(0);
    useEffect(() => {
        function handler() { setLocaleKey(k => k + 1); }
        window.addEventListener('locale-changed', handler);
        return () => window.removeEventListener('locale-changed', handler);
    }, []);

    const {
        state,
        gameId,
        role,
        bothPlayersReady,
        assetsLoading,
        assetProgress,
        joinGame,
        leaveGame,
        sendAction,
        sendRevealDismiss,
        sendRollResultDismiss,
        connected,
        lastBlockedReason,
        clearBlockedReason,
        opponentDisconnectedAt,
        timerInfo,
        pausedTimerInfo,
    } = useGameState();

    const [gameIdInput, setGameIdInput] = useState('');
    const [prepDone, setPrepDone] = useState(false);
    const [selectedInfo, setSelectedInfo] = useState<SelectedInfo>(null);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const { alerts, addAlert, removeAlert } = useAlerts();

    // Auto-join desde URL: /game/<id>?userId=...&matchType=...
    useEffect(() => {
        const match = window.location.pathname.match(/^\/game\/([a-zA-Z0-9_-]+)$/);
        if (match && !gameId) {
            const url = new URL(window.location.href);
            const userId = url.searchParams.get('userId') ?? undefined;
            const matchType = url.searchParams.get('matchType') ?? undefined;
            joinGame(match[1], userId, matchType);
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
                addAlert(l('alert.discardBeforeAct'), 'warning');
            }
        } else {
            wasInDrawRef.current = false;
        }
    }, [state?.turnPhase, state?.gamePhase]);

    const lastCaminoRef = useRef<boolean>(false);
    useEffect(() => {
        if (state?.lastCaminoDelGuerrero && !lastCaminoRef.current) {
            lastCaminoRef.current = true;
            addAlert(l('alert.caminoGuerrero'), 'success');
        }
        if (!state?.lastCaminoDelGuerrero) {
            lastCaminoRef.current = false;
        }
    }, [state?.lastCaminoDelGuerrero]);

    const lastMeditacionRef = useRef<boolean>(false);
    useEffect(() => {
        if (state?.lastMeditacion && !lastMeditacionRef.current) {
            lastMeditacionRef.current = true;
            addAlert(l('alert.meditacionHeal'), 'success');
        }
        if (!state?.lastMeditacion) {
            lastMeditacionRef.current = false;
        }
    }, [state?.lastMeditacion]);

    // Pre-cargar todos los sonidos al inicio
    const engineRef = useRef<SoundEngine | null>(null);
    if (!engineRef.current) {
        engineRef.current = new SoundEngine(new WebAudioRenderer());
    }

    const allSoundEvents: SoundEvent[] = [
        'ui_click', 'ui_confirm', 'ui_cancel', 'ui_error', 'ui_select_unit',
        'move', 'attack', 'hit', 'miss', 'critical',
        'counterattack', 'kill', 'general_kill',
        'heal', 'shield', 'buff', 'debuff',
        'ability_activate', 'card_play', 'counter_play',
        'turn_start', 'turn_end', 'victory', 'defeat',
        'roll_dice', 'deploy_unit',
        'meditation', 'whirlwind', 'charge', 'ride',
    ];
    useEffect(() => {
        engineRef.current?.preloadAll(allSoundEvents);
        import('./game/sound/soundConfig').then(({ SOUND_CONFIG }) => {
            engineRef.current?.preloadKeys(Object.keys(SOUND_CONFIG));
        });
        import('./game/icons/AbilityIcon').then(({ preloadAbilityIcons }) => {
            preloadAbilityIcons();
        });
    }, []);

    return (

        <ThemeProvider>
        <KeyBindingsProvider>
        <SoundProvider engine={engineRef.current}>
        <AnimationProvider>
        {assetsLoading && <LoadingScreen progress={assetProgress} />}
        <div className="h-screen w-screen bg-zinc-900 text-white grid grid-rows-[auto_1fr] overflow-hidden">
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
                                <div className="text-base text-zinc-200 font-semibold">{l('ui.abandonTitle')}</div>
                                <div className="text-sm text-zinc-400">{l('ui.abandonDesc')}</div>
                                <div className="flex gap-3 justify-center pt-2">
                                    <button
                                        onClick={() => { setConfirmLeave(false); leaveGame(); }}
                                        className="bg-red-600 hover:bg-red-500 transition text-white px-4 py-1.5 rounded-md font-semibold cursor-pointer"
                                    >
                                        {l('ui.abandon')}
                                    </button>
                                    <button
                                        onClick={() => setConfirmLeave(false)}
                                        className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md font-semibold cursor-pointer"
                                    >
                                        {l('ui.cancel')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>}
            </header>

            {gameId ? (

                <div className="relative h-full overflow-hidden">
                {state && state.gamePhase === 'PREPARATION' && !prepDone ? (
                    <>
                    <TurnTimer info={timerInfo} pausedInfo={pausedTimerInfo} />
                    <PreparationScreen
                        state={state}
                        sendAction={sendAction}
                        role={role}
                        bothPlayersReady={bothPlayersReady}
                        onDone={() => setPrepDone(true)}
                        timerInfo={timerInfo}
                        sendRevealDismiss={sendRevealDismiss}
                        sendRollResultDismiss={sendRollResultDismiss}
                    />
                    </>
                ) : state && state.preparationPhase === 'DEPLOYMENT' ? (
                    <>
                    <TurnTimer info={timerInfo} pausedInfo={pausedTimerInfo} />
                    <DeploymentScreen
                        state={state}
                        sendAction={sendAction}
                        role={role}
                        selectedInfo={selectedInfo}
                        onInfoSelect={setSelectedInfo}
                    />
                    </>
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
                                role={role}
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
                            <TurnTimer info={timerInfo} pausedInfo={pausedTimerInfo} />
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
                )}
                </div>
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
                        <div className="flex gap-2 mt-2">
                            <button className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs cursor-pointer disabled:opacity-50 border-none"
                                disabled={!connected}
                                onClick={() => createAIGame('cpu_facil')}
                            >CPU Facil</button>
                            <button className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs cursor-pointer disabled:opacity-50 border-none"
                                disabled={!connected}
                                onClick={() => createAIGame('cpu_medio')}
                            >CPU Medio</button>
                            <button className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs cursor-pointer disabled:opacity-50 border-none"
                                disabled={!connected}
                                onClick={() => createAIGame('cpu_dificil')}
                            >CPU Dificil</button>
                            <button className="bg-purple-700 hover:bg-purple-600 text-white px-2 py-1 rounded-md text-xs cursor-pointer disabled:opacity-50 border-none"
                                disabled={!connected}
                                onClick={() => createAIGame('general_mares')}
                            >Gral. Mares</button>
                            <button className="bg-amber-700 hover:bg-amber-600 transition text-white px-3 py-1.5 rounded-md text-xs cursor-pointer disabled:opacity-50 border-none"
                                disabled={!connected}
                                onClick={() => createAIGame('el_gran_general')}
                            >Gran Gral.</button>
                        </div>
                        {!connected && (
                            <div className="text-xs text-zinc-500">
                                Connecting to server…
                            </div>
                        )}
                    </div>
                </main>
            )}
        </div>
        </AnimationProvider>
        </SoundProvider>
        </KeyBindingsProvider>
        </ThemeProvider>
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
            {l('button.endTurn')} [{keyLabel}]
        </button>
    );
}
