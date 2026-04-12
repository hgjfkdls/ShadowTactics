import type { GameState, HexCoord } from '@shared';
import { hexRange, isInsideMap } from '@shared';

export function getMoveRange(
    state: GameState,
    unitId: string
): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    return hexRange(unit.position, 1).filter(hex =>
        isInsideMap(hex, state.map)
    );
}