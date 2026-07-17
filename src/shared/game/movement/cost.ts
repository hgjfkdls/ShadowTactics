import type { Unit, HexCoord } from '../state';

export function getMovementCost(_unit: Unit, _to: HexCoord): number {
    return _unit.movementCost;
}
