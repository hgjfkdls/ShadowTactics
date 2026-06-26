import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { updateUnit, dealDamage } from '../utils';
import { consumeAP } from './helpers';
import { roll2d6 } from '../utils/rng';
import { resolveAttack } from '../combat';
import type { AttackResult } from '../combat';
import { ABILITIES } from '../data/abilities';
import { BASE_STATS } from '../units';
import { isHexOccupied } from '../utils';

function unitHasAbility(unit: Unit, abilityId: string): boolean {
    return unit.abilities?.includes(abilityId) ?? false;
}

function getAbilityRange(unit: Unit, state: GameState): number {
    let r = unit.range;
    const identity = state.players[unit.owner]?.selectedIdentity ?? '';
    if (identity.startsWith('francotirador') && unit.class === 'general') r += 1;
    return r;
}

function canAct(state: GameState, action: GameAction): boolean {
    if (state.gamePhase !== 'GAME') return false;
    if (action.playerId !== state.activePlayer) return false;
    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== action.playerId) return false;
    if (unit.usedCarga && action.abilityId !== 'rayo_celestial' && action.abilityId !== 'a_la_carga' && action.abilityId !== 'torbellino' && action.abilityId !== 'meditacion' && action.abilityId !== 'en_nombre_del_rey') return false;
    if (unit.attackedThisTurn && action.abilityId !== 'patada_acrobatica' && action.abilityId !== 'doble_ataque' && action.abilityId !== 'fuego_cobertura' && action.abilityId !== 'accion_evasiva' && action.abilityId !== 'rayo_celestial' && action.abilityId !== 'a_la_carga' && action.abilityId !== 'torbellino' && action.abilityId !== 'meditacion' && action.abilityId !== 'en_nombre_del_rey') return false;
    if (unit.movedThisTurn && (action.abilityId === 'cabalgar' || action.abilityId === 'cabalgar_2' || action.abilityId === 'carga')) return false;
    return true;
}

export function handleAbility(state: GameState, action: GameAction): GameState {
    if (action.type !== 'USE_ABILITY') return state;
    if (!canAct(state, action)) return state;

    const unit = state.units[action.unitId];
    if (!unitHasAbility(unit, action.abilityId)) return state;

    let cost = ABILITIES[action.abilityId]?.cost ?? 0;
    const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
    if (hasSurcharge) cost += 1;
    const player = state.players[action.playerId];
    if (player.actionPoints < cost) return state;

    let result: GameState;
    switch (action.abilityId) {
        case 'patada_acrobatica': result = handlePatadaAcrobatica(state, unit, action); break;
        case 'fuego_cobertura': result = handleFuegoCobertura(state, unit, action); break;
        case 'accion_evasiva': result = handleAccionEvasiva(state, unit, action); break;
        case 'doble_ataque': result = handleDobleAtaque(state, unit, action); break;
        case 'cabalgar': result = handleCabalgar(state, unit, action); break;
        case 'cabalgar_2': result = handleCabalgar2(state, unit, action); break;
        case 'carga': result = handleCarga(state, unit, action); break;
        case 'ventaja_alcance': result = handleVentajaAlcance(state, unit, action); break;
        case 'rayo_celestial': result = handleRayoCelestial(state, unit, action); break;
        case 'a_la_carga': result = handleALaCarga(state, unit, action); break;
        case 'torbellino': result = handleTorbellino(state, unit, action); break;
        case 'meditacion': result = handleMeditacion(state, unit, action); break;
        case 'posicion_estrategica': result = handlePosicionEstrategica(state, unit, action); break;
        case 'en_nombre_del_rey': result = handleEnNombreDelRey(state, unit, action); break;
        default: return state;
    }

    if (result !== state) {
        result = updateUnit(result, action.unitId, (u) => ({ ...u, performedActionThisTurn: true }));
        if (hasSurcharge) {
            result = consumeAP(result, action.playerId, 1);
            result = updateUnit(result, action.unitId, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 }));
        }
    }

    return result;
}

// ── Patada acrobática ──

