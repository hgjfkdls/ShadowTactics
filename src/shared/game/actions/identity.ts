import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { dealDamage } from '../utils';

export function handleIdentityAbility(state: GameState, action: GameAction): GameState {
    if (action.type !== 'IDENTITY_ABILITY') return state;
    if (action.playerId !== state.activePlayer) return state;

    const player = state.players[action.playerId];
    if (!player?.pendingIdentityTarget) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === action.playerId) return state;
    if (target.class === 'general') return state;

    let s = dealDamage(state, action.targetId, 1);

    s = {
        ...s,
        players: {
            ...s.players,
            [action.playerId]: {
                ...s.players[action.playerId],
                pendingIdentityTarget: false,
            },
        },
    };

    return s;
}
