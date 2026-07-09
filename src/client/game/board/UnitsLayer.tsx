import { useState } from 'react';
import { hexDistance, getDifficulty } from '@shared';
import type { GameState, GameAction, UnitId, ModifierInstance, HexCoord } from '@shared';
import type { Unit } from '@shared/game/state';
import { axialToPixel } from './hexMath';
import { BASE_STATS } from '@shared/game/units';
import { l } from '@shared/i18n';
import { UnitTooltip } from './UnitTooltip';
import { statusLabel, classLabel, hitPercent } from './unitLabels';
import { getAuraBuffs } from '@shared/game/aura';
import { getAbilityHighlights } from '@shared/game/board/selection';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { getIndicatorsForUnit } from './getUnitIndicators';
import type { UnitIndicator } from './getUnitIndicators';

type Props = {
    state: GameState;
    selectedUnitId: UnitId | null;
    attackingUnitId?: UnitId | null;
    pendingAbilityId?: string | null;
    pendingAbilityUnitId?: UnitId | null;
    playerId?: string;
    canAct?: boolean;
    identityTargetMode?: boolean;
    onIdentityTargetSelect?: (unitId: UnitId) => void;
    cardTargetMode?: boolean;
    isCardTargetAlly?: boolean;
    isCardTargetEnemy?: boolean;
    cardTargetCardId?: string;
    onCardTargetSelect?: (cardId: string, targetId: UnitId) => void;
    onPatadaTargetSelect?: (unitId: UnitId) => void;
    animPositions?: Record<string, HexCoord>;
    movingUnitId?: UnitId | null;
    pendingCounterEspejoCard?: string | null;
    setPendingCounterEspejoCard?: (cardId: string | null) => void;
    onSelectUnit: (unitId: UnitId) => void;
    onRequestMove?: (unitId: UnitId) => void;
    onRequestAttack?: (unitId: UnitId) => void;
    onAttackUnit?: (attackerId: UnitId, targetId: UnitId) => void;
    onRequestAbilityTarget?: (abilityId: string, unitId: UnitId) => void;
    onUseAbilityOnUnit?: (abilityId: string, unitId: UnitId, targetId: UnitId) => void;
    onHexClick?: (hex: HexCoord) => void;
    onInfoSelect?: (info: { type: 'unit'; unitId: string }) => void;
    sendAction?: (action: GameAction) => void;
};

function getMaxHp(cls: string): number {
    return BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
}

const TOKEN_W = 38;
const TOKEN_H = 46;
const TOKEN_RX = 7;

