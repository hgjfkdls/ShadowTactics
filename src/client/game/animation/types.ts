import type { HexCoord } from '@shared';
import type { SoundLayer } from '../sound/types';

export type AnimationLayer = string;

export type Animation = {
  id: string;
  type: 'move' | 'attack' | 'counter' | 'damage' | 'heal' | 'particle' | 'wait' | 'speech' | 'flipCard' | 'rotate' | 'death';
  duration: number;
  unitId?: string;
  targetId?: string;
  path?: HexCoord[];
  amount?: number;
  effect?: string;
  fromPosition?: HexCoord;
  position?: HexCoord;
  message?: string;
  generalPosition?: HexCoord | null;
  soundKey?: string;
  soundLayer?: SoundLayer;
  cardImg?: string;
  cardName?: string;
  cardId?: string;
  cardType?: 'BUFF' | 'DEBUFF' | 'COUNTER';
  playerId?: string;
  targetX?: number;
  targetY?: number;
  direction?: number;      // Ángulo destino en grados
  fromDirection?: number;  // Ángulo origen en grados
};
