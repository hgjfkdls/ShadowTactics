import { assert, assertEqual } from './shared';
import { createInitialGameState } from '../shared/game/init';
import { applyAction } from '../shared/game/reducer';
import type { GameState } from '../shared/game/state';

console.log('\n--- Game Actions ---\n');

// Helper: crear un estado de juego listo para acciones
function makeGameState(): GameState {
    let state = createInitialGameState();

    // Saltar preparación
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
                attack: 3, hp: 8, difficulty: 6, range: 4, movementCost: 2,
                class: 'archer'
            },
            'u2': {
                id: 'u2', owner: 'p1',
                position: { q: 2, r: 0 },
                attack: 4, hp: 10, difficulty: 7, range: 1, movementCost: 1,
                class: 'cavalry'
            },
            'u3': {
                id: 'u3', owner: 'p2',
                position: { q: 4, r: 0 },
                attack: 3, hp: 12, difficulty: 6, range: 1, movementCost: 1,
                class: 'infantry'
            },
            'u4': {
                id: 'u4', owner: 'p2',
                position: { q: 3, r: 1 },
                attack: 4, hp: 10, difficulty: 7, range: 1, movementCost: 1,
                class: 'cavalry'
            },
            'general-p2': {
                id: 'general-p2', owner: 'p2',
                position: { q: 5, r: 0 },
                attack: 5, hp: 15, difficulty: 6, range: 1, movementCost: 1,
                class: 'general'
            },
        }
    };
    return state;
}

// ── MOVE_UNIT ──

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'MOVE_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        to: { q: 1, r: 0 }
    });

    assert(result !== state, 'MOVE_UNIT — estado mutado');
    assertEqual(result.units['u1'].position.q, 1,
        'MOVE_UNIT — u1 se movió a Q=1');
    assertEqual(result.units['u1'].position.r, 0,
        'MOVE_UNIT — u1 se movió a R=0');
    assertEqual(result.players['p1'].actionPoints, 8,
        'MOVE_UNIT — costó 2 PA (movementCost=2)');
}

{
    const state = makeGameState();

    // Mover a hex ocupado
    const result = applyAction(state, {
        type: 'MOVE_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        to: { q: 2, r: 0 }
    });
    assert(result === state,
        'MOVE_UNIT — hex ocupado es rechazado');
}

{
    const state = makeGameState();

    // Mover a distancia > 1
    const result = applyAction(state, {
        type: 'MOVE_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        to: { q: 0, r: 2 }
    });
    assert(result === state,
        'MOVE_UNIT — distancia > 1 es rechazada');
}

{
    const state = makeGameState();

    // PA insuficiente
    const broke = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], actionPoints: 1 }
        }
    };
    const result = applyAction(broke, {
        type: 'MOVE_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        to: { q: 1, r: 0 }
    });
    assert(result === broke,
        'MOVE_UNIT — PA insuficiente es rechazado');
}

{
    const state = makeGameState();

    // No es su turno
    const result = applyAction(state, {
        type: 'MOVE_UNIT',
        playerId: 'p2',
        unitId: 'u3',
        to: { q: 3, r: 0 }
    });
    assert(result === state,
        'MOVE_UNIT — no es turno de p2');
}

// ── ATTACK_UNIT ──

{
    const state = makeGameState();

    // u1 (arquero, rango 4, dificultad 6) ataca a u3 (infantería en (4,0))
    const result = applyAction(state, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        targetId: 'u3'
    });

    // Distancia = 4, dentro de rango 4
    assert(result !== state, 'ATTACK_UNIT — estado mutado');
    assertEqual(result.players['p1'].actionPoints, 9,
        'ATTACK_UNIT — costó 1 PA');

    // RNG: puede acertar o fallar, el contraataque solo si el defensor está en rango
    const u3after = result.units['u3'];
    const u1after = result.units['u1'];
    if (!u3after) {
        assert(result.graveyard['u3'] !== undefined,
            'ATTACK_UNIT — u3 eliminado');
    } else if (u3after.hp < 12) {
        assert(u3after.hp === 12 - 3,
            'ATTACK_UNIT — u3 recibió 3 de daño (hit)');
    } else {
        // Falló: u3 (rango 1) está a distancia 4, no puede contraatacar
        assert(u1after && u1after.hp === 8,
            'ATTACK_UNIT — miss sin contraataque (fuera de rango)');
    }
}

