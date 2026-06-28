import type { Unit, HexCoord } from '@shared';
import { l } from '@shared/i18n';
import { statusLabel, classLabel, hitPercent } from './unitLabels';

const TOKEN_W = 38;
const TOKEN_H = 46;

type Props = {
    unit: Unit;
    maxHp: number;
    buffs: string[];
    debuffs: string[];
    attackInfo: { distance: number; difficulty: number; baseDifficulty: number } | null;
    passiveLabels?: string[];
};

export function UnitTooltip({ unit, maxHp, buffs, debuffs, attackInfo, passiveLabels }: Props) {
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
            <rect x={colX - padX} y={-TOKEN_H} width={tipW} height={tipH} rx={6} fill="#1f2937" fillOpacity={0.96} stroke="#4b5563" strokeWidth={1} />
            <text x={colX} y={firstY + lineH * 1} fontSize={9} fill="#e5e7eb" fontWeight="bold" pointerEvents="none">{classLabel(unit.class)}</text>
            <text x={colX} y={firstY + lineH * 2} fontSize={9} fill="#9ca3af" pointerEvents="none">HP: {unit.hp}/{maxHp} ({Math.round((unit.hp / maxHp) * 100)}%)</text>

            {showAttackInfo && (
                <>
                    <text x={colX} y={firstY + lineH * attackRow} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">{l('board.distanceLabel')}: {attackInfo!.distance}</text>
                    <text x={colX} y={firstY + lineH * diffRow} fontSize={8} fill="#f59e0b" fontWeight="bold" pointerEvents="none">{l('board.difficultyLabel')}: Base {attackInfo!.baseDifficulty} ({hitPercent(attackInfo!.baseDifficulty)}) · Final {attackInfo!.difficulty} ({hitPercent(attackInfo!.difficulty)})</text>
                </>
            )}

            {buffs.length > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * buffHeaderRow} fontSize={8} fill="#22c55e" fontWeight="bold" pointerEvents="none">{l('passive.buffsHeader')}</text>
                    {buffs.map((b, i) => <text key={b} x={colX + 6} y={firstY + lineH * (buffStartRow + i)} fontSize={8} fill="#86efac" pointerEvents="none">{statusLabel(b)}</text>)}
                </>
            )}

            {debuffs.length > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * debuffHeaderRow} fontSize={8} fill="#ef4444" fontWeight="bold" pointerEvents="none">{l('passive.debuffsHeader')}</text>
                    {debuffs.map((d, i) => <text key={d} x={colX + 6} y={firstY + lineH * (debuffStartRow + i)} fontSize={8} fill="#fca5a5" pointerEvents="none">{statusLabel(d)}</text>)}
                </>
            )}

            {pLen > 0 && (
                <>
                    <text x={colX} y={firstY + lineH * passiveHeaderRow} fontSize={8} fill="#60a5fa" fontWeight="bold" pointerEvents="none">{l('passive.header')}</text>
                    {passiveLabels!.map((lbl, i) => <text key={lbl} x={colX + 6} y={firstY + lineH * (passiveStartRow + i)} fontSize={8} fill="#93c5fd" pointerEvents="none">{lbl}</text>)}
                </>
            )}
        </g>
    );
}
