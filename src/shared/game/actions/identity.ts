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

    const general = Object.values(s.units).find(u => u.owner === action.playerId && u.class === 'general');
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: action.playerId,
            type: 'attack' as const,
            attackerId: general?.id ?? '',
            targetId: action.targetId,
            die1: 0,
            die2: 0,
            total: 0,
            difficulty: 0,
            baseDifficulty: 0,
            hit: true,
            damage: 1,
            baseAttack: general?.attack ?? 0,
            counterDamage: 0,
            attackerClass: 'general',
            targetClass: target.class,
            attackName: 'En la mira',
            modifiers: ['Sin coste PA'],
            paCost: 0,
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
