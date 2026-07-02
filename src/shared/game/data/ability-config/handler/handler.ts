import type { GameState, GameAction, Unit } from '@shared/game/state';
import type { AbilityConfig } from '../types';
import { hexDistance } from '@shared/hex';
import { updateUnit, dealDamage, isHexOccupied, isWithinBounds } from '@shared/game/utils';
import { roll2d6 } from '@shared/game/utils/rng';
import { consumeAP } from '@shared/game/actions/helpers';
import { resolveAttack } from '@shared/game/combat';
import type { AttackResult } from '@shared/game/combat';
import { addModifier, consumeModifier, getModifierSum } from '@shared/game/modifiers/engine';
import { BASE_STATS } from '@shared/game/units';
import { buildAttackModifiers, storeAttackResult } from '@shared/game/actions/ability';

function unitHasAbility(unit: Unit, abilityId: string): boolean {
    return unit.abilities?.includes(abilityId) ?? false;
}

function getAbilityRange(unit: Unit, _state: GameState, cfg: AbilityConfig): number {
    const base = cfg.range === 'unit.range' ? unit.range : (cfg.range ?? unit.range);
    return base + (cfg.rangeBonus ?? 0);
}

function consumeCostMods(s: GameState, playerId: string, unitId: string): GameState {
    const costMods = getModifierSum(s, playerId, unitId, 'attackCost') + getModifierSum(s, playerId, unitId, 'actionCost');
    if (costMods > 0) {
        s = consumeAP(s, playerId, costMods);
        s = consumeModifier(s, playerId, 'attackCost', costMods);
        s = consumeModifier(s, playerId, 'actionCost', costMods);
    }
    return s;
}

export function handleAbility(state: GameState, action: GameAction, cfg: AbilityConfig): GameState {
    if (action.type !== 'USE_ABILITY') return state;

    const unit = state.units[action.unitId];
    if (!unit || unit.owner !== action.playerId) return state;
    if (!unitHasAbility(unit, action.abilityId)) return state;

    const costMods = getModifierSum(state, action.playerId, action.unitId, 'attackCost') + getModifierSum(state, action.playerId, action.unitId, 'actionCost');
    const baseCost = cfg.base.paCost ?? 0;
    const totalCost = baseCost + costMods;
    if ((state.players[action.playerId]?.actionPoints ?? 0) < totalCost) return state;

    let s: GameState;

    switch (cfg.type) {
        case 'attack':
            s = handleNewAttack(state, action, unit, cfg, baseCost, costMods);
            break;
        case 'support':
            s = handleNewSupport(state, action, unit, cfg, baseCost, costMods);
            break;
        case 'move':
            s = handleNewMove(state, action, unit, cfg, baseCost, costMods);
            break;
        default:
            return state;
    }

    if (s !== state) {
        s = updateUnit(s, action.unitId, (u) => ({ ...u, performedActionThisTurn: true }));
    }

    return s;
}

