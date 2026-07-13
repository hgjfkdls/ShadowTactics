import type { GameState } from '../state';

export function applyRNG(state: GameState, newSeed: number): GameState {
    return { ...state, rngSeed: newSeed };
}
