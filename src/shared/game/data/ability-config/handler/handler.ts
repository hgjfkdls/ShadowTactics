import type { GameState, GameAction, Unit } from '@shared/game/state';
import type { AbilityConfig, ConfigEffect } from '../types';
import { ABILITY_CONFIG } from '../index';
import { hexDistance } from '@shared/hex';
import type { HexCoord } from '@shared/hex';
import { updateUnit, dealDamage, isHexOccupied, isWithinBounds } from '@shared/game/utils';
import { roll2d6 } from '@shared/game/utils/rng';
import { consumeAP } from '@shared/game/helpers/ap';
import { resolveAttack } from '@shared/game/combat';
import type { AttackResult, CombatResult } from '@shared/game/combat';
import { getDifficulty } from '@shared/game/combat/hit';
import { applyDifficultyAbilities } from '@shared/game/combat/ability-effects';
import { addModifier, consumeModifier, getModifierSum } from '@shared/game/modifiers/engine';
import { BASE_STATS } from '@shared/game/units';
import { buildAttackModifiers, storeAttackResult } from '@shared/game/actions/ability';
import { pickVoiceKey } from '@shared/game/helpers/sounds';
import { getAbilityHighlights, isValidTarget } from '@shared/game/board/selection';
import { processEffects } from '@shared/game/effects';
import type { EffectContext } from '@shared/game/effects';

function unitHasAbility(unit: Unit, abilityId: string): boolean {
    return unit.abilities?.includes(abilityId) ?? false;
}

function getAbilityRange(unit: Unit, _state: GameState, cfg: AbilityConfig): number {
    const raw = typeof cfg.range === 'object' && cfg.range ? (cfg.range as any).value : cfg.range;
    if (cfg.type === 'move') {
        return raw === 'unit.range' ? unit.range : (raw ?? unit.range);
    }
    const base = raw === 'unit.range' ? unit.range : (raw ?? unit.range);
    let r = base + (cfg.rangeBonus ?? 0);
    // Range modifier from activeModifiers (lanza_escudo, francotirador)
    for (const m of _state.activeModifiers) {
        if (m.stat === 'range' && (m.targetId === undefined || m.targetId === unit.id)) {
            if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
            if (m.operator === 'ADD') r += m.value;
        }
    }
    // Tiro a distancia: +1 rango a ataques básicos para arqueros (no general)
    if (cfg.id === 'ataque_basico' && unit.class !== 'general') {
        const identity = _state.players[unit.owner]?.selectedIdentity ?? '';
        if (unit.abilities?.includes('tiro_a_distancia') || (identity.startsWith('francotirador') && unit.class === 'archer')) r += 1;
    }
    return r;
}

function consumeCostMods(s: GameState, playerId: string, unitId: string): GameState {
    const costMods = getModifierSum(s, playerId, unitId, 'attackCost') + getModifierSum(s, playerId, unitId, 'actionCost');
    if (costMods > 0) {
        s = consumeAP(s, playerId, costMods);
        s = consumeModifier(s, playerId, 'attackCost', costMods, unitId);
        s = consumeModifier(s, playerId, 'actionCost', costMods, unitId);
    }
    return s;
}

function applyEffectsByTiming(state: GameState, effects: ConfigEffect[], unit: Unit, action: GameAction, target: Unit | undefined, timing: 'onUse' | 'onHit' | 'onKill', cfg: AbilityConfig): GameState {
    let s = state;
    for (const effect of effects) {
        if ((effect.timing ?? 'onUse') !== timing) continue;
        if (effect.type === 'setFlag' && effect.target === 'self') {
            s = updateUnit(s, unit.id, (u) => ({ ...u, flags: [...new Set([...(u.flags ?? []), ...(effect.flags ?? [])])] }));
        } else if (effect.type === 'removeFlag' && effect.target === 'self') {
            s = updateUnit(s, unit.id, (u) => ({ ...u, flags: (u.flags ?? []).filter(f => !(effect.flags ?? []).includes(f)) }));
        } else if (effect.type === 'setPlayerFlag') {
            s = { ...s, players: { ...s.players, [unit.owner]: { ...s.players[unit.owner], flags: [...new Set([...(s.players[unit.owner]?.flags ?? []), ...(effect.flags ?? [])])] } } };
        }
    }
    return s;
}

