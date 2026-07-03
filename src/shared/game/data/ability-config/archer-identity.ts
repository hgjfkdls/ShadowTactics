import type { AbilityConfig } from './types';

export const ARCHER_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    en_la_mira: {
        id: 'en_la_mira',
        nameKey: 'ability.en_la_mira.name',
        displayName: 'En la mira',
        type: 'attack',
        displayType: 'attack',
        icon: '🎯',
        targetType: 'enemy',
        isPassive: true,
        base: {},
        allowedModifiers: [],
        panel: { showDescription: true, showAttacker: true, showFormula: [], showModifiers: false, showDefender: true, showUnitsAffected: true },
        log: { showAttacker: true, showDefender: true, showDmg: true },
    },
    robar_ricos: {
        id: 'robar_ricos',
        nameKey: 'ability.robar_ricos.name',
        displayName: 'Robar a los ricos',
        type: 'support',
        displayType: 'support',
        icon: '🏹',
        targetType: 'none',
        isPassive: true,
        base: {},
        allowedModifiers: [],
        panel: { showTarget: true, showUnitsAffected: true },
        log: { showTarget: true },
    },
};
