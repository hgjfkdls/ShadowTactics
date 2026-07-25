import { useState, useRef } from 'react';
import { l } from '@shared/i18n';
import { getCardName, getCardType, getCardDescription } from '@shared/game/actions/card';
import { cardImgUrl, CARD_BACK_URL } from '../../../../helpers/cards';
import { useLightbox } from '../../../../helpers/Lightbox';
import type { GameAction } from '@shared';

export default function CardDetail({ cardId, fromRect, isReclick, sendAction, playerId, discardMode }: {
  cardId: string; fromRect?: DOMRect; isReclick?: boolean;
  sendAction?: (action: GameAction) => void; playerId?: string; discardMode?: boolean;
}) {
  const { setLightbox, lightboxEl, lightbox } = useLightbox();
  const [used, setUsed] = useState(false);
  const ctype = getCardType(cardId);
  const imgUrl = cardImgUrl(cardId);
  const imgRef = useRef<HTMLImageElement>(null);
  const desc = getCardDescription(cardId) || '';

  const actionLabel = discardMode ? 'button.discard' : 'button.useCard';
  const actionType: 'DISCARD_CARD' | 'USE_CARD' = discardMode ? 'DISCARD_CARD' : 'USE_CARD';

  function executeAction() {
    if (used) return;
    setUsed(true);
    sendAction?.({ type: actionType, playerId, cardId } as GameAction);
  }

  const cardAction = sendAction && playerId ? {
    label: l(actionLabel),
    onClick: executeAction,
  } : undefined;

  function handleImgClick() {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setLightbox(img.getAttribute('src') || img.src, 'panel', rect, rect, cardAction);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <img src={CARD_BACK_URL} alt="" className="w-10 h-14 rounded object-cover" />
        <div>
          <div className="text-lg font-bold">{getCardName(cardId)}</div>
          <div className="text-xs font-semibold text-zinc-400">
            {l(`cardType.${ctype}`) || ctype || '?'}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-1 w-[70%]">
        <img
          ref={imgRef}
          src={imgUrl}
          alt={getCardName(cardId)}
          className={`w-full h-auto rounded cursor-pointer ${lightbox ? 'invisible' : ''}`}
          onClick={handleImgClick}
          onError={(e) => {
            const t = e.currentTarget;
            if (!t.dataset.fallback) {
              t.dataset.fallback = '1';
              t.src = cardImgUrl(cardId, 'es');
            } else {
              t.style.display = 'none';
            }
          }}
        />
      </div>

      {desc && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 text-xs text-zinc-300 leading-relaxed">
          {desc}
        </div>
      )}

      {sendAction && playerId && !used && (
        <button
          onClick={executeAction}
          className={`text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer w-full ${discardMode ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {l(actionLabel)}
        </button>
      )}

      {used && (
        <div className="text-[10px] text-green-400 font-semibold text-center">
          ✓ {discardMode ? l('button.discard') : l('button.useCard')}
        </div>
      )}

      {lightboxEl}
    </div>
  );
}
