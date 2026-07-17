import { l } from '@shared/i18n';

export default function PanelTarget({ entry, cls }: { entry: any; cls: (c: string) => string }) {
    if (entry.targetId == null) return null;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-violet-400 font-semibold">{l('cardDetail.objective')}</span>
            <span className="text-zinc-200">[{entry.targetId}] {cls(entry.targetClass)}</span>
        </div>
    );
}
