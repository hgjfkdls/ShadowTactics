import type { GameState, Unit, UnitId } from '@shared/game/state';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import type { ConfigEffect } from '@shared/game/data/ability-config/types';
import { hexDistance } from '@shared/hex';
import { BASE_STATS } from '@shared/game/units';
import { l } from '@shared/i18n';

export type UnitIndicatorCategory = 'aura' | 'offensive' | 'defensive' | 'cost';

export type UnitIndicator = {
    icon: 'crosshair' | 'shield' | 'coin';
    category: UnitIndicatorCategory;
    label: string;
};

function getUnitMaxHp(cls: string): number {
    const base = (BASE_STATS as any)[cls];
    return base?.hp ?? 10;
}

function matchesTargetFilter(
    unit: Unit,
    filter: ConfigEffect['targetFilter'],
    context: { attacker?: Unit | null; state: GameState },
): boolean {
    if (!filter) return true;
    if (filter.classes && !filter.classes.includes(unit.class)) return false;
    if (filter.isolated !== undefined) {
        const hasAlly = Object.values(context.state.units).some(u =>
            u.owner === unit.owner && u.id !== unit.id && hexDistance(unit.position, u.position) === 1
        );
        if (filter.isolated && hasAlly) return false;
        if (!filter.isolated && !hasAlly) return false;
    }
    if (filter.targetHpMaxPercent !== undefined) {
        const maxHp = getUnitMaxHp(unit.class);
        if ((unit.hp / maxHp) * 100 > filter.targetHpMaxPercent) return false;
    }
    if (filter.targetDidMovePreviousTurn !== undefined) {
        if (context.state.turn <= 1) return false;
        if ((unit.didMovePreviousTurn ?? false) !== filter.targetDidMovePreviousTurn) return false;
    }
    if (filter.lastTargetId !== undefined && context.attacker) {
        if (context.attacker.lastTargetId !== unit.id) return false;
    }
    return true;
}

function hasActiveModifier(
    state: GameState,
    unit: Unit,
    stat: string,
    sourceName?: string,
): boolean {
    return state.activeModifiers.some(m =>
        m.stat === stat
        && m.targetId === unit.id
        && m.sourcePlayerId === unit.owner
        && (m.remainingTurns === undefined || m.remainingTurns >= 0)
        && (m.remainingUses ?? 1) > 0
        && (!sourceName || m.sourceName === sourceName)
    );
}

function getValueFromAbility(abilId: string): { stat?: string; value?: number } | undefined {
    const cfg = ABILITY_CONFIG[abilId];
    const valueEffect = cfg?.effects?.find(e =>
        e.type === 'combatMutator' || e.type === 'modifierPush'
    );
    if (!valueEffect) return undefined;
    return { stat: valueEffect.stat, value: valueEffect.value };
}

function mapToNewCategory(indicatorCategory: string | undefined, abilId: string): UnitIndicatorCategory {
    const cat = indicatorCategory ?? 'attack';
    if (cat === 'cost') return 'cost';
    if (cat === 'attack' || cat === 'range') return 'offensive';
    if (cat === 'defense') return 'defensive';
    if (cat === 'difficulty') {
        const ve = getValueFromAbility(abilId);
        if (ve?.value !== undefined && ve.value < 0) return 'offensive'; // -dificultad = precision = ofensivo
        return 'defensive'; // +dificultad = evasion = defensivo
    }
    return 'defensive';
}