function handlePatadaAcrobatica(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId || !action.to) return state;
    if (unit.usedPatadaAcrobatica) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distToEnemy = hexDistance(unit.position, target.position);
    if (distToEnemy !== 1) return state;

    if (playerAP(state, unit.owner) < 1) return state;

    // Validar destino: adyacente al arquero, no adyacente al enemigo, no ocupado
    const distToDest = hexDistance(unit.position, action.to);
    if (distToDest !== 1) return state;
    const destToEnemy = hexDistance(action.to, target.position);
    if (destToEnemy === 0 || destToEnemy === 1) return state;
    if (isHexOccupied(state, action.to)) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = dealDamage(s, target.id, 1);
    s = updateUnit(s, unit.id, (u) => ({
        ...u,
        position: action.to!,
        usedPatadaAcrobatica: true,
        movedThisTurn: true,
    }));
    return s;
}

// ── Posición estratégica (Corazón de Estratega) ──

function handlePosicionEstrategica(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.to) return state;
    if (unit.usedPosicionEstrategica) return state;
    if (unit.class !== 'general') return state;

    const dist = hexDistance(unit.position, action.to);
    if (dist !== 1) return state;
    if (isHexOccupied(state, action.to)) return state;

    // Destino debe estar adyacente a un aliado
    const hasAdjacentAlly = Object.values(state.units)
        .some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(action.to!, u.position) === 1);
    if (!hasAdjacentAlly) return state;

    let s = updateUnit(state, unit.id, (u) => ({
        ...u,
        position: action.to!,
        usedPosicionEstrategica: true,
    }));
    return s;
}

// ── En nombre del rey (Inspiración Real) ──

function handleEnNombreDelRey(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner !== unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 2) return state;
    if (playerAP(state, unit.owner) < 2) return state;

    let s = consumeAP(state, unit.owner, 2);
    s = updateUnit(s, unit.id, (u) => ({ ...u, usedEnNombreDelRey: true }));
    // Objetivo: guardar HP actual, ataque 5, +3 HP temporal
    s = updateUnit(s, target.id, (u) => ({
        ...u,
        attack: 5,
        royalShieldSavedHp: u.hp,
        hp: u.hp + 3,
    }));
    return s;
}

// ── Meditación (Monje Shaolin) ──

function handleMeditacion(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;
    if (playerAP(state, unit.owner) < 2) return state;

    // Rechazar si está a full HP
    const maxHp = BASE_STATS[unit.class].hp;
    if (unit.hp >= maxHp) return state;

    let s = consumeAP(state, unit.owner, 2);
    s = updateUnit(s, unit.id, (u) => ({ ...u, hp: Math.min(u.hp + 3, maxHp) }));
    return s;
}

// ── Fuego de cobertura ──

function handleFuegoCobertura(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    if (unit.usedFuegoCobertura) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > getAbilityRange(unit, state)) return state;

    let s = consumeAP(state, unit.owner, 2);
    s = applyAbilityFlag(s, unit.id, 'usedFuegoCobertura', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        fixedDamage: 2,
    });

    let afterState = storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Fuego de cobertura');

    const dead = afterState.graveyard[target.id];
    if (dead) return afterState;

    if (!result.hit) return afterState;

    return updateUnit(afterState, target.id, (u) => ({ ...u, fuegoCoberturaCharges: 2 }));
}

// ── Acción evasiva ──

function handleAccionEvasiva(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.to) return state;
    if (unit.usedAccionEvasiva) return state;
    if (unit.movedThisTurn) return state;

    const distance = hexDistance(unit.position, action.to);
    if (distance !== 1) return state;

    const hasAdjacentEnemy = Object.values(state.units)
        .filter(u => u.owner !== unit.owner)
        .some(u => hexDistance(unit.position, u.position) === 1);
    if (!hasAdjacentEnemy) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = updateUnit(s, unit.id, (u) => ({
        ...u,
        position: action.to!,
        movedThisTurn: true,
        usedAccionEvasiva: true,
    }));
    return s;
}

// ── Cabalgar ──

