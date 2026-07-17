import { useState } from 'react';
import type { GameState, CardId, GameAction } from '@shared';
import { getCardName, getCardType, getCardDescription } from '@shared/game/actions/card';

type Props = {
    state: GameState;
    playerId: string;
    sendAction: (action: GameAction) => void;
};

const TYPE_STYLES: Record<string, string> = {
    BUFF: 'border-emerald-700 bg-emerald-900/30 text-emerald-300',
    DEBUFF: 'border-red-700 bg-red-900/30 text-red-300',
    COUNTER: 'border-violet-700 bg-violet-900/30 text-violet-300',
};

const TYPE_LABELS: Record<string, string> = {
    BUFF: 'Mejora',
    DEBUFF: 'Debilidad',
    COUNTER: 'Contra',
};

export function CardHand({ state, playerId, sendAction }: Props) {
    const [selectedCardId, setSelectedCardId] = useState<CardId | null>(null);
    const { gamePhase, turnPhase, lastCardAction } = state;
    const hand = state.players[playerId]?.cardsInHand ?? [];
    const isMyTurn = state.activePlayer === playerId;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const opponentHand = state.players[opponentId]?.cardsInHand ?? [];

    // ── DRAW phase: hand > 3, must discard ──
    const isDrawDiscard = turnPhase === 'DRAW' && isMyTurn && hand.length > 3;

    // ── COUNTER phase: rival can counter ──
    const isCounterWindow = turnPhase === 'COUNTER' && !isMyTurn;
    const pendingCard = lastCardAction;

    // ── Show nothing during PREPARATION ──
    if (gamePhase !== 'GAME' || gamePhase === 'GAME_OVER') {
        if (hand.length === 0) return null;
    }

    function handlePlay() {
        if (!selectedCardId) return;
        if (isDrawDiscard) {
            sendAction({ type: 'DISCARD_CARD', playerId, cardId: selectedCardId });
            setSelectedCardId(null);
            return;
        }
        const ctype = getCardType(selectedCardId);
        if (isCounterWindow && ctype === 'COUNTER') {
            // Counter cards: targetId is optional (only for confusion-esque ones)
            sendAction({ type: 'USE_CARD', playerId, cardId: selectedCardId });
            setSelectedCardId(null);
            return;
        }
        if (isMyTurn && turnPhase !== 'COUNTER') {
            sendAction({ type: 'USE_CARD', playerId, cardId: selectedCardId });
            setSelectedCardId(null);
        }
    }

    function handlePassCounter() {
        sendAction({ type: 'PASS_COUNTER', playerId });
    }

    function canPlay(): boolean {
        if (!selectedCardId) return false;
        if (isDrawDiscard) return true;
        const ctype = getCardType(selectedCardId);
        if (isCounterWindow && ctype === 'COUNTER') return true;
        if (isMyTurn && turnPhase !== 'COUNTER') return true;
        return false;
    }

    // Show for both player and opponent hand
    return (
        <div className="border-t border-zinc-700 bg-zinc-900/90">
            {/* Pending card display in COUNTER window */}
            {isCounterWindow && pendingCard && (
                <div className="px-3 pt-2 pb-1 border-b border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Carta en juego</div>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-yellow-700/50 bg-yellow-900/15">
                        <span className="text-xs font-bold text-yellow-300">{getCardName(pendingCard.cardId)}</span>
                        <span className="text-[10px] text-zinc-400">{getCardDescription(pendingCard.cardId)}</span>
                    </div>
                </div>
            )}

            {/* Hand header */}
            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                    {isDrawDiscard ? 'Elige carta para descartar (4/3)' : 'Tu mano'}
                </div>
                {isCounterWindow && (
                    <span className="text-[10px] text-amber-400 font-semibold">VENTANA DE CONTRA</span>
                )}
                {!isMyTurn && turnPhase !== 'COUNTER' && hand.length > 0 && (
                    <span className="text-[10px] text-zinc-600">{hand.length} carta(s)</span>
                )}
            </div>

            {/* Cards */}
            {hand.length > 0 ? (
                <div className="px-3 pb-2">
                    <div className="flex flex-wrap gap-1.5">
                        {hand.map(cid => {
                            const ctype = getCardType(cid);
                            const isSelected = selectedCardId === cid;
                            const style = TYPE_STYLES[ctype ?? 'BUFF'];
                            const isDisabled = !isMyTurn && !isCounterWindow;

                            return (
                                <button
                                    key={cid}
                                    onClick={() => {
                                        if (isDisabled && !isDrawDiscard) return;
                                        setSelectedCardId(isSelected ? null : cid);
                                    }}
                                    disabled={isDisabled && !isDrawDiscard}
                                    className={[
                                        'relative flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border text-left transition cursor-pointer min-w-[80px] flex-1',
                                        isSelected
                                            ? 'ring-2 ring-blue-500 border-blue-600 bg-blue-600/15'
                                            : isDisabled
                                                ? 'opacity-40 border-zinc-700 bg-zinc-800/30 cursor-default'
                                                : style,
                                    ].join(' ')}
                                    title={getCardDescription(cid)}
                                >
                                    <span className="text-[10px] font-bold leading-tight">{getCardName(cid)}</span>
                                    <span className={[
                                        'text-[8px] font-semibold uppercase tracking-wide',
                                        ctype === 'BUFF' ? 'text-emerald-400/70' : ctype === 'DEBUFF' ? 'text-red-400/70' : 'text-violet-400/70',
                                    ].join(' ')}>
                                        {TYPE_LABELS[ctype ?? '']}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-2">
                        {canPlay() && (
                            <button
                                onClick={handlePlay}
                                className={[
                                    'flex-1 text-xs font-semibold py-1.5 rounded-lg transition cursor-pointer',
                                    isDrawDiscard
                                        ? 'bg-red-600 hover:bg-red-500 text-white'
                                        : isCounterWindow
                                            ? 'bg-violet-600 hover:bg-violet-500 text-white'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white',
                                ].join(' ')}
                            >
                                {isDrawDiscard ? 'Descartar' : isCounterWindow ? 'Contrarrestar' : 'Jugar'}
                            </button>
                        )}
                        {isCounterWindow && (
                            <button
                                onClick={handlePassCounter}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition cursor-pointer text-zinc-300"
                            >
                                Pasar
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="px-3 pb-2 text-[10px] text-zinc-600 italic">
                    Sin cartas
                </div>
            )}
        </div>
    );
}
