import { useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { IDENTITY_INFO, getIdentityKey } from './identityData';

type Props = {
    state: GameState;
    sendAction: (action: GameAction) => void;
    playerId: string;
    role: PlayerRole;
    bothPlayersReady: boolean;
};

export function IdentitySelection({ state, sendAction, playerId, bothPlayersReady }: Props) {
    const [highlightedCard, setHighlightedCard] = useState<string | null>(null);

    const cards = state.players[playerId]?.identityCards ?? [];
    const selected = state.players[playerId]?.selectedIdentity;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const opponentSelected = !!state.players[opponentId]?.selectedIdentity;

    function handleSelect() {
        if (!highlightedCard || selected) return;
        sendAction({ type: 'SELECT_IDENTITY', playerId, cardId: highlightedCard });
    }

    if (!bothPlayersReady) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-2xl font-bold">Esperando jugadores</div>
                <div className="text-zinc-400">Esperando a que el segundo jugador se conecte...</div>
            </div>
        );
    }

    const highlightedKey = highlightedCard ? getIdentityKey(highlightedCard) : null;
    const highlightedInfo = highlightedKey ? IDENTITY_INFO[highlightedKey] : null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-center py-4 border-b border-zinc-700">
                <h2 className="text-2xl font-bold">Selecciona tu identidad</h2>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                    <p className="text-zinc-400 text-sm">
                        {selected
                            ? 'Identidad seleccionada — esperando al oponente...'
                            : 'Haz clic en una carta para ver sus detalles, luego presiona "Seleccionar carta"'}
                    </p>

                    <div className="flex gap-4">
                        {cards.map(cardId => {
                            const key = getIdentityKey(cardId);
                            const info = IDENTITY_INFO[key];
                            const isHighlighted = highlightedCard === cardId;
                            const isSelected = selected === cardId;

                            return (
                                <button
                                    key={cardId}
                                    onClick={() => !selected && setHighlightedCard(cardId)}
                                    disabled={!!selected}
                                    className={[
                                        'w-40 h-52 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition cursor-pointer',
                                        'hover:border-blue-400 hover:bg-zinc-700',
                                        isSelected
                                            ? 'border-green-500 bg-zinc-700 ring-2 ring-green-500/50 cursor-not-allowed'
                                            : isHighlighted
                                                ? 'border-blue-500 bg-zinc-700 ring-2 ring-blue-500/50'
                                                : 'border-zinc-700 bg-zinc-800',
                                    ].join(' ')}
                                >
                                    <div className="text-4xl">🛡️</div>
                                    <div className="text-base font-bold text-center">{info?.name}</div>
                                    <div className="text-xs text-zinc-400">{info?.className}</div>
                                    {isSelected && (
                                        <div className="text-xs text-green-400 font-semibold">✓ SELECCIONADA</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {!selected && (
                        <button
                            onClick={handleSelect}
                            disabled={!highlightedCard}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition text-white px-6 py-2 rounded-lg font-semibold cursor-pointer disabled:cursor-not-allowed"
                        >
                            Seleccionar carta
                        </button>
                    )}

                    {selected && opponentSelected && (
                        <div className="text-green-400 text-sm">Ambos listos — continuando...</div>
                    )}
                </div>

                <aside className="w-80 border-l border-zinc-700 p-4 flex flex-col gap-4 overflow-y-auto">
                    <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Detalles</div>
                    {highlightedInfo ? (
                        <>
                            <div className="bg-zinc-800 rounded-lg aspect-[4/3] flex items-center justify-center text-4xl border border-zinc-600 shrink-0">
                                🛡️
                            </div>
                            <div>
                                <div className="text-lg font-bold">{highlightedInfo.name}</div>
                                <div className="text-sm text-zinc-400">{highlightedInfo.className}</div>
                            </div>
                            <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                                {highlightedInfo.descVerbose}
                            </div>
                        </>
                    ) : selected ? (
                        (() => {
                            const skey = getIdentityKey(selected);
                            const sinfo = IDENTITY_INFO[skey];
                            return (
                                <>
                                    <div className="bg-zinc-800 rounded-lg aspect-[4/3] flex items-center justify-center text-4xl border border-green-600 shrink-0">
                                        🛡️
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{sinfo?.name}</div>
                                        <div className="text-sm text-green-400">Seleccionada</div>
                                    </div>
                                </>
                            );
                        })()
                    ) : (
                        <div className="text-zinc-600 text-sm flex items-center justify-center flex-1">
                            Haz clic en una carta para ver sus detalles
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