function handleNewAttack(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number): GameState {
    // Torbellino: AoE attack — no necesita targetId
    if (action.abilityId === 'torbellino') {
        if (unit.usedTorbellino || unit.usedCarga) return state;
        const targets = Object.values(state.units).filter(u => u.owner !== unit.owner && hexDistance(unit.position, u.position) === 1);
        const allies = Object.values(state.units).filter(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(unit.position, u.position) === 1);
        if (targets.length === 0 && allies.length === 0) return state;

        let s = consumeAP(state, unit.owner, baseCost);
        s = consumeCostMods(s, unit.owner, unit.id);

        const { total, die1, die2, seed: newSeed } = roll2d6(s.rngSeed);
        s = { ...s, rngSeed: newSeed };
        const hit = total >= 6;
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
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedTorbellino: true }));
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
                difficulty: 6, hit,
                damage: totalDmg, counterDamage: 0,
                attackerClass: unit.class, targetClass: hitTargets.map(t => t.class).join(','),
                attackName: cfg.nameKey,
            },
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`, turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner, type: 'attack' as const,
                attackerId: unit.id, targetId: unit.id,
                die1, die2, total, difficulty: 6, baseDifficulty: 6,
                hit, damage: totalDmg, baseAttack: unit.attack,
                counterDamage: 0,
                attackerClass: unit.class,
                targetClass: hitTargets.map(t => t.class).join(','),
                attackName: cfg.nameKey,
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

    // Check ability-specific state flags
    if (action.abilityId === 'doble_ataque' && (unit.usedDobleAtaque || unit.usedVentajaAlcance || !unit.attackedThisTurn)) return state;
    if (action.abilityId === 'carga' && (unit.usedCarga || unit.attackedThisTurn)) return state;
    if (action.abilityId === 'ventaja_alcance' && (unit.usedVentajaAlcance || unit.usedDobleAtaque || unit.attackedThisTurn)) return state;

    // Check cabalgarDir requirement (carga)
    if (cfg.requiresCabalgarDir) {
        if (!unit.usedCabalgar || !unit.cabalgarDir) return state;
        const expectedQ = unit.position.q + unit.cabalgarDir.dq;
        const expectedR = unit.position.r + unit.cabalgarDir.dr;
        if (target.position.q !== expectedQ || target.position.r !== expectedR) return state;
    }

    const range = getAbilityRange(unit, state, cfg);
    const distance = hexDistance(unit.position, target.position);
    if (distance > range) return state;

    // Ventaja de alcance: solo permite atacar a distancia > rango normal
    if (action.abilityId === 'ventaja_alcance' && distance <= unit.range) return state;

    // Fixed damage abilities (patada acrobática)
    if (cfg.fixedDamage !== undefined && action.abilityId === 'patada_acrobatica') {
        if (unit.usedPatadaAcrobatica) return state;
        if (distance !== 1) return state;
        if (!action.to) return state;
        const destToEnemy = hexDistance(action.to, target.position);
        if (destToEnemy === 0 || destToEnemy === 1) return state;
        if (isHexOccupied(state, action.to)) return state;

        let s = consumeAP(state, unit.owner, baseCost);
        s = consumeCostMods(s, unit.owner, unit.id);
        s = dealDamage(s, target.id, cfg.fixedDamage, unit.id);
        s = updateUnit(s, unit.id, (u) => ({
            ...u, position: action.to!,
            movedThisTurn: true,
            usedPatadaAcrobatica: true,
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
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
        return s;
    }

    // Ejecutar: ataque con daño fijo 2, requiere objetivo ≤2 HP adyacente
    if (cfg.fixedDamage !== undefined && action.abilityId === 'ejecutar') {
        if (unit.attackedThisTurn) return state;
        if (target.hp > 2) return state;
        if (distance !== 1) return state;

        let s = consumeAP(state, unit.owner, baseCost);
        s = consumeCostMods(s, unit.owner, unit.id);

        const result: AttackResult = resolveAttack({
            state: s, unit, target,
            from: unit.position, to: target.position, distance,
            fixedDamage: cfg.fixedDamage,
            noCritical: true,
            configId: cfg.id,
            paCost: baseCost + costMods,
        });

        s = result.state;
        s = storeAttackResult(result, unit.id, target.id, unit.class, target.class, cfg.nameKey, baseCost + costMods);
        s = updateUnit(s, unit.id, (u) => ({ ...u, attackedThisTurn: true }));

        // Ocupar posición si murió
        if (s.graveyard[target.id]) {
            s = { ...s, pendingOccupation: { unitId: unit.id, position: target.position } };
        }

        return s;
    }

    let s = state;
    s = consumeAP(s, unit.owner, baseCost);
    s = consumeCostMods(s, unit.owner, unit.id);

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
    s = storeAttackResult(result, unit.id, target.id, unit.class, target.class, cfg.nameKey, baseCost + costMods);

    // Apply ability-specific post flags
    if (action.abilityId === 'carga') {
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedCarga: true, attackedThisTurn: true }));
    } else if (action.abilityId === 'doble_ataque') {
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedDobleAtaque: true }));
    } else if (action.abilityId === 'ventaja_alcance') {
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedVentajaAlcance: true, attackedThisTurn: true }));
    } else if (action.abilityId === 'desenvainado_veloz') {
        const targetDead = s.graveyard[action.targetId!];
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedDesenvainadoVeloz: !targetDead }));
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
            const hitTargets: string[] = [];
            for (const h of behindHexes) {
                const hitUnit = Object.values(s.units).find(u => u.position.q === h.q && u.position.r === h.r);
                if (hitUnit && hitUnit.owner !== unit.owner) {
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
                        playerId: unit.owner, type: 'card' as const,
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
            if (uu[id].owner === unit.owner && uu[id].class === 'lancer') {
                uu[id] = { ...uu[id], proyeccionActive: false };
            }
        }
        s = { ...s, units: uu };
    }

    // Apply post-hit effects from config on top of history state
    if (result.hit && cfg.effects) {
        for (const effect of cfg.effects) {
            if (effect.type === 'surcharge') {
                // No acumular si ya existe actionCost activo de fuego_cobertura
                if (s.activeModifiers.some(m => m.stat === 'actionCost' && m.targetId === target.id && m.source === 'ability' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0)) break;
                s = addModifier(s, target.owner, target.id, 'actionCost', effect.value ?? 1, 'ADD', 0, effect.duration ?? 1, 'ability', cfg.id);
            } else if (effect.type === 'inmovil' && !s.graveyard[target.id]) {
                s = addModifier(s, target.owner, target.id, 'inmovil', 1, 'SET', effect.duration ?? 1, undefined, undefined, 'ability', cfg.id);
            } else if (effect.type === 'occupation' && !s.graveyard[target.id]) {
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

    return s;
}

function handleNewSupport(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number): GameState {
    // Check ability-specific state flags
    if (cfg.id === 'rayo_celestial' && unit.usedRayoCelestial) return state;

    let s = consumeAP(state, unit.owner, baseCost);
    s = consumeCostMods(s, unit.owner, unit.id);

    // Apply setFlags (ejecutar, etc.)
    if (cfg.setFlags) {
        s = updateUnit(s, unit.id, (u) => ({ ...u, ...cfg.setFlags }));
    }

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
        s = updateUnit(s, unit.id, (u) => ({ ...u, aLaCargaActive: true }));
        // Build history entry
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                type: 'card' as const,
                cardId: cfg.id,
                cardName: cfg.nameKey,
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
        if (unit.usedAngelGuardian) return state;
        s = consumeAP(s, unit.owner, baseCost);
        s = consumeCostMods(s, unit.owner, unit.id);
        const allies = Object.values(s.units).filter(u => u.owner === unit.owner && u.class !== 'general');
        let shieldedCount = 0;
        for (const u of allies) {
            s = updateUnit(s, u.id, (u2) => ({ ...u2, auraShield: (u2.auraShield ?? 0) + 2 }));
            shieldedCount++;
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
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedAngelGuardian: true }));
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                type: 'card' as const,
                cardId: cfg.id,
                cardName: cfg.nameKey,
                cardType: 'BUFF' as const,
                targetId: healedId || unit.id,
                targetClass: healedId ? (s.units[healedId]?.class ?? unit.class) : unit.class,
                details: `Escudo +2 HP a ${shieldedCount} aliados`,
                paCost: baseCost + costMods,
                sourceClass: unit.class,
                sourceIdentityKey: 'escudo_comandante',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    } else if (action.abilityId === 'proteger') {
        if (!action.targetId) return state;
        const tgt = state.units[action.targetId];
        if (!tgt || tgt.owner !== unit.owner) return state;
        const dist = hexDistance(unit.position, tgt.position);
        if (dist > 3) return state;

        s = addModifier(s, unit.owner, action.targetId, 'defense', 1, 'ADD', 0, undefined, 'ability', 'Proteger');
        const last = s.activeModifiers[s.activeModifiers.length - 1];
        if (last) {
            s = { ...s, activeModifiers: s.activeModifiers.map((m, i) =>
                i === s.activeModifiers.length - 1 ? { ...m, id: `proteger_${action.targetId}` } : m
            )};
        }
        s = {
            ...s,
            players: {
                ...s.players,
                [unit.owner]: { ...s.players[unit.owner], protegerUsedThisTurn: true },
            },
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                type: 'card' as const,
                cardId: cfg.id,
                cardName: cfg.nameKey,
                cardType: 'BUFF' as const,
                targetId: action.targetId,
                targetClass: tgt.class,
                details: `+1 defensa`,
                paCost: 0,
                sourceClass: unit.class,
                sourceIdentityKey: 'escudo_comandante',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    } else if (action.abilityId === 'rayo_celestial') {
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedRayoCelestial: true }));
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
                type: 'card' as const,
                cardId: cfg.id,
                cardName: cfg.nameKey,
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
        s = updateUnit(s, unit.id, (u) => ({ ...u, usedEnNombreDelRey: true }));
        const buffTarget = action.targetId ? state.units[action.targetId] : undefined;
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`, turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner, type: 'card' as const,
                cardId: cfg.id, cardName: cfg.nameKey, cardType: 'BUFF' as const,
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
                playerId: unit.owner, type: 'attack' as const,
                attackerId: unit.id, targetId: ally.id,
                die1: 0, die2: 0, total: 0,
                difficulty: 0, baseDifficulty: 0,
                hit: true, damage: 2, baseAttack: unit.attack, counterDamage: 0,
                attackerClass: unit.class, targetClass: ally.class,
                attackName: cfg.nameKey,
                modifiers: [`General recupera ${allyDied ? '5' : '3'} HP`],
                paCost: baseCost + costMods,
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
    }

    return s;
}

