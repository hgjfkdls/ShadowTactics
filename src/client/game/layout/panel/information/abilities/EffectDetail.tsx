import { l } from '@shared/i18n';
import { getCardDescriptionBySourceName } from '@shared/game/actions/card';

export default function EffectDetail({ stat, label, description, source, sourceName, value }: { stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number }) {
    const isDebuff = ['movementCost', 'difficulty', 'attackCost', 'actionCost', 'blocked', 'passiveDamage', 'movementPenalty'].includes(stat) || (stat === 'damage' && value !== undefined && value < 0);
    const cardDesc = source === 'card' && sourceName ? getCardDescriptionBySourceName(sourceName) : null;
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">{isDebuff ? '🔴' : '🟢'}</div>
                <div>
                    <div className="text-lg font-bold">{label}</div>
                    <div className={`text-xs font-semibold mt-1 ${isDebuff ? 'text-red-400' : 'text-green-400'}`}>
                        {isDebuff ? l('effect.negative') : l('effect.positive')}
                    </div>
                </div>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                {description}
                {source && sourceName && (
                    <div className="text-[10px] text-zinc-500 mt-1">({source}: {sourceName})</div>
                )}
                {cardDesc && (
                    <div className="text-[10px] text-zinc-400 mt-2 italic">{cardDesc}</div>
                )}
            </div>
        </div>
    );
}
