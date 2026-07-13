import { assert, assertEqual } from '../shared';
import { hexDistance } from '../../shared/hex';
import { createInitialGameState } from '../../shared/game/init';
import { getHexesInRange, filterTargets, getAbilityHighlights } from '../../shared/game/board/selection';
import type { AbilityRange, AbilityTarget } from '../../shared/game/data/ability-config/types';
import type { GameState } from '../../shared/game/state';

console.log('\n=== Sistema Range / Target ===\n');

// ── Helper ──
const u = (id: string, owner: string, q: number, r: number, cls = 'infantry') => ({
    id, owner, position: { q, r }, attack: 3, hp: 10, difficulty: 6, range: 1,
    movementCost: 2, class: cls as any, abilities: [],
});

function simpleState(): GameState {
    let s = createInitialGameState();
    s = { ...s, gamePhase: 'GAME', map: { ...s.map, radius: 5 } };
    return s;
}

// ── resolveValue ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'around', operator: '<=', value: 1, self: false };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.length === 6, 'getHexesInRange around <=1 self:false returns 6 hexes (no origin)');
}

// ── getHexesInRange: operator '=' ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'around', operator: '=', value: 2, self: false };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.every(h => hexDistance({ q: 0, r: 0 }, h) === 2), 'getHexesInRange =2 returns only hexes at distance 2');
    assert(hexes.length === 12, 'getHexesInRange =2 returns 12 hexes');
}

// ── getHexesInRange: around mode ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'around', operator: '<=', value: 2, self: false };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.length === 18, 'getHexesInRange around <=2 self:false returns 18 hexes');
    assert(hexes.every(h => hexDistance({ q: 0, r: 0 }, h) <= 2), 'all hexes within distance 2');
}

// ── getHexesInRange: self:true includes origin in around mode ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'around', operator: '<=', value: 1, self: true };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.length === 7, 'getHexesInRange around <=1 self:true returns 7 hexes (origin + 6 adjacent)');
    assert(hexes.some(h => h.q === 0 && h.r === 0), 'self:true incluye el origen');
}

// ── getHexesInRange: self:true includes origin in star mode ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'star', operator: '=', value: 2, self: true };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.some(h => h.q === 0 && h.r === 0), 'star self:true incluye el origen');
}

// ── getHexesInRange: self:undefined keeps origin in around mode (default) ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'around', operator: '<=', value: 1 };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.some(h => h.q === 0 && h.r === 0), 'self:undefined mantiene el origen en around mode');
    assert(hexes.length === 7, 'self:undefined → 7 hexes (origin + 6)');
}

// ── getHexesInRange: star mode ──
{
    const unit = u('u1', 'p1', 0, 0);
    const range: AbilityRange = { mode: 'star', operator: '<=', value: 2 };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.every(h => {
        const dq = h.q, dr = h.r;
        return (dq === 0 || dr === 0 || dq === -dr) && hexDistance({ q: 0, r: 0 }, h) <= 2;
    }), 'star mode: all hexes are on straight lines');
}

// ── getHexesInRange: front mode with lastHex ──
{
    const unit: any = u('u2', 'p1', 2, 0, 'cavalry');
    unit.lastHex = { q: 0, r: 0 };
    const range: AbilityRange = { mode: 'front', operator: '=', value: 1 };
    const hexes = getHexesInRange({ q: 2, r: 0 }, range, unit, simpleState());
    assert(hexes.length === 1, 'front mode: returns 1 hex at distance 1 in direction');
    assertEqual(JSON.stringify(hexes[0]), JSON.stringify({ q: 3, r: 0 }), 'front mode: hex at (3,0)');
}

// ── getHexesInRange: front mode no lastHex ──
{
    const unit: any = u('u3', 'p1', 0, 0, 'infantry');
    unit.lastHex = undefined;
    const range: AbilityRange = { mode: 'front', operator: '=', value: 1 };
    const hexes = getHexesInRange({ q: 0, r: 0 }, range, unit, simpleState());
    assert(hexes.length === 0, 'front mode: empty when no lastHex');
}

// ── filterTargets: enemies only ──
{
    let state = simpleState();
    state = { ...state, units: { u1: u('u1', 'p1', 0, 0), u2: u('u2', 'p2', 1, 0) } };
    const hexes = [{ q: 1, r: 0 }];
    const target: AbilityTarget = { type: 'attack', allies: false, enemies: true, self: false, empty: false, operator: '<=', value: 1 };
    const result = filterTargets(hexes, target, state.units['u1'], state);
    assert(result.length === 1, 'filterTargets: enemy at (1,0) is valid target');
    assertEqual(result[0].type, 'attack', 'filterTargets: highlight type is attack');
}