function handleCabalgar(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.to) return state;
    if (unit.usedCabalgar) return state;
    if (unit.movedThisTurn) return state;

    const identity = state.players[unit.owner]?.selectedIdentity ?? '';
    const isCaballos = identity.startsWith('caballos_guerra');

    const maxDist = unit.aLaCargaActive ? 3 : 2;
    const distance = hexDistance(unit.position, action.to);
    if (distance !== maxDist) return state;

    const dq = action.to.q - unit.position.q;
    const dr = action.to.r - unit.position.r;

    if (!isCaballos) {
        // Normal: línea recta (6 ejes)
        if (dq !== 0 && dr !== 0 && dq !== -dr) return state;
    }
    // Maniobras acrobáticas: cualquier dirección, pero no atravesar unidades

    // Calcular hexes intermedios
    const steps = maxDist;
    const hexes: { q: number; r: number }[] = [];
    for (let i = 1; i < steps; i++) {
        const fracQ = Math.round((dq * i) / steps);
        const fracR = Math.round((dr * i) / steps);
        // Solo añadir si es distinto del anterior (evitar duplicados en diagonales)
        const prev = hexes[hexes.length - 1];
        if (prev && prev.q === fracQ + unit.position.q && prev.r === fracR + unit.position.r) continue;
        hexes.push({ q: fracQ + unit.position.q, r: fracR + unit.position.r });
    }
    for (const h of hexes) {
        if (isHexOccupied(state, h)) return state;
    }

    const dir = { dq: dq / steps, dr: dr / steps };
    let s = consumeAP(state, unit.owner, 1);
    s = updateUnit(s, unit.id, (u) => ({
        ...u, position: action.to!, usedCabalgar: true,
        cabalgarDir: dir, aLaCargaActive: false,
    }));
    return s;
}

// ── Cabalgar_2 (Caballos de Guerra) ──

function handleCabalgar2(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.path || action.path.length < 2 || action.path.length > 3) return state;
    if (unit.usedCabalgar) return state;
    if (unit.movedThisTurn) return state;

    // Validar que cada paso sea contiguo (distancia 1)
    let pos = unit.position;
    for (const hex of action.path) {
        if (hexDistance(pos, hex) !== 1) return state;
        if (isHexOccupied(state, hex)) return state;
        pos = hex;
    }

    const last = action.path[action.path.length - 1];
    const prev = action.path.length >= 2 ? action.path[action.path.length - 2] : unit.position;
    const dir = { dq: last.q - prev.q, dr: last.r - prev.r };

    let s = state;
    const isALaCarga = action.path.length === 3;
    if (isALaCarga) {
        const extraCost = state.players[unit.owner]?.aLaCargaCost ?? 0;
        if ((state.players[unit.owner]?.actionPoints ?? 0) < 1 + extraCost) return state;
        s = consumeAP(s, unit.owner, 1 + extraCost);
        s = {
            ...s,
            players: {
                ...s.players,
                [unit.owner]: { ...s.players[unit.owner], aLaCargaCost: Math.min(extraCost + 1, 2) },
            },
        };
    } else {
        if ((state.players[unit.owner]?.actionPoints ?? 0) < 1) return state;
        s = consumeAP(s, unit.owner, 1);
    }
    s = updateUnit(s, unit.id, (u) => ({
        ...u, position: last, usedCabalgar: true, cabalgarDir: dir,
    }));
    return s;
}

// ── Carga ──

function handleCarga(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    if (!unit.usedCabalgar) return state;
    if (unit.usedCarga) return state;
    if (unit.movedThisTurn) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    if (!unit.cabalgarDir) return state;
    const expectedQ = unit.position.q + unit.cabalgarDir.dq;
    const expectedR = unit.position.r + unit.cabalgarDir.dr;
    if (target.position.q !== expectedQ || target.position.r !== expectedR) return state;

    const distance = hexDistance(unit.position, target.position);

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedCarga', true);
    s = applyAbilityFlag(s, unit.id, 'attackedThisTurn', true);
    s = applyAbilityFlag(s, unit.id, 'hasCargaBonus', true);

    const result: AttackResult = resolveAttack({
        state: s, unit: s.units[unit.id], target,
        from: s.units[unit.id].position, to: target.position, distance,
        isCarga: true,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Carga');
}


// ── Doble ataque (cavalería/lancero) ──
function handleDobleAtaque(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    if (unit.usedDobleAtaque) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    const rangeBonus = unit.espartanoRangeBonus ? 1 : 0;
    if (distance > unit.range + rangeBonus) return state;

    if (unit.usedVentajaAlcance) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedDobleAtaque', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        damagePenalty: 1,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Doble ataque');
}

// ── Ventaja de alcance ──

function handleVentajaAlcance(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.usedVentajaAlcance) return state;
    if (unit.usedDobleAtaque) return state;
    if (unit.attackedThisTurn) return state;

    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range + 1) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedVentajaAlcance', true);
    s = applyAbilityFlag(s, unit.id, 'attackedThisTurn', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        bonusRange: 1,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Ventaja de alcance');
}

