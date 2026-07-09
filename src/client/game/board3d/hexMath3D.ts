import type { HexCoord } from '@shared';

export const HEX_SIZE = 40;
export const HEX_HEIGHT = 4;

export function axialToWorld3D(hex: HexCoord, size: number = HEX_SIZE) {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const z = size * (3 / 2) * hex.r;
  return { x, z };
}

export function hexCornerPositions(cx: number, cz: number, size: number = HEX_SIZE): [number, number][] {
  const corners: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push([
      cx + size * Math.cos(angle),
      cz + size * Math.sin(angle),
    ]);
  }
  return corners;
}
