import type { GameState, HexCoord } from '../state';
import { updateUnit } from '../utils';

export function updateUnitPos(state: GameState, unitId: string, to: HexCoord): GameState {
    return updateUnit(state, unitId, (u) => ({ ...u, position: to }));
}
