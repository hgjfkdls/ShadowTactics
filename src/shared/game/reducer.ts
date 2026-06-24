import type { GameState, HexCoord } from './state';
import type { GameAction } from './action-types';
import { handleIdentity, handleRoll, handleDeployment, handleEndTurn } from './phases';
import { handleMove, handleAttack, handleCard, handleAbility, handlePassCounter, handleDiscard } from './actions/index';
import { simulatePreparation } from './phases/simulate';
import { updateUnit } from './utils';

export function applyAction(state: GameState, action: GameAction): GameState {

    if (state.gamePhase === 'GAME_OVER') return state;

    if (action.type === 'SIMULATE_PREPARATION') {
        if (state.gamePhase !== 'PREPARATION') return state;
        return simulatePreparation(state);
    }

    if (state.gamePhase === 'PREPARATION') {
        switch (state.preparationPhase) {
            case 'IDENTITY_SELECTION': return handleIdentity(state, action);
            case 'ROLL':               return handleRoll(state, action);
            case 'DEPLOYMENT':         return handleDeployment(state, action);
            default:                   return state;
        }
    }

    // Durante DRAW, si la mano excede 3, solo DISCARD_CARD está permitido
    if (state.turnPhase === 'DRAW' && (state.players[state.activePlayer]?.cardsInHand?.length ?? 0) > 3) {
        if (action.type !== 'DISCARD_CARD') return state;
        return handleDiscard(state, action);
    }

    switch (action.type) {
        case 'MOVE_UNIT':    return handleMove(state, action);
        case 'ATTACK_UNIT':  return handleAttack(state, action);
        case 'END_TURN':     return handleEndTurn(state, action);
        case 'USE_CARD':     return handleCard(state, action);
        case 'USE_ABILITY':  return handleAbility(state, action);
        case 'PASS_COUNTER': return handlePassCounter(state, action);
        case 'DISCARD_CARD': return handleDiscard(state, action);
        case 'OCCUPY_POSITION': {
            if (action.playerId !== state.activePlayer) return state;
            if (!state.pendingOccupation) return state;
            if (!action.accept) return { ...state, pendingOccupation: undefined };
            const s = updateUnit(state, state.pendingOccupation.unitId, (u) => ({
                ...u, position: state.pendingOccupation!.position, movedThisTurn: false, didMovePreviousTurn: false,
            }));
            return { ...s, pendingOccupation: undefined };
        }
        default:             return state;
    }
}
