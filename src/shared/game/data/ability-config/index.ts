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
    const effects = (card.effects ?? []).filter((e: any) => e.type === 'modifierPush' || e.type === 'stateChange' || e.type === 'flagPop');
    const indicators = effects.map((e: any) => {
        const stat = e.stat ?? '';
        const cat = stat === 'difficulty' ? 'difficulty' : stat === 'attack' ? 'attack' : stat === 'defense' ? 'defense' : stat === 'attackCost' ? 'cost' : 'other';
        const icon = stat === 'difficulty' || stat === 'attack' || stat === 'attackCost' ? 'crosshair' as const : 'shield' as const;
        return {
            type: 'indicator' as const,
            target: 'self' as const,
            indicatorIcon: icon,
            indicatorCategory: cat as any,
            indicatorTrigger: 'always' as const,
            indicatorVisibleTo: 'all' as const,
            modifierStat: stat,
            modifierSourceName: card.id,
            indicatorLabel: `[i18n:card.${card.id}.effectLabel]`,
        };
    });
    return { id: card.id, type: 'card' as const, targetType: 'none' as const, base: {}, allowedModifiers: [] as string[], effects: indicators };
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
