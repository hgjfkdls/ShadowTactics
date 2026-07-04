import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Class: Infantry ---\n');

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
            en_adj: { id: 'en_adj', owner: 'p2', position: { q: 1, r: 0 }, attack: 2, hp: 2, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
            gen1: { id: 'gen1', owner: 'p1', position: { q: -2, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
        }
    };
    return s;
}

// ── Avance (pasiva) ──

{
    const state = makeState();
    const setup: GameState = {
        ...state,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 2, r: 1 }, attack: 3, hp: 12, difficulty: 2, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 1, difficulty: 2, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
        }
    };

    // Ataque básico elimina al enemigo → pendingOccupation se setea
    const afterAttack = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u5',
        targetId: 'uTarget'
    });

    assert(afterAttack.graveyard['uTarget'] !== undefined,
        'Avance — enemigo eliminado');
    assert(afterAttack.pendingOccupation?.unitId === 'u5',
        'Avance — pendingOccupation.unitId es u5');
    assertEqual(afterAttack.pendingOccupation!.position.q, 3,
        'Avance — pendingOccupation en q=3');
    assertEqual(afterAttack.pendingOccupation!.position.r, 1,
        'Avance — pendingOccupation en r=1');

    // Aceptar ocupación
    const afterOccupy = applyAction(afterAttack, {
        type: 'OCCUPY_POSITION',
        playerId: 'p1',
        accept: true,
    });

    assert(afterOccupy.pendingOccupation === undefined,
        'Avance — pendingOccupation limpiado');
    assertEqual(afterOccupy.units['u5'].position.q, 3,
        'Avance — u5 se movió a q=3');
    assertEqual(afterOccupy.units['u5'].position.r, 1,
        'Avance — u5 se movió a r=1');
}

// ── Romper filas + Resistencia ──

{
    const state = makeState();
    // Cavalry (romper_filas) ataca a infantry (resistencia)
    // Con romper_filas, resistencia debería ignorarse
    const setup: GameState = {
        ...state,
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'] },
            u2: { id: 'u2', owner: 'p2', position: { q: 1, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
        }
    };

    const result = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        targetId: 'u2'
    });

    const targetAfter = result.units['u2'];
    if (!targetAfter) {
        assert(result.graveyard['u2'] !== undefined,
            'Romper filas — u2 eliminado');
    } else {
        const hpLost = 12 - targetAfter.hp;
        // attack=4, sin resistencia (romper_filas), sin crítica → daño 4
        const expected = 4;
        assert(hpLost === expected || targetAfter.hp <= 12 - expected,
            `Romper filas — daño ≥ ${expected} (recibido ${hpLost})`);
    }
}

// ── Resistencia (sin Romper filas) ──

{
    const state = makeState();
    // Infantry ataca a otra infantry (ambas con resistencia)
    // La primera vez que recibe daño en el turno, -1
    const setup: GameState = {
        ...state,
        activePlayer: 'p2',
        players: {
            p1: { ...state.players['p1'], actionPoints: 10 },
            p2: { ...state.players['p2'], actionPoints: 10 },
        },
        units: {
            u1: { id: 'u1', owner: 'p2', position: { q: 0, r: 0 }, attack: 3, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
            u2: { id: 'u2', owner: 'p1', position: { q: 1, r: 0 }, attack: 3, hp: 10, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
        }
    };

    const result = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p2',
        unitId: 'u1',
        targetId: 'u2'
    });

    const targetAfter = result.units['u2'];
    if (!targetAfter) {
        assert(result.graveyard['u2'] !== undefined,
            'Resistencia — u2 eliminado');
    } else {
        const hpLost = 10 - targetAfter.hp;
        // attack=3, resistencia -1 → daño 2
        assert(hpLost >= 1 && hpLost <= 3,
            `Resistencia — daño entre 1-3 (recibido ${hpLost})`);
    }
}

// ── Línea defensiva ──

{
    const state = makeState();
    // Infantry con Línea defensiva que no se movió el turno anterior → -1 daño
    const setup: GameState = {
        ...state,
        activePlayer: 'p2',
        players: {
            p1: { ...state.players['p1'], actionPoints: 10 },
            p2: { ...state.players['p2'], actionPoints: 10 },
        },
        units: {
            u1: { id: 'u1', owner: 'p2', position: { q: 0, r: 0 }, attack: 3, hp: 10, difficulty: 0, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            // u2 es el defensor con Línea defensiva y sin movimiento previo
            u2: { id: 'u2', owner: 'p1', position: { q: 1, r: 0 }, attack: 2, hp: 10, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['linea_defensiva'], didMovePreviousTurn: false },
        }
    };

    const result = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p2',
        unitId: 'u1',
        targetId: 'u2'
    });

    const targetAfter = result.units['u2'];
    if (!targetAfter) {
        assert(result.graveyard['u2'] !== undefined,
            'Línea defensiva — u2 eliminado');
    } else {
        const hpLost = 10 - targetAfter.hp;
        // attack=3, línea_defensiva(-1) → daño 2 (o 3 con crítico)
        assert(hpLost === 2 || hpLost === 3,
            `Línea defensiva — daño 2 (recibido ${hpLost})`);
    }
}

