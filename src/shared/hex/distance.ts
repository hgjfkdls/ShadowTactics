import { HexCoord } from './coord';

export function hexDistance(a: HexCoord, b: HexCoord): number {
    const dq = Math.abs(a.q - b.q);
    const dr = Math.abs(a.r - b.r);
    const ds = Math.abs((a.q + a.r) - (b.q + b.r));
    return Math.max(dq, dr, ds);
}