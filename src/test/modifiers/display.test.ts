import { assert, assertEqual } from '../shared';
import { createInitialGameState } from '../../shared/game/init';
import { buildAttackModifiers, storeAttackResult } from '../../shared/game/actions/ability';
import { addModifier } from '../../shared/game/modifiers/engine';
import type { GameState } from '../../shared/game/state';
import { resolveAttack } from '../../shared/game/combat/resolver';
import { BASE_STATS } from '../../shared/game/units';
import type { AttackResult } from '../../shared/game/combat/resolver';
import { ABILITY_CONFIG } from '../../shared/game/data/ability-config';
import type { AbilityConfig } from '../../shared/game/data/ability-config';

console.log('\n=== Display de Modificadores y Fórmula (config-driven) ===\n');

// ── Helpers ──
const u = (id: string, owner: string, q: number, r: number, cls: keyof typeof BASE_STATS = 'infantry', abilities: string[] = [], extra: any = {}) => {
    const base = BASE_STATS[cls] ?? BASE_STATS.infantry;
    return {
        id, owner, position: { q, r },
        attack: base.attack, hp: base.hp, difficulty: base.difficulty ?? 6,
        range: base.range ?? 1, movementCost: base.movementCost ?? 2,
        class: cls, abilities,
        didMovePreviousTurn: undefined, timesDamagedThisTurn: undefined,
        lastTargetId: undefined,
        lastHex: undefined, flags: [],
        ...extra,
    };
};

function simpleState(): GameState {
    let s = createInitialGameState();
    s = { ...s, gamePhase: 'GAME', turnPhase: 'MAIN', map: { ...s.map, radius: 5 } };
    return s;
}

function stateWithUnits(attacker: any, defender: any, stateMod?: (s: GameState) => GameState): GameState {
    let s = simpleState();
    s = { ...s, units: { att: attacker, def: defender } as any, activePlayer: attacker.owner, nextHistoryId: 1, gameHistory: [] };
    if (stateMod) s = stateMod(s);
    return s;
}

function mods(attacker: any, defender: any, configId = 'ataque_basico', stateMod?: (s: GameState) => GameState): string[] {
    const s = stateWithUnits(attacker, defender, stateMod);
    return buildAttackModifiers(s, 'att', 'def', configId, 0).combat;
}

function manualEntry(attacker: any, defender: any, configId: string, hit: boolean, difficulty: number, damage: number, stateMod?: (s: GameState) => GameState): any {
    let s = stateWithUnits(attacker, defender, stateMod);
    const result: AttackResult = {
        state: s, hit, damage, counterDamage: 0, difficulty,
        roll: { die1: hit ? 4 : 1, die2: hit ? 3 : 1, total: hit ? 7 : 2, seed: 0 },
        configId,
        compute: undefined,
    };
    s = storeAttackResult(result, 'att', 'def', attacker.class, defender.class, `ability.${configId}.name`, 2, [], 0);
    return s.gameHistory[0];
}

function resolveEntry(attacker: any, defender: any, configId: string, stateMod?: (s: GameState) => GameState): any {
    let s = stateWithUnits(attacker, defender, stateMod);
    const result = resolveAttack({
        state: s, unit: s.units['att'], target: s.units['def'],
        from: attacker.position, to: defender.position,
        distance: 1, configId, paCost: 2,
    });
    s = result.state;
    s = storeAttackResult(result, 'att', 'def', attacker.class, defender.class, `ability.${configId}.name`, 2, [], 0);
    return { entry: s.gameHistory[0], result };
}

const hasMod = (combat: string[], id: string) => combat.some(m => m.includes(`[id:${id}]`));
const modById = (combat: string[], id: string) => combat.find(m => m.includes(`[id:${id}]`));
const modValue = (combat: string[], id: string): number => {
    const m = modById(combat, id);
    if (!m) return 0;
    const n = m.match(/([+-]?\d+)\s+\S+/);
    return n ? parseInt(n[1]) : 0;
};
const modCat = (combat: string[], id: string): string => {
    const m = modById(combat, id);
    if (!m) return '';
    const c = m.match(/^\[(\w+)\]/);
    return c ? c[1] : '';
};

// ═══════════════════════════════════════════════
//  HELPERS DE FÓRMULA (según config)
// ═══════════════════════════════════════════════

type EffectSummary = { atk: number; def: number; diff: number; range: number };

function sumEffects(cfg: AbilityConfig | undefined): EffectSummary {
    const r: EffectSummary = { atk: 0, def: 0, diff: 0, range: 0 };
    if (!cfg?.effects) return r;
    for (const e of cfg.effects) {
        const v = e.value ?? 1;
        if (e.type === 'attack') r.atk += v;
        else if (e.type === 'defense') r.def += v;
        else if (e.type === 'difficulty') r.diff += v;
        else if (e.type === 'range') r.range += v;
    }
    return r;
}

function expectedDamage(base: number, atkSum: number, defSum: number): number {
    return Math.max(1, base + atkSum - defSum);
}

