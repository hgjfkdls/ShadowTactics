import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import type { GameState } from '../../shared/game/state';
import {
    addModifier, getModifierSum, consumeModifier,
    removeModifier, removePlayerDebuffs, modifierExists,
    getLastDebuffSource, processModifiersAtTurnStart,
} from '../../shared/game/modifiers/engine';

console.log('\n--- Modifier Engine ---\n');

function baseState(): GameState {
    const s = createInitialGameState();
    return {
        ...s,
        gamePhase: 'GAME',
        turnPhase: 'MAIN',
        activePlayer: 'p1',
        turn: 1,
        players: {
            p1: { ...s.players['p1'], actionPoints: 5, cardsInHand: [] },
            p2: { ...s.players['p2'], actionPoints: 5, cardsInHand: [] },
        },
        units: {
            u1: { id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, attack: 3, hp: 12, difficulty: 6, range: 3, movementCost: 2, class: 'archer' },
            u2: { id: 'u2', owner: 'p2', position: { q: 4, r: 0 }, attack: 2, hp: 16, difficulty: 6, range: 1, movementCost: 1, class: 'infantry' },
        },
    };
}

// ── addModifier + getModifierSum ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'attack', 2, 'ADD', 1, 1);
    const sum = getModifierSum(s1, 'p1', 'u1', 'attack');
    assertEqual(sum, 2, 'addModifier ADD — getModifierSum devuelve 2');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', null, 'ap', -1, 'ADD', 1);
    const sum = getModifierSum(s1, 'p1', null, 'ap');
    assertEqual(sum, -1, 'addModifier — player-wide ap modifier suma -1');
    // Player-wide modifiers are included even in unit-specific queries
    const sumUnit = getModifierSum(s1, 'p1', 'u1', 'ap');
    assertEqual(sumUnit, -1, 'addModifier — player-wide modifier visible en unidad específica');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const s2 = addModifier(s1, 'p1', 'u1', 'damage', 2, 'ADD', 1, 1);
    const s3 = addModifier(s2, 'p1', 'u1', 'damage', 3, 'ADD', 1, 1);
    const sum = getModifierSum(s3, 'p1', 'u1', 'damage');
    assertEqual(sum, 6, 'addModifier — múltiples ADD encadenados suman 6');
}

// ── ADD operator ──

// ── SET operator los tests siguen abajo ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'movementCost', 0, 'SET', 1, 1);
    const sum = getModifierSum(s1, 'p1', 'u1', 'movementCost');
    assertEqual(sum, 0, 'addModifier SET 0 — movementCost forzado a 0');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'movementCost', 3, 'SET', 1, 1);
    const sum = getModifierSum(s1, 'p1', 'u1', 'movementCost');
    assertEqual(sum, 3, 'addModifier SET 3 — movementCost forzado a 3');
}

// ── consumeModifier ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 2);
    const s2 = consumeModifier(s1, 'p1', 'damage', 1, 'u1');
    const remaining = getModifierSum(s2, 'p1', 'u1', 'damage');
    assertEqual(remaining, 1, 'consumeModifier — reduce uses de 2 a 1, suma sigue siendo 1');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const s2 = consumeModifier(s1, 'p1', 'damage', 1, 'u1');
    const remaining = getModifierSum(s2, 'p1', 'u1', 'damage');
    assertEqual(remaining, 0, 'consumeModifier — consume último uso, modifier eliminado');
}

// ── removeModifier ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const modId = s1.activeModifiers[0].id;
    const s2 = removeModifier(s1, modId);
    assertEqual(s2.activeModifiers.length, 0, 'removeModifier — elimina por ID');
}

{
    const s = baseState();
    const s2 = removeModifier(s, 'nonexistent');
    assert(s2 !== s, 'removeModifier — ID inexistente crea nuevo estado (filter inmutable)');
    assertEqual(s2.activeModifiers.length, 0, 'removeModifier — ID inexistente, sin cambios efectivos');
}

// ── removePlayerDebuffs ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const s2 = removePlayerDebuffs(s1, 'p1');
    assertEqual(s2.activeModifiers.length, 0, 'removePlayerDebuffs — elimina todos de p1');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const s2 = addModifier(s1, 'p2', 'u2', 'damage', 1, 'ADD', 1, 1);
    const s3 = removePlayerDebuffs(s2, 'p1');
    assertEqual(s3.activeModifiers.length, 1, 'removePlayerDebuffs — solo elimina de p1, p2 permanece');
    assert(s3.activeModifiers[0].sourcePlayerId === 'p2', 'removePlayerDebuffs — p2 modifier intacto');
}

// ── modifierExists ──

