import type { GameState, Unit } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { updateUnit, dealDamage, isHexOccupied, isWithinBounds } from '../utils';
import { consumeAP } from './helpers';
import { roll2d6 } from '../utils/rng';
import { resolveAttack } from '../combat';
import type { AttackResult } from '../combat';
import { getDifficulty } from '../combat/hit';
import { ABILITIES } from '../data/abilities';
import { BASE_STATS } from '../units';
import { addModifier } from '../modifiers/engine';

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
    if (unit.usedCarga && action.abilityId !== 'rayo_celestial' && action.abilityId !== 'a_la_carga' && action.abilityId !== 'torbellino' && action.abilityId !== 'meditacion' && action.abilityId !== 'en_nombre_del_rey' && action.abilityId !== 'posicion_estrategica' && action.abilityId !== 'desenvainado_veloz' && action.abilityId !== 'sacrificar' && action.abilityId !== 'angel_guardian' && action.abilityId !== 'proteger') return false;
    if (unit.attackedThisTurn && action.abilityId !== 'patada_acrobatica' && action.abilityId !== 'doble_ataque' && action.abilityId !== 'fuego_cobertura' && action.abilityId !== 'accion_evasiva' && action.abilityId !== 'rayo_celestial' && action.abilityId !== 'a_la_carga' && action.abilityId !== 'torbellino' && action.abilityId !== 'meditacion' && action.abilityId !== 'en_nombre_del_rey' && action.abilityId !== 'desenvainado_veloz' && action.abilityId !== 'posicion_estrategica' && action.abilityId !== 'sacrificar' && action.abilityId !== 'angel_guardian' && action.abilityId !== 'proteger') return false;
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
        case 'desenvainado_veloz': result = handleDesenvainadoVeloz(state, unit, action); break;
        case 'sacrificar': result = handleSacrificar(state, unit, action); break;
        case 'angel_guardian': result = handleAngelGuardian(state, unit, action); break;
        case 'proteger': result = handleProteger(state, unit, action); break;
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
    s = dealDamage(s, target.id, 1, unit.id);
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
    const pathStr = `(${unit.position.q},${unit.position.r}) → (${action.to.q},${action.to.r})`;
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'card' as const,
            cardId: 'posicion_estrategica',
            cardName: 'Posición estratégica',
            cardType: 'BUFF' as const,
            details: pathStr,
            paCost: 0,
            sourceClass: unit.class,
            sourceIdentity: 'Corazón de Estratega',
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    return s;
}

// ── En nombre del rey (Inspiración Real) ──

function handleEnNombreDelRey(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner !== unit.owner) return state;
    if (target.id === unit.id) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 2) return state;
    if (playerAP(state, unit.owner) < 2) return state;

    let s = consumeAP(state, unit.owner, 2);
    s = updateUnit(s, unit.id, (u) => ({ ...u, usedEnNombreDelRey: true }));
    s = addModifier(s, unit.owner, action.targetId, 'attack', 2, 'ADD', 0, 1, 'ability', 'En nombre del rey');
    s = updateUnit(s, target.id, (u) => ({
        ...u,
        royalShieldSavedHp: u.hp,
        hp: u.hp + 3,
    }));
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'card' as const,
            cardId: 'en_nombre_del_rey',
            cardName: 'En nombre del rey',
            cardType: 'BUFF' as const,
            targetId: action.targetId,
            targetClass: target.class,
            details: '+2 ataque · Escudo +3 HP',
            paCost: 2,
            sourceClass: unit.class,
            sourceIdentity: 'Inspiración Real',
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
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
    const healed = Math.min(3, maxHp - unit.hp);
    s = updateUnit(s, unit.id, (u) => ({ ...u, hp: Math.min(u.hp + 3, maxHp) }));
    s = { ...s, lastMeditacion: true };
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'card' as const,
            cardId: 'meditacion',
            cardName: 'Meditación',
            cardType: 'BUFF' as const,
            details: `Recuperó ${healed} HP`,
            paCost: 2,
            sourceClass: unit.class,
            sourceIdentity: 'Monje Shaolin',
            healAmount: healed,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    return s;
}

