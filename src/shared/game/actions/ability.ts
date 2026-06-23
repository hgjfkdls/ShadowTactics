import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { updateUnit } from '../utils';
import { consumeAP } from './helpers';
import { resolveAttack } from '../combat';
import { ABILITIES } from '../data/abilities';

function unitHasAbility(unit: Unit, abilityId: string): boolean {
    return unit.abilities?.includes(abilityId) ?? false;
}

function canAct(state: GameState, action: GameAction): boolean {
    if (state.gamePhase !== 'GAME') return false;
    if (action.playerId !== state.activePlayer) return false;
    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== action.playerId) return false;
    if (unit.attackedThisTurn && action.abilityId !== 'disparo_rapido' && action.abilityId !== 'doble_ataque') return false;
    return true;
}

export function handleAbility(state: GameState, action: GameAction): GameState {
    if (action.type !== 'USE_ABILITY') return state;
    if (!canAct(state, action)) return state;

    const unit = state.units[action.unitId];
    if (!unitHasAbility(unit, action.abilityId)) return state;

    const cost = ABILITIES[action.abilityId]?.cost ?? 0;
    const player = state.players[action.playerId];
    if (player.actionPoints < cost) return state;

    switch (action.abilityId) {
        case 'disparo_rapido': return handleDisparoRapido(state, unit, action);
        case 'fuego_cobertura': return handleFuegoCobertura(state, unit, action);
        case 'accion_evasiva': return state;
        case 'doble_ataque': return handleDobleAtaque(state, unit, action);
        case 'cabalgar': return handleCabalgar(state, unit, action);
        case 'carga': return handleCarga(state, unit, action);
        case 'ventaja_alcance': return handleVentajaAlcance(state, unit, action);
        case 'avance': return handleAvance(state, unit, action);
        default: return state;
    }
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

    const { state: afterAttack } = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        extraDifficulty: 1,
    });
    return afterAttack;
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

    const { state: afterAttack } = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
    });

    const dead = afterAttack.graveyard[target.id];
    if (dead) return afterAttack;

    return applyAbilityFlag(afterAttack, target.id, 'hasMovementPenalty', true);
}

// ── Cabalgar ──

function handleCabalgar(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.to) return state;
    if (unit.usedCabalgar) return state;

    const distance = hexDistance(unit.position, action.to);
    if (distance !== 2) return state;

    // Línea recta: q o r iguales, o ambos cambian en la misma dirección
    const dq = action.to.q - unit.position.q;
    const dr = action.to.r - unit.position.r;
    if (Math.abs(dq) > 1 || Math.abs(dr) > 1) {
        if (dq !== 0 && dr !== 0 && dq !== -dr) return state;
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

    const { state: afterAttack } = resolveAttack({
        state: s, unit: s.units[unit.id], target,
        from: s.units[unit.id].position, to: target.position, distance,
        isCarga: true,
    });
    return afterAttack;
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

    const { state: afterAttack } = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        damagePenalty: 1,
    });
    return afterAttack;
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

    const { state: afterAttack } = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
        bonusRange: 1,
    });
    return afterAttack;
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

    const { state: afterAttack } = resolveAttack({
        state: s, unit, target,
        from: unit.position, to: target.position, distance,
    });

    const dead = afterAttack.graveyard[target.id];
    if (!dead) return afterAttack;

    // Ocupar posición del enemigo eliminado
    return updateUnit(afterAttack, unit.id, (u) => ({
        ...u, position: target.position, movedThisTurn: false, didMovePreviousTurn: false,
    }));
}

// ── Helpers ──

function playerAP(state: GameState, playerId: string): number {
    return state.players[playerId]?.actionPoints ?? 0;
}

function applyAbilityFlag(state: GameState, unitId: string, flag: string, value: boolean): GameState {
    return updateUnit(state, unitId, (u) => ({ ...u, [flag]: value }));
}
