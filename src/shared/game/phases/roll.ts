import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { roll2d6 } from '../utils/rng';
import { applyIdentityEffects } from './identity-apply';

export function handleRoll(state: GameState, action: GameAction): GameState {
    if (action.type !== 'ROLL_DICE') return state;

    const playerId = action.playerId;
    if (state.diceRolls[playerId] !== undefined) return state;

    const { total, seed: newSeed } = roll2d6(state.rngSeed);

    const newState: GameState = {
        ...state,
        rngSeed: newSeed,
        diceRolls: { ...state.diceRolls, [playerId]: total },
        lastTieRoll: undefined
    };

    const p1Roll = newState.diceRolls['p1'];
    const p2Roll = newState.diceRolls['p2'];
    if (p1Roll === undefined || p2Roll === undefined) return newState;

    if (p1Roll === p2Roll) {
        return { ...newState, diceRolls: { p1: undefined, p2: undefined }, lastTieRoll: p1Roll };
    }

    const [first, second] = p1Roll < p2Roll ? ['p1', 'p2'] as const : ['p2', 'p1'] as const;

    let s: GameState = {
        ...newState,
        gameHistory: [...newState.gameHistory, {
            id: `h${newState.nextHistoryId}`,
            turn: newState.turn,
            actionNumber: newState.gameHistory.filter((h: any) => h.turn === newState.turn).length + 1,
            playerId: first,
            type: 'phase',
            phaseName: 'roll',
            details: `${first}(dado=${p1Roll}) vs ${second}(dado=${p2Roll})`,
        }],
        nextHistoryId: newState.nextHistoryId + 1,
        deploymentOrder: [first, second],
        currentDeployingPlayer: first,
        activePlayer: second,
        deploymentStep: 0,
        deploymentCount: 0,
        preparationPhase: 'ROLL_RESULT'
    };

    // Pre-apply identity effects (player-level tracking) before deployment
    s = applyIdentityEffects(s);

    return s;
}
