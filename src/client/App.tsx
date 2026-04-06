import { useGameState } from './game/useGameState';
import { DebugPanel } from './debug/DebugPanel';
import { HexBoard } from './game/board/HexBoard';
import { sendAction } from './net/socket';

export function App() {
    const { state, connected } = useGameState();

    return (

        <div className="h-screen w-screen bg-zinc-900 text-white grid grid-rows-[auto_1fr]">
            <header className="border-b border-zinc-700 px-4 py-2 text-lg font-semibold">
                Shadow Tactics
            </header>
            <div className="grid grid-cols-[260px_1fr] overflow-hidden">
                <aside className="border-r border-zinc-700 p-2 overflow-auto">
                    <DebugPanel />
                </aside>
                <main className="relative overflow-hidden">
                    {state && (
                        <HexBoard state={state} sendAction={sendAction} />
                    )}
                </main>
            </div>
        </div>
    );
}
