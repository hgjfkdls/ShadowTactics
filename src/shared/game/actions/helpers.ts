import type { GameState, PlayerId, HexCoord } from '../state';
import { updateUnit } from '../utils';

export function getPlayerAP(state: GameState, playerId: PlayerId): number {
    return state.players[playerId]?.actionPoints ?? 0;
}

export function consumeAP(state: GameState, playerId: PlayerId, amount: number = 1): GameState {
    const player = state.players[playerId];
    return {
        ...state,
        players: {
            ...state.players,
            [playerId]: { ...player, actionPoints: player.actionPoints - amount }
        }
    };
}

export function updateUnitPos(state: GameState, unitId: string, to: HexCoord): GameState {
    return updateUnit(state, unitId, (u) => ({ ...u, position: to }));
}

export function applyRNG(state: GameState, newSeed: number): GameState {
    return { ...state, rngSeed: newSeed };
}

export function getAttackCost(): number {
    return 1;
}
