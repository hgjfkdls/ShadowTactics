import type { GameState, Unit } from '../state';
import type { ConfigEffect, EffectTiming, AbilityConfig } from '../data/ability-config/types';
import { ABILITY_CONFIG } from '../data/ability-config';
import { updateUnit, dealDamage, isHexOccupied, isWithinBounds } from '../utils';
import { addModifier, removeModifier } from '../modifiers/engine';
import { hexDistance } from '../../hex';
import { BASE_STATS } from '../units';

export type EffectContext = {
    state: GameState;
    unit: Unit;          // The unit that owns the ability
    target?: Unit;       // The target of the effect (defender, ally, etc.)
    attacker?: Unit;     // The attacker (for combat context)
    defender?: Unit;     // The defender (for combat context)
    side?: 'attacker' | 'defender';
    result?: { damage: number; difficulty: number; [key: string]: any };
    timing: EffectTiming;
    configId?: string;
    activePlayer?: string; // For turnStart: whose turn is starting
};

function matchesFilter(unit: Unit, target: Unit | undefined, filter: ConfigEffect['targetFilter'], ctx: EffectContext): boolean {
    if (!filter) return true;
    const tgt = target ?? ctx.defender ?? ctx.target;
    if (filter.classes && !filter.classes.includes(unit.class)) return false;
    if (filter.isolated !== undefined && tgt) {
        const hasAlly = Object.values(ctx.state.units).some(u =>
            u.owner === tgt.owner && u.id !== tgt.id && hexDistance(tgt.position, u.position) === 1
        );
        if (filter.isolated && hasAlly) return false;
        if (!filter.isolated && !hasAlly) return false;
    }
    if (filter.hpMaxPercent !== undefined) {
        const maxHp = BASE_STATS[unit.class as keyof typeof BASE_STATS]?.hp ?? 10;
        if ((unit.hp / maxHp) * 100 > filter.hpMaxPercent) return false;
    }
    if (filter.targetHpMaxPercent !== undefined && tgt) {
        const maxHp = BASE_STATS[tgt.class as keyof typeof BASE_STATS]?.hp ?? 10;
        if ((tgt.hp / maxHp) * 100 > filter.targetHpMaxPercent) return false;
    }
    if (filter.didMovePreviousTurn !== undefined) {
        if ((unit.didMovePreviousTurn ?? false) !== filter.didMovePreviousTurn) return false;
    }
    if (filter.targetDidMovePreviousTurn !== undefined && tgt) {
        if (ctx.state.turn <= 1) return false;
        if ((tgt.didMovePreviousTurn ?? false) !== filter.targetDidMovePreviousTurn) return false;
    }
    if (filter.lastTargetId !== undefined && tgt) {
        if (unit.lastTargetId !== tgt.id) return false;
    }
    if (filter.isBasicAttack !== undefined) {
        const isBasic = ctx.configId === 'ataque_basico';
        if (filter.isBasicAttack && !isBasic) return false;
        if (!filter.isBasicAttack && isBasic) return false;
    }
    if (filter.allyClassesAdjacent && tgt) {
        const hasAllyOfClass = Object.values(ctx.state.units).some(u =>
            u.owner === tgt.owner && u.id !== tgt.id
            && filter.allyClassesAdjacent!.includes(u.class)
            && hexDistance(tgt.position, u.position) === 1
        );
        if (!hasAllyOfClass) return false;
    }
    return true;
}

function getEffectValue(effect: ConfigEffect, ctx: EffectContext): number {
    const unit = ctx.unit;
    const target = ctx.defender ?? ctx.target;
    let val = effect.value ?? 1;
    if (effect.identityBonus) {
        const identity = ctx.state.players[unit.owner]?.selectedIdentity ?? '';
        for (const [prefix, bonus] of Object.entries(effect.identityBonus)) {
            if (identity.startsWith(prefix)) val += bonus;
        }
    }
    if (effect.conditionalValue) {
        for (const cv of effect.conditionalValue) {
            let matches = true;
            if (cv.attackerClasses && !cv.attackerClasses.includes(unit.class)) matches = false;
            if (cv.excludeTargetClasses && target && cv.excludeTargetClasses.includes(target.class)) matches = false;
            const targetClassList = cv.targetClasses ?? cv.includeTargetClasses;
            if (targetClassList && target && !targetClassList.includes(target.class)) matches = false;
            if (!matches) continue;
            if ((cv.operator ?? 'set') === 'set') return cv.value;
            val += cv.value;
        }
    }
    return val;
}