// ── Torbellino (Punta de Lanza) ──

function handleTorbellino(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.usedCarga) return state;
    if (unit.usedTorbellino) return state;

    const targets = Object.values(state.units).filter(u => {
        const d = hexDistance(unit.position, u.position);
        return d === 1 && u.owner !== unit.owner;
    });
    const allies = Object.values(state.units).filter(u => {
        const d = hexDistance(unit.position, u.position);
        return d === 1 && u.owner === unit.owner && u.id !== unit.id;
    });

    if (targets.length === 0 && allies.length === 0) return state;

    const { total, seed: newSeed } = roll2d6(state.rngSeed);
    const hit = total >= 7;

    let s = { ...state, rngSeed: newSeed };
    s = consumeAP(s, unit.owner, 3);
    let hitEnemies = 0, hitAllies = 0;
    if (hit) {
        for (const t of targets) { s = dealDamage(s, t.id, 2); hitEnemies++; }
    } else {
        const allAdj = [...targets, ...allies].filter(u => u.class !== 'general');
        for (const u of allAdj) {
            s = dealDamage(s, u.id, 1);
            if (u.owner !== unit.owner) hitEnemies++; else hitAllies++;
        }
    }
    s = updateUnit(s, unit.id, (u) => ({ ...u, usedTorbellino: true }));
    s = {
        ...s,
        lastAttackResult: {
            attackerId: unit.id,
            targetId: unit.id,
            die1: 0, die2: 0, total,
            difficulty: 7,
            hit,
            damage: hitEnemies,
            counterDamage: hitAllies,
            attackerClass: 'torbellino',
            targetClass: 'torbellino',
            attackName: 'Torbellino',
        },
    };
    return s;
}

// ── A la carga (Caballos de Guerra) ──

function handleALaCarga(state: GameState, unit: Unit, action: GameAction): GameState {
    const currentCost = state.players[unit.owner]?.aLaCargaCost ?? 0;
    const player = state.players[unit.owner];
    if ((player?.actionPoints ?? 0) < currentCost) return state;

    let s = consumeAP(state, unit.owner, currentCost);
    const nextCost = Math.min(currentCost + 1, 2);
    s = {
        ...s,
        players: {
            ...s.players,
            [unit.owner]: { ...s.players[unit.owner], aLaCargaCost: nextCost },
        },
    };
    s = updateUnit(s, unit.id, (u) => ({ ...u, aLaCargaActive: true }));
    return s;
}

// ── Helpers ──

function storeAttackResult(result: AttackResult, attackerId: string, targetId: string, attackerClass: string, targetClass: string, attackName?: string): GameState {
    return {
        ...result.state,
        lastAttackResult: {
            attackerId,
            targetId,
            die1: result.roll.die1,
            die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            hit: result.hit,
            damage: result.damage,
            counterDamage: result.counterDamage,
            attackName: attackName ?? 'Ataque básico',
            attackerClass,
            targetClass,
        },
    };
}

// ── Rayo celestial (Dios del Trueno) ──

function handleRayoCelestial(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner !== unit.owner) return state;
    if (target.range !== 1) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 2) return state;

    const bonus = state.players[unit.owner]?.celestialRayBonus ?? 0;
    if (bonus <= 0) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = updateUnit(s, action.targetId, (u) => ({ ...u, celestialRayDamageBonus: bonus }));
    s = {
        ...s,
        players: {
            ...s.players,
            [unit.owner]: { ...s.players[unit.owner], celestialRayBonus: bonus - 1 },
        },
    };
    return s;
}

function playerAP(state: GameState, playerId: string): number {
    return state.players[playerId]?.actionPoints ?? 0;
}

function applyAbilityFlag(state: GameState, unitId: string, flag: string, value: boolean): GameState {
    return updateUnit(state, unitId, (u) => ({ ...u, [flag]: value }));
}
