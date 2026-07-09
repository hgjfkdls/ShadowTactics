import type { GameState, Unit } from './state';
import { ABILITY_CONFIG } from './data/ability-config';
import type { ActivationCondition } from './data/ability-config/types';
import type { AbilityContext, CombatResult } from './combat/ability-effects';
import { hexDistance, type HexCoord } from '../hex';
import { updateUnit } from './utils';
import { addModifier, removeModifier, getModifierSum } from './modifiers/engine';
import { BASE_STATS } from './units';
import { l } from '../i18n';

function removeModifiersForUnit(state: GameState, playerId: string, targetId: string | undefined, stat: string, sourceName: string): GameState {
    const idsToRemove = state.activeModifiers
        .filter(m => m.stat === stat && m.sourceName === sourceName
            && m.sourcePlayerId === playerId
            && (targetId === undefined || m.targetId === targetId))
        .map(m => m.id);
    let s = state;
    for (const id of idsToRemove) {
        s = removeModifier(s, id);
    }
    return s;
}
import { l } from '../i18n';

export function isPassiveActive(
    unit: Unit,
    abilityId: string,
    state: GameState,
    context?: { target?: Unit; attacker?: Unit }
): boolean {
    const cfg = ABILITY_CONFIG[abilityId];
    if (!cfg) return false;
    return evaluateActivation(cfg.activation, unit, state, context);
}

function evaluateActivation(
    activation: ActivationCondition | undefined,
    unit: Unit,
    state: GameState,
    context?: { target?: Unit; attacker?: Unit; configId?: string; killerPosition?: HexCoord }
): boolean {
    if (!activation) return false;

    if (activation.didMovePreviousTurn !== undefined) {
        if (state.turn <= 1) return false; // No previous turn exists
        if ((unit.didMovePreviousTurn ?? false) !== activation.didMovePreviousTurn) return false;
    }

    if (activation.targetDidMovePreviousTurn !== undefined && context?.target) {
        if (state.turn <= 1) return false; // No previous turn exists
        if ((context.target.didMovePreviousTurn ?? false) !== activation.targetDidMovePreviousTurn) return false;
    }

    if (activation.timesDamagedThisTurn !== undefined) {
        if ((unit.timesDamagedThisTurn ?? 0) > activation.timesDamagedThisTurn) return false;
    }

    if (activation.lastTargetId && context?.target) {
        if (unit.lastTargetId !== context.target.id) return false;
    }

    if (activation.distance !== undefined && context?.target) {
        if (hexDistance(unit.position, context.target.position) !== activation.distance) return false;
    }

    if (activation.hasAttackedThisTurn !== undefined) {
        if (((unit.flags ?? []).includes('basic_attack')) !== activation.hasAttackedThisTurn) return false;
    }

    if (activation.hasMovedThisTurn !== undefined) {
        if (((unit.flags ?? []).includes('move')) !== activation.hasMovedThisTurn) return false;
    }

    if (activation.unitClasses !== undefined) {
        if (!activation.unitClasses.includes(unit.class)) return false;
    }

    if (activation.range !== undefined && context?.target) {
        const origin = activation.rangeOrigin === 'killer' && context.killerPosition
            ? context.killerPosition
            : unit.position;
        if (hexDistance(origin, context.target.position) > activation.range) return false;
    }

    if (activation.hpMaxPercent !== undefined) {
        const maxHp = BASE_STATS[unit.class as keyof typeof BASE_STATS]?.hp ?? 10;
        const pct = Math.floor((unit.hp / maxHp) * 100);
        if (pct > activation.hpMaxPercent) return false;
    }

    if (activation.targetUnitClasses !== undefined && context?.target) {
        if (!activation.targetUnitClasses.includes(context.target.class)) return false;
    }

    if (activation.isBasicAttack !== undefined) {
        const cfgId = context?.configId;
        if (activation.isBasicAttack && cfgId !== 'ataque_basico') return false;
        if (!activation.isBasicAttack && cfgId === 'ataque_basico') return false;
    }

    if (activation.targetIsIsolated !== undefined && context?.target) {
        const hasAdjacentAlly = Object.values(state.units)
            .some(u => u.owner === context.target!.owner && u.id !== context.target!.id && hexDistance(context.target!.position, u.position) === 1);
        if (activation.targetIsIsolated && hasAdjacentAlly) return false;
        if (!activation.targetIsIsolated && !hasAdjacentAlly) return false;
    }

    if (activation.targetHpMaxPercent !== undefined && context?.target) {
        const maxHp = BASE_STATS[context.target.class as keyof typeof BASE_STATS]?.hp ?? 10;
        const pct = Math.floor((context.target.hp / maxHp) * 100);
        if (pct > activation.targetHpMaxPercent) return false;
    }

    if (activation.targetUnitClasses !== undefined && context?.target) {
        if (!activation.targetUnitClasses.includes(context.target.class)) return false;
    }

    if (activation.blockFlags) {
        for (const f of activation.blockFlags) {
            if ((unit.flags ?? []).includes(f)) return false;
        }
    }

    if (activation.requireFlags) {
        for (const f of activation.requireFlags) {
            if (!(unit.flags ?? []).includes(f)) return false;
        }
    }

    if (activation.playerFlagNotSet !== undefined && context?.configId) {
        if ((state.players[unit.owner] as any)?.[activation.playerFlagNotSet]) return false;
    }

    return true;
}

