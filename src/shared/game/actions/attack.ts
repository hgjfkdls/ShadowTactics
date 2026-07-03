import type { GameState } from '../state';
import type { GameAction } from '../action-types';
import { hexDistance } from '../../hex';
import { pipeState, updateUnit, isWithinBounds, dealDamage } from '../utils';
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
    const costResult: CombatResult = { difficulty: 0, damage: 0, attackCost: 0, actionCost: 0, ignoresPassives: false };
    applyCostAbilities(
        { state, attacker: unit, defender: target, distance, roll: 0, ctx: {} },
        costResult
    );
    let cost = getAttackCost() + costResult.attackCost + costResult.actionCost;
    if (ataqueExtra) cost = 0;
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
        configId: 'ataque_basico',
        paCost: cost,
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
    );

    s = consumeModifier(s, playerId, 'attackCost', 1);
    s = consumeModifier(s, playerId, 'actionCost', 1);

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
                        gameHistory: [...s.gameHistory, {
                            id: `h${s.nextHistoryId}`,
                            turn: s.turn,
                            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                            playerId,
                            type: 'card' as const,
                            cardId: 'robar_ricos',
                            cardName: 'Robar a los ricos',
                            cardType: 'BUFF' as const,
                            targetId: action.unitId,
                            targetClass: attacker.class,
                            details: '+1 HP',
                            paCost: 0,
                            sourceClass: attacker.class,
                            sourceIdentity: 'Robin Hood',
                        }],
                        nextHistoryId: s.nextHistoryId + 1,
                    };
                }
            }
        }
    }

    const histMods: string[] = [];
    const isArcherFormula = (unit.abilities ?? []).includes('blanco_facil') || unit.class === 'archer';
    const diffBase = isArcherFormula ? 5 : unit.difficulty;
    const raw = isArcherFormula ? diffBase + distance : diffBase;
    const diffMods: string[] = isArcherFormula
        ? [`base ${diffBase}`, `distancia +${distance} → ${raw}`]
        : [`base ${diffBase}`];
    if (result.difficulty !== raw) {
        const diff = result.difficulty - raw;
        if (diff < 0) diffMods.push(`${diff} = ${result.difficulty}`);
        else diffMods.push(`+${diff} = ${result.difficulty}`);
    }
    histMods.push(`Dificultad: ${diffMods.join(', ')}`);
    // Blanco fácil
    if ((unit.abilities ?? []).includes('blanco_facil') && target.didMovePreviousTurn === false) {
        const identity = state.players[playerId]?.selectedIdentity ?? '';
        const bonus = identity.startsWith('francotirador') ? 2 : 1;
        histMods.push(`[diff] [id:blanco_facil] Blanco fácil: -${bonus} dificultad`);
    }
    // Hostigar (Cazadores)
    if (attackerIdentity.startsWith('cazadores') && (unit.class === 'cavalry' || unit.class === 'general')) {
        const maxHp = BASE_STATS[target.class].hp;
        if (target.hp <= Math.floor(maxHp / 2)) {
            histMods.push('[diff] [id:hostigar] Hostigar: -1 dificultad');
        }
    }
    if (ataqueExtra) histMods.push('[mixed] [id:ataque_extra] Ataque extra: +1 daño, +2 dificultad, 0 PA');
    if (precision) histMods.push('[diff] [id:precision] Precisión: -2 dificultad');
    const dmgMods = state.activeModifiers.filter(m => m.stat === 'damage' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0 && !m.targetId && m.sourcePlayerId === unit.owner);
    for (const m of dmgMods) {
        histMods.push(`[atk] Ataque: ${m.value > 0 ? '+' : ''}${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
    }
    const atkMods = state.activeModifiers.filter(m => m.stat === 'attack' && m.value > 0 && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0 && m.targetId === unit.id && m.sourcePlayerId === unit.owner);
    for (const m of atkMods) {
        histMods.push(`[atk] ${m.sourceName}: +${m.value} ataque`);
    }
    const defDmgMods = state.activeModifiers.filter(m => m.stat === 'damage' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0 && (!m.targetId || m.targetId === target.id) && m.sourcePlayerId === target.owner);
    for (const m of defDmgMods) {
        if (m.value < 0) histMods.push(`[def] Defensa: ${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
    }
    const defMods = state.activeModifiers.filter(m => m.stat === 'defense' && m.value > 0 && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0 && m.targetId === target.id && m.sourcePlayerId === target.owner);
    for (const m of defMods) {
        histMods.push(`[def] ${m.sourceName}: +${m.value} defensa`);
    }
    if ((unit.abilities ?? []).includes('presion') && unit.lastTargetId === target.id) {
        histMods.push('[atk] [id:presion] Presión: +1 ataque');
    }
    // Acechar (Cazadores)
    if (attackerIdentity.startsWith('cazadores')) {
        const isIsolated = !Object.values(state.units).some(u => u.owner === target.owner && u.id !== target.id && hexDistance(target.position, u.position) === 1);
        if (isIsolated) {
            if (unit.class === 'general') {
                const bonus = target.class === 'general' ? 1 : 2;
                histMods.push(`[atk] [id:acechar] Acechar: +${bonus} ataque`);
            } else if (unit.class === 'cavalry' && target.class !== 'general') {
                histMods.push('[atk] [id:acechar] Acechar: +1 ataque');
            }
        }
    }
    const rangeBonus = (attackerIdentity === 'francotirador' && isArcher ? 1 : 0) + (unit.espartanoRangeBonus ? 1 : 0);
    if (rangeBonus > 0) histMods.push(`[range] Bonificación rango: +${rangeBonus}`);
    if ((unit.abilities ?? []).includes('anti_caballeria') && (target.class === 'cavalry' || (target.class === 'general' && (s.players[target.owner]?.selectedIdentity ?? '').match(/^(caballos_guerra|cazadores)/)))) {
        histMods.push('[atk] [id:anti_caballeria] Anti-caballería: +1 ataque');
    }
    const hasRomperFilas = (unit.abilities ?? []).includes('romper_filas');
    const tgtAbils = target.abilities ?? [];
    const hasResistencia = tgtAbils.includes('resistencia') && !target.timesDamagedThisTurn;
    const hasLineaDef = tgtAbils.includes('linea_defensiva') && target.didMovePreviousTurn === false;
    if (hasLineaDef) {
        histMods.push('[def] [id:linea_defensiva] Línea defensiva: +1 defensa');
    } else if (hasResistencia) {
        histMods.push('[def] [id:resistencia] Resistencia: +1 defensa');
    }
    if (hasRomperFilas && (hasResistencia || hasLineaDef)) {
        const ignored = hasLineaDef ? 'Línea defensiva' : 'Resistencia';
        histMods.push(`[mixed] [id:romper_filas] [ignores:resistencia,linea_defensiva] Romper filas: ignora ${ignored}`);
    }
    // Espartano: Lanza y escudo (+1 defensa)
    if (target.espartanoDefenseBonus) {
        const targetIdentity = state.players[target.owner]?.selectedIdentity ?? '';
        if (targetIdentity.startsWith('espartano')) {
            histMods.push('[def] [id:lanza_escudo] Lanza y escudo: +1 defensa');
        }
    }
    // Espartano: Muro espartano
    if (target.class === 'lancer' || target.class === 'general') {
        const targetIdentity = state.players[target.owner]?.selectedIdentity ?? '';
        if (targetIdentity.startsWith('espartano')) {
            const hasAdjacentLancer = Object.values(state.units).some(u => u.owner === target.owner && (u.class === 'lancer' || u.class === 'general') && u.id !== target.id && hexDistance(target.position, u.position) === 1);
            if (hasAdjacentLancer) {
                histMods.push('[def] [id:muro_espartano] Muro espartano: +1 defensa');
            }
        }
    }
    // Furia berserker (Dios del Trueno)
    const atkIdentity = state.players[playerId]?.selectedIdentity ?? '';
    if (atkIdentity.startsWith('dios_trueno')) {
        const isInfantryOrGeneral = unit.class === 'infantry' || unit.class === 'general';
        if (isInfantryOrGeneral) {
            const maxHp = BASE_STATS[unit.class].hp;
            if (unit.hp <= Math.floor(maxHp / 2)) {
                histMods.push('[atk] [id:furia_berserker] Furia berserker: +1 ataque');
            }
        }
    }

    // Liderar a las tropas (Capitán de la Guardia)
    const liderarBonus = state.players[playerId]?.liderarAtaqueBonus;
    if (liderarBonus && liderarBonus > 0 && (unit.class === 'infantry' || unit.class === 'general')) {
        histMods.push(`[atk] [id:liderar_tropas] Liderar a las tropas: +${liderarBonus} ataque`);
    }

    // Plan de batalla (Comandante Supremo)
    const planBonus = state.players[playerId]?.planBatallaBonus;
    if (planBonus && planBonus > 0) histMods.push(`[atk] [id:plan_batalla] Avanzar: +${planBonus} ataque`);
    const planDefBonus = state.players[target.owner]?.planBatallaDefense;
    if (planDefBonus && planDefBonus > 0) {
        histMods.push(`[def] [id:plan_batalla] Reagruparse: +${planDefBonus} defensa`);
    }

    // Voz de mando (Comandante Supremo)
    if (unit.vozDeMandoAttackBonus) histMods.push(`[atk] [id:voz_de_mando] Voz de mando: +${unit.vozDeMandoAttackBonus} ataque`);
    if (target.vozDeMandoDefenseBonus) histMods.push(`[def] [id:voz_de_mando] Voz de mando: +${target.vozDeMandoDefenseBonus} defensa`);

    // Contraataque (Capitán de la Guardia)
    if (target.class === 'general' && distance === 1) {
        const targetIdentity = state.players[target.owner]?.selectedIdentity ?? '';
        if (targetIdentity.startsWith('capitan_guardia')) {
            histMods.push('[dmg] [id:contraataque] Contraataque (Capitán de la Guardia): 1 daño');
        }
    }

    const paMods: string[] = [];
    if (costResult.attackCost > 0) paMods.push(`+${costResult.attackCost} PA (ataque)`);
    if (costResult.actionCost > 0) paMods.push(`+${costResult.actionCost} PA (acción)`);
    if (cost === 0 && ataqueExtra) paMods.push('0 PA (ataque extra)');

    // Add cost modifiers to histMods (from attacker's perspective)
    const atkCostMod = state.activeModifiers.find(m => m.stat === 'attackCost' && !m.targetId && m.sourcePlayerId === playerId && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0);
    if (atkCostMod) histMods.push(`[cost] ${atkCostMod.sourceName ?? 'Coste ataque'}: +${atkCostMod.value} PA`);
    const actCostMod = state.activeModifiers.find(m => m.stat === 'actionCost' && m.targetId === unit.id && m.sourcePlayerId === playerId && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0);
    if (actCostMod) histMods.push(`[cost] ${actCostMod.sourceName ?? 'Coste acción'}: +${actCostMod.value} PA`);

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
        },
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId,
            type: 'attack' as const,
            attackName: 'button.basicAttack',
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
            distance,
            modifiers: histMods,
            configId: 'ataque_basico',
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    // Flush karma entry after attack history
    const karmaEntry = s.karmaEntryToAppend;
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
            const hitTargets: string[] = [];
            for (const h of behind) {
                const hitUnit = Object.values(s.units).find(u => u.position.q === h.q && u.position.r === h.r);
                if (hitUnit && hitUnit.owner !== playerId) {
                    s = dealDamage(s, hitUnit.id, 1);
                    hitTargets.push(`[${hitUnit.id}]${hitUnit.class}`);
                }
            }
            if (hitTargets.length > 0) {
                s = {
                    ...s,
                    gameHistory: [...s.gameHistory, {
                        id: `h${s.nextHistoryId}`, turn: s.turn,
                        actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                        playerId, type: 'card' as const,
                        cardId: 'proyeccion', cardName: 'ability.proyeccion.name', cardType: 'DEBUFF' as const,
                        details: hitTargets.join('|'),
                        paCost: 0, sourceClass: unit.class, sourceIdentityKey: 'punta_lanza',
                    }],
                    nextHistoryId: s.nextHistoryId + 1,
                };
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
        // Avance (pasiva): ocupar posición del enemigo eliminado
        if ((unit.abilities ?? []).includes('avance')) {
            s = { ...s, pendingOccupation: { unitId: action.unitId, position: target.position } };
        }
    }

    // Liderar a las tropas (Capitán de la Guardia): cuando el General ataca, infantería gana ataque
    if (unit.class === 'general' && s.players[playerId]?.selectedIdentity?.startsWith('capitan_guardia')) {
        const bonus = dead ? 2 : 1;
        const affectedIds = Object.values(s.units)
            .filter(u => u.owner === playerId && (u.class === 'infantry' || u.id === unit.id))
            .map(u => u.id);
        s = {
            ...s,
            players: {
                ...s.players,
                [playerId]: { ...s.players[playerId], liderarAtaqueBonus: bonus },
            },
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId,
                type: 'card' as const,
                cardId: 'liderar_tropas',
                cardName: 'ability.liderar_tropas.name',
                cardType: 'BUFF' as const,
                details: `+${bonus} · ${affectedIds.join(',')}`,
                alliesHit: affectedIds,
                paCost: 0,
                sourceClass: unit.class,
                sourceIdentityKey: 'capitan_guardia',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    }

    return s;
}