function expectedDifficulty(base: number, dist: number, isArcher: boolean, diffSum: number): number {
    const raw = isArcher ? 5 + dist : base;
    return raw + diffSum;
}

// ═══════════════════════════════════════════════
//  PARTE 1 — CADA HABILIDAD INDIVIDUALMENTE
// ═══════════════════════════════════════════════

// Helper: testear una habilidad de tipo whenAttack
function testWhenAttack(
    label: string,
    abilityId: string,
    setup: {
        atkCls: keyof typeof BASE_STATS;
        defCls: keyof typeof BASE_STATS;
        atkAbils?: string[];
        defAbils?: string[];
        atkExtra?: any;
        defExtra?: any;
        stateMod?: (s: GameState) => GameState;
        configId?: string;
    },
) {
    const cfg = ABILITY_CONFIG[abilityId];
    if (!cfg?.effects) {
        console.log(`  SKIP: ${abilityId} — sin effects en config`);
        return;
    }
    const effects = sumEffects(cfg);
    const a = u('att', 'p1', 0, 0, setup.atkCls, setup.atkAbils ?? [abilityId], setup.atkExtra ?? {});
    const d = u('def', 'p2', 1, 0, setup.defCls, setup.defAbils ?? [], setup.defExtra ?? {});
    const c = mods(a, d, setup.configId ?? 'ataque_basico', setup.stateMod);
    const present = hasMod(c, abilityId);
    assert(present, `${abilityId}: aparece en modifiers`);
    if (!present) return;
    const cat = modCat(c, abilityId);
    if (effects.atk !== 0) assert(cat === 'atk', `${abilityId}: categoría [atk] (got [${cat}])`);
    if (effects.def !== 0) assert(cat === 'def', `${abilityId}: categoría [def] (got [${cat}])`);
    if (effects.diff !== 0) assert(cat === 'diff', `${abilityId}: categoría [diff] (got [${cat}])`);
    if (effects.range !== 0) assert(cat === 'range', `${abilityId}: categoría [range] (got [${cat}])`);
    const val = modValue(c, abilityId);
    if (effects.atk !== 0) assertEqual(val, effects.atk, `${abilityId}: valor ataque ${effects.atk}`);
    if (effects.def !== 0) assertEqual(val, effects.def, `${abilityId}: valor defensa ${effects.def}`);
    if (effects.diff !== 0) assertEqual(val, effects.diff, `${abilityId}: valor dificultad ${effects.diff}`);
    if (effects.range !== 0) assertEqual(val, effects.range, `${abilityId}: valor rango ${effects.range}`);
}

// -- whenAttack: presion --
testWhenAttack('presion — ataque a mismo target que turno anterior', 'presion', {
    atkCls: 'infantry', defCls: 'infantry',
    atkExtra: { lastTargetId: 'def' },
});

// -- whenAttack: acechar (target aislado) --
testWhenAttack('acechar — target sin aliados adyacentes', 'acechar', {
    atkCls: 'cavalry', defCls: 'infantry',
});

// -- whenAttack: hostigar (target HP ≤ 50%) --
testWhenAttack('hostigar — target con HP ≤ 50%', 'hostigar', {
    atkCls: 'cavalry', defCls: 'infantry',
    defExtra: { hp: 4 },
});

// -- whenAttack: blanco_facil (target no se movió) --
testWhenAttack('blanco_facil — target no se movió turno anterior', 'blanco_facil', {
    atkCls: 'archer', defCls: 'infantry',
    defExtra: { didMovePreviousTurn: false },
    stateMod: (s) => ({ ...s, turn: 2 }),
});

// -- isBasicAttack: anti_caballeria vs cavalry --
testWhenAttack('anti_caballeria — vs cavalry en ataque básico', 'anti_caballeria', {
    atkCls: 'lancer', defCls: 'cavalry',
});

// -- turnStart: resistencia --
{
    const cfg = ABILITY_CONFIG['resistencia'];
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia'], { timesDamagedThisTurn: 0 });
    const c = mods(a, d, 'ataque_basico', (s) => {
        return addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'resistencia');
    });
    assert(hasMod(c, 'resistencia'), 'resistencia: aparece con timesDamagedThisTurn=0');
    assertEqual(modCat(c, 'resistencia'), 'def', 'resistencia: [def]');
    assertEqual(modValue(c, 'resistencia'), 1, 'resistencia: +1 defensa');
}

// -- turnStart: linea_defensiva --
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', ['linea_defensiva'], { didMovePreviousTurn: false });
    const c = mods(a, d, 'ataque_basico', (s) => {
        return addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, undefined, 'ability', 'linea_defensiva');
    });
    assert(hasMod(c, 'linea_defensiva'), 'linea_defensiva: aparece con didMovePreviousTurn=false');
    assertEqual(modCat(c, 'linea_defensiva'), 'def', 'linea_defensiva: [def]');
    assertEqual(modValue(c, 'linea_defensiva'), 1, 'linea_defensiva: +1 defensa');
}

