import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState, isHexOccupied, isWithinBounds, updateUnit } from '../utils';
import { getMovementCost } from '../movement';
import { getPlayerAP, consumeAP, updateUnitPos } from './helpers';
import { consumeModifier, modifierExists } from '../modifiers/engine';

export function handleMove(state: GameState, action: GameAction): GameState {
    if (action.type !== 'MOVE_UNIT') return state;

    const playerId = action.playerId;
    if (playerId !== state.activePlayer) return state;

    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== playerId) return state;

    // Bloqueado por Confusión
    if (modifierExists(state, 'blocked')) return state;

    const to = action.to;
    const distance = hexDistance(unit.position, to);
    if (!isWithinBounds(to, state.map.radius)) return state;
    if (distance !== 1) return state;
    if (isHexOccupied(state, to, unit.id)) return state;

    const ap = getPlayerAP(state, playerId);
    let cost = getMovementCost(unit, to);
    const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
    if (hasSurcharge) {
        cost += 1;
    }
    // Modificadores de cartas (SET, ADD, MUL sobre movementCost)
    const movementMods = state.activeModifiers.filter(
        m => m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
    );
    for (const m of movementMods) {
        if (m.operator === 'SET') cost = m.value;
        else if (m.operator === 'ADD') cost += m.value;
        else if (m.operator === 'MUL') cost *= m.value;
    }

    if (ap < cost) return state;

    let s = pipeState(
        state,
        (s) => consumeAP(s, playerId, cost),
        (s) => updateUnitPos(s, unit.id, to),
        (s) => updateUnit(s, unit.id, (u) => ({ ...u, movedThisTurn: true, didMovePreviousTurn: true })),
        (s) => hasSurcharge ? updateUnit(s, unit.id, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 })) : s,
    );

    // Consumir modificador de movementCost
    s = consumeModifier(s, playerId, 'movementCost', 1);

    return s;
}
