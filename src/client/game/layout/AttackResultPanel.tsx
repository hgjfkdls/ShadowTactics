import { useState } from 'react';

const CLASS_LABELS: Record<string, string> = {
    archer: 'Arquero', infantry: 'Infantería', cavalry: 'Caballería', lancer: 'Lancero', general: 'General',
};

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
                    <span>📜 Historial</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5">
                    {gameHistory.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                            Aún no hay eventos
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

    if (entry.type === 'attack') {
        const isCritical = entry.total >= 11;
        const isTorbellino = entry.attackName === 'Torbellino';
        return (
            <div className={`${borderCls} ${bgCls} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>Turno {entry.turn} · Acción {entry.actionNumber}</span>
                        {entry.attackName && entry.attackName !== 'Ataque básico' && (
                            <span className="text-cyan-400 text-[10px]">{entry.attackName}</span>
                        )}
                    </div>
                    {isTorbellino ? (
                        <div className="text-zinc-300 font-semibold text-[10px]">🌪️ Torbellino</div>
                    ) : entry.attackName === 'Sacrificar' ? (
                        <div className="text-zinc-300 text-[10px]">
                            <span className="text-red-400">Sacrifica</span>
                            <span className="text-zinc-400"> [{entry.targetId}]{CLASS_LABELS[entry.targetClass] ?? entry.targetClass}</span>
                            <span className="text-zinc-500"> · </span>
                            <span className="text-green-400">General +{entry.modifiers?.[0]?.includes('5') ? '5' : '3'} HP</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-zinc-300">
                            <span className="text-blue-400">⚔</span>
                            <span className="text-zinc-200 font-semibold truncate">{CLASS_LABELS[entry.attackerClass] ?? entry.attackerClass}</span>
                            <span className="text-zinc-500">vs</span>
                            <span className="text-red-400">🛡</span>
                            <span className="text-zinc-200 font-semibold truncate">{CLASS_LABELS[entry.targetClass] ?? entry.targetClass}</span>
                        </div>
                    )}
                    {entry.difficulty > 0 && (
                        <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
                            <span>Dif {entry.difficulty}</span>
                            {entry.die1 > 0 && <><span className="text-zinc-600">|</span><span>{DIE_FACES[entry.die1] ?? entry.die1}+{DIE_FACES[entry.die2] ?? entry.die2}={entry.total}{isCritical ? ' 💥' : ''}</span></>}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <div>
                        {entry.attackName === 'Sacrificar' ? (
                            <span className="text-red-400 font-semibold">🔴 -{entry.damage} HP</span>
                        ) : entry.hit ? (
                            <span className="text-green-400 font-semibold">✅ -{entry.damage} HP{entry.counterDamage > 0 ? ` (contra -${entry.counterDamage})` : ''}</span>
                        ) : (
                            <span className="text-red-400 font-semibold">❌ Fallo{entry.counterDamage > 0 ? ` (contra -${entry.counterDamage})` : ''}</span>
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
            <div className={`${borderCls} ${bgCls} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>Turno {entry.turn} · Acción {entry.actionNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-300">
                        <span className="text-amber-400">👟</span>
                        <span className="text-zinc-200 font-semibold truncate">{CLASS_LABELS[entry.unitClass] ?? entry.unitClass}</span>
                        <span className="text-zinc-500">mueve</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                        {entry.path ? entry.path : `(${entry.from.q},${entry.from.r}) → (${entry.to.q},${entry.to.r})`}
                    </div>
                    {entry.cost !== entry.baseCost && (
                        <div className="text-[9px] text-zinc-500">base {entry.baseCost} PA</div>
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
            ? `${CLASS_LABELS[entry.sourceClass] ?? entry.sourceClass} - ${entry.sourceIdentity}`
            : null;
        const detailParts: string[] = [];
        if (entry.targetClass) detailParts.push(CLASS_LABELS[entry.targetClass] ?? entry.targetClass);
        if (entry.counterCardName) detailParts.push(`↩ ${entry.counterCardName}`);
        if (entry.healAmount !== undefined) detailParts.push(`+${entry.healAmount} HP`);
        if (entry.details && entry.healAmount === undefined) detailParts.push(entry.details);
        const detailText = detailParts.join(' · ');
        return (
            <div className={`${borderCls} ${bgCls} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>Turno {entry.turn} · Acción {entry.actionNumber}</span>
                        <span className={abilityColor}>{isRealCard ? entry.cardType : entry.cardName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-300">
                        <span className={isCounter ? 'text-violet-400' : isRealCard ? 'text-amber-400' : 'text-cyan-400'}>{isRealCard ? '🃏' : '✨'}</span>
                        <span className="text-zinc-200 font-semibold truncate">{titleLine ?? entry.cardName}</span>
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
