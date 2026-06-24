import { useState } from 'react';
import { hexDistance, getDifficulty } from '@shared';
import type { GameState, GameAction, UnitId, ModifierInstance } from '@shared';
import type { Unit } from '@shared/game/state';
import { axialToPixel } from './hexMath';
import { ABILITIES } from '@shared/game/data/abilities';

type Props = {
    state: GameState;
    selectedUnitId: UnitId | null;
    attackingUnitId?: UnitId | null;
    pendingAbilityId?: string | null;
    pendingAbilityUnitId?: UnitId | null;
    playerId?: string;
    canAct?: boolean;
    onSelectUnit: (unitId: UnitId) => void;
    onRequestMove?: (unitId: UnitId) => void;
    onRequestAttack?: (unitId: UnitId) => void;
    onAttackUnit?: (attackerId: UnitId, targetId: UnitId) => void;
    onRequestAbilityTarget?: (abilityId: string, unitId: UnitId) => void;
    onUseAbilityOnUnit?: (abilityId: string, unitId: UnitId, targetId: UnitId) => void;
    onInfoSelect?: (info: { type: 'unit'; unitId: string }) => void;
    sendAction?: (action: GameAction) => void;
};

const MAX_HP: Record<string, number> = {
    general: 15, infantry: 12, cavalry: 10, archer: 8, lancer: 10,
};

function getMaxHp(cls: string): number {
    return MAX_HP[cls] ?? 10;
}

const TOKEN_W = 38;
const TOKEN_H = 46;
const TOKEN_RX = 7;

export function UnitsLayer({ state, selectedUnitId, attackingUnitId, pendingAbilityId, pendingAbilityUnitId, playerId, canAct, onSelectUnit, onRequestMove, onRequestAttack, onAttackUnit, onRequestAbilityTarget, onUseAbilityOnUnit, onInfoSelect, sendAction }: Props) {
    const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

    const units = Object.values(state.units);

    // Hovered unit last so its <g> (including tooltip) draws on top
    const sortedUnits = [...units].sort((a, b) => {
        if (a.id === hoveredUnitId) return 1;
        if (b.id === hoveredUnitId) return -1;
        return 0;
    });

    return (
        <>
            {sortedUnits.map(unit => {
                const { x, y } = axialToPixel(unit.position);
                const selected = unit.id === selectedUnitId;
                const hovered = hoveredUnitId === unit.id;
                const maxHp = getMaxHp(unit.class);
                const { buffs, debuffs } = getUnitStatus(unit, state.activeModifiers);

                const attackingUnit = attackingUnitId ? state.units[attackingUnitId] : null;
                const isAttackTarget = attackingUnit !== null && unit.owner !== playerId && hexDistance(attackingUnit.position, unit.position) <= attackingUnit.range;

                const attackAbilities = new Set(['disparo_rapido', 'fuego_cobertura', 'carga', 'doble_ataque', 'ventaja_alcance', 'avance']);
                const pendingAttacker = pendingAbilityId && pendingAbilityUnitId ? state.units[pendingAbilityUnitId] : null;
                const isAbilityTarget = pendingAttacker && unit.owner !== playerId && isEnemyInAbilityRange(pendingAttacker.position, unit.position, pendingAbilityId ?? '', pendingAttacker);

                const attackInfo = (attackingUnit && isAttackTarget) || (isAbilityTarget && pendingAttacker) ? {
                    distance: hexDistance((attackingUnit ?? pendingAttacker!).position, unit.position),
                    difficulty: getDifficulty(attackingUnit ?? pendingAttacker!, hexDistance((attackingUnit ?? pendingAttacker!).position, unit.position)),
                } : null;

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
                            if (attackingUnitId && isAttackTarget) {
                                onAttackUnit?.(attackingUnitId, unit.id);
                            } else if (pendingAbilityId && pendingAbilityUnitId && unit.owner !== playerId) {
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

                        {(buffs.length > 0 || debuffs.length > 0) && (
                            <g transform="translate(0, 20)">
                                {buffs.length > 0 && (
                                    <circle cx={-4} cy={0} r={3} fill="#22c55e" stroke="#1f2937" strokeWidth={1} />
                                )}
                                {debuffs.length > 0 && (
                                    <circle cx={4} cy={0} r={3} fill="#ef4444" stroke="#1f2937" strokeWidth={1} />
                                )}
                            </g>
                        )}

                        {hovered && (
                            <UnitTooltip unit={unit} maxHp={maxHp} buffs={buffs} debuffs={debuffs} sendAction={sendAction} playerId={playerId} canAct={canAct} onSelectUnit={onSelectUnit} onRequestMove={onRequestMove} onRequestAttack={onRequestAttack} onRequestAbilityTarget={onRequestAbilityTarget} hasAdjacentEnemy={hasAdjacentEnemy} attackInfo={attackInfo} closeTooltip={() => setHoveredUnitId(null)} />
                        )}
                    </g>
                );
            })}
        </>
    );
}

