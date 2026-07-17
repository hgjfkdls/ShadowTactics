import type { GameState, PlayerId } from '../state';

export function getPlayerAP(state: GameState, playerId: PlayerId): number {
    return state.players[playerId]?.actionPoints ?? 0;
}

export function consumeAP(state: GameState, playerId: PlayerId, amount: number = 1): GameState {
    const player = state.players[playerId];
    return {
        ...state,
        players: {
            ...state.players,
            [playerId]: { ...player, actionPoints: Math.max(0, player.actionPoints - amount) }
        }
    };
}

export function getAttackCost(): number {
    return 1;
}
