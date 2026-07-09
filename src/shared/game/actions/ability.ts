import type { GameState, Unit } from '../state';
import { hexDistance } from '../../hex';
import { updateUnit, dealDamage, isWithinBounds } from '../utils';
import type { AttackResult } from '../combat';
import { ABILITIES } from '../data/abilities';
import { ABILITY_CONFIG } from '../data/ability-config';
import { BASE_STATS } from '../units';
import { addModifier, consumeModifier, getModifierSum } from '../modifiers/engine';
import { l } from '../../i18n';
import { getAuraBuffs } from '../aura';

// ── buildAttackModifiers ──

export function buildAttackModifiers(s: GameState, attackerId: string, targetId: string, configId?: string, preTimesDamaged?: number, snapshotModifiers?: any[]): { combat: string[]; paMods: string[] } {
    const attacker = s.units[attackerId];
    const target = s.units[targetId] ?? s.graveyard[targetId];
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

    // ── Config-driven modifier display (from unit abilities + state) ──
    // Read from unit abilities and state directly, since activeModifiers may have been consumed
    const processedDisplayIds = new Set<string>();
    function addModDisplay(abilityId: string, stat: string, value: number, targetId?: string): void {
        const key = `${abilityId}-${stat}`;
        if (processedDisplayIds.has(key)) return;
        processedDisplayIds.add(key);
        const name = l(`ability.${abilityId}.name`);
        const prefix = value > 0 ? '+' : '';
        if (stat === 'attack') {
            combat.push(`[atk] [id:${abilityId}] ${name}: ${prefix}${value} ataque`);
        } else if (stat === 'defense') {
            combat.push(`[def] [id:${abilityId}] ${name}: ${prefix}${value} defensa`);
        } else if (stat === 'difficulty') {
            combat.push(`[diff] [id:${abilityId}] ${name}: ${prefix}${value} dificultad`);
        }
    }
    // Helper: get max HP for a class
    const getMaxHp = (cls: string) => BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
    // Evaluate config-driven passives from unit abilities
    for (const abil of [...new Set([...attacker.abilities ?? [], ...target.abilities ?? []])]) {
        const cfg = ABILITY_CONFIG[abil];
        if (!cfg?.effects) continue;
        if (cfg.activation?.turnStart) {
            // TurnStart passives (resistencia, linea_defensiva): show only if modifier exists in activeModifiers
            for (const unit of [attacker, target]) {
                if (!unit.abilities?.includes(abil)) continue;
                if (unit.id !== targetId) continue; // Only show defense passives on the defender
                const hasMod = s.activeModifiers.some(m =>
                    m.stat === 'defense' && m.sourceName === abil && m.targetId === unit.id
                    && m.sourcePlayerId === unit.owner
                    && (m.remainingTurns === undefined || m.remainingTurns >= 0)
                    && (m.remainingUses ?? 1) > 0
                );
                if (!hasMod) continue;
                // Mutual exclusivity: linea_defensiva > resistencia (misma unidad, ambos activos)
                if (abil === 'resistencia' && unit.abilities.includes('linea_defensiva')) {
                    const hasLineaMod = s.activeModifiers.some(m =>
                        m.stat === 'defense' && m.sourceName === 'linea_defensiva' && m.targetId === unit.id
                        && (m.remainingTurns === undefined || m.remainingTurns >= 0)
                    );
                    if (hasLineaMod) {
                        processedDisplayIds.add(`${abil}-defense`);
                        continue;
                    }
                }
                for (const e of cfg.effects) {
                    if (e.type === 'defense' && unit.id !== targetId) continue;
                    if (e.type === 'attack' && unit.id !== attackerId) continue;
                    addModDisplay(abil, e.type, e.value ?? 1);
                }
            }
        } else if (cfg.activation?.whenAttack) {
            // Combat-time passives (presion, furia_berserker, blanco_facil, hostigar, acechar)
            // Only apply attacker-side passives (presion, etc. don't belong to defender)
            if (!attacker.abilities?.includes(abil)) continue;
            const isActive = (() => {
                if (cfg.activation.targetIsIsolated) {
                    const hasAlly = Object.values(s.units).some(u => u.owner === target.owner && u.id !== target.id && hexDistance(target.position, u.position) === 1);
                    if (cfg.activation.targetIsIsolated && hasAlly) return false;
                }
                if (cfg.activation.hpMaxPercent) {
                    const maxHp = getMaxHp(attacker.class);
                    if ((attacker.hp / maxHp) * 100 > cfg.activation.hpMaxPercent) return false;
                }
                if (cfg.activation.targetHpMaxPercent) {
                    const maxHp = getMaxHp(target.class);
                    if ((target.hp / maxHp) * 100 > cfg.activation.targetHpMaxPercent) return false;
                }
                if (cfg.activation.lastTargetId && attacker.lastTargetId !== target.id) return false;
                if (cfg.activation.unitClasses && !cfg.activation.unitClasses.includes(attacker.class)) return false;
                if (cfg.activation.targetUnitClasses && !cfg.activation.targetUnitClasses.includes(target.class)) return false;
                if (cfg.activation.targetDidMovePreviousTurn !== undefined) {
                    if (s.turn <= 1) return false; // No previous turn exists
                    if ((target.didMovePreviousTurn ?? false) !== cfg.activation.targetDidMovePreviousTurn) return false;
                }
                if (cfg.activation.isBasicAttack && configId !== 'ataque_basico') return false;
                return true;
            })();
            if (!isActive) continue;
            // Skip effects not allowed by the current ability's allowedModifiers
            const allowedMods = configId ? (ABILITY_CONFIG[configId]?.allowedModifiers ?? []) : [];
            for (const e of cfg.effects) {
                // Skip indicator effects (UI-only)
                if (e.type === 'indicator') continue;
                // Check per-effect targetFilter
                if (e.targetFilter) {
                    const tf = e.targetFilter;
                    if (tf.classes && !tf.classes.includes(target.class)) continue;
                    if (tf.isBasicAttack !== undefined) {
                        const isBasic = configId === 'ataque_basico';
                        if (tf.isBasicAttack && !isBasic) continue;
                        if (!tf.isBasicAttack && isBasic) continue;
                    }
                }
                let displayValue = e.value ?? 1;
                // Apply identity bonuses for the attacker
                if (e.identityBonus) {
                    const identity = s.players[attacker.owner]?.selectedIdentity ?? '';
                    for (const [prefix, bonus] of Object.entries(e.identityBonus)) {
                        if (identity.startsWith(prefix)) displayValue += bonus;
                    }
                }
                // Apply conditional value (class-based overrides)
                if (e.conditionalValue) {
                    const unit = attacker;
                    const target = s.units[targetId];
                    for (const cv of e.conditionalValue) {
                        let matches = true;
                        if (cv.attackerClasses && !cv.attackerClasses.includes(unit.class)) matches = false;
                        if (cv.excludeTargetClasses && target && cv.excludeTargetClasses.includes(target.class)) matches = false;
                        const targetClassList = cv.targetClasses ?? cv.includeTargetClasses;
                        if (targetClassList && target && !targetClassList.includes(target.class)) matches = false;
                        if (!matches) continue;
                        if ((cv.operator ?? 'set') === 'set') { displayValue = cv.value; break; }
                        displayValue += cv.value;
                    }
                }
                // Handle both old format (e.type as stat) and new format (e.stat for combatMutator)
                const displayStat = e.type === 'combatMutator' ? (e.stat ?? 'attack') : e.type;
                if (allowedMods.length > 0 && configId && !allowedMods.includes(displayStat) && !allowedMods.includes('all')) continue;
                addModDisplay(abil, displayStat, displayValue);
            }
        }
    }

    // ── Fallback: display modifiers from activeModifiers (prompts, identity effects, cards) ──
    // These are not in any unit's abilities list (plan_batalla, lanza_escudo, liderar_tropas, etc.)
    // First check consumedModifiers snapshot (for buffs consumed by resolveAttack before display)
    const consumedSrc = snapshotModifiers ?? [];
    for (const src of [s.activeModifiers, consumedSrc]) {
        for (const m of src) {
            if (m.remainingTurns !== undefined && m.remainingTurns < 0) continue;
            if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
            if (m.source !== 'ability' && m.source !== 'identity' && m.source !== 'card') continue;
            if (processedDisplayIds.has(`${m.sourceName}-${m.stat}`)) continue;
            if (m.targetId !== undefined && m.targetId !== attackerId && m.targetId !== targetId) continue;
            // Only show modifiers allowed by the current ability config (skip for cards/external)
            if (configId && m.source === 'ability') {
                const cfg = ABILITY_CONFIG[configId];
                const allowed = cfg?.allowedModifiers ?? [];
                if (allowed.length > 0) {
                    const statMap: Record<string, string> = { attack: 'attack', defense: 'defense', difficulty: 'difficulty', range: 'range', movementCost: 'movementCost', attackCost: 'attackCost', actionCost: 'actionCost', damage: 'damage' };
                    const allowedStat = statMap[m.stat];
                    if (allowedStat && !allowed.includes(allowedStat)) continue;
                }
            }
            const prefix = m.value > 0 ? '+' : '';
            const nameKey = m.source === 'card' ? `card.${m.sourceName}.name` : `ability.${m.sourceName}.name`;
            let name = l(nameKey);
            if (name === nameKey && m.source === 'card') {
                const cardName = l(`card.${m.sourceName}.name`);
                if (cardName !== `card.${m.sourceName}.name`) name = cardName;
            }
            const isAtkSource = m.sourcePlayerId === attacker.owner;
            let displayed = false;
            if (m.stat === 'attack') {
                if ((m.targetId === undefined || m.targetId === attackerId) && isAtkSource) { combat.push(`[atk] [id:${m.sourceName}] ${name}: ${prefix}${m.value} [stat:attack]`); displayed = true; }
            } else if (m.stat === 'defense') {
                if (m.targetId === undefined || m.targetId === targetId) { combat.push(`[def] [id:${m.sourceName}] ${name}: ${prefix}${m.value} [stat:defense]`); displayed = true; }
            } else if (m.stat === 'difficulty') {
                if ((m.targetId === undefined || m.targetId === attackerId) && isAtkSource) { combat.push(`[diff] [id:${m.sourceName}] ${name}: ${prefix}${m.value} [stat:difficulty]`); displayed = true; }
            } else if (m.stat === 'range') {
                if ((m.targetId === undefined || m.targetId === attackerId) && isAtkSource) { combat.push(`[range] [id:${m.sourceName}] ${name}: ${prefix}${m.value} [stat:range]`); displayed = true; }
            } else if ((m.stat === 'movementCost' || m.stat === 'attackCost' || m.stat === 'actionCost') && isAtkSource) {
                combat.push(`[cost] [id:${m.sourceName}] ${name}: ${prefix}${m.value} [stat:pa]`); displayed = true;
            } else if (m.stat === 'damage' && isAtkSource) {
                combat.push(`[dmg] [id:${m.sourceName}] ${name}: ${prefix}${m.value} [stat:damage]`); displayed = true;
            }
            if (displayed) processedDisplayIds.add(`${m.sourceName}-${m.stat}`);
        }
    }

    // ── Passive ability modifiers (legacy display) ──

    // These are handled by the config evaluation above:
    // anti_caballeria, blanco_facil, presion, acechar, hostigar

    // Romper filas: ignora Línea defensiva o Resistencia (basado en activeModifiers + consumedModifiers snapshot)
    if (abils.includes('romper_filas')) {
        const consumedSrc = snapshotModifiers ?? [];
        const hasMod = (src: any[]) => (abil: string) => src.some(m =>
            m.stat === 'defense' && m.sourceName === abil && m.targetId === target.id
            && m.sourcePlayerId === target.owner && (m.remainingTurns === undefined || m.remainingTurns >= 0)
            && (m.remainingUses ?? 1) > 0
        );
        const hasLinea = hasMod([...s.activeModifiers, ...consumedSrc])('linea_defensiva');
        const hasResist = hasMod([...s.activeModifiers, ...consumedSrc])('resistencia');
        if (hasLinea) {
            combat.push('[mixed] [id:romper_filas] [ignores:linea_defensiva] Romper filas: ignora Línea defensiva');
        } else if (hasResist) {
            combat.push('[mixed] [id:romper_filas] [ignores:resistencia] Romper filas: ignora Resistencia');
        }
    }

    // Formación defensiva (solo cuando el defensor la tiene y el atacante usa Carga)
    const targetAbils = target.abilities ?? [];
    if (targetAbils.includes('formacion_defensiva') && configId === 'carga') {
        combat.push('[mixed] [id:formacion_defensiva] [ignores:carga] Formación defensiva: anula Carga');
    }

    // Tiro a distancia: archers get +1 range to basic attacks (identity-based)
    if (configId === 'ataque_basico' && attacker.class !== 'general') {
        const identity = s.players[attacker.owner]?.selectedIdentity ?? '';
        if (attacker.abilities?.includes('tiro_a_distancia') || (identity.startsWith('francotirador') && attacker.class === 'archer')) {
            combat.push(`[range] [id:tiro_a_distancia] ${l('ability.tiro_a_distancia.name')}: +1 [stat:range]`);
        }
    }

    // Contraataque (Capitán de la Guardia)
    const targetIdentity = s.players[target.owner]?.selectedIdentity ?? '';
    if (targetIdentity.startsWith('capitan_guardia') && target.class === 'general' && hexDistance(attacker.position, target.position) === 1) {
        combat.push('[dmg] [id:contraataque] Contraataque (Capitán de la Guardia): 1 daño');
    }

    // Range bonus from ability config (ventaja_alcance, etc.)
    const rangeBonusCfg = configId ? ABILITY_CONFIG[configId]?.rangeBonus : undefined;
    if (rangeBonusCfg && rangeBonusCfg > 0) {
        combat.push(`[range] [id:${configId}] ${l(`ability.${configId}.name`)}: +${rangeBonusCfg} rango`);
    }

    return { combat, paMods };
}

