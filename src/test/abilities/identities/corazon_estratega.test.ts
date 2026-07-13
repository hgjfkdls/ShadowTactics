import { assert, assertEqual } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Corazón Estratega (posición estratégica) ---\n');

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
            gen: { id: 'gen', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', flags: [], abilities: ['posicion_estrategica'] },
            ally: { id: 'ally', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', flags: [], abilities: [] },
            en: { id: 'en', owner: 'p2', position: { q: 3, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', flags: [], abilities: [] },
        },
    };
    return s;
}

{
    // Posición estratégica: se mueve a hex vacío adyacente
    const state = makeState();
    const r = applyAction(state, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen', abilityId: 'posicion_estrategica', to: { q: 1, r: 0 } });
    assert(r !== state, 'posicion_estrategica — acción aceptada');
    assert(r.units['gen']?.position?.q === 1 && r.units['gen']?.position?.r === 0, 'posicion_estrategica — se movió a (1,0)');
}

{
    // Posición estratégica rechazada si el hex está ocupado
    const state = makeState();
    const occupied = { ...state, units: { ...state.units, ally: { id: 'ally', owner: 'p1', position: { q: 1, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', flags: [], abilities: [] } } };
    const r = applyAction(occupied, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen', abilityId: 'posicion_estrategica', to: { q: 1, r: 0 } });
    assert(r === occupied, 'posicion_estrategica — rechazado si hex ocupado');
}
