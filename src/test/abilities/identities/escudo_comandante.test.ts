import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Escudo del Comandante ---\n');

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

// ── ÁNGEL GUARDIÁN (general identity: Escudo del Comandante) ──

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['angel_guardian'] },
            u1: { ...s.units['u1'], hp: 8 },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'angel_guardian',
    });
    assert(st !== s, 'Ángel Guardián — aplica escudo a aliados');
    assert((st.units['u1']?.auraShield ?? 0) >= 2, 'Ángel Guardián — u1 recibe escudo +2');
    assert(st.units['u1']?.hp >= 9, 'Ángel Guardián — u1 recibe curación de 1 HP');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['angel_guardian'], flags: ['angel_guardian'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'angel_guardian',
    });
    assert(st === s, 'Ángel Guardián — rechazado si ya usado este turno');
}

{
    let s = makeState();
    s = {
        ...s,
        players: {
            p1: { ...s.players['p1'], actionPoints: 1, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['angel_guardian'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'angel_guardian',
    });
    assert(st === s, 'Ángel Guardián — rechazado si PA < 2');
}

// ── PROTEGER (general identity: Escudo del Comandante) ──

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['proteger'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'proteger',
        targetId: 'u1',
    });
    assert(st !== s, 'Proteger — acción aceptada');
    const u1Mod = st.activeModifiers.find(m => m.targetId === 'u1');
    assert(u1Mod !== undefined, 'Proteger — modifier aplicado a u1');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['proteger'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'proteger',
        targetId: 'en',
    });
    assert(st === s, 'Proteger — rechazado si target es enemigo');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['proteger'] },
            u1: { ...s.units['u1'], position: { q: 10, r: 5 } },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'proteger',
        targetId: 'u1',
    });
    assert(st === s, 'Proteger — rechazado si aliado está a distancia > 3');
}
