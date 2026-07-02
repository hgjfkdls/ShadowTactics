import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Class: Cavalry ---\n');

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

// ── Cabalgar ──

{
    const state = makeState();
    // u2 (cavalry en 2,0) cabalga a (4,0) — distancia 2 en línea recta
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'cabalgar',
        to: { q: 4, r: 0 }
    });

    assert(result !== state,
        'Cabalgar — se ejecuta en línea recta distancia 2');
    assertEqual(result.units['u2'].position.q, 4,
        'Cabalgar — u2 se movió a Q=4');
    assertEqual(result.players['p1'].actionPoints, 9,
        'Cabalgar — cuesta 1 PA');
}

{
    const state = makeState();
    // Intentar cabalgar distancia 3, debe ser rechazado
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'cabalgar',
        to: { q: 5, r: 0 }
    });

    assert(result === state,
        'Cabalgar — distancia ≠ 2 es rechazado');
}

// ── Carga ──

{
    const state = makeState();
    // Primero cabalgar, luego carga
    const afterCabalgar = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'cabalgar',
        to: { q: 4, r: 0 }
    });

    // Cabalgar fue hacia este (4,0) desde (2,0). Carga proyecta 1 hex más: (5,0)
    const general = afterCabalgar.units['u4'];
    const afterCabalgarMoved: GameState = {
        ...afterCabalgar,
        units: {
            ...afterCabalgar.units,
            u4: { ...general, position: { q: 5, r: 0 } }
        }
    };
    // Poner dificultad baja y HP bajo para impacto garantizado
    afterCabalgarMoved.units['u2'] = { ...afterCabalgarMoved.units['u2'], difficulty: 2 };
    afterCabalgarMoved.units['u4'] = { ...afterCabalgarMoved.units['u4'], hp: 1 };

    const result = applyAction(afterCabalgarMoved, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'carga',
        targetId: 'u4'
    });

    assert(result.players['p1'].actionPoints === 8,
        'Carga — cuesta 1 PA (9 - 1 = 8)');
}

{
    const state = makeState();
    // Carga sin Cabalgar previo → debe ser rechazada
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'carga',
        targetId: 'u4'
    });

    assert(result === state,
        'Carga — rechazada si no hubo Cabalgar previo');
}

// ── Doble ataque (caballería) ──

{
    const state = makeState();
    // u2 (cavalry en 2,0) ataca a u4 (cavalry en 3,0) — distancia 1 ✓
    // Después doble ataque al mismo objetivo
    const setup: GameState = {
        ...state,
        units: {
            ...state.units,
            u4: { ...state.units['u4'], position: { q: 3, r: 0 } }
        }
    };

    const afterAttack = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u2',
        targetId: 'u4'
    });

    // u4 podría haber muerto, si sobrevive intentamos doble ataque
    const u4alive = afterAttack.units['u4'];
    if (!u4alive) {
        assert(afterAttack.graveyard['u4'] !== undefined,
            'Doble ataque setup — u4 eliminado en primer ataque');
    } else {
        const result = applyAction(afterAttack, {
            type: 'USE_ABILITY',
            playerId: 'p1',
            unitId: 'u2',
            abilityId: 'doble_ataque',
            targetId: 'u4'
        });
        // Debería ejecutarse (attackedThisTurn no bloquea doble_ataque)
        assert(result !== afterAttack,
            'Doble ataque — ejecutado tras ataque normal');
        assert(result.players['p1'].actionPoints === 8,
            'Doble ataque — cuesta 1 PA (10-1-1 tras ataque normal + habilidad)');
        assert(result.units['u2']?.usedDobleAtaque === true,
            'Doble ataque — flag usedDobleAtaque');
    }
}

{
    const state = makeState();
    // u2 ataca a u3 (fuera de rango? distancia 2 > rango 1) → rechazado
    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'doble_ataque',
        targetId: 'u3'
    });
    assert(result === state,
        'Doble ataque — rechazado si objetivo fuera de rango');
}

// ── CABALLERÍA COMBOS ──

// PERMITED: ataque_basico → doble_ataque
{
    const state = makeState();
    // u2 (cavalry en 2,0) ataca a u3 en (3,0) — distancia 1, dentro de rango
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 3, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    assert(r1 !== s1, 'Combo basic→doble: ataque básico ejecutado');

    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u3' });
    assert(r2 !== r1, 'Combo basic→doble: doble ataque ejecutado (acierte o falle)');
}

// NOT permited: ataque_basico → cabalgar (cabalgar reemplaza movimiento, ya atacó)
{
    const state = makeState();
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 3, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    assert(r1 !== s1, 'Combo basic→cabalgar: ataque ok');
    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar', to: { q: 4, r: 0 } });
    assert(r2 === r1, 'Combo basic→cabalgar: rechazado (ya atacó)');
}

// NOT permited: ataque_basico → carga (carga requiere cabalgar)
{
    const state = makeState();
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 3, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    assert(r1 !== s1, 'Combo basic→carga: ataque ok');
    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'carga', targetId: 'u3' });
    assert(r2 === r1, 'Combo basic→carga: rechazado (requiere cabalgar)');
}

