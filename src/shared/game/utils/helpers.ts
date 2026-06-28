import type { GameState, Unit } from '../state';

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
