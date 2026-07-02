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

function attackNameDisplay(entry: any): string {
    const name = entry.attackName;
    if (!name) return l('button.basicAttack');
    if (name.startsWith('ability.') || name.startsWith('button.')) return l(name);
    return name;
}

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

    const SUPPORT_ABILITIES = new Set([
        'Ángel Guardián', 'Proteger', 'Rayo celestial', 'Meditación',
        'En nombre del rey', 'Sacrificar', 'Camino del guerrero',
        'Voz de mando', 'Liderar a las tropas', 'Lanza y escudo',
    ]);

    if (entry.type === 'attack') {
        const isSupport = SUPPORT_ABILITIES.has(entry.attackName);
        const isCritical = !entry.noCritical && entry.total >= 11;
        const isTorbellino = entry.attackName === 'Torbellino' || entry.configId === 'torbellino';

        if (isSupport) {
            const sourceName = l('identity.escudo_comandante.name');
            const effects: React.ReactNode[] = [];
            if (entry.attackName === 'Ángel Guardián') {
                effects.push(<span key="shield"><span className="text-blue-400">🛡</span> {l('aura.shieldName')} +2 HP a {entry.shieldedCount} aliados</span>);
                if (entry.healedId) {
                    effects.push(<span key="heal" className="text-green-400">💚 {l(`unit.class.${entry.targetClass}`) ?? entry.targetClass} +1 HP</span>);
                }
            } else if (entry.attackName === 'Proteger') {
                effects.push(<span key="def" className="text-blue-400">🛡 {l(`unit.class.${entry.targetClass}`) ?? entry.targetClass} +1 {l('cat.def')}</span>);
            }
            const lastIdx = effects.length - 1;
            return (
                <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                    <div className="text-zinc-500 flex justify-between items-center mb-1">
                        <span>{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        <span className="text-cyan-400 text-[10px] font-semibold">{attackNameDisplay(entry)}</span>
                    </div>
                    <div className="text-zinc-400 text-[9px] mb-0.5">{sourceName}</div>
                    <div className="text-zinc-300 text-[10px] leading-relaxed space-y-0.5">
                        {effects.map((e, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <span>{e}</span>
                                {i === lastIdx && <span className="text-[10px] font-bold text-yellow-400 ml-2">{entry.paCost ?? 0} PA</span>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        {entry.attackName && attackNameDisplay(entry) !== l('button.basicAttack') && (
                            <span className="text-cyan-400 text-[10px]">{attackNameDisplay(entry)}</span>
                        )}
                    </div>
                    {isTorbellino ? (
                        <div className="text-[10px] leading-relaxed space-y-0.5">
                            {entry.hit ? (
                                <span className="text-green-400">{l('ui.torbellinoHit', { count: entry.hitEnemies ?? '?', ids: `[${(entry.enemiesHit ?? []).join('], [')}]` })}</span>
                            ) : (
                                <>
                                    <div className="text-red-400">{l('ui.torbellinoMissAllies', { count: entry.hitAllies ?? '?', ids: `[${(entry.alliesHit ?? []).join('], [')}]` })}</div>
                                    <div className="text-green-400">{l('ui.torbellinoMissEnemies', { count: entry.hitEnemies ?? '?', ids: `[${(entry.enemiesHit ?? []).join('], [')}]` })}</div>
                                </>
                            )}
                        </div>
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
                            <span className="text-green-400 font-semibold">✅ -{entry.damage} HP{entry.counterDamage > 0 && entry.counterDamage !== 2 ? <span className="text-red-400">{` (${l('board.counter')} -${entry.counterDamage} HP)`}</span> : ''}</span>
                        ) : (
                            <span className="text-red-400 font-semibold">❌ {l('board.miss')}{entry.counterDamage > 0 ? ` (${l('board.counter')} -${entry.counterDamage} HP)` : ''}</span>
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

    const CARD_SUPPORT = new Set([
        'rayo_celestial', 'meditacion', 'en_nombre_del_rey', 'liderar_tropas',
        'lanza_escudo', 'voz_de_mando', 'plan_batalla', 'camino_guerrero', 'robar_ricos',
        'cabalgar', 'cabalgar_2', 'a_la_carga', 'posicion_estrategica',
        'angel_guardian', 'proteger', 'torbellino', 'sacrificar', 'desenvainado_veloz',
        'proyeccion',
    ]);

    if (entry.type === 'card') {
        const isRealCard = /_\d+$/.test(entry.cardId) && !CARD_SUPPORT.has(entry.cardId);
        const isCounter = entry.cardType === 'COUNTER';
        const isAbilityCard = !isRealCard && CARD_SUPPORT.has(entry.cardId);

        if (isAbilityCard) {
            // Build effect lines per ability
            const effLines: { text: string; color: string }[] = [];
            const cls = (c: string) => l(`unit.class.${c}`) ?? c;
            if (entry.cardId === 'en_nombre_del_rey') {
                effLines.push({ text: `🛡 [${entry.targetId}] ${cls(entry.targetClass)} ${l('aura.shieldName')} +3 HP`, color: 'text-blue-400' });
                effLines.push({ text: `⚔ [${entry.targetId}] ${cls(entry.targetClass)} ${l('cat.atk')} +2`, color: 'text-red-400' });
            } else if (entry.cardId === 'rayo_celestial') {
                effLines.push({ text: `⚔ [${entry.targetId}] ${cls(entry.targetClass)} ${l('cat.atk')} +3`, color: 'text-red-400' });
            } else if (entry.cardId === 'voz_de_mando') {
                effLines.push({ text: `⚔ +1 ${l('cat.atk')}, 🛡 +1 ${l('cat.def')}`, color: 'text-zinc-300' });
            } else if (entry.cardId === 'plan_batalla') {
                const isAtk = entry.details?.includes('Avanzar');
                effLines.push({ text: isAtk ? `⚔ ${entry.details}` : `🛡 ${entry.details}`, color: isAtk ? 'text-red-400' : 'text-blue-400' });
            } else if (entry.cardId === 'camino_guerrero') {
                effLines.push({ text: `⚔ +1 PA (${l('ui.killAtRange', { n: 1 })}`, color: 'text-yellow-400' });
            } else if (entry.cardId === 'robar_ricos') {
                effLines.push({ text: `💚 [${entry.targetId}] ${cls(entry.targetClass)} +1 HP`, color: 'text-green-400' });
            } else if (entry.cardId === 'posicion_estrategica') {
                effLines.push({ text: `👟 ${entry.details}`, color: 'text-amber-400' });
            } else if (entry.cardId === 'cabalgar' || entry.cardId === 'a_la_carga') {
                const parts = (entry.details ?? '').split(' · ');
                effLines.push({ text: `👟 ${parts[0] ?? ''}`, color: 'text-amber-400' });
                if (parts.length > 1) effLines.push({ text: `  ${parts[1]}`, color: 'text-zinc-500' });
            } else if (entry.cardId === 'meditacion') {
                effLines.push({ text: `💚 +${entry.details?.match(/(\d+)/)?.[1] ?? '?'} HP (${entry.sourceIdentity})`, color: 'text-green-400' });
            } else if (entry.cardId === 'lanza_escudo') {
                const isRange = entry.details?.includes('rango');
                effLines.push({ text: isRange ? `⚔ +1 ${l('cat.range')}` : `🛡 +1 ${l('cat.def')}`, color: isRange ? 'text-red-400' : 'text-blue-400' });
            } else if (entry.cardId === 'liderar_tropas') {
                const bonus = entry.details?.match(/\+(\d+)/)?.[1] ?? '1';
                effLines.push({ text: `⚔ ${l('unit.class.infantry')} +${bonus} ${l('cat.atk')}`, color: 'text-red-400' });
            } else if (entry.cardId === 'proyeccion') {
                const targets = (entry.details ?? '').split('|').filter(Boolean);
                for (const t of targets) {
                    effLines.push({ text: `⚔ ${t} -1 HP`, color: 'text-red-400' });
                }
            } else if (entry.details) {
                effLines.push({ text: entry.details, color: 'text-zinc-300' });
            }
            const last = effLines.length - 1;
            return (
                <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                    <div className="text-zinc-500 flex justify-between items-center mb-1">
                        <span>{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        <span className="text-cyan-400 text-[10px] font-semibold">{entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : entry.cardName}</span>
                    </div>
                    {entry.sourceClass && (entry.sourceIdentity || entry.sourceIdentityKey) && (
                        <div className="text-zinc-400 text-[9px] mb-0.5">{cls(entry.sourceClass)} - {entry.sourceIdentityKey ? l(`identity.${entry.sourceIdentityKey}.name`) || entry.sourceIdentityKey : entry.sourceIdentity}</div>
                    )}
                    <div className="text-zinc-300 text-[10px] space-y-0.5">
                        {effLines.map((line, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className={line.color}>{line.text}</span>
                                {i === last && <span className="text-[10px] font-bold text-yellow-400 ml-2">{entry.paCost ?? 0} PA</span>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const abilityColor = isCounter ? 'text-violet-400' : isRealCard ? (entry.cardType === 'BUFF' ? 'text-emerald-400' : 'text-red-400') : 'text-cyan-400';
        const titleLine = entry.sourceClass && (entry.sourceIdentity || entry.sourceIdentityKey)
            ? `${l(`unit.class.${entry.sourceClass}`) ?? entry.sourceClass} · ${entry.sourceIdentityKey ? l(`identity.${entry.sourceIdentityKey}.name`) || entry.sourceIdentityKey : entry.sourceIdentity}`
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
                        <span className="text-zinc-200 font-semibold truncate">{titleLine ?? (entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : getCardName(entry.cardId))}</span>
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
