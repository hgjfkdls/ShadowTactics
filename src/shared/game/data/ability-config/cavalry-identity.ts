import type { AbilityConfig } from './types';

export const CAVALRY_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    // ── CAZADORES ──
    //OK
    acechar: {
        id: 'acechar',
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true, targetIsIsolated: true },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'attack', value: 1, descriptionKey: 'ability.acechar.effect.attack',
                conditionalValue: [
                    { attackerClasses: ['general'], operator: 'add', value: 1},
                    { targetClasses: ['general'], operator: 'add', value: -1 },
                ] },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'select', indicatorVisibleTo: 'active', targetFilter: { isolated: true } },
        ],
    },
    //OK
    hostigar: {
        id: 'hostigar',
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true, targetHpMaxPercent: 50 },
        effects: [
            { type: 'combatMutator', target: 'self', stat: 'difficulty', value: -1, descriptionKey: 'ability.hostigar.effect.difficulty' },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'difficulty', indicatorTrigger: 'select', indicatorVisibleTo: 'active', targetFilter: { targetHpMaxPercent: 50 } },
        ],
    },
    // ── CABALLOS DE GUERRA ──
    cabalgar_2: {
        //OK
        id: 'cabalgar_2',
        range: {mode:'around', self: false, operator: '<=', value: 2},
        target: [
            { type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '=', value: 1 },
            { type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '=', value: 1 },
        ],
        type: 'move',
        targetType: 'position',
        base: { paCost: 1 },
        activation: { blockFlags: ['cabalgar', 'basic_attack', 'move'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['cabalgar'] },
        ],
        flags: { replacesMove: true, noCrossUnits: true },
        allowedModifiers: ['movementCost', 'actionCost'],
        panel: { showMovement: true, showSource: true, showDescription: true },
    },
    a_la_carga: {
        //PENDIENTE
        id: 'a_la_carga',
        range: {mode:'wave', self: false, operator: '<=', value: 3},
        target: [
            { type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 1 },
            { type: 'move', allies: false, enemies: false, self: true, empty: true, stepCenter: 'target', range: { mode: 'around', operator: '<=', value: 1 } },
        ],
        type: 'attack',
        targetType: 'enemy',
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        requiresLastHex: true,
        activation: { requireFlags: ['cabalgar'], blockFlags: ['carga', 'basic_attack'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'difficulty', value: -1, remainingUses: 1 },
            { type: 'flagPush', target: 'self', flags: ['carga', 'basic_attack'] },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost'],
        panel: {showDescription:true, showFormula:['PA','range','diff'], showUnitsAffected: true},
        log: { showMovement: { unit: 'target' } },
    },
};
