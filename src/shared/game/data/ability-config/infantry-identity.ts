import type { AbilityConfig } from './types';

export const INFANTRY_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    // ── DIOS DEL TRUENO ──
    furia_berserker: {
        //OK
        id: 'furia_berserker',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { self: true, hpMaxPercent: 50, unitClasses: ['infantry', 'general'] },
        effects: [
            { type: 'modifierPush', target: 'self', stat: 'attack', value: 1, descriptionKey: 'ability.furia_berserker.effect.attack' },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'furia_berserker' },
        ],
        flags: { skipConfigEffects: true },
    },
    rayo_celestial: {
        //OK
        id: 'rayo_celestial',
        range: {mode:'around', self: true, operator: '<=', value: 2},
        target: {type: 'support', allies: true, enemies: false, self: true, empty: false, operator: '<=', value: 2},
        type: 'support',
        targetType: 'ally',
        base: { paCost: 2 },
        activation: { blockFlags: ['rayo_celestial'] },
        effects: [
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 3, remainingTurns: 1, remainingUses: 1, descriptionKey: 'ability.rayo_celestial.desc' },
            { type: 'flagPush', target: 'self', flags: ['rayo_celestial'] },
            { type: 'indicator', target: 'self', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'rayo_celestial' },
        ],
        allowedModifiers: ['attackCost', 'actionCost'],
        flags: { skipGenericHistoryEntry: true },
        panel: { showSource: true, showDescription: true, showTarget: true, showUnitsAffected: true },
        log: { showTarget: true },
    },
    // ── CAPITÁN DE LA GUARDIA ──
    contraataque: {
        //OK
        id: 'contraataque',
        type: 'attack',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
    },
    liderar_tropas: {
        //OK
        id: 'liderar_tropas',
        type: 'support',
        targetType: 'none',
        base: {},
        allowedModifiers: [],
        activation: { whenAttack: true, self: true, unitClasses: ['general'] },
        effects: [
            { type: 'modifierPush', target: 'ally', stat: 'attack', value: 1, remainingTurns: 1, remainingUses: 1, descriptionKey: 'ability.liderar_tropas.effect.attack' },
            { type: 'indicator', target: 'ally', indicatorIcon: 'crosshair', indicatorCategory: 'attack', indicatorTrigger: 'always', indicatorVisibleTo: 'all', modifierStat: 'attack', modifierSourceName: 'liderar_tropas', targetFilter: { classes: ['infantry', 'general'] } },
        ],
        panel: { showSource: true, showDescription: true, showFormula: [], showUnitsAffected: true },
        log: {showSource:true, showEffects:true, countAllies:true},
    },
};
