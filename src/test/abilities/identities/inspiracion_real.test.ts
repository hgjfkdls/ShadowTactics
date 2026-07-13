import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Inspiración Real (en nombre del rey) ---\n');

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
            gen: { id: 'gen', owner: 'p1', position: { q: 0, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', flags: [], abilities: ['en_nombre_del_rey'] },
            ally: { id: 'ally', owner: 'p1', position: { q: 1, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer', flags: [], abilities: [] },
            en: { id: 'en', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', flags: [], abilities: [] },
        },
    };
    return s;
}

{
    const state = makeState();
    const r = applyAction(state, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen', abilityId: 'en_nombre_del_rey', targetId: 'ally' });
    assert(r !== state, 'en_nombre_del_rey — acción aceptada');
    assert(r.units['ally']?.flags?.includes('attack_again'), 'en_nombre_del_rey — flag attack_again en aliado');
}
