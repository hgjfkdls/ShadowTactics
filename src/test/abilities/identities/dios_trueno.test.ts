import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';

console.log('\n--- Identity: Dios del Trueno ---\n');

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

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['rayo_celestial'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'rayo_celestial',
        targetId: 'u1',
    });
    assert(st !== s, 'Rayo celestial — aplica buff de ataque a aliado');
    const hasBuff = st.activeModifiers.some(m =>
        m.stat === 'attack' && m.targetId === 'u1' && m.remainingUses === 1
    );
    assert(hasBuff, 'Rayo celestial — modifier attack +3 con 1 uso');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['rayo_celestial'], usedRayoCelestial: true },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'rayo_celestial',
        targetId: 'u1',
    });
    assert(st === s, 'Rayo celestial — rechazado si ya usado este turno');
}

{
    let s = makeState();
    s = {
        ...s,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], abilities: ['rayo_celestial'] },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', playerId: 'p1', unitId: 'gen1', abilityId: 'rayo_celestial',
        targetId: 'gen1',
    });
    assert(st !== s, 'Rayo celestial — auto-target permitido (propio aliado)');
}