// -- furia_berserker (via activeModifiers, dios_trueno identity) --
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['furia_berserker'], { hp: 5 });
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = { ...s, players: { ...s.players, p1: { ...s.players['p1'], selectedIdentity: 'dios_trueno_1' } as any } };
        s = addModifier(s, 'p1', 'att', 'attack', 1, 'ADD', undefined, undefined, 'ability', 'furia_berserker');
        return s;
    });
    assert(hasMod(c, 'furia_berserker'), 'furia_berserker: +1 ataque con HP ≤ 50%');
    assertEqual(modCat(c, 'furia_berserker'), 'atk', 'furia_berserker: [atk]');
    assertEqual(modValue(c, 'furia_berserker'), 1, 'furia_berserker: +1 ataque');
}

// -- activeModifiers: plan_batalla (mods, sin resolveAttack) --
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p1', undefined, 'attack', 1, 'ADD', 1, 1, 'ability', 'plan_batalla');
        return s;
    });
    assert(hasMod(c, 'plan_batalla'), 'plan_batalla: +1 ataque vía activeModifiers');
    assertEqual(modCat(c, 'plan_batalla'), 'atk', 'plan_batalla: [atk]');
    assertEqual(modValue(c, 'plan_batalla'), 1, 'plan_batalla: +1 ataque');
}

// plan_batalla via full resolveAttack (player-wide consumido antes de display)
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', [], { hp: 16 });
    let s = stateWithUnits(a, d);
    s = addModifier(s, 'p1', undefined, 'attack', 1, 'ADD', 1, 1, 'ability', 'plan_batalla');
    const result = resolveAttack({
        state: s, unit: s.units['att'], target: s.units['def'],
        from: a.position, to: d.position, distance: 1, configId: 'ataque_basico', paCost: 2,
    });
    const entry = storeAttackResult(result, 'att', 'def', a.class, d.class, 'ability.ataque_basico.name', 2, [], 0).gameHistory[0];
    assert(hasMod(entry.modifiers, 'plan_batalla'), 'plan_batalla visible tras resolveAttack (player-wide consumido)');
    assertEqual(modCat(entry.modifiers, 'plan_batalla'), 'atk', 'plan_batalla: [atk] tras resolveAttack');
}

// -- activeModifiers: lanza_escudo --
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'lanza_escudo');
        return s;
    });
    assert(hasMod(c, 'lanza_escudo'), 'lanza_escudo: +1 defensa vía activeModifiers');
    assertEqual(modCat(c, 'lanza_escudo'), 'def', 'lanza_escudo: [def]');
    assertEqual(modValue(c, 'lanza_escudo'), 1, 'lanza_escudo: +1 defensa');
}

// -- activeModifiers: liderar_tropas --
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p1', 'att', 'attack', 1, 'ADD', 1, 1, 'ability', 'liderar_tropas');
        return s;
    });
    assert(hasMod(c, 'liderar_tropas'), 'liderar_tropas: +1 ataque vía activeModifiers');
    assertEqual(modCat(c, 'liderar_tropas'), 'atk', 'liderar_tropas: [atk]');
    assertEqual(modValue(c, 'liderar_tropas'), 1, 'liderar_tropas: +1 ataque');
}

// liderar_tropas via full resolveAttack + storeAttackResult (simulating real combat flow)
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', [], { hp: 16 });
    let s = stateWithUnits(a, d);
    s = addModifier(s, 'p1', 'att', 'attack', 1, 'ADD', 1, 1, 'ability', 'liderar_tropas');
    const result = resolveAttack({
        state: s, unit: s.units['att'], target: s.units['def'],
        from: a.position, to: d.position, distance: 1, configId: 'ataque_basico', paCost: 2,
    });
    const entry = storeAttackResult(result, 'att', 'def', a.class, d.class, 'ability.ataque_basico.name', 2, [], 0).gameHistory[0];
    assert(hasMod(entry.modifiers, 'liderar_tropas'), 'liderar_tropas visible tras resolveAttack (desde consumedModifiers snapshot)');
    assertEqual(modCat(entry.modifiers, 'liderar_tropas'), 'atk', 'liderar_tropas: [atk] tras resolveAttack');
    assertEqual(modValue(entry.modifiers, 'liderar_tropas'), 1, 'liderar_tropas: +1 ataque tras resolveAttack');
}

// -- romper_filas (mixed) --
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['romper_filas']);
    const d = u('def', 'p2', 1, 0, 'infantry', ['linea_defensiva'], { didMovePreviousTurn: false });
    const c = mods(a, d, 'carga', (s) => {
        return addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, undefined, 'ability', 'linea_defensiva');
    });
    assert(hasMod(c, 'romper_filas'), 'romper_filas: mixed modifier');
    assertEqual(modCat(c, 'romper_filas'), 'mixed', 'romper_filas: [mixed]');
}

// -- formacion_defensiva (mixed) --
{
    const a = u('att', 'p1', 0, 0, 'cavalry', []);
    const d = u('def', 'p2', 1, 0, 'lancer', ['formacion_defensiva']);
    const c = mods(a, d, 'carga');
    assert(hasMod(c, 'formacion_defensiva'), 'formacion_defensiva: mixed modifier');
    assertEqual(modCat(c, 'formacion_defensiva'), 'mixed', 'formacion_defensiva: [mixed]');
}

