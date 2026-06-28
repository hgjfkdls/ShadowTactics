import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState, updateUnit, isWithinBounds } from '../utils';
import { resolveAttack } from '../combat';
import type { AttackResult } from '../combat';
import { getPlayerAP, consumeAP, getAttackCost } from './helpers';
import { consumeModifier } from '../modifiers/engine';
import { applyCostAbilities } from '../combat/ability-effects';
import type { CombatResult } from '../combat/ability-effects';
import { BASE_STATS } from '../units';
import { getIdentityKey } from '../data/identities';

function killed(state: GameState, targetId: string): { dead: boolean; isGeneral: boolean } {
    const dead = !!state.graveyard[targetId];
    return { dead, isGeneral: dead && state.graveyard[targetId].class === 'general' };
}

export function handleAttack(state: GameState, action: GameAction): GameState {
    if (action.type !== 'ATTACK_UNIT') return state;

    const playerId = action.playerId;
    if (playerId !== state.activePlayer) return state;

    const unit = state.units[action.unitId];
    const target = state.units[action.targetId];
    if (!unit || !target) return state;
    if (unit.owner !== playerId) return state;
    if (target.owner === playerId) return state;

    // Confusión (blocked con duración): unidad no puede atacar
    if (state.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === unit.id && m.remainingTurns > 0 && (m.remainingUses === undefined || m.remainingUses > 0))) return state;

    // Ataque extra: permite atacar de nuevo aunque ya atacó
    const ataqueExtraCharges = unit.ataqueExtraCharges ?? 0;
    const ataqueExtra = ataqueExtraCharges > 0;
    if (!ataqueExtra && unit.attackedThisTurn) return state;

    const distance = hexDistance(unit.position, target.position);
    const attackerIdentity = getIdentityKey(state.players[unit.owner]?.selectedIdentity ?? '');
    const isArcher = unit.class === 'archer' || unit.class === 'general';
    const espartanoRangeBonus = unit.espartanoRangeBonus ? 1 : 0;
    const basicRangeBonus = (attackerIdentity === 'francotirador' && isArcher ? 1 : 0) + espartanoRangeBonus;
    if (distance > unit.range + basicRangeBonus) return state;

    const ap = getPlayerAP(state, playerId);
    const costResult: CombatResult = { difficulty: 0, damage: 0, attackCost: 0, ignoresPassives: false };
    applyCostAbilities(
        { state, attacker: unit, defender: target, distance, roll: 0, ctx: {} },
        costResult
    );
    let cost = getAttackCost() + costResult.attackCost;
    if (ataqueExtra) cost = 0;
    const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
    if (hasSurcharge && !ataqueExtra) cost += 1;
    if (ap < cost) return state;

    // Bonos de carta por ataque básico (se consumen al atacar, acierte o no)
    const precisionCharges = unit.precisionCharges ?? 0;
    const precision = precisionCharges > 0;
    let attackUnit = unit;
    let clearFlags: string[] = [];
    if (ataqueExtra) {
        attackUnit = { ...attackUnit, attack: attackUnit.attack + 1, difficulty: attackUnit.difficulty + 2 };
    }
    if (precision) {
        attackUnit = { ...attackUnit, difficulty: attackUnit.difficulty - 2 };
    }
    const result: AttackResult = resolveAttack({
        state,
        unit: attackUnit,
        target,
        from: unit.position,
        to: target.position,
        distance,
        isExtraAttack: ataqueExtra,
    });

    let s = pipeState(
        result.state,
        (s) => consumeAP(s, playerId, cost),
        (s) => updateUnit(s, action.unitId, (u) => {
            let updated = { ...u, attackedThisTurn: true, performedActionThisTurn: true };
            if (ataqueExtra) updated.ataqueExtraCharges = Math.max(0, (updated.ataqueExtraCharges ?? 0) - 1);
            if (precision) updated.precisionCharges = Math.max(0, (updated.precisionCharges ?? 0) - 1);
            return updated;
        }),
        (s) => hasSurcharge && !ataqueExtra ? updateUnit(s, action.unitId, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 })) : s,
    );

    s = consumeModifier(s, playerId, 'attackCost', 1);

    // Robin Hood: primer arquero que acierta cada turno se cura 1 HP
    if (result.hit && result.damage > 0 && !s.players[playerId]?.identityHealedThisTurn) {
        const attacker = s.units[action.unitId];
        if (attacker && (attacker.class === 'archer' || attacker.class === 'general')) {
            const identityKey = getIdentityKey(s.players[playerId]?.selectedIdentity ?? '');
            if (identityKey === 'robin_hood') {
                const maxHp = BASE_STATS[attacker.class].hp;
                if (attacker.hp < maxHp) {
                    s = {
                        ...s,
                        units: {
                            ...s.units,
                            [action.unitId]: { ...attacker, hp: Math.min(attacker.hp + 1, maxHp) },
                        },
                        players: {
                            ...s.players,
                            [playerId]: { ...s.players[playerId], identityHealedThisTurn: true },
                        },
                        lastIdentityHeal: { unitId: action.unitId },
                    };
                }
            }
        }
    }

    const histMods: string[] = [];
    const isArcherFormula = (unit.abilities ?? []).includes('blanco_facil');
    const diffBase = isArcherFormula ? 5 : unit.difficulty;
    const raw = diffBase + distance;
    const diffMods: string[] = [`base ${diffBase}`, `distancia +${distance} → ${raw}`];
    if (result.difficulty !== raw) {
        const diff = result.difficulty - raw;
        if (diff < 0) diffMods.push(`${diff} = ${result.difficulty}`);
        else diffMods.push(`+${diff} = ${result.difficulty}`);
    }
    histMods.push(`Dificultad: ${diffMods.join(', ')}`);
    if (ataqueExtra) histMods.push('Ataque extra: +1 daño, +2 dificultad, 0 PA');
    if (precision) histMods.push('Precisión: -2 dificultad');
    const dmgMods = state.activeModifiers.filter(m => m.stat === 'damage' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0 && !m.targetId && m.sourcePlayerId === unit.owner);
    for (const m of dmgMods) {
        histMods.push(`Daño: ${m.value > 0 ? '+' : ''}${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
    }
    const defDmgMods = state.activeModifiers.filter(m => m.stat === 'damage' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0 && (!m.targetId || m.targetId === target.id) && m.sourcePlayerId === target.owner);
    for (const m of defDmgMods) {
        if (m.value < 0) histMods.push(`Reducción daño: ${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
    }
    const rangeBonus = (attackerIdentity === 'francotirador' && isArcher ? 1 : 0) + (unit.espartanoRangeBonus ? 1 : 0);
    if (rangeBonus > 0) histMods.push(`Bonificación rango: +${rangeBonus}`);
    if (unit.celestialRayDamageBonus) {
        histMods.push(`Rayo celestial: +${unit.celestialRayDamageBonus} daño`);
    }
    // Contraataque (Capitán de la Guardia)
    if (s.units[action.targetId]?.usedCounterattack) {
        const targetIdentity = state.players[target.owner]?.selectedIdentity ?? '';
        if (targetIdentity.startsWith('capitan_guardia')) {
            histMods.push('Contraataque (Capitán de la Guardia): daño reflejado');
        }
    }

    const paMods: string[] = [];
    if (costResult.attackCost > 0) paMods.push(`+${costResult.attackCost} PA (coste ataque)`);
    if (hasSurcharge && !ataqueExtra) paMods.push('+1 PA (fuego cobertura)');
    if (cost === 0 && ataqueExtra) paMods.push('0 PA (ataque extra)');

    s = {
        ...s,
        lastAttackResult: {
            attackerId: action.unitId,
            targetId: action.targetId,
            die1: result.roll.die1,
            die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            hit: result.hit,
            damage: result.damage,
            counterDamage: result.counterDamage,
            attackerClass: unit.class,
            targetClass: target.class,
            targetKilled: killed(s, action.targetId).dead,
            attackName: 'Ataque básico',
        },
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId,
            type: 'attack' as const,
            paCost: cost,
            paModifiers: paMods,
            attackerId: action.unitId,
            targetId: action.targetId,
            die1: result.roll.die1,
            die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            baseDifficulty: (unit.abilities ?? []).includes('blanco_facil') ? 5 : unit.difficulty,
            hit: result.hit,
            damage: result.damage,
            baseAttack: unit.attack,
            counterDamage: result.counterDamage,
            attackerClass: unit.class,
            targetClass: target.class,
            targetKilled: killed(s, action.targetId).dead,
            attackName: `Ataque básico${ataqueExtra ? ' (extra)' : ''}`,
            modifiers: histMods,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };

    // Proyección (Punta de Lanza): primer ataque de lancero hace 1 daño a 2 hex detrás
    if (result.hit && unit.proyeccionActive && (unit.class === 'general' || unit.class === 'lancer')) {
        const dq = target.position.q - unit.position.q;
        const dr = target.position.r - unit.position.r;
        const dist = hexDistance(unit.position, target.position);
        if (dist > 0) {
            const stepQ = Math.round(dq / dist);
            const stepR = Math.round(dr / dist);
            const behind = [
                { q: target.position.q + stepQ, r: target.position.r + stepR },
                { q: target.position.q + stepQ * 2, r: target.position.r + stepR * 2 },
            ].filter(h => isWithinBounds(h, s.map.radius));
            for (const h of behind) {
                const hit = Object.values(s.units).find(u => u.position.q === h.q && u.position.r === h.r);
                if (hit && hit.owner !== playerId) {
                    s = dealDamage(s, hit.id, 1);
                }
            }
        }
        // Limpiar proyección de todos los lanceros
        let uu = { ...s.units };
        for (const id of Object.keys(uu)) {
            if (uu[id].owner === playerId && uu[id].class === 'lancer') {
                uu[id] = { ...uu[id], proyeccionActive: false };
            }
        }
        s = { ...s, units: uu };
    }

    const { dead, isGeneral } = killed(s, action.targetId);
    if (dead && !isGeneral) {
        // Liderar a las tropas (Capitán de la Guardia)
        if (!s.players[playerId]?.nextTurnGlobalPresion && s.players[playerId]?.selectedIdentity?.startsWith('capitan_guardia')) {
            const isGeneral = unit.class === 'general';
            const isInfantry = unit.class === 'infantry';
            const generalUnit = Object.values(s.units).find(u => u.owner === playerId && u.class === 'general');
            const nearGeneral = isInfantry && generalUnit && hexDistance(unit.position, generalUnit.position) <= 2;
            if (isGeneral || nearGeneral) {
                s = {
                    ...s,
                    players: {
                        ...s.players,
                        [playerId]: { ...s.players[playerId], nextTurnGlobalPresion: true },
                    },
                };
            }
        }

        // Avance (pasiva): ocupar posición del enemigo eliminado
        if ((unit.abilities ?? []).includes('avance')) {
            s = { ...s, pendingOccupation: { unitId: action.unitId, position: target.position } };
        }
    }

    return s;
}