function UnitTooltip({ unit, maxHp, buffs, debuffs, sendAction, playerId, canAct, onSelectUnit, onRequestMove, onRequestAttack, onRequestAbilityTarget, hasAdjacentEnemy, attackInfo, closeTooltip }: { unit: Unit; maxHp: number; buffs: string[]; debuffs: string[]; sendAction?: (action: GameAction) => void; playerId?: string; canAct?: boolean; onSelectUnit?: (unitId: UnitId) => void; onRequestMove?: (unitId: UnitId) => void; onRequestAttack?: (unitId: UnitId) => void; onRequestAbilityTarget?: (abilityId: string, unitId: UnitId) => void; hasAdjacentEnemy?: boolean; attackInfo: { distance: number; difficulty: number } | null; closeTooltip?: () => void }) {
    const lineH = 16;
    const padX = 12;
    const padY = 10;
    const colX = TOKEN_W / 2 + 8;
    const firstY = -TOKEN_H + padY;

    const isOwnUnit = unit.owner === playerId;
    const interactive = canAct && isOwnUnit;

    const activeAbilities = (unit.abilities ?? [])
        .map(id => ({ id, def: ABILITIES[id] }))
        .filter(a => a.def?.type === 'active');

    let rows = 2;
    if (attackInfo) rows += 1;
    if (buffs.length > 0) rows += 2 + buffs.length;
    if (debuffs.length > 0) rows += 2 + debuffs.length;
    rows += 1 + 2 + activeAbilities.length; // actions header + 2 basic + N abilities

    const tipW = 150;
    const tipH = padY * 2 + rows * lineH;

    const attackRow = attackInfo ? 3 : -1;
    const buffHeaderRow = attackInfo ? 4 : 3;
    const buffStartRow = buffHeaderRow + 1;
    const debuffHeaderRow = buffs.length > 0 ? buffStartRow + buffs.length : (attackInfo ? 4 : 3);
    const debuffStartRow = debuffHeaderRow + 1;
    const actionsRow = debuffs.length > 0 ? debuffStartRow + debuffs.length : debuffHeaderRow;

    return (
        <g>
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
                onClick={e => e.stopPropagation()}
            />
            <text x={colX} y={firstY + lineH * 1} fontSize={9} fill="#e5e7eb" fontWeight="bold" pointerEvents="none">
                {classLabel(unit.class)}
            </text>
            <text x={colX} y={firstY + lineH * 2} fontSize={9} fill="#9ca3af" pointerEvents="none">
                HP: {unit.hp}/{maxHp} ({Math.round((unit.hp / maxHp) * 100)}%)
            </text>

            {attackInfo && (
                <text x={colX} y={firstY + lineH * attackRow} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">
                    ⚔️ Distancia: {attackInfo.distance} · Dificultad: {attackInfo.difficulty} ({hitPercent(attackInfo.difficulty)})
                </text>
            )}

            {buffs.length > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * buffHeaderRow} fontSize={8} fill="#22c55e" fontWeight="bold" pointerEvents="none">
                        ▲ Mejoras activas
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
                        ▼ Debilidades activas
                    </text>
                    {debuffs.map((d, i) => (
                        <text key={d} x={colX + 6} y={firstY + lineH * (debuffStartRow + i)} fontSize={8} fill="#fca5a5" pointerEvents="none">
                            {statusLabel(d)}
                        </text>
                    ))}
                </>
            )}

            {(() => {
                const basicActions = [
                    {
                        id: '__attack__',
                        label: unit.attackedThisTurn ? '⚔️ Ya atacó' : '⚔️ Ataque básico',
                        cost: 1,
                        disabled: !!unit.attackedThisTurn,
                    },
                    { id: '__move__', label: '🏃 Movimiento', cost: unit.movementCost, disabled: false },
                ];

                const allActions = [
                    ...basicActions,
                    ...activeAbilities.map(a => ({
                        id: a.id,
                        label: a.def!.name,
                        cost: a.def!.cost ?? 0,
                        disabled:
                            (a.id === 'accion_evasiva' && (!!unit.movedThisTurn || !hasAdjacentEnemy)) ||
                            (a.id === 'disparo_rapido' && (!unit.attackedThisTurn || !!unit.usedDisparoRapido)) ||
                            (a.id === 'doble_ataque' && (!unit.attackedThisTurn || !!unit.usedDobleAtaque)) ||
                            (a.id === 'cabalgar' && (!!unit.attackedThisTurn || !!unit.usedCabalgar || !!unit.movedThisTurn)) ||
                            (a.id === 'carga' && (!unit.usedCabalgar || !!unit.usedCarga || !!unit.movedThisTurn || !!unit.attackedThisTurn)),
                        def: a.def,
                    })),
                ];

                if (allActions.length === 0) return null;

                const labelColor = interactive ? '#60a5fa' : '#4b5563';

                return (
                    <>
                        <text
                            x={colX}
                            y={firstY + lineH * actionsRow}
                            fontSize={8}
                            fill={labelColor}
                            fontWeight="bold"
                            pointerEvents="none"
                        >
                            ⚡ Acciones
                        </text>
                        {allActions.map((a, i) => {
                            const btnY = firstY + lineH * (actionsRow + 1 + i);
                            const canClick = interactive && !a.disabled;
                            const fill = canClick ? '#1e3a5f' : '#374151';
                            const stroke = canClick ? '#3b82f6' : '#4b5563';
                            const textClr = canClick ? '#93c5fd' : '#6b7280';
                            return (
                                <g key={a.id}>
                                    <rect
                                        x={colX}
                                        y={btnY - 9}
                                        width={tipW - padX - 6}
                                        height={12}
                                        rx={3}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={0.8}
                                        style={{ cursor: canClick ? 'pointer' : 'default' }}
                                        onClick={canClick ? (e => {
                                            e.stopPropagation();
                                            if (a.id === '__attack__') {
                                                onRequestAttack?.(unit.id);
                                                closeTooltip?.();
                                            } else if (a.id === '__move__') {
                                                onRequestMove?.(unit.id);
                                                closeTooltip?.();
                                            } else if (a.def) {
                                                onRequestAbilityTarget?.(a.id, unit.id);
                                                closeTooltip?.();
                                            }
                                        }) : undefined}
                                    />
                                    <text
                                        x={colX + 5}
                                        y={btnY}
                                        fontSize={8}
                                        fill={textClr}
                                        pointerEvents="none"
                                    >
                                        {a.label} ({a.cost} PA)
                                    </text>
                                </g>
                            );
                        })}
                    </>
                );
            })()}
        </g>
    );
}

