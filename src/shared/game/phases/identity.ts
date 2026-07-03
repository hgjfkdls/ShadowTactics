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
        identityDeck: [...state.identityDeck, ...returned],
        players: {
            ...state.players,
            [playerId]: {
                ...player,
                selectedIdentity: action.cardId,
                identityCards: [],  // limpiar — ya no se necesitan
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