export function UnitsLayer({ state, selectedUnitId, attackingUnitId, pendingAbilityId, pendingAbilityUnitId, playerId, canAct, identityTargetMode, onIdentityTargetSelect, cardTargetMode, isCardTargetAlly, isCardTargetEnemy, cardTargetCardId, onCardTargetSelect, pendingCounterEspejoCard, setPendingCounterEspejoCard, onPatadaTargetSelect, animPositions, movingUnitId, onSelectUnit, onRequestMove, onRequestAttack, onAttackUnit, onRequestAbilityTarget, onUseAbilityOnUnit, onHexClick, onInfoSelect, sendAction }: Props) {
    const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

    const pendingAbilityTargetHexes = pendingAbilityId && pendingAbilityUnitId
        ? getAbilityHighlights(state, pendingAbilityUnitId, pendingAbilityId)
            .filter(h => h.highlight !== 'range')
            .map(h => h.hex)
        : [];

    const units = Object.values(state.units);

    // Hovered unit last so its <g> (including tooltip) draws on top
    // Selected unit second to last so its persistent tooltip isn't covered
    const sortedUnits = [...units].sort((a, b) => {
        if (a.id === hoveredUnitId) return 1;
        if (b.id === hoveredUnitId) return -1;
        if (a.id === selectedUnitId) return 1;
        if (b.id === selectedUnitId) return -1;
        return 0;
    });

    return (
        <>
            {sortedUnits.map(unit => {
                const animPos = animPositions?.[unit.id];
                const renderPos = animPos ?? unit.position;
                const { x, y } = axialToPixel(renderPos);
                const selected = unit.id === selectedUnitId;
                const hovered = hoveredUnitId === unit.id;
                const maxHp = getMaxHp(unit.class);
                const { buffs, debuffs } = getUnitStatus(unit, state.activeModifiers);
                const auraBuffs = unit.class === 'general' ? getAuraBuffs(state, unit.owner) : null;

                const selectedUnit = selectedUnitId ? state.units[selectedUnitId] : null;
                const attackingUnit = attackingUnitId ? state.units[attackingUnitId] : null;
                const isArcher = (attackingUnit?.class === 'archer' || attackingUnit?.class === 'general');
                const espartanoRangeBonus = attackingUnit?.espartanoRangeBonus ? 1 : 0;
                const rangeModBonus = (attackingUnitId ? state.activeModifiers
                    .filter(m => m.stat === 'range' && (m.targetId === undefined || m.targetId === attackingUnitId)
                        && (m.remainingUses === undefined || m.remainingUses > 0)
                        && (m.remainingTurns === undefined || m.remainingTurns >= 0))
                    .reduce((s, m) => m.operator === 'ADD' ? s + m.value : s, 0) : 0);
                const tiroDistanciaBonus = (attackingUnit && attackingUnit.class !== 'general' && state.players[attackingUnit.owner]?.selectedIdentity?.startsWith('francotirador')) ? 1 : 0;
                const attackRange = (attackingUnit?.range ?? 0) + espartanoRangeBonus + rangeModBonus + tiroDistanciaBonus;
                const isAttackTarget = attackingUnit !== null && unit.owner !== playerId && hexDistance(attackingUnit.position, unit.position) <= attackRange;
                const isPendingAbilityTarget = pendingAbilityId && pendingAbilityUnitId
                    ? pendingAbilityTargetHexes.some(h => h.q === unit.position.q && h.r === unit.position.r)
                    : false;

                const pendingAttacker = pendingAbilityId && pendingAbilityUnitId ? state.units[pendingAbilityUnitId] : null;

                // Config-driven indicators from ability effects
                const indicators = getIndicatorsForUnit(state, unit, selectedUnit, attackingUnit, pendingAbilityId, pendingAbilityUnitId, playerId);

                const unitAbilities = unit.abilities ?? [];
                const hasActiveShield = unitAbilities.includes('linea_defensiva') && unit.didMovePreviousTurn === false
                    || unitAbilities.includes('resistencia') && !unit.timesDamagedThisTurn;
                const isAttacking = attackingUnitId !== null || (pendingAbilityId !== null && ['patada_acrobatica', 'fuego_cobertura'].includes(pendingAbilityId));
                const attackerHasRomperFilas = !!(attackingUnit?.abilities ?? []).includes('romper_filas') || !!(selectedUnit?.abilities ?? []).includes('romper_filas');
                const hasShieldClass = unit.class === 'infantry' || (unit.class === 'general' && (unitAbilities.includes('resistencia') || unitAbilities.includes('linea_defensiva')));
                const showShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && unit.owner !== playerId && hasShieldClass && hasActiveShield && !attackerHasRomperFilas;

                const hasTerror = state.activeModifiers.some(m =>
                    m.targetId === unit.id && m.stat === 'difficulty' && m.value > 0 && (m.remainingUses ?? 1) > 0
                );
                const isTiranoViewer = (state.players[playerId]?.selectedIdentity ?? '').startsWith('furia_tirano');

                const showCelestialRay = state.activeModifiers.some(m => m.stat === 'attack' && m.targetId === unit.id && m.sourceName === 'rayo_celestial' && (m.remainingUses ?? 0) > 0);
                const celestialRayValue = state.activeModifiers.find(m => m.stat === 'attack' && m.targetId === unit.id && m.sourceName === 'rayo_celestial')?.value ?? 0;

                const unitOwnerIdentity = state.players[unit.owner]?.selectedIdentity ?? '';
                const identityKey = unitOwnerIdentity ? unitOwnerIdentity.split('_').slice(0, -1).join('_') : '';
                const hasDamageReductionMod = state.activeModifiers.some(m => (m.targetId as string | undefined) === unit.id && ((m.stat === 'damage' && m.value < 0) || (m.stat === 'defense' && m.value > 0)) && (m.remainingUses ?? 1) > 0);
                const hasAttackBonusMod = state.activeModifiers.some(m => (m.targetId as string | undefined) === unit.id && m.stat === 'attack' && m.value > 0 && (m.remainingUses ?? 1) > 0);
                const isMonjeShaolin = unitOwnerIdentity.startsWith('monje_shaolin');
                const isCorazonEstratega = unitOwnerIdentity.startsWith('corazon_estratega');
                const showAtaqueExtra = (unit.ataqueExtraCharges ?? 0) > 0 && unit.owner === playerId;
                const showPrecision = (unit.precisionCharges ?? 0) > 0 && unit.owner === playerId;
                const showMeditacionShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && unit.owner !== playerId && hasDamageReductionMod && isMonjeShaolin;
                const showFormacionLineaShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && hasDamageReductionMod && isCorazonEstratega;
                const showFormacionTrianguloDiana = unit.owner === playerId && hasAttackBonusMod && isCorazonEstratega && !!selectedUnit;

                const hasRoyalShield = unit.royalShieldSavedHp !== undefined;
                const hasProtegerShield = state.activeModifiers.some(m => m.id.startsWith('proteger_') && m.targetId === unit.id && (m.remainingUses ?? 1) > 0);

                const isDiosTrueno = unitOwnerIdentity.startsWith('dios_trueno');
                const showFuriaBerserker = isDiosTrueno && (unit.class === 'infantry' || unit.class === 'general')
                    && unit.hp <= Math.floor(getMaxHp(unit.class) / 2);
                const liderarBonus = state.players[unit.owner]?.liderarAtaqueBonus;
                const isInfantryOrGeneral = unit.class === 'infantry' || unit.class === 'general';
                const showLiderarTropas = !!liderarBonus && liderarBonus > 0 && isInfantryOrGeneral;

                const passiveLabels: string[] = [];
                for (const ind of indicators) {
                    passiveLabels.push(ind.label);
                }
                if (hasTerror) {
                    if (unit.owner !== playerId && isTiranoViewer) {
                        passiveLabels.push(l('passive.terror'));
                    } else if (unit.owner === playerId && !isTiranoViewer) {
                        passiveLabels.push(l('passive.terrorDifficulty'));
                    }
                }
                if (showLiderarTropas) passiveLabels.push(`${l('passive.liderarActive')} (+${liderarBonus} ${l('passive.attackAbbr')})`);
                if (isDiosTrueno && unit.class === 'general') {
                    const hasValidAlly = Object.values(state.units).some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(unit.position, u.position) <= 2);
                    if (hasValidAlly) passiveLabels.push(`${l('passive.rayoCelestialDisponible')} (${l('passive.attackAbbr')} +3)`);
                }
                if (isMonjeShaolin) passiveLabels.push(l('passive.karma'));
                const isEspartano = unitOwnerIdentity.startsWith('espartano');
                if (unit.espartanoRangeBonus) passiveLabels.push(l('passive.lanzaEscudoRango'));
                if (unit.espartanoDefenseBonus) passiveLabels.push(l('passive.lanzaEscudoDefensa'));
                const showMuroEspartano = isEspartano && (unit.class === 'lancer' || unit.class === 'general')
                    && Object.values(state.units).some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(unit.position, u.position) === 1 && (
                        u.class === 'lancer' || (u.class === 'general' && (state.players[u.owner]?.selectedIdentity ?? '').startsWith('espartano'))
                    ));
                if (showMuroEspartano) passiveLabels.push(l('passive.muroEspartano'));
                if (showAtaqueExtra) passiveLabels.push(l('passive.ataqueExtra'));
                if (showPrecision) passiveLabels.push(l('passive.precision'));

                const attackAbilities = new Set(['patada_acrobatica', 'fuego_cobertura', 'carga', 'doble_ataque', 'ventaja_alcance']);
                const isAbilityTarget = pendingAttacker && unit.owner !== playerId && isEnemyInAbilityRange(pendingAttacker.position, unit.position, pendingAbilityId ?? '', pendingAttacker);

                const attackInfo = (attackingUnit && isAttackTarget) || (isAbilityTarget && pendingAttacker) ? (() => {
                    const attacker = attackingUnit ?? pendingAttacker!;
                    const dist = hexDistance(attacker.position, unit.position);
                    const base = getDifficulty(attacker, dist);
                    let final = base;
                    if (unit.didMovePreviousTurn === false && (attacker.abilities ?? []).includes('blanco_facil')) {
                        final -= 1;
                    }
                    if ((state.players[attacker.owner]?.selectedIdentity ?? '').startsWith('cazadores')) {
                        const isCavOrGen = attacker.class === 'cavalry' || attacker.class === 'general';
                        if (isCavOrGen && unit.hp <= Math.floor(getMaxHp(unit.class) / 2)) {
                            final -= 1;
                        }
                    }
                    if (pendingAbilityId === 'carga') final -= 1;
                    if ((attacker.ataqueExtraCharges ?? 0) > 0) final += 2;
                    if ((attacker.precisionCharges ?? 0) > 0) final -= 2;
                    const diffMod = state.activeModifiers
                        .filter(m => m.stat === 'difficulty' && (m.remainingUses ?? 1) > 0 && m.sourcePlayerId === attacker.owner && (m.targetId === undefined || m.targetId === attacker.id))
                        .reduce((s, m) => m.operator === 'ADD' ? s + m.value : s, 0);
                    final += diffMod;
                    // Aura de mando
                    if (attacker.class === 'general') {
                        const auraAtk = getAuraBuffs(state, attacker.owner);
                        final -= auraAtk.difficultyReduction;
                    }
                    if (unit.class === 'general') {
                        const auraDef = getAuraBuffs(state, unit.owner);
                        final += auraDef.difficultyPenalty;
                    }
                    return { distance: dist, difficulty: final, baseDifficulty: base };
                })() : null;

                const hasAdjacentEnemy = unit.owner === playerId && Object.values(state.units)
                    .filter(u => u.owner !== playerId)
                    .some(u => hexDistance(unit.position, u.position) === 1);

                const fill = unit.owner === 'p1' ? '#4c1d95' : '#155e75';
                const stroke = selected ? '#fde047' : unit.owner === 'p1' ? '#a78bfa' : '#22d3ee';
                const strokeW = selected ? 2.5 : 1.5;

                // ─── New UI: token + HP bar + traffic light indicators ───
                const hpPct = Math.max(0, Math.min(1, unit.hp / maxHp));
                const hasAura = auraBuffs !== undefined && auraBuffs !== null && (auraBuffs.shieldPoints > 0 || auraBuffs.difficultyReduction > 0 || auraBuffs.defenseBonus > 0 || auraBuffs.difficultyPenalty > 0);
                const showAtkInd = indicators.some(i => i.category === 'offensive');
                const showDefInd = indicators.some(i => i.category === 'defensive');
                const showCostInd = indicators.some(i => i.category === 'cost');

                // Owner color ring
                const ownerColor = unit.owner === 'p1' ? '#a78bfa' : '#22d3ee';

                // Traffic light panel: right side, dark background
                const showTraffic = hasAura || showAtkInd || showDefInd || showCostInd;
                const trafficCount = (hasAura ? 1 : 0) + (showAtkInd ? 1 : 0) + (showDefInd ? 1 : 0) + (showCostInd ? 1 : 0);
                const panelY = showTraffic ? (hasAura ? -16 : -12) : 0;
                const panelH = showTraffic ? trafficCount * 8 + 4 : 0;
                const trafficSpacing = 8;

                return (
                    <g
                        key={unit.id}
                        transform={`translate(${x}, ${y})`}
                        onClick={e => {
                            const cfg = pendingAbilityId ? ABILITY_CONFIG[pendingAbilityId] : undefined;
                            const isMultiStep = cfg && Array.isArray(cfg.target);
                            if (isMultiStep) {
                                if (onHexClick) onHexClick(unit.position);
                                return;
                            }
                            e.stopPropagation();
                            if (identityTargetMode && unit.owner !== playerId && unit.class !== 'general') {
                                onIdentityTargetSelect?.(unit.id);
                            } else if (attackingUnitId && isAttackTarget) {
                                onAttackUnit?.(attackingUnitId, unit.id);
                            } else if (pendingAbilityId === 'patada_acrobatica' && pendingAbilityUnitId && unit.owner !== playerId) {
                                onPatadaTargetSelect?.(unit.id);
                            } else if (pendingAbilityId && pendingAbilityUnitId && unit.owner !== playerId && isPendingAbilityTarget) {
                                onUseAbilityOnUnit?.(pendingAbilityId, pendingAbilityUnitId, unit.id);
                            } else if (pendingAbilityId && pendingAbilityUnitId && unit.owner === playerId && isPendingAbilityTarget) {
                                onUseAbilityOnUnit?.(pendingAbilityId, pendingAbilityUnitId, unit.id);
                            } else if (pendingCounterEspejoCard && unit.owner !== playerId) {
                                sendAction?.({ type: 'USE_CARD', playerId: playerId as any, cardId: pendingCounterEspejoCard, targetId: unit.id });
                                setPendingCounterEspejoCard?.(null);
                            } else if (cardTargetMode && isCardTargetEnemy && unit.owner !== playerId) {
                                onCardTargetSelect?.(cardTargetCardId ?? '', unit.id);
                            } else {
                                onInfoSelect?.({ type: 'unit', unitId: unit.id });
                                onSelectUnit(unit.id);
                            }
                        }}
                        onMouseEnter={() => setHoveredUnitId(unit.id)}
                        onMouseLeave={() => setHoveredUnitId(null)}
                        className="cursor-pointer"
                        style={{ outline: 'none' }}
                    >
                        {/* Owner color ring behind the icon */}
                        <circle cx={0} cy={3} r={15} fill="none" stroke={ownerColor} strokeWidth={1.5} opacity={0.8} pointerEvents="none" />

                        {/* Class icon SVG */}
                        <g transform="translate(-10, -6)">
                            <BustSvg cls={unit.class} size={20} />
                        </g>

                        {/* HP bar with shield overlay (square) */}
                        <rect x={-14} y={17} width={28} height={5} rx={0} fill="#374151" pointerEvents="none" />
                        {(() => {
                            const royalShield = unit.royalShieldSavedHp !== undefined ? unit.hp - unit.royalShieldSavedHp : 0;
                            const baseHp = unit.royalShieldSavedHp ?? unit.hp;
                            const effectiveTotal = (unit.hp + (unit.auraShield ?? 0)) > maxHp ? (unit.hp + (unit.auraShield ?? 0)) : maxHp;
                            const auraShieldVal = unit.auraShield === 1 ? 2 : (unit.auraShield ?? 0);
                            const hpW = Math.round(28 * (baseHp / effectiveTotal));
                            const royalShieldW = royalShield > 0 ? Math.max(1, Math.round(28 * (royalShield / effectiveTotal))) : 0;
                            const auraShieldW = auraShieldVal > 0 ? Math.max(1, Math.round(28 * (auraShieldVal / effectiveTotal))) : 0;
                            const baseHpPct = baseHp / maxHp;
                            return <>
                                <rect x={-14} y={17} width={hpW} height={5} rx={0} fill={baseHpPct > 0.5 ? '#22c55e' : baseHpPct > 0.25 ? '#eab308' : '#ef4444'} pointerEvents="none" />
                                {royalShieldW > 0 && <rect x={-14 + hpW} y={17} width={royalShieldW} height={5} rx={0} fill="#f0f0f0" pointerEvents="none" />}
                                {auraShieldW > 0 && <rect x={-14 + hpW + royalShieldW} y={17} width={auraShieldW} height={5} rx={0} fill="#e2e8f0" pointerEvents="none" />}
                            </>;
                        })()}

                        {/* ─── Horizontal indicator panel (fixed width, start-aligned) ─── */}
                        {showTraffic && (() => {
                            const items: { key: string; show: boolean; color: string; stroke: string }[] = [
                                { key: 'aura', show: hasAura, color: '#a78bfa', stroke: '#7c3aed' },
                                { key: 'atk', show: showAtkInd, color: '#ef4444', stroke: '#dc2626' },
                                { key: 'def', show: showDefInd, color: '#3b82f6', stroke: '#2563eb' },
                                { key: 'cost', show: showCostInd, color: '#fbbf24', stroke: '#d97706' },
                            ];
                            const pw = 44; // fixed width for 4 circles
                            let xOff = -pw / 2 + 6; // start from left with padding
                            return (
                                <g transform="translate(0, -16)" pointerEvents="none">
                                    <rect x={-pw / 2} y={-6} width={pw} height={12} rx={3} fill="#374151" fillOpacity={0.95} stroke="#4b5563" strokeWidth={0.5} />
                                    {items.map((item) => {
                                        if (!item.show) return null;
                                        const cx = xOff;
                                        xOff += 10;
                                        return <circle key={item.key} cx={cx} cy={0} r={3.5} fill={item.color} stroke={item.stroke} strokeWidth={0.5} />;
                                    })}
                                </g>
                            );
                        })()}

                        {hovered && (
                            <UnitTooltip unit={unit} maxHp={maxHp} identityName={unit.class === 'general' && identityKey ? l(`identity.${identityKey}.name`) : undefined} ownerColor={ownerColor} buffs={buffs} debuffs={debuffs} attackInfo={attackInfo} indicators={indicators} auraBuffs={auraBuffs} />
                        )}
                    </g>
                );
            })}
        </>
    );
}