// NOT permited: ataque_basico → doble_ataque → cabalgar
{
    const state = makeState();
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 3, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u3' });
    assert(r2 !== r1, 'Combo basic→doble→cabalgar: doble ok');
    const r3 = applyAction(r2, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar', to: { q: 4, r: 0 } });
    assert(r3 === r2, 'Combo basic→doble→cabalgar: rechazado');
}

// NOT permited: ataque_basico → doble_ataque → carga
{
    const state = makeState();
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 3, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u3' });
    assert(r2 !== r1, 'Combo basic→doble→carga: doble ok');
    const r3 = applyAction(r2, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'carga', targetId: 'u3' });
    assert(r3 === r2, 'Combo basic→doble→carga: rechazado (requiere cabalgar)');
}

// PERMITED: cabalgar → carga → doble_ataque
{
    const state = makeState();
    // u2 en (2,0), u4 (enemigo) en (3,1) como objetivo de carga
    // Cabalgar de (2,0) a (4,0) — línea recta, distancia 2, sin obstáculos
    const r1 = applyAction(state, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar', to: { q: 4, r: 0 } });
    assert(r1 !== state, 'Combo cab→carga→doble: cabalgar ok');
    assert(r1.units['u2']?.usedCabalgar, 'Combo cab→carga→doble: usedCabalgar true');

    // Carga: u2 en (4,0), cabalgarDir = (1,0), espera objetivo en (5,0)
    // Mover u4 de (3,1) a (5,0) para que carga funcione
    const cargaSetup = {
        ...r1,
        units: {
            ...r1.units,
            u4: { ...r1.units['u4'], position: { q: 5, r: 0 } }
        }
    };
    const r2 = applyAction(cargaSetup, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'carga', targetId: 'u4' });
    assert(r2 !== cargaSetup, 'Combo cab→carga→doble: carga ejecutada');
    assert(r2.units['u2']?.usedCarga, 'Combo cab→carga→doble: usedCarga true');

    // Doble ataque después de carga sobre u4
    const r3 = applyAction(r2, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u4' });
    assert(r3 !== r2, 'Combo cab→carga→doble: doble ataque ejecutado');
}

// PERMITED: cabalgar → ataque_basico → doble_ataque
{
    const state = makeState();
    // Cabalgar de (2,0) a (4,0), u4 en (5,0) para ataque básico (distancia 1)
    const r1 = applyAction(state, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar', to: { q: 4, r: 0 } });
    assert(r1 !== state, 'Combo cab→basic→doble: cabalgar ok');

    // Mover u4 a (5,0) para ataque básico a distancia 1
    const atkSetup = { ...r1, units: { ...r1.units, u4: { ...r1.units['u4'], position: { q: 5, r: 0 } } } };
    const r2 = applyAction(atkSetup, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u4' });
    assert(r2 !== atkSetup, 'Combo cab→basic→doble: ataque básico ok');

    const r3 = applyAction(r2, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u4' });
    assert(r3 !== r2, 'Combo cab→basic→doble: doble ataque ok');
}

// PERMITED: movimiento → ataque_basico
{
    const state = makeState();
    // u2 en (2,0), mover a (1,0). u3 (enemigo) en (0,0) a distancia 1
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 0, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 1, r: 0 } });
    assert(r1 !== s1, 'Combo move→attack: movimiento ok');

    const r2 = applyAction(r1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    assert(r2 !== r1, 'Combo move→attack: ataque ok');
}

// PERMITED: movimiento → ataque_basico → doble_ataque
{
    const state = makeState();
    // u2 en (2,0), mover a (1,0). u3 (enemigo) en (0,0) a distancia 1
    const s1 = { ...state, units: { ...state.units, u3: { ...state.units['u3'], position: { q: 0, r: 0 } } } };
    const r1 = applyAction(s1, { type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 1, r: 0 } });
    assert(r1 !== s1, 'Combo move→attack→doble: movimiento ok');

    const r2 = applyAction(r1, { type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'u2', targetId: 'u3' });
    assert(r2 !== r1, 'Combo move→attack→doble: ataque ok');

    const r3 = applyAction(r2, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u3' });
    assert(r3 !== r2, 'Combo move→attack→doble: doble ataque ok');
}

// NOT permited: movimiento → cabalgar (cabalgar reemplaza movimiento)
{
    const state = makeState();
    const r1 = applyAction(state, { type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 1, r: 0 } });
    assert(r1 !== state, 'Combo move→cabalgar: movimiento ok');

    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar', to: { q: 3, r: 0 } });
    assert(r2 === r1, 'Combo move→cabalgar: rechazado (ya se movió)');
}

// NOT permited: movimiento → doble_ataque (requiere ataque previo)
{
    const state = makeState();
    const r1 = applyAction(state, { type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 1, r: 0 } });
    assert(r1 !== state, 'Combo move→doble: movimiento ok');

    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'doble_ataque', targetId: 'u3' });
    assert(r2 === r1, 'Combo move→doble: rechazado (sin ataque previo)');
}

// NOT permited: movimiento → carga (requiere cabalgar)
{
    const state = makeState();
    const r1 = applyAction(state, { type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 1, r: 0 } });
    assert(r1 !== state, 'Combo move→carga: movimiento ok');

    const r2 = applyAction(r1, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'carga', targetId: 'u3' });
    assert(r2 === r1, 'Combo move→carga: rechazado (requiere cabalgar)');
}