// -- contraataque (dmg) --
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'general', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = { ...s, players: { ...s.players, p2: { ...s.players['p2'], selectedIdentity: 'capitan_guardia_1' } as any } };
        return s;
    });
    assert(hasMod(c, 'contraataque'), 'contraataque: dmg modifier con capitan_guardia');
    assertEqual(modCat(c, 'contraataque'), 'dmg', 'contraataque: [dmg]');
}

// -- ventaja_alcance (range) --
{
    const a = u('att', 'p1', 0, 0, 'lancer', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ventaja_alcance');
    assert(hasMod(c, 'ventaja_alcance'), 'ventaja_alcance: range modifier');
    assertEqual(modCat(c, 'ventaja_alcance'), 'range', 'ventaja_alcance: [range]');
}

// ═══════════════════════════════════════════════
//  PARTE 2 — CONDICIONES NEGATIVAS (NO aparece)
// ═══════════════════════════════════════════════

// resistencia NO aparece si ya fue dañado
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia'], { timesDamagedThisTurn: 1 });
    assert(!hasMod(mods(a, d), 'resistencia'), 'resistencia NO aparece si timesDamagedThisTurn=1');
}

// linea_defensiva NO aparece si se movió
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', ['linea_defensiva'], { didMovePreviousTurn: true });
    assert(!hasMod(mods(a, d), 'linea_defensiva'), 'linea_defensiva NO aparece si didMovePreviousTurn=true');
}

// presion NO aparece si lastTargetId no coincide
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['presion'], { lastTargetId: 'other' });
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    assert(!hasMod(mods(a, d), 'presion'), 'presion NO aparece si lastTargetId no coincide');
}

// hostigar NO aparece si target HP > 50%
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['hostigar']);
    const d = u('def', 'p2', 1, 0, 'infantry', [], { hp: 13 });
    assert(!hasMod(mods(a, d), 'hostigar'), 'hostigar NO aparece si target HP > 50%');
}

// blanco_facil NO aparece si target se movió
{
    const a = u('att', 'p1', 0, 0, 'archer', ['blanco_facil']);
    const d = u('def', 'p2', 1, 0, 'infantry', [], { didMovePreviousTurn: true });
    assert(!hasMod(mods(a, d), 'blanco_facil'), 'blanco_facil NO aparece si target se movió');
}

// blanco_facil NO aparece en turno 1 (no hay turno anterior)
{
    const a = u('att', 'p1', 0, 0, 'archer', ['blanco_facil']);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => ({ ...s, turn: 1 }));
    assert(!hasMod(c, 'blanco_facil'), 'blanco_facil NO aparece en turno 1');
}

// blanco_facil SI aparece en turno 2+ si target no se movió
{
    const a = u('att', 'p1', 0, 0, 'archer', ['blanco_facil']);
    const d = u('def', 'p2', 1, 0, 'infantry', [], { didMovePreviousTurn: false });
    const c = mods(a, d, 'ataque_basico', (s) => ({ ...s, turn: 2 }));
    assert(hasMod(c, 'blanco_facil'), 'blanco_facil SI aparece en turno 2+ con didMovePreviousTurn=false');
}

// acechar NO aparece si target tiene aliado adyacente
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['acechar']);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const ally = u('ally', 'p2', 0, 1, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => ({ ...s, units: { ...s.units, ally } as any }));
    assert(!hasMod(c, 'acechar'), 'acechar NO aparece si target tiene aliado adyacente');
}

// furia_berserker NO aparece si HP > 50%
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['furia_berserker'], { hp: 12 });
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = { ...s, players: { ...s.players, p1: { ...s.players['p1'], selectedIdentity: 'dios_trueno_1' } as any } };
        return s;
    });
    assert(!hasMod(c, 'furia_berserker'), 'furia_berserker NO aparece si HP > 50%');
}

// anti_caballeria NO aparece vs no-cavalry
{
    const a = u('att', 'p1', 0, 0, 'lancer', ['anti_caballeria']);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    assert(!hasMod(mods(a, d), 'anti_caballeria'), 'anti_caballeria NO aparece vs infantry');
}

// anti_caballeria NO aparece si no es ataque básico
{
    const a = u('att', 'p1', 0, 0, 'lancer', ['anti_caballeria']);
    const d = u('def', 'p2', 1, 0, 'cavalry', []);
    assert(!hasMod(mods(a, d, 'ventaja_alcance'), 'anti_caballeria'), 'anti_caballeria NO aparece si no es ataque básico');
}

// ═══════════════════════════════════════════════
//  PARTE 3 — FÓRMULA: DAÑO = base + atk - def
// ═══════════════════════════════════════════════

// Daño base sin modificadores
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', [], { hp: 16 });
    const { entry } = resolveEntry(a, d, 'ataque_basico');
    const baseAtk = BASE_STATS.infantry.attack;
    assertEqual(entry.baseAttack, baseAtk, `daño base: entry.baseAttack = ${baseAtk}`);
    if (entry.hit) {
        assert(entry.damage >= expectedDamage(entry.baseAttack, 0, 0), `daño hit sin mods: ${entry.damage} >= ${expectedDamage(entry.baseAttack, 0, 0)}`);
    }
}

