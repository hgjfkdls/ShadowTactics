import { l } from '@shared/i18n';
import type { Unit, ModifierInstance } from '@shared';

export function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];
    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'actionCost', 'bloqueo', 'inmovil'];
    const helpfulStats = ['attack', 'dotOnHit'];
    const passiveStats: string[] = [];
    for (const m of modifiers) {
        if (m.remainingTurns < 0) continue;
        if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
        const isUnitSpecific = m.targetId === unit.id;
        const isPlayerWide = !m.targetId && m.sourcePlayerId === unit.owner;
        if (!isUnitSpecific && !isPlayerWide) continue;
        const stat = m.stat;
        if (stat === 'movementCost' && m.value === 0 && m.operator === 'SET') {
            if (!buffs.includes(stat)) buffs.push(stat);
            continue;
        }
        if (stat === 'damage' && m.value < 0 && m.targetId) {
            continue;
        }
        if (stat === 'attack' && m.value > 0 && m.targetId) {
            continue;
        }
        if (stat === 'passiveDamage') {
            const label = `${l('unit.status.passiveDamage')} (${m.value} HP, ${m.remainingUses ?? '?'} turnos)`;
            if (!debuffs.includes(label)) debuffs.push(label);
            continue;
        }
        if (stat === 'damage') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else if (m.value < 0) { if (!debuffs.includes(stat)) debuffs.push(stat); }
            continue;
        }
        if (stat === 'attack') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else { if (!debuffs.includes(stat)) debuffs.push(stat); }
            continue;
        }
        if (stat === 'ap') continue;
        if (harmfulStats.includes(stat)) { if (!debuffs.includes(stat)) debuffs.push(stat); }
        else if (helpfulStats.includes(stat)) { if (!buffs.includes(stat)) buffs.push(stat); }
        else if (passiveStats.includes(stat)) { if (!debuffs.includes(stat)) debuffs.push(stat); }
    }
    return { buffs, debuffs };
}
