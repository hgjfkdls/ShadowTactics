import type { GameState, Unit } from '../state';
import { hexDistance } from '../../hex';
import { updateUnit, dealDamage, isWithinBounds } from '../utils';
import type { AttackResult } from '../combat';
import { ABILITIES } from '../data/abilities';
import { ABILITY_CONFIG } from '../data/ability-config';
import { BASE_STATS } from '../units';
import { addModifier, consumeModifier, getModifierSum } from '../modifiers/engine';

// ── buildAttackModifiers ──

export function buildAttackModifiers(s: GameState, attackerId: string, targetId: string, configId?: string): { combat: string[]; paMods: string[] } {
    const attacker = s.units[attackerId];
    const target = s.units[targetId];
    if (!attacker || !target) return { combat: [], paMods: [] };

    const abils = attacker.abilities ?? [];
    const combat: string[] = [];
    const paMods: string[] = [];

    // ── COST modifiers (from activeModifiers) ──
    const COST_STATS = ['attackCost', 'actionCost', 'movementCost', 'ap'];
    // isAttackerMod: modifiers from the attacker's perspective (cost increase)
    const isAttackerMod = (m: any) => m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
        && (m.targetId === undefined || m.targetId === attackerId) && m.sourcePlayerId === attacker.owner;
    // isTargetMod: modifiers from the defender's perspective (applied to defender)
    const isTargetMod = (m: any) => m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
        && (m.targetId === undefined || m.targetId === targetId) && m.sourcePlayerId === target.owner;
    const atkCostSum = COST_STATS.reduce((sum, stat) => {
        const mods = s.activeModifiers.filter((m: any) => m.stat === stat && (isAttackerMod(m) || isTargetMod(m)));
        let localSum = 0;
        for (const m of mods) {
            if (m.operator === 'ADD') localSum += m.value;
            else if (m.operator === 'MUL') localSum = localSum * m.value;
            else if (m.operator === 'SET') localSum = m.value;
            const cat = stat === 'attackCost' ? 'cost' : stat === 'actionCost' ? 'cost' : stat === 'ap' ? 'pa' : stat;
            const label = `${m.sourceName ?? m.stat}: ${m.value > 0 ? '+' : ''}${m.value} PA`;
            // Only add to combat if it's an attacker-side cost modifier
            if (isAttackerMod(m)) {
                combat.push(`[cost] ${label}`);
            }
            if (stat === 'attackCost' && isAttackerMod(m)) paMods.push(label);
            if (stat === 'actionCost' && isTargetMod(m)) paMods.push(label);
        }
        return sum + localSum;
    }, 0);

    // ── Passive ability modifiers ──

    // Anti-caballería (solo ataque básico)
    if (abils.includes('anti_caballeria') && target.class === 'cavalry' && configId === 'ataque_basico') {
        combat.push('[atk] [id:anti_caballeria] Anti-caballería: +1 ataque');
    }

    // Blanco fácil
    if (abils.includes('blanco_facil') && target.didMovePreviousTurn === false) {
        const identity = s.players[attacker.owner]?.selectedIdentity ?? '';
        const bonus = identity.startsWith('francotirador') ? 2 : 1;
        combat.push(`[diff] [id:blanco_facil] Blanco fácil: -${bonus} dificultad`);
    }

    // Hostigar (Cazadores)
    const atkIdentity = s.players[attacker.owner]?.selectedIdentity ?? '';
    if (atkIdentity.startsWith('cazadores') && (attacker.class === 'cavalry' || attacker.class === 'general')) {
        const maxHp = BASE_STATS[target.class].hp;
        if (target.hp <= Math.floor(maxHp / 2)) {
            combat.push('[diff] [id:hostigar] Hostigar: -1 dificultad');
        }
    }

    // Presión
    if (abils.includes('presion') && attacker.lastTargetId === target.id) {
        combat.push('[atk] [id:presion] Presión: +1 ataque');
    }

    // Acechar (Cazadores)
    if (atkIdentity.startsWith('cazadores')) {
        const isIsolated = !Object.values(s.units).some(u => u.owner === target.owner && u.id !== target.id && hexDistance(target.position, u.position) === 1);
        if (isIsolated) {
            if (attacker.class === 'general') {
                const bonus = target.class === 'general' ? 1 : 2;
                combat.push(`[atk] [id:acechar] Acechar: +${bonus} ataque`);
            } else if (attacker.class === 'cavalry' && target.class !== 'general') {
                combat.push('[atk] [id:acechar] Acechar: +1 ataque');
            } else if (attacker.class === 'cavalry') {
                combat.push('[atk] [id:acechar] Acechar: +1 ataque');
            }
        }
    }

    // Furia berserker (Dios del Trueno)
    if (atkIdentity.startsWith('dios_trueno')) {
        const isInfantryOrGeneral = attacker.class === 'infantry' || attacker.class === 'general';
        if (isInfantryOrGeneral) {
            const maxHp = BASE_STATS[attacker.class].hp;
            if (attacker.hp <= Math.floor(maxHp / 2)) {
                combat.push('[atk] [id:furia_berserker] Furia berserker: +1 ataque');
            }
        }
    }

    // Liderar a las tropas (Capitán de la Guardia)
    const liderarBonus = s.players[attacker.owner]?.liderarAtaqueBonus;
    if (liderarBonus && liderarBonus > 0 && (attacker.class === 'infantry' || attacker.class === 'general')) {
        combat.push(`[atk] [id:liderar_tropas] Liderar a las tropas: +${liderarBonus} ataque`);
    }

    // Plan de batalla (Comandante Supremo)
    const planBonus = s.players[attacker.owner]?.planBatallaBonus;
    if (planBonus && planBonus > 0) combat.push(`[atk] [id:plan_batalla] Avanzar: +${planBonus} ataque`);
    const planDefBonus = s.players[target.owner]?.planBatallaDefense;
    if (planDefBonus && planDefBonus > 0) {
        combat.push(`[def] [id:plan_batalla] Reagruparse: +${planDefBonus} defensa`);
    }

    // Voz de mando (Comandante Supremo)
    if (attacker.vozDeMandoAttackBonus) combat.push(`[atk] [id:voz_de_mando] Voz de mando: +${attacker.vozDeMandoAttackBonus} ataque`);
    if (target.vozDeMandoDefenseBonus) combat.push(`[def] [id:voz_de_mando] Voz de mando: +${target.vozDeMandoDefenseBonus} defensa`);

    // Lanza y escudo (Espartano)
    if (target.espartanoDefenseBonus) {
        const targetIdentity = s.players[target.owner]?.selectedIdentity ?? '';
        if (targetIdentity.startsWith('espartano')) {
            combat.push('[def] [id:lanza_escudo] Lanza y escudo: +1 defensa');
        }
    }

    // Muro espartano (Espartano)
    if (target.class === 'lancer' || target.class === 'general') {
        const targetIdentity = s.players[target.owner]?.selectedIdentity ?? '';
        if (targetIdentity.startsWith('espartano')) {
            const hasAdjacentLancer = Object.values(s.units).some(u => u.owner === target.owner && (u.class === 'lancer' || u.class === 'general') && u.id !== target.id && hexDistance(target.position, u.position) === 1);
            if (hasAdjacentLancer) {
                combat.push('[def] [id:muro_espartano] Muro espartano: +1 defensa');
            }
        }
    }

    // Resistencia / Línea defensiva
    if (abils.includes('linea_defensiva') && target.didMovePreviousTurn === false) {
        combat.push('[def] [id:linea_defensiva] Línea defensiva: +1 defensa');
    }
    if (abils.includes('resistencia') && !target.resistenciaUsedThisTurn) {
        combat.push('[def] [id:resistencia] Resistencia: +1 defensa');
    }

    // Romper filas
    if (abils.includes('romper_filas')) {
        if (target.abilities?.includes('linea_defensiva')) {
            combat.push('[mixed] [id:romper_filas] [ignores:linea_defensiva] Romper filas: ignora Línea defensiva');
        }
        if (target.abilities?.includes('resistencia')) {
            combat.push('[mixed] [id:romper_filas] [ignores:resistencia] Romper filas: ignora Resistencia');
        }
    }

    // Formación defensiva
    if (abils.includes('formacion_defensiva') && configId !== 'ataque_basico') {
        combat.push('[mixed] [id:formacion_defensiva] [ignores:carga] Formación defensiva: anula Carga');
    }

    // Contraataque (Capitán de la Guardia)
    const targetIdentity = s.players[target.owner]?.selectedIdentity ?? '';
    if (targetIdentity.startsWith('capitan_guardia') && target.class === 'general' && hexDistance(attacker.position, target.position) === 1) {
        combat.push('[dmg] [id:contraataque] Contraataque (Capitán de la Guardia): 1 daño');
    }

    return { combat, paMods };
}

