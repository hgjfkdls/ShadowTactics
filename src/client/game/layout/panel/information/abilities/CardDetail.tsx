import { useEffect, useRef } from 'react';
import { l } from '@shared/i18n';
import { getCardName, getCardType, getCardDescription } from '@shared/game/actions/card';
import { cardImgUrl, CARD_BACK_URL } from '../../../../helpers/cards';
import { useLightbox } from '../../../../helpers/Lightbox';

export default function CardDetail({ cardId, fromRect, isReclick }: { cardId: string; fromRect?: DOMRect; isReclick?: boolean }) {
  const { setLightbox, lightboxEl, lightbox } = useLightbox();
  const ctype = getCardType(cardId);
  const imgUrl = cardImgUrl(cardId);
  const imgRef = useRef<HTMLImageElement>(null);
  const desc = getCardDescription(cardId) || '';

  useEffect(() => {
    const timer = setTimeout(() => {
      const cardRect = imgRef.current?.getBoundingClientRect();
      if (cardRect && isReclick) {
        // Misma carta ya en placeholder → desde el panel
        setLightbox(imgUrl, 'panel', cardRect, cardRect);
      } else if (fromRect) {
        // Carta diferente → desde el panel del jugador
        setLightbox(imgUrl, 'panel', fromRect, cardRect ?? fromRect);
      } else if (cardRect) {
        // Click directo en placeholder
        setLightbox(imgUrl, 'panel', cardRect, cardRect);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [cardId]);

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
          className={`w-full h-auto rounded ${lightbox ? 'invisible' : 'cursor-pointer'}`}
          onClick={(e) => {
            const img = e.currentTarget;
            const rect = img.getBoundingClientRect();
            setLightbox(img.getAttribute('src') || img.src, 'panel', rect, rect);
          }}
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

      {lightboxEl}
    </div>
  );
}
