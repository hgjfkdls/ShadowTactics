import { BASE_STATS } from '@shared/game/units';

export function getMaxHp(cls: string): number {
    return BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
}
