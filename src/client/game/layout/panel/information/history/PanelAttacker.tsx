import { l } from '@shared/i18n';

export default function PanelAttacker({ entry }: { entry: any }) {
    if (entry.attackerId == null) return null;
    const cls = (c: string) => l(`unit.class.${c}`) ?? c;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-400 font-semibold">{l('attackDetail.attacker')}</span>
            <span className="text-zinc-200">[{entry.attackerId}]{cls(entry.attackerClass)}</span>
        </div>
    );
}