export function handleAbility(state: GameState, action: GameAction, cfg: AbilityConfig): GameState {
    if (action.type !== 'USE_ABILITY') return state;

    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== action.playerId) return state;
    if (action.playerId !== state.activePlayer) return state;
    // Bloqueo (Confusión): unidad no puede actuar
    if (state.activeModifiers.some(m =>
        m.stat === 'bloqueo'
        && m.targetId === unit.id && m.remainingTurns >= 0
    )) return state;
    // Inmovil: solo bloquea movimiento
    if (cfg.type === 'move' && state.activeModifiers.some(m =>
        m.stat === 'inmovil'
        && m.targetId === unit.id && m.remainingTurns >= 0
    )) return state;
    if (action.abilityId !== 'ataque_basico' && action.abilityId !== 'movimiento') {
        if (!unitHasAbility(unit, action.abilityId)) return state;
    }

    const costMods = getModifierSum(state, action.playerId, action.unitId, 'actionCost');
    const attackCostMod = cfg.type === 'attack' ? getModifierSum(state, action.playerId, action.unitId, 'attackCost', action.abilityId) : 0;
    let baseCost = cfg.base.paCost === 'unit.movementCost' ? unit.movementCost : (cfg.base.paCost ?? 0);
    // Apply movementCost modifiers (movilidad card, pantano, etc.)
    let hasMovementSet = false;
    let movementMul = 1;
    if (cfg.type === 'move' && cfg.allowedModifiers?.includes('movementCost')) {
        const moveMods = state.activeModifiers.filter(m =>
            m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
        );
        // SET overridea todo: ignora MUL, ADD y actionCost
        const setMod = moveMods.find(m => m.operator === 'SET');
        if (setMod) {
            baseCost = setMod.value;
            hasMovementSet = true;
        } else {
            // MUL se aplica a la base primero
            for (const m of moveMods) {
                if (m.operator === 'MUL') movementMul *= m.value;
            }
            if (movementMul !== 1) baseCost = Math.round(baseCost * movementMul);
            // ADD se suma después de MUL
            for (const m of moveMods) {
                if (m.operator === 'ADD') baseCost += m.value;
            }
        }
        baseCost = Math.max(0, baseCost);
    }
    // Si hay SET en movementCost, se ignora costMods (actionCost). Si no, se suma después de MUL/ADD.
    // Para attacks, attackCost SET define el coste total (ataque_extra → 0 PA)
    const attackSetMod = cfg.type === 'attack' ? state.activeModifiers.find(m =>
        m.stat === 'attackCost' && m.operator === 'SET' && m.targetId === unit.id && (m.remainingUses ?? 1) > 0
        && (m.consumedBy === undefined || m.consumedBy === action.abilityId)
    ) : undefined;
    const attackCostOverride = attackSetMod ? Math.max(0, attackSetMod.value) : undefined;
    let totalCost = hasMovementSet ? baseCost : (baseCost + costMods);
    if (attackCostOverride !== undefined) totalCost = attackCostOverride;
    totalCost = Math.max(0, totalCost);
    if ((state.players[action.playerId]?.actionPoints ?? 0) < totalCost) return state;

    // Pre-use activation checks from config
    const uFlags = unit.flags ?? [];
    if (cfg.activation?.requireFlags) {
        for (const f of cfg.activation.requireFlags) {
            if (!uFlags.includes(f)) return state;
        }
    }
    if (cfg.activation?.blockFlags) {
        for (const f of cfg.activation.blockFlags) {
            if (uFlags.includes(f)) return state;
        }
    }

    // Range / Target validation from config (shared between client and server)
    const hasRangeCfg = typeof cfg.range === 'object' && cfg.range && Object.keys(cfg.range).length > 0;
    const hasTargetCfg = typeof cfg.target === 'object' && cfg.target && Object.keys(cfg.target).length > 0;
    if ((hasRangeCfg || hasTargetCfg) && action.targetId) {
        if (!isValidTarget(state, unit.id, action.abilityId, action.targetId)) return state;
    }
    // Bloquear uso directo de habilidades pasivas/de reacción que no tienen range/target configurado
    // (blanco_facil, anti_caballeria, formacion_defensiva, acechar, hostigar, etc.)
    if (!hasRangeCfg && !hasTargetCfg && action.targetId) {
        if (cfg.activation?.whenAttack || cfg.activation?.whenAttacked) return state;
    }
    // Para moves, validar destino antes de cualquier efecto o consumo de AP
    if (cfg.type === 'move' && (hasRangeCfg || hasTargetCfg) && action.to) {
        const highlights = getAbilityHighlights(state, unit.id, cfg.id);
        const isValid = highlights.some(h => h.highlight !== 'range' && h.hex.q === action.to!.q && h.hex.r === action.to!.r);
        if (!isValid) return state;
    }
    // Patada acrobática: validar destino antes de efectos (evita flag fantasma)
    if (action.abilityId === 'patada_acrobatica' && action.to && action.targetId) {
        const targetUnit = state.units[action.targetId];
        if (targetUnit) {
            const destToEnemy = hexDistance(action.to, targetUnit.position);
            if (destToEnemy === 0 || destToEnemy === 1) return state;
        }
    }

    // Apply pre-combat effects (onUse: flagPush, flagPop, modifierPush)
    let s: GameState = state;
    const sBeforeSwitch = s;
    if (cfg.effects) {
        // New format: processEffects handles flagPush, flagPop, modifierPush
        const effCtx: EffectContext = {
            state: s, unit, timing: 'onUse',
            target: action.targetId ? s.units[action.targetId] : unit,
            configId: cfg.id,
        };
        s = processEffects(s, cfg.effects, effCtx);
        // Legacy fallback: applyEffectsByTiming for unmigrated configs
        if (cfg.effects.some(e => e.type === 'setFlag' || e.type === 'removeFlag' || e.type === 'setPlayerFlag')) {
            s = applyEffectsByTiming(s, cfg.effects, unit, action, undefined, 'onUse', cfg);
        }
    }

    // Consume AP: attackCost SET override, or base cost + modifiers
    const moveFinalCost = attackCostOverride !== undefined ? attackCostOverride : (cfg.type === 'move' ? totalCost : (baseCost + costMods + attackCostMod));


    // Resolver voiceKey desde config
    const voiceKey = pickVoiceKey(cfg.type, cfg.sounds, unit.class);

    switch (cfg.type) {
        case 'attack':
            s = handleAttack(s, action, unit, cfg, baseCost, costMods, voiceKey, moveFinalCost);
            if (s === sBeforeSwitch) return state;
            // El resolver consume attack, difficulty, attackCost via consumeModifier con abilityId.
            // Consumir adicionalmente el attackCost SET específico de la unidad.
            if (attackSetMod) {
                s = consumeModifier(s, unit.owner, 'attackCost', 1, unit.id, action.abilityId);
            }
            s = consumeAP(s, unit.owner, moveFinalCost);
            break;
        case 'support':
            s = handleSupport(s, action, unit, cfg, baseCost, costMods, voiceKey);
            if (s === sBeforeSwitch) return state;
            s = consumeAP(s, unit.owner, moveFinalCost);
            break;
        case 'move':
            s = handleMove(s, action, unit, cfg, baseCost, costMods, undefined, voiceKey);
            if (s === state) return state;
            s = consumeAP(s, unit.owner, moveFinalCost);
            // Consumir modifiers de movementCost después del movimiento (cualquier operador)
            if (cfg.allowedModifiers?.includes('movementCost')) {
                s = consumeModifier(s, action.playerId, 'movementCost', 1);
            }
            break;
        default:
            return state;
    }

    if (s !== state) {
        s = updateUnit(s, action.unitId, (u) => ({ ...u, flags: [...new Set([...(u.flags ?? []), 'performed_action'])] }));
        // On-kill effects (desenvainado_veloz reset, etc.)
        if (cfg.effects && action.targetId && s.graveyard[action.targetId]) {
            const killCtx: EffectContext = {
                state: s, unit, timing: 'onKill',
                target: s.graveyard[action.targetId],
                configId: cfg.id,
            };
            s = processEffects(s, cfg.effects, killCtx);
            if (cfg.effects.some(e => e.type === 'setFlag' || e.type === 'removeFlag' || e.type === 'setPlayerFlag')) {
                s = applyEffectsByTiming(s, cfg.effects, unit, action, undefined, 'onKill', cfg);
            }
        }
    }

    // Set lastTargetId for attack/support abilities (needed by presion, etc.)
    if (action.targetId && cfg.type !== 'move') {
        s = updateUnit(s, action.unitId, (u) => ({ ...u, lastTargetId: action.targetId }));
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
                unitId: unit.id,
                type: 'support' as const,
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

    // ─── Config-driven movement history ───
    const mvDefault = cfg.type === 'move' ? { unit: 'self' as const } : false;
    const mvCfg = cfg.log?.showMovement !== undefined ? cfg.log.showMovement : mvDefault;
    if (mvCfg && s !== state) {
        const mv = typeof mvCfg === 'object' ? mvCfg : { unit: 'self' as const };
        if (cfg.type === 'move' && mv.unit === 'self') {
            const finalUnit = s.units[action.unitId];
            if (finalUnit && (finalUnit.position.q !== unit.position.q || finalUnit.position.r !== unit.position.r)) {
                const moveCostStrs: string[] = [];
                const moveSrc = state.activeModifiers.find(m => m.stat === 'movementCost' && m.targetId === undefined && m.sourcePlayerId === unit.owner && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0);
                if (moveSrc) {
                    const label = moveSrc.operator === 'MUL' ? `${moveSrc.sourceName ?? 'Coste'}: x${moveSrc.value} cost`
                        : moveSrc.operator === 'SET' ? `${moveSrc.sourceName ?? 'Coste'}: ${moveSrc.value} PA`
                        : `${moveSrc.sourceName ?? 'Coste'}: ${moveSrc.value > 0 ? '+' : ''}${moveSrc.value}`;
                    moveCostStrs.push(label);
                }
                const actSrc = state.activeModifiers.find(m => m.stat === 'actionCost' && m.targetId === unit.id && m.sourcePlayerId === unit.owner && (m.remainingTurns === undefined || m.remainingTurns >= 0) && (m.remainingUses ?? 1) > 0);
                if (actSrc) moveCostStrs.push(`${actSrc.sourceName ?? 'Coste acción'}: +${actSrc.value} PA`);
                // Build path array: from action.path (cabalgar_2), or compute midpoint (cabalgar), or simple
                const displayPath: HexCoord[] = action.path && action.path.length >= 2
                    ? [unit.position, ...action.path]
                    : cfg.flags?.straightLine
                        ? (() => {
                            const dq = action.to!.q - unit.position.q;
                            const dr = action.to!.r - unit.position.r;
                            const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
                            if (steps <= 1) return [unit.position, action.to!];
                            const mid = { q: Math.round(unit.position.q + dq / 2), r: Math.round(unit.position.r + dr / 2) };
                            return [unit.position, mid, action.to!];
                        })()
                        : [unit.position, action.to!];
                const pathStr = displayPath.map((h: any) => `(${h.q},${h.r})`).join(' → ');
                s = {
                    ...s,
                    gameHistory: [...s.gameHistory, {
                        id: `h${s.nextHistoryId}`,
                        turn: s.turn,
                        actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                        playerId: unit.owner,
                        type: 'move' as const,
                        configId: cfg.id,
                        abilityName: `ability.${cfg.id}.name`,
                        unitId: finalUnit.id,
                        unitClass: finalUnit.class,
                        from: unit.position,
                        to: finalUnit.position,
                        paCost: moveFinalCost ?? (baseCost + costMods),
                        cost: moveFinalCost ?? (baseCost + costMods),
                        baseCost: baseCost,
                        modifiers: moveCostStrs,
                        details: pathStr,
                        path: displayPath,
                        sourceClass: finalUnit.class,
                        voiceKey,
                    }],
                    nextHistoryId: s.nextHistoryId + 1,
                };
            }
        } else {
            // Merge movement into the last history entry (attack/support)
            const history = [...s.gameHistory];
            const lastIdx = history.length - 1;
            if (lastIdx >= 0) {
                const merged: any = { ...history[lastIdx] };
                if (mv.unit === 'self') {
                    const finalUnit = s.units[action.unitId];
                    if (finalUnit && (finalUnit.position.q !== unit.position.q || finalUnit.position.r !== unit.position.r)) {
                        merged.from = unit.position;
                        merged.to = finalUnit.position;
                        merged.unitId = finalUnit.id;
                        merged.unitClass = finalUnit.class;
                    }
                } else if (mv.unit === 'target' && action.targetId) {
                    const origTarget = state.units[action.targetId];
                    const finalTarget = s.units[action.targetId] ?? s.graveyard[action.targetId];
                    if (origTarget && finalTarget && (finalTarget.position.q !== origTarget.position.q || finalTarget.position.r !== origTarget.position.r)) {
                        merged.from = origTarget.position;
                        merged.to = finalTarget.position;
                        merged.unitId = finalTarget.id;
                        merged.unitClass = finalTarget.class;
                    }
                }
                // Fallback: pendingOccupation (ejecutar, desenvainado_veloz)
                if (s.pendingOccupation && !merged.from) {
                    const occUnit = s.units[s.pendingOccupation.unitId] ?? unit;
                    merged.from = occUnit.position;
                    merged.to = s.pendingOccupation.position;
                    merged.unitId = occUnit.id;
                    merged.unitClass = occUnit.class;
                }
                if (merged.from) {
                    history[lastIdx] = merged;
                    s = { ...s, gameHistory: history };
                }
            }
        }
    }

    return s;
}