// Daño con presion (+1 atk)
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['presion'], { attack: 3, lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'infantry', [], { hp: 16 });
    const { entry } = resolveEntry(a, d, 'ataque_basico');
    const expected = expectedDamage(entry.baseAttack, 1, 0);
    if (entry.hit) {
        assert(entry.damage >= expected, `daño con presion: ${entry.damage} >= ${expected}`);
    }
    assert(hasMod(entry.modifiers, 'presion'), 'presion en modifiers del entry');
}

// Daño con presion + resistencia (atk+1, def+1 → neto 0)
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['presion'], { attack: 3, lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia'], { hp: 16, timesDamagedThisTurn: 0 });
    const { entry } = resolveEntry(a, d, 'ataque_basico', (s) => {
        return addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'resistencia');
    });
    if (entry.hit) {
        assert(entry.damage >= 1, 'daño con presion+resistencia >= 1');
    }
    assert(hasMod(entry.modifiers, 'presion'), 'presion presente');
    assert(hasMod(entry.modifiers, 'resistencia'), 'resistencia presente');
}

// Daño con anti_caballeria (+1 atk vs cavalry)
{
    const a = u('att', 'p1', 0, 0, 'lancer', ['anti_caballeria'], { attack: 4 });
    const d = u('def', 'p2', 1, 0, 'cavalry', [], { hp: 16 });
    const { entry } = resolveEntry(a, d, 'ataque_basico');
    if (entry.hit) {
        assert(entry.damage >= 1, 'daño con anti_caballeria >= 1');
    }
    assert(hasMod(entry.modifiers, 'anti_caballeria'), 'anti_caballeria presente');
}

// ═══════════════════════════════════════════════
//  PARTE 4 — FÓRMULA: DIFICULTAD
// ═══════════════════════════════════════════════

// Dificultad base sin mods
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const entry = manualEntry(a, d, 'ataque_basico', true, 7, 2);
    const base = entry.baseDifficulty;
    // Dificultad formula string
    const df = (entry.modifiers ?? []).find((m: string) => m.startsWith('Dificultad:')) ?? '';
    assert(df.includes(`base ${base}`), `diff formula: base ${base}: "${df}"`);
}

// Dificultad con hostigar (-1 diff)
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['hostigar'], { attack: 3 });
    const d = u('def', 'p2', 1, 0, 'infantry', [], { hp: 4 });
    const entry = manualEntry(a, d, 'ataque_basico', true, 6, 2);
    assert(hasMod(entry.modifiers, 'hostigar'), 'hostigar en modifiers');
    // hostigar es [diff], reduce dificultad
    const df = (entry.modifiers ?? []).find((m: string) => m.startsWith('Dificultad:')) ?? '';
    const rawHostigar = modById(entry.modifiers, 'hostigar') ?? '';
    assert(rawHostigar.includes('-1'), 'hostigar: -1 dificultad');
}

// Dificultad archer con blanco_facil (base 5 + distancia)
{
    const a = u('att', 'p1', 0, 0, 'archer', ['blanco_facil'], { attack: 3, difficulty: 6 });
    const d = u('def', 'p2', 1, 0, 'infantry', [], { didMovePreviousTurn: false });
    const entry = manualEntry(a, d, 'ataque_basico', true, 6, 2, (s) => ({ ...s, turn: 2 }));
    assertEqual(entry.baseDifficulty, 5, 'archer+blanco_facil: baseDifficulty=5');
    assert(hasMod(entry.modifiers, 'blanco_facil'), 'blanco_facil en modifiers');
    const df = (entry.modifiers ?? []).find((m: string) => m.startsWith('Dificultad:')) ?? '';
    assert(df.includes('base 5'), `blanco_facil: "base 5" en "${df}"`);
    assert(df.includes('distancia'), `blanco_facil: "distancia" en "${df}"`);
}

// ═══════════════════════════════════════════════
//  PARTE 5 — COMBINACIONES MULTICLASE
// ═══════════════════════════════════════════════

// Infantry ataca a Lancer: presion (atk+1) + linea_defensiva (def+1, resistencia suprimida por prioridad)
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['presion'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'lancer', ['resistencia', 'linea_defensiva'], {
        timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const c = mods(a, d, 'ataque_basico', (s) => {
        return addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, undefined, 'ability', 'linea_defensiva');
    });
    assert(hasMod(c, 'presion'), 'inf vs lancer: presion');
    assert(!hasMod(c, 'resistencia'), 'inf vs lancer: resistencia suprimida (linea_defensiva tiene prioridad)');
    assert(hasMod(c, 'linea_defensiva'), 'inf vs lancer: linea_defensiva');
    assert(c.filter(m => m.startsWith('[atk]')).length === 1, 'inf vs lancer: 1 atk');
    assert(c.filter(m => m.startsWith('[def]')).length === 1, 'inf vs lancer: 1 def (solo linea_defensiva)');
}

