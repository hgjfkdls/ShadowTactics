import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState } from '../utils';
import { resolveAttack } from '../combat';
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

    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range) return state;

    const ap = getPlayerAP(state, playerId);
    const costResult: CombatResult = { difficulty: 0, damage: 0, attackCost: 0, ignoresPassives: false };
    applyCostAbilities(
        { state, attacker: unit, defender: target, distance, roll: 0, ctx: {} },
        costResult
    );
    const cost = getAttackCost() + costResult.attackCost;
    if (ap < cost) return state;

    const { state: afterAttack } = resolveAttack({
        state,
        unit,
        target,
        from: unit.position,
        to: target.position,
        distance,
    });

    let s = pipeState(
        afterAttack,
        (s) => consumeAP(s, playerId, cost)
    );

    s = consumeModifier(s, playerId, 'attackCost', 1);

    return s;
}
