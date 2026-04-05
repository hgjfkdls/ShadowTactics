import { HexCoord } from './coord';

export type HexMap = {
    radius: number;
};

export function isInsideMap(
    hex: HexCoord,
    map: HexMap
): boolean {
    const { q, r } = hex;
    const s = -q - r;

    return (
        Math.abs(q) <= map.radius &&
        Math.abs(r) <= map.radius &&
        Math.abs(s) <= map.radius
    );
}

export function generateHexMap(map: HexMap): HexCoord[] {
    const results: HexCoord[] = [];

    for (let q = -map.radius; q <= map.radius; q++) {
        for (let r = -map.radius; r <= map.radius; r++) {
            const s = -q - r;
            if (
                Math.abs(q) <= map.radius &&
                Math.abs(r) <= map.radius &&
                Math.abs(s) <= map.radius
            ) {
                results.push({ q, r });
            }
        }
    }

    return results;
}