// Archer ataca a Cavalry: blanco_facil + anti_caballeria (solo si config-it)
// (archer no tiene anti_caballeria)
{
    const a = u('att', 'p1', 0, 0, 'archer', ['blanco_facil'], { range: 3 });
    const d = u('def', 'p2', 1, 0, 'cavalry', ['resistencia'], { didMovePreviousTurn: false, timesDamagedThisTurn: 0 });
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = { ...s, turn: 2 };
        s = addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'resistencia');
        return s;
    });
    assert(hasMod(c, 'blanco_facil'), 'archer vs cavalry: blanco_facil');
    assert(hasMod(c, 'resistencia'), 'archer vs cavalry: resistencia');
    assert(c.filter(m => m.startsWith('[diff]')).length >= 1, 'archer vs cavalry: diff mods');
    assert(c.filter(m => m.startsWith('[def]')).length >= 1, 'archer vs cavalry: def mods');
}

// Cavalry ataca a Infantry: hostigar + acechar + presion + linea_defensiva (resistencia suprimida)
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['anti_caballeria', 'hostigar', 'acechar', 'presion'], {
        lastTargetId: 'def',
    });
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia', 'linea_defensiva'], {
        hp: 4, timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, undefined, 'ability', 'linea_defensiva');
        return s;
    });
    // anti_caballeria: isBasicAttack + targetClass=cavalry. target es infantry → NO
    assert(!hasMod(c, 'anti_caballeria'), 'cavalry ataca infantry: anti_caballeria NO');
    assert(hasMod(c, 'hostigar'), 'cavalry ataca infantry: hostigar');
    assert(hasMod(c, 'acechar'), 'cavalry ataca infantry: acechar');
    assert(hasMod(c, 'presion'), 'cavalry ataca infantry: presion');
    assert(!hasMod(c, 'resistencia'), 'cavalry ataca infantry: resistencia suprimida (linea_defensiva prioritaria)');
    assert(hasMod(c, 'linea_defensiva'), 'cavalry ataca infantry: linea_defensiva');
    assert(c.filter(m => m.startsWith('[diff]')).length === 1, 'cav vs inf: 1 diff (hostigar)');
    assert(c.filter(m => m.startsWith('[atk]')).length === 2, 'cav vs inf: 2 atk (acechar + presion)');
    assert(c.filter(m => m.startsWith('[def]')).length === 1, 'cav vs inf: 1 def (solo linea_defensiva)');
}

// Lancer ataca a Cavalry: anti_caballeria + presion + linea_defensiva (resistencia suprimida)
{
    const a = u('att', 'p1', 0, 0, 'lancer', ['anti_caballeria', 'presion'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'cavalry', ['resistencia', 'linea_defensiva'], {
        timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, undefined, 'ability', 'linea_defensiva');
        return s;
    });
    assert(hasMod(c, 'anti_caballeria'), 'lancer vs cavalry: anti_caballeria');
    assert(hasMod(c, 'presion'), 'lancer vs cavalry: presion');
    assert(!hasMod(c, 'resistencia'), 'lancer vs cavalry: resistencia suprimida (linea_defensiva prioritaria)');
    assert(hasMod(c, 'linea_defensiva'), 'lancer vs cavalry: linea_defensiva');
    assert(c.filter(m => m.startsWith('[atk]')).length === 2, 'lancer vs cav: 2 atk');
    assert(c.filter(m => m.startsWith('[def]')).length === 1, 'lancer vs cav: 1 def (solo linea_defensiva)');
}

// Cavalry ataca a Cavalry con carga + formacion_defensiva
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['romper_filas']);
    const d = u('def', 'p2', 1, 0, 'lancer', ['formacion_defensiva', 'linea_defensiva'], {
        didMovePreviousTurn: false,
    });
    const c = mods(a, d, 'carga', (s) => {
        s = addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, undefined, 'ability', 'linea_defensiva');
        return s;
    });
    assert(hasMod(c, 'romper_filas'), 'carga: romper_filas presente');
    assert(hasMod(c, 'formacion_defensiva'), 'carga: formacion_defensiva presente');
    assert(hasMod(c, 'linea_defensiva'), 'carga: linea_defensiva presente');
}

// ═══════════════════════════════════════════════
//  PARTE 6 — ENTRY FIELDS CON storeAttackResult
// ═══════════════════════════════════════════════

