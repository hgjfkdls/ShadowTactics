import { useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { IDENTITY_INFO, getIdentityKey } from './identityData';
import { l } from '@shared/i18n';

type Props = {
    state: GameState;
    sendAction: (action: GameAction) => void;
    playerId: string;
    role: PlayerRole;
    bothPlayersReady: boolean;
};

export function IdentitySelection({ state, sendAction, playerId, bothPlayersReady }: Props) {
    const [highlightedCard, setHighlightedCard] = useState<string | null>(null);

    const cards = (typeof __DEPLOY_MODE__ !== 'undefined' && __DEPLOY_MODE__ === 'simulated')
        ? [...new Set([...(state.players[playerId]?.identityCards ?? []), ...(state.identityDeck ?? [])])]
        : state.players[playerId]?.identityCards ?? [];
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
                <div className="text-2xl font-bold">{l('deploy.waiting')}</div>
                <div className="text-zinc-400">{l('deploy.waitingConnection')}</div>
            </div>
        );
    }

    const highlightedKey = highlightedCard ? getIdentityKey(highlightedCard) : null;
    const highlightedInfo = highlightedKey ? IDENTITY_INFO[highlightedKey] : null;

    return (
        <div className="flex flex-col h-full pt-12">
            <div className="flex items-center justify-center py-4 border-b border-zinc-700">
                <h2 className="text-2xl font-bold">{l('identity.selectTitle')}</h2>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                    <p className="text-zinc-400 text-sm">
                        {selected
                            ? l('identity.waitingOpponent')
                            : l('identity.clickToSeeDetails')}
                    </p>

                    <div className={cards.length > 6 ? 'grid grid-cols-5 gap-3' : 'flex gap-4'}>
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
                                        cards.length > 6 ? 'w-32 h-44' : 'w-40 h-52',
                                        'rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition cursor-pointer',
                                        'hover:border-blue-400 hover:bg-zinc-700',
                                        isSelected
                                            ? 'border-green-500 bg-zinc-700 ring-2 ring-green-500/50 cursor-not-allowed'
                                            : isHighlighted
                                                ? 'border-blue-500 bg-zinc-700 ring-2 ring-blue-500/50'
                                                : 'border-zinc-700 bg-zinc-800',
                                    ].join(' ')}
                                >
                                    <div className="text-4xl">🛡️</div>
                                    <div className="text-base font-bold text-center">{l(`identity.${key}.name`) || info?.name}</div>
                                    <div className="text-xs text-zinc-400">{l(`identity.${key}.className`) || info?.className}</div>
                                    {isSelected && (
                                        <div className="text-xs text-green-400 font-semibold">{l('identity.selected')}</div>
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
                            {l('button.selectCard')}
                        </button>
                    )}

                    {selected && opponentSelected && (
                        <div className="text-green-400 text-sm">Ambos listos — continuando...</div>
                    )}
                </div>

                <aside className="w-80 border-l border-zinc-700 p-4 flex flex-col gap-4 overflow-y-auto">
                    <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">{l('board.details')}</div>
                    {highlightedInfo ? (() => {
                        const verbose = (() => { const t = l(`identity.${highlightedKey}.descVerbose`); return t && t !== `identity.${highlightedKey}.descVerbose` ? t : highlightedInfo.descVerbose; })();
                        const sections = verbose.split('\n\n').filter((s: string) => s.trim());
                        const flavor = sections[0] ?? '';
                        const abilitySections = sections.slice(1);
                        return (
                            <>
                                <div className="bg-zinc-800 rounded-lg aspect-[4/3] flex items-center justify-center text-4xl border border-zinc-600 shrink-0">
                                    🛡️
                                </div>
                                <div>
                                    <div className="text-lg font-bold">{l(`identity.${highlightedKey}.name`) || highlightedInfo.name}</div>
                                    <div className="text-sm text-zinc-400">{l(`identity.${highlightedKey}.className`) || highlightedInfo.className}</div>
                                </div>
                                {flavor && (
                                    <div className="text-xs text-zinc-400 leading-relaxed italic whitespace-pre-line bg-zinc-800/50 rounded-lg p-3">
                                        {flavor}
                                    </div>
                                )}
                                {abilitySections.length > 0 && (
                                    <div className="space-y-2">
                                        {abilitySections.map((section: string, i: number) => {
                                            const lines = section.split('\n');
                                            const header = lines[0] ?? '';
                                            const desc = lines.slice(1).join(' ').trim();
                                            return (
                                                <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-[9px] font-mono text-zinc-500">👑</span>
                                                        <span className="font-semibold text-zinc-200">{header}</span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-300 leading-relaxed">{desc}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        );
                    })() : selected ? (
                        (() => {
                            const skey = getIdentityKey(selected);
                            const sinfo = IDENTITY_INFO[skey];
                            return (
                                <>
                                    <div className="bg-zinc-800 rounded-lg aspect-[4/3] flex items-center justify-center text-4xl border border-green-600 shrink-0">
                                        🛡️
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{l(`identity.${skey}.name`) || sinfo?.name}</div>
                                        <div className="text-sm text-green-400">{l('identity.selected')}</div>
                                    </div>
                                </>
                            );
                        })()
                    ) : (
                        <div className="text-zinc-600 text-sm flex items-center justify-center flex-1">
                            {l('identity.clickToSeeDetails')}
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
