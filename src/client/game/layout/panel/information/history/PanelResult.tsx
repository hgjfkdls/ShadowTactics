import { l } from '@shared/i18n';

export default function PanelResult({ entry }: { entry: any; showCounterOnHit?: boolean; showCounterOnMiss?: boolean; pShowDmg?: boolean }) {
    if (entry.attackerId == null) return null;
    return (
        <div className={`rounded-lg p-3 text-sm space-y-1 ${entry.hit ? 'bg-hit-bg border border-hit-border' : 'bg-miss-bg border border-miss-border'}`}>
            <div className="flex items-center justify-between">
                <span className="font-semibold">{entry.hit ? l('attackDetail.hit') : l('attackDetail.miss')}</span>
            </div>
            {(entry.targetKilled || entry.attackerKilled) && (
                <div className="text-yellow-400 font-semibold pt-1 border-t border-zinc-700 mt-1">
                    {entry.targetKilled && `⚫ ${l('attackDetail.targetKilled')}`}
                    {entry.attackerKilled && ` ⚫ ${l('attackDetail.attackerKilled')}`}
                </div>
            )}
        </div>
    );
}
