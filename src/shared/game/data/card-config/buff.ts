import type { CardConfig } from './types';

export const BUFF_CARD_CONFIG: Record<string, CardConfig> = {
    movilidad: {
        id: 'movilidad', type: 'BUFF', targetType: 'none',
        effects: [{ type: 'modifierPush', target: 'self', stat: 'movementCost', value: 0, operator: 'SET', remainingTurns: 1, remainingUses: 1 }],
        allowedModifiers: [],
    },
    precision: {
        id: 'precision', type: 'BUFF', targetType: 'none',
        effects: [{ type: 'modifierPush', target: 'self', stat: 'difficulty', value: -2, remainingTurns: 1, remainingUses: 1 }],
        allowedModifiers: [],
    },
    inspiracion_tropa: {
        id: 'inspiracion_tropa', type: 'BUFF', targetType: 'none',
        activation: { maxPa: 8 },
        effects: [{ type: 'stateChange', target: 'self', value: 1 }],
        allowedModifiers: [],
    },
    ataque_extra: { id: 'ataque_extra', type: 'BUFF', targetType: 'none', effects: [], allowedModifiers: [] },
    flechas_fuego: { id: 'flechas_fuego', type: 'BUFF', targetType: 'none', effects: [], allowedModifiers: [] },
};
