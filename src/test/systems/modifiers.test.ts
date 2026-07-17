import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { addModifier, getModifierSum, consumeModifier, removeModifier } from '../../shared/game/modifiers/engine';
import type { GameState } from '../../shared/game/state';

console.log('\n=== Sistema de Modificadores ===\n');

function simpleState(): GameState {
    let s = createInitialGameState();
    s = { ...s, activeModifiers: [] };
    return s;
}

// ── addModifier ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 1, undefined, 'test', 'Test');
    assert(state.activeModifiers.length === 1, 'addModifier: añade 1 modifier');
    const mod = state.activeModifiers[0];
    assertEqual(mod.stat, 'attack', 'addModifier: stat es attack');
    assertEqual(mod.value, 1, 'addModifier: value es 1');
    assertEqual(mod.targetId, 'u1', 'addModifier: targetId es u1');
}

// ── addModifier: múltiples ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 1);
    state = addModifier(state, 'p1', 'u1', 'defense', 2, 'ADD', 1);
    state = addModifier(state, 'p1', 'u1', 'difficulty', -1, 'ADD', 1);
    assert(state.activeModifiers.length === 3, 'addModifier: 3 modifiers añadidos');
    assertEqual(getModifierSum(state, 'p1', 'u1', 'attack'), 1, 'attack sum = 1');
    assertEqual(getModifierSum(state, 'p1', 'u1', 'defense'), 2, 'defense sum = 2');
    assertEqual(getModifierSum(state, 'p1', 'u1', 'difficulty'), -1, 'difficulty sum = -1');
}

// ── getModifierSum: suma de múltiples ADD ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 1);
    state = addModifier(state, 'p1', 'u1', 'attack', 2, 'ADD', 1);
    assertEqual(getModifierSum(state, 'p1', 'u1', 'attack'), 3, 'ADD suma: 1 + 2 = 3');
}

// ── getModifierSum: SET override ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 1);
    state = addModifier(state, 'p1', 'u1', 'attack', 5, 'SET', 1);
    assertEqual(getModifierSum(state, 'p1', 'u1', 'attack'), 5, 'SET override: devuelve 5');
}

// ── getModifierSum: MUL multiplica ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 3, 'ADD', 1);
    state = addModifier(state, 'p1', 'u1', 'attack', 2, 'MUL', 1);
    assertEqual(getModifierSum(state, 'p1', 'u1', 'attack'), 6, 'MUL: 3 * 2 = 6');
}

// ── getModifierSum: player-wide sin targetUnitId ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', null, 'defense', 1, 'ADD', 1);
    assertEqual(getModifierSum(state, 'p1', null, 'defense'), 1, 'player-wide modifier se suma con playerId y null unit');
    // Unit-specific query: includes player-wide AND unit-specific
    state = addModifier(state, 'p1', 'u1', 'defense', 2, 'ADD', 1);
    assertEqual(getModifierSum(state, 'p1', 'u1', 'defense'), 3, 'unit-specific query: suma player-wide (1) + unit-specific (2) = 3');
}

// ── consumeModifier: reduce remainingUses ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 0, 2, 'test', 'Test');
    assert(state.activeModifiers[0].remainingUses === 2, 'remainingUses inicial = 2');
    state = consumeModifier(state, 'p1', 'attack', 1, 'u1');
    assert(state.activeModifiers.length === 1, 'tras 1 consumo, modifier sigue presente');
    assert(state.activeModifiers[0].remainingUses === 1, 'remainingUses = 1 tras consumo');
    state = consumeModifier(state, 'p1', 'attack', 1, 'u1');
    assert(state.activeModifiers.length === 0, 'tras 2 consumos, modifier eliminado');
}

// ── removeModifier ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 1);
    const modId = state.activeModifiers[0].id;
    state = removeModifier(state, modId);
    assert(state.activeModifiers.length === 0, 'removeModifier: elimina el modifier');
}

// ── addModifier con remainingTurns ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'defense', 1, 'ADD', 2);
    assert(state.activeModifiers[0].remainingTurns === 2, 'remainingTurns = 2');
}

// ── addModifier con source y sourceName ──
{
    let state = simpleState();
    state = addModifier(state, 'p1', 'u1', 'attack', 1, 'ADD', 1, undefined, 'ability', 'fuego_cobertura');
    const mod = state.activeModifiers[0];
    assertEqual(mod.source, 'ability', 'source = ability');
    assertEqual(mod.sourceName, 'fuego_cobertura', 'sourceName = fuego_cobertura');
}