{
    const state = makeGameState();
    // u3 (infantry en (4,0)) ataca a u2 (cavalry en (3,0)) a distancia 1
    const melee = {
        ...state,
        activePlayer: 'p2',
        players: {
            ...state.players,
            p2: { ...state.players['p2'], actionPoints: 5 }
        },
        units: {
            ...state.units,
            u2: { ...state.units['u2'], position: { q: 3, r: 0 } }
        }
    };
    const result = applyAction(melee, {
        type: 'ATTACK_UNIT',
        playerId: 'p2',
        unitId: 'u3',
        targetId: 'u2'
    });
    assert(result !== melee, 'ATTACK_UNIT melee — estado mutado');
    const u2after = result.units['u2'];
    if (u2after) {
        if (u2after.hp < 10) {
            assert(u2after.hp === 10 - 3,
                'ATTACK_UNIT melee — u2 recibió 3 de daño (hit)');
        } else {
            // Falló: u2 (rango 1) puede contraatacar
            const u3after = result.units['u3'];
            assert(u3after && u3after.hp < 12,
                'ATTACK_UNIT melee — miss, u3 recibió contraataque');
        }
    }
}

{
    const state = makeGameState();

    // u2 (caballería, rango 1) ataca a u4 (caballería en (3,1))
    // Distancia = 2 > rango 1
    const result = applyAction(state, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u2',
        targetId: 'u4'
    });
    assert(result === state,
        'ATTACK_UNIT — fuera de rango es rechazado');
}

{
    const state = makeGameState();

    // Atacar a unidad propia
    const result = applyAction(state, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        targetId: 'u2'
    });
    assert(result === state,
        'ATTACK_UNIT — atacar aliado es rechazado');
}

{
    const state = makeGameState();

    // Unidad inexistente
    const result = applyAction(state, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        targetId: 'fake'
    });
    assert(result === state,
        'ATTACK_UNIT — objetivo inexistente es rechazado');
}

{
    const state = makeGameState();

    // PA insuficiente
    const broke = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], actionPoints: 0 }
        }
    };
    const result = applyAction(broke, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        targetId: 'u3'
    });
    assert(result === broke,
        'ATTACK_UNIT — PA insuficiente es rechazado');
}

// ── END_TURN ──

{
    const state = makeGameState();
    // Gastar algo de PA
    const moved = applyAction(state, {
        type: 'MOVE_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        to: { q: 1, r: 0 }
    });

    const result = applyAction(moved, {
        type: 'END_TURN',
        playerId: 'p1'
    });

    assertEqual(result.turn, 2,
        'END_TURN — turno avanza a 2');
    assertEqual(result.activePlayer, 'p2',
        'END_TURN — turno pasa a p2');
    // PA restante se guarda como carryOver, PA no se resetea a 0
    assertEqual(result.players['p1'].carryOver, 4,
        'END_TURN — carryOver = floor(8/2) = 4');
}

{
    const state = makeGameState();

    const result = applyAction(state, {
        type: 'END_TURN',
        playerId: 'p1'
    });

    // carryOver = floor(10/2) = 5
    assertEqual(result.players['p1'].carryOver, 5,
        'END_TURN — carryOver = PA/2 redondeado abajo');
}

{
    const state = makeGameState();

    // p2 intenta terminar turno de p1
    const result = applyAction(state, {
        type: 'END_TURN',
        playerId: 'p2'
    });
    assert(result === state,
        'END_TURN — no es turno de p2');
}

// ── VICTORIA ──

{
    const state = makeGameState();
    const general = state.units['general-p2'];
    const u2 = state.units['u2'];
    // Mover general adyacente a u2 y ponerlo a 1 HP
    // Poner dificultad de u2 a 2 para garantizar impacto
    const setup: GameState = {
        ...state,
        units: {
            ...state.units,
            'general-p2': { ...general, position: { q: 3, r: 0 }, hp: 1 },
            'u2': { ...u2, difficulty: 2 }
        }
    };

    const result = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u2',
        targetId: 'general-p2'
    });

    assert(result.gamePhase === 'GAME_OVER',
        'VICTORIA — fase cambia a GAME_OVER al matar general');
    assert(result.winner === 'p1',
        'VICTORIA — ganador es el atacante');
    assert(result.graveyard['general-p2'] !== undefined,
        'VICTORIA — general está en el cementerio');
    assert(result.units['general-p2'] === undefined,
        'VICTORIA — general ya no está en unidades');
}

