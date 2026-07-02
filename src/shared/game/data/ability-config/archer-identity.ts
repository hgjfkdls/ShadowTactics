import type { AbilityConfig } from './types';

export const ARCHER_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
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
    },
};
