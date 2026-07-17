import { useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { IDENTITY_INFO, getIdentityKey } from './identityData';
import { identityImgUrl, IDENTITY_CARD_FALLBACK } from '../game/helpers/cards';
import { useLightbox } from '../game/helpers/Lightbox';
import { l } from '@shared/i18n';

type Props = {
    state: GameState;
    sendAction: (action: GameAction) => void;
    playerId: string;
    role: PlayerRole;
    bothPlayersReady: boolean;
};

export function IdentitySelection({ state, sendAction, playerId, bothPlayersReady }: Props) {
    const { setLightbox, lightboxEl } = useLightbox();
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

    return (
        <div className="flex flex-col h-full pt-12">
            <div className="flex items-center justify-center py-4 border-b border-zinc-700">
                <h2 className="text-2xl font-bold">{l('identity.selectTitle')}</h2>
            </div>

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
                                onClick={(e) => {
                                    if (selected) return;
                                    setHighlightedCard(cardId);
                                    if (isHighlighted) {
                                        const img = (e.currentTarget.querySelector('img') as HTMLImageElement);
                                        setLightbox(
                                            identityImgUrl(key),
                                            'panel',
                                            img?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect()
                                        );
                                    }
                                }}
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
                                <img src={identityImgUrl(key)} alt={l(`identity.${key}.name`) || info?.name} className="w-16 h-22 object-contain" onError={e => { if ((e.target as HTMLImageElement).src !== IDENTITY_CARD_FALLBACK) (e.target as HTMLImageElement).src = IDENTITY_CARD_FALLBACK; }} />
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

            {lightboxEl}
        </div>
    );
}