/**
 * Evalúa pasivas con activation.turnStart y añade modificadores vía addModifier.
 */
export function processTurnStartPassives(state: GameState, activePlayer: string): GameState {
    let s = state;
    for (const unit of Object.values(s.units)) {
        for (const abilityId of unit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilityId];
            if (!cfg?.activation?.turnStart) continue;
            if (!cfg.effects) continue;

            // Remove stale modifiers from previous turns for this ability
            // Remove ALL modifiers from this ability regardless of current effects
            const allIds = s.activeModifiers
                .filter(m => m.sourceName === abilityId && m.sourcePlayerId === unit.owner)
                .map(m => m.id);
            for (const id of allIds) {
                s = removeModifier(s, id);
            }

            // Context for turnStart: target is self
            if (!evaluateActivation(cfg.activation, unit, s, { target: unit })) continue;

            for (const effect of cfg.effects) {
                // Per-effect turnStart override; falls back to ability-level activation
                const effTS = effect.activation?.turnStart ?? cfg.activation.turnStart;
                const isOwner = unit.owner === activePlayer;
                if (!(isOwner ? effTS.owner : effTS.enemy)) continue;

                if (effect.target === 'self') {
                    // Mutual exclusivity: linea_defensiva > resistencia (misma unidad, ambos activos)
                    if (abilityId === 'resistencia' && unit.abilities?.includes('linea_defensiva')) {
                        const lineaCfg = ABILITY_CONFIG['linea_defensiva'];
                        if (lineaCfg?.activation && evaluateActivation(lineaCfg.activation, unit, s, { target: unit })) continue;
                    }
                    // Handle both old format (effect.type as stat) and new format (effect.stat)
                    const stat = effect.type === 'modifierPush' ? (effect.stat ?? effect.type) : effect.type;
                    const op = effect.type === 'modifierPush' ? (effect.operator ?? 'ADD') : 'ADD';
                    const turns = effect.type === 'modifierPush' ? effect.remainingTurns : (effect as any).duration;
                    s = addModifier(s, unit.owner, unit.id, stat, effect.value ?? 1, op as any, turns ?? 0, effect.remainingUses, 'ability', cfg.id);

                } else if (effect.target === 'ally' && effect.range !== undefined) {
                    const allies = Object.values(s.units).filter(u =>
                        u.owner === unit.owner && u.id !== unit.id &&
                        hexDistance(unit.position, u.position) <= (effect.range ?? 1)
                    );
                    for (const ally of allies) {
                        const stat = effect.type === 'modifierPush' ? (effect.stat ?? effect.type) : effect.type;
                        s = addModifier(s, unit.owner, ally.id, stat, effect.value ?? 1, 'ADD', effect.duration ?? 1, effect.remainingUses, 'ability', cfg.id);

                    }
                } else if (effect.target === 'all_allies') {
                    const allies = Object.values(s.units).filter(u =>
                        u.owner === unit.owner && u.id !== unit.id
                    );
                    for (const ally of allies) {
                        if (effect.targetFilter?.classes && !effect.targetFilter.classes.includes(ally.class)) continue;
                        const stat = effect.type === 'modifierPush' ? (effect.stat ?? effect.type) : effect.type;
                        const op = effect.type === 'modifierPush' ? (effect.operator ?? 'ADD') : 'ADD';
                        const turns = effect.type === 'modifierPush' ? effect.remainingTurns : (effect as any).duration;
                        s = addModifier(s, unit.owner, ally.id, stat, effect.value ?? 1, op as any, turns ?? 0, effect.remainingUses, 'ability', cfg.id);
                    }
                }
            }
        }
    }
    return s;
}

