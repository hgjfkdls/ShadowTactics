import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { dealDamage } from '../utils';
import { ABILITY_CONFIG } from '../data/ability-config';

export function handleIdentityAbility(state: GameState, action: GameAction): GameState {
    if (action.type !== 'IDENTITY_ABILITY') return state;
    if (action.playerId !== state.activePlayer) return state;

    const player = state.players[action.playerId];
    if (!player?.pendingIdentityTarget) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === action.playerId) return state;
    if (target.class === 'general') return state;

    const cfg = ABILITY_CONFIG['en_la_mira'];
    const identityKey = player.selectedIdentity ?? '';
    const general = Object.values(state.units).find(u => u.owner === action.playerId && u.class === 'general');

    let s: GameState = dealDamage(state, action.targetId, 1);
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: action.playerId,
            type: 'ability' as const,
            abilityId: 'en_la_mira',
            abilityName: 'En la mira',
            sourceClass: 'general',
            sourceIdentity: state.players[action.playerId]?.selectedIdentity ?? '',
            targetId: action.targetId,
            targetClass: target.class,
            hit: true,
            damage: 1,
            baseAttack: general?.attack ?? 0,
            counterDamage: 0,
            attackerClass: 'general',
            attackName: cfg?.nameKey ?? 'En la mira',
            modifiers: [],
            paCost: 0,
            configId: 'en_la_mira',
            sourceIdentityKey: identityKey,
        }],
        nextHistoryId: s.nextHistoryId + 1,
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
