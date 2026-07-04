import { l } from '@shared/i18n';

export default function PanelModifiers({ allItems, entry }: { allItems: any[]; entry: any }) {
    const isAttackEntry = entry.attackerId != null;
    const isMoveEntry = !isAttackEntry && entry.from != null;
    const items = isAttackEntry ? allItems : isMoveEntry ? entry.modifiers?.map((m: string, i: number) => ({ letter: String.fromCharCode(97 + i), text: m })) : [];
    if (items.length === 0) return null;
    return (
        <div className="space-y-1">
            <div className="text-sm font-semibold text-panel-title uppercase tracking-wide">{l('attackDetail.modifiers')}</div>
            {items.map((item: any, i: number) => (
                <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-xs flex items-center gap-2">
                    <span className="text-zinc-300 font-bold text-sm w-5 text-right">{item.letter}.</span>
                    <span style={{ color: item.color ?? '#d4d4d8' }} className="text-sm">{item.text}</span>
                </div>
            ))}
        </div>
    );
}
