import type { Unit } from '../state';

export function canCounterattack(attacker: Unit, defender: Unit, distance: number): boolean {
    return distance <= defender.range;
}

export function getCounterDamage(): number {
    return 2;
}
