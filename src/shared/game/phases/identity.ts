import type { GameState, CardId } from '../state';
import type { GameAction } from '../action-types';

export function handleIdentity(state: GameState, action: GameAction): GameState {
    if (action.type !== 'SELECT_IDENTITY') return state;

    const playerId = action.playerId;
    const player = state.players[playerId];
    if (!player) return state;
    if (player.selectedIdentity) return state;

    // Allow selecting from identityCards (normal) or identityDeck (simulated test mode)
    const inCards = player.identityCards?.includes(action.cardId);
    const inDeck = state.identityDeck?.includes(action.cardId);
    if (!inCards && !inDeck) return state;

    // Cards to return to deck (normal mode: return unchosen cards)
    let newDeck = [...(state.identityDeck ?? [])];
    let returned: CardId[] = [];

    if (inCards) {
        returned = player.identityCards!.filter(id => id !== action.cardId);
        newDeck = [...newDeck, ...returned];
    } else if (inDeck) {
        // Simulated mode: remove selected card from deck
        newDeck = newDeck.filter(id => id !== action.cardId);
    }

    let newState: GameState = {
        ...state,
        identityDeck: newDeck,
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