function getLabelForEffect(
    abilId: string,
    effect: ConfigEffect,
    source: Unit,
    unit: Unit,
    state: GameState,
    remainingUsesOverride?: number,
): string {
    if (effect.indicatorLabel) return effect.indicatorLabel;

    // Try descriptionKey from the indicator effect itself first (self-contained)
    const descKey = effect.descriptionKey;
    if (descKey) {
        const desc = l(descKey);
        if (desc && desc !== descKey) {
            return desc;
        }
    }

    // Fallback: find companion combatMutator/modifierPush for value info
    const cfg = ABILITY_CONFIG[abilId];
    const valueEffect = cfg?.effects?.find(e =>
        e.type === 'combatMutator' || e.type === 'modifierPush'
    );

    let label = l(`ability.${abilId}.name`) || abilId;

    // Also try descriptionKey from the companion effect
    if (valueEffect?.descriptionKey) {
        const desc = l(valueEffect.descriptionKey);
        if (desc && desc !== valueEffect.descriptionKey) {
            label = desc;
        }
    }

    if (valueEffect?.value !== undefined && valueEffect.stat) {
        const combatStats = new Set(['attack', 'defense', 'difficulty', 'range', 'damage', 'movementCost', 'attackCost', 'actionCost']);
        if (!combatStats.has(valueEffect.stat)) return label;

        let val = valueEffect.value;
        if (valueEffect.identityBonus) {
            const identity = state.players[source.owner]?.selectedIdentity ?? '';
            for (const [prefix, bonus] of Object.entries(valueEffect.identityBonus)) {
                if (identity.startsWith(prefix)) val += bonus;
            }
        }
        if (valueEffect.conditionalValue) {
            let matched = false;
            for (const cv of valueEffect.conditionalValue) {
                let matches = true;
                if (cv.attackerClasses && !cv.attackerClasses.includes(source.class)) matches = false;
                if (cv.excludeTargetClasses && cv.excludeTargetClasses.includes(unit.class)) matches = false;
                const targetClassList = cv.targetClasses ?? cv.includeTargetClasses;
                if (targetClassList && !targetClassList.includes(unit.class)) matches = false;
                if (!matches) continue;
                if ((cv.operator ?? 'set') === 'set') { val = cv.value; matched = true; break; }
                val += cv.value;
                matched = true;
            }
        }
        const prefix = val > 0 ? '+' : '';
        const valStr = `${prefix}${val}`;
        if (!label.includes(valStr)) {
            const abbrKey: Record<string, string> = {
                attack: 'passive.attackAbbr',
                defense: 'passive.defenseAbbr',
                difficulty: 'passive.difficultyAbbr',
                range: 'cat.range',
                damage: 'unitDetail.hp',
                movementCost: 'unitDetail.costLabel',
                attackCost: 'unitDetail.costLabel',
                actionCost: 'unitDetail.costLabel',
            };
            const key = abbrKey[valueEffect.stat] ?? '';
            const abbr = key ? l(key) : '';
            const abbrStr = abbr && abbr !== key ? abbr : valueEffect.stat;
            label += ` (${valStr} ${abbrStr})`;
        }
        const uses = remainingUsesOverride ?? valueEffect.remainingUses;
        if (uses !== undefined && uses > 1) {
            label += ` (x${uses})`;
        }
    }
    return label;
}

export function getIndicatorsForUnit(
    state: GameState,
    unit: Unit,
    selectedUnit: Unit | null,
    attackingUnit: Unit | null,
    pendingAbilityId: string | null,
    pendingAbilityUnitId: UnitId | null,
    playerId?: string,
): UnitIndicator[] {
    try {
        return getIndicatorsForUnitSafe(state, unit, selectedUnit, attackingUnit, pendingAbilityId, pendingAbilityUnitId, playerId).indicators;
    } catch (e) {
        console.error('[getIndicatorsForUnit] error:', e, 'unit:', unit?.id);
        return [];
    }
}

export function getConditionalIndicatorsForUnit(
    state: GameState,
    unit: Unit,
    selectedUnit: Unit | null,
    attackingUnit: Unit | null,
    pendingAbilityId: string | null,
    pendingAbilityUnitId: UnitId | null,
    playerId?: string,
): UnitIndicator[] {
    try {
        return getIndicatorsForUnitSafe(state, unit, selectedUnit, attackingUnit, pendingAbilityId, pendingAbilityUnitId, playerId).conditional;
    } catch (e) {
        console.error('[getConditionalIndicatorsForUnit] error:', e, 'unit:', unit?.id);
        return [];
    }
}

