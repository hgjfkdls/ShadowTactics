import { assert, assertEqual } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Punta de Lanza (torbellino) ---\n');

function makeState(): GameState {
    let s = createInitialGameState();
    s = {
        ...s,
        gamePhase: 'GAME', turnPhase: 'MAIN', activePlayer: 'p1', turn: 1,
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', flags: [], abilities: [] },
            u2: { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry', flags: ['basic_attack'], abilities: [] },
            en: { id: 'en', owner: 'p2', position: { q: 1, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', flags: [], abilities: [] },
            en2: { id: 'en2', owner: 'p2', position: { q: 0, r: 1 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', flags: [], abilities: [] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', flags: [], abilities: [] },
            gen1: { id: 'gen1', owner: 'p1', position: { q: -2, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', flags: [], abilities: [] },
        },
    };
    return s;
}

{
    // Punta de Lanza da a los lanceros la habilidad torbellino y proyeccion
    const state = makeState();
    const lancer = { ...state.units['u2'], class: 'lancer' as const, abilities: ['torbellino', 'proyeccion'] };
    const s = { ...state, units: { ...state.units, u2: lancer } };
    const r = applyAction(s, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'torbellino' });
    assert(r !== s, 'torbellino — acción aceptada');
    assert(r.units['u2']?.flags?.includes('torbellino'), 'torbellino — flag seteado');
}

{
    // Torbellino rechazado si ya se usó este turno
    const state = makeState();
    const lancer = { ...state.units['u2'], class: 'lancer' as const, flags: ['torbellino'], abilities: ['torbellino', 'proyeccion'] };
    const s = { ...state, units: { ...state.units, u2: lancer } };
    const r = applyAction(s, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'torbellino' });
    assert(r === s, 'torbellino — rechazado si ya se usó');
}
