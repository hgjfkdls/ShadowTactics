import { createInitialGameState } from '../shared/game/init';
import { resolveAttack } from '../shared/game/combat/resolver';
import { applyDamageAbilities, getUnitModifiers } from '../shared/game/combat/ability-effects';
import { ABILITY_CONFIG } from '../shared/game/data/ability-config';
import { BASE_STATS } from '../shared/game/units';

function u(id: string, owner: string, q: number, r: number, cls: string = 'infantry', abilities: string[] = [], extra: any = {}) {
    const base = (BASE_STATS as any)[cls] ?? BASE_STATS.infantry;
    return { id, owner, position: { q, r }, attack: base.attack, hp: base.hp, difficulty: base.difficulty ?? 6, range: base.range ?? 1, movementCost: base.movementCost ?? 2, class: cls, abilities, didMovePreviousTurn: undefined, timesDamagedThisTurn: undefined, lastTargetId: undefined, lastHex: undefined, flags: [], ...extra };
}

let state = createInitialGameState();
state = { ...state, gamePhase: 'GAME', turnPhase: 'MAIN', activePlayer: 'p1', turn: 3, map: { ...state.map, radius: 5 }, players: { p1: { ...state.players['p1'], actionPoints: 10, cardsInHand: [] }, p2: { ...state.players['p2'], actionPoints: 5, cardsInHand: [] } }, units: { att: u('att', 'p1', 0, 0, 'cavalry', ['carga', 'acechar'], { attack: 3, hp: 14, flags: ['cabalgar'] }), def: u('def', 'p2', 1, 0, 'cavalry', [], { hp: 14 }) } };

const cfg = ABILITY_CONFIG['carga'];
const attackUnit = {
    ...state.units['att'],
    attack: typeof cfg.base.attack === 'number' ? cfg.base.attack : state.units['att'].attack + (cfg.extraAttack ?? 0),
    difficulty: typeof cfg.base.difficulty === 'number' ? cfg.base.difficulty : state.units['att'].difficulty + (cfg.extraDifficulty ?? 0),
};
console.log('attackUnit.attack: ' + attackUnit.attack);
console.log('cfg.extraAttack: ' + cfg.extraAttack);
console.log('cfg.base.attack: ' + cfg.base.attack);
console.log('cfg type: ' + typeof cfg.base.attack);

const mods = getUnitModifiers(state, 'p1', 'att');
console.log('attackMod: ' + mods.attackMod);

// manual combat
let dmg = attackUnit.attack;
console.log('initial dmg: ' + dmg);

const ctx = { state, attacker: attackUnit, defender: state.units['def'], distance: 1, roll: 7, ctx: { configId: 'carga' } };
const combatResult = { difficulty: 0, damage: dmg, attackCost: 0, actionCost: 0, ignoresPassives: false };

applyDamageAbilities(ctx as any, combatResult);
console.log('after applyDamageAbilities: ' + combatResult.damage);
