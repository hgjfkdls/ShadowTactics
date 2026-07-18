export type { AbilityConfig, AbilityType, TargetType, RangeMode, RangeOperator, AbilityRange, AbilityTarget, HighlightType, ConfigEffect, ActivationCondition } from './types';

import { SHARED_ABILITY_CONFIG } from './shared';
import { ARCHER_ABILITY_CONFIG } from './archer';
import { CAVALRY_ABILITY_CONFIG } from './cavalry';
import { INFANTRY_ABILITY_CONFIG } from './infantry';
import { LANCER_ABILITY_CONFIG } from './lancer';
import { ARCHER_IDENTITY_CONFIG } from './archer-identity';
import { CAVALRY_IDENTITY_CONFIG } from './cavalry-identity';
import { INFANTRY_IDENTITY_CONFIG } from './infantry-identity';
import { LANCER_IDENTITY_CONFIG } from './lancer-identity';
import { GENERAL_IDENTITY_CONFIG } from './general-identity';
import { BUFF_CARD_CONFIG } from '../card-config/buff';
import { DEBUFF_CARD_CONFIG } from '../card-config/debuff';
import { COUNTER_CARD_CONFIG } from '../card-config/counter';

function toAbilityConfig(card: any): any {
    // Pasar directamente los efectos existentes (incluye indicadores explícitos de la carta)
    return { id: card.id, type: 'card' as const, targetType: 'none' as const, base: {}, allowedModifiers: [] as string[], effects: card.effects ?? [] };
}

export const ABILITY_CONFIG: Record<string, import('./types').AbilityConfig> = {
    ...SHARED_ABILITY_CONFIG,
    ...ARCHER_ABILITY_CONFIG,
    ...CAVALRY_ABILITY_CONFIG,
    ...INFANTRY_ABILITY_CONFIG,
    ...LANCER_ABILITY_CONFIG,
    ...ARCHER_IDENTITY_CONFIG,
    ...CAVALRY_IDENTITY_CONFIG,
    ...INFANTRY_IDENTITY_CONFIG,
    ...LANCER_IDENTITY_CONFIG,
    ...GENERAL_IDENTITY_CONFIG,
    ...Object.fromEntries(Object.entries(BUFF_CARD_CONFIG).map(([k, v]) => [k, toAbilityConfig(v)])),
    ...Object.fromEntries(Object.entries(DEBUFF_CARD_CONFIG).map(([k, v]) => [k, toAbilityConfig(v)])),
    ...Object.fromEntries(Object.entries(COUNTER_CARD_CONFIG).map(([k, v]) => [k, toAbilityConfig(v)])),
};
