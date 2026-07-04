import type { GameState, Unit } from '../state';
import { getUnitModifiers } from './ability-effects';
import { getDifficulty } from './hit';
import { ABILITY_CONFIG } from '../data/ability-config';
import type { AbilityConfig } from '../data/ability-config';

/**
 * Resultado del cómputo de una habilidad/ataque.
 * Tanto el cálculo real como la fórmula se construyen desde aquí.
 */
export type ComputeResult = {
    baseAttack: number;
    baseDifficulty: number;
    basePaCost: number;
    finalPaCost: number;
    rawDamage: number;
    finalDamage: number;
    finalDifficulty: number;
    modifiers: { stat: string; value: number; source: string; label: string }[];
    dmgFormula: string;
    diffFormula: string;
    paCostFormula: string;
};

/**
 * Busca el config para una habilidad por su cardId.
 */
export function getAbilityConfig(cardId?: string): AbilityConfig | undefined {
    if (cardId && ABILITY_CONFIG[cardId]) return ABILITY_CONFIG[cardId];
    return undefined;
}

/**
 * Computa el daño y la fórmula para un ataque básico o habilidad de ataque.
 * Filtra los modificadores según `allowedModifiers` del config.
 * El PA cost se recibe ya calculado desde la acción (precondición).
 */
export function computeAttack(
    state: GameState,
    attacker: Unit,
    defender: Unit,
    distance: number,
    config: AbilityConfig,
    extraDifficulty = 0,
    paCost?: number,
): ComputeResult {
    const configAtk = typeof config.base.attack === 'number' ? config.base.attack : attacker.attack - (config.extraAttack ?? 0);
    const extraAtk = config.extraAttack ?? 0;
    const baseAttack = configAtk;  // base sin extras
    const isArcherFormula = (attacker.abilities ?? []).includes('blanco_facil');
    const extraDiff = (config.extraDifficulty ?? 0) + extraDifficulty;
    const baseDifficulty = (typeof config.base.difficulty === 'number' ? config.base.difficulty : attacker.difficulty) - extraDiff;

    // Obtener modifiers pero solo los permitidos por el config
    const allMods = getUnitModifiers(state, attacker.owner, attacker.id);
    const defMods = getUnitModifiers(state, defender.owner, defender.id);

    const modEntries: { stat: string; value: number; source: string; label: string }[] = [];

    if (extraAtk !== 0) {
        modEntries.push({ stat: 'attack', value: extraAtk, source: 'extra', label: `${config.displayName ?? 'Extra'}: ${extraAtk > 0 ? '+' : ''}${extraAtk} ataque` });
    }
    if (config.allowedModifiers.includes('attack') && allMods.attackMod !== 0) {
        modEntries.push({ stat: 'attack', value: allMods.attackMod, source: 'attack', label: `Ataque: ${allMods.attackMod > 0 ? '+' : ''}${allMods.attackMod}` });
    }
    if (config.allowedModifiers.includes('defense') && defMods.defenseMod !== 0) {
        modEntries.push({ stat: 'defense', value: -defMods.defenseMod, source: 'defense', label: `Defensa: -${defMods.defenseMod}` });
    }
    if (config.allowedModifiers.includes('difficulty') && allMods.difficulty !== 0) {
        modEntries.push({ stat: 'difficulty', value: allMods.difficulty, source: 'difficulty', label: `Dificultad: ${allMods.difficulty > 0 ? '+' : ''}${allMods.difficulty}` });
    }
    if (extraDiff !== 0) {
        modEntries.push({ stat: 'difficulty', value: extraDiff, source: 'extra', label: `${config.displayName ?? 'Extra'}: ${extraDiff > 0 ? '+' : ''}${extraDiff} dificultad` });
    }
    if (config.allowedModifiers.includes('attackCost') && allMods.attackCost !== 0) {
        modEntries.push({ stat: 'attackCost', value: allMods.attackCost, source: 'attackCost', label: `PA ataque: +${allMods.attackCost}` });
    }
    if (config.allowedModifiers.includes('actionCost') && allMods.actionCost !== 0) {
        modEntries.push({ stat: 'actionCost', value: allMods.actionCost, source: 'actionCost', label: `PA acción: +${allMods.actionCost}` });
    }

    const basePaCost = config.base.paCost ?? 0;

    let rawDamage = baseAttack + modEntries.filter(m => m.stat === 'attack').reduce((s, m) => s + m.value, 0)
        + modEntries.filter(m => m.stat === 'defense').reduce((s, m) => s + m.value, 0);
    const finalDamage = Math.max(1, rawDamage);

    const modDiff = modEntries.filter(m => m.stat === 'difficulty').reduce((s, m) => s + m.value, 0) + extraDifficulty;
    const finalDifficulty = baseDifficulty + modDiff;

    const atkEntries = modEntries.filter(m => m.stat === 'attack');
    const defEntries = modEntries.filter(m => m.stat === 'defense');
    const diffEntries = modEntries.filter(m => m.stat === 'difficulty');
    const atkLetters = atkEntries.map((m, i) => `${m.value >= 0 ? '+' : ''}${String.fromCharCode(97 + i)}`);
    const defLetters = defEntries.map((m, i) => `${m.value >= 0 ? '-' : '+'}${String.fromCharCode(97 + atkEntries.length + i)}`);
    const dmgFormula = `${baseAttack} ${[...atkLetters, ...defLetters].join(' ')} = ${rawDamage}`;

    const diffLetters = diffEntries.map((m, i) => `${String.fromCharCode(97 + i)}`);
    const rawDiff = isArcherFormula ? 5 + distance : baseDifficulty;
    const diffFormula = `base ${baseDifficulty}${isArcherFormula ? ` (arco: 5 + ${distance})` : ''}${diffLetters.length > 0 ? ', ' + diffLetters.map(l => `+${l}`).join(' ') + ' → ' + finalDifficulty : rawDiff !== finalDifficulty ? ` → ${finalDifficulty}` : ''}`;

    const finalPaCost = paCost ?? basePaCost;
    const paParts: string[] = [];
    if (allMods.attackCost !== 0 && config.allowedModifiers.includes('attackCost')) paParts.push(`+${allMods.attackCost} atq`);
    if (allMods.actionCost !== 0 && config.allowedModifiers.includes('actionCost')) paParts.push(`+${allMods.actionCost} acc`);
    const paCostFormula = paParts.length > 0 ? `${basePaCost} ${paParts.join(' ')} = ${finalPaCost}` : `${finalPaCost}`;

    return {
        baseAttack,
        baseDifficulty,
        basePaCost,
        finalPaCost,
        rawDamage,
        finalDamage,
        finalDifficulty,
        modifiers: modEntries,
        dmgFormula,
        diffFormula,
        paCostFormula,
    };
}