function classLabel(cls: string): string {
    switch (cls) {
        case 'archer': return 'Arquero';
        case 'infantry': return 'Infantería';
        case 'cavalry': return 'Caballería';
        case 'lancer': return 'Lancero';
        case 'general': return 'General';
        default: return cls;
    }
}

function statusLabel(stat: string): string {
    switch (stat) {
        case 'movementCost': return 'Coste movimiento alterado';
        case 'attack': return 'Ataque potenciado';
        case 'difficulty': return 'Dificultad modificada';
        case 'damage': return 'Daño alterado';
        case 'attackCost': return 'Coste ataque aumentado';
        case 'blocked': return 'Bloqueado';
        case 'dotOnHit': return 'Daño pasivo preparado';
        case 'ap': return 'PA modificados';
        case 'passiveDamage': return 'Recibiendo daño pasivo';
        case 'movementPenalty': return 'Penalización de movimiento (×2)';
        default: return stat;
    }
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
        case 'disparo_rapido': return d <= 2;
        case 'carga': return d <= 1;
        case 'fuego_cobertura':
        case 'doble_ataque':
        case 'avance': return d <= unit.range;
        case 'ventaja_alcance': return d <= unit.range + 1;
        default: return false;
    }
}

function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];

    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'blocked'];
    const helpfulStats = ['attack', 'damage', 'ap', 'dotOnHit'];
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

        if (harmfulStats.includes(stat)) {
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
