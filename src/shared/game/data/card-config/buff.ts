import type { CardConfig } from './types';

export const BUFF_CARD_CONFIG: Record<string, CardConfig> = {
    movilidad: {
        id: 'movilidad', type: 'BUFF', targetType: 'none',
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'movementCost', value: 0, operator: 'SET', remainingTurns: 1, remainingUses: 1 },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'cost', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'movementCost', modifierSourceName: 'movilidad', indicatorLabel: 'card.movilidad.effectLabel' },
        ],
        allowedModifiers: [],
    },
    precision: {
        id: 'precision', type: 'BUFF', targetType: 'none',
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'difficulty', value: -2, remainingTurns: 1, remainingUses: 1 },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'difficulty', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'difficulty', modifierSourceName: 'precision', indicatorLabel: 'card.precision.effectLabel' },
        ],
        allowedModifiers: [],
    },
    inspiracion_tropa: {
        id: 'inspiracion_tropa', type: 'BUFF', targetType: 'none',
        activation: { maxPa: 8 },
        effects: [
            { type: 'stateChange', target: 'self', value: 1 },
            { type: 'indicator', target: 'self', indicatorIcon: 'coin', indicatorCategory: 'cost', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'ap', modifierSourceName: 'inspiracion_tropa', indicatorLabel: 'card.inspiracion_tropa.effectLabel' },
        ],
        allowedModifiers: [],
    },
    ataque_extra: {
        id: 'ataque_extra', type: 'BUFF', targetType: 'unit_ally',
        activation: { requireFlags: ['basic_attack'] },
        effects: [
            { type: 'flagPop', target: 'ally', flags: ['basic_attack'] },
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 1, remainingUses: 1, consumedBy: 'ataque_basico' },
            { type: 'modifierPush', target: 'ally', stat: 'difficulty', value: 2, remainingUses: 1, consumedBy: 'ataque_basico' },
            { type: 'modifierPush', target: 'ally', operator: 'SET', stat: 'attackCost', value: 0, remainingUses: 1, consumedBy: 'ataque_basico' },
            { type: 'indicator', target: 'ally', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'ataque_extra', indicatorLabel: 'card.ataque_extra.effectLabel' },
        ],
        allowedModifiers: [],
    },
    flechas_fuego: {
        id: 'flechas_fuego', type: 'BUFF', targetType: 'unit_ally',
        effects: [
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 1, remainingUses: 1 },
            { type: 'modifierPush', target: 'ally', stat: 'dotOnHit', value: 1, remainingUses: 1 },
            { type: 'indicator', target: 'ally', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'flechas_fuego', indicatorLabel: 'card.flechas_fuego.effectLabel' },
        ],
        allowedModifiers: [],
    },
};
