import type { GameState, Unit } from '../state';
import type { AttackInput } from './resolver';
import { getModifierSum } from '../modifiers/engine';
import { dealDamage, updateUnit } from '../utils';
import { BASE_STATS } from '../units';
import { hexDistance } from '../../hex';
import { getAuraBuffs } from '../aura';

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
            if (ctx.defender.didMovePreviousTurn === false) {
                const ownerId = ctx.attacker.owner;
                const identity = ctx.state.players[ownerId]?.selectedIdentity ?? '';
                const isFrancotirador = identity.startsWith('francotirador');
                r.difficulty -= isFrancotirador ? 2 : 1;
            }
        },
    },
    anti_caballeria: {
        onDamage: (ctx, r) => {
            if (ctx.defender.class === 'cavalry' || (ctx.defender.class === 'general' && (ctx.state.players[ctx.defender.owner]?.selectedIdentity ?? '').match(/^(caballos_guerra|cazadores)/))) r.damage += 1;
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
    patada_acrobatica: {
    },
};

export function getUnitModifiers(state: GameState, playerId: string, unitId?: string): { difficulty: number; attackMod: number; defenseMod: number; attackCost: number } {
    return {
        difficulty: getModifierSum(state, playerId, unitId ?? null, 'difficulty'),
        attackMod: getModifierSum(state, playerId, unitId ?? null, 'attack'),
        defenseMod: getModifierSum(state, playerId, unitId ?? null, 'defense'),
        attackCost: getModifierSum(state, playerId, unitId ?? null, 'attackCost'),
    };
}

export function applyDifficultyAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDifficulty?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    for (const ability of ctx.defender.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDifficulty?.({ ...ctx, abilitySide: 'defender' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner, ctx.attacker.id);
    result.difficulty += mods.difficulty;

    // Hostigar (Cazadores) — caballería -1 dificultad si objetivo tiene ≤ 50% HP
    const cazadorIdentity = ctx.state.players[ctx.attacker.owner]?.selectedIdentity ?? '';
    if (cazadorIdentity.startsWith('cazadores')) {
        const isCavalryOrGeneral = ctx.attacker.class === 'cavalry' || ctx.attacker.class === 'general';
        if (isCavalryOrGeneral) {
            const maxHp = BASE_STATS[ctx.defender.class].hp;
            if (ctx.defender.hp <= Math.floor(maxHp / 2)) {
                result.difficulty -= 1;
            }
        }
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
}

export function applyDamageAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDamage?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner, ctx.attacker.id);
    // Ataque saliente: attack modifiers (Avanzar, Mantenimiento de equipo, etc.)
    result.damage += mods.attackMod;

    // Furia berserker (Dios del Trueno) — general e infantería +1 daño si HP ≤ 50%
    const identity = ctx.state.players[ctx.attacker.owner]?.selectedIdentity ?? '';
    if (identity.startsWith('dios_trueno')) {
        const isInfantryOrGeneral = ctx.attacker.class === 'infantry' || ctx.attacker.class === 'general';
        if (isInfantryOrGeneral) {
            const maxHp = BASE_STATS[ctx.attacker.class].hp;
            if (ctx.attacker.hp <= Math.floor(maxHp / 2)) {
                result.damage += 1;
            }
        }
    }

    // Acechar (Cazadores) — general +2 ataque a aisladas (+1 contra general), caballería mitad (+1, no afecta general)
    const cazadorIdentity = ctx.state.players[ctx.attacker.owner]?.selectedIdentity ?? '';
    if (cazadorIdentity.startsWith('cazadores')) {
        const hasAdjacentAlly = Object.values(ctx.state.units)
            .some(u => u.owner === ctx.defender.owner && u.id !== ctx.defender.id && hexDistance(ctx.defender.position, u.position) === 1);
        if (!hasAdjacentAlly) {
            if (ctx.attacker.class === 'general') {
                const bonus = ctx.defender.class === 'general' ? 1 : 2;
                result.damage += bonus;
            } else if (ctx.attacker.class === 'cavalry' && ctx.defender.class !== 'general') {
                result.damage += 1;
            }
        }
    }

    // Plan de batalla (Comandante Supremo) — Avanzar: +1 ataque a todas las unidades
    const planBonus = ctx.state.players[ctx.attacker.owner]?.planBatallaBonus;
    if (planBonus && planBonus > 0) {
        result.damage += planBonus;
    }

    // Voz de mando (Comandante Supremo) — +1 ataque a la unidad beneficiada
    const vozAtkBonus = ctx.attacker.vozDeMandoAttackBonus;
    if (vozAtkBonus && vozAtkBonus > 0) {
        result.damage += vozAtkBonus;
    }

    // Liderar a las tropas (Capitán de la Guardia) — infantería + general ganan ataque tras ataque del general
    const liderarBonus = ctx.state.players[ctx.attacker.owner]?.liderarAtaqueBonus;
    if (liderarBonus && liderarBonus > 0) {
        const isInfantryOrGeneral = ctx.attacker.class === 'infantry' || ctx.attacker.class === 'general';
        if (isInfantryOrGeneral) {
            result.damage += liderarBonus;
        }
    }

}

export function applyCostAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onCost?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.attacker.owner, ctx.attacker.id);
    result.attackCost += mods.attackCost;
}

export function applyDefenseAbilities(ctx: AbilityContext, result: CombatResult): void {
    for (const ability of ctx.attacker.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDefense?.({ ...ctx, abilitySide: 'attacker' }, result);
    }
    for (const ability of ctx.defender.abilities ?? []) {
        ABILITY_EFFECTS[ability]?.onDefense?.({ ...ctx, abilitySide: 'defender' }, result);
    }
    const mods = getUnitModifiers(ctx.state, ctx.defender.owner, ctx.defender.id);
    // defenseMod resta del daño entrante (Meditación, etc.)
    result.damage = Math.max(1, result.damage - mods.defenseMod);

    // Plan de batalla (Comandante Supremo) — Reagruparse: +1 defensa
    const planDefBonus = ctx.state.players[ctx.defender.owner]?.planBatallaDefense;
    if (planDefBonus && planDefBonus > 0) {
        result.damage = Math.max(1, result.damage - planDefBonus);
    }

    // Voz de mando (Comandante Supremo) — +1 defensa a la unidad beneficiada
    const vozDefBonus = ctx.defender.vozDeMandoDefenseBonus;
    if (vozDefBonus && vozDefBonus > 0) {
        result.damage = Math.max(1, result.damage - vozDefBonus);
    }

    // Espartano: Lanza y escudo (-1 daño recibido)
    if (ctx.defender.espartanoDefenseBonus) {
        result.damage = Math.max(1, result.damage - 1);
    }

    // Muro espartano: lanceros y general (con identidad espartano) adyacentes reciben -1 daño
    const espartanoIdentity = ctx.state.players[ctx.defender.owner]?.selectedIdentity ?? '';
    if (espartanoIdentity.startsWith('espartano') && (ctx.defender.class === 'lancer' || ctx.defender.class === 'general')) {
        const hasAdjacentLancer = Object.values(ctx.state.units)
            .some(u => u.owner === ctx.defender.owner && (u.class === 'lancer' || u.class === 'general') && u.id !== ctx.defender.id && hexDistance(ctx.defender.position, u.position) === 1);
        if (hasAdjacentLancer) {
            result.damage = Math.max(1, result.damage - 1);
        }
    }

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
    return s;
}
