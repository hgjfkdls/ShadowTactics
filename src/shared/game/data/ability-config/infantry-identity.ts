import type { AbilityConfig } from './types';

export const INFANTRY_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    // ── DIOS DEL TRUENO ──
    furia_berserker: {
        id: 'furia_berserker',
        nameKey: 'ability.furia_berserker.name',
        displayName: 'Furia berserker',
        type: 'attack',
        displayType: 'attack',
        icon: '⚡',
        targetType: 'none',
        isPassive: true,
        base: {},
        allowedModifiers: [],
    },
    rayo_celestial: {
        id: 'rayo_celestial',
        nameKey: 'ability.rayo_celestial.name',
        displayName: 'Rayo celestial',
        type: 'support',
        displayType: 'support',
        icon: '⚡',
        targetType: 'ally',
        range: 2,
        base: { paCost: 2 },
        effects: [
            { type: 'buff', target: 'ally', value: 3, duration: 1, descriptionKey: 'ability.rayo_celestial.desc' },
        ],
        requires: {
            notUnitFlags: { usedRayoCelestial: true },
        },
        flags: { consumesUnitAction: true },
        allowedModifiers: ['attackCost', 'actionCost'],
    },
    // ── CAPITÁN DE LA GUARDIA ──
    contraataque: {
        id: 'contraataque',
        nameKey: 'ability.contraataque.name',
        displayName: 'Contraataque',
        type: 'attack',
        displayType: 'attack',
        icon: '⚔',
        targetType: 'none',
        isPassive: true,
        base: {},
        allowedModifiers: [],
    },
    liderar_tropas: {
        id: 'liderar_tropas',
        nameKey: 'ability.liderar_tropas.name',
        displayName: 'Liderar a las tropas',
        type: 'attack',
        displayType: 'attack',
        icon: '⚔',
        targetType: 'none',
        isPassive: true,
        base: {},
        allowedModifiers: [],
    },
};
