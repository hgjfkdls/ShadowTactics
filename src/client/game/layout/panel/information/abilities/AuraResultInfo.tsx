import type { GameState } from '@shared';
import { l } from '@shared/i18n';
import { getAuraBuffs } from '@shared/game/aura';

const cls = (c: string) => l(`unit.class.${c}`) || c;

export default function AuraResultInfo({ result, state }: { result: { attackerId?: string; attackerClass: string; targetId?: string; targetClass: string }; state: GameState }) {
    const lines: { text: string; color: string }[] = [];
    const atkUnit = result.attackerId ? (state.units[result.attackerId] ?? state.graveyard[result.attackerId]) : undefined;
    const defUnit = result.targetId ? (state.units[result.targetId] ?? state.graveyard[result.targetId]) : undefined;

    if (result.attackerClass === 'general' && atkUnit) {
        const ab = getAuraBuffs(state, atkUnit.owner);
        if (ab.difficultyReduction > 0) lines.push({ text: l('aura.precision', { n: ab.difficultyReduction }), color: 'var(--color-class-archer)' });
    }
    if (result.targetClass === 'general' && defUnit) {
        const ab = getAuraBuffs(state, defUnit.owner);
        if (ab.difficultyPenalty > 0) lines.push({ text: l('aura.evasion', { n: ab.difficultyPenalty }), color: 'var(--color-class-cavalry)' });
        if (ab.defenseBonus > 0) lines.push({ text: l('aura.defense', { n: ab.defenseBonus }), color: 'var(--color-class-lancer)' });
        if (ab.shieldPoints > 0 && defUnit && (defUnit.auraShield ?? 0) > 0) lines.push({ text: l('aura.shieldActive', { n: defUnit.auraShield ?? 0 }), color: 'var(--color-class-infantry)' });
    }
    if (lines.length === 0) return null;
    return (
        <div className="space-y-0.5">
            {lines.map((l, i) => (
                <div key={i} className="text-[10px] font-semibold" style={{ color: l.color }}>{l.text}</div>
            ))}
        </div>
    );
}
