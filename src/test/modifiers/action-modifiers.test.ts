import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Modifiers ---\n');

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

// ── Movement con modificador Movilidad (SET movementCost a 0) ──

{
    const state = makeGameState();
    const withMod: GameState = {
        ...state,
        activeModifiers: [{ id: 'mov_mod', sourcePlayerId: 'p1', stat: 'movementCost', value: 0, operator: 'SET', remainingTurns: 1, remainingUses: 1 }]
    };
    const result = applyAction(withMod, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'movimiento', to: { q: 1, r: 0 }
    });
    assert(result !== withMod,
        'Movilidad + Movement — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 10,
        'Movilidad + Movement — PA intactos (coste 0)');
    assert(result.units['u1']?.position.q === 1,
        'Movilidad + Movement — posición actualizada');
}

// ── Movement con modificador Pantano (MUL movementCost × 2) ──

{
    const state = makeGameState();
    const withMod: GameState = {
        ...state,
        activeModifiers: [{ id: 'pant_mod', sourcePlayerId: 'p2', stat: 'movementCost', value: 2, operator: 'MUL', remainingTurns: 1, remainingUses: 1 }]
    };
    const result = applyAction(withMod, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'movimiento', to: { q: 1, r: 0 }
    });
    assert(result !== withMod,
        'Pantano + Movement — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 6,
        'Pantano + Movement — coste 4 PA (2 × 2)');
}

// ── Movement con actionCost modifier (Fuego de cobertura) ──

{
    const state = makeGameState();
    const withPenalty: GameState = {
        ...state,
        activeModifiers: [{ id: 'ac_mod', sourcePlayerId: 'p1', targetId: 'u2', stat: 'actionCost', value: 1, operator: 'ADD', remainingTurns: 0, remainingUses: 2 }]
    };
    const result = applyAction(withPenalty, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'movimiento', to: { q: 3, r: 0 }
    });
    assert(result !== withPenalty,
        'actionCost + Movement — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 8,
        'actionCost + Movement — coste 2 PA (1 + 1)');
}

// ── Movement con actionCost + Pantano acumulados ──

{
    const state = makeGameState();
    const withBoth: GameState = {
        ...state,
        activeModifiers: [
            { id: 'pant_mod2', sourcePlayerId: 'p2', stat: 'movementCost', value: 2, operator: 'MUL', remainingTurns: 1, remainingUses: 1 },
            { id: 'ac_mod2', sourcePlayerId: 'p1', targetId: 'u2', stat: 'actionCost', value: 1, operator: 'ADD', remainingTurns: 0, remainingUses: 2 },
        ],
    };
    const result = applyAction(withBoth, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'movimiento', to: { q: 3, r: 0 }
    });
    assert(result !== withBoth,
        'actionCost + Pantano + Movement — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 7,
        'actionCost + Pantano + Movement — coste 3 PA (1 × 2 + 1)');
}
