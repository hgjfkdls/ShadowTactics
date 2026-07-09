import { assert, assertEqual } from '../shared';
import { hexDistance } from '../../shared/hex';
import { createInitialGameState } from '../../shared/game/init';
import { isPassiveActive, processTurnStartPassives, onHpChange, processOnKillPassives } from '../../shared/game/passive';
import { getModifierSum } from '../../shared/game/modifiers/engine';
import type { GameState, Unit } from '../../shared/game/state';

console.log('\n=== Sistema de Activación / Efectos ===\n');

// ── Helper ──
const u = (id: string, owner: string, q: number, r: number, cls = 'infantry', abilities: string[] = []) => ({
    id, owner, position: { q, r }, attack: 3, hp: 10, difficulty: 6, range: 1,
    movementCost: 2, class: cls as any, abilities, didMovePreviousTurn: undefined,
    timesDamagedThisTurn: undefined, flags: [],
});

function simpleState(): GameState {
    let s = createInitialGameState();
    s = { ...s, gamePhase: 'GAME', turnPhase: 'MAIN', map: { ...s.map, radius: 5 } };
    return s;
}

// ── isPassiveActive: básica ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['resistencia']);
    const state = simpleState();
    // resistencia has activation { turnStart, timesDamagedThisTurn: 0 }
    // Without context (target), isPassiveActive evaluates with context.target = undefined
    // The condition requires turnStart to be evaluated at specific times
    // Without proper timing context, it depends on the condition
    const active = isPassiveActive(unit, 'resistencia', state, { target: unit });
    assert(!!active, 'resistencia se evalua correctamente (con target=self)');
}

// ── isPassiveActive: timesDamagedThisTurn ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['resistencia']);
    unit.timesDamagedThisTurn = 0;
    const state = simpleState();
    const active = isPassiveActive(unit, 'resistencia', state, { target: unit });
    assert(active, 'resistencia activa cuando timesDamagedThisTurn=0');
}

// ── isPassiveActive: timesDamagedThisTurn rechaza ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['resistencia']);
    unit.timesDamagedThisTurn = 1;
    const state = simpleState();
    const active = isPassiveActive(unit, 'resistencia', state, { target: unit });
    assert(!active, 'resistencia inactiva cuando timesDamagedThisTurn=1');
}

// ── isPassiveActive: didMovePreviousTurn ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['linea_defensiva']);
    unit.didMovePreviousTurn = false;
    const state = { ...simpleState(), turn: 2 };
    const active = isPassiveActive(unit, 'linea_defensiva', state, { target: unit });
    // linea_defensiva activation: { didMovePreviousTurn: false }
    // unit.didMovePreviousTurn = false → matches (turn 2+)
    assert(active, 'linea_defensiva activa cuando didMovePreviousTurn=false');
}

// ── isPassiveActive: didMovePreviousTurn rechaza ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['linea_defensiva']);
    unit.didMovePreviousTurn = true;
    const state = simpleState();
    const active = isPassiveActive(unit, 'linea_defensiva', state, { target: unit });
    assert(!active, 'linea_defensiva inactiva cuando didMovePreviousTurn=true');
}

// ── isPassiveActive: targetDidMovePreviousTurn ──
{
    const attacker = u('archer', 'p1', 0, 0, 'archer', ['blanco_facil']);
    const defender = u('def', 'p2', 1, 0);
    defender.didMovePreviousTurn = false;
    const state = simpleState();
    state.turn = 2;
    const active = isPassiveActive(attacker, 'blanco_facil', state, { target: defender });
    // blanco_facil activation: { targetDidMovePreviousTurn: false }
    // defender.didMovePreviousTurn = false → matches
    assert(active, 'blanco_facil activo cuando target no se movió');
}

// ── isPassiveActive: hpMaxPercent ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['furia_berserker']);
    unit.hp = 8; // infantry max HP = 16, 8/16 = 50% ≤ 50%
    const state = simpleState();
    const active = isPassiveActive(unit, 'furia_berserker', state, { target: unit });
    assert(active, 'furia_berserker activo cuando HP=50%');
}

// ── isPassiveActive: hpMaxPercent rechaza ──
{
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['furia_berserker']);
    unit.hp = 13; // infantry max HP = 16, 13/16 = 81% > 50%
    const state = simpleState();
    const active = isPassiveActive(unit, 'furia_berserker', state, { target: unit });
    assert(!active, 'furia_berserker inactivo cuando HP=81%');
}

// ── isPassiveActive: targetHpMaxPercent ──
{
    const attacker = u('cav', 'p1', 0, 0, 'cavalry', ['hostigar']);
    const defender = u('def', 'p2', 1, 0);
    defender.hp = 7; // infantry max HP = 16, 7/16 = 43% ≤ 50%
    const state = simpleState();
    const active = isPassiveActive(attacker, 'hostigar', state, { target: defender });
    assert(active, 'hostigar activo cuando target HP=43%');
}

