import type { AbilityRange, AbilityTarget, ActivationCondition, ConfigEffect, PanelElements, LogElements } from '../ability-config/types';

export type CardType = 'BUFF' | 'DEBUFF' | 'COUNTER';
export type CardTargetType = 'none' | 'player_self' | 'player_other' | 'unit_ally' | 'unit_enemy';

export type CardEffect = {
    type: 'addModifier' | 'setUnitFlag' | 'directAP' | 'removeDebuffs' | 'stealCard' | 'reflect';
    stat?: string;
    value?: number;
    operator?: 'ADD' | 'MUL' | 'SET';
    remainingTurns?: number;
    remainingUses?: number;
    targetScope?: 'self' | 'other' | 'unit_ally' | 'unit_enemy';
    flag?: string;
    flagValue?: number;
};

export type CardConfig = {
    id: string;
    type: CardType;
    targetType: CardTargetType;
    range?: AbilityRange;
    target?: AbilityTarget;
    effects: (CardEffect | ConfigEffect)[];
    activation?: ActivationCondition;
    allowedModifiers?: string[];
    restrictions?: string;
    cardImg?: string;
    panel?: PanelElements & { showTarget?: boolean; showDescription?: boolean };
    log?: LogElements;
};