// ── storeAttackResult ──

export function storeAttackResult(result: AttackResult, attackerId: string, targetId: string, attackerClass: string, targetClass: string, attackName?: string, paCost?: number, paModifiers?: string[], preTimesDamaged?: number): GameState {
    let s = result.state;
    const { combat: modsFromBuild, paMods: costModsFromBuild } = buildAttackModifiers(s, attackerId, targetId, result.configId, preTimesDamaged, result.consumedModifiers);
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
    // Aura de mando: snapshot al momento del ataque (no del estado vivo)
    if (attackerClass === 'general') {
        const atkUnit = s.units[attackerId];
        if (atkUnit) {
            const ab = getAuraBuffs(s, atkUnit.owner);
            if (ab.difficultyReduction > 0) mods.push(`[diff] [id:aura.precision] [i18n:aura.precision] ${ab.difficultyReduction}`);
        }
    }
    if (targetClass === 'general') {
        const defUnit = s.units[targetId] ?? s.graveyard[targetId];
        if (defUnit) {
            const ab = getAuraBuffs(s, defUnit.owner);
            if (ab.difficultyPenalty > 0) mods.push(`[diff] [id:aura.evasion] [i18n:aura.evasion] ${ab.difficultyPenalty}`);
            if (ab.defenseBonus > 0) mods.push(`[def] [id:aura.defense] [i18n:aura.defense] ${ab.defenseBonus}`);
        }
    }
    const atkUnit = s.units[attackerId];

    const allPaMods = [...(paModifiers ?? []), ...costModsFromBuild];
    // Compute distance from positions
    const dist = atkUnit && s.units[targetId] ? hexDistance(atkUnit.position, s.units[targetId].position) : 0;
    // Prepend difficulty formula
    if (atkUnit) {
        const target = s.units[targetId] ?? s.graveyard[targetId];
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
            configId: result.configId,
            modifiers: mods,
            paCost,
            paModifiers: allPaMods,
            distance: dist,
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
