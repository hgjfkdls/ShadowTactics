import { useState } from 'react';
import { useGameState } from './game/useGameState';
import { DebugPanel } from './debug/DebugPanel';
import { HexBoard } from './game/board/HexBoard';

export function App() {
    const {
        state,
        gameId,
        role,
        joinGame,
        leaveGame,
        sendAction,
        connected,
    } = useGameState();

    const [gameIdInput, setGameIdInput] = useState('');

    return (
        <div className="h-screen w-screen bg-zinc-900 text-white grid grid-rows-[auto_1fr]">
            <header className="border-b border-zinc-700 px-4 py-2 text-lg font-semibold flex gap-4 items-center">
                <div>Shadow Tactics</div>
                {gameId && <>
                    <div className="font-normal text-sm text-zinc-300">
                        [{gameId} · {role?.role ?? 'unknown'}
                        {role?.role === 'player' && ` (${role.playerId})`}]
                    </div>
                    <button
                        onClick={leaveGame}
                        className="ml-auto text-sm bg-zinc-800 hover:bg-red-600 transition px-3 py-1 rounded-md cursor-pointer"
                    >
                        Leave game
                    </button>
                </>}
            </header>
            {gameId ? (
                <div className="grid grid-cols-[320px_1fr] overflow-hidden h-full">
                    <aside className="border-r border-zinc-700 p-2 overflow-auto">
                        <DebugPanel />
                    </aside>
                    <main className="relative overflow-hidden">
                        {state ? (
                            <HexBoard
                                state={state}
                                sendAction={sendAction}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-400">
                                Waiting for game state…
                            </div>
                        )}
                        {role?.role === 'player' && state && (
                            <button
                                className="absolute top-4 left-4 bg-purple-600 hover:bg-purple-500 transition text-white px-3 py-1 rounded-md disabled:opacity-50 cursor-pointer"
                                disabled={state.activePlayer !== role.playerId}
                                onClick={() => sendAction({ type: 'END_TURN' })}
                            >
                                End Turn
                            </button>
                        )}
                    </main>
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
                        {!connected && (
                            <div className="text-xs text-zinc-500">
                                Connecting to server…
                            </div>
                        )}
                    </div>
                </main>
            )}
        </div>
    );
}