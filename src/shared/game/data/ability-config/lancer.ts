import type { AbilityConfig } from './types';

export const LANCER_ABILITY_CONFIG: Record<string, AbilityConfig> = {
    anti_caballeria: {
        //OK
        id: 'anti_caballeria',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true, isBasicAttack: true },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'attack', value: 1, targetFilter: { classes: ['cavalry'] }, descriptionKey: 'ability.anti_caballeria.effect.attack' },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'attack', indicatorVisibleTo: 'active', targetFilter: { classes: ['cavalry'] } },
        ],
    },
    formacion_defensiva: {
        //OK
        id: 'formacion_defensiva',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttacked: true, self: true },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'nullifyCharge', value: 1, descriptionKey: 'ability.formacion_defensiva.effect.nullifyCharge' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'select', indicatorVisibleTo: 'all', indicatorOnEnemySelect: { enemyClasses: ['cavalry'], targetClasses: ['lancer']} },
        ],
    },
    ventaja_alcance: {
        //OK
        id: 'ventaja_alcance',
        range: {mode:'around', self: false, operator: '=', value: 'unit.range'},
        target: {type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '=', value: 'unit.range'},
        type: 'attack',
        targetType: 'enemy',
        rangeBonus: 1,
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        activation: { blockFlags: ['ventaja_alcance', 'doble_ataque', 'basic_attack'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['ventaja_alcance', 'basic_attack'] },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost', 'range'],
        panel: { showDescription:true, showFormula:['dmg','PA','range','diff'], showUnitsAffected: true},
    },
};
