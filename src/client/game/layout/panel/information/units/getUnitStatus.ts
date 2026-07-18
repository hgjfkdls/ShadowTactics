import { l } from '@shared/i18n';
import type { Unit, ModifierInstance } from '@shared';

export function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];

    for (const m of modifiers) {
        if (m.remainingTurns < 0) continue;
        if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;

        const isUnitSpecific = m.targetId === unit.id;
        const isPlayerWide = !m.targetId && m.sourcePlayerId === unit.owner;
        if (!isUnitSpecific && !isPlayerWide) continue;

        const stat = m.stat;
        const nameKey = m.source === 'card' ? `card.${m.sourceName}.name` : `ability.${m.sourceName}.name`;
        const abilityName = m.sourceName ? l(nameKey) || m.sourceName : '';

        if (stat === 'ap') continue;
        if (stat === 'passiveDamage') {
            const label = `${l('unit.status.passiveDamage')} (${m.value} HP, ${m.remainingUses ?? '?'} turnos)`;
            if (!debuffs.includes(label)) debuffs.push(label);
            continue;
        }
        if (stat === 'movementCost' && m.value === 0 && m.operator === 'SET') {
            const label = abilityName || `${l('unitDetail.movement')} 0`;
            if (!buffs.includes(label)) buffs.push(label);
            continue;
        }
        if (stat === 'damage') {
            if (m.value > 0) { const lab = abilityName ? `${abilityName} (+${m.value})` : `+${m.value} daño`; if (!buffs.includes(lab)) buffs.push(lab); }
            else if (m.value < 0) { const lab = abilityName ? `${abilityName} (${m.value})` : `${m.value} daño`; if (!debuffs.includes(lab)) debuffs.push(lab); }
            continue;
        }

        const prefix = m.value > 0 ? '+' : '';
        const valStr = `${prefix}${m.value}`;
        const abbrKey: Record<string, string> = {
            attack: l('passive.attackAbbr'),
            defense: l('passive.defenseAbbr'),
            difficulty: l('passive.difficultyAbbr'),
            range: l('cat.range'),
            damage: 'daño',
            movementCost: l('unitDetail.costLabel', { n: 1 }),
            attackCost: l('unitDetail.costLabel', { n: 1 }),
            actionCost: l('unitDetail.costLabel', { n: 1 }),
        };
        const abbr = abbrKey[stat] ?? stat;
        const label = abilityName ? `${abilityName} (${valStr} ${abbr})` : `${valStr} ${abbr}`;

        if (stat === 'attack' || stat === 'defense' || stat === 'range') {
            if (m.value > 0) { if (!buffs.includes(label)) buffs.push(label); }
            else { if (!debuffs.includes(label)) debuffs.push(label); }
        } else if (stat === 'difficulty') {
            if (m.value > 0) { if (!debuffs.includes(label)) debuffs.push(label); }
            else { if (!buffs.includes(label)) buffs.push(label); }
        } else if (stat === 'attackCost' || stat === 'actionCost') {
            if (m.value > 0) { if (!debuffs.includes(label)) debuffs.push(label); }
            else { if (!buffs.includes(label)) buffs.push(label); }
        } else if (['bloqueo', 'inmovil'].includes(stat)) {
            if (!debuffs.includes(label)) debuffs.push(label);
        }
    }

    return { buffs, debuffs };
}
