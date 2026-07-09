import { assert } from '../../shared';
import { createInitialGameState } from '../../../shared/game/init';
import { applyAction } from '../../../shared/game/reducer';
import type { GameState } from '../../../shared/game/state';
import { ABILITY_CONFIG } from '../../../shared/game/data/ability-config';

console.log('\n--- Identity: Robin Hood ---\n');

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
    const cfg = ABILITY_CONFIG['robar_ricos'];
    assert(cfg !== undefined, 'robar_ricos config exists');
    assert(cfg.id === 'robar_ricos', 'robar_ricos id is correct');
    assert(cfg.type === 'support', 'robar_ricos type is support');
}

{
    let s = makeState();
    s = {
        ...s,
        rngSeed: 42,
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], class: 'archer', range: 3, position: { q: 1, r: 0 }, abilities: [] },
            en: { ...s.units['en'], position: { q: 4, r: 0 } },
        },
    };
    const st = applyAction(s, {
        type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'gen1', targetId: 'en',
    });
    assert(st !== s, 'robin_hood general can attack as archer');
}

{
    let s = makeState();
    s = {
        ...s,
        rngSeed: 42,
        players: {
            p1: { ...s.players['p1'], actionPoints: 10, cardsInHand: [], selectedIdentity: 'robin_hood_1' },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            ...s.units,
            gen1: { ...s.units['gen1'], class: 'general', range: 1, position: { q: 3, r: 0 }, abilities: [], hp: 10, difficulty: 1 },
            en: { ...s.units['en'], position: { q: 4, r: 0 }, hp: 16 },
        },
    };
    const st = applyAction(s, {
        type: 'ATTACK_UNIT', playerId: 'p1', unitId: 'gen1', targetId: 'en',
    });
    assert(st !== s, 'robin_hood attack resolved');
    const hit = st.gameHistory?.some((h: any) => h.type === 'attack' && h.hit);
    assert(hit === true, 'robin_hood attack hits (difficulty 1 guarantees hit)');
    const healed = st.players['p1']?.identityHealedThisTurn === true;
    assert(healed, 'robin_hood robar_ricos heals 1 HP on hit (identityHealedThisTurn flag set)');
}
