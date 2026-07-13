import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Action: Movement ---\n');

export function makeGameState(): GameState {
    let state = createInitialGameState();

    state = {
        ...state,
        gamePhase: 'GAME',
        turnPhase: 'MAIN',
        turn: 1,
        activePlayer: 'p1',
        players: {
            p1: {
                ...state.players['p1'],
                actionPoints: 10,
                carryOver: 0,
            },
            p2: {
                ...state.players['p2'],
                actionPoints: 5,
                carryOver: 0,
            }
        },
        units: {
            'u1': {
                id: 'u1', owner: 'p1',
                position: { q: 0, r: 0 },
                attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2,
                class: 'archer'
            },
            'u2': {
                id: 'u2', owner: 'p1',
                position: { q: 2, r: 0 },
                attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1,
                class: 'cavalry'
            },
            'u3': {
                id: 'u3', owner: 'p2',
                position: { q: 4, r: 0 },
                attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1,
                class: 'infantry',
                abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance']
            },
            'u4': {
                id: 'u4', owner: 'p2',
                position: { q: 3, r: 1 },
                attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1,
                class: 'cavalry'
            },
            'general-p2': {
                id: 'general-p2', owner: 'p2',
                position: { q: 5, r: 0 },
                attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1,
                class: 'general'
            },
        }
    };
    return state;
}

// ── Movement ──

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'movimiento',
        to: { q: 1, r: 0 }
    });

    assert(result !== state, 'Movement — estado mutado');
    assertEqual(result.units['u1'].position.q, 1,
        'Movement — u1 se movió a Q=1');
    assertEqual(result.units['u1'].position.r, 0,
        'Movement — u1 se movió a R=0');
    assertEqual(result.players['p1'].actionPoints, 8,
        'Movement — costó 2 PA (movementCost=2)');
}

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'movimiento',
        to: { q: 2, r: 0 }
    });
    assert(result === state,
        'Movement — hex ocupado es rechazado');
}

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'movimiento',
        to: { q: 0, r: 2 }
    });
    assert(result === state,
        'Movement — distancia > 1 es rechazada');
}

{
    const state = makeGameState();

    const broke = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], actionPoints: 1 }
        }
    };
    const result = applyAction(broke, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'movimiento',
        to: { q: 1, r: 0 }
    });
    assert(result === broke,
        'Movement — PA insuficiente es rechazado');
}

{
    const state = makeGameState();

    // handleAbility valida activePlayer
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p2',
        unitId: 'u3',
        abilityId: 'movimiento',
        to: { q: 3, r: 0 }
    });
    assert(result === state,
        'Movement — no es turno de p2');
}

{
    const state = makeGameState();
    const myUnit = state.players[state.activePlayer].deployedUnits[0];
    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: state.activePlayer,
        unitId: myUnit, abilityId: 'movimiento', to: { q: 10, r: 0 }
    });
    assert(result === state,
        'Movement — fuera del mapa rechazado');
}

{
    const state = makeGameState();
    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: state.activePlayer,
        unitId: 'nonexistent', abilityId: 'movimiento', to: { q: 1, r: 0 }
    });
    assert(result === state,
        'Movement — unidad inexistente rechazado');
}