{
    const s = baseState();
    assert(!modifierExists(s, 'damage'), 'modifierExists — sin modifier devuelve false');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    assert(modifierExists(s1, 'damage'), 'modifierExists — con modifier devuelve true');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const s2 = consumeModifier(s1, 'p1', 'damage', 1, 'u1');
    assert(!modifierExists(s2, 'damage'), 'modifierExists — tras consumir devuelve false');
}

// ── getLastDebuffSource ──

{
    const s = baseState();
    const source = getLastDebuffSource(s);
    assert(source === null, 'getLastDebuffSource — sin debuffs devuelve null');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'movementCost', 2, 'MUL', 1, 1);
    const source = getLastDebuffSource(s1);
    assertEqual(source, 'p1', 'getLastDebuffSource — detecta movementCost como debuff');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p2', 'u2', 'bloqueo', 1, 'SET', 1, 1);
    const source = getLastDebuffSource(s1);
    assertEqual(source, 'p2', 'getLastDebuffSource — detecta bloqueo como debuff');
}

// ── processModifiersAtTurnStart ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 2, 1);
    const s2 = processModifiersAtTurnStart(s1, 'p1');
    assert(s2 !== s1, 'processModifiersAtTurnStart — estado mutado');
    const remaining = getModifierSum(s2, 'p1', 'u1', 'damage');
    assertEqual(remaining, 1, 'processModifiersAtTurnStart — remainingTurns decrementado de 2 a 1');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 1, 1);
    const s2 = processModifiersAtTurnStart(s1, 'p1');
    const remaining = getModifierSum(s2, 'p1', 'u1', 'damage');
    assertEqual(remaining, 1, 'processModifiersAtTurnStart — remainingTurns 1 → 0, no expira (permanece con remainingTurns 0)');
    const mod = s2.activeModifiers.find(m => m.stat === 'damage');
    assert(mod !== undefined, 'processModifiersAtTurnStart — modifier aún existe con remainingTurns 0');
    assert(mod!.remainingTurns === 0, 'processModifiersAtTurnStart — remainingTurns decrementado a 0');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', 'u1', 'damage', 1, 'ADD', 0, 1);
    const s2 = processModifiersAtTurnStart(s1, 'p1');
    const remaining = getModifierSum(s2, 'p1', 'u1', 'damage');
    assertEqual(remaining, 0, 'processModifiersAtTurnStart — remainingTurns 0 se decrementa a -1 y se elimina');
}

// ── processModifiersAtTurnStart: AP mods ──

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', null, 'ap', -1, 'ADD', 1);
    const s2 = processModifiersAtTurnStart(s1, 'p1');
    assertEqual(s2.players['p1']?.actionPoints, 4, 'processModifiersAtTurnStart — ap -1 aplicado al jugador');
    // After applying, the ap modifier should be cleaned (remainingTurns = 0 after decrement, filtered out)
    const apExists = modifierExists(s2, 'ap');
    assert(!apExists, 'processModifiersAtTurnStart — ap modifier limpiado tras aplicar');
}

{
    const s = baseState();
    const s1 = addModifier(s, 'p1', null, 'ap', 2, 'ADD', 1);
    const s2 = processModifiersAtTurnStart(s1, 'p1');
    assertEqual(s2.players['p1']?.actionPoints, 7, 'processModifiersAtTurnStart — ap +2 aplicado (5 + 2)');
}

// ── processModifiersAtTurnStart: Passive damage (dotOnHit → passiveDamage) ──

{
    let s = baseState();
    s = {
        ...s,
        units: {
            ...s.units,
            u2: { ...s.units['u2'], hp: 10 },
        },
    };
    const s1 = addModifier(s, 'p1', 'u2', 'passiveDamage', 1, 'ADD', 0, 2);
    const s2 = processModifiersAtTurnStart(s1, 'p2');  // u2 belongs to p2
    assert(s2.units['u2']?.hp < 10, 'processModifiersAtTurnStart — passiveDamage inflige daño');
    const remainingHP = s2.units['u2']?.hp ?? 0;
    assertEqual(remainingHP, 9, 'processModifiersAtTurnStart — passiveDamage 1 HP (10 → 9)');
}

{
    let s = baseState();
    s = {
        ...s,
        units: {
            ...s.units,
            u2: { ...s.units['u2'], hp: 5 },
        },
    };
    const s1 = addModifier(s, 'p1', 'u2', 'passiveDamage', 2, 'ADD', 0, 1);
    const s2 = processModifiersAtTurnStart(s1, 'p2');
    assertEqual(s2.units['u2']?.hp, 3, 'processModifiersAtTurnStart — passiveDamage 2 HP (5 → 3)');
}
