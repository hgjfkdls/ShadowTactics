import type { HexCoord } from '@shared';

export type Animation = {
  id: string;
  type: 'move' | 'attack' | 'counter' | 'damage' | 'heal' | 'particle' | 'wait';
  duration: number;
  unitId?: string;
  targetId?: string;
  path?: HexCoord[];
  amount?: number;
  effect?: string;
  position?: HexCoord;
};
