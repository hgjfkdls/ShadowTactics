import type { GameState, CardId } from '../state';
import type { GameAction } from '../action-types';

export function handleIdentity(state: GameState, action: GameAction): GameState {
    if (action.type !== 'SELECT_IDENTITY') return state;

    const playerId = action.playerId;
    const player = state.players[playerId];
    if (!player) return state;
    if (player.selectedIdentity) return state;
    if (!player.identityCards?.includes(action.cardId)) return state;

    // Devolver las 2 cartas no seleccionadas al mazo de identidad
    const returned: CardId[] = player.identityCards.filter(id => id !== action.cardId);

    let newState: GameState = {
        ...state,
        gameHistory: [...state.gameHistory, {
            id: `h${state.nextHistoryId}`,
            turn: state.turn,
            actionNumber: state.gameHistory.filter((h: any) => h.turn === state.turn).length + 1,
            playerId,
            type: 'phase',
            phaseName: 'identity_select',
            details: action.cardId,
        }],
        nextHistoryId: state.nextHistoryId + 1,
        identityDeck: [...state.identityDeck, ...returned],
        players: {
            ...state.players,
            [playerId]: {
                ...player,
                selectedIdentity: action.cardId,
                identityCards: [],
            }
        }
    };

    const allSelected = Object.values(newState.players).every(p => p.selectedIdentity);
    if (!allSelected) return newState;

    const revealedPlayers = Object.fromEntries(
        Object.entries(newState.players).map(([id, p]) => [
            id, { ...p, revealedIdentity: true }
        ])
    );
    return {
        ...newState,
        players: revealedPlayers,
        preparationPhase: 'ROLL',
        gameStartTime: Date.now(),
    };
}
