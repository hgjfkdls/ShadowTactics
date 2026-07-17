import type { GameState, Unit } from '../state';
import type { AttackInput } from './resolver';
import { getModifierSum, consumeModifier } from '../modifiers/engine';
import { dealDamage, updateUnit } from '../utils';
import { BASE_STATS } from '../units';
import { hexDistance } from '../../hex';
import { getAuraBuffs } from '../aura';
import { ABILITY_CONFIG } from '../data/ability-config';
import { applyConfigEffectsToCombat, applyConfigEffectsToState, onHpChange } from '../passive';
import { debugLog } from '../../debug';
import { initDebug } from '../../debug';

initDebug();

export type CombatResult = {
    difficulty: number;
    damage: number;
    attackCost: number;
    actionCost: number;
    ignoresPassives: boolean;
};

export type AbilityContext = {
    state: GameState;
    attacker: Unit;
    defender: Unit;
    distance: number;
    roll: number;
    ctx: Partial<AttackInput>;
    abilitySide: 'attacker' | 'defender';
};

type AbilityHandler = {
    onCost?: (ctx: AbilityContext, result: CombatResult) => void;
    onDifficulty?: (ctx: AbilityContext, result: CombatResult) => void;
    onDamage?: (ctx: AbilityContext, result: CombatResult) => void;
    onDefense?: (ctx: AbilityContext, result: CombatResult) => void;
    onPostHit?: (ctx: AbilityContext, state: GameState, hit: boolean) => GameState;
};

const ABILITY_EFFECTS: Record<string, AbilityHandler> = {
    doble_ataque: {
    },
    patada_acrobatica: {
    },
};

export function getUnitModifiers(state: GameState, playerId: string, unitId?: string): { difficulty: number; attackMod: number; defenseMod: number; attackCost: number; actionCost: number } {
    return {
        difficulty: getModifierSum(state, playerId, unitId ?? null, 'difficulty'),
        attackMod: getModifierSum(state, playerId, unitId ?? null, 'attack'),
        defenseMod: getModifierSum(state, playerId, unitId ?? null, 'defense'),
        attackCost: getModifierSum(state, playerId, unitId ?? null, 'attackCost'),
        actionCost: getModifierSum(state, playerId, unitId ?? null, 'actionCost'),
    };
}

export function applyDifficultyAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDifficulty?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    for (const ability of ctx.defender.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDifficulty?.({ ...ctx, abilitySide: 'defender' }, result);
    }
    // Only apply difficulty modifiers allowed by the ability config
    const cfgId = ctx.ctx?.configId;
    const allowed = cfgId ? (ABILITY_CONFIG[cfgId]?.allowedModifiers ?? []) : [];
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner, ctx.attacker.id);
    if (allowed.includes('difficulty') || !cfgId) {
        result.difficulty += mods.difficulty;
    }

    // Aura de mando: arqueros cerca del general reducen dificultad de sus ataques
    if (ctx.attacker.class === 'general') {
        const buffs = getAuraBuffs(ctx.state, ctx.attacker.owner);
        if (buffs.difficultyReduction > 0) result.difficulty -= buffs.difficultyReduction;
    }

    // Aura de mando: caballería cerca del general enemigo da +dificultad al atacar
    if (ctx.defender.class === 'general') {
        const buffs = getAuraBuffs(ctx.state, ctx.defender.owner);
        if (buffs.difficultyPenalty > 0) result.difficulty += buffs.difficultyPenalty;
    }

    // Config-driven passive effects (difficulty type)

    applyConfigEffectsToCombat(ctx, result, 'attacker');
    applyConfigEffectsToCombat(ctx, result, 'defender');

}

export function applyDamageAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDamage?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    const cfgId = ctx.ctx?.configId;
    const allowed = cfgId ? (ABILITY_CONFIG[cfgId]?.allowedModifiers ?? []) : [];
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner, ctx.attacker.id);
    debugLog('applyDamageAbilities: base damage=' + result.damage + ', attackMod=' + mods.attackMod + ', allowed.includes(attack)=' + (allowed.includes('attack') || !cfgId));
    // Ataque saliente: attack modifiers (Avanzar, Mantenimiento de equipo, etc.)
    if (allowed.includes('attack') || !cfgId) {
        result.damage += mods.attackMod;
    }

	// Config-driven passive effects (attack type)

    applyConfigEffectsToCombat(ctx, result, 'attacker');
    debugLog('applyDamageAbilities: final damage=' + result.damage);

}

export function applyCostAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onCost?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner, ctx.attacker.id);
    result.attackCost += mods.attackCost;
    result.actionCost += mods.actionCost;
}

