import type { AbilityConfig } from './types';

export const SHARED_ABILITY_CONFIG: Record<string, AbilityConfig> = {
    ataque_basico: {
        id: 'ataque_basico',
        nameKey: 'ability.ataque_basico.name',
        displayName: 'Ataque básico',
        type: 'attack',
        displayType: 'attack',
        icon: '⚔',
        targetType: 'enemy',
        range: 'unit.range',
        base: { attack: 'unit.attack', difficulty: 'unit.difficulty', paCost: 1 },
        flags: { consumesUnitAction: true },
        allowedModifiers: ['attack', 'defense', 'difficulty', 'attackCost', 'actionCost', 'range'],
    },
    movimiento: {
        id: 'movimiento',
        nameKey: 'ability.movimiento.name',
        displayName: 'Movimiento',
        type: 'move',
        displayType: 'move',
        icon: '👟',
        targetType: 'position',
        base: {},
        move: { baseCost: 'unit.movementCost', maxDist: 1 },
        allowedModifiers: ['movementCost', 'actionCost'],
    },
};