export function applyConfigEffectsToCombat(
    ctx: AbilityContext,
    result: CombatResult,
    side: 'attacker' | 'defender'
): void {
    const unit = side === 'attacker' ? ctx.attacker : ctx.defender;
    const target = side === 'attacker' ? ctx.defender : ctx.attacker;
    const cfgId = ctx.ctx?.configId;
    const allowed = cfgId ? (ABILITY_CONFIG[cfgId]?.allowedModifiers ?? []) : [];

    function getEffectValue(effect: ConfigEffect): number {
        let val = effect.value ?? 1;
        if (effect.conditionalValue) {
            for (const cv of effect.conditionalValue) {
                let matches = true;
                if (cv.attackerClasses && !cv.attackerClasses.includes(unit.class)) matches = false;
                if (cv.excludeTargetClasses && cv.excludeTargetClasses.includes(target.class)) matches = false;
                const targetClassList = cv.targetClasses ?? cv.includeTargetClasses;
                if (targetClassList && !targetClassList.includes(target.class)) matches = false;
                if (!matches) continue;
                if ((cv.operator ?? 'set') === 'set') return cv.value;
                val += cv.value;
            }
        }
        if (effect.identityBonus) {
            const identity = ctx.state.players[unit.owner]?.selectedIdentity ?? '';
            for (const [prefix, bonus] of Object.entries(effect.identityBonus)) {
                if (identity.startsWith(prefix)) val += bonus;
            }
        }
        return val;
    }

    for (const abilityId of unit.abilities ?? []) {
        const cfg = ABILITY_CONFIG[abilityId];
        if (!cfg?.effects) continue;
        if (cfg.activation?.turnStart) continue; // Turn-start passives already applied via addModifier
        if (cfg.flags?.skipConfigEffects) continue; // Already applied via syncConditionalModifiers
        if (cfg.activation && !evaluateActivation(cfg.activation, unit, ctx.state, { target: side === 'attacker' ? ctx.defender : ctx.attacker, configId: ctx.ctx?.configId })) continue;

        for (const effect of cfg.effects) {
            if (effect.target !== 'self' && effect.target !== side) continue;

            // Check per-effect targetFilter (e.g., anti_caballeria only vs cavalry)
            if (effect.targetFilter) {
                if (effect.targetFilter.classes && !effect.targetFilter.classes.includes(target.class)) continue;
                if (effect.targetFilter.lastTargetId && unit.lastTargetId !== target.id) continue;
                if (effect.targetFilter.isBasicAttack !== undefined) {
                    const isBasic = ctx.ctx?.configId === 'ataque_basico';
                    if (effect.targetFilter.isBasicAttack && !isBasic) continue;
                    if (!effect.targetFilter.isBasicAttack && isBasic) continue;
                }
            }

            switch (effect.type) {
                case 'defense':
                    if (side === 'defender' && (allowed.includes('defense') || !cfgId)) {
                        result.damage = Math.max(1, result.damage - getEffectValue(effect));
                    }
                    break;
                case 'attack':
                    if (side === 'attacker' && (allowed.includes('attack') || !cfgId)) {
                        result.damage += getEffectValue(effect);
                    }
                    break;
                case 'combatMutator':
                    if (effect.stat === 'attack' && side === 'attacker' && (allowed.includes('attack') || !cfgId)) {
                        result.damage += getEffectValue(effect);
                    } else if (effect.stat === 'defense' && side === 'defender') {
                        result.damage = Math.max(1, result.damage - getEffectValue(effect));
                    } else if (effect.stat === 'difficulty' && (allowed.includes('difficulty') || !cfgId)) {
                        result.difficulty += getEffectValue(effect);
                    } else if (effect.stat === 'ignoresPassives' && side === 'attacker') {
                        (result as any).ignoresPassives = true;
                    } else if (effect.stat === 'nullifyCharge' && side === 'defender' && ctx.ctx.configId === 'carga') {
                        result.damage = Math.max(1, result.damage - getEffectValue(effect));
                    }
                    break;
                case 'difficulty':
                    let diffVal = effect.value ?? 0;
                    if (effect.conditionalValue) {
                        for (const cv of effect.conditionalValue) {
                            let matches = true;
                            if (cv.attackerClasses && !cv.attackerClasses.includes(unit.class)) matches = false;
                            if (cv.excludeTargetClasses && cv.excludeTargetClasses.includes(target.class)) matches = false;
                            const targetClassList = cv.targetClasses ?? cv.includeTargetClasses;
                            if (targetClassList && !targetClassList.includes(target.class)) matches = false;
                            if (!matches) continue;
                            if ((cv.operator ?? 'set') === 'set') { diffVal = cv.value; break; }
                            diffVal += cv.value;
                        }
                    }
                    if (effect.identityBonus) {
                        const identity = ctx.state.players[unit.owner]?.selectedIdentity ?? '';
                        for (const [prefix, bonus] of Object.entries(effect.identityBonus)) {
                            if (identity.startsWith(prefix)) diffVal += bonus;
                        }
                    }
                    if (allowed.includes('difficulty') || !cfgId) result.difficulty += diffVal;
                    break;
                case 'ignoresPassives':
                    if (side === 'attacker') {
                        (result as any).ignoresPassives = true;
                    }
                    break;
                case 'nullifyCharge':
                    if (side === 'defender' && ctx.ctx.configId === 'carga') {
                        result.damage = Math.max(1, result.damage - getEffectValue(effect));
                    }
                    break;
            }
        }
    }
}

