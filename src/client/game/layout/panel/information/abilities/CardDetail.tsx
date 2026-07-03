import { l } from '@shared/i18n';
import { getCardName, getCardType, getCardDescription } from '@shared/game/actions/card';

export default function CardDetail({ cardId }: { cardId: string }) {
    const ctype = getCardType(cardId);

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
                <div className="text-3xl">🃏</div>
                <div>
                    <div className="text-lg font-bold">{getCardName(cardId)}</div>
                    <div className={['text-xs font-semibold', ctype ? TYPE_COLORS[ctype]?.split(' ')[0] : 'text-zinc-400'].join(' ')}>
                        {l(`cardType.${ctype}`) || ctype || '?'}
                    </div>
                </div>
            </div>

            <div className={['rounded-lg border p-3 text-xs text-zinc-300 leading-relaxed', ctype ? TYPE_BG[ctype] ?? '' : 'bg-zinc-800/30 border-zinc-700'].join(' ')}>
                {getCardDescription(cardId) || getCardName(cardId)}
            </div>
        </div>
    );
}
