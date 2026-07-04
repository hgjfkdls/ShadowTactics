import type { GameState, Unit, UnitId, HexCoord } from '@shared';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { getIdentityKey } from '@shared/game/data/identities';
import { ABILITIES } from '@shared/game/data/abilities';
import { hexDistance } from '@shared/hex';
import { isHexOccupied, isWithinBounds } from '@shared/game/utils';
import { generateHexMap } from '@shared/hex';

export type AbilityUI = {
    maxDist?: number;
    range?: number;
    cost?: number;
    moveShape?: 'line' | 'any';
    straightLine?: boolean;
    noCrossUnits?: boolean;
    requiresAdjacentEnemy?: boolean;
    requiresFreeHex?: boolean;
    requiresTarget?: boolean;
    disabled?: boolean;
    disabledReason?: string;
};

export function getAbilityUI(state: GameState, abilityId: string, unit: Unit): AbilityUI {
    const cfg = ABILITY_CONFIG[abilityId];
    const ab = ABILITIES[abilityId];
    const result: AbilityUI = {};

    // Coste base
    result.cost = ab?.cost ?? cfg?.base.paCost ?? 0;

    // Range
    if (cfg?.range === 'unit.range') {
        result.range = unit.range + (cfg.rangeBonus ?? 0);
        const identity = state.players[unit.owner]?.selectedIdentity ?? '';
        // Francotirador: +1 rango al general
        if (identity.startsWith('francotirador') && unit.class === 'general') {
            result.range = (result.range ?? 0) + 1;
        }
        // Espartano: +1 rango
        if (unit.espartanoRangeBonus) {
            result.range = (result.range ?? 0) + 1;
        }
    } else if (cfg?.range) {
        result.range = cfg.range;
    }

    // Move config
    if (cfg?.move) {
        if (typeof cfg.move.maxDist === 'number') {
            result.maxDist = cfg.move.maxDist;
        }
        result.moveShape = cfg.flags?.straightLine ? 'line' : 'any';
        result.straightLine = cfg.flags?.straightLine;
        result.noCrossUnits = cfg.flags?.noCrossUnits;
    }

    // Requisitos específicos por habilidad
    if (abilityId === 'patada_acrobatica') {
        result.requiresAdjacentEnemy = true;
        result.requiresFreeHex = true;
    }
    if (abilityId === 'posicion_estrategica') {
        result.moveShape = 'any';
        result.maxDist = 1;
    }
    if (abilityId === 'cabalgar_2') {
        result.moveShape = 'any';
        result.maxDist = 1;
    }

    result.requiresTarget = cfg?.targetType === 'enemy' || cfg?.targetType === 'ally' || ab?.requiresTarget;

    return result;
}

/**
 * Devuelve los hexes a los que una habilidad de movimiento puede desplazar a la unidad.
 */
export function getAbilityMoveTargets(state: GameState, unitId: UnitId, abilityId: string, targetId?: UnitId): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];
    const ui = getAbilityUI(state, abilityId, unit);
    const hexes = generateHexMap(state.map);

    if (abilityId === 'cabalgar') {
        const maxDist = ui.maxDist ?? 2;
        return hexes.filter(h => {
            const d = hexDistance(unit.position, h);
            if (d > maxDist || d < 2) return false;
            if (isHexOccupied(state, h)) return false;
            const dq = h.q - unit.position.q;
            const dr = h.r - unit.position.r;
            if (dq !== 0 && dr !== 0 && dq !== -dr) return false;
            if (ui.noCrossUnits) {
                for (let i = 1; i < d; i++) {
                    const mid = { q: unit.position.q + Math.round((dq * i) / d), r: unit.position.r + Math.round((dr * i) / d) };
                    if (isHexOccupied(state, mid)) return false;
                }
            }
            return true;
        });
    }

    if (abilityId === 'cabalgar_2') {
        return hexes.filter(h => hexDistance(unit.position, h) === 1 && !isHexOccupied(state, h));
    }

    if (abilityId === 'patada_acrobatica' && targetId) {
        const target = state.units[targetId];
        if (!target) return [];
        return hexes.filter(h => {
            if (isHexOccupied(state, h)) return false;
            if (hexDistance(unit.position, h) !== 1) return false;
            if (hexDistance(h, target.position) <= 1) return false;
            return true;
        });
    }

    if (abilityId === 'posicion_estrategica') {
        return hexes.filter(h => {
            if (hexDistance(unit.position, h) !== 1) return false;
            if (isHexOccupied(state, h)) return false;
            const hasAdjacentAlly = Object.values(state.units)
                .some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(h, u.position) === 1);
            return hasAdjacentAlly;
        });
    }

    return [];
}

/**
 * Devuelve los hexes enemigos que están en rango de una habilidad de ataque.
 */
export function getAbilityTargets(state: GameState, unitId: UnitId, abilityId: string, playerId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];
    const ui = getAbilityUI(state, abilityId, unit);
    const range = ui.range ?? unit.range;

    let targets = Object.values(state.units)
        .filter(u => u.owner !== playerId && hexDistance(unit.position, u.position) <= range);

    // Ejecutar: solo enemigos con ≤2 HP
    if (abilityId === 'ejecutar') {
        targets = targets.filter(u => u.hp <= 2);
    }

    // Ventaja de alcance: solo enemigos a distancia > rango normal (solo el bono)
    if (abilityId === 'ventaja_alcance') {
        targets = targets.filter(u => hexDistance(unit.position, u.position) > unit.range);
    }

    return targets.map(u => u.position);
}

