import type { Unit, HexCoord } from '@shared';
import { l } from '@shared/i18n';
import { statusLabel, classLabel, hitPercent } from './unitLabels';
import { getAuraBuffs } from '@shared/game/aura';

const TOKEN_W = 38;
const TOKEN_H = 46;

type AuraBuffs = { difficultyReduction: number; defenseBonus: number; shieldPoints: number; difficultyPenalty: number };

type Props = {
    unit: Unit;
    maxHp: number;
    buffs: string[];
    debuffs: string[];
    attackInfo: { distance: number; difficulty: number; baseDifficulty: number } | null;
    passiveLabels?: string[];
    auraBuffs?: AuraBuffs | null;
};

const AURA_LABELS: { key: keyof AuraBuffs; fmt: (v: number) => string; color: string }[] = [
    { key: 'shieldPoints', fmt: (v) => l('aura.shield', { n: v }), color: 'var(--color-class-infantry)' },
    { key: 'difficultyReduction', fmt: (v) => l('aura.precision', { n: v }), color: 'var(--color-class-archer)' },
    { key: 'difficultyPenalty', fmt: (v) => l('aura.evasion', { n: v }), color: 'var(--color-class-cavalry)' },
    { key: 'defenseBonus', fmt: (v) => l('aura.defense', { n: v }), color: 'var(--color-class-lancer)' },
];

export function UnitTooltip({ unit, maxHp, buffs, debuffs, attackInfo, passiveLabels, auraBuffs }: Props) {
    const lineH = 16;
    const padX = 12;
    const padY = 10;
    const colX = TOKEN_W / 2 + 8;
    const firstY = -TOKEN_H + padY;

    const showAura = auraBuffs !== undefined && auraBuffs !== null;
    const pLen = passiveLabels?.length ?? 0;
    let rows = 2;
    if (attackInfo) rows += 2;
    if (buffs.length > 0) rows += 2 + buffs.length;
    if (debuffs.length > 0) rows += 2 + debuffs.length;
    if (showAura) rows += 2 + AURA_LABELS.length;
    if (pLen > 0) rows += 1 + pLen;

    const tipW = 180;
    const tipH = padY * 2 + rows * lineH;

    const showAttackInfo = !!attackInfo;
    let r = 2;
    const attackRow = showAttackInfo ? r + 1 : -1;
    const diffRow = showAttackInfo ? r + 2 : -1;
    if (showAttackInfo) r += 2;
    const buffHeaderRow = buffs.length > 0 ? r + 1 : -1;
    const buffStartRow = buffHeaderRow + 1;
    if (buffs.length > 0) r += 2 + buffs.length;
    const debuffHeaderRow = debuffs.length > 0 ? r + 1 : -1;
    const debuffStartRow = debuffHeaderRow + 1;
    if (debuffs.length > 0) r += 2 + debuffs.length;
    const auraHeaderRow = showAura ? r + 1 : -1;
    const auraStartRow = auraHeaderRow + 1;
    if (showAura) r += 2 + AURA_LABELS.length;
    const passiveHeaderRow = pLen > 0 ? r + 1 : -1;
    const passiveStartRow = passiveHeaderRow + 1;

    function y(line: number): number { return firstY + lineH * line; }

    return (
        <g pointerEvents="none">
            <rect x={colX - padX} y={-TOKEN_H} width={tipW} height={tipH} rx={6} fill="#1f2937" fillOpacity={0.96} stroke="#4b5563" strokeWidth={1} />
            <text x={colX} y={y(1)} fontSize={9} fill="#e5e7eb" fontWeight="bold" pointerEvents="none">{classLabel(unit.class)}</text>
            <text x={colX} y={y(2)} fontSize={9} fill="#9ca3af" pointerEvents="none">HP: {unit.hp}{unit.auraShield ? `+${unit.auraShield}` : ''}/{maxHp} ({Math.round((unit.hp / maxHp) * 100)}%)</text>

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

            {showAura && (
                <>
                    <text x={colX} y={y(auraHeaderRow)} fontSize={8} fill="var(--color-class-general)" fontWeight="bold" pointerEvents="none">{l('aura.title')}</text>
                    {AURA_LABELS.map((item, i) => (
                        <text key={item.key} x={colX + 6} y={y(auraStartRow + i)} fontSize={8} fill={item.color} pointerEvents="none">
                            {item.fmt(auraBuffs![item.key])}
                        </text>
                    ))}
                </>
            )}

            {pLen > 0 && (
                <>
                    <text x={colX} y={y(passiveHeaderRow)} fontSize={8} fill="#60a5fa" fontWeight="bold" pointerEvents="none">{l('passive.header')}</text>
                    {passiveLabels!.map((lbl, i) => <text key={lbl} x={colX + 6} y={y(passiveStartRow + i)} fontSize={8} fill="#93c5fd" pointerEvents="none">{lbl}</text>)}
                </>
            )}
        </g>
    );
}
