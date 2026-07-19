import type { GameState, Unit } from '../state';
import { roll2d6 } from '../utils/rng';
import { pipeState, dealDamage, updateUnit } from '../utils';
import { getDifficulty, isCritical, getCriticalBonus } from './hit';
import { canCounterattack, getCounterDamage } from './counter';
import type { HexCoord } from '../../hex';
import { consumeModifier, addModifier } from '../modifiers/engine';
import { applyDifficultyAbilities, applyDamageAbilities, applyDefenseAbilities, applyPostHitAbilities } from './ability-effects';
import type { CombatResult } from './ability-effects';
import { computeAttack, getAbilityConfig } from './compute';
import type { ComputeResult } from './compute';
import { debugCombat } from '../../debug';
import { initDebug } from '../../debug';

initDebug();

function hasCapitanCounterattack(state: GameState, defender: Unit, distance: number): boolean {
    if (defender.class !== 'general') return false;
    if (distance !== 1) return false;
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
    isExtraAttack?: boolean;
    noCritical?: boolean;  // No puede ser crítico (patada, ejecutar)
    configId?: string;
    paCost?: number;  // PA real pagado (se resuelve como precondición en la acción)
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
    noCritical?: boolean;
    compute?: ComputeResult;
    configId?: string;
    preModifiers?: { defAttack: number; defDefense: number; atkAttack: number };
    consumedModifiers?: any[]; // Snapshot of activeModifiers before consumption, for display
};

export function resolveAttack(input: AttackInput): AttackResult {
    const { state, unit, target, distance } = input;

    // Snapshot modifiers before consumption for display purposes
    const consumedModifiers = state.activeModifiers;

    // Dificultad (no depende del roll)
    let difficulty = getDifficulty(unit, distance);
    if (input.isCarga) difficulty -= 1;
    if (input.extraDifficulty) difficulty += input.extraDifficulty;

    const diffCtx = { state, attacker: unit, defender: target, distance, roll: 0, ctx: input };
    const diffResult: CombatResult = { difficulty, damage: 0, attackCost: 0, actionCost: 0, ignoresPassives: false };
    applyDifficultyAbilities(diffCtx, diffResult);
    const finalDifficulty = diffResult.difficulty;

    // Compute formula from config (before hit/miss, available in both branches)
    let compute: ComputeResult | undefined;
    if (input.configId) {
        const cfg = getAbilityConfig(input.configId);
        if (cfg && cfg.allowedModifiers.length > 0) {
            compute = computeAttack(state, unit, target, distance, cfg, input.extraDifficulty, input.paCost);
        }
    }

    const { die1, die2, total, seed: newSeed } = roll2d6(state.rngSeed);
    const canCounter = canCounterattack(unit, target, distance);
    const applyRNG = (s: GameState) => ({ ...s, rngSeed: newSeed });
    const rollResult: AttackRoll = { die1, die2, total, seed: newSeed };

        if (total < finalDifficulty) {
        // MISS
        let cdmg = 0;
        let s = pipeState(state, applyRNG);
        s = applyPostHitAbilities({ state: s, attacker: unit, defender: target, distance, roll: total, ctx: input }, s, false);
        if (canCounter && !input.isExtraAttack) {
            cdmg = getCounterDamage();
            if (hasCapitanCounterattack(state, target, distance)) {
                cdmg += 1;  // contador normal (2) + capitán (+1) = 3
            }
            s = dealDamage(s, unit.id, cdmg);
        }
        // Consumir modificadores incluso en fallo (flechas de fuego, rayo celestial, etc.)
        s = consumeModifier(s, unit.owner, 'damage', 1, undefined, input.configId);
        s = consumeModifier(s, target.owner, 'damage', 1, target.id, input.configId);
        s = consumeModifier(s, target.owner, 'defense', 1, target.id, input.configId);
        s = consumeModifier(s, unit.owner, 'dotOnHit', 1, unit.id, input.configId);
        s = consumeModifier(s, unit.owner, 'attack', 1, unit.id, input.configId);
        s = consumeModifier(s, unit.owner, 'attack', 1, undefined, input.configId);
        s = consumeModifier(s, unit.owner, 'difficulty', 1, unit.id, input.configId);
        s = consumeModifier(s, unit.owner, 'difficulty', 1, undefined, input.configId);
        s = consumeModifier(s, null, 'attackCost', 1, undefined, input.configId);
        s = consumeModifier(s, unit.owner, 'actionCost', 1, undefined, input.configId);
        return { state: s, roll: rollResult, difficulty: finalDifficulty, hit: false, damage: 0, counterDamage: cdmg, compute, configId: input.configId, consumedModifiers };
    }

    // HIT — computar daño ahora (depende del roll para crítico)
    let dmg = input.fixedDamage ?? unit.attack;
    const isCrit = !input.noCritical && isCritical(total);
    if (!input.fixedDamage) {
        if (isCrit) dmg += getCriticalBonus();
        if (input.isCarga) dmg += 1;
        if (input.damagePenalty) dmg -= input.damagePenalty;
    }

    const combatResult: CombatResult = { difficulty: 0, damage: dmg, attackCost: 0, actionCost: 0, ignoresPassives: false };
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

    // Consumir modificadores tras el ataque (por unidad específica)
    s = consumeModifier(s, unit.owner, 'difficulty', 1, unit.id, input.configId);
    s = consumeModifier(s, unit.owner, 'difficulty', 1, undefined, input.configId);
    s = consumeModifier(s, unit.owner, 'attack', 1, unit.id, input.configId);
    s = consumeModifier(s, unit.owner, 'attack', 1, undefined, input.configId);
    s = consumeModifier(s, unit.owner, 'damage', 1, undefined, input.configId);
    // Consumir modificadores defensivos del objetivo (por unidad específica)
    s = consumeModifier(s, target.owner, 'damage', 1, target.id, input.configId);
    s = consumeModifier(s, target.owner, 'defense', 1, target.id, input.configId);
    s = consumeModifier(s, null, 'attackCost', 1, undefined, input.configId);
    s = consumeModifier(s, unit.owner, 'actionCost', 1, undefined, input.configId);

    // Aplicar DoT si el atacante tenía flechas_fuego (dotOnHit)
    const hadDot = s.activeModifiers.some(m => m.stat === 'dotOnHit' && m.sourcePlayerId === unit.owner && m.remainingUses !== undefined && m.remainingUses > 0);
    s = consumeModifier(s, unit.owner, 'dotOnHit', 1, unit.id, input.configId);
    if (hadDot) {
        s = addModifier(s, unit.owner, target.id, 'passiveDamage', 1, 'ADD', 0, 2);
    }

    let cdmg = canCounter ? getCounterDamage() : 0;

    // Capitán de la Guardia: en acierto 1 daño verdadero (reemplaza), en fallo se suma al normal
    if (hasCapitanCounterattack(state, target, distance)) {
        cdmg = 1;  // en acierto: solo 1, reemplaza el contraataque normal
        s = dealDamage(s, unit.id, cdmg);
    }

    return { state: s, roll: rollResult, difficulty: finalDifficulty, hit: true, damage: finalDamage, counterDamage: cdmg, noCritical: input.noCritical, compute, configId: input.configId, consumedModifiers };
}
