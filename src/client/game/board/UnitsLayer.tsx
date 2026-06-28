import { useState } from 'react';
import { hexDistance, getDifficulty } from '@shared';
import type { GameState, GameAction, UnitId, ModifierInstance, HexCoord } from '@shared';
import type { Unit } from '@shared/game/state';
import { axialToPixel } from './hexMath';
import { ABILITIES } from '@shared/game/data/abilities';
import { BASE_STATS } from '@shared/game/units';
import { l } from '@shared/i18n';

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
    onPatadaTargetSelect?: (unitId: UnitId) => void;
    animPositions?: Record<string, HexCoord>;
    movingUnitId?: UnitId | null;
    onSelectUnit: (unitId: UnitId) => void;
    onRequestMove?: (unitId: UnitId) => void;
    onRequestAttack?: (unitId: UnitId) => void;
    onAttackUnit?: (attackerId: UnitId, targetId: UnitId) => void;
    onRequestAbilityTarget?: (abilityId: string, unitId: UnitId) => void;
    onUseAbilityOnUnit?: (abilityId: string, unitId: UnitId, targetId: UnitId) => void;
    onInfoSelect?: (info: { type: 'unit'; unitId: string }) => void;
    sendAction?: (action: GameAction) => void;
};

function getMaxHp(cls: string): number {
    return BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
}

const TOKEN_W = 38;
const TOKEN_H = 46;
const TOKEN_RX = 7;

