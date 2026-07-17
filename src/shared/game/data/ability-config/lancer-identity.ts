import type { AbilityConfig } from './types';

export const LANCER_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    // ── PUNTA DE LANZA ──
    torbellino: {
        //OK
        id: 'torbellino',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: { paCost: 3 },
        activation: { blockFlags: ['torbellino', 'carga'] },
        effects: [
            { type: 'flagPush', target: 'self', flags: ['torbellino'] },
        ],
        allowedModifiers: ['attackCost', 'actionCost'],
        panel: { showDescription: true, showAttacker: true, showDefender: false, showModifiers: true, showFormula: ['PA', 'diff'], showUnitsAffected: true },
        log: { showDmg: false, showUnitsAffected: true, countAllies: true, countEnemies: true },
    },
    proyeccion: {
        //OK
        id: 'proyeccion',
        range: {},
        target: {},
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        panel: { showSource: true , showAttacker:false, showDefender:false , showDescription: true, showFormula: [], showUnitsAffected: true },
        log: { showSource: true, countEnemies: true },
    },
    // ── ESPARTANO ──
    lanza_escudo: {
        //OK
        id: 'lanza_escudo',
        range: {},
        target: {},
        type: 'support',
        targetType: 'self',
        base: {},
        allowedModifiers: [],
        activation: { prompt: true },
        effects: [
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'range', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'range', modifierSourceName: 'lanza_escudo', indicatorLabel: 'Lanza y escudo (+1 rango)' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'lanza_escudo', indicatorLabel: 'Lanza y escudo (+1 defensa)' },
        ],
        panel: { showDescription: true, showSource: true, showAttacker:false, showDefender:false, showFormula: [] },
    },
    muro_espartano: {
        id: 'muro_espartano',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenMove: true, self: true, unitClasses: ['lancer'] },
        handler: 'formations',
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'defense', value: 1, descriptionKey: 'ability.muro_espartano.effect.attack' },
            { type: 'indicator', target: 'self', indicatorIcon: 'shield', indicatorCategory: 'defense', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'defense', modifierSourceName: 'muro_espartano' },
        ],
    },
};
