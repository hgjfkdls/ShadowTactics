export type CardEffectType = 'BUFF' | 'DEBUFF' | 'COUNTER';
export type CardTargetType = 'none' | 'player_self' | 'player_other' | 'unit_ally' | 'unit_enemy';

export type ModifierEffect = {
    type: 'addModifier';
    stat: string;
    value: number;
    operator: 'ADD' | 'MUL' | 'SET';
    remainingTurns: number;
    remainingUses?: number;
    targetScope: 'self' | 'other' | 'unit_ally' | 'unit_enemy';
};

export type FlagEffect = {
    type: 'setUnitFlag';
    flag: string;
    value: number;
    targetScope: 'self' | 'unit_ally';
    requires?: string;  // precondition flag
};

export type DirectEffect = {
    type: 'directAP';
    value: number;
    operator: 'ADD' | 'SET';
    targetScope: 'self' | 'other';
};

export type CardEffectEntry = {
    type: 'addModifier' | 'setUnitFlag' | 'directAP' | 'removeDebuffs' | 'stealCard' | 'reflect';
    // addModifier
    stat?: string;
    value?: number;
    operator?: 'ADD' | 'MUL' | 'SET';
    remainingTurns?: number;
    remainingUses?: number;
    targetScope?: 'self' | 'other' | 'unit_ally' | 'unit_enemy';
    // setUnitFlag
    flag?: string;
    flagValue?: number;
    // directAP
    directValue?: number;
    // requires / restrictions
    requiresUnitAttacked?: boolean;
    requiresTarget?: boolean;
};

export type CardEffectConfig = {
    id: string;
    nameKey: string;
    type: CardEffectType;
    targetType: CardTargetType;
    effects: CardEffectEntry[];
    restrictions?: string;
};

export const CARD_EFFECTS: Record<string, CardEffectConfig> = {
    movilidad: {
        id: 'movilidad',
        nameKey: 'card.movilidad',
        type: 'BUFF',
        targetType: 'player_self',
        effects: [{
            type: 'addModifier',
            stat: 'movementCost',
            value: 0,
            operator: 'SET',
            remainingTurns: 1,
            remainingUses: 1,
            targetScope: 'self',
        }],
    },
    ataque_extra: {
        id: 'ataque_extra',
        nameKey: 'card.ataque_extra',
        type: 'BUFF',
        targetType: 'unit_ally',
        effects: [{
            type: 'setUnitFlag',
            flag: 'ataqueExtraCharges',
            value: 1,
            targetScope: 'unit_ally',
        }],
        restrictions: 'Requiere que la unidad haya atacado este turno',
    },
    precision: {
        id: 'precision',
        nameKey: 'card.precision',
        type: 'BUFF',
        targetType: 'unit_ally',
        effects: [{
            type: 'setUnitFlag',
            flag: 'precisionCharges',
            value: 1,
            targetScope: 'unit_ally',
        }],
    },
    flechas_fuego: {
        id: 'flechas_fuego',
        nameKey: 'card.flechas_fuego',
        type: 'BUFF',
        targetType: 'player_self',
        effects: [
            {
                type: 'addModifier',
                stat: 'attack',
                value: 1,
                operator: 'ADD',
                remainingTurns: 0,
                remainingUses: 1,
                targetScope: 'self',
            },
            {
                type: 'addModifier',
                stat: 'dotOnHit',
                value: 1,
                operator: 'SET',
                remainingTurns: 0,
                remainingUses: 1,
                targetScope: 'self',
            },
        ],
    },
    inspiracion_tropa: {
        id: 'inspiracion_tropa',
        nameKey: 'card.inspiracion_tropa',
        type: 'BUFF',
        targetType: 'player_self',
        effects: [{
            type: 'directAP',
            directValue: 1,
        }],
    },
    bajar_moral: {
        id: 'bajar_moral',
        nameKey: 'card.bajar_moral',
        type: 'DEBUFF',
        targetType: 'player_other',
        effects: [{
            type: 'addModifier',
            stat: 'ap',
            value: -1,
            operator: 'ADD',
            remainingTurns: 1,
            targetScope: 'other',
        }],
    },
    pantano: {
        id: 'pantano',
        nameKey: 'card.pantano',
        type: 'DEBUFF',
        targetType: 'player_other',
        effects: [{
            type: 'addModifier',
            stat: 'movementCost',
            value: 2,
            operator: 'MUL',
            remainingTurns: 1,
            remainingUses: 1,
            targetScope: 'other',
        }],
    },
    mantenimiento: {
        id: 'mantenimiento',
        nameKey: 'card.mantenimiento',
        type: 'DEBUFF',
        targetType: 'player_other',
        effects: [{
            type: 'addModifier',
            stat: 'attack',
            value: -1,
            operator: 'ADD',
            remainingTurns: 1,
            remainingUses: 1,
            targetScope: 'other',
        }],
    },
    confusion: {
        id: 'confusion',
        nameKey: 'card.confusion',
        type: 'DEBUFF',
        targetType: 'unit_enemy',
        effects: [{
            type: 'addModifier',
            stat: 'bloqueo',
            value: 1,
            operator: 'SET',
            remainingTurns: 1,
            targetScope: 'unit_enemy',
        }],
    },
    miedo: {
        id: 'miedo',
        nameKey: 'card.miedo',
        type: 'DEBUFF',
        targetType: 'player_other',
        effects: [{
            type: 'addModifier',
            stat: 'attackCost',
            value: 1,
            operator: 'ADD',
            remainingTurns: 1,
            remainingUses: 1,
            targetScope: 'other',
        }],
    },
    panacea: {
        id: 'panacea',
        nameKey: 'card.panacea',
        type: 'COUNTER',
        targetType: 'player_self',
        effects: [{
            type: 'removeDebuffs',
        }],
    },
    ladron: {
        id: 'ladron',
        nameKey: 'card.ladron',
        type: 'COUNTER',
        targetType: 'player_self',
        effects: [{
            type: 'stealCard',
        }],
    },
    espejo: {
        id: 'espejo',
        nameKey: 'card.espejo',
        type: 'COUNTER',
        targetType: 'player_other',
        effects: [{
            type: 'reflect',
        }],
    },
};