export function UnitsLayer({ state, selectedUnitId, attackingUnitId, pendingAbilityId, pendingAbilityUnitId, playerId, canAct, identityTargetMode, onIdentityTargetSelect, onPatadaTargetSelect, animPositions, movingUnitId, onSelectUnit, onRequestMove, onRequestAttack, onAttackUnit, onRequestAbilityTarget, onUseAbilityOnUnit, onInfoSelect, sendAction }: Props) {
    const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

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

                const selectedUnit = selectedUnitId ? state.units[selectedUnitId] : null;
                const attackingUnit = attackingUnitId ? state.units[attackingUnitId] : null;
                const isArcher = (attackingUnit?.class === 'archer' || attackingUnit?.class === 'general');
                const identityBonus = isArcher && (state.players[attackingUnit?.owner ?? '']?.selectedIdentity ?? '').startsWith('francotirador') ? 1 : 0;
                const espartanoRangeBonus = attackingUnit?.espartanoRangeBonus ? 1 : 0;
                const attackRange = (attackingUnit?.range ?? 0) + identityBonus + espartanoRangeBonus;
                const isAttackTarget = attackingUnit !== null && unit.owner !== playerId && hexDistance(attackingUnit.position, unit.position) <= attackRange;

                const pendingAttacker = pendingAbilityId && pendingAbilityUnitId ? state.units[pendingAbilityUnitId] : null;
                const hasBlancoFacil = (selectedUnit?.owner === playerId && (selectedUnit?.abilities ?? []).includes('blanco_facil'))
                    || (attackingUnit?.abilities ?? []).includes('blanco_facil')
                    || (pendingAbilityId && pendingAttacker && ['patada_acrobatica', 'fuego_cobertura'].includes(pendingAbilityId) && (pendingAttacker.abilities ?? []).includes('blanco_facil'));
                const isBlancoFacilTarget = hasBlancoFacil && unit.owner !== playerId && unit.didMovePreviousTurn === false;

                const unitAbilities = unit.abilities ?? [];
                const hasActiveShield = unitAbilities.includes('linea_defensiva') && unit.didMovePreviousTurn === false
                    || unitAbilities.includes('resistencia') && !unit.timesDamagedThisTurn;
                const isAttacking = attackingUnitId !== null || (pendingAbilityId !== null && ['patada_acrobatica', 'fuego_cobertura'].includes(pendingAbilityId));
                const attackerHasRomperFilas = !!(attackingUnit?.abilities ?? []).includes('romper_filas') || !!(selectedUnit?.abilities ?? []).includes('romper_filas');
                const hasShieldClass = unit.class === 'infantry' || (unit.class === 'general' && (unitAbilities.includes('resistencia') || unitAbilities.includes('linea_defensiva')));
                const showShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && unit.owner !== playerId && hasShieldClass && hasActiveShield && !attackerHasRomperFilas;

                const hasPresionClass = selectedUnit?.class === 'infantry' || (selectedUnit?.class === 'general' && (selectedUnit?.abilities ?? []).includes('presion'));
                const showSword = selectedUnit && selectedUnit.owner === playerId && hasPresionClass
                    && (selectedUnit.abilities ?? []).includes('presion')
                    && unit.owner !== playerId && selectedUnit.lastTargetId === unit.id;

                const showAnticaballeria = !!selectedUnit && selectedUnit.owner === playerId
                    && (selectedUnit.abilities ?? []).includes('anti_caballeria')
                    && unit.owner !== playerId
                    && (unit.class === 'cavalry' || (unit.class === 'general' && (state.players[unit.owner]?.selectedIdentity ?? '').match(/^(caballos_guerra|cazadores)/)));

                const isCazador = (state.players[playerId]?.selectedIdentity ?? '').startsWith('cazadores');
                const isIsolated = unit.owner !== playerId && !Object.values(state.units)
                    .some(u => u.owner !== playerId && u.id !== unit.id && hexDistance(unit.position, u.position) === 1);
                const showAcechar = isCazador && !!selectedUnit && selectedUnit.owner === playerId && selectedUnit.class === 'general' && unit.owner !== playerId && isIsolated;
                const showHostigar = isCazador && !!selectedUnit && selectedUnit.owner === playerId && unit.owner !== playerId
                    && (selectedUnit.class === 'general' || selectedUnit.class === 'cavalry')
                    && unit.hp <= Math.floor(getMaxHp(unit.class) / 2);
                const showCazadorDiana = showAcechar || showHostigar;

                const hasTerror = state.activeModifiers.some(m =>
                    m.targetId === unit.id && m.stat === 'difficulty' && m.value > 0 && (m.remainingUses ?? 1) > 0
                );
                const isTiranoViewer = (state.players[playerId]?.selectedIdentity ?? '').startsWith('furia_tirano');

                const showFormacionDefensiva = !!selectedUnit && selectedUnit.owner === playerId
                    && selectedUnit.class === 'cavalry'
                    && unit.owner !== playerId && unit.class === 'lancer'
                    && unitAbilities.includes('formacion_defensiva');

                const showCelestialRay = (unit.celestialRayDamageBonus ?? 0) > 0;

                const unitOwnerIdentity = state.players[unit.owner]?.selectedIdentity ?? '';
                // Monje Shaolin: resistencia por meditación (modifier damage -1)
                const hasDamageReductionMod = state.activeModifiers.some(m => (m.targetId as string | undefined) === unit.id && m.stat === 'damage' && m.value < 0 && (m.remainingUses ?? 1) > 0);
                const hasAttackBonusMod = state.activeModifiers.some(m => (m.targetId as string | undefined) === unit.id && m.stat === 'attack' && m.value > 0 && (m.remainingUses ?? 1) > 0);
                const isMonjeShaolin = unitOwnerIdentity.startsWith('monje_shaolin');
                const isCorazonEstratega = unitOwnerIdentity.startsWith('corazon_estratega');
                const isComandanteSupremo = unitOwnerIdentity.startsWith('comandante_supremo');
                const isInspiracionReal = unitOwnerIdentity.startsWith('inspiracion_real');
                const showAtaqueExtra = (unit.ataqueExtraCharges ?? 0) > 0 && unit.owner === playerId;
                const showPrecision = (unit.precisionCharges ?? 0) > 0 && unit.owner === playerId;
                const showMeditacionShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && unit.owner !== playerId && hasDamageReductionMod && isMonjeShaolin;
                const showFormacionLineaShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && hasDamageReductionMod && isCorazonEstratega;
                const showFormacionTrianguloDiana = unit.owner === playerId && hasAttackBonusMod && isCorazonEstratega && !!selectedUnit;

                // Comandante Supremo
                const hasAvanzarBuff = isComandanteSupremo && hasAttackBonusMod;
                const hasReagruparBuff = isComandanteSupremo && hasDamageReductionMod;
                const vozDeMandoActivo = state.players[playerId]?.vozDeMandoReady === true && unit.class !== 'general';
                const showAvanzarDiana = unit.owner === playerId && hasAvanzarBuff && !!selectedUnit;
                const showReagruparShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && unit.owner !== playerId && hasReagruparBuff;
                const showReagruparSelf = unit.owner === playerId && hasReagruparBuff && !!selectedUnit;

                // Inspiración Real: Guardia real
                const guardiaAtk = isInspiracionReal && hasAttackBonusMod;
                const guardiaDef = isInspiracionReal && hasDamageReductionMod;
                const showGuardiaDiana = unit.owner === playerId && guardiaAtk && !!selectedUnit;
                const showGuardiaShield = (isAttacking || (!!selectedUnit && selectedUnit.owner === playerId)) && unit.owner !== playerId && guardiaDef;
                // En nombre del rey: escudo real visible en hover
                const hasRoyalShield = unit.royalShieldSavedHp !== undefined;
                const hasProtegerShield = state.activeModifiers.some(m => m.id.startsWith('proteger_') && m.targetId === unit.id && (m.remainingUses ?? 1) > 0);

                // Voz de mando: persiste en tooltip hasta el siguiente turno
                const showVozDeMandoReady = vozDeMandoActivo && unit.owner === playerId;
                const showVozDeMandoUsed = !!unit.usedVozDeMando && unit.owner === playerId;

                // Valores reales de los modificadores (para mostrar +2/-2 con Voz de Mando)
                const atkModSum = state.activeModifiers
                    .filter(m => (m.targetId as string | undefined) === unit.id && m.stat === 'attack' && m.value > 0 && (m.remainingUses ?? 1) > 0)
                    .reduce((s, m) => s + m.value, 0);
                const dmgModSum = state.activeModifiers
                    .filter(m => (m.targetId as string | undefined) === unit.id && m.stat === 'damage' && m.value < 0 && (m.remainingUses ?? 1) > 0)
                    .reduce((s, m) => s + m.value, 0);

                const isDiosTrueno = unitOwnerIdentity.startsWith('dios_trueno');
                const showFuriaBerserker = isDiosTrueno && (unit.class === 'infantry' || unit.class === 'general')
                    && unit.hp <= Math.floor(getMaxHp(unit.class) / 2);
                const liderarNextTurn = state.players[unit.owner]?.nextTurnGlobalPresion;
                const liderarActive = state.players[unit.owner]?.globalPresionActive;
                const isInfantryOrGeneral = unit.class === 'infantry' || unit.class === 'general';
                const showLiderarTropas = liderarNextTurn
                    ? unit.class === 'general'
                    : liderarActive && isInfantryOrGeneral;

                const passiveLabels: string[] = [];
                const isFrancotirador = (state.players[playerId]?.selectedIdentity ?? '').startsWith('francotirador');
                if (isBlancoFacilTarget) passiveLabels.push(`${l('passive.blancoFacil')} (${isFrancotirador ? '-2' : '-1'} ${l('passive.difficultyAbbr')})`);
                if (showSword) passiveLabels.push(l('passive.presion'));
                if (showAnticaballeria) passiveLabels.push(l('passive.anticaballeria'));
                if (showFormacionDefensiva) {
                    passiveLabels.push(l('passive.formacionDefensivaAnula'));
                    passiveLabels.push(l('passive.formacionDefensivaContra'));
                }
                if (showShield) {
                    if (unitAbilities.includes('linea_defensiva') && unit.didMovePreviousTurn === false) passiveLabels.push(l('passive.lineaDefensiva'));
                    else if (unitAbilities.includes('resistencia') && !unit.timesDamagedThisTurn) passiveLabels.push(l('passive.resistencia'));
                }
                if (showMeditacionShield) passiveLabels.push(l('passive.meditacion'));
                if (showFormacionLineaShield) passiveLabels.push(l('passive.formacionLinea'));
                if (showFormacionTrianguloDiana) passiveLabels.push(l('passive.formacionTriangulo'));
                if (showVozDeMandoReady || showVozDeMandoUsed) passiveLabels.push(l('passive.vozDeMando'));
                if (showAvanzarDiana && atkModSum > 0) passiveLabels.push(`${l('passive.planBatallaAvanzar')} (+${atkModSum} ${l('passive.damageAbbr')})`);
                if (showReagruparShield || showReagruparSelf) {
                    if (dmgModSum < 0) passiveLabels.push(`${l('passive.planBatallaReagrupar')} (${dmgModSum} ${l('passive.damageAbbr')})`);
                }
                if (showGuardiaDiana && atkModSum > 0) passiveLabels.push(`${l('passive.guardiaRealAtk')} (+${atkModSum} ${l('passive.attackAbbr')})`);
                if (showGuardiaShield && dmgModSum < 0) passiveLabels.push(`${l('passive.guardiaRealDef')} (${dmgModSum} ${l('passive.damageAbbr')})`);
                if (hasRoyalShield) {
                    const shieldOwner = (state.players[unit.owner]?.selectedIdentity ?? '').startsWith('inspiracion_real');
                    passiveLabels.push(shieldOwner ? l('passive.escudoReal') : l('passive.angelGuardianShield'));
                }
                if (hasProtegerShield) passiveLabels.push(l('passive.proteger'));
                if (unitOwnerIdentity.startsWith('capitan_guardia') && unit.class === 'general') {
                    const usado = unit.usedCounterattack ? ` (${l('passive.exhausted')})` : '';
                    passiveLabels.push(`${l('passive.contraataque')}${usado}`);
                }
                if (showAcechar) passiveLabels.push(`${l('passive.acechar')} (+${unit.class === 'general' ? 1 : 2} ${l('passive.damageAbbr')})`);
                if (showHostigar) passiveLabels.push(l('passive.hostigar'));
                if (showCelestialRay) passiveLabels.push(`${l('passive.rayoCelestial')} (+${unit.celestialRayDamageBonus} ${l('passive.damageAbbr')})`);
                if (showFuriaBerserker) passiveLabels.push(l('passive.furiaBerserker'));
                if (hasTerror) {
                    if (unit.owner !== playerId && isTiranoViewer) {
                        passiveLabels.push(l('passive.terror'));
                    } else if (unit.owner === playerId && !isTiranoViewer) {
                        passiveLabels.push(l('passive.terrorDifficulty'));
                    }
                }
                if (liderarNextTurn && unit.class === 'general') passiveLabels.push(l('passive.liderarNextTurn'));
                if (liderarActive && isInfantryOrGeneral) passiveLabels.push(l('passive.liderarActive'));
                if (isDiosTrueno && unit.class === 'general') {
                    const rayBonus = state.players[unit.owner]?.celestialRayBonus ?? 0;
                    if (rayBonus > 0) passiveLabels.push(`${l('passive.rayoCelestialDisponible')} (+${rayBonus} ${l('passive.damageAbbr')})`);
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
                        const isFranco = (state.players[attacker.owner]?.selectedIdentity ?? '').startsWith('francotirador');
                        final -= isFranco ? 2 : 1;
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
                    return { distance: dist, difficulty: final, baseDifficulty: base };
                })() : null;

                const hasAdjacentEnemy = unit.owner === playerId && Object.values(state.units)
                    .filter(u => u.owner !== playerId)
                    .some(u => hexDistance(unit.position, u.position) === 1);

                const fill = unit.owner === 'p1' ? '#166534' : '#991b1b';
                const stroke = selected ? '#fde047' : unit.owner === 'p1' ? '#22c55e' : '#ef4444';
                const strokeW = selected ? 2.5 : 1.5;

                return (
                    <g
                        key={unit.id}
                        transform={`translate(${x}, ${y})`}
                        onClick={e => {
                            e.stopPropagation();
                            if (identityTargetMode && unit.owner !== playerId && unit.class !== 'general') {
                                onIdentityTargetSelect?.(unit.id);
                            } else if (attackingUnitId && isAttackTarget) {
                                onAttackUnit?.(attackingUnitId, unit.id);
                            } else if (pendingAbilityId === 'patada_acrobatica' && pendingAbilityUnitId && unit.owner !== playerId) {
                                onPatadaTargetSelect?.(unit.id);
                            } else if (pendingAbilityId && pendingAbilityUnitId && unit.owner !== playerId) {
                                onUseAbilityOnUnit?.(pendingAbilityId, pendingAbilityUnitId, unit.id);
                            } else if (pendingAbilityId && pendingAbilityUnitId && unit.owner === playerId && ABILITIES[pendingAbilityId]?.requiresTarget) {
                                onUseAbilityOnUnit?.(pendingAbilityId, pendingAbilityUnitId, unit.id);
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
                        <rect
                            x={-TOKEN_W / 2}
                            y={-TOKEN_H / 2}
                            width={TOKEN_W}
                            height={TOKEN_H}
                            rx={TOKEN_RX}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={strokeW}
                            opacity={0.92}
                        />

                        <g transform="translate(-9, -9)">
                            <ClassIcon cls={unit.class} size={18} />
                        </g>

                        <text
                            y={14}
                            textAnchor="middle"
                            fontSize={8}
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill="white"
                            pointerEvents="none"
                        >
                            {unit.hp}/{maxHp}
                        </text>

                        {isBlancoFacilTarget && (
                            <g transform="translate(14, -14)">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" pointerEvents="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} pointerEvents="none" />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} pointerEvents="none" />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" pointerEvents="none" />
                            </g>
                        )}

                        {(showShield || showMeditacionShield || showFormacionLineaShield || showReagruparShield || showReagruparSelf || showGuardiaShield || hasProtegerShield || showMuroEspartano) && (
                            <g transform="translate(-14, -14)" pointerEvents="none">
                                <path d="M0,-5 L-5,-2 L-5,2 L0,6 Z" fill="#60a5fa" stroke="#60a5fa" strokeWidth={0.8} />
                                <path d="M0,-5 L5,-2 L5,2 L0,6 Z" fill="#93c5fd" stroke="#60a5fa" strokeWidth={0.8} />
                            </g>
                        )}

                        {showSword && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        )}

                        {showAnticaballeria && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        )}

                        {(showFormacionTrianguloDiana || showAvanzarDiana || showGuardiaDiana) && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        )}

                        {hasRoyalShield && (
                            <g transform="translate(-14, -14)" pointerEvents="none">
                                <path d="M0,-5 L-5,-2 L-5,2 L0,6 Z" fill="#fbbf24" stroke="#fbbf24" strokeWidth={0.8} />
                                <path d="M0,-5 L5,-2 L5,2 L0,6 Z" fill="#fde047" stroke="#fbbf24" strokeWidth={0.8} />
                            </g>
                        )}

                        {hasTerror && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        )}

                        {showCazadorDiana && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        )}

                        {unit.espartanoRangeBonus && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        )}

                        {unit.espartanoDefenseBonus && (
                            <g transform="translate(-14, -14)" pointerEvents="none">
                                <path d="M0,-5 L-5,-2 L-5,2 L0,6 Z" fill="#60a5fa" stroke="#60a5fa" strokeWidth={0.8} />
                                <path d="M0,-5 L5,-2 L5,2 L0,6 Z" fill="#93c5fd" stroke="#60a5fa" strokeWidth={0.8} />
                            </g>
                        )}

                        {isEspartano && unit.class === 'lancer' && (() => {
                            const hasAdjLancer = Object.values(state.units)
                                .some(u => u.owner === unit.owner && u.class === 'lancer' && u.id !== unit.id && hexDistance(unit.position, u.position) === 1);
                            return hasAdjLancer && (
                                <g transform="translate(-14, -14)" pointerEvents="none">
                                    <path d="M0,-5 L-5,-2 L-5,2 L0,6 Z" fill="#60a5fa" stroke="#60a5fa" strokeWidth={0.8} />
                                    <path d="M0,-5 L5,-2 L5,2 L0,6 Z" fill="#93c5fd" stroke="#60a5fa" strokeWidth={0.8} />
                                </g>
                            );
                        })()}

                        {showFormacionDefensiva && (
                            <g transform="translate(-14, -14)" pointerEvents="none">
                                <path d="M0,-5 L-5,-2 L-5,2 L0,6 Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth={0.8} />
                                <path d="M0,-5 L5,-2 L5,2 L0,6 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth={0.8} />
                            </g>
                        )}

                        {showCelestialRay ? (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <polygon points="0,-8 -3,0 -1,0 -4,7 2,0 1,0" fill="#facc15" stroke="#ca8a04" strokeWidth={0.8} />
                            </g>
                        ) : showAtaqueExtra ? (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <path d="M-5,-5 L5,5 M-5,5 L5,-5" stroke="#22c55e" strokeWidth={1.5} />
                                <circle cx="0" cy="0" r={4} stroke="#22c55e" strokeWidth={1} fill="none" />
                            </g>
                        ) : showPrecision ? (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#60a5fa" strokeWidth={1} fill="none" />
                                <circle cx="0" cy="0" r={2} fill="#60a5fa" />
                            </g>
                        ) : showFuriaBerserker ? (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <circle cx="0" cy="0" r={5} stroke="#fbbf24" strokeWidth={1} fill="none" />
                                <line x1={-6} y1="0" x2={6} y2="0" stroke="#fbbf24" strokeWidth={0.8} />
                                <line x1="0" y1={-6} x2="0" y2={6} stroke="#fbbf24" strokeWidth={0.8} />
                                <circle cx="0" cy="0" r={1.5} fill="#fbbf24" />
                            </g>
                        ) : showLiderarTropas && (
                            <g transform="translate(14, -14)" pointerEvents="none">
                                <line x1={-4} y1={6} x2={-4} y2={-6} stroke="#60a5fa" strokeWidth={1.5} />
                                <polygon points="-4,-6 7,-5 7,-1 -4,-3" fill="#60a5fa" />
                            </g>
                        )}

                        {(buffs.length > 0 || debuffs.length > 0) && (
                            <g transform="translate(0, 20)">
                                {buffs.length > 0 && (
                                    <circle cx={-4} cy={0} r={3} fill="#22c55e" stroke="#1f2937" strokeWidth={1} />
                                )}
                                {(unit.fuegoCoberturaCharges ?? 0) > 0
                                    ? Array.from({ length: unit.fuegoCoberturaCharges! }, (_, i) => (
                                        <circle key={i} cx={4 + i * 8} cy={0} r={3} fill="#ef4444" stroke="#1f2937" strokeWidth={1} />
                                    ))
                                    : debuffs.length > 0 && (
                                        <circle cx={4} cy={0} r={3} fill="#ef4444" stroke="#1f2937" strokeWidth={1} />
                                    )
                                }
                            </g>
                        )}

                        {hovered && (
                            <UnitTooltip unit={unit} maxHp={maxHp} buffs={buffs} debuffs={debuffs} attackInfo={attackInfo} passiveLabels={passiveLabels} />
                        )}
                    </g>
                );
            })}
        </>
    );
}

