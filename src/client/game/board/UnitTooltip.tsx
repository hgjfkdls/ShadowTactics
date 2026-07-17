import type { Unit } from '@shared';
import type { ModifierInstance } from '@shared/game/modifiers';
import { l } from '@shared/i18n';
import { classLabel, hitPercent } from './unitLabels';
import type { UnitIndicator } from './getUnitIndicators';
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
    conditionalLabels?: string[];
    conditionalIndicators?: UnitIndicator[];
    modifiers?: ModifierInstance[];
};

const AURA_ITEMS: { key: keyof AuraBuffs; fmt: (v: number) => string }[] = [
    { key: 'shieldPoints', fmt: (v) => l('aura.shield', { n: v }) },
    { key: 'difficultyReduction', fmt: (v) => l('aura.precision', { n: v }) },
    { key: 'difficultyPenalty', fmt: (v) => l('aura.evasion', { n: v }) },
    { key: 'defenseBonus', fmt: (v) => l('aura.defense', { n: v }) },
];

const GENERAL_COLOR = 'var(--color-class-general)';
const BUFF_COLOR = '#22c55e';
const DEBUFF_COLOR = '#ef4444';
const ESPECIAL_COLOR = '#a78bfa';

export function UnitTooltip({ unit, maxHp, identityName, ownerColor, buffs, debuffs, attackInfo, indicators, auraBuffs, conditionalLabels, conditionalIndicators, modifiers }: Props) {
    const lineH = 16;
    const padX = 12;
    const padY = 10;
    const colX = TOKEN_W / 2 + 8;
    const firstY = -TOKEN_H + padY;

    const showAura = auraBuffs !== undefined && auraBuffs !== null;
    const auraItems = showAura ? AURA_ITEMS.filter(item => (auraBuffs?.[item.key] ?? 0) > 0) : [];

    function itemBase(s: string): string {
        return s.split(/[(:]/)[0].trim().toLowerCase();
    }
    const especialItems = [
        ...(conditionalIndicators ?? []).map(ind => ind.label),
        ...(conditionalLabels ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i);

    let rows = 2;
    if (identityName) rows += 1;
    if (attackInfo) rows += 2;
    if (auraItems.length > 0) rows += 1 + auraItems.length;
    if (buffs.length > 0) rows += 1 + buffs.length;
    if (debuffs.length > 0) rows += 1 + debuffs.length;
    if (especialItems.length > 0) rows += 1 + especialItems.length;
    const isDebug = typeof __DEBUG__ !== 'undefined' && __DEBUG__;
    if (isDebug) rows += 1;

    const tipW = 200;
    const tipH = padY * 2 + rows * lineH;

    const hpRow = identityName ? 3 : 2;
    let r = hpRow;
    const showAttackInfo = !!attackInfo;
    const attackRow = showAttackInfo ? r + 1 : -1;
    const diffRow = showAttackInfo ? r + 2 : -1;
    if (showAttackInfo) r += 2;

    const auraHeaderRow = auraItems.length > 0 ? r + 1 : -1;
    const auraStartRow = auraHeaderRow + 1;
    if (auraItems.length > 0) r += 1 + auraItems.length;

    const buffHeaderRow = buffs.length > 0 ? r + 1 : -1;
    const buffStartRow = buffHeaderRow + 1;
    if (buffs.length > 0) r += 1 + buffs.length;

    const debuffHeaderRow = debuffs.length > 0 ? r + 1 : -1;
    const debuffStartRow = debuffHeaderRow + 1;
    if (debuffs.length > 0) r += 1 + debuffs.length;

    const especialHeaderRow = especialItems.length > 0 ? r + 1 : -1;
    const especialStartRow = especialHeaderRow + 1;
    if (especialItems.length > 0) r += 1 + especialItems.length;

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

            {auraItems.length > 0 && (
                <>
                    <text x={colX} y={y(auraHeaderRow)} fontSize={8} fill={GENERAL_COLOR} fontWeight="bold" pointerEvents="none">{l('aura.title')}</text>
                    {auraItems.map((item, i) => (
                        <text key={item.key} x={colX + 6} y={y(auraStartRow + i)} fontSize={8} fill={GENERAL_COLOR} pointerEvents="none">
                            {item.fmt(auraBuffs![item.key])}
                        </text>
                    ))}
                </>
            )}

            {buffs.length > 0 && (
                <>
                    <text x={colX} y={y(buffHeaderRow)} fontSize={8} fill={BUFF_COLOR} fontWeight="bold" pointerEvents="none">{l('passive.buffsHeader')}</text>
                    {buffs.map((b, i) => <text key={b} x={colX + 6} y={y(buffStartRow + i)} fontSize={8} fill={BUFF_COLOR} pointerEvents="none">{b}</text>)}
                </>
            )}

            {debuffs.length > 0 && (
                <>
                    <text x={colX} y={y(debuffHeaderRow)} fontSize={8} fill={DEBUFF_COLOR} fontWeight="bold" pointerEvents="none">{l('passive.debuffsHeader')}</text>
                    {debuffs.map((d, i) => <text key={d} x={colX + 6} y={y(debuffStartRow + i)} fontSize={8} fill={DEBUFF_COLOR} pointerEvents="none">{d}</text>)}
                </>
            )}

            {especialItems.length > 0 && (
                <>
                    <text x={colX} y={y(especialHeaderRow)} fontSize={8} fill={ESPECIAL_COLOR} fontWeight="bold" pointerEvents="none">{l('passive.especialHeader')}</text>
                    {especialItems.map((item, i) => (
                        <text key={i} x={colX + 6} y={y(especialStartRow + i)} fontSize={8} fill={ESPECIAL_COLOR} pointerEvents="none">{item}</text>
                    ))}
                </>
            )}

            {typeof __DEBUG__ !== 'undefined' && __DEBUG__ && (() => {
                const dbgRow = r + 1;
                return (
                    <text x={colX} y={y(dbgRow)} fontSize={7} fill="#f59e0b" pointerEvents="none">
                        <UnitDebugInfo unit={unit} modifiers={modifiers} />
                    </text>
                );
            })()}
        </g>
    );
}