{
    const a = u('att', 'p1', 0, 0, 'infantry', ['presion'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia'], { timesDamagedThisTurn: 0 });
    const addMods = (s: any) => addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'resistencia');
    const hit = manualEntry(a, d, 'ataque_basico', true, 7, 2, addMods);
    const miss = manualEntry(a, d, 'ataque_basico', false, 7, 0, addMods);
    assertEqual(hit.hit, true, 'hit entry');
    assertEqual(miss.hit, false, 'miss entry');
    assertEqual(hit.damage, 2, 'hit damage = 2');
    assertEqual(miss.damage, 0, 'miss damage = 0');
    assert(hasMod(hit.modifiers, 'presion'), 'hit: presion');
    assert(hasMod(hit.modifiers, 'resistencia'), 'hit: resistencia');
    assert(hasMod(miss.modifiers, 'presion'), 'miss: presion');
    assert(hasMod(miss.modifiers, 'resistencia'), 'miss: resistencia');
}

// ═══════════════════════════════════════════════
//  PARTE 7 — DUPLICADOS Y EXPIRADOS
// ═══════════════════════════════════════════════

{
    const a = u('att', 'p1', 0, 0, 'infantry', ['presion'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p1', 'att', 'attack', 1, 'ADD', 1, 1, 'ability', 'presion');
        return s;
    });
    assert(c.filter(m => m.includes('[id:presion]')).length === 1, 'presion sin duplicar');
}

{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p1', undefined, 'attack', 1, 'ADD', 1, 0, 'ability', 'plan_batalla');
        return s;
    });
    assert(!hasMod(c, 'plan_batalla'), 'plan_batalla expirado no aparece');
}

// ═══════════════════════════════════════════════
//  PARTE 9 — PROPIEDAD DE MODIFICADORES
// ═══════════════════════════════════════════════

// atkmods solo del atacante, defmods solo del defensor
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['hostigar', 'presion', 'acechar'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia', 'linea_defensiva'], {
        hp: 4, timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const c = mods(a, d, 'ataque_basico');
    for (const m of c) {
        if (m.startsWith('[atk]')) {
            const name = m.match(/\[id:([^\]]+)\]/)?.[1] ?? '';
            assert(
                ['presion', 'acechar', 'plan_batalla', 'furia_berserker', 'anti_caballeria', 'liderar_tropas'].includes(name),
                `[atk] "${name}" es del atacante`
            );
        }
        if (m.startsWith('[def]')) {
            const name = m.match(/\[id:([^\]]+)\]/)?.[1] ?? '';
            assert(
                ['resistencia', 'linea_defensiva', 'lanza_escudo', 'guardia_real', 'meditacion'].includes(name),
                `[def] "${name}" es del defensor`
            );
        }
        if (m.startsWith('[diff]')) {
            const name = m.match(/\[id:([^\]]+)\]/)?.[1] ?? '';
            assert(
                ['hostigar', 'blanco_facil'].includes(name),
                `[diff] "${name}" es del atacante`
            );
        }
        if (m.startsWith('[range]')) {
            const name = m.match(/\[id:([^\]]+)\]/)?.[1] ?? '';
            assert(
                ['ventaja_alcance'].includes(name),
                `[range] "${name}" es del atacante`
            );
        }
        if (m.startsWith('[cost]') || m.startsWith('[pa]')) {
            // cost/pa mods son del atacante por defecto (attackCost, actionCost, movementCost)
        }
    }
}

// diffmods con targetId !== attacker no se muestran
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        // difficulty modifier targeting defender — no debe aparecer
        s = addModifier(s, 'p2', 'def', 'difficulty', -1, 'ADD', 1, 1, 'ability', 'blanco_facil');
        return s;
    });
    // Solo debe aparecer si targetId es attacker o undefined
    const diffMods = c.filter(m => m.startsWith('[diff]'));
    assert(diffMods.length === 0, 'diff modifier targeting defender no se muestra');
}

// rangemods solo del atacante
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        // range modifier targeting defender — no debe aparecer
        s = addModifier(s, 'p2', 'def', 'range', 1, 'ADD', 1, 1, 'ability', 'lanza_escudo');
        return s;
    });
    const rangeMods = c.filter(m => m.startsWith('[range]'));
    assert(rangeMods.length === 0, 'range modifier targeting defender no se muestra');
}

// costmods solo del atacante
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        // attackCost del defensor — no debe mostrar
        s = addModifier(s, 'p2', 'def', 'attackCost', 1, 'ADD', 1, 1, 'ability', 'armadura_pesada');
        return s;
    });
    const costMods = c.filter(m => m.startsWith('[cost]'));
    assert(costMods.length === 0, 'cost modifier del defensor no se muestra');
}

// formaciones: formacion_triangulo y formacion_linea como modificadores visibles
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'lancer', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p1', 'att', 'attack', 1, 'ADD', 1, 1, 'ability', 'formacion_triangulo');
        s = addModifier(s, 'p1', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'formacion_linea');
        return s;
    });
    assert(hasMod(c, 'formacion_triangulo'), 'formacion_triangulo: +1 ataque visible');
    assertEqual(modCat(c, 'formacion_triangulo'), 'atk', 'formacion_triangulo: [atk]');
    assert(hasMod(c, 'formacion_linea'), 'formacion_linea: +1 defensa visible');
    assertEqual(modCat(c, 'formacion_linea'), 'def', 'formacion_linea: [def]');
}

