import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Caballos de Guerra ---\n');

function makeState(): GameState {
    let s = createInitialGameState();
    s = {
        ...s,
        gamePhase: 'GAME',
        turnPhase: 'MAIN',
        activePlayer: 'p1',
        turn: 1,
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', abilities: ['blanco_facil'] },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', abilities: [] },
            en: { id: 'en', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            en_adj: { id: 'en_adj', owner: 'p2', position: { q: 1, r: 0 }, attack: 2, hp: 2, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
            gen1: { id: 'gen1', owner: 'p1', position: { q: -2, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
        },
    };
    return s;
}

// ── CABALGAR_2 (cavalry identity) ──

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            u2: { ...s.units['u2'], abilities: ['cabalgar_2', 'carga'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar_2',
        path: [{ q: 3, r: 0 }, { q: 3, r: -1 }],
    });
    assert(st !== s, 'Cabalgar_2 — movimiento por path permitido');
    assert(st.units['u2']?.position.q === 3, 'Cabalgar_2 — destino Q es el último hex del path');
    assert(st.units['u2']?.position.r === -1, 'Cabalgar_2 — destino R es el último hex del path');
    assert(!!st.units['u2']?.flags?.includes('cabalgar'), 'Cabalgar_2 — marca flag cabalgar');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            u2: { ...s.units['u2'], abilities: ['cabalgar_2'], flags: ['move'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar_2',
        path: [{ q: 3, r: 0 }, { q: 3, r: -1 }],
    });
    assert(st === s, 'Cabalgar_2 — rechazado si ya se movió (replacesMove)');
}

// ── A LA CARGA (cavalry identity) ──

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            u2: { ...s.units['u2'], abilities: ['cabalgar_2', 'a_la_carga', 'carga'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'a_la_carga',
    });
    assert(st !== s, 'A la carga — habilidad permitida');
    assert(st.players['p1']?.aLaCargaCost === 1, 'A la carga — coste pasa de 0 a 1');
    assert(!!st.units['u2']?.flags?.includes('a_la_carga'), 'A la carga — marca flag a_la_carga');
    const st2 = applyAction(st, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'cabalgar_2',
        path: [{ q: 3, r: 0 }, { q: 3, r: -1 }, { q: 2, r: -1 }],
    });
    assert(st2 !== st, 'A la carga + cabalgar_2 — permite 3 hexes');
    assert(st2.units['u2']?.position.q === 2, 'A la carga + cabalgar_2 — destino Q');
    assert(st2.units['u2']?.position.r === -1, 'A la carga + cabalgar_2 — destino R');
}
