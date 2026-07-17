import type { Unit, HexCoord } from '@shared';
import { l } from '@shared/i18n';
import { statusLabel, classLabel, hitPercent } from './unitLabels';
import { getAuraBuffs } from '@shared/game/aura';
import type { UnitIndicator, UnitIndicatorCategory } from './getUnitIndicators';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { UnitDebugInfo } from './UnitDebugInfo';

const TOKEN_W = 38;
const TOKEN_H = 46;

type AuraBuffs = { difficultyReduction: number; defenseBonus: number; shieldPoints: number; difficultyPenalty: number };

type Props = {
    unit: Unit;
    maxHp: number;
    identityName?: string;
    ownerColor?: string;
    buffs: string[];
    debuffs: string[];
    attackInfo: { distance: number; difficulty: number; baseDifficulty: number } | null;
    indicators?: UnitIndicator[];
    auraBuffs?: AuraBuffs | null;
};

const AURA_ITEMS: { key: keyof AuraBuffs; fmt: (v: number) => string }[] = [
    { key: 'shieldPoints', fmt: (v) => l('aura.shield', { n: v }) },
    { key: 'difficultyReduction', fmt: (v) => l('aura.precision', { n: v }) },
    { key: 'difficultyPenalty', fmt: (v) => l('aura.evasion', { n: v }) },
    { key: 'defenseBonus', fmt: (v) => l('aura.defense', { n: v }) },
];

const GROUP_CONFIG: { category: UnitIndicatorCategory; labelKey: string; color: string }[] = [
    { category: 'aura', labelKey: 'aura.title', color: 'var(--color-class-general)' },
    { category: 'offensive', labelKey: 'passive.offensiveHeader', color: 'var(--color-attack)' },
    { category: 'defensive', labelKey: 'passive.defensiveHeader', color: '#60a5fa' },
    { category: 'cost', labelKey: 'passive.costHeader', color: '#fbbf24' },
];

