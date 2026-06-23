import type { Unit } from '../state';

export function getDifficulty(unit: Unit, distance: number): number {
    if (unit.class === 'archer') {
        return 6 + distance;
    }
    return unit.difficulty;
}

export function isCritical(roll: number): boolean {
    return roll >= 11;
}

export function getCriticalBonus(): number {
    return 2;
}
