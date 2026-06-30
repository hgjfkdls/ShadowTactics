import type { GameState } from './state';
import { hexDistance } from '../hex';

export const AURA_CONFIG = {
    isActive: true,
    range: 2,
    limit: 1,
};

export function getAuraBuffs(state: GameState, playerId: string): {
    difficultyReduction: number;
    defenseBonus: number;
    shieldPoints: number;
    difficultyPenalty: number;
} {
    if (!AURA_CONFIG.isActive) {
        return { difficultyReduction: 0, defenseBonus: 0, shieldPoints: 0, difficultyPenalty: 0 };
    }

    const general = Object.values(state.units).find(
        u => u.owner === playerId && u.class === 'general'
    );
    if (!general) {
        return { difficultyReduction: 0, defenseBonus: 0, shieldPoints: 0, difficultyPenalty: 0 };
    }

    const allies = Object.values(state.units).filter(u =>
        u.owner === playerId &&
        u.id !== general.id &&
        hexDistance(general.position, u.position) <= AURA_CONFIG.range
    );

    const { limit } = AURA_CONFIG;
    return {
        difficultyReduction: Math.min(allies.filter(u => u.class === 'archer').length, limit),
        defenseBonus: Math.min(allies.filter(u => u.class === 'lancer').length, limit),
        shieldPoints: Math.min(allies.filter(u => u.class === 'infantry').length, limit),
        difficultyPenalty: Math.min(allies.filter(u => u.class === 'cavalry').length, limit),
    };
}
