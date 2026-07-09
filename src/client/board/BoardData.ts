import type { HexCoord } from '@shared';
import { AVAILABLE_DECORATIONS } from './availableDecorations';
import type { GeneratedDecoration } from './availableDecorations';
import { AVAILABLE_TEXTURES } from './availableTextures';

export type TerrainType = 'grass' | 'dirt' | 'sand' | 'water' | 'snow';
export type DecorationType = string;
export type UnitClass = 'archer' | 'infantry' | 'lancer' | 'cavalry' | 'general';

export type Vector3 = { x: number; y: number; z: number };

export type EffectType = 'fire' | 'smoke' | 'sparks' | 'fog';

export type EffectConfig = {
  color: string;
  intensity: number;
  billboard: boolean;
};

export const EFFECT_DEFAULTS: Record<EffectType, { color: string; intensity: number; label: string; shape: string; shapeColor: string }> = {
  fire: { color: '#ff4400', intensity: 1.5, label: 'Fire', shape: '\u25C8', shapeColor: '#ff4400' },
  smoke: { color: '#888888', intensity: 0.8, label: 'Smoke', shape: '\u25CC', shapeColor: '#888888' },
  sparks: { color: '#ffaa00', intensity: 1.2, label: 'Sparks', shape: '\u2726', shapeColor: '#ffaa00' },
  fog: { color: '#aaccff', intensity: 0.6, label: 'Fog', shape: '\u25CE', shapeColor: '#aaccff' },
};

export const EFFECT_TYPES: EffectType[] = ['fire', 'smoke', 'sparks', 'fog'];

export interface TileDecoration {
  id: string;
  kind?: 'glb' | 'effect';
  offset: Vector3;
  rotation: Vector3;
  scale: Vector3;
  effectConfig?: EffectConfig;
}

export interface TileData {
  terrain: TerrainType;
  height: number;
  decorations: TileDecoration[];
  texOffset?: Vector2;
  texScale?: number;
  texNormal?: number;
  texAO?: number;
  blocked: boolean;
  owner?: string;
}

export type Vector2 = { x: number; y: number };

export interface PlacedUnit {
  id: string;
  class: UnitClass;
  owner: string;
  position: HexCoord;
}

export type LightingConfig = {
  ambientIntensity: number;
  keyIntensity: number;
  keyPosition: { x: number; y: number; z: number };
  fillIntensity: number;
  fillPosition: { x: number; y: number; z: number };
};

export const DEFAULT_LIGHTING: LightingConfig = {
  ambientIntensity: 0.6,
  keyIntensity: 0.8,
  keyPosition: { x: 100, y: 200, z: 100 },
  fillIntensity: 0.3,
  fillPosition: { x: -100, y: 100, z: -100 },
};

export interface BoardData {
  name: string;
  radius: number;
  hexSize: number;
  tiles: Record<string, TileData>;
  units: PlacedUnit[];
  lighting: LightingConfig;
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: '#4ade80',
  dirt: '#a16207',
  sand: '#fbbf24',
  water: '#60a5fa',
  snow: '#f8fafc',
};

export const TERRAIN_LABELS: Record<TerrainType, string> = {
  grass: 'Grass',
  dirt: 'Dirt',
  sand: 'Sand',
  water: 'Water',
  snow: 'Snow',
};

export { AVAILABLE_DECORATIONS, AVAILABLE_TEXTURES };
export type { GeneratedDecoration };

export function getDecorationInfo(id: string): GeneratedDecoration | undefined {
  return AVAILABLE_DECORATIONS.find(d => d.id === id);
}

export const DECORATION_SHAPES: Record<string, string> = {
  roca1: '\u25CF',
};

export const DECORATION_COLORS: Record<string, string> = {
  roca1: '#9ca3af',
};

export const UNIT_CLASSES: UnitClass[] = ['archer', 'infantry', 'lancer', 'cavalry', 'general'];

const UNIT_PATHS: Record<UnitClass, string> = {
  archer: '/models/units/archer.glb',
  infantry: '/models/units/infantry.glb',
  cavalry: '/models/units/cavalry.glb',
  lancer: '/models/units/lancer.glb',
  general: '/models/units/general.glb',
};

export function getUnitPath(cls: UnitClass): string {
  return UNIT_PATHS[cls];
}

export function defaultTile(): TileData {
  return { terrain: 'grass', height: 1, decorations: [], texOffset: { x: 0, y: 0 }, texScale: 1, texNormal: 1, texAO: 1, blocked: false };
}

export const DEFAULT_HEX_SIZE = 40;

export function createBoardData(radius: number): BoardData {
  const tiles: Record<string, TileData> = {};
  for (const hex of generateAllHexes(radius)) {
    tiles[`${hex.q},${hex.r}`] = defaultTile();
  }
  return { name: 'Untitled Board', radius, hexSize: DEFAULT_HEX_SIZE, tiles, units: [], lighting: { ...DEFAULT_LIGHTING } };
}

export function exportBoard(data: BoardData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.name}.board.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBoard(text: string): BoardData {
  const data = JSON.parse(text);
  if (typeof data.radius !== 'number' || !data.tiles || !data.units)
    throw new Error('Invalid board file');
  return data as BoardData;
}

export function generateAllHexes(radius: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        hexes.push({ q, r });
      }
    }
  }
  return hexes;
}

export function isInsideMap(hex: HexCoord, radius: number): boolean {
  return Math.abs(hex.q) <= radius && Math.abs(hex.r) <= radius && Math.abs(hex.q + hex.r) <= radius;
}
