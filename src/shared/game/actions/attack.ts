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

    // Solo 1 ataque básico por turno por unidad
    if (unit.attackedThisTurn) return state;

    const distance = hexDistance(unit.position, target.position);
    const attackerIdentity = getIdentityKey(state.players[unit.owner]?.selectedIdentity ?? '');
    const espartanoRangeBonus = unit.espartanoRangeBonus ? 1 : 0;
    const basicRangeBonus = (attackerIdentity === 'francotirador' ? 1 : 0) + espartanoRangeBonus;
    if (distance > unit.range + basicRangeBonus) return state;

    const ap = getPlayerAP(state, playerId);
    const costResult: CombatResult = { difficulty: 0, damage: 0, attackCost: 0, ignoresPassives: false };
    applyCostAbilities(
        { state, attacker: unit, defender: target, distance, roll: 0, ctx: {} },
        costResult
    );
    let cost = getAttackCost() + costResult.attackCost;
    const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
    if (hasSurcharge) cost += 1;
    if (ap < cost) return state;

    const result: AttackResult = resolveAttack({
        state,
        unit,
        target,
        from: unit.position,
        to: target.position,
        distance,
    });

    let s = pipeState(
        result.state,
        (s) => consumeAP(s, playerId, cost),
        (s) => updateUnit(s, action.unitId, (u) => ({ ...u, attackedThisTurn: true, performedActionThisTurn: true })),
        (s) => hasSurcharge ? updateUnit(s, action.unitId, (u) => ({ ...u, fuegoCoberturaCharges: (u.fuegoCoberturaCharges ?? 0) - 1 })) : s,
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