function getIndicatorsForUnitSafe(
    state: GameState,
    unit: Unit,
    selectedUnit: Unit | null,
    attackingUnit: Unit | null,
    pendingAbilityId: string | null,
    pendingAbilityUnitId: UnitId | null,
    playerId?: string,
): { indicators: UnitIndicator[]; conditional: UnitIndicator[] } {
    const indicators: UnitIndicator[] = [];
    const conditional: UnitIndicator[] = [];
    const processedKeys = new Set<string>();

    // ─── Source 1: selectedUnit abilities (triggerOn: 'select') ───
    if (selectedUnit) {
        for (const abilId of selectedUnit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilId];
            if (!cfg?.effects) continue;
            for (const effect of cfg.effects) {
                if (effect.type !== 'indicator') continue;
                const trigger = effect.indicatorTrigger ?? 'select';
                if (trigger !== 'select') continue;
                // Skip indicatorOnEnemySelect in select flow — they're handled by Source 3
                if (effect.indicatorOnEnemySelect) continue;
                const visible = effect.indicatorVisibleTo ?? 'active';
                if (visible !== 'active' && visible !== 'owner') continue;

                const key = `${abilId}-${unit.id}`;
                if (processedKeys.has(key)) continue;

                if (effect.modifierStat) {
                    if (!hasActiveModifier(state, unit, effect.modifierStat, effect.modifierSourceName)) continue;
                } else if (!matchesTargetFilter(unit, effect.targetFilter, { attacker: selectedUnit, state })) {
                    continue;
                }

                // Check target field: 'enemies' → only if different owner
                if (effect.target === 'enemies' && unit.owner === selectedUnit.owner) continue;
                if ((effect.target === 'self' || effect.target === 'ally') && unit.owner !== selectedUnit.owner) continue;

                processedKeys.add(key);
                    const label = getLabelForEffect(abilId, effect, selectedUnit, unit, state);
                    const icon = effect.indicatorIcon ?? 'crosshair';
                    const category = mapToNewCategory(effect.indicatorCategory, abilId);
                    indicators.push({ icon, label, category });
                    conditional.push({ icon, label, category });
            }
        }
    }

    // ─── Source 2: attackingUnit abilities (trigger: 'attack') ───
    if (attackingUnit) {
        for (const abilId of attackingUnit.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilId];
            if (!cfg?.effects) continue;
            for (const effect of cfg.effects) {
                if (effect.type !== 'indicator') continue;
                const trigger = effect.indicatorTrigger ?? 'select';
                if (trigger !== 'attack') continue;
                // Skip indicatorOnEnemySelect indicators in attack flow — they're defender-side, handled by Source 3
                if (effect.indicatorOnEnemySelect) continue;

                const key = `${abilId}-${unit.id}`;
                if (processedKeys.has(key)) continue;

                if (effect.modifierStat) {
                    if (!hasActiveModifier(state, unit, effect.modifierStat, effect.modifierSourceName)) continue;
                } else if (!matchesTargetFilter(unit, effect.targetFilter, { attacker: attackingUnit, state })) {
                    continue;
                }

                if (effect.target === 'enemies' && unit.owner === attackingUnit.owner) continue;
                if ((effect.target === 'self' || effect.target === 'ally') && unit.owner !== attackingUnit.owner) continue;

                processedKeys.add(key);
                const item = {
                    icon: effect.indicatorIcon ?? 'crosshair',
                    label: getLabelForEffect(abilId, effect, attackingUnit, unit, state),
                    category: mapToNewCategory(effect.indicatorCategory, abilId),
                };
                indicators.push(item);
                conditional.push(item);
            }
        }
    }

    // ─── Source 3: all units' abilities (triggerOn: 'always' + indicatorOnEnemySelect) ───
    // Shows modifiers/state on the unit itself (resistencia, linea_defensiva)
    // Also shows indicators when an enemy matching conditions is selected (formacion_defensiva)
    for (const source of Object.values(state.units)) {
        for (const abilId of source.abilities ?? []) {
            const cfg = ABILITY_CONFIG[abilId];
            if (!cfg?.effects) continue;
            for (const effect of cfg.effects) {
                if (effect.type !== 'indicator') continue;
                const trigger = effect.indicatorTrigger ?? 'select';
                if (trigger !== 'always') {
                    // Check indicatorOnEnemySelect: show when selectedUnit is an enemy matching conditions
                    if (effect.indicatorOnEnemySelect && selectedUnit) {
                        const ies = effect.indicatorOnEnemySelect;
                        if (ies.enemyClasses && !ies.enemyClasses.includes(selectedUnit.class)) continue;
                        if (ies.range !== undefined && hexDistance(source.position, selectedUnit.position) > ies.range) continue;
                        if (ies.targetClasses && !ies.targetClasses.includes(source.class)) continue;
                    } else {
                        continue;
                    }
                }

                const key = `${abilId}-${unit.id}`;
                if (processedKeys.has(key)) continue;

                // Check if this indicator applies to this unit
                if (effect.modifierStat) {
                    if (!hasActiveModifier(state, unit, effect.modifierStat, effect.modifierSourceName)) continue;
                } else if (!matchesTargetFilter(unit, effect.targetFilter, { attacker: null, state })) {
                    continue;
                }

                // For 'always' indicators, check target ownership if source is the ability owner
                if (effect.target === 'enemies' && unit.owner === source.owner) continue;
                if ((effect.target === 'self' || effect.target === 'ally') && unit.owner !== source.owner) continue;
                // For indicatorOnEnemySelect, only show on the source unit itself (not all allies)
                if (effect.indicatorOnEnemySelect && unit.id !== source.id) continue;

                processedKeys.add(key);
                const icon = effect.indicatorIcon ?? 'shield';
                // Get remainingUses from activeModifiers for this ability
                const activeMods = state.activeModifiers.filter(m =>
                    m.sourceName === abilId && m.targetId === unit.id && (m.remainingUses ?? 1) > 0
                );
                const remainingUses = activeMods.length > 0
                    ? Math.max(...activeMods.map(m => m.remainingUses ?? 1))
                    : undefined;
                const label = getLabelForEffect(abilId, effect, source, unit, state, remainingUses);
                const item = { icon, label, category: mapToNewCategory(effect.indicatorCategory, abilId) };
                indicators.push(item);
                if (effect.indicatorOnEnemySelect || effect.indicatorTrigger === 'select') {
                    conditional.push(item);
                }
            }
        }
    }

    // ─── Source 4: card modifiers on specific units (player-wide shown in player panel) ───
    for (const modifier of state.activeModifiers) {
        if (modifier.source !== 'card') continue;
        if (modifier.remainingTurns !== undefined && modifier.remainingTurns < 0) continue;
        if (modifier.remainingUses !== undefined && modifier.remainingUses <= 0) continue;
        if (modifier.targetId === undefined) continue; // player-wide, no indicator en unidad
        if (modifier.targetId !== unit.id) continue;
        if (modifier.sourcePlayerId !== unit.owner) continue;

        const cfg = ABILITY_CONFIG[modifier.sourceName ?? ''];
        if (!cfg?.effects) continue;
        for (const effect of cfg.effects) {
            if (effect.type !== 'indicator') continue;
            if (effect.modifierStat && effect.modifierStat !== modifier.stat) continue;
            if (effect.modifierSourceName && effect.modifierSourceName !== modifier.sourceName) continue;
            const label = effect.indicatorLabel ?? modifier.sourceName ?? '';
            const icon = effect.indicatorIcon ?? 'crosshair';
            const category = mapToNewCategory(effect.indicatorCategory, modifier.sourceName ?? '');
            if (indicators.some(i => i.label === label && i.icon === icon)) continue;
            indicators.push({ icon, label, category });
        }
    }

    // Deduplicate by icon+label
    const deduped = indicators.filter((ind, i) =>
        i === indicators.findIndex(o => o.label === ind.label && o.icon === ind.icon)
    );
    const condDeduped = conditional.filter((ind, i) =>
        i === conditional.findIndex(o => o.label === ind.label && o.icon === ind.icon)
    ).filter(cd => deduped.some(d => d.label === cd.label && d.icon === cd.icon));
    return { indicators: deduped, conditional: condDeduped };
}