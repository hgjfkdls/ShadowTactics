import type { AbilityConfig } from './types';

export const CAVALRY_IDENTITY_CONFIG: Record<string, AbilityConfig> = {
    // ── CAZADORES ──
    acechar: {
        id: 'acechar',
        nameKey: 'ability.acechar.name',
        displayName: 'Acechar',
        type: 'attack',
        displayType: 'attack',
        icon: '🎯',
        targetType: 'none',
        isPassive: true,
        base: {},
        allowedModifiers: [],
    },
    hostigar: {
        id: 'hostigar',
        nameKey: 'ability.hostigar.name',
        displayName: 'Hostigar',
        type: 'attack',
        displayType: 'attack',
        icon: '🎯',
        targetType: 'none',
        isPassive: true,
        base: {},
        allowedModifiers: [],
    },
    // ── CABALLOS DE GUERRA ──
    cabalgar_2: {
        id: 'cabalgar_2',
        nameKey: 'ability.cabalgar_2.name',
        displayName: 'Cabalgar',
        type: 'move',
        displayType: 'move',
        icon: '👟',
        targetType: 'position',
        base: { paCost: 1 },
        move: { baseCost: 1, maxDist: 2, setFlags: { usedCabalgar: true } },
        requires: {
            notUnitFlags: { attackedThisTurn: true, usedCabalgar: true, movedThisTurn: true },
        },
        flags: { replacesMove: true, noCrossUnits: true },
        allowedModifiers: ['movementCost', 'actionCost'],
    },
    a_la_carga: {
        id: 'a_la_carga',
        nameKey: 'ability.a_la_carga.name',
        displayName: 'A la carga',
        type: 'support',
        displayType: 'support',
        icon: '💥',
        targetType: 'self',
        base: { paCost: 0 },
        requires: {
            notUnitFlags: { aLaCargaActive: true, usedCabalgar: true, movedThisTurn: true, attackedThisTurn: true },
        },
        flags: { consumesUnitAction: true },
        allowedModifiers: ['actionCost'],
    },
};
