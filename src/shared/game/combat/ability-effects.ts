import type { GameState, Unit } from '../state';
import type { AttackInput } from './resolver';
import { getModifierSum } from '../modifiers/engine';
import { dealDamage, updateUnit } from '../utils';

export type CombatResult = {
    difficulty: number;
    damage: number;
    attackCost: number;
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
    blanco_facil: {
        onDifficulty: (ctx, r) => {
            if (ctx.abilitySide !== 'attacker') return;
            if (!ctx.defender.didMovePreviousTurn) r.difficulty -= 1;
        },
    },
    anti_caballeria: {
        onDamage: (ctx, r) => {
            if (ctx.defender.class === 'cavalry') r.damage += 2;
        },
    },
    presion: {
        onDamage: (ctx, r) => {
            if (ctx.attacker.lastTargetId === ctx.defender.id) r.damage += 1;
        },
        onPostHit: (ctx, s, hit) => {
            if (!hit) return s;
            return updateUnit(s, ctx.attacker.id, (u) => ({ ...u, lastTargetId: ctx.defender.id }));
        },
    },
    formacion_defensiva: {
        onDifficulty: (ctx, r) => {
            if (ctx.ctx.isCarga) r.difficulty += 1;
        },
        onPostHit: (ctx, s, hit) => {
            if (!ctx.ctx.isCarga || hit) return s;
            return dealDamage(s, ctx.attacker.id, 1);
        },
    },
    resistencia: {
        onDefense: (ctx, r) => {
            if (r.ignoresPassives) return;
            if (ctx.abilitySide !== 'defender') return;
            if ((ctx.defender.timesDamagedThisTurn ?? 0) !== 0) return;
            // Si también tiene Línea defensiva y cumple su condición, no se acumulan
            if ((ctx.defender.abilities ?? []).includes('linea_defensiva') && ctx.defender.didMovePreviousTurn === false) return;
            r.damage -= 1;
        },
        onPostHit: (ctx, s, hit) => {
            if (!hit) return s;
            return updateUnit(s, ctx.defender.id, (u) => ({
                ...u, timesDamagedThisTurn: (u.timesDamagedThisTurn ?? 0) + 1
            }));
        },
    },
    linea_defensiva: {
        onDefense: (ctx, r) => {
            if (r.ignoresPassives) return;
            if (ctx.abilitySide !== 'defender') return;
            if (ctx.defender.didMovePreviousTurn === false) r.damage -= 1;
        },
        onPostHit: (ctx, s, hit) => {
            if (!hit) return s;
            return updateUnit(s, ctx.defender.id, (u) => ({
                ...u, timesDamagedThisTurn: (u.timesDamagedThisTurn ?? 0) + 1
            }));
        },
    },
    romper_filas: {
        onDefense: (_ctx, r) => {
            r.ignoresPassives = true;
        },
    },
    doble_ataque: {
    },
    disparo_rapido: {
    },
};

export function getUnitModifiers(state: GameState, playerId: string): { difficulty: number; damage: number; attackCost: number } {
    return {
        difficulty: getModifierSum(state, playerId, null, 'difficulty'),
        damage: getModifierSum(state, playerId, null, 'attack') + getModifierSum(state, playerId, null, 'damage'),
        attackCost: getModifierSum(state, playerId, null, 'attackCost'),
    };
}

export function applyDifficultyAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDifficulty?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    for (const ability of ctx.defender.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDifficulty?.({ ...ctx, abilitySide: 'defender' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner);
    result.difficulty += mods.difficulty;
}

export function applyDamageAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDamage?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner);
    result.damage += mods.damage;
}

export function applyCostAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onCost?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner);
    result.attackCost += mods.attackCost;
}

export function applyDefenseAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDefense?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    for (const ability of ctx.defender.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDefense?.({ ...ctx, abilitySide: 'defender' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.defender.owner);
    result.damage += mods.damage;
}

export function applyPostHitAbilities(ctx: AbilityContext, state: GameState, hit: boolean): GameState {
    let s = state;
    for (const ability of ctx.attacker.abilities ?? []) {
        s = ABILITY_EFFECTS[ability]?.onPostHit?.({ ...ctx, abilitySide: 'attacker' }, s, hit) ?? s;
    }
    for (const ability of ctx.defender.abilities ?? []) {
        s = ABILITY_EFFECTS[ability]?.onPostHit?.({ ...ctx, abilitySide: 'defender' }, s, hit) ?? s;
    }
    return s;
}