function handleAttack(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number, voiceKey?: string, actualPaCost?: number): GameState {
    // Torbellino: AoE attack — no necesita targetId
    if (action.abilityId === 'torbellino') {
        if ((unit.flags ?? []).includes('torbellino') || (unit.flags ?? []).includes('carga')) return state;
        const targets = Object.values(state.units).filter(u => u.owner !== unit.owner && hexDistance(unit.position, u.position) === 1);
        const allies = Object.values(state.units).filter(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(unit.position, u.position) === 1);
        if (targets.length === 0 && allies.length === 0) return state;

let s = state;


        // Compute difficulty with modifiers (aura precision, etc.)
        const firstTarget = targets[0] ?? allies[0] ?? unit;
        const tDiffCtx = { state: s, attacker: unit, defender: firstTarget, distance: 1, roll: 0, ctx: { configId: cfg.id } as any };
        const tDiffResult: CombatResult = { difficulty: getDifficulty(unit, 1), damage: 0, attackCost: 0, actionCost: 0, ignoresPassives: false };
        applyDifficultyAbilities(tDiffCtx, tDiffResult);
        const finalDifficulty = tDiffResult.difficulty;

        const { total, die1, die2, seed: newSeed } = roll2d6(s.rngSeed);
        s = { ...s, rngSeed: newSeed };
        const hit = total >= finalDifficulty;
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
        s = updateUnit(s, unit.id, (u) => ({ ...u, flags: [...(u.flags ?? []), 'torbellino'] }));
        // Build target list for display
        const hitTargets = hit ? targets : [...targets, ...allies].filter(u => u.class !== 'general');
        const targetNames = hitTargets.map(t => `[${t.id}]${t.class}`).join(', ');
        const dmgPerTarget = hit ? 2 : 1;
        const totalDmg = dmgPerTarget * hitTargets.length;
        s = {
            ...s,
            lastAttackResult: {
                attackerId: unit.id, targetId: unit.id,
                die1, die2, total,
                difficulty: finalDifficulty, hit,
                damage: totalDmg, counterDamage: 0,
                attackerClass: unit.class, targetClass: hitTargets.map(t => t.class).join(','),
                attackName: `ability.${cfg.id}.name`,
            },
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`, turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner, type: 'attack' as const,
                attackerId: unit.id, targetId: unit.id,
                die1, die2, total, difficulty: finalDifficulty, baseDifficulty: finalDifficulty,
                hit, damage: totalDmg, baseAttack: unit.attack,
                counterDamage: 0,
                attackerClass: unit.class,
                targetClass: hitTargets.map(t => t.class).join(','),
                attackName: `ability.${cfg.id}.name`,
                noCritical: true,
                hitEnemies,
                hitAllies,
                alliesHit: hit ? [] : [...allies].filter(u => u.class !== 'general').map(t => t.id),
                enemiesHit: hitTargets.filter(t => t.owner !== unit.owner).map(t => t.id),
                modifiers: hitTargets.map(t => `[${t.owner === unit.owner ? 'ally' : 'enemy'}]${t.id}: ${dmgPerTarget} daño`),
                paCost: baseCost + costMods,
                configId: cfg.id,
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
        return s;
    }

    if (!action.targetId) return state;
    const target = state.units[action.targetId];
    if (!target || target.owner === unit.owner) return state;
    const preTimesDamaged = target.timesDamagedThisTurn;

    // Check ability-specific state flags
    if (action.abilityId === 'doble_ataque' && ((unit.flags ?? []).includes('doble_ataque') || (unit.flags ?? []).includes('ventaja_alcance') || !(unit.flags ?? []).includes('basic_attack'))) return state;
    if (action.abilityId === 'carga' && ((unit.flags ?? []).includes('carga') || (unit.flags ?? []).includes('basic_attack'))) return state;
    if (action.abilityId === 'ventaja_alcance' && ((unit.flags ?? []).includes('ventaja_alcance') || (unit.flags ?? []).includes('doble_ataque') || (unit.flags ?? []).includes('basic_attack'))) return state;

    // Check lastHex requirement (carga)
    if (cfg.requiresLastHex) {
        if (!(unit.flags ?? []).includes('cabalgar') || !unit.lastHex) return state;
    }

    // Config-driven target validation (range pattern + target filters)
    const hasRangeCfg = typeof cfg.range === 'object' && cfg.range && Object.keys(cfg.range).length > 0;
    const hasTargetCfg = typeof cfg.target === 'object' && cfg.target && Object.keys(cfg.target).length > 0;
    if (hasRangeCfg || hasTargetCfg) {
        if (!isValidTarget(state, unit.id, action.abilityId, action.targetId)) return state;
    }

    const distance = hexDistance(unit.position, target.position);

    // Ventaja de alcance: solo permite atacar a distancia > rango normal
    if (action.abilityId === 'ventaja_alcance' && distance <= unit.range) return state;

    // Fixed damage abilities (patada acrobática)
    if (cfg.fixedDamage !== undefined && action.abilityId === 'patada_acrobatica') {
        if ((unit.flags ?? []).includes('patada_acrobatica')) return state;
        if (distance !== 1) return state;
        if (!action.to) return state;
        const destToEnemy = hexDistance(action.to, target.position);
        if (destToEnemy === 0 || destToEnemy === 1) return state;
        if (isHexOccupied(state, action.to)) return state;

let s = state;

        s = dealDamage(s, target.id, cfg.fixedDamage, unit.id);
        s = updateUnit(s, unit.id, (u) => ({
            ...u, position: action.to!,
            flags: [...(u.flags ?? []), 'patada_acrobatica', 'move'],
        }));
        // Build history entry
        const targetDead = !!s.graveyard[target.id];
        // Build cost modifier strings for display
        const costModStrs: string[] = [];
        const atkCostSrc = state.activeModifiers.find(m => m.stat === 'attackCost' && !m.targetId && m.sourcePlayerId === unit.owner && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0);
        if (atkCostSrc) costModStrs.push(`[cost] ${atkCostSrc.sourceName ?? 'Coste ataque'}: +${atkCostSrc.value} PA`);
        const actCostSrc = state.activeModifiers.find(m => m.stat === 'actionCost' && m.targetId === unit.id && m.sourcePlayerId === unit.owner && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0);
        if (actCostSrc) costModStrs.push(`[cost] ${actCostSrc.sourceName ?? 'Coste acción'}: +${actCostSrc.value} PA`);

        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                type: 'attack' as const,
                attackerId: unit.id,
                targetId: target.id,
                die1: 0, die2: 0, total: 1,
                difficulty: 1,
                baseDifficulty: 1,
                hit: true,
                damage: cfg.fixedDamage,
                baseAttack: cfg.fixedDamage,
                counterDamage: 0,
                attackerClass: unit.class,
                targetClass: target.class,
                targetKilled: targetDead,
                attackName: cfg.displayName ?? 'Patada acrobática',
                modifiers: [...costModStrs],
                paCost: baseCost + costMods,
                configId: cfg.id,
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
        return s;
    }

    // Ejecutar: ataque con daño fijo 2, requiere objetivo ≤2 HP adyacente
    if (cfg.fixedDamage !== undefined && action.abilityId === 'ejecutar') {
        if ((unit.flags ?? []).includes('basic_attack')) return state;
        if (target.hp > 2) return state;
        if (distance !== 1) return state;

let s = state;


        const result: AttackResult = resolveAttack({
            state: s, unit, target,
            from: unit.position, to: target.position, distance,
            fixedDamage: cfg.fixedDamage,
            noCritical: true,
            configId: cfg.id,
            paCost: baseCost + costMods,
        });

        s = result.state;
    s = storeAttackResult(result, unit.id, target.id, unit.class, target.class, `ability.${cfg.id}.name`, actualPaCost ?? (baseCost + costMods), undefined, preTimesDamaged, voiceKey);

        // Ocupar posición si murió
        if (s.graveyard[target.id]) {
            s = { ...s, pendingOccupation: { unitId: unit.id, position: target.position } };
        }
        return s;
    }

    let s = state;
    // AP already consumed by handleAbility

    // Override unit stats from config for this attack
    const attackUnit = {
        ...unit,
        attack: typeof cfg.base.attack === 'number' ? cfg.base.attack : unit.attack + (cfg.extraAttack ?? 0),
        difficulty: typeof cfg.base.difficulty === 'number' ? cfg.base.difficulty : unit.difficulty + (cfg.extraDifficulty ?? 0),
    };

    const result: AttackResult = resolveAttack({
        state: s, unit: attackUnit, target,
        from: unit.position, to: target.position, distance,
        fixedDamage: cfg.fixedDamage,
        configId: cfg.id,
        paCost: baseCost + costMods,
    });

    s = result.state;

    // Store game history first (reusing legacy helper)
    s = storeAttackResult(result, unit.id, target.id, unit.class, target.class, `ability.${cfg.id}.name`, actualPaCost ?? (baseCost + costMods), undefined, preTimesDamaged, voiceKey);

    // Avance: ocupar posición del enemigo eliminado si la unidad tiene la pasiva
    if (s.graveyard[target.id] && target.class !== 'general' && (unit.abilities ?? []).includes('avance')) {
        s = { ...s, pendingOccupation: { unitId: unit.id, position: target.position } };
    }

    // Liderar a las tropas (Capitán de la Guardia): cuando el General ataca
    const capIdentity = state.players[unit.owner]?.selectedIdentity ?? '';
    if (unit.class === 'general' && capIdentity.startsWith('capitan_guardia')) {
        const targetDead = !!s.graveyard[target.id];
            const bonus = targetDead ? 2 : 1;
            const affectedIds = Object.values(s.units)
                .filter(u => u.owner === unit.owner && (u.class === 'infantry' || u.class === 'general') && u.id !== unit.id)
                .map(u => u.id);
            const liderCfg = ABILITY_CONFIG['liderar_tropas'];
            const liderEffect = liderCfg?.effects?.[0];
            for (const uid of affectedIds) {
                s = addModifier(s, unit.owner, uid, 'attack', bonus, 'ADD', liderEffect?.duration ?? 1, liderEffect?.remainingUses, 'ability', 'liderar_tropas');
            }
        s = { ...s, gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`, turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: unit.owner, unitId: unit.id, type: 'support' as const,
            cardId: 'liderar_tropas',
            cardName: 'ability.liderar_tropas.name',
            configId: 'liderar_tropas',
            sourceClass: unit.class,
            alliesHit: affectedIds,
            details: affectedIds.length > 0 ? `+${bonus} · ${affectedIds.join(',')}` : `+${bonus}`,
            paCost: 0,
        }], nextHistoryId: s.nextHistoryId + 1 };
    }

    // Proyección (Punta de Lanza): primer ataque de lancero hace 1 daño a 2 hex detrás
    if (result.hit && unit.proyeccionActive && (unit.class === 'general' || unit.class === 'lancer')) {
        const dq = target.position.q - unit.position.q;
        const dr = target.position.r - unit.position.r;
        const dist = hexDistance(unit.position, target.position);
        if (dist > 0) {
            const stepQ = Math.round(dq / dist);
            const stepR = Math.round(dr / dist);
            const behindHexes = [
                { q: target.position.q + stepQ, r: target.position.r + stepR },
                { q: target.position.q + stepQ * 2, r: target.position.r + stepR * 2 },
            ].filter(h => isWithinBounds(h, s.map.radius));
            const hitUnits: { id: string; class: string; owner: string }[] = [];
            for (const h of behindHexes) {
                const hitUnit = Object.values(s.units).find(u => u.position.q === h.q && u.position.r === h.r);
                if (hitUnit && hitUnit.owner !== unit.owner) {
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
                        playerId: unit.owner, type: 'attack' as const,
                        attackerId: unit.id, targetId: target.id,
                        die1: 0, die2: 0, total: 0, difficulty: 10, baseDifficulty: 10,
                        hit: true, damage: hitUnits.length, baseAttack: hitUnits.length, counterDamage: 0,
                        attackerClass: unit.class, targetClass: hitUnits[0]?.class ?? unit.class,
                        attackName: 'ability.proyeccion.name',
                        configId: 'proyeccion',
                        modifiers: hitUnits.map(t => `[${t.owner === unit.owner ? 'ally' : 'enemy'}]${t.id}: 1 daño`),
                        enemiesHit: hitUnits.filter(t => t.owner !== unit.owner).map(t => t.id),
                        paCost: 0,
                    } as any],
                    nextHistoryId: s.nextHistoryId + 1,
                };
            }
        }
        // Limpiar proyección de todos los lanceros
        let uu = { ...s.units };
        for (const id of Object.keys(uu)) {
            if (uu[id].owner === unit.owner && uu[id].class === 'lancer') {
                uu[id] = { ...uu[id], proyeccionActive: false };
            }
        }
        s = { ...s, units: uu };
    }

    // Apply post-hit effects from config (onHit timing)
    if (result.hit && cfg.effects) {
        // New format: processEffects for trigger, modifierPush onHit
        const hitCtx: EffectContext = {
            state: s, unit, timing: 'onHit',
            target, attacker: unit, defender: target,
            configId: cfg.id,
        };
        s = processEffects(s, cfg.effects, hitCtx);
        // Legacy: surcharge, inmovil, occupation
        for (const effect of cfg.effects) {
            if (effect.type === 'surcharge') {
                if (s.activeModifiers.some(m => m.stat === 'actionCost' && m.targetId === target.id && m.source === 'ability' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0)) break;
                s = addModifier(s, target.owner, target.id, 'actionCost', effect.value ?? 1, 'ADD', effect.remainingTurns ?? 100, effect.remainingUses ?? 1, 'ability', cfg.id);
            } else if (effect.type === 'inmovil' && !s.graveyard[target.id]) {
                s = addModifier(s, target.owner, target.id, 'inmovil', 1, 'SET', effect.duration ?? 1, undefined, 'ability', cfg.id);
            } else if (effect.type === 'occupation') {
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
        }
    }

    // A la carga: push enemy after hit
    if (action.abilityId === 'a_la_carga' && action.to && result.hit && !s.graveyard[target.id]) {
        const dest = action.to;
        if (isWithinBounds(dest, s.map.radius) && (dest.q !== target.position.q || dest.r !== target.position.r)) {
            if (!isHexOccupied(s, dest, target.id)) {
                s = updateUnit(s, target.id, (u) => ({ ...u, position: dest }));
            }
        }
    }

    return s;
}

