import type { Unit, UnitId, PlayerId, HexCoord } from '../state';
import { BASE_STATS, type UnitClass } from './stats';
import { CLASS_ABILITIES } from '../data/abilities';
export function createUnit(
    unitId: UnitId,
    playerId: PlayerId,
    position: HexCoord,
    unitClass: UnitClass
): Unit {
    const stats = BASE_STATS[unitClass];
    return {
        id: unitId,
        owner: playerId,
        position,
        direction: { q: 0, r: 0 },
        class: unitClass,
        abilities: [...CLASS_ABILITIES[unitClass]],
        ...stats
    };
}
