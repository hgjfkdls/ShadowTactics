import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { applyAction } from '../../shared/game/reducer';
import type { GameState } from '../../shared/game/state';

console.log('\n--- Turn & Game Over ---\n');

function makeGameState(): GameState {
    let state = createInitialGameState();
    state = { ...state, gamePhase: 'GAME', turnPhase: 'MAIN', turn: 1, activePlayer: 'p1',
        players: {
            p1: { ...state.players['p1'], actionPoints: 10, carryOver: 0 },
            p2: { ...state.players['p2'], actionPoints: 5, carryOver: 0 },
        },
        units: {
            'u1': { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer' },
            'u2': { id: 'u2', owner: 'p1', position: { q: 2, r: 0 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry' },
            'u3': { id: 'u3', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: ['resistencia', 'linea_defensiva', 'presion', 'avance'] },
            'u4': { id: 'u4', owner: 'p2', position: { q: 3, r: 1 }, attack: 3, hp: 14, difficulty: 7, range: 1, movementCost: 1, class: 'cavalry' },
            'general-p2': { id: 'general-p2', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general' },
        }
    };
    return state;
}

{
    const state = makeGameState();
    const moved = applyAction(state, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'movimiento', to: { q: 1, r: 0 } });
    const result = applyAction(moved, { type: 'END_TURN', playerId: 'p1' });
    assertEqual(result.turn, 2, 'END_TURN — turno avanza a 2');
    assertEqual(result.activePlayer, 'p2', 'END_TURN — turno pasa a p2');
    assertEqual(result.players['p1'].carryOver, 4, 'END_TURN — carryOver = floor(8/2) = 4');
}

{
    const state = makeGameState();
    const result = applyAction(state, { type: 'END_TURN', playerId: 'p1' });
    assertEqual(result.players['p1'].carryOver, 5, 'END_TURN — carryOver = PA/2 redondeado abajo');
}

{
    const state = makeGameState();
    const result = applyAction(state, { type: 'END_TURN', playerId: 'p2' });
    assert(result === state, 'END_TURN — no es turno de p2');
}

{
    const state = makeGameState();
    const general = state.units['general-p2'];
    const u2 = state.units['u2'];
    const setup: GameState = { ...state, units: { ...state.units, 'general-p2': { ...general, position: { q: 3, r: 0 }, hp: 1 }, 'u2': { ...u2, difficulty: 2 } } };
    const result = applyAction(setup, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'ataque_basico', targetId: 'general-p2' });
    assert(result.gamePhase === 'GAME_OVER', 'VICTORIA — fase cambia a GAME_OVER al matar general');
    assert(result.winner === 'p1', 'VICTORIA — ganador es el atacante');
    assert(result.graveyard['general-p2'] !== undefined, 'VICTORIA — general está en el cementerio');
    assert(result.units['general-p2'] === undefined, 'VICTORIA — general ya no está en unidades');
}

{
    const state = makeGameState();
    const general = state.units['general-p2'];
    const u2 = state.units['u2'];
    const setup: GameState = { ...state, units: { ...state.units, 'general-p2': { ...general, position: { q: 3, r: 0 }, hp: 1 }, 'u2': { ...u2, difficulty: 2 } } };
    const afterKill = applyAction(setup, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u2', abilityId: 'ataque_basico', targetId: 'general-p2' });
    const secondAction = applyAction(afterKill, { type: 'USE_ABILITY', playerId: 'p1', unitId: 'u1', abilityId: 'movimiento', to: { q: 1, r: 0 } });
    assert(secondAction === afterKill, 'VICTORIA — acciones bloqueadas tras game over');
}

{
    const state = { ...makeGameState(), turnPhase: 'DRAW' as const };
    const result = applyAction(state, { type: 'END_TURN', playerId: state.activePlayer });
    assert(result === state, 'END_TURN — en DRAW rechazado');
}

{
    const state = { ...makeGameState(), turnPhase: 'COUNTER' as const };
    const result = applyAction(state, { type: 'END_TURN', playerId: state.activePlayer });
    assert(result === state, 'END_TURN — en COUNTER rechazado');
}