// ── filterTargets: empty only ──
{
    let state = simpleState();
    state = { ...state, units: { u1: u('u1', 'p1', 0, 0), u2: u('u2', 'p2', 1, 0) } };
    const hexes = [{ q: 1, r: 0 }, { q: 0, r: 1 }];
    const target: AbilityTarget = { type: 'move', allies: false, enemies: false, self: false, empty: true, operator: '<=', value: 1 };
    const result = filterTargets(hexes, target, state.units['u1'], state);
    assert(result.length === 1, 'filterTargets: only empty hex (0,1) is valid');
    assertEqual(JSON.stringify(result[0].hex), JSON.stringify({ q: 0, r: 1 }), 'filterTargets: valid hex is empty one');
}

// ── filterTargets: hpCondition ──
{
    let state = simpleState();
    const enemy = { ...u('u2', 'p2', 1, 0), hp: 2 };
    state = { ...state, units: { u1: u('u1', 'p1', 0, 0), u2: enemy } };
    const hexes = [{ q: 1, r: 0 }, { q: 0, r: 1 }];
    const target: AbilityTarget = {
        type: 'attack', allies: false, enemies: true, self: false, empty: false,
        operator: '<=', value: 1, hpCondition: { operator: '<=', value: 2 },
    };
    const result = filterTargets(hexes, target, state.units['u1'], state);
    assert(result.length === 1, 'hpCondition <=2: enemy with hp 2 is valid');
}

// ── filterTargets: hpCondition rejects ──
{
    let state = simpleState();
    const enemy = { ...u('u2', 'p2', 1, 0), hp: 5 };
    state = { ...state, units: { u1: u('u1', 'p1', 0, 0), u2: enemy } };
    const hexes = [{ q: 1, r: 0 }];
    const target: AbilityTarget = {
        type: 'attack', allies: false, enemies: true, self: false, empty: false,
        operator: '<=', value: 1, hpCondition: { operator: '<=', value: 2 },
    };
    const result = filterTargets(hexes, target, state.units['u1'], state);
    assert(result.length === 0, 'hpCondition <=2: enemy with hp 5 is rejected');
}

// ── filterTargets: move type checks path ──
{
    let state = simpleState();
    const blocker = u('blocker', 'p1', 1, 0);
    state = { ...state, units: { u1: u('u1', 'p1', 0, 0), blocker, u2: { ...u('u2', 'p2', 2, 0), hp: 2 } } };
    const hexes = [{ q: 2, r: 0 }];
    const target: AbilityTarget = {
        type: 'move', allies: false, enemies: false, self: false, empty: true,
        operator: '<=', value: 2,
    };
    const result = filterTargets(hexes, target, state.units['u1'], state);
    assert(result.length === 0, 'move type: hex at distance 2 with blocker at mid is rejected');
}

// ── getAbilityHighlights: ataque_basico ──
{
    let state = simpleState();
    const archer = { ...u('archer', 'p1', 0, 0, 'archer'), range: 3 };
    const enemy = u('enemy', 'p2', 2, 0);
    state = { ...state, units: { archer, enemy } };
    const highlights = getAbilityHighlights(state, 'archer', 'ataque_basico');
    assert(highlights.length > 0, 'getAbilityHighlights: ataque_basico returns highlights');
    const targets = highlights.filter(h => h.highlight !== 'range');
    assert(targets.length === 1, 'ataque_basico: 1 valid target (enemy at distance 2)');
    assertEqual(targets[0].highlight, 'attack', 'ataque_basico: target highlight is attack');
}

// ── getAbilityHighlights: movement ──
{
    let state = simpleState();
    const unit = u('u1', 'p1', 0, 0);
    state = { ...state, units: { u1: unit } };
    const highlights = getAbilityHighlights(state, 'u1', 'movimiento');
    const targets = highlights.filter(h => h.highlight !== 'range');
    assert(targets.length === 6, 'movimiento: 6 valid empty hexes (adjacent)');
    assert(targets.every(t => t.highlight === 'move'), 'movimiento: all targets are move type');
}

// ── getAbilityHighlights: range bonus ──
{
    let state = simpleState();
    const archer = { ...u('archer', 'p1', 0, 0, 'archer'), range: 2 };
    const enemy = u('enemy', 'p2', 3, 0);
    state = { ...state, units: { archer, enemy } };
    // Without range bonus, ataque_basico range = 2, so enemy at distance 3 is NOT target
    const highlights = getAbilityHighlights(state, 'archer', 'ataque_basico');
    const targets = highlights.filter(h => h.highlight !== 'range');
    assert(targets.length === 0, 'ataque_basico: enemy at distance 3 is NOT target (range=2)');

    // With francotirador identity (archer), range should be +1 => range=3
    state = { ...state, players: { ...state.players, p1: { ...state.players['p1'], selectedIdentity: 'francotirador_1' } } };
    const highlights2 = getAbilityHighlights(state, 'archer', 'ataque_basico');
    const targets2 = highlights2.filter(h => h.highlight !== 'range');
    assert(targets2.length === 1, 'ataque_basico with francotirador: enemy at distance 3 IS target');
}