export function applyConfigEffectsToState(
    context: { attacker: Unit; defender: Unit },
    state: GameState,
    hit: boolean
): GameState {
    let s = state;
    for (const unit of [context.attacker, context.defender]) {
        for (const abilityId of unit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilityId];
            if (!cfg?.effects) continue;
            if (cfg.activation?.turnStart) continue;
            if (cfg.activation && !evaluateActivation(cfg.activation, unit, s, { target: unit.id === context.attacker.id ? context.defender : context.attacker })) continue;

            for (const effect of cfg.effects) {
                const effTiming = effect.timing ?? 'onUse';
                if (effTiming === 'postHit' && hit) {
                    s = updateUnit(s, unit.id, (u) => ({
                        ...u, timesDamagedThisTurn: (u.timesDamagedThisTurn ?? 0) + 1,
                    }));
                } else if (effTiming === 'onHit' && hit) {
                    // Config-driven onHit effects
                    if (effect.type === 'flagPush') {
                        s = updateUnit(s, unit.id, (u) => ({
                            ...u, flags: [...new Set([...(u.flags ?? []), ...(effect.flags ?? [])])],
                        }));
                    }
                }
            }
        }
    }
    return s;
}

/**
 * Sincroniza modificadores condicionales (hpMaxPercent, etc.) tras combate o inicio de turno.
 * Añade el modifier si la condición se cumple, lo remueve si ya no se cumple.
 */
