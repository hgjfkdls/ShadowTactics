import type { GameState, HexCoord } from '../state';

export function isHexOccupied(state: GameState, position: HexCoord, excludeUnitId?: string): boolean {
    return Object.values(state.units).some(
        (u) =>
            !u.dying &&
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
