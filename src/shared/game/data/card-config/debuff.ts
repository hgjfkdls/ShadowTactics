import type { CardConfig } from './types';

export const DEBUFF_CARD_CONFIG: Record<string, CardConfig> = {
    bajar_moral: {
        id: 'bajar_moral', type: 'DEBUFF', targetType: 'none',
        effects: [
            { type: 'modifierPush', target: 'opponent', stat: 'ap', value: -1, remainingTurns: 1 },
            { type: 'indicator', target: 'opponent', indicatorIcon: 'coin', indicatorCategory: 'cost', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'ap', modifierSourceName: 'bajar_moral', indicatorLabel: 'card.bajar_moral.effectLabel' },
        ],
        allowedModifiers: [],
    },
    pantano: {
        id: 'pantano', type: 'DEBUFF', targetType: 'none',
        effects: [
            { type: 'modifierPush', target: 'opponent', stat: 'movementCost', value: 2, operator: 'MUL', remainingTurns: 1, remainingUses: 1 },
            { type: 'indicator', target: 'opponent', indicatorIcon: 'shield', indicatorCategory: 'cost', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'movementCost', modifierSourceName: 'pantano', indicatorLabel: 'card.pantano.effectLabel' },
        ],
        allowedModifiers: [],
    },
    mantenimiento: {
        id: 'mantenimiento', type: 'DEBUFF', targetType: 'none',
        effects: [
            { type: 'modifierPush', target: 'opponent', stat: 'attack', value: -1, remainingTurns: 1, remainingUses: 1 },
            { type: 'indicator', target: 'opponent', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'mantenimiento', indicatorLabel: 'card.mantenimiento.effectLabel' },
        ],
        allowedModifiers: [],
    },
    confusion: {
        id: 'confusion', type: 'DEBUFF', targetType: 'unit_enemy',
        effects: [
            { type: 'modifierPush', target: 'enemy', stat: 'bloqueo', value: 1, operator: 'SET', remainingTurns: 1 },
            { type: 'indicator', target: 'enemy', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'bloqueo', modifierSourceName: 'confusion', indicatorLabel: 'card.confusion.effectLabel' },
        ],
        allowedModifiers: [],
    },
    miedo: {
        id: 'miedo', type: 'DEBUFF', targetType: 'none',
        effects: [
            { type: 'modifierPush', target: 'opponent', stat: 'attackCost', value: 1, remainingTurns: 1, remainingUses: 1 },
            { type: 'indicator', target: 'opponent', indicatorIcon: 'coin', indicatorCategory: 'cost', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attackCost', modifierSourceName: 'miedo', indicatorLabel: 'card.miedo.effectLabel' },
        ],
        allowedModifiers: [],
    },
};