function UnitTooltip({ unit, maxHp, buffs, debuffs, attackInfo, passiveLabels }: { unit: Unit; maxHp: number; buffs: string[]; debuffs: string[]; attackInfo: { distance: number; difficulty: number; baseDifficulty: number } | null; passiveLabels?: string[] }) {
    const lineH = 16;
    const padX = 12;
    const padY = 10;
    const colX = TOKEN_W / 2 + 8;
    const firstY = -TOKEN_H + padY;

    const pLen = passiveLabels?.length ?? 0;
    let rows = 2;
    if (attackInfo) rows += 2;
    if (buffs.length > 0) rows += 2 + buffs.length;
    if (debuffs.length > 0) rows += 2 + debuffs.length;
    if (pLen > 0) rows += 1 + pLen;

    const tipW = 180;
    const tipH = padY * 2 + rows * lineH;

    const showAttackInfo = !!attackInfo;
    const attackRow = showAttackInfo ? 3 : -1;
    const diffRow = showAttackInfo ? 4 : -1;
    const buffHeaderRow = showAttackInfo ? 5 : 3;
    const buffStartRow = buffHeaderRow + 1;
    const debuffHeaderRow = buffs.length > 0 ? buffStartRow + buffs.length : (showAttackInfo ? 5 : 3);
    const debuffStartRow = debuffHeaderRow + 1;
    const passiveHeaderRow = debuffs.length > 0 ? debuffStartRow + debuffs.length : debuffHeaderRow;
    const passiveStartRow = passiveHeaderRow + 1;

    return (
        <g pointerEvents="none">
            <rect
                x={colX - padX}
                y={-TOKEN_H}
                width={tipW}
                height={tipH}
                rx={6}
                fill="#1f2937"
                fillOpacity={0.96}
                stroke="#4b5563"
                strokeWidth={1}
            />
            <text x={colX} y={firstY + lineH * 1} fontSize={9} fill="#e5e7eb" fontWeight="bold" pointerEvents="none">
                {classLabel(unit.class)}
            </text>
            <text x={colX} y={firstY + lineH * 2} fontSize={9} fill="#9ca3af" pointerEvents="none">
                HP: {unit.hp}/{maxHp} ({Math.round((unit.hp / maxHp) * 100)}%)
            </text>

            {showAttackInfo && (
                <>
                    <text x={colX} y={firstY + lineH * attackRow} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">
                        Distancia: {attackInfo!.distance}
                    </text>
                    <text x={colX} y={firstY + lineH * diffRow} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">
                        Dificultad: Base {attackInfo!.baseDifficulty} ({hitPercent(attackInfo!.baseDifficulty)}) · Final {attackInfo!.difficulty} ({hitPercent(attackInfo!.difficulty)})
                    </text>
                </>
            )}

            {buffs.length > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * buffHeaderRow} fontSize={8} fill="#22c55e" fontWeight="bold" pointerEvents="none">
                        {l('passive.buffsHeader')}
                    </text>
                    {buffs.map((b, i) => (
                        <text key={b} x={colX + 6} y={firstY + lineH * (buffStartRow + i)} fontSize={8} fill="#86efac" pointerEvents="none">
                            {statusLabel(b)}
                        </text>
                    ))}
                </>
            )}

            {debuffs.length > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * debuffHeaderRow} fontSize={8} fill="#ef4444" fontWeight="bold" pointerEvents="none">
                        {l('passive.debuffsHeader')}
                    </text>
                    {debuffs.map((d, i) => (
                        <text key={d} x={colX + 6} y={firstY + lineH * (debuffStartRow + i)} fontSize={8} fill="#fca5a5" pointerEvents="none">
                            {statusLabel(d)}
                        </text>
                    ))}
                </>
            )}

            {pLen > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * passiveHeaderRow} fontSize={8} fill="#60a5fa" fontWeight="bold" pointerEvents="none">
                        {l('passive.header')}
                    </text>
                    {passiveLabels!.map((l, i) => (
                        <text key={l} x={colX + 6} y={firstY + lineH * (passiveStartRow + i)} fontSize={8} fill="#93c5fd" pointerEvents="none">
                            {l}
                        </text>
                    ))}
                </>
            )}
        </g>
    );
}

