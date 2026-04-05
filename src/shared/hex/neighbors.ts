import { HexCoord } from './coord';
import { HEX_DIRECTIONS } from './directions';

export function hexNeighbors(coord: HexCoord): HexCoord[] {
    return HEX_DIRECTIONS.map(d => ({
        q: coord.q + d.q,
        r: coord.r + d.r
    }));
}
