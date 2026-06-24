import type { PlayerId } from '@shared';

type Props = {
    pendingOccupation: { unitId: string; position: { q: number; r: number } } | undefined;
    playerId: PlayerId;
    sendAction: (action: any) => void;
};

export function PendingOccupationPanel({ pendingOccupation, playerId, sendAction }: Props) {
    if (!pendingOccupation) return null;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="bg-zinc-900/95 border border-blue-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                <div className="text-sm text-zinc-300">
                    ¿Ocupar la posición del enemigo eliminado?
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        className="bg-blue-600 hover:bg-blue-500 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer"
                        onClick={() => sendAction({ type: 'OCCUPY_POSITION', playerId, accept: true })}
                    >
                        Ocupar
                    </button>
                    <button
                        className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer"
                        onClick={() => sendAction({ type: 'OCCUPY_POSITION', playerId, accept: false })}
                    >
                        Rechazar
                    </button>
                </div>
            </div>
        </div>
    );
}