function classLabel(cls: string): string {
    const t = l(`unit.class.${cls}`);
    return t || cls;
}

function statusLabel(stat: string): string {
    const t = l(`unit.status.${stat}`);
    return t || stat;
}

function hitPercent(difficulty: number): string {
    const pct: Record<number, string> = {
        2: '100%', 3: '97.2%', 4: '91.7%', 5: '83.3%',
        6: '72.2%', 7: '58.3%', 8: '41.7%', 9: '27.8%',
        10: '16.7%', 11: '8.3%', 12: '2.8%',
    };
    if (difficulty < 2) return '100%';
    if (difficulty > 12) return '0%';
    return pct[difficulty] ?? '0%';
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
        case 'ventaja_alcance': return d <= unit.range + 1;
        case 'desenvainado_veloz': return d <= unit.range;
        default: return false;
    }
}

function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];

    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'bloqueo', 'inmovil'];
    const helpfulStats = ['attack', 'ap', 'dotOnHit'];
    const passiveStats = ['passiveDamage'];

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
        if (stat === 'damage') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else if (m.value < 0) { if (!debuffs.includes(stat)) debuffs.push(stat); }
        } else if (harmfulStats.includes(stat)) {
            if (!debuffs.includes(stat)) debuffs.push(stat);
        } else if (helpfulStats.includes(stat)) {
            if (!buffs.includes(stat)) buffs.push(stat);
        } else if (passiveStats.includes(stat)) {
            if (!debuffs.includes(stat)) debuffs.push(stat);
        }
    }

    // Check unit flags for debuffs/buffs not in activeModifiers
    if ((unit.fuegoCoberturaCharges ?? 0) > 0) {
        if (!debuffs.includes('movementPenalty')) debuffs.push('movementPenalty');
    }

    return { buffs, debuffs };
}