{
    const state = makeGameState();
    const general = state.units['general-p2'];
    const u2 = state.units['u2'];
    const setup: GameState = {
        ...state,
        units: {
            ...state.units,
            'general-p2': { ...general, position: { q: 3, r: 0 }, hp: 1 },
            'u2': { ...u2, difficulty: 2 }
        }
    };

    // Atacar y matar, luego intentar otra acción
    const afterKill = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u2',
        targetId: 'general-p2'
    });

    const secondAction = applyAction(afterKill, {
        type: 'MOVE_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        to: { q: 1, r: 0 }
    });

    assert(secondAction === afterKill,
        'VICTORIA — acciones bloqueadas tras game over');
}

// ── USE_CARD ──

{
    // Usar carta fuera de gamePhase=GAME → rechazada
    const state = { ...makeGameState(), gamePhase: 'PREPARATION' as const };
    const result = applyAction(state, {
        type: 'USE_CARD',
        playerId: state.activePlayer,
        cardId: 'movilidad_1'
    });
    assert(result === state,
        'USE_CARD — fuera de GAME rechazada');
}

{
    const state = makeGameState();
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] }
        }
    };

    const result = applyAction(withCard, {
        type: 'USE_CARD',
        playerId: 'p1',
        cardId: 'movilidad_1'
    });

    assert(result !== withCard, 'USE_CARD — estado muta');
    assert(result.players['p1'].cardsInHand?.length === 0,
        'USE_CARD — carta removida de mano');
    // BUFF/DEBUFF va a lastCardAction (pendiente de COUNTER phase); no al descarte aún
    assert(result.lastCardAction?.cardId === 'movilidad_1',
        'USE_CARD — carta va a pendiente');
    assertEqual(result.turnPhase, 'COUNTER',
        'USE_CARD — fase cambia a COUNTER');
    assertEqual(result.players['p1'].actionPoints, 10,
        'USE_CARD — no cuesta PA');

    // Pasar la fase COUNTER → carta se resuelve y va a effectDiscard
    const passed = applyAction(result, { type: 'PASS_COUNTER', playerId: 'p2' });
    assert(passed.effectDiscard.includes('movilidad_1'),
        'PASS_COUNTER — carta añadida a descarte');
    assert(passed.lastCardAction === undefined,
        'PASS_COUNTER — pendiente limpiado');
}

{
    const state = makeGameState();
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p1: { ...state.players['p1'], cardsInHand: ['movilidad_1'] }
        }
    };

    // Usar carta que no está en mano
    const result = applyAction(withCard, {
        type: 'USE_CARD',
        playerId: 'p1',
        cardId: 'precision_1'
    });

    assert(result === withCard,
        'USE_CARD — carta no en mano es rechazada');
}

{
    const state = makeGameState();
    const withCard: GameState = {
        ...state,
        players: {
            ...state.players,
            p2: { ...state.players['p2'], cardsInHand: ['movilidad_1'] }
        }
    };

    // p2 intenta usar carta en turno de p1
    const result = applyAction(withCard, {
        type: 'USE_CARD',
        playerId: 'p2',
        cardId: 'movilidad_1'
    });

    assert(result === withCard,
        'USE_CARD — no es turno del jugador');
}

{
    // PASS_COUNTER sin estar en COUNTER → rechazado
    const state = makeGameState();
    const result = applyAction(state, { type: 'PASS_COUNTER', playerId: 'p2' });
    assert(result === state,
        'PASS_COUNTER — fuera de COUNTER rechazado');
}

{
    // PASS_COUNTER por el jugador activo → rechazado
    const state = { ...makeGameState(), turnPhase: 'COUNTER' as const };
    const result = applyAction(state, { type: 'PASS_COUNTER', playerId: state.activePlayer });
    assert(result === state,
        'PASS_COUNTER — jugador activo rechazado');
}

{
    // END_TURN en turnPhase=DRAW → rechazado
    const state = { ...makeGameState(), turnPhase: 'DRAW' as const };
    const result = applyAction(state, { type: 'END_TURN', playerId: state.activePlayer });
    assert(result === state,
        'END_TURN — en DRAW rechazado');
}