function isEnemyInAbilityRange(from: { q: number; r: number }, to: { q: number; r: number }, abilityId: string, unit: Unit): boolean {
    const d = hexDistance(from, to);
    switch (abilityId) {
        case 'patada_acrobatica': return d <= 1;
        case 'carga': {
            if (!unit.cabalgarDir) return false;
            return to.q === from.q + unit.cabalgarDir.dq && to.r === from.r + unit.cabalgarDir.dr;
        }
        case 'fuego_cobertura':
        case 'doble_ataque':
        case 'avance': return d <= unit.range;
        case 'ventaja_alcance': return d === unit.range + 1;
        case 'desenvainado_veloz': return d <= unit.range;
        default: return false;
    }
}

function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];

    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'actionCost', 'bloqueo', 'inmovil'];
    const helpfulStats = ['attack', 'dotOnHit'];
    const passiveStats: string[] = [];

    for (const m of modifiers) {
        if (m.remainingTurns < 0) continue;
        if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;

        const isUnitSpecific = m.targetId === unit.id;
        const isPlayerWide = !m.targetId && m.sourcePlayerId === unit.owner;

        if (!isUnitSpecific && !isPlayerWide) continue;

        const stat = m.stat;

        if (stat === 'movementCost' && m.value === 0 && m.operator === 'SET') {
            if (!buffs.includes(stat)) buffs.push(stat);
            continue;
        }

        if (stat === 'damage' && m.value < 0 && m.targetId) {
            continue;
        }
        if (stat === 'attack' && m.value > 0 && m.targetId) {
            continue;
        }
        if (stat === 'difficulty' && m.value > 0 && m.targetId) {
            continue;
        }
        if (stat === 'ap') continue; // AP es global del jugador, no por unidad
        if (stat === 'passiveDamage') {
            const label = `${l('unit.status.passiveDamage')} (${m.value} HP, ${m.remainingUses ?? '?'} turnos)`;
            if (!debuffs.includes(label)) debuffs.push(label);
            continue;
        }
        if (stat === 'damage') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else if (m.value < 0) { if (!debuffs.includes(stat)) debuffs.push(stat); }
        } else if (stat === 'attack') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else { if (!debuffs.includes(stat)) debuffs.push(stat); }
        } else if (harmfulStats.includes(stat)) {
            if (!debuffs.includes(stat)) debuffs.push(stat);
        } else if (helpfulStats.includes(stat)) {
            if (!buffs.includes(stat)) buffs.push(stat);
        } else if (passiveStats.includes(stat)) {
            if (!debuffs.includes(stat)) debuffs.push(stat);
        }
    }

    return { buffs, debuffs };
}

function BustSvg({ cls, size }: { cls: string; size: number }) {
    const CLASS_FILL: Record<string, string> = {
        archer: 'var(--color-class-archer)', infantry: 'var(--color-class-infantry)',
        cavalry: 'var(--color-class-cavalry)', lancer: 'var(--color-class-lancer)', general: 'var(--color-class-general)',
    };
    const fill = CLASS_FILL[cls] ?? 'var(--color-effect-other)';
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="4.5" fill={fill} stroke="black" strokeWidth="1.2" />
            <path d="M4 22 C4 14 8 11 12 11 C16 11 20 14 20 22" fill={fill} stroke="black" strokeWidth="1" />
        </svg>
    );
}
