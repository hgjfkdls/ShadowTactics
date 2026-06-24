import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { updateUnit } from '../utils';
import { consumeAP } from './helpers';
import { resolveAttack } from '../combat';
import type { AttackResult } from '../combat';
import { ABILITIES } from '../data/abilities';
import { isHexOccupied } from '../utils';

function unitHasAbility(unit: Unit, abilityId: string): boolean {
    return unit.abilities?.includes(abilityId) ?? false;
}

function canAct(state: GameState, action: GameAction): boolean {
    if (state.gamePhase !== 'GAME') return false;
    if (action.playerId !== state.activePlayer) return false;
    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== action.playerId) return false;
    if (unit.usedCarga) return false;
    if (unit.attackedThisTurn && action.abilityId !== 'disparo_rapido' && action.abilityId !== 'doble_ataque') return false;
    if (unit.movedThisTurn && (action.abilityId === 'cabalgar' || action.abilityId === 'carga')) return false;
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
        case 'disparo_rapido': result = handleDisparoRapido(state, unit, action); break;
        case 'fuego_cobertura': result = handleFuegoCobertura(state, unit, action); break;
        case 'accion_evasiva': result = handleAccionEvasiva(state, unit, action); break;
        case 'doble_ataque': result = handleDobleAtaque(state, unit, action); break;
        case 'cabalgar': result = handleCabalgar(state, unit, action); break;
        case 'carga': result = handleCarga(state, unit, action); break;
        case 'ventaja_alcance': result = handleVentajaAlcance(state, unit, action); break;
        case 'avance': result = handleAvance(state, unit, action); break;
        default: return state;
    }

    if (result !== state && hasSurcharge) {
        result = consumeAP(result, action.playerId, 1);
        result = updateUnit(result, action.unitId, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 }));
    }

    return result;
}

// ── Disparo rápido ──

function handleDisparoRapido(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    if (unit.usedDisparoRapido) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 2) return state;

    if (playerAP(state, unit.owner) < 1) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedDisparoRapido', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        extraDifficulty: 1,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class);
}

// ── Fuego de cobertura ──

function handleFuegoCobertura(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    if (unit.usedFuegoCobertura) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range) return state;

    let s = consumeAP(state, unit.owner, 2);
    s = applyAbilityFlag(s, unit.id, 'usedFuegoCobertura', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
    });

    let afterState = storeAttackResult(result, unit.id, target.id, unit.class, target.class);

    const dead = afterState.graveyard[target.id];
    if (dead) return afterState;

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

    const distance = hexDistance(unit.position, action.to);
    if (distance !== 2) return state;

    // Línea recta: solo permite los 6 ejes hexagonales
    const dq = action.to.q - unit.position.q;
    const dr = action.to.r - unit.position.r;
    if (dq !== 0 && dr !== 0 && dq !== -dr) return state;

    // No puede atravesar unidades
    if (dq !== 0 && dr !== 0) {
        const mid1 = { q: unit.position.q + dq, r: unit.position.r };
        const mid2 = { q: unit.position.q, r: unit.position.r + dr };
        if (isHexOccupied(state, mid1) || isHexOccupied(state, mid2)) return state;
    } else {
        const mid = { q: unit.position.q + dq / 2, r: unit.position.r + dr / 2 };
        if (isHexOccupied(state, mid)) return state;
    }

    let s = consumeAP(state, unit.owner, 1);
    s = updateUnit(s, unit.id, (u) => ({ ...u, position: action.to!, usedCabalgar: true }));
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
    const distance = hexDistance(unit.position, target.position);
    if (distance > 1) return state;

    // Debe estar en la misma línea recta de Cabalgar
    // (simplificado: la unidad ya está en posición tras cabalgar)

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedCarga', true);
    s = applyAbilityFlag(s, unit.id, 'attackedThisTurn', true);
    s = applyAbilityFlag(s, unit.id, 'hasCargaBonus', true);

    const result: AttackResult = resolveAttack({
        state: s, unit: s.units[unit.id], target,
        from: s.units[unit.id].position, to: target.position, distance,
        isCarga: true,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class);
}

// ── Doble ataque (cavalería/lancero) ──

function handleDobleAtaque(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    if (unit.usedDobleAtaque) return state;

    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range) return state;

    if (unit.usedVentajaAlcance) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedDobleAtaque', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        damagePenalty: 1,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class);
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

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        bonusRange: 1,
    });
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class);
}

// ── Avance ──

function handleAvance(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range) return state;
    if (unit.usedAvance) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = applyAbilityFlag(s, unit.id, 'usedAvance', true);

    const result: AttackResult = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
    });

    let afterState = storeAttackResult(result, unit.id, target.id, unit.class, target.class);

    const dead = afterState.graveyard[target.id];
    if (!dead) return afterState;

    // Ocupar posición del enemigo eliminado
    return updateUnit(afterState, unit.id, (u) => ({
        ...u, position: target.position, movedThisTurn: false, didMovePreviousTurn: false,
    }));
}

// ── Helpers ──

function storeAttackResult(result: AttackResult, attackerId: string, targetId: string, attackerClass: string, targetClass: string): GameState {
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
            attackerClass,
            targetClass,
        },
    };
}

function playerAP(state: GameState, playerId: string): number {
    return state.players[playerId]?.actionPoints ?? 0;
}

function applyAbilityFlag(state: GameState, unitId: string, flag: string, value: boolean): GameState {
    return updateUnit(state, unitId, (u) => ({ ...u, [flag]: value }));
}