function handleNewMove(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number): GameState {
    if (!action.to && !action.path) return state;

    // Check move replacement flags
    if (cfg.flags?.replacesMove && unit.movedThisTurn) return state;

    // Path-based movement (cabalgar_2)
    if (action.path && action.path.length >= 2) {
        return handleNewPathMove(state, action, unit, cfg, baseCost, costMods);
    }

    const maxDist = cfg.move?.maxDist ?? 1;
    const distance = hexDistance(unit.position, action.to);
    if (distance > maxDist || distance < 1) return state;

    const isStraightLine = cfg.flags?.straightLine;
    if (isStraightLine) {
        const dq = action.to.q - unit.position.q;
        const dr = action.to.r - unit.position.r;
        if (dq !== 0 && dr !== 0 && dq !== -dr) return state;
    }

    if (cfg.flags?.noCrossUnits) {
        const dq = action.to.q - unit.position.q;
        const dr = action.to.r - unit.position.r;
        for (let i = 1; i < distance; i++) {
            const mid = { q: unit.position.q + Math.round((dq * i) / distance), r: unit.position.r + Math.round((dr * i) / distance) };
            if (isHexOccupied(state, mid)) return state;
        }
    }

    // Allow move into enemy-occupied hex (for charge-style abilities)
    const destOccupied = isHexOccupied(state, action.to, unit.id);
    const destEnemy = destOccupied && Object.values(state.units).some(u => u.id !== unit.id && u.position.q === action.to!.q && u.position.r === action.to!.r && u.owner !== unit.owner);
    if (destOccupied && !destEnemy) return state;

    // Posición estratégica: move must end adjacent to an ally, no AP cost
    if (action.abilityId === 'posicion_estrategica') {
        if (unit.usedPosicionEstrategica) return state;
        const hasAdjacentAlly = Object.values(state.units)
            .some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(action.to!, u.position) === 1);
        if (!hasAdjacentAlly) return state;
        let s = updateUnit(state, unit.id, (u) => ({
            ...u, position: action.to!, usedPosicionEstrategica: true,
        }));
        const pathStr = `(${unit.position.q},${unit.position.r}) → (${action.to!.q},${action.to!.r})`;
        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`, turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner, type: 'card' as const,
                cardId: cfg.id, cardName: cfg.nameKey, cardType: 'BUFF' as const,
                details: pathStr, paCost: 0,
                sourceClass: unit.class, sourceIdentityKey: 'corazon_estratega',
            }],
            nextHistoryId: s.nextHistoryId + 1,
        };
        return s;
    }

    let s = consumeAP(state, unit.owner, baseCost + costMods);
    s = consumeCostMods(s, unit.owner, unit.id);

    // Post-move flags from config
    const extraFlags: Record<string, any> = { ...cfg.move?.setFlags };
    // Set cabalgarDir for straight-line moves (needed by Carga)
    if (cfg.flags?.straightLine && extraFlags.usedCabalgar) {
        const dq = action.to.q - unit.position.q;
        const dr = action.to.r - unit.position.r;
        const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
        if (steps > 0) {
            extraFlags.cabalgarDir = { dq: dq / steps, dr: dr / steps };
        }
    }

    s = updateUnit(s, unit.id, (u) => ({
        ...u, position: action.to!,
        ...extraFlags,
    }));

    // Build move ability history entry (card-type with inline PA cost)
    const moveCostStrs: string[] = [];
    const actCostSrc = state.activeModifiers.find(m => m.stat === 'actionCost' && m.targetId === unit.id && m.sourcePlayerId === unit.owner && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0);
    if (actCostSrc) moveCostStrs.push(`${actCostSrc.sourceName ?? 'Coste acción'}: +${actCostSrc.value} PA`);

        s = {
            ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                type: 'card' as const,
                cardId: cfg.id,
                cardName: cfg.nameKey,
                cardType: 'BUFF' as const,
                targetId: unit.id,
                targetClass: unit.class,
                details: `(${unit.position.q},${unit.position.r}) → (${action.to!.q},${action.to!.r})`,
                paCost: baseCost + costMods,
                modifiers: moveCostStrs,
                sourceClass: unit.class,
            }],
        nextHistoryId: s.nextHistoryId + 1,
    };

    return s;
}

// Path-based movement (cabalgar_2): action.path = array of hexes
function handleNewPathMove(state: GameState, action: GameAction, unit: Unit, cfg: AbilityConfig, baseCost: number, costMods: number): GameState {
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

    let s = consumeAP(state, unit.owner, baseCost + costMods);
    s = consumeCostMods(s, unit.owner, unit.id);

    const lastStep = path.length >= 2 ? path[path.length - 2] : unit.position;
    const dir = { dq: dest.q - lastStep.q, dr: dest.r - lastStep.r };
    const extraFlags: Record<string, any> = { ...cfg.move?.setFlags };
    extraFlags.cabalgarDir = dir;

    s = updateUnit(s, unit.id, (u) => ({
        ...u, position: dest, ...extraFlags,
    }));

    const pathStr = [unit.position, ...path].map((h: any) => `(${h.q},${h.r})`).join(' → ');
    const moveCostStrs: string[] = [];
    const actCostSrc = state.activeModifiers.find(m => m.stat === 'actionCost' && m.targetId === unit.id && m.sourcePlayerId === unit.owner && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0);
    if (actCostSrc) moveCostStrs.push(`${actCostSrc.sourceName ?? 'Coste acción'}: +${actCostSrc.value} PA`);
    s = {
        ...s,
            gameHistory: [...s.gameHistory, {
                id: `h${s.nextHistoryId}`,
                turn: s.turn,
                actionNumber: s.gameHistory.filter((h: any) => h.turn === s.turn).length + 1,
                playerId: unit.owner,
                type: 'card' as const,
                cardId: cfg.id,
                cardName: cfg.nameKey,
                cardType: 'BUFF' as const,
                targetId: unit.id,
                targetClass: unit.class,
                details: `${path.length} casillas · ${pathStr}`,
                paCost: baseCost + costMods,
                modifiers: moveCostStrs,
                sourceClass: unit.class,
            }],
        nextHistoryId: s.nextHistoryId + 1,
    };

    return s;
}