// ── Desenvainado veloz (Samurái) ──

function handleDesenvainadoVeloz(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;
    if (!action.targetId) return state;
    if (unit.usedDesenvainadoVeloz) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > unit.range) return state;

    const result: AttackResult = resolveAttack({
        state, unit, target,
        from: unit.position, to: target.position, distance,
        extraDifficulty: -1,
    });

    const targetDied = !!result.state.graveyard[target.id];
    let s = updateUnit(result.state, unit.id, (u) => ({
        ...u,
        usedDesenvainadoVeloz: !targetDied,
    }));
    s = consumeAP(s, unit.owner, 1);
    s = storeAttackResult(
        { ...result, state: s },
        unit.id, target.id, unit.class, target.class, 'Desenvainado veloz', 1,
    );

    if (result.hit) {
        s = addModifier(s, target.owner, target.id, 'inmovil', 1, 'SET', 0, undefined, undefined, 'ability', 'Desenvainado veloz');

        const dq = target.position.q - unit.position.q;
        const dr = target.position.r - unit.position.r;
        const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
        if (steps > 0) {
            const behind = { q: target.position.q + Math.round(dq / steps), r: target.position.r + Math.round(dr / steps) };
            if (isWithinBounds(behind, s.map.radius) && !isHexOccupied(s, behind)) {
                s = { ...s, pendingOccupation: { unitId: unit.id, position: behind } };
            }
        }
    }

    return s;
}

// ── Sacrificar (Furia del Tirano) ──

function handleSacrificar(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner !== unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 1) return state;

    const maxHp = BASE_STATS[unit.class].hp;
    if (unit.hp >= maxHp) return state;

    let s = consumeAP(state, unit.owner, 1);
    s = dealDamage(s, target.id, 2);

    const allyDied = !!s.graveyard[target.id];
    const healAmount = allyDied ? 5 : 3;

    s = updateUnit(s, unit.id, (u) => ({
        ...u,
        hp: Math.min(u.hp + healAmount, maxHp),
    }));

    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'attack' as const,
            attackerId: unit.id,
            targetId: action.targetId,
            die1: 0, die2: 0, total: 0,
            difficulty: 0, baseDifficulty: 0,
            hit: true,
            damage: 2,
            baseAttack: unit.attack,
            counterDamage: 0,
            attackerClass: unit.class,
            targetClass: target.class,
            attackName: 'Sacrificar',
            modifiers: [`General recupera ${allyDied ? '5' : '3'} HP`],
            paCost: 1,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    return s;
}

// ── Ángel Guardián (Escudo del Comandante) ──

function handleAngelGuardian(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;

    let s = consumeAP(state, unit.owner, 2);
    const allies = Object.values(s.units).filter(u => u.owner === unit.owner && u.class !== 'general');
    const shielded: string[] = [];

    // Escudo +2 HP a todos los aliados (excepto general)
    for (const u of allies) {
        shielded.push(`[${u.id}]${u.class}`);
        s = updateUnit(s, u.id, (unit) => ({
            ...unit,
            auraShield: (unit.auraShield ?? 0) + 2,
        }));
    }

    // Curar 1 HP al aliado (incluye general) que más HP le falte (aleatorio si empate)
    let healedId = '';
    const allUnits = Object.values(s.units).filter(u => u.owner === unit.owner);
    if (allUnits.length > 0) {
        const missing = allUnits.map(u => ({ id: u.id, missing: BASE_STATS[u.class].hp - u.hp }));
        const maxMissing = Math.max(...missing.map(m => m.missing));
        if (maxMissing > 0) {
            const candidates = missing.filter(m => m.missing === maxMissing);
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            const maxHp = BASE_STATS[s.units[chosen.id].class].hp;
            s = updateUnit(s, chosen.id, (u) => ({ ...u, hp: Math.min(u.hp + 1, maxHp) }));
            healedId = chosen.id;
        }
    }

    const healedClass = healedId ? s.units[healedId]?.class ?? '' : '';
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'attack' as const,
            attackerId: unit.id,
            targetId: healedId || '',
            die1: 0, die2: 0, total: 0,
            difficulty: 0, baseDifficulty: 0,
            hit: true,
            damage: 0,
            baseAttack: 0,
            counterDamage: 0,
            attackerClass: unit.class,
            targetClass: healedClass,
            targetKilled: false,
            attackName: 'Ángel Guardián',
            modifiers: [`Escudo +2 HP a ${shielded.length} aliados`],
            paCost: 2,
            shieldedCount: shielded.length,
            healedId,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    return s;
}

