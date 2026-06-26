import type { GameState, Unit } from '../state';
import { roll2d6 } from '../utils/rng';
import { pipeState, dealDamage, updateUnit } from '../utils';
import { getDifficulty, isCritical, getCriticalBonus } from './hit';
import { canCounterattack, getCounterDamage } from './counter';
import type { HexCoord } from '../../hex';
import { consumeModifier, addModifier } from '../modifiers/engine';
import { applyDifficultyAbilities, applyDamageAbilities, applyDefenseAbilities, applyPostHitAbilities } from './ability-effects';
import type { CombatResult } from './ability-effects';

function hasCapitanCounterattack(state: GameState, defender: Unit, distance: number): boolean {
    if (defender.class !== 'general') return false;
    if (distance !== 1) return false;
    if (defender.usedCounterattack) return false;
    const identity = state.players[defender.owner]?.selectedIdentity ?? '';
    return identity.startsWith('capitan_guardia');
}

export type AttackInput = {
    state: GameState;
    unit: Unit;
    target: Unit;
    from: HexCoord;
    to: HexCoord;
    distance: number;
    extraDifficulty?: number;
    damagePenalty?: number;
    fixedDamage?: number;
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
            if (hasCapitanCounterattack(state, target, distance)) {
                cdmg = 3;
                s = updateUnit(s, target.id, (u) => ({ ...u, usedCounterattack: true }));
            }
            s = dealDamage(s, unit.id, cdmg);
        }
        return { state: s, roll: rollResult, difficulty: finalDifficulty, hit: false, damage: 0, counterDamage: cdmg };
    }

    // HIT — computar daño ahora (depende del roll para crítico)
    let dmg = input.fixedDamage ?? unit.attack;
    if (!input.fixedDamage) {
        if (isCritical(total)) dmg += getCriticalBonus();
        if (input.isCarga) dmg += 1;
        if (input.damagePenalty) dmg -= input.damagePenalty;
        if (unit.celestialRayDamageBonus) dmg += unit.celestialRayDamageBonus;
    }

    const combatResult: CombatResult = { difficulty: 0, damage: dmg, attackCost: 0, ignoresPassives: false };
    const defCtx = { state, attacker: unit, defender: target, distance, roll: total, ctx: input };
    applyDamageAbilities(defCtx, combatResult);
    applyDefenseAbilities(defCtx, combatResult);
    let finalDamage = Math.max(combatResult.damage, 1);

    let s = pipeState(state, applyRNG);
    // Set lastAttackResult before dealing damage (needed for Karma, etc.)
    s = {
        ...s,
        lastAttackResult: {
            attackerId: unit.id,
            targetId: target.id,
            die1, die2, total,
            difficulty: finalDifficulty,
            hit: true,
            damage: finalDamage,
            counterDamage: 0,
            attackerClass: unit.class,
            targetClass: target.class,
        },
    };
    s = dealDamage(s, target.id, finalDamage);
    s = applyPostHitAbilities(defCtx, s, true);

    // Consumir rayo celestial tras el ataque
    if (unit.celestialRayDamageBonus) {
        s = updateUnit(s, unit.id, (u) => ({ ...u, celestialRayDamageBonus: undefined }));
    }

    // Consumir modificadores tras el ataque (por unidad específica)
    s = consumeModifier(s, unit.owner, 'difficulty', 1);
    s = consumeModifier(s, unit.owner, 'attack', 1, unit.id);
    s = consumeModifier(s, unit.owner, 'damage', 1);
    // Consumir modificadores defensivos del objetivo (por unidad específica)
    s = consumeModifier(s, target.owner, 'damage', 1, target.id);

    // Aplicar DoT si el atacante tenía flechas_fuego (dotOnHit)
    const hadDot = s.activeModifiers.some(m => m.stat === 'dotOnHit' && m.sourcePlayerId === unit.owner && m.remainingUses !== undefined && m.remainingUses > 0);
    s = consumeModifier(s, unit.owner, 'dotOnHit', 1);
    if (hadDot) {
        s = addModifier(s, unit.owner, target.id, 'passiveDamage', 1, 'ADD', 0, 2);
    }

    let cdmg = canCounter ? getCounterDamage() : 0;

    // Capitán de la Guardia: contraataque melee 1 dmg incluso en acierto
    if (hasCapitanCounterattack(state, target, distance)) {
        s = dealDamage(s, unit.id, 1);
        s = updateUnit(s, target.id, (u) => ({ ...u, usedCounterattack: true }));
        cdmg = 1;
    }

    return { state: s, roll: rollResult, difficulty: finalDifficulty, hit: true, damage: finalDamage, counterDamage: cdmg };
}
