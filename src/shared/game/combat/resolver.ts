import type { GameState, Unit } from '../state';
import { roll2d6 } from '../utils/rng';
import { pipeState, dealDamage } from '../utils';
import { getDifficulty, isCritical, getCriticalBonus } from './hit';
import { canCounterattack, getCounterDamage } from './counter';
import type { HexCoord } from '../../hex';
import { consumeModifier, addModifier } from '../modifiers/engine';
import { applyDifficultyAbilities, applyDamageAbilities, applyDefenseAbilities, applyPostHitAbilities } from './ability-effects';
import type { CombatResult } from './ability-effects';

export type AttackInput = {
    state: GameState;
    unit: Unit;
    target: Unit;
    from: HexCoord;
    to: HexCoord;
    distance: number;
    extraDifficulty?: number;
    damagePenalty?: number;
    bonusRange?: number;
    isCarga?: boolean;
};

export type AttackRoll = {
    die1: number;
    die2: number;
    total: number;
    seed: number;
};

export type AttackResult = {
    state: GameState;
    roll: AttackRoll;
    difficulty: number;
    hit: boolean;
    damage: number;
    counterDamage: number;
};

export function resolveAttack(input: AttackInput): AttackResult {
    const { state, unit, target, distance } = input;

    // Dificultad (no depende del roll)
    let difficulty = getDifficulty(unit, distance);
    if (input.isCarga) difficulty -= 1;
    if (input.extraDifficulty) difficulty += input.extraDifficulty;
    const diffCtx = { state, attacker: unit, defender: target, distance, roll: 0, ctx: input };
    const diffResult: CombatResult = { difficulty, damage: 0, attackCost: 0, ignoresPassives: false };
    applyDifficultyAbilities(diffCtx, diffResult);
    const finalDifficulty = diffResult.difficulty;

    const { die1, die2, total, seed: newSeed } = roll2d6(state.rngSeed);
    const canCounter = canCounterattack(unit, target, distance);
    const applyRNG = (s: GameState) => ({ ...s, rngSeed: newSeed });
    const rollResult: AttackRoll = { die1, die2, total, seed: newSeed };

    if (total < finalDifficulty) {
        // MISS
        let cdmg = 0;
        let s = pipeState(state, applyRNG);
        s = applyPostHitAbilities({ state: s, attacker: unit, defender: target, distance, roll: total, ctx: input }, s, false);
        if (canCounter) {
            cdmg = getCounterDamage();
            s = dealDamage(s, unit.id, cdmg);
        }
        return { state: s, roll: rollResult, difficulty: finalDifficulty, hit: false, damage: 0, counterDamage: cdmg };
    }

    // HIT — computar daño ahora (depende del roll para crítico)
    let dmg = unit.attack;
    if (isCritical(total)) dmg += getCriticalBonus();
    if (input.isCarga) dmg += 1;
    if (input.damagePenalty) dmg -= input.damagePenalty;

    const combatResult: CombatResult = { difficulty: 0, damage: dmg, attackCost: 0, ignoresPassives: false };
    const defCtx = { state, attacker: unit, defender: target, distance, roll: total, ctx: input };
    applyDamageAbilities(defCtx, combatResult);
    applyDefenseAbilities(defCtx, combatResult);
    let finalDamage = Math.max(combatResult.damage, 1);

    let s = pipeState(state, applyRNG);
    s = dealDamage(s, target.id, finalDamage);
    s = applyPostHitAbilities(defCtx, s, true);

    // Consumir modificadores tras el ataque
    s = consumeModifier(s, unit.owner, 'difficulty', 1);
    s = consumeModifier(s, unit.owner, 'attack', 1);
    s = consumeModifier(s, unit.owner, 'damage', 1);

    // Aplicar DoT si el atacante tenía flechas_fuego (dotOnHit)
    const hadDot = s.activeModifiers.some(m => m.stat === 'dotOnHit' && m.sourcePlayerId === unit.owner && m.remainingUses !== undefined && m.remainingUses > 0);
    s = consumeModifier(s, unit.owner, 'dotOnHit', 1);
    if (hadDot) {
        s = addModifier(s, unit.owner, target.id, 'passiveDamage', 1, 'ADD', 0, 2);
    }

    const cdmg = canCounter ? getCounterDamage() : 0;

    return { state: s, roll: rollResult, difficulty: finalDifficulty, hit: true, damage: finalDamage, counterDamage: cdmg };
}
