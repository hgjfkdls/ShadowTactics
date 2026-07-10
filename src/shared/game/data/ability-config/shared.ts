import type { AbilityConfig } from './types';

export const SHARED_ABILITY_CONFIG: Record<string, AbilityConfig> = {
    ataque_basico: {
        id: 'ataque_basico',
        range: {mode:'around', self: false, operator: '<=', value: 'unit.range'},
        target: {type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 'unit.range'},
        type: 'attack',
        targetType: 'enemy',
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        activation: { blockFlags: ['basic_attack'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['basic_attack'] },
            { type: 'flagPop', target: 'self', flags: ['cabalgar'] },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost', 'range'],
        panel: { showAttacker:true, showDefender:true, showFormula: ['PA', 'dmg', 'range', 'diff'], showUnitsAffected: true },
    },
    movimiento: {
        id: 'movimiento',
        range: {mode:'around', self: false, operator: '<=', value: 1},
        target: {type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '<=', value: 1},
        type: 'move',
        targetType: 'position',
        base: { paCost: 'unit.movementCost' },
        activation: {},
        effects: [
            { type: 'flagPush', target: 'self', flags: ['move'] },
            { type: 'flagPop', target: 'self', flags: ['cabalgar'] },
        ],
        allowedModifiers: ['movementCost', 'actionCost'],
        panel: { showMovement: true, showFormula: ['PA'], showSource:true, showModifiers:true },
    },
    doble_ataque: {
        id: 'doble_ataque',
        range: {mode:'around', self: false, operator: '<=', value: 'unit.range'},
        target: {type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 'unit.range'},
        type: 'attack',
        targetType: 'enemy',
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        activation: { requireFlags: ['basic_attack'], blockFlags: ['doble_ataque', 'ventaja_alcance', 'ataque_extra'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'attack', value: -1, remainingUses: 1 },
            { type: 'flagPush', target: 'self', flags: ['doble_ataque'] },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost', 'range'],
        panel: {showDescription:true, showFormula:['dmg','PA','range','diff'], showUnitsAffected: true},
    },
};
