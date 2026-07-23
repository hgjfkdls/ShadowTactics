import { HexCoord } from './coord';

export const HEX_DIRECTIONS: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];

// Ángulos en grados (SVG Y-down, pointy-top hex)
export const DIRECTION_ANGLES: Record<string, number> = {
    '1,0': 0,
    '1,-1': 300,
    '0,-1': 240,
    '-1,0': 180,
    '-1,1': 120,
    '0,1': 60,
};

export function directionToAngle(dir: HexCoord): number {
    return DIRECTION_ANGLES[`${dir.q},${dir.r}`] ?? 0;
}

export function angleDiff(fromDeg: number, toDeg: number): number {
    let diff = ((toDeg - fromDeg) % 360 + 540) % 360 - 180;
    if (diff === -180) diff = 180;
    return diff;
}

/** Calcula el ángulo en grados desde `from` hacia `to` usando coordenadas axiales.
 *  0° = derecha, antihorario positivo (SVG Y-down). */
export function computeAngle(from: HexCoord, to: HexCoord): number {
    const dq = to.q - from.q;
    const dr = to.r - from.r;
    if (dq === 0 && dr === 0) return 0;
    const H = 40;
    const fx = H * Math.sqrt(3) * (dq + dr / 2);
    const fy = H * (3 / 2) * dr;
    const angle = Math.atan2(fy, fx) * 180 / Math.PI;
    return ((angle % 360) + 360) % 360;
}

/** Alias semántico: obtiene el ángulo desde la posición de una unidad hacia su hex de dirección. */
export const getDirection = computeAngle;