// ── Proteger (Escudo del Comandante) ──

function handleProteger(state: GameState, unit: Unit, action: GameAction): GameState {
    if (unit.class !== 'general') return state;
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner !== unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 3) return state;

    let s = addModifier(state, unit.owner, target.id, 'defense', 1, 'ADD', 0, undefined, 'ability', 'Proteger');

    const last = s.activeModifiers[s.activeModifiers.length - 1];
    if (last) {
        s = { ...s, activeModifiers: s.activeModifiers.map((m, i) =>
            i === s.activeModifiers.length - 1 ? { ...m, id: `proteger_${target.id}` } : m
        )};
    }
    s = {
        ...s,
        players: {
            ...s.players,
            [unit.owner]: {
                ...s.players[unit.owner],
                protegerUsedThisTurn: true,
            },
        },
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'attack' as const,
            attackerId: unit.id,
            targetId: action.targetId,
            die1: 0, die2: 0, total: 0,
            difficulty: 0, baseDifficulty: 0,
            hit: true,
            damage: 0,
            baseAttack: 0,
            counterDamage: 0,
            attackerClass: unit.class,
            targetClass: target.class,
            targetKilled: false,
            attackName: 'Proteger',
            modifiers: ['+1 defensa'],
            paCost: 0,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
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

    let afterState = storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Fuego de cobertura', 2);

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
    const pathStr = `(${unit.position.q},${unit.position.r}) → (${action.to.q},${action.to.r})`;
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'move' as const,
            unitId: unit.id,
            unitClass: unit.class,
            from: unit.position,
            to: action.to!,
            path: pathStr,
            cost: 1,
            baseCost: 1,
            modifiers: ['Acción evasiva'],
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
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
    const pathStr = [unit.position, ...hexes, action.to].map((h: any) => `(${h.q},${h.r})`).join(' → ');
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'card' as const,
            cardId: 'cabalgar',
            cardName: 'Cabalgar',
            cardType: 'BUFF' as const,
            targetId: unit.id,
            targetClass: unit.class,
            details: `Avanza ${maxDist} casillas · ${pathStr}`,
            paCost: 1,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
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
    const pathStr = [unit.position, ...action.path].map((h: any) => `(${h.q},${h.r})`).join(' → ');
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'card' as const,
            cardId: isALaCarga ? 'a_la_carga' : 'cabalgar',
            cardName: isALaCarga ? 'A la carga' : 'Cabalgar',
            cardType: 'BUFF' as const,
            targetId: unit.id,
            targetClass: unit.class,
            details: `${isALaCarga ? 'Avanza 3' : 'Avanza 2'} casillas · ${pathStr}`,
            paCost: isALaCarga ? 1 + (state.players[unit.owner]?.aLaCargaCost ?? 0) : 1,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
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
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Carga', 1);
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
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Doble ataque', 1);
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
    return storeAttackResult(result, unit.id, target.id, unit.class, target.class, 'Ventaja de alcance', 1);
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
    const hit = total >= 6;

    let s = { ...state, rngSeed: newSeed };
    s = consumeAP(s, unit.owner, 3);
    let hitEnemies = 0, hitAllies = 0;
    if (hit) {
        for (const t of targets) { s = dealDamage(s, t.id, 2, unit.id); hitEnemies++; }
    } else {
        const allAdj = [...targets, ...allies].filter(u => u.class !== 'general');
        for (const u of allAdj) {
            s = dealDamage(s, u.id, 1, unit.id);
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
            difficulty: 6,
            hit,
            damage: hitEnemies,
            counterDamage: hitAllies,
            attackerClass: 'torbellino',
            targetClass: 'torbellino',
            attackName: 'Torbellino',
        },
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'attack' as const,
            attackerId: unit.id,
            targetId: unit.id,
            die1: 0, die2: 0, total,
            difficulty: 6,
            baseDifficulty: 6,
            hit,
            damage: hitEnemies,
            baseAttack: unit.attack,
            counterDamage: hitAllies,
            attackerClass: 'torbellino',
            targetClass: 'torbellino',
            attackName: 'Torbellino',
            modifiers: [],
            paCost: 3,
        }],
        nextHistoryId: s.nextHistoryId + 1,
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

