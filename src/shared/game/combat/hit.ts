import type { Unit } from '../state';

export function getDifficulty(unit: Unit, distance: number): number {
    if (unit.class === 'archer' || (unit.abilities ?? []).includes('blanco_facil')) {
        return 5 + distance;
    }
    return unit.difficulty;
}

export function isCritical(roll: number): boolean {
    return roll >= 11;
}

export function getCriticalBonus(): number {
    return 2;
}