/**
 * Devuelve los hexes aliados válidos como objetivo de una habilidad de soporte.
 */
export function getAllyAbilityTargets(state: GameState, unitId: UnitId, abilityId: string, playerId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];
    const cfg = ABILITY_CONFIG[abilityId];

    if (abilityId === 'rayo_celestial') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && hexDistance(unit.position, u.position) <= 2)
            .map(u => u.position);
    }

    if (abilityId === 'sacrificar') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && hexDistance(unit.position, u.position) <= 1)
            .map(u => u.position);
    }

    if (abilityId === 'en_nombre_del_rey') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && hexDistance(unit.position, u.position) <= 2)
            .map(u => u.position);
    }

    if (abilityId === 'angel_guardian') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && u.class !== 'general')
            .map(u => u.position);
    }

    if (abilityId === 'proteger') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && hexDistance(unit.position, u.position) <= 3)
            .map(u => u.position);
    }

    return [];
}

/**
 * Rango de ataque visual (hexes destacados en verde para movimiento, rojo para ataque, etc.)
 */
export function getRangeHexes(state: GameState, unitId: UnitId | null, pendingAbilityId?: string | null): HexCoord[] {
    if (!unitId) return [];
    const unit = state.units[unitId];
    if (!unit) return [];
    const hexes = generateHexMap(state.map);

    if (pendingAbilityId) {
        const ui = getAbilityUI(state, pendingAbilityId, unit);
        const range = ui.range ?? unit.range;
        let hexesInRange = hexes.filter(h => isWithinBounds(h, state.map.radius) && hexDistance(unit.position, h) <= range);
        // Ventaja de alcance: solo hexes a distancia > rango normal
        if (pendingAbilityId === 'ventaja_alcance') {
            hexesInRange = hexesInRange.filter(h => hexDistance(unit.position, h) > unit.range);
        }
        return hexesInRange;
    }

    return [];
}

/**
 * Evalúa si una habilidad debería aparecer como deshabilitada.
 */
export function isAbilityDisabled(state: GameState, abilityId: string, unit: Unit, playerId: string, ap: number): string | undefined {
    const ui = getAbilityUI(state, abilityId, unit);

    // Verificaciones específicas por habilidad
    if (abilityId === 'patada_acrobatica' && (unit.usedPatadaAcrobatica || !Object.values(state.units).some(u => u.owner !== playerId && hexDistance(unit.position, u.position) === 1))) {
        return l('alert.abilityNotAvailable');
    }
    if (abilityId === 'doble_ataque' && (!unit.attackedThisTurn || unit.usedDobleAtaque)) {
        return l('alert.abilityNotAvailable');
    }
    if (abilityId === 'cabalgar' && (unit.attackedThisTurn || unit.usedCabalgar || unit.movedThisTurn)) {
        return l('alert.abilityNotAvailable');
    }
    if (abilityId === 'cabalgar_2' && (unit.attackedThisTurn || unit.usedCabalgar || unit.movedThisTurn)) {
        return l('alert.abilityNotAvailable');
    }
    if (abilityId === 'carga' && (!unit.usedCabalgar || unit.usedCarga || unit.movedThisTurn || unit.attackedThisTurn)) {
        return l('alert.abilityNotAvailable');
    }
    if (abilityId === 'ventaja_alcance' && (unit.attackedThisTurn || unit.usedVentajaAlcance || unit.usedDobleAtaque)) {
        return l('alert.abilityNotAvailable');
    }
    if (abilityId === 'meditacion' && (unit.hp >= 24 || ap < 2)) {
        return l('alert.fullHPorNoPA');
    }
    if (abilityId === 'en_nombre_del_rey' && unit.usedEnNombreDelRey) {
        return l('alert.alreadyUsedThisTurn');
    }
    if (abilityId === 'desenvainado_veloz' && unit.usedDesenvainadoVeloz) {
        return l('alert.alreadyUsedThisTurn');
    }
    if (abilityId === 'sacrificar' && (unit.hp >= 24 || !Object.values(state.units).some(u => u.owner === playerId && u.id !== unit.id && hexDistance(unit.position, u.position) === 1))) {
        return l('alert.fullHPorNoAllies');
    }
    if (abilityId === 'posicion_estrategica' && unit.usedPosicionEstrategica) {
        return l('alert.alreadyUsedThisTurn');
    }
    if (abilityId === 'torbellino' && unit.usedTorbellino) {
        return l('alert.alreadyUsedThisTurn');
    }
    if (abilityId === 'ejecutar' && (unit.attackedThisTurn || !Object.values(state.units).some(u => u.owner !== playerId && hexDistance(unit.position, u.position) === 1 && u.hp <= 2))) {
        return l('alert.ejecutableUnavailable');
    }

    if ((ui.cost ?? 0) > ap) {
        return l('alert.noPA');
    }

    return undefined;
}