function buildAttackModifiers(s: GameState, attackerId: string, targetId: string): string[] {
    const mods: string[] = [];
    const attacker = s.units[attackerId];
    const target = s.units[targetId];
    if (!attacker || !target) return mods;

    const abils = attacker.abilities ?? [];

    // Activos (activeModifiers con source)
    for (const m of s.activeModifiers) {
        if (m.remainingTurns < 0) continue;
        if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
        const isAttackerMod = (!m.targetId || m.targetId === attacker.id) && m.sourcePlayerId === attacker.owner;
        const isTargetMod = (m.targetId === target.id || (!m.targetId && m.sourcePlayerId === target.owner));
        if (!isAttackerMod && !isTargetMod) continue;
        if (m.source && m.sourceName) {
            const cat = m.stat === 'attack' ? '[atk] ' : m.stat === 'defense' ? '[def] ' : m.stat === 'difficulty' ? '[diff] ' : '';
            mods.push(`${cat}${m.stat}: ${m.value > 0 ? '+' : ''}${m.value} (${m.source}: ${m.sourceName})`);
        }
    }

    // Anti-caballería
    if (abils.includes('anti_caballeria') && target.class === 'cavalry') {
        mods.push('[atk] Anti-caballería: +1 ataque');
    }

    // Blanco fácil
    if (abils.includes('blanco_facil') && target.didMovePreviousTurn === false) {
        const identity = s.players[attacker.owner]?.selectedIdentity ?? '';
        const bonus = identity.startsWith('francotirador') ? 2 : 1;
        mods.push(`[diff] Blanco fácil: -${bonus} dificultad`);
    }

    // Desenvainado veloz (Samurái)
    if (abils.includes('desenvainado_veloz')) {
        mods.push('[diff] Desenvainado veloz: -1 dificultad');
    }

    // Hostigar (Cazadores)
    const atkIdentity = s.players[attacker.owner]?.selectedIdentity ?? '';
    if (atkIdentity.startsWith('cazadores') && (attacker.class === 'cavalry' || attacker.class === 'general')) {
        const maxHp = BASE_STATS[target.class].hp;
        if (target.hp <= Math.floor(maxHp / 2)) {
            mods.push('[diff] Hostigar: -1 dificultad');
        }
    }

    // Presión
    if (abils.includes('presion') && attacker.lastTargetId === target.id) {
        mods.push('[atk] Presión: +1 ataque');
    }

    // Acechar (Cazadores)
    // (note: atkIdentity already defined above)
    if (atkIdentity.startsWith('cazadores')) {
        const isIsolated = !Object.values(s.units).some(u => u.owner === target.owner && u.id !== target.id && hexDistance(target.position, u.position) === 1);
        if (isIsolated) {
            if (attacker.class === 'general') {
                const bonus = target.class === 'general' ? 1 : 2;
                mods.push(`[atk] Acechar: +${bonus} ataque`);
            } else if (attacker.class === 'cavalry' && target.class !== 'general') {
                mods.push('[atk] Acechar: +1 ataque');
            }
        }
    }

    // Furia berserker (Dios del Trueno)
    if (atkIdentity.startsWith('dios_trueno')) {
        const isInfantryOrGeneral = attacker.class === 'infantry' || attacker.class === 'general';
        if (isInfantryOrGeneral) {
            const maxHp = BASE_STATS[attacker.class].hp;
            if (attacker.hp <= Math.floor(maxHp / 2)) {
                mods.push('[atk] Furia berserker: +1 ataque');
            }
        }
    }

    // Liderar a las tropas (Capitán de la Guardia)
    const liderarBonus = s.players[attacker.owner]?.liderarAtaqueBonus;
    if (liderarBonus && liderarBonus > 0 && (attacker.class === 'infantry' || attacker.class === 'general')) {
        mods.push(`[atk] Liderar a las tropas: +${liderarBonus} ataque`);
    }

    // Plan de batalla (Comandante Supremo)
    const planBonus = s.players[attacker.owner]?.planBatallaBonus;
    if (planBonus && planBonus > 0) mods.push(`[atk] Avanzar: +${planBonus} ataque`);
    const planDefBonus = s.players[target.owner]?.planBatallaDefense;
    if (planDefBonus && planDefBonus > 0) mods.push(`[def] Reagruparse: +${planDefBonus} defensa`);

    // Voz de mando (Comandante Supremo)
    if (attacker.vozDeMandoAttackBonus) mods.push(`[atk] Voz de mando: +${attacker.vozDeMandoAttackBonus} ataque`);
    if (target.vozDeMandoDefenseBonus) mods.push(`[def] Voz de mando: +${target.vozDeMandoDefenseBonus} defensa`);

    // Espartano: Lanza y escudo (+1 defensa)
    if (target?.espartanoDefenseBonus) {
        const tgtIdentity = s.players[target.owner]?.selectedIdentity ?? '';
        if (tgtIdentity.startsWith('espartano')) {
            mods.push('[def] Lanza y escudo: +1 defensa');
        }
    }
    // Espartano: Muro espartano
    if (target && (target.class === 'lancer' || target.class === 'general')) {
        const tgtIdentity = s.players[target.owner]?.selectedIdentity ?? '';
        if (tgtIdentity.startsWith('espartano')) {
            const hasAdjacentLancer = Object.values(s.units).some(u => u.owner === target.owner && (u.class === 'lancer' || u.class === 'general') && u.id !== target.id && hexDistance(target.position, u.position) === 1);
            if (hasAdjacentLancer) {
                mods.push('[def] Muro espartano: +1 defensa');
            }
        }
    }

    // Romper filas
    if (abils.includes('romper_filas')) {
        mods.push('[def] Romper filas: ignora defensas');
    }

    // Formación defensiva (target)
    const tAbils = target.abilities ?? [];
    if (tAbils.includes('formacion_defensiva') && attacker.class === 'cavalry') {
        mods.push('[def] Formación defensiva: anula Carga, +1 contra');
    }

    // Resistencia / Línea defensiva (target)
    if (tAbils.includes('resistencia') && !target.timesDamagedThisTurn) {
        mods.push('[def] Resistencia: +1 defensa');
    }
    if (tAbils.includes('linea_defensiva') && target.didMovePreviousTurn === false) {
        mods.push('[def] Línea defensiva: +1 defensa');
    }

    // Contraataque (Capitán de la Guardia)
    if (target && target.class === 'general') {
        const dist = hexDistance(attacker.position, target.position);
        if (dist === 1) {
            const identity = s.players[target.owner]?.selectedIdentity ?? '';
            if (identity.startsWith('capitan_guardia')) {
                mods.push('[dmg] Contraataque (Capitán de la Guardia): 1 daño');
            }
        }
    }

    return mods;
}

