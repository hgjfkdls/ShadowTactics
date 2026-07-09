import type { AbilityConfig } from './types';

export const ARCHER_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    en_la_mira: {
        //OK
        id: 'en_la_mira',
        range: { mode:'around', self: false, operator: '<=', value: 8},
        target: { type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 8},
        type: 'attack',
        targetType: 'enemy',
        activation: { prompt: true },
        base: { paCost: 0, attack: 1, difficulty: 0 },
        fixedDamage: 1,
        allowedModifiers: [],
        effects: [
            { type: 'stateChange', target: 'defender', healType: 'hp', value: -1, targetFilter: { classes: ['infantry', 'archer', 'lancer', 'cavalry'] }, descriptionKey: 'ability.en_la_mira.effect.damage' },
        ],
        panel: { showDescription: true, showAttacker: true, showFormula: [], showModifiers: false, showDefender: true, showUnitsAffected: true },
        log: { showTarget: true },
    },
    robar_ricos: {
        //OK
        id: 'robar_ricos',
        range: {},
        target: {},
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { turnStart: { owner: true, enemy: false } },
        effects: [
            { type: 'modifierPush', target: 'all_allies', stat: 'robar_ricos', value: 1, remainingUses: 1, targetFilter: { classes: ['archer', 'general'] } },
            { type: 'stateChange', target: 'self', healType: 'hp', value: 1, timing: 'onHit', targetFilter: { isBasicAttack: true }, consume: { stat: 'robar_ricos', units: 'all_allies', classes: ['archer', 'general'] } },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'owner', modifierStat: 'robar_ricos', modifierSourceName: 'robar_ricos' },
        ],
        panel: { showTarget: true, showUnitsAffected: true , showDescription: true},
        log: { showTarget: true },
    },
    francotirador: {
        //OK
        id: 'francotirador',
        range: {},
        target: {},
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { turnStart: { owner: true, enemy: false } },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'range', value: 1, operator: 'ADD' },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'range', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'range', modifierSourceName: 'francotirador' },
        ],
        panel: { showDescription: true },
    },
    tiro_a_distancia: {
        //OK
        id: 'tiro_a_distancia',
        range: {},
        target: {},
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        effects: [
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'range', indicatorTrigger: 'always', indicatorVisibleTo: 'all', targetFilter: { classes: ['archer'] } },
        ],
        panel: { showDescription: true },
        log: { showMovement: true },
    },

};