function handleSupport(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number, voiceKey?: string): GameState {
    let s = state;
    // AP already consumed by handleAbility

    if (cfg.effects) {
        for (const effect of cfg.effects) {
            if (effect.type === 'heal' && effect.target === 'self') {
                const maxHp = BASE_STATS[unit.class].hp;
                const healAmount = Math.min(effect.value ?? 3, maxHp - unit.hp);
                s = updateUnit(s, unit.id, (u) => ({ ...u, hp: u.hp + healAmount }));
            } else if (effect.type === 'buff' && effect.target === 'ally') {
                if (!action.targetId) return state;
                const buffTarget = state.units[action.targetId];
                if (!buffTarget || buffTarget.owner !== unit.owner) return state;
                const dist = hexDistance(unit.position, buffTarget.position);
                const maxRange = cfg.range ?? 2;
                if (dist > maxRange) return state;
                s = addModifier(s, unit.owner, action.targetId, 'attack', effect.value ?? 1, 'ADD', 0, effect.duration ?? 1, 'ability', cfg.displayName ?? cfg.id);
            } else if (effect.type === 'attack' && effect.target === 'ally') {
                if (!action.targetId) return state;
                const atkTarget = state.units[action.targetId];
                if (!atkTarget || atkTarget.owner !== unit.owner) return state;
                const dist = hexDistance(unit.position, atkTarget.position);
                const maxRange = typeof cfg.range === 'object' ? (cfg.range as any).value ?? 3 : (cfg.range ?? 3);
                if (dist > maxRange) return state;
                s = addModifier(s, unit.owner, action.targetId, 'attack', effect.value ?? 1, 'ADD', effect.duration ?? 0, effect.remainingUses, 'ability', cfg.id);
            } else if (effect.type === 'defense' && effect.target === 'ally') {
                if (!action.targetId) return state;
                const defTarget = state.units[action.targetId];
                if (!defTarget || defTarget.owner !== unit.owner) return state;
                const dist = hexDistance(unit.position, defTarget.position);
                const maxRange = typeof cfg.range === 'object' ? (cfg.range as any).value ?? 3 : (cfg.range ?? 3);
                if (dist > maxRange) return state;
                s = addModifier(s, unit.owner, action.targetId, 'defense', effect.value ?? 1, 'ADD', effect.duration ?? 0, effect.remainingUses, 'ability', cfg.id);
                // Custom ID for proteger
                if (cfg.id === 'proteger') {
                    const last = s.activeModifiers[s.activeModifiers.length - 1];
                    if (last) {
                        s = { ...s, activeModifiers: s.activeModifiers.map((m, i) =>
                            i === s.activeModifiers.length - 1 ? { ...m, id: `proteger_${action.targetId}` } : m
                        ) };
                    }
                }
            } else if (effect.type === 'shield' && effect.target === 'ally') {
                if (!action.targetId) return state;
                const shieldTarget = state.units[action.targetId];
                if (!shieldTarget || shieldTarget.owner !== unit.owner) return state;
                s = updateUnit(s, action.targetId, (u) => ({
                    ...u, royalShieldSavedHp: u.hp, hp: u.hp + (effect.value ?? 3),
                }));
            }
        }
    }

    // Ability-specific post-flags
    if (action.abilityId === 'a_la_carga') {
        const currentCost = state.players[unit.owner]?.aLaCargaCost ?? 0;
        if ((state.players[unit.owner]?.actionPoints ?? 0) < currentCost) return state;
        s = consumeAP(s, unit.owner, currentCost);
        const nextCost = Math.min(currentCost + 1, 2);
        s = {
            ...s,
            players: {
                ...s.players,
                [unit.owner]: { ...s.players[unit.owner], aLaCargaCost: nextCost },
            },
        };
        s = updateUnit(s, unit.id, (u) => ({ ...u, flags: [...(u.flags ?? []), 'a_la_carga'] }));
        // Build history entry
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                unitId: unit.id,
                type: 'support' as const,
                cardId: cfg.id,
                cardName: `ability.${cfg.id}.name`,
                cardType: 'BUFF' as const,
                targetId: unit.id,
                targetClass: unit.class,
                details: `coste ${currentCost} PA, próximo ${nextCost}`,
                paCost: currentCost,
                sourceClass: unit.class,
                sourceIdentityKey: 'caballos_guerra',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    } else if (action.abilityId === 'angel_guardian') {
        if ((unit.flags ?? []).includes('angel_guardian')) return state;

        const allies = Object.values(s.units).filter(u => u.owner === unit.owner && u.class !== 'general');
        const allyIds: string[] = [];
        for (const u of allies) {
            s = updateUnit(s, u.id, (u2) => ({ ...u2, auraShield: (u2.auraShield ?? 0) + 2 }));
            allyIds.push(u.id);
        }
        let healedId = '';
        const allUnits = Object.values(s.units).filter(u => u.owner === unit.owner);
        const missing = allUnits.map(u => ({ id: u.id, missing: BASE_STATS[u.class].hp - u.hp }));
        const maxMissing = Math.max(...missing.map(m => m.missing));
        if (maxMissing > 0) {
            const candidates = missing.filter(m => m.missing === maxMissing);
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            const maxHp = BASE_STATS[s.units[chosen.id].class].hp;
            s = updateUnit(s, chosen.id, (u) => ({ ...u, hp: Math.min(u.hp + 1, maxHp) }));
            healedId = chosen.id;
        }
        s = updateUnit(s, unit.id, (u) => ({ ...u, flags: [...(u.flags ?? []), 'angel_guardian'] }));
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                unitId: unit.id,
                type: 'support' as const,
                cardId: cfg.id,
                cardName: `ability.${cfg.id}.name`,
                cardType: 'BUFF' as const,
                targetId: healedId || unit.id,
                targetClass: healedId ? (s.units[healedId]?.class ?? unit.class) : unit.class,
                alliesHit: allyIds,
                details: `Escudo +2 HP a ${allyIds.length} aliados${healedId ? ` · +1 HP a [${healedId}]` : ''}`,
                paCost: baseCost + costMods,
                sourceClass: unit.class,
                sourceIdentityKey: 'escudo_comandante',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    } else if (action.abilityId === 'rayo_celestial') {
        s = updateUnit(s, unit.id, (u) => ({ ...u, flags: [...(u.flags ?? []), 'rayo_celestial'] }));
        // Build history entry
        const buffTarget = action.targetId ? state.units[action.targetId] : undefined;
        const sourceIdentity = 'dios_trueno';
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                unitId: unit.id,
                type: 'support' as const,
                cardId: cfg.id,
                configId: cfg.id,
                cardName: `ability.${cfg.id}.name`,
                cardType: 'BUFF' as const,
                targetId: action.targetId,
                targetClass: buffTarget?.class,
                details: `+${cfg.effects?.[0]?.value ?? 3} ataque al siguiente ataque`,
                paCost: baseCost + costMods,
                sourceClass: unit.class,
                sourceIdentityKey: sourceIdentity,
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    } else if (action.abilityId === 'en_nombre_del_rey') {
        s = updateUnit(s, unit.id, (u) => ({ ...u, flags: [...(u.flags ?? []), 'en_nombre_del_rey'] }));
        const buffTarget = action.targetId ? state.units[action.targetId] : undefined;
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`, turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner, unitId: unit.id, type: 'support' as const,
                cardId: cfg.id, cardName: `ability.${cfg.id}.name`, cardType: 'BUFF' as const,
                targetId: action.targetId, targetClass: buffTarget?.class,
                details: '+2 ataque · Escudo +3 HP',
                paCost: baseCost + costMods,
                sourceClass: unit.class, sourceIdentityKey: 'inspiracion_real',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    } else if (action.abilityId === 'sacrificar') {
        if (!action.targetId) return state;
        const ally = state.units[action.targetId];
        if (!ally || ally.owner !== unit.owner) return state;
        const sacDist = hexDistance(unit.position, ally.position);
        if (sacDist > 1) return state;
        const maxHp = BASE_STATS[unit.class].hp;
        if (unit.hp >= maxHp) return state;

        s = dealDamage(s, ally.id, 2);
        const allyDied = !!s.graveyard[ally.id];
        const healAmount = allyDied ? 5 : 3;
        s = updateUnit(s, unit.id, (u) => ({ ...u, hp: Math.min(u.hp + healAmount, maxHp) }));
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`, turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner, unitId: unit.id, type: 'support' as const,
                cardId: cfg.id, cardName: `ability.${cfg.id}.name`, cardType: 'BUFF' as const,
                targetId: ally.id, targetClass: ally.class,
                alliesHit: [ally.id, unit.id],
                details: `-2 HP a [${ally.id}] · +${allyDied ? '5' : '3'} HP a [${unit.id}]`,
                paCost: baseCost + costMods,
                sourceClass: unit.class,
                sourceIdentityKey: 'furia_tirano',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    }

    // Generic support history entry for abilities with effects
    if (cfg.effects && cfg.effects.length > 0 && !cfg.flags?.skipGenericHistoryEntry) {
        s = { ...s, gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`,
            turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                unitId: unit.id,
                type: 'support' as const,
                cardId: cfg.id,
                configId: cfg.id,
                cardName: `ability.${cfg.id}.name`,
                cardType: 'BUFF' as const,
            targetId: action.targetId ?? unit.id,
            targetClass: action.targetId ? (state.units[action.targetId]?.class ?? unit.class) : unit.class,
            paCost: baseCost + costMods,
            details: cfg.effects.map(e => {
                if (e.activation?.turnStart || e.timing === 'turnStart') return ''; // Turn-start passives not applied on use
                if (e.type === 'stateChange' && e.healType === 'hp') return `+${e.value ?? 3} HP`;
                if (e.type === 'heal') return `+${e.value ?? 3} HP`;
                if (e.type === 'attack') return `+${e.value ?? 1} ataque`;
                if (e.type === 'defense') return `+${e.value ?? 1} defensa`;
                if (e.type === 'buff') return `+${e.value ?? 1}`;
                if (e.type === 'shield') return `Escudo +${e.value ?? 3} HP`;
                return '';
            }).filter(Boolean).join(' · '),
            sourceClass: unit.class,
            voiceKey,
        }], nextHistoryId: s.nextHistoryId + 1 };
    }

    // Consume cost modifiers (actionCost) after the ability executes
    if (costMods > 0) {
        s = consumeModifier(s, unit.owner, 'actionCost', costMods, unit.id);
    }

    return s;
}

function handleMove(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number, moveFinalCost?: number, voiceKey?: string): GameState {
    if (!action.to && !action.path) return state;

    // Check move replacement flags
    if (cfg.flags?.replacesMove && (unit.flags ?? []).includes('move')) return state;

    // Path-based movement (cabalgar_2)
    if (action.path && action.path.length >= 2) {
        return handlePathMove(state, action, unit, cfg, baseCost, costMods);
    }

    // Posición estratégica: special handling
    if (action.abilityId === 'posicion_estrategica') {
        if ((unit.flags ?? []).includes('posicion_estrategica')) return state;
        const hasAdjacentAlly = Object.values(state.units)
            .some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(action.to!, u.position) === 1);
        if (!hasAdjacentAlly) return state;
        let s = updateUnit(state, unit.id, (u) => ({
            ...u, position: action.to!, flags: [...(u.flags ?? []), 'posicion_estrategica'],
        }));
        return s;
    }

    // Config-driven validation: check if destination hex is a valid target
    const hasRangeCfg = typeof cfg.range === 'object' && cfg.range && Object.keys(cfg.range).length > 0;
    const hasTargetCfg = typeof cfg.target === 'object' && cfg.target && Object.keys(cfg.target).length > 0;
    if (hasRangeCfg || hasTargetCfg) {
        const highlights = getAbilityHighlights(state, unit.id, cfg.id);
        const isValid = highlights.some(h => h.highlight !== 'range' && h.hex.q === action.to!.q && h.hex.r === action.to!.r);
        if (!isValid) return state;
    }

    let s = state;
    // AP already consumed by handleAbility

    // Record previous position for front-range abilities (carga)
    const lastHex = unit.position;

    s = updateUnit(s, unit.id, (u) => ({
        ...u, position: action.to!,
        lastHex,
        flags: [...new Set([...(u.flags ?? []), 'move'])],
    }));

    // Consume cost modifiers (actionCost) after the ability executes
    if (costMods > 0) {
        s = consumeModifier(s, unit.owner, 'actionCost', costMods, unit.id);
    }

    return s;
}

// Path-based movement (cabalgar_2): action.path = array of hexes
function handlePathMove(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number): GameState {
    const path = action.path!;
    if (path.length < 2 || path.length > 3) return state;
    let prevPos = unit.position;
    for (const hex of path) {
        if (hexDistance(prevPos, hex) !== 1) return state;
        if (isHexOccupied(state, hex, unit.id)) return state;
        prevPos = hex;
    }
    const dest = path[path.length - 1];
    if (isHexOccupied(state, dest, unit.id)) return state;

let s = state;


    const originPos = path.length >= 2 ? path[path.length - 2] : unit.position;

    s = updateUnit(s, unit.id, (u) => ({
        ...u, position: dest,
        lastHex: originPos,
        flags: [...new Set([...(u.flags ?? []), 'move'])],
    }));

    // Consume cost modifiers (actionCost) after the ability executes
    if (costMods > 0) {
        s = consumeModifier(s, unit.owner, 'actionCost', costMods, unit.id);
    }

    return s;
}
