import type { GameState } from '@shared';

type Props = {
    state: GameState | null;
    connected: boolean;
};

export function DebugPanel({ state, connected }: Props) {
    return (
        <div className="bg-zinc-800 text-zinc-100 p-4 rounded text-sm space-y-2">
            <div>
                <strong>Socket:</strong>{' '}
                <span className={connected ? 'text-green-400' : 'text-red-400'}>
                    {connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
            </div>

            {state ? (
                <>
                    <div>
                        <strong>Turn:</strong> {state.turn}
                    </div>
                    <div>
                        <strong>Active player:</strong> {state.activePlayer}
                    </div>
                    <div>
                        <strong>Units:</strong>
                        <ul className="ml-4 list-disc">
                            {Object.values(state.units).map(u => (
                                <li key={u.id}>
                                    {u.id} | owner: {u.owner} | pos: ({u.position.q},{' '}
                                    {u.position.r})
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            ) : (
                <div>Waiting for game state…</div>
            )}
        </div>
    );
}
