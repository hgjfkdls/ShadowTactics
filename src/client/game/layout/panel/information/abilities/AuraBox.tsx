import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '@shared';
import { l } from '@shared/i18n';
import { getAuraBuffs, AURA_CONFIG } from '@shared/game/aura';
import { BASE_STATS } from '@shared/game/units';

const cls = (c: string) => l(`unit.class.${c}`) || c;

export default function AuraBox({ state, playerId }: { state: GameState; playerId: string }) {
    const ab = getAuraBuffs(state, playerId);
    const boxRef = useRef<HTMLDivElement>(null);
    const [showTip, setShowTip] = useState(false);
    const items = [
        { key: 'shieldPoints', name: l('aura.shieldName'), value: ab.shieldPoints, color: 'var(--color-class-infantry)', desc: l('aura.shieldDesc') },
        { key: 'defenseBonus', name: l('aura.defenseName'), value: ab.defenseBonus, color: 'var(--color-class-lancer)', desc: l('aura.defenseDesc') },
        { key: 'difficultyPenalty', name: l('aura.evasionName'), value: ab.difficultyPenalty, color: 'var(--color-class-cavalry)', desc: l('aura.evasionDesc') },
        { key: 'difficultyReduction', name: l('aura.precisionName'), value: ab.difficultyReduction, color: 'var(--color-class-archer)', desc: l('aura.precisionDesc') },
    ];
    return (
        <div ref={boxRef} className="bg-zinc-800/40 border border-zinc-700/60 rounded-lg p-2.5 cursor-help" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-class-general)' }}>{l('aura.title')}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {items.map(item => (
                    <div key={item.key} className="flex items-center justify-between text-[11px]">
                        <span className="font-bold" style={{ color: item.color }}>{item.name}</span>
                        <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                ))}
            </div>
            {showTip && boxRef.current && createPortal(
                <div className="fixed z-[100] bg-zinc-900 border border-zinc-600 rounded-lg p-2.5 space-y-1.5 shadow-xl" style={{
                    right: window.innerWidth - boxRef.current.getBoundingClientRect().left + 8 + 'px',
                    top: boxRef.current.getBoundingClientRect().top - 10 + 'px',
                    width: '200px',
                }}>
                    {items.map(item => (
                        <div key={item.key} className="text-[10px] leading-relaxed">
                            <span className="font-semibold" style={{ color: item.color }}>{item.name}</span>
                            <span className="text-zinc-300"> — {item.desc}</span>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
