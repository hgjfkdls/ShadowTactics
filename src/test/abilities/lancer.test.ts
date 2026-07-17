import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Class: Lancer ---\n');

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
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', abilities: ['blanco_facil', 'patada_acrobatica', 'fuego_cobertura'], flags: [] },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'], flags: [] },
            u3: { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'], flags: [] },
            u4: { id: 'u4', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'], flags: [] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [], flags: [] },
            gen1: { id: 'gen1', owner: 'p1', position: { q: -2, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [], flags: [] },
        }
    };
    return s;
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
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 1 }, attack: 4, hp: 10, difficulty: 7, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'], flags: [] },
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

// ── Ventaja de alcance (success) ──

{
    const state = makeState();
    // Crear lancer p1 en (0,0), target en (2,0) — distancia 2, rango 1 + 1 bonus = 2 ✓
    const withLancer: GameState = {
        ...state,
        rngSeed: 42,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'], flags: [] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 2, r: 0 }, attack: 3, hp: 5, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            u2: { ...state.units['u2'], position: { q: 3, r: 0 } },
        }
    };

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
    assert(!!result.units['u5']?.flags?.includes('basic_attack'),
        'Ventaja alcance — marca basic_attack (reemplaza ataque básico)');
}

// ── Exclusión mutua: ventaja_alcance → doble_ataque bloqueado ──

{
    const state = makeState();
    const withLancer: GameState = {
        ...state,
        rngSeed: 42,
        units: {
            ...state.units,
            u5: { id: 'u5', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 10, difficulty: 2, range: 1, movementCost: 1, class: 'lancer', abilities: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'], flags: [] },
            uTarget: { id: 'uTarget', owner: 'p2', position: { q: 2, r: 0 }, attack: 3, hp: 5, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            u2: { ...state.units['u2'], position: { q: 3, r: 0 } },
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
        rngSeed: 42,
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
            type: 'USE_ABILITY', abilityId: 'ataque_basico',
            playerId: 'p1',
            unitId: 'u5',
            targetId: 'uTarget',
        });
        assert(result === afterVA,
            'Ventaja alcance + ataque básico — rechazado (ventaja reemplaza al básico)');
    }
}
