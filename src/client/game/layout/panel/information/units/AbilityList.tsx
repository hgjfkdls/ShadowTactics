import { useState } from 'react';
import { l } from '@shared/i18n';
import { ABILITIES } from '@shared/game/data/abilities';

function cls(cls: string): string { return l(`unit.class.${cls}`) || cls; }

export function AbilityList({ abilities, ownerPlayerId, startCollapsed }: { abilities: string[]; ownerPlayerId?: string; startCollapsed?: boolean }) {
    const [expanded, setExpanded] = useState<Set<string>>(() => startCollapsed ? new Set() : new Set(abilities));

    function toggleAbility(id: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    return (
        <div className="space-y-1">
            <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">{l('unitDetail.abilities')}</div>
            <div className="space-y-2">
                {abilities.map(abId => {
                    const ab = ABILITIES[abId];
                    if (!ab) return null;
                    const isOpen = expanded.has(abId);
                    let description = l(`ability.${abId}.desc`);
                    if (!description || description === `ability.${abId}.desc`) description = ab.description;
                    if (abId === 'blanco_facil' && ownerPlayerId?.startsWith('francotirador')) {
                        description = description.replace('-1', '-2');
                    }
                    return (
                        <div key={abId} className="border border-zinc-700 bg-zinc-800/50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs cursor-pointer select-none" onClick={() => toggleAbility(abId)}>
                                <span className="text-[9px] font-mono text-zinc-500">
                                    {ab.type === 'active' ? `⚡${ab.cost ?? '?'}PA` : '🔰'}
                                </span>
                                <span className="font-semibold text-zinc-200">{l(`ability.${abId}.name`) || ab.name}</span>
                                <span className="ml-auto text-zinc-600 text-[10px]">{isOpen ? '▼' : '▶'}</span>
                            </div>
                            {isOpen && (
                                <>
                                    <div className="text-[11px] text-zinc-300 leading-relaxed">{description}</div>
                                    {(() => {
                                        const tr = l(`ability.${abId}.restriction`);
                                        const restriction = (tr && tr !== `ability.${abId}.restriction`) ? tr : (ab.restrictions || '');
                                        if (!restriction) return null;
                                        return <div className="text-[10px] text-effect-diff/80 italic">{restriction}</div>;
                                    })()}
                                    <div className="text-[9px] text-zinc-500">{ab.type === 'active' ? l('unitDetail.typeActive') : l('unitDetail.typePassive')}{ab.cost !== undefined ? ` · ${l('unitDetail.costLabel', { n: ab.cost })}` : ''}</div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
