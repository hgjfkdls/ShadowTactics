import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Action: Basic Attack ---\n');

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

// ── Basic attack (hit garantizado con difficulty baja) ──

{
    const base = makeGameState();
    const state = {
        ...base,
        rngSeed: 42,
        units: {
            ...base.units,
            u1: { ...base.units['u1'], difficulty: 2 },
            u3: { ...base.units['u3'], position: { q: 3, r: 0 } }
        },
        activeModifiers: [{
            id: 'mod_resistencia',
            sourcePlayerId: 'p2',
            targetId: 'u3',
            stat: 'defense',
            value: 1,
            operator: 'ADD' as const,
            remainingTurns: 1,
            remainingUses: 1,
            source: 'ability',
            sourceName: 'resistencia',
        }],
    };

    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'ataque_basico', targetId: 'u3'
    });

    assert(result !== state, 'Basic attack hit — estado mutado');
    assertEqual(result.players['p1'].actionPoints, 9, 'Basic attack hit — costó 1 PA');
    const u3after = result.units['u3'];
    assert(!!u3after, 'Basic attack hit — u3 sigue vivo');
    assertEqual(u3after!.hp, 14, 'Basic attack hit — u3 recibió 2 de daño (hit con Resistencia)');
}

// ── Basic attack (miss garantizado con difficulty alta) ──

{
    const base = makeGameState();
    const state = {
        ...base,
        rngSeed: 42,
        units: {
            ...base.units,
            u1: { ...base.units['u1'], difficulty: 13 },
            u3: { ...base.units['u3'], position: { q: 3, r: 0 } }
        }
    };

    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'ataque_basico', targetId: 'u3'
    });

    assert(result !== state, 'Basic attack miss — estado mutado');
    assertEqual(result.players['p1'].actionPoints, 9, 'Basic attack miss — costó 1 PA');
    assert(result.units['u1']?.hp === 12, 'Basic attack miss — sin contraataque (fuera de rango)');
}

// ── Basic attack melee (hit garantizado) ──

{
    const base = makeGameState();
    const state = {
        ...base,
        activePlayer: 'p2',
        rngSeed: 42,
        players: { ...base.players, p2: { ...base.players['p2'], actionPoints: 5 } },
        units: {
            ...base.units,
            u2: { ...base.units['u2'], position: { q: 3, r: 0 } },
            u3: { ...base.units['u3'], position: { q: 4, r: 0 }, difficulty: 2 },
        }
    };

    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: 'p2', unitId: 'u3', abilityId: 'ataque_basico', targetId: 'u2'
    });

    assert(result !== state, 'Basic attack melee hit — estado mutado');
    const u2after = result.units['u2'];
    assert(!!u2after, 'Basic attack melee hit — u2 sigue vivo');
    assertEqual(u2after!.hp, 14 - 2, 'Basic attack melee hit — u2 recibió 2 de daño (hit)');
}

// ── Basic attack melee (miss garantizado + contraataque) ──

{
    const base = makeGameState();
    const state = {
        ...base,
        activePlayer: 'p2',
        rngSeed: 42,
        players: { ...base.players, p2: { ...base.players['p2'], actionPoints: 5 } },
        units: {
            ...base.units,
            u2: { ...base.units['u2'], position: { q: 3, r: 0 } },
            u3: { ...base.units['u3'], position: { q: 4, r: 0 }, difficulty: 13 },
        }
    };

    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: 'p2', unitId: 'u3', abilityId: 'ataque_basico', targetId: 'u2'
    });

    assert(result !== state, 'Basic attack melee miss — estado mutado');
    const u3after = result.units['u3'];
    assert(u3after && u3after.hp < 16, 'Basic attack melee miss — u3 recibió contraataque');
}

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u2',
        abilityId: 'ataque_basico',
        targetId: 'u4'
    });
    assert(result === state,
        'Basic attack — fuera de rango es rechazado');
}

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'ataque_basico',
        targetId: 'u2'
    });
    assert(result === state,
        'Basic attack — atacar aliado es rechazado');
}

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'ataque_basico',
        targetId: 'fake'
    });
    assert(result === state,
        'Basic attack — objetivo inexistente es rechazado');
}

{
    const state = makeGameState();

    const broke = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], actionPoints: 0 }
        }
    };
    const result = applyAction(broke, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u1',
        abilityId: 'ataque_basico',
        targetId: 'u3'
    });
    assert(result === broke,
        'Basic attack — PA insuficiente es rechazado');
}

{
    const state = makeGameState();
    const enemyUnit = state.players.p2.deployedUnits[0];
    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: state.activePlayer,
        unitId: 'nonexistent', abilityId: 'ataque_basico', targetId: enemyUnit
    });
    assert(result === state,
        'Basic attack — atacante inexistente rechazado');
}

// ── USE_ABILITY con habilidad inexistente ──

{
    const state = makeGameState();
    const myUnit = state.players[state.activePlayer].deployedUnits[0];
    const result = applyAction(state, {
        type: 'USE_ABILITY', playerId: state.activePlayer,
        unitId: myUnit, abilityId: 'nonexistent'
    });
    assert(result === state,
        'USE_ABILITY — habilidad inexistente rechazada');
}