export function UnitTooltip({ unit, maxHp, identityName, ownerColor, buffs, debuffs, attackInfo, indicators, auraBuffs }: Props) {
    const lineH = 16;
    const padX = 12;
    const padY = 10;
    const colX = TOKEN_W / 2 + 8;
    const firstY = -TOKEN_H + padY;

    const showAura = auraBuffs !== undefined && auraBuffs !== null;
    const auraItems = showAura ? AURA_ITEMS.filter(item => (auraBuffs?.[item.key] ?? 0) > 0) : [];
    const showIndicators = (indicators ?? []).length > 0;

    // Group indicators by new 4-type category
    const grouped = new Map<UnitIndicatorCategory, UnitIndicator[]>();
    for (const ind of indicators ?? []) {
        const list = grouped.get(ind.category) ?? [];
        list.push(ind);
        grouped.set(ind.category, list);
    }

    // Build display groups: aura first, then offensive, defensive, cost
    const groupEntries = GROUP_CONFIG
        .map(g => ({ ...g, items: grouped.get(g.category) ?? [] }))
        .filter(g => g.items.length > 0);

    const showAnyAura = auraItems.length > 0;
    const totalGroups = (showAnyAura ? 1 : 0) + groupEntries.filter(g => g.category !== 'aura').length;

    const catCount = groupEntries.length;
    // Row 1 = class name, Row 2 = identity (optional), Row 3 = HP
    let rows = 2;
    if (identityName) rows += 1;
    if (attackInfo) rows += 2;
    if (buffs.length > 0) rows += 2 + buffs.length;
    if (debuffs.length > 0) rows += 2 + debuffs.length;
    if (showAnyAura) rows += 2 + auraItems.length;
    if (showIndicators) rows += groupEntries.filter(g => g.category !== 'aura').length + (indicators ?? []).length;
    const isDebug = typeof __DEBUG__ !== 'undefined' && __DEBUG__;
    if (isDebug) rows += 1; // DEBUG flags line // header + items per group

    const tipW = 200;
    const tipH = padY * 2 + rows * lineH;

    // Row positions: 1=class, 2=identity(if), 3=HP, 4+=rest
    const hpRow = identityName ? 3 : 2;
    let r = hpRow;
    const showAttackInfo = !!attackInfo;
    const attackRow = showAttackInfo ? r + 1 : -1;
    const diffRow = showAttackInfo ? r + 2 : -1;
    if (showAttackInfo) r += 2;
    const buffHeaderRow = buffs.length > 0 ? r + 1 : -1;
    const buffStartRow = buffHeaderRow + 1;
    if (buffs.length > 0) r += 2 + buffs.length;
    const debuffHeaderRow = debuffs.length > 0 ? r + 1 : -1;
    const debuffStartRow = debuffHeaderRow + 1;
    if (debuffs.length > 0) r += 2 + debuffs.length;
    const auraHeaderRow = showAnyAura ? r + 1 : -1;
    const auraStartRow = auraHeaderRow + 1;
    if (showAnyAura) r += 1 + auraItems.length;

    // Compute group positions for indicator groups (non-aura)
    const nonAuraGroups = groupEntries.filter(g => g.category !== 'aura');
    const groupPositions = nonAuraGroups.map(g => {
        const headerRow = r + 1;
        const startRow = headerRow + 1;
        r += 1 + g.items.length;
        return { ...g, headerRow, startRow };
    });

    function y(line: number): number { return firstY + lineH * line; }

    return (
        <g pointerEvents="none">
            <rect x={colX - padX} y={-TOKEN_H} width={tipW} height={tipH} rx={6} fill="#1f2937" fillOpacity={0.96} stroke="#4b5563" strokeWidth={1} />
            <text x={colX} y={y(1)} fontSize={9} fill="#e5e7eb" fontWeight="bold" pointerEvents="none">{classLabel(unit.class)}</text>
            {identityName && <text x={colX} y={y(2)} fontSize={7} fill={ownerColor ?? '#a78bfa'} pointerEvents="none">{identityName}</text>}
            {(() => {
    const shield = unit.auraShield ?? 0;
    const royalHp = unit.royalShieldSavedHp ?? unit.hp;
    const royalExtra = unit.royalShieldSavedHp !== undefined ? unit.hp - unit.royalShieldSavedHp : 0;
    const totalShield = royalExtra + shield;
    const displayHp = totalShield > 0 ? `${royalHp}+${totalShield}/${maxHp}` : `${unit.hp}/${maxHp}`;
    const effectiveMax = maxHp + totalShield;
    const pct = Math.round((unit.hp / effectiveMax) * 100);
    return <text x={colX} y={y(hpRow)} fontSize={9} fill="#9ca3af" pointerEvents="none">HP: {displayHp} ({pct}%)</text>;
})()}

            {showAttackInfo && (
                <>
                    <text x={colX} y={y(attackRow)} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">{l('board.distanceLabel')}: {attackInfo!.distance}</text>
                    <text x={colX} y={y(diffRow)} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">{l('board.difficultyLabel')}: Base {attackInfo!.baseDifficulty} ({hitPercent(attackInfo!.baseDifficulty)}) · Final {attackInfo!.difficulty} ({hitPercent(attackInfo!.difficulty)})</text>
                </>
            )}

            {buffs.length > 0 && (
                <>
                    <text x={colX} y={y(buffHeaderRow)} fontSize={8} fill="#22c55e" fontWeight="bold" pointerEvents="none">{l('passive.buffsHeader')}</text>
                    {buffs.map((b, i) => <text key={b} x={colX + 6} y={y(buffStartRow + i)} fontSize={8} fill="#86efac" pointerEvents="none">{statusLabel(b)}</text>)}
                </>
            )}

            {debuffs.length > 0 && (
                <>
                    <text x={colX} y={y(debuffHeaderRow)} fontSize={8} fill="#ef4444" fontWeight="bold" pointerEvents="none">{l('passive.debuffsHeader')}</text>
                    {debuffs.map((d, i) => <text key={d} x={colX + 6} y={y(debuffStartRow + i)} fontSize={8} fill="#fca5a5" pointerEvents="none">{statusLabel(d)}</text>)}
                </>
            )}

            {showAnyAura && (
                <>
                    <text x={colX} y={y(auraHeaderRow)} fontSize={8} fill="var(--color-class-general)" fontWeight="bold" pointerEvents="none">{l('aura.title')}</text>
                    {auraItems.map((item, i) => (
                        <text key={item.key} x={colX + 6} y={y(auraStartRow + i)} fontSize={8} fill="var(--color-class-general)" pointerEvents="none">
                            {item.fmt(auraBuffs![item.key])}
                        </text>
                    ))}
                </>
            )}

    {/* Grouped indicators by new 4-type category */}
            {groupPositions.map(g => (
                <g key={g.category}>
                    <text x={colX} y={y(g.headerRow)} fontSize={8} fill={g.color} fontWeight="bold" pointerEvents="none">
                        {l(g.labelKey)}
                    </text>
                    {g.items.map((ind, i) => (
                        <text key={ind.label} x={colX + 6} y={y(g.startRow + i)} fontSize={8} fill="#93c5fd" pointerEvents="none">{ind.label}</text>
                    ))}
                </g>
            ))}

            {/* ─── DEBUG: flags activas (solo cuando __DEBUG__=true) ─── */}
            {typeof __DEBUG__ !== 'undefined' && __DEBUG__ && (() => {
                const dbgRow = r + 1;
                return (
                    <text x={colX} y={y(dbgRow)} fontSize={7} fill="#f59e0b" pointerEvents="none">
                        <UnitDebugInfo unit={unit} />
                    </text>
                );
            })()}
        </g>
    );
}
