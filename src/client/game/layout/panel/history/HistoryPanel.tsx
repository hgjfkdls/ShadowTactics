import { useState } from 'react';
import { l } from '@shared/i18n';
import { getCardName } from '@shared/game/actions/card';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';

type HistoryEntry = {
    id: string;
    turn: number;
    playerId: string;
    type: 'attack' | 'move' | 'card' | 'support';
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

function getDefaultLogByType(type?: string) {
    switch (type) {
        case 'attack':
            return { showActionName: true, showAttacker: true, showDefender: true, showDmg: true, showResult: true, showCost: true, showTurn: true, showActionNumber: true, showGameTime: true };
        case 'move':
            return { showActionName: true, showMovement: true, showCost: true, showTurn: true, showActionNumber: true, showGameTime: true, showAttacker: false, showDefender: false };
        case 'support':
            return { showActionName: true, showSource: true, showEffects: true, showCost: true, showTurn: true, showActionNumber: true, showGameTime: true, showAttacker: false, showDefender: false };
        default:
            return {};
    }
}

function HistoryCard({ entry, selected }: { entry: HistoryEntry; selected?: boolean }) {
    const borderCls = selected ? 'border-yellow-400' : 'border-zinc-600/60';
    const bgCls = 'bg-zinc-700/40';
    const playerBorder = entry.playerId === 'p1' ? 'border-l-player1' : 'border-l-player2';

    const cfgId = entry.configId ?? entry.cardId;
    const cfg = cfgId ? ABILITY_CONFIG[cfgId] : undefined;
    const typeDefault = cfg ? getDefaultLogByType(cfg.type) : {};
    const logCfg = { ...typeDefault, ...(cfg?.log ?? {}) };
    const pShowGameTime = logCfg.showGameTime ?? true;
    const pShowActionName = logCfg.showActionName ?? true;
    const pShowTurn = logCfg.showTurn ?? true;
    const pShowActionNumber = logCfg.showActionNumber ?? true;
    const pShowAttacker = logCfg.showAttacker ?? true;
    const pShowDefender = logCfg.showDefender ?? true;
    const pShowSource = logCfg.showSource ?? false;
    const pShowTarget = logCfg.showTarget ?? false;
    const pShowMovement = logCfg.showMovement ?? false;
    const pShowEffects = logCfg.showEffects ?? false;
    const pShowDmg = logCfg.showDmg ?? true;
    const pShowCost = logCfg.showCost ?? true;
    const pUnitsAffected = logCfg.showUnitsAffected ?? false;
    const pShowResult = logCfg.showResult ?? true;
    const pCountAllies = logCfg.countAllies ?? false;
    const pCountEnemies = logCfg.countEnemies ?? false;

    if (entry.type === 'attack') {
        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    {(pShowTurn || pShowActionNumber) && (
                        <div className="text-zinc-500 flex justify-between">
                            <span>{pShowGameTime && entry.gameTime ? `${entry.gameTime} — ` : ''}{pShowTurn && pShowActionNumber ? l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber }) : pShowTurn ? `${l('board.turnLabel')} ${entry.turn}` : `${l('board.actionLabel')} ${entry.actionNumber}`}</span>
                            {pShowActionName && entry.attackName && (
                                <span className="text-effect-range text-[10px]">{attackNameDisplay(entry)}</span>
                            )}
                        </div>
                    )}
                    {pUnitsAffected ? (
                        <div className="text-[10px] leading-relaxed space-y-0.5">
                            {entry.hit ? (
                                <span className="text-hit-text">{l('ui.torbellinoHit', { count: entry.hitEnemies ?? '?', ids: `[${(entry.enemiesHit ?? []).join('], [')}]` })}</span>
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
                            <div><span className="text-effect-heal"> {l('unit.class.general')} +{entry.modifiers?.[0]?.includes('5') ? '5' : '3'} HP</span></div>
                        </div>
                    ) : pShowAttacker && pShowDefender ? (
                        <div className="flex items-center gap-1 text-zinc-300">
                            <span className="text-blue-400">⚔</span>
                            <span className="text-zinc-200 font-semibold truncate">{l(`unit.class.${entry.attackerClass}`) ?? entry.attackerClass}</span>
                            <span className="text-zinc-500">vs</span>
                            <span className="text-red-400">🛡</span>
                            <span className="text-zinc-200 font-semibold truncate">{l(`unit.class.${entry.targetClass}`) ?? entry.targetClass}</span>
                        </div>
                    ) : pShowAttacker ? (
                        <div className="text-zinc-300 text-[10px]">
                            <span className="text-blue-400">⚔</span> [{entry.attackerId}]{l(`unit.class.${entry.attackerClass}`) ?? entry.attackerClass}
                        </div>
                    ) : pShowDefender ? (
                        <div className="text-zinc-300 text-[10px]">
                            <span className="text-red-400">🛡</span> [{entry.targetId}]{l(`unit.class.${entry.targetClass}`) ?? entry.targetClass}
                        </div>
                    ) : null}
                </div>
                {pShowResult && (
                    <div className="flex items-center justify-between text-[10px] mt-0.5">
                        <div>
                            {entry.attackName === 'Sacrificar' ? (
                                <span className="text-red-400 font-semibold">🔴 -{entry.damage} HP</span>
                            ) : entry.hit ? (
                                <span className="text-hit-text font-semibold">{pShowDmg ? `✅ -${entry.damage} HP` : '✅'}{entry.counterDamage > 0 && entry.counterDamage !== 2 ? <span className="text-red-400">{` (${l('board.counter')} -${entry.counterDamage} HP)`}</span> : ''}</span>
                            ) : (
                                <span className="text-red-400 font-semibold">❌ {l('board.miss')}{entry.counterDamage > 0 ? ` (${l('board.counter')} -${entry.counterDamage} HP)` : ''}</span>
                            )}
                            {(entry.targetKilled || entry.attackerKilled) && (
                                <span className="text-yellow-400 ml-1">⚫</span>
                            )}
                        </div>
                        {pShowCost && <div className="text-[9px] font-bold text-effect-pa">{entry.paCost ?? 1} PA</div>}
                    </div>
                )}
                {(pCountAllies || pCountEnemies) && (
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                        {pCountAllies && entry.alliesHit !== undefined && entry.alliesHit.length > 0 && <span>{l('history.alliesAffected', { count: entry.alliesHit.length })}</span>}
                        {pCountEnemies && entry.enemiesHit !== undefined && entry.enemiesHit.length > 0 && <span>{l('history.enemiesAffected', { count: entry.enemiesHit.length })}</span>}
                    </div>
                )}
                {pShowMovement && entry.from && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                        <span className="text-amber-400">👟</span>
                        <span className="font-semibold truncate">{entry.unitClass ? (l(`unit.class.${entry.unitClass}`) ?? entry.unitClass) : ''}</span>
                        <span>{`(${entry.from.q},${entry.from.r}) → (${entry.to.q},${entry.to.r})`}</span>
                    </div>
                )}
            </div>
        );
    }

    if (entry.type === 'move' && pShowMovement) {
        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>{pShowGameTime && entry.gameTime ? `${entry.gameTime} — ` : ''}{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        {pShowActionName && (entry.attackName ? (
                            <span className="text-effect-range text-[10px]">{attackNameDisplay(entry)}</span>
                        ) : entry.configId ? (
                            <span className="text-effect-range text-[10px]">{l(`ability.${entry.configId}.name`)}</span>
                        ) : null)}
                    </div>
                    <div className="flex items-center gap-1 text-zinc-300">
                        <span className="text-amber-400">👟</span>
                        <span className="text-zinc-200 font-semibold truncate">{l(`unit.class.${entry.unitClass}`) ?? entry.unitClass}</span>
                        <span className="text-zinc-500">{l('history.move')}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                    <span>{entry.details ?? entry.path ?? `(${entry.from.q},${entry.from.r}) → (${entry.to.q},${entry.to.r})`}{entry.cost !== entry.baseCost ? <span className="text-zinc-500 ml-1">({l('board.baseLabel')} {entry.baseCost} PA)</span> : ''}</span>
                    {pShowCost && <span className="font-bold text-effect-pa">{entry.cost} PA</span>}
                </div>
            </div>
        );
    }

    if (entry.type === 'support') {
        const effLines: { text: string; color: string }[] = [];
        const cls = (c: string) => l(`unit.class.${c}`) ?? c;
        if (entry.details) {
            const detailsText = entry.details.startsWith('ability.') || entry.details.startsWith('passive.') ? l(entry.details) : entry.details;
            effLines.push({ text: detailsText, color: 'text-zinc-300' });
        }
        return (
            <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                <div className="space-y-0.5 flex-1">
                    <div className="text-zinc-500 flex justify-between">
                        <span>{pShowGameTime && entry.gameTime ? `${entry.gameTime} — ` : ''}{pShowTurn && pShowActionNumber ? l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber }) : pShowTurn ? `${l('board.turnLabel')} ${entry.turn}` : `${l('board.actionLabel')} ${entry.actionNumber}`}</span>
                        {pShowActionName && (entry.attackName ? (
                            <span className="text-effect-range text-[10px]">{attackNameDisplay(entry)}</span>
                        ) : entry.configId ? (
                            <span className="text-effect-range text-[10px]">{l(`ability.${entry.configId}.name`)}</span>
                        ) : null)}
                    </div>
                    {pShowSource && entry.sourceClass && (
                        <div className="flex items-center gap-1 text-zinc-300">
                            <span className="text-purple-400">✦</span>
                            <span className="text-zinc-200 font-semibold truncate">{cls(entry.sourceClass)}</span>
                        </div>
                    )}
                    {pShowTarget && entry.targetId && entry.targetClass && (
                        <div className="text-zinc-400 text-[10px]">
                            <span className="text-violet-400">{l('cardDetail.objective')}</span> [{entry.targetId}]{cls(entry.targetClass)}
                        </div>
                    )}
                    {pShowEffects && effLines.length > 0 && (
                        <div className="text-zinc-300 text-[10px] space-y-0.5">
                            {effLines.map((line, i) => (
                                <div key={i} className={line.color}>{line.text}</div>
                            ))}
                        </div>
                    )}
                </div>
                {pShowCost && entry.paCost > 0 && (
                    <div className="flex items-center justify-end text-[10px] mt-0.5">
                        <span className="font-bold text-effect-pa">{entry.paCost} PA</span>
                    </div>
                )}
            </div>
        );
    }

    const CARD_SUPPORT = new Set([
        'rayo_celestial', 'meditacion', 'en_nombre_del_rey', 'liderar_tropas',
        'lanza_escudo', 'voz_de_mando', 'plan_batalla', 'camino_del_guerrero', 'robar_ricos',
        'cabalgar', 'cabalgar_2', 'a_la_carga', 'posicion_estrategica',
        'angel_guardian', 'proteger', 'torbellino', 'sacrificar', 'desenvainado_veloz',
    ]);

    if (entry.type === 'card') {
        const isRealCard = /_\d+$/.test(entry.cardId) && !CARD_SUPPORT.has(entry.cardId);
        const isCounter = entry.cardType === 'COUNTER';
        const isAbilityCard = !isRealCard && CARD_SUPPORT.has(entry.cardId);

        if (isAbilityCard) {
            const effLines: { text: string; color: string }[] = [];
            const cls = (c: string) => l(`unit.class.${c}`) ?? c;
            if (entry.cardId === 'en_nombre_del_rey') {
                effLines.push({ text: `🛡 ${l('aura.shieldName')} +3 HP`, color: 'text-effect-def' });
                effLines.push({ text: `⚔ ${l('cat.atk')} +2`, color: 'text-effect-atk' });
            } else if (entry.cardId === 'rayo_celestial') {
                effLines.push({ text: `⚔ ${l('cat.atk')} +3`, color: 'text-effect-atk' });
            } else if (entry.cardId === 'voz_de_mando') {
                effLines.push({ text: `⚔ +1 ${l('cat.atk')}, 🛡 +1 ${l('cat.def')}`, color: 'text-zinc-300' });
            } else if (entry.cardId === 'plan_batalla') {
                const isAtk = entry.details?.includes('Avanzar');
                effLines.push({ text: isAtk ? `⚔ ${entry.details}` : `🛡 ${entry.details}`, color: isAtk ? 'text-effect-atk' : 'text-effect-def' });
            } else if (entry.cardId === 'camino_del_guerrero') {
                effLines.push({ text: `⚔ +1 PA (${l('ui.killAtRange', { n: 1 })}`, color: 'text-effect-pa' });
            } else if (entry.cardId === 'robar_ricos') {
                effLines.push({ text: `💚 +1 HP`, color: 'text-effect-heal' });
            } else if (entry.cardId === 'posicion_estrategica') {
                effLines.push({ text: `👟 ${entry.details}`, color: 'text-effect-diff' });
            } else if (entry.cardId === 'cabalgar' || entry.cardId === 'a_la_carga') {
                const parts = (entry.details ?? '').split(' · ');
                effLines.push({ text: `👟 ${parts[0] ?? ''}`, color: 'text-effect-diff' });
                if (parts.length > 1) effLines.push({ text: `  ${parts[1]}`, color: 'text-zinc-500' });
            } else if (entry.cardId === 'cabalgar_2' && entry.details) {
                effLines.push({ text: `👟 ${entry.details}`, color: 'text-effect-diff' });
            } else if (entry.cardId === 'meditacion') {
                const healMatch = entry.details?.match(/(\d+)/);
                effLines.push({ text: `💚 +${healMatch?.[1] ?? '?'} HP`, color: 'text-effect-heal' });
            } else if (entry.cardId === 'lanza_escudo') {
                const isRange = entry.details?.includes('rango');
                effLines.push({ text: isRange ? `⚔ +1 ${l('cat.range')}` : `🛡 +1 ${l('cat.def')}`, color: isRange ? 'text-effect-range' : 'text-effect-def' });
            } else if (entry.cardId === 'liderar_tropas') {
                const bonus = entry.details?.match(/\+(\d+)/)?.[1] ?? '1';
                effLines.push({ text: `⚔ ${l('unit.class.infantry')} +${bonus} ${l('cat.atk')}`, color: 'text-effect-atk' });
            } else if (entry.cardId === 'proyeccion') {
                const targets = (entry.details ?? '').split('|').filter(Boolean);
                for (const t of targets) {
                    effLines.push({ text: `⚔ ${t} -1 HP`, color: 'text-effect-atk' });
                }
            } else if (entry.details) {
                effLines.push({ text: entry.details, color: 'text-zinc-300' });
            }
            return (
                <div className={`${borderCls} ${bgCls} border-l-4 ${playerBorder} rounded px-2 py-1.5 text-[11px] leading-tight cursor-pointer transition flex flex-col`}>
                    <div className="text-zinc-500 flex justify-between items-center mb-1">
                        <span>{pShowGameTime && entry.gameTime ? `${entry.gameTime} — ` : ''}{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        {pShowActionName && <span className="text-effect-range text-[10px] font-semibold">{entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : entry.cardName}</span>}
                    </div>
                    {pShowSource && entry.sourceClass && (entry.sourceIdentity || entry.sourceIdentityKey) && (
                        <div className="text-zinc-400 text-[9px] mb-0.5">{cls(entry.sourceClass)} · {entry.sourceIdentityKey ? l(`identity.${entry.sourceIdentityKey}.name`) || entry.sourceIdentityKey : entry.sourceIdentity}</div>
                    )}
                    {pShowTarget && entry.targetId && entry.targetClass && (
                        <div className="text-zinc-400 text-[10px] mb-0.5"><span className="text-violet-400">{l('cardDetail.objective')}</span> [{entry.targetId}]{cls(entry.targetClass)}</div>
                    )}
                    {pShowEffects && effLines.length > 0 && (
                        <div className="text-zinc-300 text-[10px] space-y-0.5">
                            {effLines.map((line, i) => (
                                <div key={i} className={line.color}>{line.text}</div>
                            ))}
                        </div>
                    )}
                    {(pCountAllies || pCountEnemies) && (
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                            {pCountAllies && entry.alliesHit !== undefined && entry.alliesHit.length > 0 && <span>{l('history.alliesAffected', { count: entry.alliesHit.length })}</span>}
                            {pCountEnemies && entry.enemiesHit !== undefined && entry.enemiesHit.length > 0 && <span>{l('history.enemiesAffected', { count: entry.enemiesHit.length })}</span>}
                        </div>
                    )}
                    {pShowCost && entry.paCost !== undefined && (
                        <div className="flex justify-end text-[10px] font-bold text-effect-pa mt-0.5">{entry.paCost} PA</div>
                    )}
                </div>
            );
        }

        const abilityColor = isCounter ? 'text-violet-400' : isRealCard ? (entry.cardType === 'BUFF' ? 'text-emerald-400' : 'text-red-400') : 'text-effect-range';
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
                        <span>{pShowGameTime && entry.gameTime ? `${entry.gameTime} — ` : ''}{l('history.turnAndAction', { turn: entry.turn, action: entry.actionNumber })}</span>
                        <span className={abilityColor}>{isRealCard ? entry.cardType : getCardName(entry.cardId)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-300">
                        <span className={isCounter ? 'text-violet-400' : isRealCard ? '' : 'text-effect-range'}>
                            {isRealCard
                                ? <img src="/cards/es/reverso.webp" alt="" className="inline-block w-4 h-[22px] rounded-sm object-cover align-middle" />
                                : '✨'}
                        </span>
                        <span className="text-zinc-200 font-semibold truncate">{titleLine ?? (entry.cardName?.startsWith('ability.') || entry.cardName?.startsWith('button.') ? l(entry.cardName) : getCardName(entry.cardId))}</span>
                    </div>
                    {pShowTarget && entry.targetId && entry.targetClass && (
                        <div className="text-zinc-400 text-[10px]"><span className="text-violet-400">{l('cardDetail.objective')}</span> [{entry.targetId}]{l(`unit.class.${entry.targetClass}`) ?? entry.targetClass}</div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{detailText}</span>
                        {entry.paCost !== undefined ? <span className="font-bold text-effect-pa">{entry.paCost} PA</span> : null}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
