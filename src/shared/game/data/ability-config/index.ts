export type { AbilityConfig, AbilityType, DisplayType, TargetType, ConfigEffect } from './types';

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
};