export function syncConditionalModifiers(state: GameState): GameState {
    let s = state;
    for (const unit of Object.values(s.units)) {
        s = syncUnitConditionalModifiers(s, unit.id);
    }
    return s;
}

function syncUnitConditionalModifiers(state: GameState, unitId: string): GameState {
    let s = state;
    const unit = s.units[unitId];
    if (!unit) return s;
    for (const abilityId of unit.abilities ?? []) {
        const cfg = ABILITY_CONFIG[abilityId];
        if (!cfg?.activation?.hpMaxPercent) continue;
        if (!cfg.effects) continue;
        if (cfg.activation.turnStart) continue;

        const isActive = isPassiveActive(unit, abilityId, s, { target: unit });
        const hasMod = cfg.effects.some(e => {
            const stat = e.type === 'modifierPush' ? (e.stat ?? e.type) : e.type;
            return getModifierSum(s, unit.owner, unit.id, stat) > 0;
        });

        if (isActive && !hasMod) {
            for (const effect of cfg.effects) {
                const stat = effect.type === 'modifierPush' ? (effect.stat ?? effect.type) : effect.type;
                const op = effect.type === 'modifierPush' ? (effect.operator ?? 'ADD') : 'ADD';
                s = addModifier(s, unit.owner, unit.id, stat, effect.value ?? 1, op, undefined, effect.remainingUses, 'ability', cfg.id);

            }
        } else if (!isActive && hasMod) {
            for (const effect of cfg.effects) {
                const stat = effect.type === 'modifierPush' ? (effect.stat ?? effect.type) : effect.type;
                const modIdx = s.activeModifiers.findIndex(m =>
                    m.targetId === unit.id && m.sourceName === cfg.id && m.stat === stat && (m.remainingUses ?? 1) > 0
                );
                if (modIdx !== -1) {
                    s = removeModifier(s, s.activeModifiers[modIdx].id);

                }
            }
        }
    }
    return s;
}

export function onHpChange(state: GameState, unitId: string): GameState {
    return syncUnitConditionalModifiers(state, unitId);
}

/**
 * Procesa pasivas con activation.onAllyKill cuando una unidad muere.
 * Se evalúan tanto las pasivas del dueño de la unidad muerta como las del killer.
 */