// ── isPassiveActive: targetIsIsolated ──
{
    const attacker = u('cav', 'p1', 0, 0, 'cavalry', ['acechar']);
    const defender = u('def', 'p2', 1, 0);
    const state = simpleState();
    // No allies adjacent to defender → isolated
    const active = isPassiveActive(attacker, 'acechar', state, { target: defender });
    assert(active, 'acechar activo cuando target aislado');
}

// ── isPassiveActive: targetIsIsolated con aliado ──
{
    const attacker = u('cav', 'p1', 0, 0, 'cavalry', ['acechar']);
    const defender = u('def', 'p2', 1, 0);
    const ally = u('ally', 'p2', 0, 1); // adjacent to defender
    let state = simpleState();
    state = { ...state, units: { att: attacker, def: defender, ally } as any };
    const active = isPassiveActive(attacker, 'acechar', state, { target: defender });
    assert(!active, 'acechar inactivo cuando target tiene aliado adyacente');
}

// ── isPassiveActive: unitClasses ──
{
    const infantry = u('inf', 'p1', 0, 0, 'infantry', ['furia_berserker']);
    infantry.hp = 8; // 8/16 = 50% (meets hpMaxPercent)
    const general = u('gen', 'p1', 0, 1, 'general', ['furia_berserker']);
    general.hp = 10; // 10/20 = 50% (meets hpMaxPercent)
    const cavalry = u('cav', 'p1', 0, 2, 'cavalry', ['furia_berserker']);
    cavalry.hp = 7; // 7/14 = 50% (meets hpMaxPercent but not in unitClasses)
    const state = simpleState();
    // furia_berserker unitClasses: ['infantry', 'general']
    assert(isPassiveActive(infantry, 'furia_berserker', state, { target: infantry }), 'furia_berserker activo para infantry');
    assert(isPassiveActive(general, 'furia_berserker', state, { target: general }), 'furia_berserker activo para general');
    assert(!isPassiveActive(cavalry, 'furia_berserker', state, { target: cavalry }), 'furia_berserker inactivo para cavalry');
}

// ── turnStart: resistencia addModifier ──
{
    let state = simpleState();
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['resistencia']);
    state = { ...state, units: { u1: unit } };
    state = processTurnStartPassives(state, 'p2'); // enemy turn starts
    const defMod = getModifierSum(state, 'p1', 'u1', 'defense');
    assert(defMod === 1, 'turnStart: resistencia añade defense +1 en turno del enemigo');
}

// ── turnStart: solo enemy turn ──
{
    let state = simpleState();
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['resistencia']);
    state = { ...state, units: { u1: unit } };
    state = processTurnStartPassives(state, 'p1'); // own turn starts
    const defMod = getModifierSum(state, 'p1', 'u1', 'defense');
    assert(defMod === 0, 'turnStart: resistencia NO se activa en turno propio (owner:false)');
}

// ── onKill: karma damage ──
{
    let state = simpleState();
    const monk = u('monk', 'p1', 0, 0, 'general', ['karma']);
    const killer = u('killer', 'p2', 0, 1, 'infantry', []);
    const victim = u('victim', 'p1', 1, 0, 'infantry', []);
    victim.hp = 10;
    state = { ...state, units: { monk, killer, victim } as any };
    state = processOnKillPassives(state, 'victim', 'killer');
    const killerAfter = state.units['killer'];
    assert(killerAfter !== undefined, 'killer sigue vivo');
    assert(killerAfter.hp === 8, 'karma: killer recibe 2 daño');
}

// ── onHpChange: furia_berserker se activa al bajar HP ──
{
    let state = simpleState();
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['furia_berserker']);
    unit.hp = 16; // infantry max HP = 16
    state = { ...state, units: { u1: unit } };
    // Reduce HP to 8 (50%)
    state = { ...state, units: { u1: { ...state.units['u1'], hp: 8 } } };
    state = onHpChange(state, 'u1');
    const atkMod = getModifierSum(state, 'p1', 'u1', 'attack');
    assert(atkMod === 1, 'onHpChange: furia_berserker añade attack +1 cuando HP=50%');
}

// ── onHpChange: furia_berserker se desactiva al subir HP ──
{
    let state = simpleState();
    const unit = u('u1', 'p1', 0, 0, 'infantry', ['furia_berserker']);
    unit.hp = 4;
    state = { ...state, units: { u1: unit } };
    state = onHpChange(state, 'u1');
    const atkModBefore = getModifierSum(state, 'p1', 'u1', 'attack');
    assert(atkModBefore === 1, 'furia_berserker activo con HP=4 (25%)');

    // Heal to 12 (75% > 50%)
    state = { ...state, units: { u1: { ...state.units['u1'], hp: 12 } } };
    state = onHpChange(state, 'u1');
    const atkModAfter = getModifierSum(state, 'p1', 'u1', 'attack');
    assert(atkModAfter === 0, 'furia_berserker se desactiva al curar a HP=75%');
}
