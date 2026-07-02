import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Class: Archer ---\n');

function makeState(): GameState {
    let s = createInitialGameState();
    s = {
        ...s,
        gamePhase: 'GAME',
        turnPhase: 'MAIN',
        activePlayer: 'p1',
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', abilities: ['blanco_facil', 'patada_acrobatica', 'fuego_cobertura'] },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'] },
            u3: { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
            u4: { id: 'u4', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
            gen1: { id: 'gen1', owner: 'p1', position: { q: -2, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
        }
    };
    return s;
}

// ── Patada acrobática ──

{
    const state = makeState();
    // u1 (arquero en 0,0), u3 está en (4,0) — distancia 4 > 1, no adyacente → rechazado
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'patada_acrobatica',
        targetId: 'u3',
        to: { q: 1, r: 0 }
    });

    assert(result === state,
        'Patada acrobática — rechazado si enemigo no está adyacente');
}

{
    const state = makeState();
    // u1 (arquero en 0,0), mover u3 a (1,0) — adyacente
    const adjacent: GameState = {
        ...state,
        units: {
            ...state.units,
            u3: { ...state.units['u3'], position: { q: 1, r: 0 } }
        }
    };

    // Destino (0,1) está adyacente a u1 pero no a u3 en (1,0) → distancia 1 a u1, distancia 1 a u3 = inválido
    // (1,0) está a distancia 1 de u3, que es 0 (misma posición) o 1 → inválido
    // Probar un destino inválido: (0,1) está a distancia 1 de u3 (1,0)? hexDistance((0,1),(1,0)) = 1 → adyacente → inválido
    const resultInvalidDest = applyAction(adjacent, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'patada_acrobatica',
        targetId: 'u3',
        to: { q: 0, r: 1 }
    });

    assert(resultInvalidDest === adjacent,
        'Patada acrobática — rechazado si destino está adyacente al enemigo');
}

{
    const state = makeState();
    // u1 (arquero en 0,0), u3 en (1,0) — adyacente
    // Destino válido: (0,-1) está adyacente a u1 (dist 1) y a distancia 2 de u3 (1,0) → no adyacente
    const setup: GameState = {
        ...state,
        units: {
            ...state.units,
            u3: { ...state.units['u3'], position: { q: 1, r: 0 } }
        }
    };

    const result = applyAction(setup, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'patada_acrobatica',
        targetId: 'u3',
        to: { q: 0, r: -1 }
    });

    assert(result !== setup,
        'Patada acrobática — ejecutado');
    assertEqual(result.players['p1'].actionPoints, 9,
        'Patada acrobática — cuesta 1 PA');
    assertEqual(result.units['u1'].position.q, 0,
        'Patada acrobática — u1 se movió a q=0');
    assertEqual(result.units['u1'].position.r, -1,
        'Patada acrobática — u1 se movió a r=-1');
    // u3 debe tener 1 de daño (hp 16 - 1 = 15)
    assertEqual(result.units['u3'].hp, 15,
        'Patada acrobática — u3 recibió 1 de daño');
}

// ── Fuego de cobertura ──

{
    const state = { ...makeState(), units: { ...makeState().units, u3: { ...makeState().units['u3'], position: { q: 3, r: 0 } } } };
    // u1 (archer en 0,0) ataca a u3 (infantry en 3,0) — distancia 3 = rango máximo
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'fuego_cobertura',
        targetId: 'u3'
    });

    assert(result !== state,
        'Fuego cobertura — ejecutado');
    assertEqual(result.players['p1'].actionPoints, 8,
        'Fuego cobertura — cuesta 2 PA');
}

{
    const state = makeState();
    // u2 es cavalry, no archer → no tiene fuego_cobertura
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'fuego_cobertura',
        targetId: 'u3'
    });
    assert(result === state,
        'Fuego cobertura — rechazado si unidad no tiene habilidad');
}