export function processOnKillPassives(state: GameState, killedUnitId: string, killerId: string): GameState {
    let s = state;
    const killed = s.units[killedUnitId] ?? s.graveyard[killedUnitId];
    const killer = s.units[killerId];
    if (!killed || !killer) return s;

    // Evaluar pasivas del dueño de la unidad muerta (karma)
    for (const unit of Object.values(s.units)) {
        if (unit.owner !== killed.owner) continue;
        for (const abilityId of unit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilityId];
            if (!cfg?.activation?.onAllyKill) continue;
            if (!evaluateActivation(cfg.activation, unit, s, { target: killed })) continue;

            for (const effect of cfg.effects) {
                // New format: stateChange on onKill (karma)
                if (effect.type === 'stateChange' && effect.target === 'killer' && (effect.timing ?? 'onUse') === 'onKill') {
                    const target = s.units[killerId];
                    if (target) {
                        const dmg = Math.abs(effect.value ?? 2);
                        const newHp = target.hp - dmg;
                        s = updateUnit(s, killerId, (u) => ({ ...u, hp: newHp }));
                        s = { ...s, karmaEntryToAppend: {
                            id: `h${s.nextHistoryId}`, turn: s.turn, actionNumber: 0,
                            playerId: killed.owner, type: 'attack' as const,
                            attackerId: killed.id, targetId: killerId,
                            die1: 0, die2: 0, total: 0, difficulty: 0, baseDifficulty: 0,
                            hit: true, damage: dmg, baseAttack: 0, counterDamage: 0,
                            attackerClass: killed.class, targetClass: target.class,
                            attackName: `ability.${cfg.id}.name`,
                            configId: cfg.id,
                            modifiers: [`${l(`ability.${cfg.id}.name`)}: daño reflejado al asesino`], paCost: 0,
                        } };
                        if (newHp <= 0) {
                            s = { ...s, graveyard: { ...s.graveyard, [killerId]: s.units[killerId] } };
                            s = { ...s, units: Object.fromEntries(Object.entries(s.units).filter(([k]) => k !== killerId)) };
                        }
                    }
                // Old format: damage (karma)
                } else if (effect.type === 'damage' && effect.target === 'killer') {
                    const target = s.units[killerId];
                    if (target) {
                        const newHp = target.hp - (effect.value ?? 2);
                        s = updateUnit(s, killerId, (u) => ({ ...u, hp: newHp }));
                        // Create history entry for karma
                        s = {
                            ...s,
                            karmaEntryToAppend: {
                                id: `h${s.nextHistoryId}`,
                                turn: s.turn,
                                actionNumber: 0,
                                playerId: killed.owner,
                                type: 'attack' as const,
                                attackerId: killed.id,
                                targetId: killerId,
                                die1: 0, die2: 0, total: 0,
                                difficulty: 0, baseDifficulty: 0,
                                hit: true,
                                damage: effect.value ?? 2,
                                baseAttack: 0,
                                counterDamage: 0,
                                attackerClass: killed.class,
                                targetClass: target.class,
                                attackName: `ability.${cfg.id}.name`,
                                configId: cfg.id,
                                modifiers: [`${l(`ability.${cfg.id}.name`)}: daño reflejado al asesino`],
                                paCost: 0,
                            },
                        };
                        if (newHp <= 0) {
                            s = { ...s, graveyard: { ...s.graveyard, [killerId]: s.units[killerId] } };
                            s = { ...s, units: Object.fromEntries(Object.entries(s.units).filter(([k]) => k !== killerId)) };
                        }
                    }

                }
            }
        }
    }

    // Evaluar pasivas de todas las unidades aliadas del killer (camino_del_guerrero, terror, etc.)
    for (const unit of Object.values(s.units)) {
        if (unit.owner !== killer.owner) continue;
        for (const abilityId of unit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilityId];
            if (!cfg?.activation?.onAllyKill) continue;
            if (!evaluateActivation(cfg.activation, unit, s, { target: killed, killerPosition: killer.position })) continue;

            for (const effect of cfg.effects) {
                // ── New format: processEffects handles stateChange and modifierPush ──
                if (effect.type === 'stateChange' && (effect.timing ?? 'onUse') === 'onKill') {
                    if (effect.target === 'self') {
                        // PA restore
                        const ap = (s.players[unit.owner]?.actionPoints ?? 0) + (effect.value ?? 1);
                        s = { ...s, players: { ...s.players, [unit.owner]: { ...s.players[unit.owner], actionPoints: ap } } };
                        s = { ...s, gameHistory: [...s.gameHistory, {
                            id: `h${s.nextHistoryId}`, turn: s.turn,
                            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                            playerId: unit.owner, type: 'card' as const, cardId: cfg.id,
                            cardName: `ability.${cfg.id}.name`, cardType: 'BUFF' as const,
                            targetId: unit.id, targetClass: unit.class,
                            details: `+${effect.value ?? 1} PA`, paCost: 0,
                            sourceClass: unit.class,
                        }], nextHistoryId: s.nextHistoryId + 1 };
                    } else if (effect.target === 'killer') {
                        // Damage to killer
                        const target = s.units[killerId];
                        if (target) {
                            const dmg = Math.abs(effect.value ?? 2);
                            const newHp = target.hp - dmg;
                            s = updateUnit(s, killerId, (u) => ({ ...u, hp: newHp }));
                            s = { ...s, karmaEntryToAppend: {
                                id: `h${s.nextHistoryId}`, turn: s.turn, actionNumber: 0,
                                playerId: killed.owner, type: 'attack' as const,
                                attackerId: killed.id, targetId: killerId,
                                die1: 0, die2: 0, total: 0, difficulty: 0, baseDifficulty: 0,
                                hit: true, damage: dmg, baseAttack: 0, counterDamage: 0,
                                attackerClass: killed.class, targetClass: target.class,
                                attackName: `ability.${cfg.id}.name`,
                                modifiers: [`${l(`ability.${cfg.id}.name`)}: daño reflejado al asesino`], paCost: 0,
                            } };
                            if (newHp <= 0) {
                                s = { ...s, graveyard: { ...s.graveyard, [killerId]: s.units[killerId] } };
                                s = { ...s, units: Object.fromEntries(Object.entries(s.units).filter(([k]) => k !== killerId)) };
                            }
                        }
                    }
                } else if (effect.type === 'modifierPush' && (effect.timing ?? 'onUse') === 'onKill') {
                    if (effect.target === 'enemies' && effect.stat === 'difficulty') {
                        const dist = hexDistance(killer.position, killed.position);
                        if (dist !== 1) continue;
                        for (const u of Object.values(s.units)) {
                            if (u.owner === killer.owner) continue;
                            s = addModifier(s, u.owner, u.id, 'difficulty', effect.value ?? 1, 'ADD', effect.remainingTurns ?? 0, effect.remainingUses ?? 1, 'ability', cfg.id);
                        }
                    }
                // ── Old format (legacy) ──
                } else if (effect.type === 'difficulty' && effect.target === 'enemies') {
                    // Find enemies adjacent to killer
                    const dist = hexDistance(killer.position, killed.position);
                    for (const u of Object.values(s.units)) {
                        if (u.owner === killer.owner) continue;
                        if (hexDistance(killer.position, u.position) !== 1 && hexDistance(killed.position, u.position) !== 1) continue;
                        if (dist !== 1) continue;
                        s = addModifier(s, u.owner, u.id, 'difficulty', effect.value ?? 1, 'ADD', effect.duration ?? 0, effect.remainingUses ?? 1, 'ability', cfg.id);

                    }
                } else if (effect.type === 'pa' && effect.target === 'self') {
                    // Restore AP to the ability owner's player
                    const dist = hexDistance(killer.position, killed.position);
                    if (dist !== 1) continue;
                    const ap = (s.players[unit.owner]?.actionPoints ?? 0) + (effect.value ?? 1);
                    s = {
                        ...s,
                        lastCaminoDelGuerrero: true,
                        players: { ...s.players, [unit.owner]: { ...s.players[unit.owner], actionPoints: ap } },
                        gameHistory: [...s.gameHistory, {
                            id: `h${s.nextHistoryId}`,
                            turn: s.turn,
                            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                            playerId: unit.owner,
                            type: 'support' as const,
                            configId: cfg.id,
                            sourceClass: unit.class,
                            details: `+${effect.value ?? 1} PA`,
                            paCost: 0,
                        }],
                        nextHistoryId: s.nextHistoryId + 1,
                    };

                }
            }
        }
    }
    return s;
}

export function processEndTurnPassives(state: GameState, currentPlayer: string): GameState {
    let s = state;
    for (const unit of Object.values(s.units)) {
        if (unit.owner !== currentPlayer) continue;
        for (const abilityId of unit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilityId];
            if (!cfg?.activation?.endTurn) continue;
            if (!cfg.effects) continue;
            if (!evaluateActivation(cfg.activation, unit, s, { target: unit })) continue;
            for (const effect of cfg.effects) {
                if (effect.type !== 'modifierPush') continue;
                if (effect.target !== 'self') continue;
                const stat = effect.stat ?? 'defense';
                const val = effect.value ?? 1;
                s = addModifier(s, unit.owner, unit.id, stat, val, 'ADD', effect.remainingTurns ?? 1, effect.remainingUses, 'ability', cfg.id);
            }
        }
    }
    return s;
}

export function processPromptPassives(state: GameState, playerId: string): GameState {
    // TODO: evaluate passives with prompt:true and set pending prompts on player state
    return state;
}
