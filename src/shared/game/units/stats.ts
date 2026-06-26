import type { Unit } from '../state';

export type UnitClass = Unit['class'];

export const BASE_STATS: Record<UnitClass, Omit<Unit, 'id' | 'owner' | 'position' | 'class' | 'abilities'>> = {
    archer: { attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2 },
    infantry: { attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1 },
    cavalry: { attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1 },
    lancer: { attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1 },
    general: { attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1 },
};
