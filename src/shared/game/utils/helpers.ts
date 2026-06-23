import type { GameState, Unit, UnitId, PlayerId, HexCoord } from '../state';
import { hexDistance } from '../../hex';

export function isHexOccupied(state: GameState, position: HexCoord, excludeUnitId?: string): boolean {
    return Object.values(state.units).some(
        (u) =>
            u.id !== excludeUnitId &&
            u.position.q === position.q &&
            u.position.r === position.r
    );
}

export function isWithinBounds(pos: HexCoord, radius?: number): boolean {
    const max = radius ?? 5;
    const s = -pos.q - pos.r;
    return (
        Math.abs(pos.q) <= max &&
        Math.abs(pos.r) <= max &&
        Math.abs(s) <= max
    );
}

export function updateUnit(state: GameState, unitId: string, updater: (unit: Unit) => Unit): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;
    return {
        ...state,
        units: {
            ...state.units,
            [unitId]: updater(unit)
        }
    };
}

export function killUnit(state: GameState, unitId: string): GameState {
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
    return newState;
}

export function dealDamage(state: GameState, unitId: string, damage: number): GameState {
    const unit = state.units[unitId];
    if (!unit) return state;
    const newHp = unit.hp - damage;
    let newState = updateUnit(state, unitId, (u) => ({ ...u, hp: newHp }));
    if (newHp <= 0) {
        newState = killUnit(newState, unitId);
    }
    return newState;
}

export function countPlayerClasses(state: GameState, playerId: PlayerId): Record<Unit['class'], number> {
    const counts: Record<Unit['class'], number> = {
        archer: 0, infantry: 0, lancer: 0, cavalry: 0, general: 0
    };
    Object.values(state.units)
        .filter(unit => unit.owner === playerId)
        .forEach(unit => { counts[unit.class]++; });
    return counts;
}

export function isNearAnyAlliedUnit(
    state: GameState, playerId: PlayerId, position: HexCoord, distance: number = 2
): boolean {
    return Object.values(state.units)
        .filter(unit => unit.owner === playerId)
        .some(unit => hexDistance(unit.position, position) <= distance);
}
