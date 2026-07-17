import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';
import { ABILITY_CONFIG } from '../../../shared/game/data/ability-config';

console.log('\n--- Identity: Capitán de la Guardia ---\n');

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
            en: { id: 'en', owner: 'p2', position: { q: 8, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            en_adj: { id: 'en_adj', owner: 'p2', position: { q: 1, r: 0 }, attack: 2, hp: 2, difficulty: 6, range: 1, movementCost: 1, class: 'infantry', abilities: [] },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
            gen1: { id: 'gen1', owner: 'p1', position: { q: -2, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general', abilities: [] },
        },
    };
    return s;
}

{
    const cfg = ABILITY_CONFIG['contraataque'];
    assert(!!cfg, 'contraataque config exists');
}

{
    const cfg = ABILITY_CONFIG['liderar_tropas'];
    assert(!!cfg, 'liderar_tropas config exists');
}

{
    let s = makeState();
    s = {
        ...s,
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [], selectedIdentity: 'capitan_guardia_1' },
        },
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], position: { q: 4, r: 0 }, hp: 15 },
            gen: { ...s.units['gen'], position: { q: 5, r: 0 } },
            en: { ...s.units['en'], position: { q: 10, r: 0 } },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', abilityId: 'ataque_basico', playerId: 'p1', unitId: 'gen1', targetId: 'gen',
    });
    assert(st !== s, 'attack resolved (state changed)');
    const gen1HpAfter = st.units['gen1']?.hp ?? 15;
    const counterDmg = 15 - gen1HpAfter;
    // Capitan counterattack: on hit = 1, on miss = 3 (2 normal + 1 capitan)
    assert(counterDmg === 1 || counterDmg === 3,
        `contraataque capitan: 1 (hit) o 3 (miss), got ${counterDmg}`);
}

{
    let s = makeState();
    s = {
        ...s,
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [], selectedIdentity: 'capitan_guardia_1' },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], position: { q: 4, r: 0 } },
            en: { ...s.units['en'], position: { q: 5, r: 0 }, hp: 16 },
            u1: { ...s.units['u1'], class: 'infantry' },
        },
    };
    const st = applyAction(s, {
        type: 'USE_ABILITY', abilityId: 'ataque_basico', playerId: 'p1', unitId: 'gen1', targetId: 'en',
    });
    assert(st !== s, 'liderar_tropas attack resolved');
    const infBonus = st.activeModifiers.find(m => m.stat === 'attack' && m.targetId === 'u1');
    assert(infBonus !== undefined, 'liderar_tropas — infantry (u1) recibe ataque+1');
}
