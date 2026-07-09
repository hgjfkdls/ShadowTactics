import type { AbilityConfig } from './types';

export const GENERAL_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    // ── MONJE SHAOLIN ──
    karma: {
        //OK
        id: 'karma',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { onAllyKill: true },
        effects: [
            { type: 'stateChange', target: 'killer', value: -2, timing: 'onKill', descriptionKey: 'ability.karma.effect.damage' },
            { type: 'indicator', target: 'ally', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', indicatorLabel: 'Karma' },
        ],
        panel: { showDescription: true, showFormula: [], showUnitsAffected: true },
        log: { showAttacker: true, showDefender: true },
    },
    meditacion: {
        //OK
        id: 'meditacion',
        type: 'support',
        targetType: 'self',
        base: { paCost: 2 },
        activation: { self: true},
        effects: [
            { type: 'stateChange', target: 'self', healType: 'hp', value: 3, descriptionKey: 'ability.meditacion.desc' },
            { type: 'flagPush', target: 'self', flags: ['meditacion'] },
        ],
        allowedModifiers: ['attackCost', 'actionCost'],
        panel: { showSource: true, showDescription: true, showUnitsAffected: true },
    },
    meditacion_2: {
        //OK
        id: 'meditacion_2',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        uiHidden: true,
        activation: { turnStart: { owner: false, enemy: true }, blockFlags: ['meditacion'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, remainingTurns: 0, descriptionKey: 'ability.meditacion.effect.defense' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'meditacion_2', indicatorLabel: 'Meditación (+1 defensa)' },
        ],
    },
    // ── CORAZÓN DE ESTRATEGA ──
    formacion_linea: {
        //OK
        id: 'formacion_linea',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenMove: true, self: true },
        handler: 'formations',
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, remainingTurns: 1, remainingUses: 1, descriptionKey: 'ability.formacion_linea.effect.defense' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'formacion_linea' },
        ],
    },
    formacion_triangulo: {
        //OK
        id: 'formacion_triangulo',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenMove: true, self: true },
        handler: 'formations',
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'attack', value: 1, remainingTurns: 1, remainingUses: 1, descriptionKey: 'ability.formacion_triangulo.effect.attack' },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'formacion_triangulo' },
        ],
    },
    posicion_estrategica: {
        //OK
        id: 'posicion_estrategica',
        range: { mode: 'around', self: false, operator: '=', value: 1 },
        target: { type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '=', value: 1, adjacentToAlly: true },
        type: 'move',
        targetType: 'position',
        base: { paCost: 0 },
        flags: { noCrossUnits: true },
        activation: { blockFlags: ['posicion_estrategica'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['posicion_estrategica'] },
        ],
        allowedModifiers: ['actionCost'],
        panel: { showMovement: true, showSource: true, showDescription: true },
    },
    // ── COMANDANTE SUPREMO ──
    voz_de_mando: {
        //OK
        id: 'voz_de_mando',
        range: { mode: 'around', self: true, operator: '<=', value: 2 },
        target: { type: 'support', allies: true, enemies: false, self: true, empty: false, operator: '<=', value: 2 },
        type: 'support',
        targetType: 'ally',
        base: { paCost: 1 },
        activation: { blockFlags: ['voz_de_mando'] },
        allowedModifiers: ['actionCost'],
        effects: [
            { type: 'flagPush', target: 'self', flags: ['voz_de_mando'] },
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 1, remainingTurns: 1, remainingUses: 1, descriptionKey: 'ability.voz_de_mando.effect.attack' },
            { type: 'modifierPush', target: 'ally', stat: 'defense', value: 1, remainingTurns: 1, remainingUses: 1, descriptionKey: 'ability.voz_de_mando.effect.defense' },
            { type: 'indicator', target: 'ally', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'active', modifierStat: 'attack', modifierSourceName: 'voz_de_mando' },
        ],
        panel: { showSource: true, showDescription: true, showUnitsAffected: true },
        log: { showUnitsAffected: true },
    },
    plan_batalla: {
        //OK
        id: 'plan_batalla',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { prompt: true },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'attack', value: 1, descriptionKey: 'ability.plan_batalla.effect.attack' },
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, descriptionKey: 'ability.plan_batalla.effect.defense' },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'plan_batalla', indicatorLabel: 'Plan de batalla (+1 ataque)' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'plan_batalla', indicatorLabel: 'Plan de batalla (+1 defensa)' },
        ],
        panel: { showSource: true, showDescription: true, showFormula: [], showUnitsAffected: true },
        log: { countAllies: true },
    },
    // ── INSPIRACIÓN REAL ──
    guardia_real: {
        //OK
        id: 'guardia_real',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { turnStart: { owner: true, enemy: true }, self: false, ally: true, range: 1 },
        effects: [
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 1, remainingTurns: 1, remainingUses: 1, range: 1, descriptionKey: 'ability.guardia_real.effect.attack', activation: { turnStart: { owner: true, enemy: false } } },
            { type: 'modifierPush', target: 'ally', stat: 'defense', value: 1, remainingTurns: 1, remainingUses: 1, range: 1, descriptionKey: 'ability.guardia_real.effect.defense', activation: { turnStart: { owner: false, enemy: true } } },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'guardia_real' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'guardia_real' },
        ],
        panel: { showSource: true, showDescription: true, showFormula: [], showUnitsAffected: true },
        log: { countAllies: true },
    },
    en_nombre_del_rey: {
        //OK
        id: 'en_nombre_del_rey',
        range: { mode: 'around', self: false, operator: '<=', value: 2 },
        target: { type: 'support', allies: true, enemies: false, self: false, empty: false, operator: '<=', value: 2 },
        type: 'support',
        targetType: 'ally',
        base: { paCost: 2 },
        activation: { blockFlags: ['en_nombre_del_rey'] },
        effects: [
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 2, remainingTurns: 1 },
            { type: 'stateChange', target: 'ally', healType: 'shield', value: 3 },
            { type: 'modifierPush', target: 'ally', stat: 'shield', value: 3, remainingTurns: 1 },
            { type: 'flagPush', target: 'self', flags: ['en_nombre_del_rey'] },
            { type: 'flagPush', target: 'player', flags: ['en_nombre_del_rey'] },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'en_nombre_del_rey' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'shield', modifierSourceName: 'en_nombre_del_rey' },
        ],
        allowedModifiers: ['attackCost', 'actionCost'],
        flags: { skipGenericHistoryEntry: true },
        panel: { showSource: true, showDescription: true, showTarget: true, showUnitsAffected: true },
        log: { showTarget: true },
    },
    // ── FURIA DEL TIRANO ──
    terror: {
        id: 'terror',
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { onAllyKill: true, self: true },
        effects: [
            { type: 'modifierPush', target: 'enemies', stat: 'difficulty', value: 2, remainingTurns: 1, remainingUses: 1, timing: 'onKill', descriptionKey: 'ability.terror.effect.difficulty' },
            { type: 'indicator', target: 'enemies', indicatorIcon: 'crosshair', indicatorCategory: 'difficulty', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'difficulty', modifierSourceName: 'terror', indicatorLabel: 'Terror (+2 dificultad)' },
        ],
        panel: { showSource: true, showDescription: true, showFormula: [], showUnitsAffected: true },
        log: { showSource: true, showEffects: true, countEnemies: true },
    },
    sacrificar: {
        //OK
        id: 'sacrificar',
        range: { mode: 'around', self: false, operator: '=', value: 1 },
        target: { type: 'attack', allies: true, enemies: false, self: false, empty: false, operator: '=', value: 1 },
        type: 'support',
        targetType: 'ally',
        base: { paCost: 1 },
        activation: { blockFlags: ['sacrificar'] },
        effects: [
            { type: 'stateChange', target: 'ally', value: -2 },
            { type: 'stateChange', target: 'self', healType: 'hp', value: 3, conditionalValue: [{ targetDied: true, value: 5 }] },
            { type: 'flagPush', target: 'self', flags: ['sacrificar'] },
        ],
        allowedModifiers: ['actionCost'],
        flags: { skipGenericHistoryEntry: true },
        panel: { showSource: true, showTarget: true, showUnitsAffected: true, showDescription: true },
        log: { showSource: true, showTarget: true },
    },
    // ── SAMURÁI ──
    camino_del_guerrero: {
        //OK
        id: 'camino_del_guerrero',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { onAllyKill: true, self: true, range: 1, rangeOrigin: 'killer' },
        effects: [
            { type: 'stateChange', target: 'self', value: 1, timing: 'onKill', descriptionKey: 'ability.camino_del_guerrero.effect.pa' },
        ],
        panel: { showSource: true, showDescription: true, showFormula: [] },
    },
    desenvainado_veloz: {
        //OK
        id: 'desenvainado_veloz',
        range: { mode: 'around', self: false, operator: '<=', value: 'unit.range' },
        target: { type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 'unit.range' },
        type: 'attack',
        targetType: 'enemy',
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        activation: { blockFlags: ['desenvainado_veloz'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'difficulty', operator: 'ADD', value: -1, remainingTurns: 1, remainingUses: 1, timing: 'onUse' },
            { type: 'modifierPush', target: 'defender', stat: 'inmovil', operator: 'SET', value: 1, remainingTurns: 1, timing: 'onHit' },
            { type: 'trigger', target: 'self', trigger: 'occupation', timing: 'onHit' },
            { type: 'flagPush', target: 'self', flags: ['desenvainado_veloz'] },
            { type: 'flagPop', target: 'self', flags: ['desenvainado_veloz'], timing: 'onKill' },
        ],
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost'],
        panel: { showMovement: true, showTarget: true, showUnitsAffected: true, showDescription: true, showFormula: ['PA', 'diff', 'dmg', 'range'], showModifiers: true },
        log: { showMovement: true, showTarget: true },
    },
    // ── ESCUDO DEL COMANDANTE ──
    angel_guardian: {
        id: 'angel_guardian',
        range: { mode: 'around', self: false, operator: '<=', value: 10 },
        target: { type: 'support', allies: true, enemies: false, self: false, empty: false, operator: '<=', value: 10 },
        type: 'support',
        targetType: 'none',
        base: { paCost: 2 },
        activation: { blockFlags: ['angel_guardian'] },
        allowedModifiers: ['attackCost', 'actionCost'],
        effects: [
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'shield' },
        ],
        panel: { showSource: true, showDescription: true, showTarget: true, showUnitsAffected: true },
        flags: { skipGenericHistoryEntry: true },
        log: { showSource: true },
    },
    proteger: {
        id: 'proteger',
        range: { mode: 'around', self: true, operator: '<=', value: 3 },
        target: { type: 'support', allies: true, enemies: false, self: true, empty: false, operator: '<=', value: 3 },
        type: 'support',
        targetType: 'ally',
        base: { paCost: 0 },
        activation: { blockFlags: ['proteger'] },
        effects: [
            { type: 'modifierPush', target: 'ally', stat: 'defense', value: 2, remainingTurns: 1, conditionalValue: [{ targetClasses: ['general'], operator: 'add', value: -1 }] },
            { type: 'flagPush', target: 'self', flags: ['proteger'] },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'proteger' },
        ],
        allowedModifiers: ['actionCost'],
        flags: { skipGenericHistoryEntry: true },
        panel: { showSource: true, showUnitsAffected: true, showDescription: true },
        log: { showTarget: true },
    },
    proteger_auto: {
        id: 'proteger_auto',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        uiHidden: true,
        activation: { endTurn: { owner: true }, blockFlags: ['proteger'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, remainingTurns: 1 },
        ],
    },
};
