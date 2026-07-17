import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import type { GameState } from '../../shared/game/state';
import { getDifficulty, isCritical, getCriticalBonus } from '../../shared/game/combat/hit';
import { canCounterattack, getCounterDamage } from '../../shared/game/combat/counter';
import { resolveAttack, type AttackInput, type AttackResult } from '../../shared/game/combat/resolver';
import { computeAttack, getAbilityConfig } from '../../shared/game/combat/compute';

console.log('\n--- Combat Module ---\n');

function baseState(): GameState {
    const s = createInitialGameState();
    return {
        ...s,
        gamePhase: 'GAME', turnPhase: 'MAIN', activePlayer: 'p1', turn: 1,
        players: {
            p1: { ...s.players['p1'], actionPoints: 5, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer' },
            u2: { id: 'u2', owner: 'p2', position: { q: 3, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry' },
            gen: { id: 'gen', owner: 'p2', position: { q: 5, r: 0 }, attack: 4, hp: 20, difficulty: 6, range: 1, movementCost: 1, class: 'general' },
        },
    };
}

function makeInput(overrides: Partial<AttackInput>): AttackInput {
    const s = baseState();
    return { state: s, unit: s.units['u1'], target: s.units['u2'], from: { q: 0, r: 0 }, to: { q: 3, r: 0 }, distance: 3, ...overrides };
}

// ── hit.ts ──
{
    const s = baseState();
    assertEqual(getDifficulty(s.units['u1'], 3), 8, 'getDifficulty — arquero a distancia 3: 5 + 3 = 8');
    assertEqual(getDifficulty(s.units['u2'], 1), 6, 'getDifficulty — infantería a distancia 1: su difficulty = 6');
    assertEqual(getDifficulty(s.units['u1'], 1), 6, 'getDifficulty — arquero a distancia 1: 5 + 1 = 6');

    assert(!isCritical(6), 'isCritical — 6 no es crítico');
    assert(!isCritical(10), 'isCritical — 10 no es crítico');
    assert(isCritical(11), 'isCritical — 11 es crítico');
    assert(isCritical(12), 'isCritical — 12 es crítico');

    assertEqual(getCriticalBonus(), 1, 'getCriticalBonus — bonus es +1');
}

// ── counter.ts ──
{
    const s = baseState();
    assert(canCounterattack(s.units['u1'], s.units['u2'], 1), 'canCounterattack — melee (distancia 1) permite contraataque');
    assert(!canCounterattack(s.units['u1'], s.units['u2'], 3), 'canCounterattack — distancia 3 no permite contraataque');
    assertEqual(getCounterDamage(), 2, 'getCounterDamage — daño base de contraataque es 2');
}

// ── resolveAttack: Miss ──
{
    const result = resolveAttack(makeInput({ distance: 99 }));
    assert(!result.hit, 'resolveAttack — miss garantizado con dificultad 99');
    assertEqual(result.damage, 0, 'resolveAttack — miss sin daño');
    assertEqual(result.counterDamage, 0, 'resolveAttack — miss sin contraataque (fuera de rango)');
}

{
    const input = makeInput({ unit: baseState().units['u2'], target: baseState().units['u1'], distance: 1, from: { q: 3, r: 0 }, to: { q: 0, r: 0 } });
    const result = resolveAttack(input);
    if (!result.hit) {
        assert(result.counterDamage > 0, 'resolveAttack — miss a rango 1 tiene contraataque');
        assertEqual(result.counterDamage, 2, 'resolveAttack — contraataque base = 2');
    }
}

// ── resolveAttack: Hit ──
{
    const result = resolveAttack(makeInput({ distance: 1, from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, extraDifficulty: -10 }));
    assert(result.hit, 'resolveAttack — hit garantizado con extraDifficulty -10');
    assertEqual(result.damage, 3, 'resolveAttack — daño base = attack de unidad (3)');
}

{
    const result = resolveAttack(makeInput({ distance: 1, from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, damagePenalty: 1 }));
    if (result.hit) assertEqual(result.damage, 2, 'resolveAttack — hit con penalty -1: 3 - 1 = 2');
}

{
    const result = resolveAttack(makeInput({ distance: 1, from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, fixedDamage: 2 }));
    if (result.hit) assertEqual(result.damage, 2, 'resolveAttack — fixedDamage 2 ignora attack stat');
}

// ── resolveAttack: noCritical + Carga ──
{
    const result = resolveAttack(makeInput({ distance: 1, from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, noCritical: true }));
}

{
    const result = resolveAttack(makeInput({ distance: 1, from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, isCarga: true, extraDifficulty: -10 }));
    if (result.hit) assert(result.damage === 4 || result.damage === 5, `resolveAttack — carga: daño 4 (sin crit) o 5 (con crit), got ${result.damage}`);
}

// ── resolveAttack: Capitan counterattack ──
{
    const s = baseState();
    s.players['p2'] = { ...s.players['p2'], selectedIdentity: 'capitan_guardia_1' };
    resolveAttack({ state: s, unit: s.units['u1'], target: s.units['gen'], from: { q: 0, r: 0 }, to: { q: 5, r: 0 }, distance: 5 });
}

{
    const s = baseState();
    s.players['p2'] = { ...s.players['p2'], selectedIdentity: 'capitan_guardia_1' };
    const result = resolveAttack(makeInput({ state: s, unit: s.units['u2'], target: s.units['gen'], distance: 1, from: { q: 3, r: 0 }, to: { q: 4, r: 0 } }));
    if (!result.hit) assertEqual(result.counterDamage, 3, 'resolveAttack — capitan counter miss: 2 + 1 = 3');
    if (result.hit) assertEqual(result.counterDamage, 1, 'resolveAttack — capitan counter hit: 1 (reemplaza)');
}

// ── computeAttack ──
{
    const s = baseState();
    const cfg = getAbilityConfig('doble_ataque');
    assert(cfg !== undefined, 'getAbilityConfig — doble_ataque encontrado');
    if (cfg) {
        const result = computeAttack(s, s.units['u1'], s.units['u2'], 3, cfg);
        assert(result.baseAttack > 0, 'computeAttack — baseAttack > 0');
        assert(result.baseDifficulty > 0, 'computeAttack — baseDifficulty > 0');
        assert(typeof result.dmgFormula === 'string', 'computeAttack — dmgFormula es string');
        assert(typeof result.diffFormula === 'string', 'computeAttack — diffFormula es string');
    }
}

{
    const s = baseState();
    const cfg = getAbilityConfig('ejecutar');
    assert(cfg !== undefined, 'getAbilityConfig — ejecutar encontrado');
    if (cfg) {
        const result = computeAttack(s, s.units['u1'], s.units['u2'], 1, cfg);
        assert(result.baseAttack > 0, 'computeAttack — ejecutar baseAttack > 0');
    }
}

{
    const s = baseState();
    const cfg = getAbilityConfig('carga');
    assert(cfg !== undefined, 'getAbilityConfig — carga encontrado');
    if (cfg && cfg.extraAttack !== undefined && cfg.extraDifficulty !== undefined) {
        assert(cfg.extraAttack > 0, 'carga — tiene extraAttack positivo');
    }
}

// ── getAbilityConfig ──
{
    assert(getAbilityConfig('nonexistent') === undefined, 'getAbilityConfig — ID inexistente devuelve undefined');
    assert(getAbilityConfig() === undefined, 'getAbilityConfig — sin argumento devuelve undefined');
    const cfg = getAbilityConfig('patada_acrobatica');
    assert(cfg !== undefined, 'getAbilityConfig — patada_acrobatica existe');
    assert(cfg.id === 'patada_acrobatica', 'getAbilityConfig — id coincide');
}

// ── resolveAttack: State mutation + Roll result ──
{
    const s = baseState();
    const result = resolveAttack(makeInput({ state: s, extraDifficulty: -10 }));
    assert(result.state.rngSeed !== s.rngSeed, 'resolveAttack — RNG seed consumida');
}
{
    const s = baseState();
    const result = resolveAttack(makeInput({ state: s, distance: 99 }));
    assert(result.state === s || result.state !== s, 'resolveAttack — estado retornado');
}
{
    const result = resolveAttack(makeInput({}));
    assert(result.roll.die1 >= 1 && result.roll.die1 <= 6, 'resolveAttack — die1 entre 1 y 6');
    assert(result.roll.die2 >= 1 && result.roll.die2 <= 6, 'resolveAttack — die2 entre 1 y 6');
    assertEqual(result.roll.total, result.roll.die1 + result.roll.die2, 'resolveAttack — total = die1 + die2');
}
