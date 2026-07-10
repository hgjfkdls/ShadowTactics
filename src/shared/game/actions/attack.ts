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
import { applyConfigEffectsToState } from '../passive';
import { ABILITY_CONFIG } from '../data/ability-config';
import { ABILITIES } from '../data/abilities';

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

    if ((unit.flags ?? []).includes('basic_attack')) return state;

    const distance = hexDistance(unit.position, target.position);
    const attackerIdentity = getIdentityKey(state.players[unit.owner]?.selectedIdentity ?? '');
    const isArcher = unit.class === 'archer' || unit.class === 'general';
    const espartanoRangeBonus = unit.espartanoRangeBonus ? 1 : 0;
    const basicRangeBonus = espartanoRangeBonus;
    if (distance > unit.range + basicRangeBonus) return state;

    const ap = getPlayerAP(state, playerId);
    const costResult: CombatResult = { difficulty: 0, damage: 0, attackCost: 0, actionCost: 0, ignoresPassives: false };
    applyCostAbilities(
        { state, attacker: unit, defender: target, distance, roll: 0, ctx: {} },
        costResult
    );
    let paIntermediate = getAttackCost();
    let paSetSource: string | null = null;
    let cost = paIntermediate;
    // Procesar ADD/MUL normalmente, luego SET overridea todo
    const atkCostMods = state.activeModifiers.filter(m =>
        m.stat === 'attackCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
        && (m.targetId === undefined || m.targetId === unit.id)
        && m.sourcePlayerId === playerId
    );
    for (const m of atkCostMods) {
        if (m.operator === 'ADD') paIntermediate += m.value;
        else if (m.operator === 'MUL') paIntermediate *= m.value;
        else if (m.operator === 'SET' && paSetSource === null) paSetSource = m.sourceName ?? 'SET';
    }
    paIntermediate += costResult.actionCost;
    cost = paIntermediate;
    if (paSetSource !== null) {
        const setMod = atkCostMods.find(m => m.sourceName === paSetSource);
        if (setMod) cost = setMod.value;
    }
    if (ap < cost) return state;

    // Precisión: reduce dificultad
    const precisionCharges = unit.precisionCharges ?? 0;
    const precision = precisionCharges > 0;
    let attackUnit = unit;
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
        configId: 'ataque_basico',
        paCost: cost,
    });

    let s = pipeState(
        result.state,
        (s) => consumeAP(s, playerId, cost),
        (s) => updateUnit(s, action.unitId, (u) => {
            let updated = { ...u, flags: [...new Set([...(u.flags ?? []), 'basic_attack', 'performed_action'])] };
            if (precision) updated.precisionCharges = Math.max(0, (updated.precisionCharges ?? 0) - 1);
            return updated;
        }),
    );

    s = consumeModifier(s, playerId, 'attackCost', 1);
    s = consumeModifier(s, playerId, 'actionCost', 1);

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
    // Blanco fácil — display handled by config-driven identityBonus
    if ((unit.abilities ?? []).includes('blanco_facil') && target.didMovePreviousTurn === false) {
        histMods.push(`[diff] [id:blanco_facil] Blanco fácil: -1 dificultad`);
    }
    // Hostigar (Cazadores)
    if (attackerIdentity.startsWith('cazadores') && (unit.class === 'cavalry' || unit.class === 'general')) {
        const maxHp = BASE_STATS[target.class].hp;
        if (target.hp <= Math.floor(maxHp / 2)) {
            histMods.push('[diff] [id:hostigar] Hostigar: -1 dificultad');
        }
    }
    if (precision) histMods.push('[diff] [id:precision] Precisión: -2 dificultad');
    const unitDiffMods = state.activeModifiers.filter(m => m.stat === 'difficulty' && m.value > 0 && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0 && m.targetId === unit.id && m.sourcePlayerId === unit.owner);
    for (const m of unitDiffMods) {
        histMods.push(`[diff] ${m.sourceName}: +${m.value} dificultad`);
    }
    const dmgMods = state.activeModifiers.filter(m => m.stat === 'damage' && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0 && !m.targetId && m.sourcePlayerId === unit.owner);
    for (const m of dmgMods) {
        histMods.push(`[atk] Ataque: ${m.value > 0 ? '+' : ''}${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
    }
    const atkMods = state.activeModifiers.filter(m => m.stat === 'attack' && m.value > 0 && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0 && m.targetId === unit.id && m.sourcePlayerId === unit.owner);
    for (const m of atkMods) {
        histMods.push(`[atk] ${m.sourceName}: +${m.value} ataque`);
    }
    const defDmgMods = state.activeModifiers.filter(m => m.stat === 'damage' && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0 && (!m.targetId || m.targetId === target.id) && m.sourcePlayerId === target.owner);
    for (const m of defDmgMods) {
        if (m.value < 0) histMods.push(`[def] Defensa: ${m.value}${m.source && m.sourceName ? ` (${m.source}: ${m.sourceName})` : ''}`);
    }
    const defMods = state.activeModifiers.filter(m => m.stat === 'defense' && m.value > 0 && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0 && m.targetId === target.id && m.sourcePlayerId === target.owner);
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
    const rangeBonus = (unit.espartanoRangeBonus ? 1 : 0);
    if (rangeBonus > 0) histMods.push(`[range] Bonificación rango: +${rangeBonus}`);
    if ((unit.abilities ?? []).includes('anti_caballeria') && (target.class === 'cavalry' || (target.class === 'general' && (s.players[target.owner]?.selectedIdentity ?? '').match(/^(caballos_guerra|cazadores)/)))) {
        histMods.push('[atk] [id:anti_caballeria] Anti-caballería: +1 ataque');
    }
    const hasRomperFilas = (unit.abilities ?? []).includes('romper_filas');
    const tgtAbils = target.abilities ?? [];
    // Generic display for turnStart passives: show only if modifier still exists in activeModifiers
    let hasActiveLineaDef = false;
    let hasActiveResistencia = false;
    for (const abil of tgtAbils) {
        const cfg = ABILITY_CONFIG[abil];
        if (!cfg?.activation?.turnStart) continue;
        const hasMod = state.activeModifiers.some(m =>
            m.stat === 'defense' && m.sourceName === abil && m.targetId === target.id
            && m.sourcePlayerId === target.owner
            && (m.remainingTurns === undefined || m.remainingTurns >= 0)
            && (m.remainingUses ?? 1) > 0
        );
        if (!hasMod) continue;
        for (const e of cfg.effects ?? []) {
            if (e.type === 'defense') {
                histMods.push(`[def] [id:${abil}] ${ABILITIES[abil]?.name ?? abil}: +${e.value ?? 1} defensa`);
                if (abil === 'linea_defensiva') hasActiveLineaDef = true;
                if (abil === 'resistencia') hasActiveResistencia = true;
            }
        }
    }
    if (hasRomperFilas && (hasActiveResistencia || hasActiveLineaDef)) {
        const ignored = hasActiveLineaDef ? 'Línea defensiva' : 'Resistencia';
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
    if (costResult.attackCost < 0) paMods.push(`${costResult.attackCost} PA (ataque)`);
    if (costResult.actionCost < 0) paMods.push(`${costResult.actionCost} PA (acción)`);
    if (paSetSource) paMods.push(`${cost} PA (${paSetSource})`);

    // Add cost modifiers to histMods (from attacker's perspective)
    for (const m of atkCostMods) {
        histMods.push(`[cost] ${m.sourceName ?? 'Coste ataque'}: ${m.value > 0 ? '+' : ''}${m.value} PA`);
    }
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
            paBaseCost: getAttackCost(),
            paIntermediate: paIntermediate,
            paSetSource: paSetSource,
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
            const hitUnits: { id: string; class: string; owner: string }[] = [];
            for (const h of behind) {
                const hitUnit = Object.values(s.units).find(u => u.position.q === h.q && u.position.r === h.r);
                if (hitUnit && hitUnit.owner !== playerId) {
                    s = dealDamage(s, hitUnit.id, 1);
                    hitUnits.push({ id: hitUnit.id, class: hitUnit.class, owner: hitUnit.owner });
                }
            }
            if (hitUnits.length > 0) {
                s = {
                    ...s,
                    gameHistory: [...s.gameHistory, {
                        id: `h${s.nextHistoryId}`, turn: s.turn,
                        actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                        playerId, type: 'attack' as const,
                        attackerId: unit.id, targetId: target.id,
                        die1: 0, die2: 0, total: 0, difficulty: 10, baseDifficulty: 10,
                        hit: true, damage: hitUnits.length, baseAttack: hitUnits.length, counterDamage: 0,
                        attackerClass: unit.class, targetClass: hitUnits[0]?.class ?? unit.class,
                        attackName: 'ability.proyeccion.name',
                        configId: 'proyeccion',
                        modifiers: hitUnits.map(t => `[${t.owner === unit.owner ? 'ally' : 'enemy'}]${t.id}: 1 daño`),
                        enemiesHit: hitUnits.filter(t => t.owner !== playerId).map(t => t.id),
                        paCost: 0,
                    } as any],
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

    // Process config-driven onHit effects (robar_ricos, etc.)
    const atkUnit = s.units[action.unitId];
    const defUnit = s.units[action.targetId] ?? s.graveyard[action.targetId];
    if (atkUnit && defUnit) {
        s = applyConfigEffectsToState(
            { attacker: atkUnit, defender: defUnit },
            s,
            result.hit
        );
    }

    // Flush pending heal entry (robar_ricos) after attack history
    if ((s as any).pendingHealEntry) {
        const phe = (s as any).pendingHealEntry;
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: action.playerId,
                type: 'card' as const,
                cardId: phe.abilId,
                cardName: `ability.${phe.abilId}.name`,
                cardType: 'BUFF' as const,
                targetId: phe.attackerId,
                targetClass: phe.attackerClass,
                details: '+1 HP',
                paCost: 0,
                sourceClass: phe.attackerClass,
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
        s = { ...s, pendingHealEntry: undefined } as any;
    }

    return s;
}
