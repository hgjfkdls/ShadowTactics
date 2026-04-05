import { GameState } from './state';
import { GameAction } from './actions';
import { hexDistance } from '../hex';

export function applyAction(
    state: GameState,
    action: GameAction
): GameState {
    switch (action.type) {
        case 'MOVE_UNIT': {
            const unit = state.units[action.unitId];
            
            if (!unit) return state;

            if (unit.owner !== state.activePlayer) return state;

            const distance = hexDistance(unit.position, action.to);

            if (distance > unit.movement) return state;

            return {
                ...state,
                units: {
                    ...state.units,
                    [unit.id]: {
                        ...unit,
                        position: action.to
                    }
                }
            };
        }

        case 'END_TURN':
            return {
                ...state,
                turn: state.turn + 1,
                activePlayer: getNextPlayer(state)
            };

        default:
            return state;
    }
}

function getNextPlayer(state: GameState) {
    // por ahora simple (luego se extiende)
    return state.activePlayer === 'p1' ? 'p2' : 'p1';
}