{
    // END_TURN en turnPhase=COUNTER → rechazado
    const state = { ...makeGameState(), turnPhase: 'COUNTER' as const };
    const result = applyAction(state, { type: 'END_TURN', playerId: state.activePlayer });
    assert(result === state,
        'END_TURN — en COUNTER rechazado');
}

// ── MOVE_UNIT fuera del mapa ──

{
    const state = makeGameState();
    const myUnit = state.players[state.activePlayer].deployedUnits[0];
    const result = applyAction(state, {
        type: 'MOVE_UNIT', playerId: state.activePlayer,
        unitId: myUnit, to: { q: 10, r: 0 }
    });
    assert(result === state,
        'MOVE_UNIT — fuera del mapa rechazado');
}

// ── ATTACK_UNIT con atacante inexistente ──

{
    const state = makeGameState();
    const enemyUnit = state.players.p2.deployedUnits[0];
    const result = applyAction(state, {
        type: 'ATTACK_UNIT', playerId: state.activePlayer,
        unitId: 'nonexistent', targetId: enemyUnit
    });
    assert(result === state,
        'ATTACK_UNIT — atacante inexistente rechazado');
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

// ── MOVE_UNIT con modificador Movilidad (SET movementCost a 0) ──
{
    const state = makeGameState();
    // Agregar modificador Movilidad: movementCost SET 0, 1 uso
    const withMod: GameState = {
        ...state,
        activeModifiers: [{ id: 'mov_mod', sourcePlayerId: 'p1', stat: 'movementCost', value: 0, operator: 'SET', remainingTurns: 1, remainingUses: 1 }]
    };
    const result = applyAction(withMod, {
        type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u1', to: { q: 1, r: 0 }
    });
    assert(result !== withMod,
        'Movilidad + MOVE — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 10,
        'Movilidad + MOVE — PA intactos (coste 0)');
    assert(result.units['u1']?.position.q === 1,
        'Movilidad + MOVE — posición actualizada');
}

// ── MOVE_UNIT con modificador Pantano (MUL movementCost × 2) ──
{
    const state = makeGameState();
    const withMod: GameState = {
        ...state,
        activeModifiers: [{ id: 'pant_mod', sourcePlayerId: 'p2', stat: 'movementCost', value: 2, operator: 'MUL', remainingTurns: 1, remainingUses: 1 }]
    };
    // u1 movementCost=2, MUL 2 → coste 4, PA 10-4=6
    const result = applyAction(withMod, {
        type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u1', to: { q: 1, r: 0 }
    });
    assert(result !== withMod,
        'Pantano + MOVE — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 6,
        'Pantano + MOVE — coste 4 PA (2 × 2)');
}

// ── MOVE_UNIT con fuegoCoberturaCharges (Fuego de cobertura) ──
{
    const state = makeGameState();
    const withPenalty: GameState = {
        ...state,
        units: {
            ...state.units,
            'u2': { ...state.units['u2'], fuegoCoberturaCharges: 2 }
        }
    };
    // u2 movementCost=1, fuegoCoberturaCharges → +1 → coste 2, PA 10-2=8
    const result = applyAction(withPenalty, {
        type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 3, r: 0 }
    });
    assert(result !== withPenalty,
        'Penalidad + MOVE — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 8,
        'Penalidad + MOVE — coste 2 PA (1 + 1)');
}

// ── MOVE_UNIT con fuegoCoberturaCharges + Pantano acumulados ──
{
    const state = makeGameState();
    const withBoth: GameState = {
        ...state,
        units: {
            ...state.units,
            'u2': { ...state.units['u2'], fuegoCoberturaCharges: 2 }
        },
        activeModifiers: [{ id: 'pant_mod2', sourcePlayerId: 'p2', stat: 'movementCost', value: 2, operator: 'MUL', remainingTurns: 1, remainingUses: 1 }]
    };
    // u2 movementCost=1, fuegoCoberturaCharges(+1)=2, MUL 2 → coste 4, PA 10-4=6
    const result = applyAction(withBoth, {
        type: 'MOVE_UNIT', playerId: 'p1', unitId: 'u2', to: { q: 3, r: 0 }
    });
    assert(result !== withBoth,
        'Penalidad + Pantano + MOVE — movimiento ejecutado');
    assertEqual(result.players.p1.actionPoints, 6,
        'Penalidad + Pantano + MOVE — coste 4 PA (1 + 1 × 2)');
}
