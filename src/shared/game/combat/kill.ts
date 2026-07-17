import type { GameState, Unit, UnitId } from '../state';
import { updateUnit } from '../utils/helpers';
import { processOnKillPassives } from '../passive';

function killUnit(state: GameState, unitId: string, killerId?: string): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;
    const { [unitId]: _, ...remainingUnits } = state.units;
    let newState: GameState = {
        ...state,
        units: remainingUnits,
        graveyard: {
            ...state.graveyard,
            [unitId]: unit
        }
    };
    if (unit.class === 'general') {
        newState = {
            ...newState,
            gamePhase: 'GAME_OVER',
            winner: unit.owner === 'p1' ? 'p2' : 'p1'
        };
    }
    // Karma (Monje Shaolin): la unidad que eliminó a esta recibe 2 de daño
    if (!killerId) {
        const lastAttack = state.lastAttackResult;
        if (lastAttack && lastAttack.targetId === unitId) {
            killerId = lastAttack.attackerId;
        }
    }
    if (killerId) {
        newState = processOnKillPassives(newState, unitId, killerId);
    }
    return newState;
}

export function dealDamage(state: GameState, unitId: string, damage: number, killerId?: string): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    // Consumir escudo del aura antes que HP
    const shield = unit.auraShield ?? 0;
    if (shield >= damage) {
        return updateUnit(state, unitId, (u) => ({ ...u, auraShield: shield - damage }));
    }
    const remaining = damage - shield;

    const newHp = unit.hp - remaining;
    let newState = updateUnit(state, unitId, (u) => ({ ...u, hp: newHp, auraShield: 0 }));
    if (newHp <= 0) {
        newState = killUnit(newState, unitId, killerId);
    }
    return newState;
}
