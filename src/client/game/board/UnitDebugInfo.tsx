import type { Unit } from '@shared/game/state';

export function UnitDebugInfo({ unit }: { unit: Unit }) {
    const flags = unit.flags ?? [];
    return <tspan x="0" dy="0">flags: [{flags.join(', ')}]</tspan>;
}
