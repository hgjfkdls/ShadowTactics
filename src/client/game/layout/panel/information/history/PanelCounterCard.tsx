import { l } from '@shared/i18n';
import { nameForHistoryCard, descForHistoryCard } from '../../../RightPanel';

export default function PanelCounterCard({ entry, cls, isCounter }: { entry: any; cls: (c: string) => string; isCounter: boolean }) {
    return (
        <>
            {entry.targetId && (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">{l('cardDetail.objective')}</span>
                        <span className="text-zinc-200">[{entry.targetId}]{entry.targetClass ? cls(entry.targetClass) : ''}</span>
                    </div>
                    {entry.counterCardId && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-violet-400 font-semibold">{l('cardDetail.counters')}</span>
                            <span className="text-zinc-200">{nameForHistoryCard(entry.counterCardId)}</span>
                        </div>
                    )}
                </div>
            )}
            {entry.counterCardId ? (() => {
                const desc = descForHistoryCard(entry.cardId) ?? descForHistoryCard(entry.counterCardId);
                const cdesc = descForHistoryCard(entry.counterCardId);
                const atkName = nameForHistoryCard(entry.cardId);
                const cName = nameForHistoryCard(entry.counterCardId);
                return (
                    <div className="space-y-3">
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                            <div className="text-zinc-400 text-[10px] mb-1">{l('cardDetail.playerPlays', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                            <div className="font-semibold text-zinc-200 mb-1">{cName}</div>
                            {cdesc && <div>{cdesc}</div>}
                        </div>
                        <div className="bg-violet-900/15 border border-violet-700/40 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                            <div className="text-violet-400 text-[10px] mb-1">{l('cardDetail.butOpponentCounters')}</div>
                            <div className="font-semibold text-violet-300 mb-1">{atkName}</div>
                            {desc && <div>{desc}</div>}
                        </div>
                    </div>
                );
            })() : (() => {
                const desc = descForHistoryCard(entry.cardId);
                const name = nameForHistoryCard(entry.cardId);
                return (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                        <div className="font-semibold text-zinc-200 mb-1">{name}</div>
                        {desc && <div>{desc}</div>}
                        {entry.details && <div className="text-zinc-400 mt-1 text-[10px]">{entry.details}</div>}
                    </div>
                );
            })()}
        </>
    );
}
