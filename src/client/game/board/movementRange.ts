import type { GameState, HexCoord } from '@shared';
import { hexNeighbors, isInsideMap } from '@shared';
import { isHexOccupied } from '@shared/game/utils';

export function getMoveRange(
    state: GameState,
    unitId: string
): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    return hexNeighbors(unit.position).filter(hex =>
        isInsideMap(hex, state.map) && !isHexOccupied(state, hex, unit.id)
    );
}
