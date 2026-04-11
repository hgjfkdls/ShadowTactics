import { HexCoord } from './coord';

export function hexRange(
    center: HexCoord,
    radius: number
): HexCoord[] {
    const results: HexCoord[] = [];

    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius, -q - radius);
            r <= Math.min(radius, -q + radius);
            r++) {
            results.push({
                q: center.q + q,
                r: center.r + r
            });
        }
    }

    return results;
}