// ── storeAttackResult ──

export function storeAttackResult(result: AttackResult, attackerId: string, targetId: string, attackerClass: string, targetClass: string, attackName?: string, paCost?: number, paModifiers?: string[]): GameState {
    let s = result.state;
    const { combat: modsFromBuild, paMods: costModsFromBuild } = buildAttackModifiers(s, attackerId, targetId, result.configId);
    const mods = modsFromBuild;
    // Merge config-driven extras from compute (extraAttack, extraDifficulty)
    if (result.compute) {
        for (const cm of result.compute.modifiers) {
            if (cm.source === 'extra') {
                const prefix = cm.stat === 'attack' ? '[atk] ' : cm.stat === 'difficulty' ? '[diff] ' : cm.stat === 'defense' ? '[def] ' : '';
                const idTag = result.configId ? `[id:${result.configId}] ` : '';
                mods.push(prefix + idTag + cm.label);
            }
        }
    }
    const atkUnit = s.units[attackerId];
    const allPaMods = [...(paModifiers ?? []), ...costModsFromBuild];
    // Prepend difficulty formula
    if (atkUnit) {
        const target = s.units[targetId];
        const dist = target ? hexDistance(atkUnit.position, target.position) : 0;
        const hasBlancoFacil = (atkUnit.abilities ?? []).includes('blanco_facil');
        const baseDiff = hasBlancoFacil ? 5 : atkUnit.difficulty;
        const raw = hasBlancoFacil ? baseDiff + dist : baseDiff;
        let formula = `base ${baseDiff}`;
        if (hasBlancoFacil) formula += `, distancia +${dist} → ${raw}`;
        if (result.difficulty !== raw) {
            const diff = result.difficulty - raw;
            formula += `, ${diff >= 0 ? '+' : ''}${diff} = ${result.difficulty}`;
        }
        mods.unshift(`Dificultad: ${formula}`);
    }
    s = {
        ...s,
        lastAttackResult: {
            attackerId, targetId,
            die1: result.roll.die1, die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            hit: result.hit,
            damage: result.damage,
            counterDamage: result.counterDamage,
            noCritical: result.noCritical,
            attackName: attackName ?? 'button.basicAttack',
            attackerClass, targetClass,
        },
        gameHistory: [...s.gameHistory, {
            id: `h${s.nextHistoryId}`, turn: s.turn,
            actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
            playerId: s.activePlayer, type: 'attack' as const,
            attackerId, targetId,
            die1: result.roll.die1, die2: result.roll.die2,
            total: result.roll.total,
            difficulty: result.difficulty,
            baseDifficulty: result.compute ? result.compute.baseDifficulty : (atkUnit && (atkUnit.abilities ?? []).includes('blanco_facil') ? 5 : (atkUnit?.difficulty ?? result.difficulty)),
            hit: result.hit,
            damage: result.damage,
            baseAttack: result.compute ? result.compute.baseAttack : (atkUnit ? atkUnit.attack : 0),
            counterDamage: result.counterDamage,
            attackerClass, targetClass,
            attackName: attackName ?? 'button.basicAttack',
            noCritical: result.noCritical,
            modifiers: mods,
            paCost,
            paModifiers: allPaMods,
        }],
        nextHistoryId: s.nextHistoryId + 1,
    };
    // Flush karma entry after attack history
    const karmaEntry = result.state.karmaEntryToAppend;
    if (karmaEntry) {
        karmaEntry.actionNumber = s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1;
        karmaEntry.id = `h${s.nextHistoryId}`;
        s = {
            ...s,
            gameHistory: [...s.gameHistory, karmaEntry as any],
            nextHistoryId: s.nextHistoryId + 1,
        };
    }
    return s;
}
