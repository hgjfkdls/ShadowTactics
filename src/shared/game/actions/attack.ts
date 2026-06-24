import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState, updateUnit } from '../utils';
import { resolveAttack } from '../combat';
import type { AttackResult } from '../combat';
import { getPlayerAP, consumeAP, getAttackCost } from './helpers';
import { consumeModifier } from '../modifiers/engine';
import { applyCostAbilities } from '../combat/ability-effects';
import type { CombatResult } from '../combat/ability-effects';

export function handleAttack(state: GameState, action: GameAction): GameState {
    if (action.type !== 'ATTACK_UNIT') return state;

    const playerId = action.playerId;
    if (playerId !== state.activePlayer) return state;

    const unit = state.units[action.unitId];
    const target = state.units[action.targetId];
    if (!unit || !target) return state;
    if (unit.owner !== playerId) return state;
    if (target.owner === playerId) return state;

    // Solo 1 ataque básico por turno por unidad
    if (unit.attackedThisTurn) return state;

    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range) return state;

    const ap = getPlayerAP(state, playerId);
    const costResult: CombatResult = { difficulty: 0, damage: 0, attackCost: 0, ignoresPassives: false };
    applyCostAbilities(
        { state, attacker: unit, defender: target, distance, roll: 0, ctx: {} },
        costResult
    );
    let cost = getAttackCost() + costResult.attackCost;
    const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
    if (hasSurcharge) cost += 1;
    if (ap < cost) return state;

    const result: AttackResult = resolveAttack({
        state,
        unit,
        target,
        from: unit.position,
        to: target.position,
        distance,
    });

    let s = pipeState(
        result.state,
        (s) => consumeAP(s, playerId, cost),
        (s) => updateUnit(s, action.unitId, (u) => ({ ...u, attackedThisTurn: true })),
        (s) => hasSurcharge ? updateUnit(s, action.unitId, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 })) : s,
    );

    s = consumeModifier(s, playerId, 'attackCost', 1);

    s = {
        ...s,
        lastAttackResult: {
            attackerId: action.unitId,
            targetId: action.targetId,
            die1: result.roll.die1,
            die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            hit: result.hit,
            damage: result.damage,
            counterDamage: result.counterDamage,
            attackerClass: unit.class,
            targetClass: target.class,
        },
    };

    return s;
}
