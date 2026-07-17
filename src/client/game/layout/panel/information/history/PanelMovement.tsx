import { l } from '@shared/i18n';

export default function PanelMovement({ entry, cls }: { entry: any; cls: (c: string) => string }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-400 font-semibold">{l('moveDetail.unit')}</span>
                <span className="text-zinc-200">[{entry.unitId}]{cls(entry.unitClass)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">{l('moveDetail.origin')}</span>
                <span className="text-zinc-200 font-mono">({entry.from.q}, {entry.from.r})</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">{l('moveDetail.destination')}</span>
                <span className="text-zinc-200 font-mono">({entry.to.q}, {entry.to.r})</span>
            </div>
        </div>
    );
}
