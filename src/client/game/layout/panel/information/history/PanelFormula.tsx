import { l } from '@shared/i18n';

function PanelFormula({ entry, paModLetters, paBaseCost, diffFormulaRef, diffModLetters, isArcher, archerBase, archerDist, dmgFormula, dmgClamped, hasRangeBonus, baseRange, rangeModLetters, finalRange, isCritical, dieFaces, pShowFormula, pShowUnitsAffected }: { entry: any; paModLetters: string[]; paBaseCost: number; diffFormulaRef: string | null; diffModLetters: string[]; isArcher: boolean; archerBase: number | null; archerDist: number | null; dmgFormula: string | null; dmgClamped: boolean; hasRangeBonus: boolean; baseRange: number; rangeModLetters: string[]; finalRange: number; isCritical: boolean; dieFaces: Record<number, string>; pShowFormula: string[]; pShowUnitsAffected: boolean }) {
    const isAttackEntry = entry.attackerId != null;
    const isMoveEntry = !isAttackEntry && entry.from != null;
    const isCardEntry = !isAttackEntry && !isMoveEntry;
    return (
        <div className="bg-panel-sub-bg border border-panel-sub-border rounded-lg p-3 space-y-1.5 text-sm">
            {isAttackEntry && pShowFormula.includes('PA') && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('moveDetail.baseCost')}</span>
                        <span className="text-zinc-200">{paBaseCost} PA</span>
                    </div>
                    {paModLetters.length > 0 && (
                        <div className="text-xs text-zinc-400 text-right">{paBaseCost} {paModLetters.map(l => `+${l}`).join(' ')} = {entry.paCost ?? 0}</div>
                    )}
                    {paModLetters.length > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500">{l('moveDetail.finalCost')}</span>
                            <span className="text-zinc-200 font-semibold">{entry.paCost ?? 0} PA</span>
                        </div>
                    )}
                </>
            )}
            {isAttackEntry && pShowFormula.includes('dmg') && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.baseDamage')}</span>
                        <span className="text-zinc-200">{entry.baseAttack}</span>
                    </div>
                    {dmgFormula && <div className="text-xs text-zinc-400 text-right">{dmgFormula}</div>}
                    {dmgClamped && entry.hit && <div className="text-[10px] text-zinc-500 text-right">{l('board.minDamageNote')}</div>}
                    {(dmgFormula || dmgClamped) && entry.hit && (
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500">{l('board.damageLabel')}</span>
                            <span className="text-zinc-200 font-semibold">{entry.damage}</span>
                        </div>
                    )}
                </>
            )}
            {isAttackEntry && pShowFormula.includes('range') && hasRangeBonus && (
                <><div className="flex items-center justify-between"><span className="text-zinc-500">{l('cat.range')} {l('board.baseLabel')}</span><span className="text-zinc-200">{baseRange}</span></div><div className="text-xs text-zinc-400 text-right">{baseRange} {rangeModLetters.map((l: string) => `+${l}`).join(' ')} = {finalRange}</div><div className="flex items-center justify-between"><span className="text-zinc-500">{l('cat.range')}</span><span className="text-zinc-200 font-semibold">{finalRange}</span></div></>
            )}
            {isAttackEntry && pShowFormula.includes('diff') && isArcher && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.baseDifficulty')}</span>
                        <span className="text-zinc-200">{archerBase ?? 5}</span>
                    </div>
                    {archerDist != null && (
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500">{l('board.distanceLabel')}</span>
                            <span className="text-zinc-200">{archerDist}</span>
                        </div>
                    )}
                    {diffFormulaRef && <div className="text-xs text-zinc-400 text-right">{diffFormulaRef}</div>}
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.finalDifficulty')}</span>
                        <span className="text-zinc-200 font-semibold">{entry.difficulty}</span>
                    </div>
                    {entry.total > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-700">
                            <span className="text-zinc-500">{l('attackDetail.dice')}</span>
                            <span className="text-zinc-200 font-semibold">{dieFaces[entry.die1] ?? entry.die1} + {dieFaces[entry.die2] ?? entry.die2} = <span className="text-white">{entry.total}</span>{isCritical && <span className="text-effect-diff ml-1">💥</span>} {entry.hit ? <span className="text-hit-text ml-1">{l('attackDetail.hit')}</span> : <span className="text-miss-text ml-1">{l('attackDetail.miss')}</span>}</span>
                        </div>
                    )}
                </>
            )}
            {isAttackEntry && pShowFormula.includes('diff') && !isArcher && entry.baseDifficulty > 0 && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('attackDetail.baseDifficulty')}</span>
                        <span className="text-zinc-200">{entry.baseDifficulty}</span>
                    </div>
                    {diffFormulaRef && <div className="text-xs text-zinc-400 text-right">{diffFormulaRef}</div>}
                    {diffModLetters.length > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500">{l('attackDetail.finalDifficulty')}</span>
                            <span className="text-zinc-200 font-semibold">{entry.difficulty}</span>
                        </div>
                    )}
                    {entry.total > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-700">
                            <span className="text-zinc-500">{l('attackDetail.dice')}</span>
                            <span className="text-zinc-200 font-semibold">{dieFaces[entry.die1] ?? entry.die1} + {dieFaces[entry.die2] ?? entry.die2} = <span className="text-white">{entry.total}</span>{isCritical && <span className="text-effect-diff ml-1">💥</span>} {entry.hit ? <span className="text-hit-text ml-1">{l('attackDetail.hit')}</span> : <span className="text-miss-text ml-1">{l('attackDetail.miss')}</span>}</span>
                        </div>
                    )}
                </>
            )}
            {isMoveEntry && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('moveDetail.baseCost')}</span>
                        <span className="text-zinc-200">{entry.baseCost} PA</span>
                    </div>
                    {(entry.modifiers?.length ?? 0) > 0 && entry.cost !== entry.baseCost && (
                        <div className="text-xs text-zinc-400 text-right">
                            {entry.baseCost} {entry.modifiers.map((_: any, i: number) => {
                                const l = String.fromCharCode(97 + i);
                                return `+${l}`;
                            }).join(' ')} = {entry.cost}
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{l('moveDetail.finalCost')}</span>
                        <span className={entry.cost === 0 ? 'text-effect-heal font-bold' : 'text-zinc-200 font-semibold'}>{entry.cost} PA</span>
                    </div>
                </>
            )}
            {isCardEntry && pShowFormula.includes('PA') && entry.paCost != null && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{l('attackDetail.paCost')}</span>
                    <span className="font-bold text-effect-pa">{entry.paCost} PA</span>
                </div>
            )}
        </div>
    );
}

export default PanelFormula;
