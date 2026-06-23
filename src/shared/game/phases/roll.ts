import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { roll2d6 } from '../utils/rng';

export function handleRoll(state: GameState, action: GameAction): GameState {
    if (action.type !== 'ROLL_DICE') return state;

    const playerId = action.playerId;
    if (state.diceRolls[playerId] !== undefined) return state;

    const { total, seed: newSeed } = roll2d6(state.rngSeed);

    const newState: GameState = {
        ...state,
        rngSeed: newSeed,
        diceRolls: { ...state.diceRolls, [playerId]: total }
    };

    const p1Roll = newState.diceRolls['p1'];
    const p2Roll = newState.diceRolls['p2'];
    if (p1Roll === undefined || p2Roll === undefined) return newState;

    if (p1Roll === p2Roll) {
        return { ...newState, diceRolls: { p1: undefined, p2: undefined } };
    }

    const [first, second] = p1Roll < p2Roll ? ['p1', 'p2'] as const : ['p2', 'p1'] as const;

    return {
        ...newState,
        deploymentOrder: [first, second],
        currentDeployingPlayer: first,
        activePlayer: second,
        deploymentStep: 0,
        deploymentCount: 0,
        preparationPhase: 'DEPLOYMENT'
    };
}
