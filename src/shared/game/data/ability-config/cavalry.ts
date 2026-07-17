import type { AbilityConfig } from './types';

export const CAVALRY_ABILITY_CONFIG: Record<string, AbilityConfig> = {
    cabalgar: {
        //OK
        id: 'cabalgar',
        range: {mode:'star', self: false, operator: '<=', value: 2},
        target: {type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '=', value: 2},
        type: 'move',
        targetType: 'position',
        base: { paCost: 1 },
        activation: { blockFlags: ['cabalgar', 'basic_attack', 'move'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['cabalgar'] },
        ],
        flags: { replacesMove: true, straightLine: true, noCrossUnits: true },
        allowedModifiers: ['movementCost', 'actionCost'],
        panel: {showDescription:true, showFormula:['PA'], showMovement: true, showSource:true, showAttacker:false, showDefender:false, showModifiers:true},
    },
    carga: {
        //OK
        id: 'carga',
        range: {mode:'front', self: false, operator: '<=', value: 'unit.range'},
        target: {type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 'unit.range'},
        type: 'attack',
        targetType: 'enemy',
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        requiresLastHex: true,
        activation: { requireFlags: ['cabalgar'], blockFlags: ['carga', 'basic_attack'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'attack', value: 1, remainingUses: 1 },
            { type: 'modifierPush', target: 'self', stat: 'difficulty', value: -1, remainingUses: 1 },
            { type: 'flagPush', target: 'self', flags: ['carga', 'basic_attack'] },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost'],
        panel: {showDescription:true, showFormula:['dmg','PA','range','diff'], showUnitsAffected: true},
    },
    romper_filas: {
        //OK
        id: 'romper_filas',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'ignoresPassives', value: 1, descriptionKey: 'ability.romper_filas.effect.ignoresPassives' },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'select', indicatorVisibleTo: 'active', targetFilter: {classes: ['infantry', 'general']}, descriptionKey: 'ability.romper_filas.effect.ignnoresPassives' }, 
        ],
    },
};
