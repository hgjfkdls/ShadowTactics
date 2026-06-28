import { useState } from 'react';
import { l } from '@shared/i18n';
import { getCardName } from '@shared/game/actions/card';

const DIE_FACES: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

type HistoryEntry = {
    id: string;
    turn: number;
    playerId: string;
    type: 'attack' | 'move' | 'card';
    [key: string]: any;
};

export function HistoryPanel({ gameHistory, selectedInfo, onSelectEntry }: {
    gameHistory: HistoryEntry[];
    selectedInfo: any;
    onSelectEntry?: (entry: HistoryEntry | null) => void;
}) {
    function isSelected(e: HistoryEntry): boolean {
        if (!selectedInfo) return false;
        if (selectedInfo.type === 'historyAttack' && selectedInfo.entry?.id === e.id) return true;
        if (selectedInfo.type === 'historyMove' && selectedInfo.entry?.id === e.id) return true;
        if (selectedInfo.type === 'historyCard' && selectedInfo.entry?.id === e.id) return true;
        return false;
    }

    return (
        <div className="absolute bottom-4 left-4 z-50 w-[300px]">
            <div className="bg-zinc-800/95 border border-zinc-600 rounded-lg p-3 shadow-xl w-full h-[253px] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold border-b border-zinc-700 pb-1 mb-1 shrink-0">
                    <span>{l('history.title')}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5">
                    {gameHistory.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                            {l('history.noEvents')}
                        </div>
                    ) : (
                        [...gameHistory].reverse().map(e => {
                            const sel = isSelected(e);
                            return (
                                <div key={e.id} onClick={() => {
                                    if (sel) {
                                        onSelectEntry?.(null);
                                    } else {
                                        onSelectEntry?.(e);
                                    }
                                }}>
                                    <HistoryCard entry={e} selected={sel} />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function HistoryCard({ entry, selected }: { entry: HistoryEntry; selected?: boolean }) {
    const borderCls = selected ? 'border-blue-500 bg-blue-600/15' : 'border-zinc-600/60';
    const bgCls = selected ? 'bg-blue-600/15' : 'bg-zinc-700/40';
    const playerBorder = entry.playerId === 'p1' ? 'border-l-green-700' : 'border-l-red-700';

    if (entry.type === 'attack') {
        const isCritical = entry.total >= 11;
        const isTorbellino = entry.attackName === 'Torbellino';
        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        {entry.attackName && entry.attackName !== 'Ataque básico' && (
                            <span className="text-cyan-400 text-[10px]">{entry.attackName}</span>
                        )}
                    </div>
                    {isTorbellino ? (
                        <div className="text-zinc-300 font-semibold text-[10px]">🌪️ Torbellino</div>
                    ) : entry.attackName === 'Sacrificar' ? (
                        <div className="text-zinc-300 text-[10px] leading-relaxed">
                            <div><span className="text-red-400"> [{entry.targetId}]{l(`unit.class.${entry.targetClass}`) ?? entry.targetClass} -2 HP</span></div>
                            <div><span className="text-green-400"> {l('unit.class.general')} +{entry.modifiers?.[0]?.includes('5') ? '5' : '3'} HP</span></div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-zinc-300">
                            <span className="text-blue-400">⚔</span>
                            <span className="text-zinc-200 font-semibold truncate">{l(`unit.class.${entry.attackerClass}`) ?? entry.attackerClass}</span>
                            <span className="text-zinc-500">vs</span>
                            <span className="text-red-400">🛡</span>
                            <span className="text-zinc-200 font-semibold truncate">{l(`unit.class.${entry.targetClass}`) ?? entry.targetClass}</span>
                        </div>
                    )}
                    {entry.difficulty > 0 && (
                        <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
                            <span>{l('board.difAbbrev')} {entry.difficulty}</span>
                            {entry.die1 > 0 && <><span className="text-zinc-600">|</span><span>{DIE_FACES[entry.die1] ?? entry.die1}+{DIE_FACES[entry.die2] ?? entry.die2}={entry.total}{isCritical ? ' 💥' : ''}</span></>}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <div>
                        {entry.attackName === 'Sacrificar' ? (
                            <span className="text-red-400 font-semibold">🔴 -{entry.damage} HP</span>
                        ) : entry.hit ? (
                            <span className="text-green-400 font-semibold">✅ -{entry.damage} HP{entry.counterDamage > 0 ? ` (${l('board.counter')} -${entry.counterDamage})` : ''}</span>
                        ) : (
                            <span className="text-red-400 font-semibold">❌ {l('board.miss')}{entry.counterDamage > 0 ? ` (${l('board.counter')} -${entry.counterDamage})` : ''}</span>
                        )}
                        {(entry.targetKilled || entry.attackerKilled) && (
                            <span className="text-yellow-400 ml-1">⚫</span>
                        )}
                    </div>
                    <div className="text-[9px] font-bold text-yellow-400">{entry.paCost ?? 1} PA</div>
                </div>
            </div>
        );
    }

    if (entry.type === 'move') {
        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-300">
                        <span className="text-amber-400">👟</span>
                        <span className="text-zinc-200 font-semibold truncate">{l(`unit.class.${entry.unitClass}`) ?? entry.unitClass}</span>
                        <span className="text-zinc-500">{l('history.move')}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                        {entry.path ? entry.path : `(${entry.from.q},${entry.from.r}) → (${entry.to.q},${entry.to.r})`}
                    </div>
                    {entry.cost !== entry.baseCost && (
                        <div className="text-[9px] text-zinc-500">{l('board.baseLabel')} {entry.baseCost} PA</div>
                    )}
                </div>
                <div className="text-right text-[9px] font-bold text-yellow-400 mt-0.5">{entry.cost} PA</div>
            </div>
        );
    }

    if (entry.type === 'card') {
        const isRealCard = /_\d+$/.test(entry.cardId);
        const isCounter = entry.cardType === 'COUNTER';
        const supportColor = 'text-emerald-400';
        const abilityColor = isCounter ? 'text-violet-400' : isRealCard ? (entry.cardType === 'BUFF' ? 'text-emerald-400' : 'text-red-400') : 'text-green-400';
        const titleLine = entry.sourceClass && entry.sourceIdentity
            ? `${l(`unit.class.${entry.sourceClass}`) ?? entry.sourceClass} - ${entry.sourceIdentity}`
            : null;
        const detailParts: string[] = [];
        if (entry.targetClass) detailParts.push(l(`unit.class.${entry.targetClass}`) ?? entry.targetClass);
        if (entry.counterCardId) detailParts.push(`↩ ${getCardName(entry.counterCardId)}`);
        if (entry.healAmount !== undefined) detailParts.push(`+${entry.healAmount} HP`);
        if (entry.details && entry.healAmount === undefined) detailParts.push(entry.details);
        const detailText = detailParts.join(' · ');
        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        <span className={abilityColor}>{isRealCard ? entry.cardType : getCardName(entry.cardId)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-300">
                        <span className={isCounter ? 'text-violet-400' : isRealCard ? 'text-amber-400' : 'text-cyan-400'}>{isRealCard ? '🃏' : '✨'}</span>
                        <span className="text-zinc-200 font-semibold truncate">{titleLine ?? getCardName(entry.cardId)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{detailText}</span>
                        {entry.paCost !== undefined ? <span className="font-bold text-yellow-400">{entry.paCost} PA</span> : null}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
