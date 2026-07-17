import type { Unit } from '@shared/game/state';
import type { ModifierInstance } from '@shared/game/modifiers';

export function UnitDebugInfo({ unit, modifiers }: { unit: Unit; modifiers?: ModifierInstance[] }) {
    const flags = unit.flags ?? [];
    const unitMods = (modifiers ?? []).filter(m =>
        m.targetId === unit.id && (m.remainingTurns === undefined || m.remainingTurns >= 0)
    );
    const lines: string[] = [`flags: [${flags.join(', ')}]`];
    if (unitMods.length > 0) {
        lines.push('mods:');
        for (const m of unitMods) {
            const turns = m.remainingTurns !== undefined ? ` ${m.remainingTurns}t` : '';
            const uses = m.remainingUses !== undefined ? ` ${m.remainingUses}u` : '';
            const src = m.sourceName ? ` (${m.sourceName})` : '';
            lines.push(`  ${m.stat}=${m.value}${src}${turns}${uses}`);
        }
    }
    return <tspan x="0" dy="0">{lines.join(' | ')}</tspan>;
}
