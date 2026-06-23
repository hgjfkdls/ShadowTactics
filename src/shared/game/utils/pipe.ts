import type { GameState } from '../state';

export function pipeState(state: GameState, ...fns: Array<(s: GameState) => GameState>): GameState {
    return fns.reduce((acc, fn) => fn(acc), state);
}
