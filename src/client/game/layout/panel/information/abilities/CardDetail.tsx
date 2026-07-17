import { l } from '@shared/i18n';
import { getCardName, getCardType } from '@shared/game/actions/card';
import { cardImgUrl, CARD_BACK_URL } from '../../../../helpers/cards';
import { useLightbox } from '../../../../helpers/Lightbox';

export default function CardDetail({ cardId }: { cardId: string }) {
  const { setLightbox, lightboxEl } = useLightbox();
  const ctype = getCardType(cardId);
  const imgUrl = cardImgUrl(cardId);

  const TYPE_COLORS: Record<string, string> = {
    BUFF: 'text-emerald-400 border-emerald-700',
    DEBUFF: 'text-red-400 border-red-700',
    COUNTER: 'text-violet-400 border-violet-700',
  };

  const TYPE_BG: Record<string, string> = {
    BUFF: 'bg-emerald-900/20',
    DEBUFF: 'bg-red-900/20',
    COUNTER: 'bg-violet-900/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <img src={CARD_BACK_URL} alt="" className="w-10 h-14 rounded object-cover" />
        <div>
          <div className="text-lg font-bold">{getCardName(cardId)}</div>
          <div className={['text-xs font-semibold', ctype ? TYPE_COLORS[ctype]?.split(' ')[0] : 'text-zinc-400'].join(' ')}>
            {l(`cardType.${ctype}`) || ctype || '?'}
          </div>
        </div>
      </div>

      <div className={['rounded-lg border p-1', ctype ? TYPE_BG[ctype] ?? '' : 'bg-zinc-800/30 border-zinc-700'].join(' ')}>
        <img
          src={imgUrl}
          alt={getCardName(cardId)}
          className="w-full h-auto rounded cursor-pointer"
          onClick={(e) => setLightbox((e.currentTarget as HTMLImageElement).src)}
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

      {lightboxEl}
    </div>
  );
}