function ClassIcon({ cls, size }: { cls: string; size: number }) {
    switch (cls) {
        case 'archer':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
                    <path d="M7 16 L17 8 M11 8 L17 8 L17 12" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="3.5" stroke="#fbbf24" strokeWidth="1.4" fill="none" />
                </svg>
            );
        case 'infantry':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#60a5fa" strokeWidth="1.4" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
                    <rect x="7" y="8" width="10" height="8" rx="1.5" stroke="#60a5fa" strokeWidth="1.4" fill="none" />
                    <line x1="12" y1="8" x2="12" y2="16" stroke="#60a5fa" strokeWidth="1.4" />
                </svg>
            );
        case 'cavalry':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#a78bfa" strokeWidth="1.4" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
                    <path d="M4 17 C4 12 8 5 12 4 C16 5 20 12 20 17" stroke="#a78bfa" strokeWidth="1.3" fill="none" />
                    <circle cx="12" cy="9" r="2" fill="#a78bfa" />
                </svg>
            );
        case 'lancer':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#f87171" strokeWidth="1.4" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#f87171" strokeWidth="1.5" fill="none" />
                    <line x1="12" y1="10" x2="12" y2="3" stroke="#f87171" strokeWidth="1.6" />
                    <line x1="12" y1="3" x2="15" y2="6" stroke="#f87171" strokeWidth="1.6" />
                </svg>
            );
        case 'general':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#facc15" strokeWidth="1.4" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#facc15" strokeWidth="1.5" fill="none" />
                    <path d="M12 4 L13.5 7 L17 7.5 L14.5 9.5 L15 12.5 L12 11 L9 12.5 L9.5 9.5 L7 7.5 L10.5 7 Z" stroke="#facc15" strokeWidth="1" fill="none" />
                </svg>
            );
        default:
            return <text y={4} textAnchor="middle" fontSize={12} fill="white" pointerEvents="none">?</text>;
    }
}