function storeAttackResult(result: AttackResult, attackerId: string, targetId: string, attackerClass: string, targetClass: string, attackName?: string, paCost?: number, paModifiers?: string[]): GameState {
    let s = result.state;
    const mods = buildAttackModifiers(s, attackerId, targetId);
    const atkUnit = s.units[attackerId];
    // Prepend difficulty formula
    if (atkUnit) {
        const target = s.units[targetId];
        const dist = target ? hexDistance(atkUnit.position, target.position) : 0;
        const hasBlancoFacil = (atkUnit.abilities ?? []).includes('blanco_facil');
        const baseDiff = hasBlancoFacil ? 5 : atkUnit.difficulty;
        const raw = hasBlancoFacil ? baseDiff + dist : baseDiff;
        let formula = `base ${baseDiff}`;
        if (hasBlancoFacil) formula += `, distancia +${dist} → ${raw}`;
        if (result.difficulty !== raw) {
            const diff = result.difficulty - raw;
            formula += `, ${diff >= 0 ? '+' : ''}${diff} = ${result.difficulty}`;
        }
        mods.unshift(`Dificultad: ${formula}`);
    }
    s = {
        ...s,
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
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: s.activePlayer,
            type: 'attack' as const,
            attackerId,
            targetId,
            die1: result.roll.die1,
            die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            baseDifficulty: atkUnit && (atkUnit.abilities ?? []).includes('blanco_facil') ? 5 : (atkUnit?.difficulty ?? result.difficulty),
            hit: result.hit,
            damage: result.damage,
            baseAttack: atkUnit ? atkUnit.attack : 0,
            counterDamage: result.counterDamage,
            attackerClass,
            targetClass,
            attackName: attackName ?? 'Ataque básico',
            modifiers: mods,
            paCost,
            paModifiers,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    // Flush karma entry after attack history
    const karmaEntry = result.state.karmaEntryToAppend;
    if (karmaEntry) {
        karmaEntry.actionNumber = s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1;
        karmaEntry.id = `h${s.nextHistoryId}`;
        s = {
            ...s,
            gameHistory: [...s.gameHistory, karmaEntry],
            nextHistoryId: s.nextHistoryId + 1,
            karmaEntryToAppend: undefined,
        };
    }
    return s;
}

// ── Rayo celestial (Dios del Trueno) ──

function handleRayoCelestial(state: GameState, unit: Unit, action: GameAction): GameState {
    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner !== unit.owner) return state;
    const distance = hexDistance(unit.position, target.position);
    if (distance > 2) return state;

    let s = consumeAP(state, unit.owner, 2);
    s = updateUnit(s, unit.id, (u) => ({ ...u, usedRayoCelestial: true }));
    s = addModifier(s, unit.owner, action.targetId, 'attack', 3, 'ADD', 0, 1, 'ability', 'Rayo celestial');
    s = {
        ...s,
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner,
            type: 'card' as const,
            cardId: 'rayo_celestial',
            cardName: 'Rayo celestial',
            cardType: 'BUFF' as const,
            targetId: action.targetId,
            targetClass: target.class,
            details: `+3 ataque al siguiente ataque`,
            paCost: 2,
            sourceClass: unit.class,
            sourceIdentity: 'Dios del Trueno',
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    return s;
}

function playerAP(state: GameState, playerId: string): number {
    return state.players[playerId]?.actionPoints ?? 0;
}

function applyAbilityFlag(state: GameState, unitId: string, flag: string, value: boolean): GameState {
    return updateUnit(state, unitId, (u) => ({ ...u, [flag]: value }));
}
