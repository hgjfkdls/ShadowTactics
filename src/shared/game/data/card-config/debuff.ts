import type { CardConfig } from './types';

export const DEBUFF_CARD_CONFIG: Record<string, CardConfig> = {
    bajar_moral: {
        id: 'bajar_moral', type: 'DEBUFF', targetType: 'none',
        effects: [{ type: 'modifierPush', target: 'opponent', stat: 'ap', value: -1, remainingTurns: 1 }],
        allowedModifiers: [],
    },
    pantano: {
        id: 'pantano', type: 'DEBUFF', targetType: 'none',
        effects: [{ type: 'modifierPush', target: 'opponent', stat: 'movementCost', value: 2, operator: 'MUL', remainingTurns: 1, remainingUses: 1 }],
        allowedModifiers: [],
    },
    mantenimiento: {
        id: 'mantenimiento', type: 'DEBUFF', targetType: 'none',
        effects: [{ type: 'modifierPush', target: 'opponent', stat: 'attack', value: -1, remainingTurns: 1, remainingUses: 1 }],
        allowedModifiers: [],
    },
    confusion: {
        id: 'confusion', type: 'DEBUFF', targetType: 'unit_enemy',
        effects: [{ type: 'modifierPush', target: 'enemy', stat: 'bloqueo', value: 1, operator: 'SET', remainingTurns: 1 }],
        allowedModifiers: [],
    },
    miedo: {
        id: 'miedo', type: 'DEBUFF', targetType: 'none',
        effects: [{ type: 'modifierPush', target: 'opponent', stat: 'attackCost', value: 1, remainingTurns: 1, remainingUses: 1 }],
        allowedModifiers: [],
    },
};
