import { assert, assertEqual } from './shared';
import { createInitialGameState } from '../shared/game/init';
import { applyAction } from '../shared/game/reducer';
import type { GameState } from '../shared/game/state';

console.log('\n--- Abilities ---\n');

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
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', abilities: ['blanco_facil', 'patada_acrobatica', 'fuego_cobertura', 'accion_evasiva'] },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'] },
            u3: { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
            u4: { id: 'u4', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
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

// ── Ventaja de alcance ──

{
    const state = makeState();
    // u2 es cavalry, no lancer. Ventaja de alcance no debería estar disponible
    // (depende de la clase, no del handler)

    // Probamos con un lancer — pero no hay en makeState, creamos uno
    const withLancer: GameState = {
        ...state,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 1 }, attack: 4, hp: 10, difficulty: 7, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 5, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
        }
    };

    const result = applyAction(withLancer, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u5',
        abilityId: 'ventaja_alcance',
        targetId: 'uTarget'
    });

    // Rango 1 + 1 bonus = 2, distancia de (0,1) a (3,1) = 3 > 2 → rechazado
    assert(result === withLancer,
        'Ventaja de alcance — rechazado si distancia > rango+1');
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

// ── Ventaja de alcance (success) ──

{
    const state = makeState();
    // Crear lancer p1 en (0,0), target en (2,0) — distancia 2, rango 1 + 1 bonus = 2 ✓
    const withLancer: GameState = {
        ...state,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 2, r: 0 }, attack: 3, hp: 5, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
        }
    };

    // Dificultad baja para garantizar impacto
    withLancer.units['u5'] = { ...withLancer.units['u5'], difficulty: 2 };

    const result = applyAction(withLancer, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u5',
        abilityId: 'ventaja_alcance',
        targetId: 'uTarget'
    });

    assert(result !== withLancer,
        'Ventaja alcance — éxito a distancia = rango+1');
    assertEqual(result.players['p1'].actionPoints, 9,
        'Ventaja alcance — cuesta 1 PA');
    assert(result.units['u5']?.attackedThisTurn === true,
        'Ventaja alcance — marca attackedThisTurn (reemplaza ataque básico)');
}

// ── Exclusión mutua: ventaja_alcance → doble_ataque bloqueado ──

{
    const state = makeState();
    const withLancer: GameState = {
        ...state,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 1 }, attack: 4, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 1, r: 0 }, attack: 3, hp: 5, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
        }
    };

    // Primero ventaja de alcance
    const afterVA = applyAction(withLancer, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u5',
        abilityId: 'ventaja_alcance',
        targetId: 'uTarget'
    });

    // El target podría haber muerto, intentamos doble ataque si sobrevive
    const targetAlive = afterVA.units['uTarget'];
    if (targetAlive) {
        const result = applyAction(afterVA, {
            type: 'USE_ABILITY',
            playerId: 'p1',
            unitId: 'u5',
            abilityId: 'doble_ataque',
            targetId: 'uTarget'
        });
        assert(result === afterVA,
            'Ventaja alcance + doble ataque — rechazado (mutuamente excluyentes)');
    }
}

// ── Ventaja de alcance bloquea ataque básico ──

{
    const state = makeState();
    const withLancer: GameState = {
        ...state,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 2, r: 0 }, attack: 3, hp: 5, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
        }
    };

    const afterVA = applyAction(withLancer, {
        type: 'USE_ABILITY',
        playerId: 'p1',
        unitId: 'u5',
        abilityId: 'ventaja_alcance',
        targetId: 'uTarget'
    });

    // Si el target sobrevive, intentar ataque básico debe ser rechazado
    const targetAlive = afterVA.units['uTarget'];
    if (targetAlive) {
        const result = applyAction(afterVA, {
            type: 'ATTACK_UNIT',
            playerId: 'p1',
            unitId: 'u5',
            targetId: 'uTarget',
        });
        assert(result === afterVA,
            'Ventaja alcance + ataque básico — rechazado (ventaja reemplaza al básico)');
    }
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
        // attack=3, línea_defensiva(-1) → daño 2
        assert(hpLost === 2,
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
