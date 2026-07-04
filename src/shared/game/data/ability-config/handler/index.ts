import type { GameState, GameAction } from '@shared/game/state';
import { handleAbility as handleAbilityWithCfg } from './handler';
import { ABILITY_CONFIG } from '../index';

export function handleAbility(state: GameState, action: GameAction): GameState {
    if (action.type !== 'USE_ABILITY') return state;
    const cfg = ABILITY_CONFIG[action.abilityId];
    if (!cfg) return state;
    return handleAbilityWithCfg(state, action, cfg);
}
