import type { HexCoord } from '@shared';

export const HEX_SIZE = 40;

export function axialToPixel(
    hex: HexCoord,
    size: number = HEX_SIZE
) {
    const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
    const y = size * (3 / 2) * hex.r;

    return { x, y };
}

export function hexPolygonPoints(
    cx: number,
    cy: number,
    size: number = HEX_SIZE
): string {
    const points: string[] = [];

    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30); // pointy-top
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        points.push(`${x},${y}`);
    }

    return points.join(' ');
}