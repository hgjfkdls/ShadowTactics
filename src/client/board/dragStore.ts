import type { UnitClass } from './BoardData';

export type DragPayload = {
  type: 'terrain';
  terrainType: string;
} | {
  type: 'unit';
  unitClass: UnitClass;
  owner: string;
} | {
  type: 'decoration';
  decorationType: string;
  kind: 'glb' | 'effect';
};

let _pending: DragPayload | null = null;

export function setDragPayload(payload: DragPayload | null) {
  _pending = payload;
}

export function getDragPayload(): DragPayload | null {
  return _pending;
}

export function clearDragPayload() {
  _pending = null;
}
