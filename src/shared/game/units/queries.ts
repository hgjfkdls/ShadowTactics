import type { GameState, PlayerId, HexCoord, Unit } from '../state';
import { hexDistance } from '../../hex';

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
