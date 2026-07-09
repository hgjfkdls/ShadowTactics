import type { AbilityConfig } from './types';

export const ARCHER_ABILITY_CONFIG: Record<string, AbilityConfig> = {
    blanco_facil: {
        //OK
        id: 'blanco_facil',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true, targetDidMovePreviousTurn: false },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'difficulty', value: -1, targetFilter: { targetDidMovePreviousTurn: false }, identityBonus: { francotirador: -1 } },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'difficulty', indicatorTrigger: 'select', indicatorVisibleTo: 'active', targetFilter: { targetDidMovePreviousTurn: false } },
        ],
    },
    patada_acrobatica: {
        //OK
        id: 'patada_acrobatica',
        range: {mode:'around', self: false, operator: '<=', value: 1},
        target: [
            { type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 1 },
            { type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '=', value: 1, stepCenter: 'self', avoidAdjacentToTarget: true },
        ],
        icon: '/icons/patada_acrobatica.svg',
        type: 'attack',
        targetType: 'enemy',
        base: { paCost: 1 },
        fixedDamage: 1,
        activation: { blockFlags: ['patada_acrobatica'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['patada_acrobatica']},
            { type: 'trigger', target: 'self', trigger: 'occupation', timing: 'onHit' },
        ],
        allowedModifiers: ['attackCost', 'actionCost'],
        panel: { showDescription:true, showModifiers: true, showFormula: ['PA', 'dmg'], showUnitsAffected: true, showMovement: true },
        log: { showTarget: true, showMovement: true },
    },
    fuego_cobertura: {
        //OK
        id: 'fuego_cobertura',
        range: {mode:'around', self: false, operator: '<=', value: 'unit.range'},
        target: {type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 'unit.range'},
        icon: '/icons/fuego_cobertura.svg',
        type: 'attack',
        targetType: 'enemy',
        base: { attack: 2, difficulty: 'unit.difficulty', paCost: 2 },
        activation: { blockFlags: ['fuego_cobertura'] },
        effects: [
            { type: 'modifierPush', target: 'defender', stat: 'actionCost', value: 1, remainingUses: 2, timing: 'onHit' },
            { type: 'flagPush', target: 'self', flags: ['fuego_cobertura'] },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'coin', indicatorCategory: 'cost', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'actionCost', modifierSourceName: 'fuego_cobertura' },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'actionCost', 'range'],
        panel: {showDescription:true, showFormula: ['dmg', 'PA', 'range', 'diff'], showUnitsAffected: true},
    },
};
