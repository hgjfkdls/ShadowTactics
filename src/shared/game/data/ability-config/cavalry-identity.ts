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
        id: 'a_la_carga',
        range: {mode:'around', self: true, operator: '<=', value: 1},
        target: {type: 'support', allies: false, enemies: false, self: true, empty: false, operator: '<=', value: 1},
        type: 'support',
        targetType: 'self',
        base: { paCost: 0 },
        activation: { blockFlags: ['a_la_carga'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['a_la_carga'] },
        ],
        allowedModifiers: ['actionCost'],
        flags: { skipGenericHistoryEntry: true },
        panel: { showDescription: true, showFormula: ['PA'], showUnitsAffected: true },
    },
};