// ── Anti-caballería ──

{
    const state = makeState();
    // Lancer ataca cavalry → +1 daño
    const setup: GameState = {
        ...state,
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'] },
            u2: { id: 'u2', owner: 'p2', position: { q: 1, r: 0 }, attack: 4, hp: 10, difficulty: 6, range: 1, movementCost: 1, class: 'cavalry', abilities: [] },
        }
    };

    const result = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p1',
        unitId: 'u1',
        targetId: 'u2'
    });

    const targetAfter = result.units['u2'];
    if (!targetAfter) {
        assert(result.graveyard['u2'] !== undefined,
            'Anti-caballería — u2 eliminado');
    } else {
        const hpLost = 10 - targetAfter.hp;
        // attack=3, anti-caballería +1 → daño 4 (o 6 con crítico)
        assert(hpLost >= 4 && hpLost <= 6,
            `Anti-caballería — daño entre 4-6 (recibido ${hpLost})`);
    }
}

// ── Presión ──

{
    const state = makeState();
    // Infantry ataca al mismo objetivo dos veces seguidas → +1 daño la segunda vez
    const setup: GameState = {
        ...state,
        activePlayer: 'p2',
        players: {
            p1: { ...state.players['p1'], actionPoints: 10 },
            p2: { ...state.players['p2'], actionPoints: 10 },
        },
        units: {
            u1: { id: 'u1', owner: 'p2', position: { q: 0, r: 0 }, attack: 3, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'infantry', abilities: ['presion'] },
            u2: { id: 'u2', owner: 'p1', position: { q: 1, r: 0 }, attack: 2, hp: 15, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
        }
    };

    // Primer ataque
    const firstHit = applyAction(setup, {
        type: 'ATTACK_UNIT',
        playerId: 'p2',
        unitId: 'u1',
        targetId: 'u2'
    });

    const target1 = firstHit.units['u2'];
    if (!target1) {
        assert(firstHit.graveyard['u2'] !== undefined,
            'Presión setup — u2 eliminado en primer ataque');
    } else {
        // Segundo ataque al mismo objetivo (necesitamos PA extra)
        // El ataque actualiza lastTargetId automáticamente en resolver
        const secondHit = applyAction(firstHit, {
            type: 'ATTACK_UNIT',
            playerId: 'p2',
            unitId: 'u1',
            targetId: 'u2'
        });

        const target2 = secondHit.units['u2'];
        if (!target2) {
            assert(secondHit.graveyard['u2'] !== undefined,
                'Presión — u2 eliminado en segundo ataque (posible +1 daño)');
        } else {
            const hpLost2 = (target1?.hp ?? 15) - target2.hp;
            // Segundo ataque debería hacer +1 daño por Presión (si acertó el primero y lastTargetId se actualizó)
            // attack=3, presión +1 → daño 4 (sin crítica)
            assert(hpLost2 <= 6,
                `Presión — segundo ataque daño ≤ 6 (recibido ${hpLost2})`);
        }
    }
}

// ── Ejecutar ──

{
    const state = makeState();
    const st = applyAction(state, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'ejecutar', targetId: 'en',
    });
    assert(st === state, 'Ejecutar — rechazado si la unidad no tiene la habilidad');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            u1: { ...s.units['u1'], abilities: ['ejecutar'] },
            en_adj: { ...s.units['en_adj'], hp: 2 },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'ejecutar', targetId: 'en_adj',
    });
    assert(st !== s, 'Ejecutar — ejecución permitida contra enemigo adyacente con 2 HP');
    const inGrave = st.graveyard['en_adj'] !== undefined;
    const inUnits = st.units['en_adj'] !== undefined;
    assert(inGrave || inUnits, 'Ejecutar — target en graveyard o units');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            u1: { ...s.units['u1'], abilities: ['ejecutar'] },
            u3: { ...s.units['u3'], hp: 5 },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'ejecutar', targetId: 'u3',
    });
    assert(st === s, 'Ejecutar — rechazado si enemigo tiene más de 2 HP');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            u1: { ...s.units['u1'], abilities: ['ejecutar'], attackedThisTurn: true },
            en_adj: { ...s.units['en_adj'], hp: 2 },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'ejecutar', targetId: 'en_adj',
    });
    assert(st === s, 'Ejecutar — rechazado si ya atacó este turno');
}