export function applyDefenseAbilities(ctx: AbilityContext, result: CombatResult): void {
    const mods = getUnitModifiers(ctx.state, ctx.defender.owner, ctx.defender.id);

    // Only apply defense modifiers allowed by the ability config
    const cfgId = ctx.ctx?.configId;
    const allowed = cfgId ? (ABILITY_CONFIG[cfgId]?.allowedModifiers ?? []) : [];
    let defense = allowed.includes('defense') || !cfgId ? mods.defenseMod : 0;

    // Romper filas: ignora Resistencia y Línea defensiva (no otras defensas como proteger, lanza_escudo)
    const hasRomperFilas = (ctx.attacker.abilities ?? []).includes('romper_filas');
    if (hasRomperFilas) {
        const passiveDef = ctx.state.activeModifiers
            .filter(m => m.stat === 'defense'
                && m.remainingTurns >= 0
                && (!m.remainingUses || m.remainingUses > 0)
                && (m.sourceName === 'resistencia' || m.sourceName === 'linea_defensiva')
                && (m.sourcePlayerId === ctx.defender.owner)
                && (m.targetId === ctx.defender.id))
            .reduce((sum, m) => {
                if (m.operator === 'SET') return m.value;
                if (m.operator === 'MUL') return sum * m.value;
                return sum + m.value;
            }, 0);
        defense -= passiveDef;
    }

    if (defense > 0) {
        result.damage = Math.max(1, result.damage - defense);
    }

    // Config-driven passive effects (defense type)

    applyConfigEffectsToCombat(ctx, result, 'defender');


	// Aura de mando: lanceros cerca del general dan +defensa
    if (ctx.defender.class === 'general') {
        const buffs = getAuraBuffs(ctx.state, ctx.defender.owner);
        if (buffs.defenseBonus > 0) result.damage = Math.max(1, result.damage - buffs.defenseBonus);
    }
}

export function applyPostHitAbilities(ctx: AbilityContext, state: GameState, hit: boolean): GameState {
    let s = state;
    for (const ability of ctx.attacker.abilities ?? []) {
        s = ABILITY_EFFECTS[ability]?.onPostHit?.({ ...ctx, abilitySide: 'attacker' }, s, hit) ?? s;
    }
    for (const ability of ctx.defender.abilities ?? []) {
        s = ABILITY_EFFECTS[ability]?.onPostHit?.({ ...ctx, abilitySide: 'defender' }, s, hit) ?? s;
    }
    // Config-driven passive effects (post-hit)
    s = applyConfigEffectsToState({ attacker: ctx.attacker, defender: ctx.defender }, s, hit);
    // Sync conditional modifiers (hpMaxPercent passives like furia_berserker) for defender
    s = onHpChange(s, ctx.defender.id);
    if (hit) s = onHpChange(s, ctx.attacker.id);

    // Config-driven consume modifiers on hit (robar_ricos)
    if (hit) {
        for (const source of Object.values(s.units)) {
            for (const abilId of source.abilities ?? []) {
                const cfg = ABILITY_CONFIG[abilId];
                if (!cfg?.effects) continue;
                for (const effect of cfg.effects) {
                    if (effect.type !== 'stateChange') continue;
                    if ((effect.timing ?? 'onUse') !== 'onHit') continue;
                    if (!effect.consume) continue;
                    // Check isBasicAttack filter
                    const tfBasic = effect.targetFilter?.isBasicAttack;
                    const isBasic = ctx.ctx?.configId === 'ataque_basico';
                    if (tfBasic !== undefined && tfBasic !== isBasic) continue;
                    // Check if attacker has the modifier
                    const hasMod = s.activeModifiers.some(m =>
                        m.stat === effect.consume.stat
                        && m.targetId === ctx.attacker.id
                        && m.sourcePlayerId === ctx.attacker.owner
                        && (m.remainingUses ?? 1) > 0
                    );
                    if (!hasMod) continue;
                    // Heal
                    let healed = false;
                    if (effect.healType === 'hp') {
                        const maxHp = BASE_STATS[ctx.attacker.class as keyof typeof BASE_STATS]?.hp ?? 10;
                        if (ctx.attacker.hp < maxHp) {
                            s = updateUnit(s, ctx.attacker.id, (u) => ({ ...u, hp: Math.min(u.hp + 1, maxHp) }));
                            healed = true;
                        }
                    }
                    // Consume modifiers according to config
                    const amount = effect.consume.amount ?? 1;
                    if (effect.consume.units === 'self') {
                        s = consumeModifier(s, ctx.attacker.owner, effect.consume.stat, amount, ctx.attacker.id);
                    } else if (effect.consume.units === 'all_allies') {
                        const targets = Object.values(s.units).filter(u =>
                            u.owner === ctx.attacker.owner
                            && (!effect.consume.classes || effect.consume.classes.includes(u.class))
                        );
                        for (const t of targets) {
                            s = consumeModifier(s, ctx.attacker.owner, effect.consume.stat, amount, t.id);
                        }
                        s = consumeModifier(s, ctx.attacker.owner, effect.consume.stat, amount); // player-wide
                    }
                    // History entry — store as pending for handleAbility to flush after attack entry
                    if (healed) {
                        s = { ...s, pendingHealEntry: { abilId, attackerId: ctx.attacker.id, attackerClass: ctx.attacker.class } };
                        // Mark identityHealedThisTurn for Robin Hood identity tracking
                        s = {
                            ...s,
                            players: {
                                ...s.players,
                                [ctx.attacker.owner]: {
                                    ...s.players[ctx.attacker.owner],
                                    identityHealedThisTurn: true,
                                } as any,
                            },
                        };
                    }
                }
            }
        }
    }

    return s;
}