// resistencia/linea_defensiva NO aparecen cuando el que ataca tiene la habilidad
{
    const a = u('att', 'p1', 0, 0, 'infantry', ['resistencia', 'linea_defensiva'], {
        timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const d = u('def', 'p2', 1, 0, 'lancer', []);
    const c = mods(a, d, 'ataque_basico');
    assert(!hasMod(c, 'resistencia'), 'resistencia no aparece si el atacante la tiene');
    assert(!hasMod(c, 'linea_defensiva'), 'linea_defensiva no aparece si el atacante la tiene');
    // El defensor (lancer) no tiene ninguna — sin modificadores defensivos
    assert(c.filter(m => m.startsWith('[def]')).length === 0, '0 def mods cuando atacante tiene passivas defensivas');
}

// cartas: modifiers con source='card' y cardId como sourceName
{
    const a = u('att', 'p1', 0, 0, 'infantry', []);
    const d = u('def', 'p2', 1, 0, 'infantry', []);
    const c = mods(a, d, 'ataque_basico', (s) => {
        s = addModifier(s, 'p1', undefined, 'damage', 1, 'ADD', 0, 1, 'card', 'flechas_fuego');
        s = addModifier(s, 'p1', undefined, 'attackCost', 1, 'ADD', 1, 1, 'card', 'miedo');
        s = addModifier(s, 'p2', undefined, 'attack', -1, 'ADD', 1, 1, 'card', 'mantenimiento');
        return s;
    });
    // flechas_fuego: +1 daño, del atacante → visible
    assert(hasMod(c, 'flechas_fuego'), 'carta flechas_fuego: +1 daño visible');
    // miedo: +1 attackCost, del atacante → visible
    assert(hasMod(c, 'miedo'), 'carta miedo: +1 attackCost visible');
    // mantenimiento: -1 ataque, del defensor → NO visible (sourcePlayerId !== attacker)
    assert(!hasMod(c, 'mantenimiento'), 'carta mantenimiento del defensor no visible al atacar');
    assert(c.filter(m => m.startsWith('[dmg]')).length >= 1, 'carta: dmg modifier presente (flechas_fuego)');
    assert(c.filter(m => m.startsWith('[cost]')).length >= 1, 'carta: cost modifier presente (miedo)');
}

function printEntry(label: string, entry: any): void {
    if (!entry) return;
    const df = (entry.modifiers ?? []).find((m: string) => m.startsWith('Dificultad:')) ?? '';
    const raw = (entry.modifiers ?? []).filter((m: string) => !m.startsWith('Dificultad:'));
    console.log(`  [${label}] baseAtk=${entry.baseAttack} baseDiff=${entry.baseDifficulty} diff=${entry.difficulty} dmg=${entry.damage} hit=${entry.hit}`);
    if (df) console.log(`    ${df}`);
    for (let i = 0; i < raw.length; i++) {
        const l = String.fromCharCode(97 + i);
        console.log(`    ${l}) ${raw[i]}`);
    }
}

console.log('\n--- Ejemplos completos ---\n');

// Lancer vs Cavalry (4 mods)
{
    const a = u('att', 'p1', 0, 0, 'lancer', ['anti_caballeria', 'presion'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'cavalry', ['resistencia', 'linea_defensiva'], {
        timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const hit = manualEntry(a, d, 'ataque_basico', true, 7, 3);
    const miss = manualEntry(a, d, 'ataque_basico', false, 7, 0);
    printEntry('Lancer vs Cavalry HIT', hit);
    printEntry('Lancer vs Cavalry MISS', miss);
}

// Archer vs Infantry (blanco_facil + linea_defensiva)
{
    const a = u('att', 'p1', 0, 0, 'archer', ['blanco_facil'], { range: 3 });
    const d = u('def', 'p2', 1, 0, 'infantry', ['linea_defensiva'], { didMovePreviousTurn: false });
    const hit = manualEntry(a, d, 'ataque_basico', true, 6, 3);
    printEntry('Archer vs Infantry HIT', hit);
}

// Cavalry vs Infantry (hostigar + presion + acechar + resistencia)
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['hostigar', 'presion', 'acechar'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'infantry', ['resistencia', 'linea_defensiva'], {
        hp: 4, timesDamagedThisTurn: 0, didMovePreviousTurn: false,
    });
    const hit = manualEntry(a, d, 'ataque_basico', true, 6, 3, (s) => {
        s = addModifier(s, 'p1', undefined, 'attack', 1, 'ADD', 1, 1, 'ability', 'plan_batalla');
        s = addModifier(s, 'p2', 'def', 'defense', 1, 'ADD', 1, 1, 'ability', 'lanza_escudo');
        return s;
    });
    printEntry('Cavalry vs Infantry (7 mods) HIT', hit);
}

// Carga con formacion_defensiva
{
    const a = u('att', 'p1', 0, 0, 'cavalry', ['romper_filas'], { lastTargetId: 'def' });
    const d = u('def', 'p2', 1, 0, 'lancer', ['formacion_defensiva', 'linea_defensiva'], { didMovePreviousTurn: false });
    const c = mods(a, d, 'carga');
    console.log('  [Carga con formacion_defensiva]');
    for (let i = 0; i < c.length; i++) {
        console.log(`    ${String.fromCharCode(97 + i)}) ${c[i]}`);
    }
}
