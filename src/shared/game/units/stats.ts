import type { Unit } from '../state';

export type UnitClass = Unit['class'];

export const BASE_STATS: Record<UnitClass, Omit<Unit, 'id' | 'owner' | 'position' | 'class' | 'abilities'>> = {
    archer: { attack: 3, hp: 8, difficulty: 6, range: 4, movementCost: 2 },
    infantry: { attack: 3, hp: 12, difficulty: 6, range: 1, movementCost: 1 },
    cavalry: { attack: 4, hp: 10, difficulty: 7, range: 1, movementCost: 1 },
    lancer: { attack: 4, hp: 10, difficulty: 7, range: 1, movementCost: 1 },
    general: { attack: 5, hp: 15, difficulty: 6, range: 1, movementCost: 1 },
};
