import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Card Actions ---\n');

function makeGameState(): GameState {
    let state = createInitialGameState();
    state = { ...state, gamePhase: 'GAME', turnPhase: 'MAIN', turn: 1, activePlayer: 'p1',
        players: {
            p1: { ...state.players['p1'], actionPoints: 10, carryOver: 0 },
            p2: { ...state.players['p2'], actionPoints: 5, carryOver: 0 },
        },
        units: {
            'u1': { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer' },
            'u2': { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry' },
            'u3': { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
            'u4': { id: 'u4', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry' },
            'general-p2': { id: 'general-p2', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general' },
        }
    };
    return state;
}

// ── USE_CARD ──

{
    const state = { ...makeGameState(), gamePhase: 'PREPARATION' as const };
    const result = applyAction(state, { type: 'USE_CARD', playerId: state.activePlayer, cardId: 'movilidad_1' });
    assert(result === state, 'USE_CARD — fuera de GAME rechazada');
}

{
    const state = makeGameState();
    const withCard: GameState = {
        ...state, players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] },
            p2: { ...state.players['p2'], cardsInHand: ['ladron_1'] },
        }
    };
    const result = applyAction(withCard, { type: 'USE_CARD', playerId: 'p1', cardId: 'movilidad_1' });
    assert(result !== withCard, 'USE_CARD — estado muta');
    assert(result.players['p1'].cardsInHand?.length === 0, 'USE_CARD — carta removida de mano');
    assert(result.lastCardAction?.cardId === 'movilidad_1', 'USE_CARD — carta va a pendiente');
    assertEqual(result.turnPhase, 'COUNTER', 'USE_CARD — fase cambia a COUNTER');
    assertEqual(result.players['p1'].actionPoints, 10, 'USE_CARD — no cuesta PA');

    const passed = applyAction(result, { type: 'PASS_COUNTER', playerId: 'p2' });
    assert(passed.effectDiscard.includes('movilidad_1'), 'PASS_COUNTER — carta añadida a descarte');
    assert(passed.lastCardAction === undefined, 'PASS_COUNTER — pendiente limpiado');
}

{
    const state = makeGameState();
    const withCard: GameState = {
        ...state, players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] }
        }
    };
    const result = applyAction(withCard, { type: 'USE_CARD', playerId: 'p1', cardId: 'precision_1' });
    assert(result === withCard, 'USE_CARD — carta no en mano es rechazada');
}

{
    const state = makeGameState();
    const withCard: GameState = {
        ...state, players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] },
            p2: { ...state.players['p2'], cardsInHand: ['ladron_1'] },
        }
    };
    const result = applyAction(withCard, { type: 'USE_CARD', playerId: 'p2', cardId: 'movilidad_1' });
    assert(result === withCard, 'USE_CARD — no es turno del jugador');
}

// ── PASS_COUNTER ──

{
    const state = makeGameState();
    const result = applyAction(state, { type: 'PASS_COUNTER', playerId: 'p2' });
    assert(result === state, 'PASS_COUNTER — fuera de COUNTER rechazado');
}

{
    const state = { ...makeGameState(), turnPhase: 'COUNTER' as const };
    const result = applyAction(state, { type: 'PASS_COUNTER', playerId: state.activePlayer });
    assert(result === state, 'PASS_COUNTER — jugador activo rechazado');
}
