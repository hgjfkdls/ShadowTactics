import type { AbilityConfig } from './types';

export const INFANTRY_ABILITY_CONFIG: Record<string, AbilityConfig> = {
    resistencia: {
        //OK
        id: 'resistencia',
        range: {},
        target: {},
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { turnStart: { owner: false, enemy: true }, self: true, timesDamagedThisTurn: 0 },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, remainingTurns: 1, remainingUses: 1, timing: 'turnStart', descriptionKey: 'ability.resistencia.effect.defense' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'resistencia' },
        ],
    },
    linea_defensiva: {
        //OK
        id: 'linea_defensiva',
        range: {},
        target: {},
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { turnStart: { owner: false, enemy: true }, self: true, didMovePreviousTurn: false },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, remainingTurns: 1, timing: 'turnStart', descriptionKey: 'ability.linea_defensiva.effect.defense' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'linea_defensiva' },
        ],
    },
    presion: {
        //OK
        id: 'presion',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true, lastTargetId: true },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'attack', value: 1, targetFilter: { lastTargetId: true }, descriptionKey: 'ability.presion.effect.attack' },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'select', indicatorVisibleTo: 'active', targetFilter: { lastTargetId: true } },
        ],
    },
    ejecutar: {
        //OK
        id: 'ejecutar',
        range: {mode:'around', self: false, operator: '=', value: 'unit.range'},
        target: {type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '=', value: 'unit.range', hpCondition: { operator: '<=', value: 2 }},
        type: 'attack',
        targetType: 'enemy',
        base: { paCost: 1 },
        fixedDamage: 2,
        activation: { blockFlags: ['basic_attack'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'attack', value: 1, remainingUses: 1 },
            { type: 'flagPush', target: 'self', flags: ['ejecutar', 'basic_attack'] },
        ],
        allowedModifiers: ['actionCost', 'attackCost'],
        panel: {showDescription:true, showFormula:['PA','diff'], showTarget: true, showUnitsAffected: true},
        log: { showTarget: true, showMovement: true },
    },
};