function getTargetUnits(ctx: EffectContext, target: string): Unit[] {
    const s = ctx.state;
    switch (target) {
        case 'self': return ctx.unit ? [ctx.unit] : [];
        case 'attacker': return ctx.attacker ? [ctx.attacker] : [];
        case 'defender': return ctx.defender ? [ctx.defender] : [];
        case 'killer': return []; // handled by onKill context
        case 'player': return [];
        case 'ally': return ctx.target ? [ctx.target] : [];
        case 'all_allies': return Object.values(s.units).filter(u => u.owner === ctx.unit.owner);
        case 'enemies': return Object.values(s.units).filter(u => u.owner !== ctx.unit.owner);
        default: return [];
    }
}

export function processEffects(state: GameState, effects: ConfigEffect[], ctx: EffectContext): GameState {
    let s = state;

    for (const effect of effects) {
        // Filter by timing (default onUse)
        const effTiming = effect.timing ?? 'onUse';
        if (effTiming !== ctx.timing) continue;

        // Check targetFilter
        const units = getTargetUnits(ctx, effect.target);
        for (const unit of units) {
            if (!matchesFilter(unit, ctx.defender ?? ctx.target, effect.targetFilter, ctx)) continue;

            switch (effect.type) {
                // ─── flagPush ───
                case 'flagPush': {
                    if (effect.target === 'player') {
                        s = {
                            ...s,
                            players: {
                                ...s.players,
                                [ctx.unit.owner]: {
                                    ...s.players[ctx.unit.owner],
                                    flags: [...new Set([...(s.players[ctx.unit.owner]?.flags ?? []), ...(effect.flags ?? [])])],
                                } as any,
                            },
                        };
                    } else {
                        s = updateUnit(s, unit.id, (u) => ({
                            ...u,
                            flags: [...new Set([...(u.flags ?? []), ...(effect.flags ?? [])])],
                        }));
                    }
                    break;
                }

                // ─── flagPop ───
                case 'flagPop': {
                    s = updateUnit(s, unit.id, (u) => ({
                        ...u,
                        flags: (u.flags ?? []).filter(f => !(effect.flags ?? []).includes(f)),
                    }));
                    break;
                }

                // ─── modifierPush ───
                case 'modifierPush': {
                    const operator = effect.operator ?? 'ADD';
                    const val = getEffectValue(effect, ctx);
                    s = addModifier(s, unit.owner, unit.id, effect.stat ?? '', val, operator, effect.remainingTurns, effect.remainingUses, 'ability', ctx.configId ?? '');
                    break;
                }

                // ─── modifierPop ───
                case 'modifierPop': {
                    for (const id of effect.modifierIds ?? []) {
                        const mods = s.activeModifiers.filter(m => m.sourceName === id);
                        for (const m of mods) {
                            s = removeModifier(s, m.id);
                        }
                    }
                    break;
                }

                // ─── combatMutator ───
                case 'combatMutator': {
                    if (!ctx.result) break;
                    const val = getEffectValue(effect, ctx);
                    if (effect.stat === 'attack') {
                        ctx.result.damage += val;
                    } else if (effect.stat === 'defense') {
                        ctx.result.damage = Math.max(1, ctx.result.damage - val);
                    } else if (effect.stat === 'difficulty') {
                        ctx.result.difficulty += val;
                    } else if (effect.stat === 'ignoresPassives') {
                        (ctx.result as any).ignoresPassives = true;
                    } else if (effect.stat === 'nullifyCharge') {
                        ctx.result.damage = Math.max(1, ctx.result.damage - val);
                    }
                    break;
                }

                // ─── stateChange ───
                case 'stateChange': {
                    const val = getEffectValue(effect, ctx);
                    if (effect.healType === 'hp') {
                        const maxHp = BASE_STATS[unit.class as keyof typeof BASE_STATS]?.hp ?? 10;
                        const newHp = Math.min(unit.hp + val, maxHp);
                        s = updateUnit(s, unit.id, (u) => ({ ...u, hp: Math.max(0, newHp) }));
                    } else if (effect.healType === 'shield') {
                        s = updateUnit(s, unit.id, (u) => ({
                            ...u,
                            royalShieldSavedHp: u.hp,
                            hp: u.hp + val,
                        }));
                    } else {
                        // PA modification
                        const ap = (s.players[unit.owner]?.actionPoints ?? 0) + val;
                        s = {
                            ...s,
                            players: {
                                ...s.players,
                                [unit.owner]: { ...s.players[unit.owner], actionPoints: Math.max(0, ap) },
                            },
                        };
                    }
                    break;
                }

                // ─── trigger ───
                case 'trigger': {
                    if (effect.trigger === 'occupation') {
                        const target = ctx.defender ?? ctx.target;
                        if (target) {
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
                    } else if (effect.trigger === 'postHit') {
                        s = updateUnit(s, unit.id, (u) => ({ ...u, timesDamagedThisTurn: (u.timesDamagedThisTurn ?? 0) + 1 }));
                    }
                    break;
                }

                // ─── indicator (UI-only, no-op en servidor) ───
                case 'indicator':
                    break;
            }
        }
    }

    return s;
}
