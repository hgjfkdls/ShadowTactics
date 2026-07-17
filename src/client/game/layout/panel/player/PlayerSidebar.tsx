import { useState, useEffect, useRef } from 'react';
import type { GameState, GameAction } from '@shared';
import { IDENTITY_INFO, getIdentityKey } from '../../../../prep/identityData';
import { getCardName, getCardType } from '@shared/game/actions/card';
import { l } from '@shared/i18n';

const CLASS_BORDER: Record<string, string> = {
    archer: 'border-class-archer/50', infantry: 'border-class-infantry/50', cavalry: 'border-class-cavalry/50', lancer: 'border-class-lancer/50', general: 'border-class-general/50',
};

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number } | null;

type Props = {
    state: GameState;
    playerId: string;
    mode: 'DEPLOYMENT' | 'GAME';
    onSelectIdentity: (playerId: string) => void;
    selectedInfo: SelectedInfo;
    selectedDeployUnitId?: string | null;
    onSelectDeployUnit?: (unitId: string | null) => void;
    onInfoSelect?: (info: SelectedInfo) => void;
    setPendingCounterEspejoCard?: (cardId: string | null) => void;
    sendAction?: (action: GameAction) => void;
};

function getIdentityName(cardId: string | undefined): string {
    if (!cardId) return '?';
    const key = getIdentityKey(cardId);
    const translated = l(`identity.${key}.name`);
    if (translated && translated !== `identity.${key}.name`) return translated;
    return IDENTITY_INFO[key]?.name ?? '?';
}

function getIdentityClass(cardId: string | undefined): string {
    if (!cardId) return '';
    const key = getIdentityKey(cardId);
    const translated = l(`identity.${key}.className`);
    if (translated && translated !== `identity.${key}.className`) return translated;
    return IDENTITY_INFO[key]?.className ?? '';
}

export function PlayerSidebar({ state, playerId, mode, onSelectIdentity, selectedInfo, selectedDeployUnitId, onSelectDeployUnit, onInfoSelect, sendAction }: Props) {
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const isGameActive = mode === 'GAME' || (mode === 'DEPLOYMENT' && state.gamePhase !== 'PREPARATION');

    const [totalTime, setTotalTime] = useState(0);
    useEffect(() => {
        if (!isGameActive || !state.gameStartTime) return;
        setTotalTime(Math.floor((Date.now() - state.gameStartTime) / 1000));
        const id = setInterval(() => {
            setTotalTime(Math.floor((Date.now() - state.gameStartTime) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [isGameActive, state.gameStartTime]);

    function fmtTime(s: number): string {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    return (
        <aside className="h-full border-r border-white/20 flex flex-col overflow-hidden bg-zinc-900/80">
            {isGameActive && (
                <div className="px-3 py-2 border-b border-white/10 space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">{l('board.turnLabel')}</span>
                        <span className="text-sm font-bold text-zinc-200">{state.turn}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">{l('board.time')}</span>
                        <span className="text-xs font-bold text-zinc-200">{fmtTime(totalTime)}</span>
                    </div>
                </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden border-b border-white/10">
                <PlayerHalf
                    playerId={playerId}
                    isOwner={true}
                    identityCardId={state.players[playerId]?.selectedIdentity}
                    isActive={mode === 'DEPLOYMENT' ? state.currentDeployingPlayer === playerId : state.activePlayer === playerId}
                    isSelected={selectedInfo?.type === 'identity' && selectedInfo.playerId === playerId}
                    onIdentityClick={() => onSelectIdentity(playerId)}
                    mode={mode}
                    state={state}
                    selectedDeployUnitId={selectedDeployUnitId}
                    onSelectDeployUnit={onSelectDeployUnit}
                    onInfoSelect={onInfoSelect}
                    sendAction={sendAction}
                    selectedInfo={selectedInfo}
                />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <PlayerHalf
                    playerId={opponentId}
                    isOwner={false}
                    identityCardId={state.players[opponentId]?.selectedIdentity}
                    isActive={mode === 'DEPLOYMENT' ? state.currentDeployingPlayer === opponentId : state.activePlayer === opponentId}
                    isSelected={selectedInfo?.type === 'identity' && selectedInfo.playerId === opponentId}
                    onIdentityClick={() => onSelectIdentity(opponentId)}
                    mode={mode}
                    state={state}
                    onInfoSelect={onInfoSelect}
                    sendAction={sendAction}
                    selectedInfo={selectedInfo}
                />
            </div>
        </aside>
    );
}

function PlayerHalf({ playerId, isOwner, identityCardId, isActive, isSelected, onIdentityClick, mode, state, selectedDeployUnitId, onSelectDeployUnit, onInfoSelect, sendAction, selectedInfo }: {
    label: string;
    playerId: string;
    isOwner: boolean;
    identityCardId: string | undefined;
    isActive: boolean;
    isSelected: boolean;
    onIdentityClick: () => void;
    mode: 'DEPLOYMENT' | 'GAME';
    state: GameState;
    selectedDeployUnitId?: string | null;
    onSelectDeployUnit?: (unitId: string | null) => void;
    onInfoSelect?: (info: SelectedInfo) => void;
    sendAction?: (action: GameAction) => void;
    selectedInfo: SelectedInfo;
}) {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function clearHoverTimer() {
        if (hoverTimerRef.current !== null) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    }

    function setHoverAndTimer(cardId: string | null) {
        clearHoverTimer();
        setHoveredCard(cardId);
    }

    function startLeaveTimer() {
        clearHoverTimer();
        hoverTimerRef.current = setTimeout(() => {
            setHoveredCard(null);
            hoverTimerRef.current = null;
        }, 300);
    }

    // Limpiar hover al perder foco o cambiar de pestaña
    useEffect(() => {
        const clear = () => { clearHoverTimer(); setHoveredCard(null); };
        window.addEventListener('blur', clear);
        document.addEventListener('visibilitychange', clear);
        return () => {
            window.removeEventListener('blur', clear);
            document.removeEventListener('visibilitychange', clear);
            clearHoverTimer();
            setHoveredCard(null);
        };
    }, []);
    const unitCount = Object.values(state.units).filter(u => u.owner === playerId).length;
    const actionPoints = state.players[playerId]?.actionPoints ?? 0;
    const deployedCount = state.players[playerId]?.deployedUnits?.length ?? 0;
    const pool = state.players[playerId]?.unitsToDeploy ?? [];
    const isMyTurn = mode === 'DEPLOYMENT' && state.currentDeployingPlayer === playerId;
    const step = state.deploymentStep;
    const cls = identityCardId ? getIdentityClass(identityCardId).toLowerCase() : '';
    const hand = state.players[playerId]?.cardsInHand ?? [];
    const isDrawDiscard = state.turnPhase === 'DRAW' && state.activePlayer === playerId && hand.length > 3;
    const isCounterWindow = state.turnPhase === 'COUNTER' && state.activePlayer !== playerId;

    function getCardActionLabel(cardId: string): string | null {
        if (isDrawDiscard) return 'discard';
        if (isCounterWindow) {
            const ctype = getCardType(cardId);
            if (ctype === 'COUNTER') {
                if (cardId.startsWith('espejo') && state.lastCardAction?.cardId.startsWith('confusion')) return null;
                return 'counter';
            }
            return null;
        }
        if (state.activePlayer === playerId && state.turnPhase !== 'COUNTER') return 'useCard';
        return null;
    }

    function handleCardAction(cardId: string) {
        const actionLabel = getCardActionLabel(cardId);
        if (!actionLabel || !sendAction) return;
        // Evitar doble activación de card target mode
        if (selectedInfo?.type === 'cardTarget') return;
        if (actionLabel === 'discard') {
            sendAction({ type: 'DISCARD_CARD', playerId, cardId });
        } else if (actionLabel === 'counter' && cardId.startsWith('espejo') && setPendingCounterEspejoCard) {
            setPendingCounterEspejoCard(cardId);
        } else if (actionLabel === 'counter') {
            if (setPendingCounterEspejoCard) setPendingCounterEspejoCard(null);
            sendAction({ type: 'USE_CARD', playerId, cardId });
        } else if ((actionLabel === 'useCard' || actionLabel === 'counter') && cardId.startsWith('ataque_extra') && onInfoSelect) {
            onInfoSelect({ type: 'cardTarget', cardId });
        } else {
            sendAction({ type: 'USE_CARD', playerId, cardId });
        }
        setHoveredCard(null);
    }

    return (
        <div className={[
            'flex flex-col h-full transition',
            isActive
                ? playerId === 'p1'
                    ? 'bg-player1/40 border-l-2 border-player1'
                    : 'bg-player2/40 border-l-2 border-player2'
                : 'border-l-2 border-transparent',
        ].join(' ')}>
            {/* Player name + active badge */}
            <div className="mx-2 mt-6 mb-2 bg-zinc-900 border-2 border-white/20 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                    <span className={['text-sm font-semibold', playerId === 'p1' ? 'text-player1' : 'text-player2'].join(' ')}>{l(playerId === 'p1' ? 'board.player1' : 'board.player2')}</span>
                    {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap tracking-wide bg-emerald-600 text-white">
                            {mode === 'DEPLOYMENT' ? l('board.deploying') : l('board.yourTurn')}
                        </span>
                    )}
                </div>
            </div>

            {/* Compact identity card */}
            <div className="px-2 mb-2">
                    <div
                        onClick={onIdentityClick}
                        className={[
                            'flex items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 transition cursor-pointer bg-zinc-900',
                            isSelected
                                ? 'border-yellow-400'
                                : 'border-white/20 hover:border-white/40',
                        ].join(' ')}
                    >
                    <div className="text-lg relative">
                        🛡️
                        <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 shadow-lg"
                            style={{ backgroundColor: playerId === 'p1' ? 'var(--color-player1)' : 'var(--color-player2)', boxShadow: playerId === 'p1' ? '0 0 6px var(--color-player1)' : '0 0 6px var(--color-player2)' }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{getIdentityName(identityCardId) || '—'}</div>
                        <div className="text-[9px] text-zinc-500">{l('identity.cardLabel')}</div>
                    </div>
                </div>
            </div>

            {/* Stats row (GAME) */}
            {mode === 'GAME' && (
                <div className="flex gap-3 px-3 py-2 bg-zinc-900 border-2 border-white/20 mx-2 rounded-lg mb-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-200 font-bold uppercase">{l('board.paLabel')}</span>
                        <span className="text-sm font-bold text-yellow-400">{actionPoints}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-200 font-bold uppercase">{l('board.unitsLabel')}</span>
                        <span className="text-sm font-bold text-yellow-400">{unitCount}</span>
                    </div>
                </div>
            )}

            {/* Player-wide effects (GAME) - card indicators */}
            {mode === 'GAME' && (() => {
                const playerMods = state.activeModifiers.filter(m => {
                    if (m.remainingTurns < 0) return false;
                    if (m.remainingUses !== undefined && m.remainingUses <= 0) return false;
                    return !m.targetId && m.sourcePlayerId === playerId;
                });
                if (playerMods.length === 0) return null;
                return (
                    <div className="px-3 py-1.5 space-y-1">
                        <div className="text-[9px] text-panel-title font-semibold uppercase tracking-wide">{l('cardDetail.effects')}</div>
                        <div className="flex flex-wrap gap-1">
                            {playerMods.map((m, i) => {
                                const isCard = m.source === 'card';
                                const cardName = isCard && m.sourceName ? l(`card.${m.sourceName}.name`) : null;
                                const effectLabel = isCard && m.sourceName ? l(`card.${m.sourceName}.effectLabel`) : null;
                                const isBuff = !(m.stat === 'ap' && m.value < 0) && !(m.stat === 'movementCost' && m.value > 1) && !(m.stat === 'attack' && m.value < 0) && !(m.stat === 'attackCost' && m.value > 0) && !(m.stat === 'difficulty' && m.value > 0);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            // Buscar la entrada de historial que generó este efecto
                                            const historyEntry = state.gameHistory?.slice().reverse().find(e =>
                                                e.type === 'card' && e.cardId && e.cardId.startsWith(m.sourceName + '_')
                                            ) || state.gameHistory?.slice().reverse().find(e =>
                                                // También buscar entradas COUNTER cuyo counterCardId coincida
                                                e.type === 'card' && e.cardType === 'COUNTER' && e.counterCardId && e.counterCardId.split('_')[0] === m.sourceName
                                            );
                                            if (historyEntry) {
                                                onInfoSelect?.({ type: 'historyCard', entry: historyEntry as any });
                                            } else if (m.sourceName) {
                                                onInfoSelect?.({ type: 'card', cardId: m.sourceName + '_0' });
                                            }
                                        }}
                                        className={[
                                            'text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition',
                                            isBuff
                                                ? 'bg-green-900/40 text-green-300 border border-green-800/50 hover:bg-green-900/60'
                                                : 'bg-red-900/40 text-red-300 border border-red-800/50 hover:bg-red-900/60',
                                        ].join(' ')}
                                    >
                                        {isBuff ? '🟢' : '🔴'} {effectLabel && effectLabel !== `card.${m.sourceName}.effectLabel` ? effectLabel : (cardName ?? statusLabel(m.stat))}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Deployment pool */}
            {mode === 'DEPLOYMENT' && (
                <div className="flex-1 flex flex-col overflow-hidden px-2 pb-2">
                    <div className="text-[9px] text-zinc-500 py-1">
                        {l('deploy.count', { placed: deployedCount, remaining: pool.length })}
                        {step > 0 && <span> · {l('deploy.step', { step: step + 1 })}</span>}
                        {isMyTurn && <span className="text-yellow-400 font-semibold"> · {l('deploy.yourTurn')}</span>}
                    </div>

                    {pool.length > 0 ? (() => {
                        const isMyPool = playerId === state.currentDeployingPlayer;
                        const dCount = state.players[playerId]?.deployedUnits?.length ?? 0;
                        const hasGeneralDeployed = Object.values(state.units).some(u => u.owner === playerId && u.class === 'general');
                        const generalRequired = dCount >= 10 && !hasGeneralDeployed;

                        const CLASS_ORDER: string[] = ['infantry', 'cavalry', 'lancer', 'archer', 'general'];
                        const sorted = [...pool].sort((a, b) => CLASS_ORDER.indexOf(a.unitClass) - CLASS_ORDER.indexOf(b.unitClass));

                        return (
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-3 gap-1">
                                    {sorted.map(entry => {
                                        const sel = selectedDeployUnitId === entry.unitId;
                                        const isDisabled = generalRequired && entry.unitClass !== 'general';
                                        return (
                                            <button
                                                key={entry.unitId}
                                                disabled={isDisabled}
                                                onClick={() => {
                                                    onInfoSelect?.({ type: 'unit', unitId: entry.unitId });
                                                    if (isMyPool && onSelectDeployUnit) {
                                                        onSelectDeployUnit(sel ? null : entry.unitId);
                                                    }
                                                }}
                                                className={[
                                                    'flex flex-col items-center gap-0.5 rounded border p-1 transition',
                                                    isMyPool ? 'cursor-pointer' : 'cursor-default',
                                                    isDisabled
                                                        ? 'border-zinc-800 bg-zinc-800/50 opacity-40 cursor-not-allowed'
                                                        : sel
                                                            ? 'border-yellow-400 bg-zinc-800'
                                                            : 'border-white/20 bg-zinc-800 hover:border-white/40',
                                                ].join(' ')}
                                            >
                                                <BustIcon cls={entry.unitClass} size={18} />
                                                <span className="text-[8px] font-mono text-zinc-500">{entry.unitId}</span>
                                                <span className="text-[8px] font-semibold leading-tight">{l(`unit.class.${entry.unitClass}`)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedDeployUnitId && (
                                    <div className="mt-1 text-[9px] text-green-400 text-center">
                                        {l('deploy.clickValidHex')}
                                    </div>
                                )}
                                {generalRequired && (
                                    <div className="mt-1 text-[9px] text-yellow-400 text-center">
                                        ⚠️ Debes desplegar a tu General primero
                                    </div>
                                )}
                            </div>
                        );
                    })() : (
                        <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600">
                            {l('deploy.allPlaced')}
                        </div>
                    )}
                </div>
            )}

            {/* Unit-specific debuffs from cards (GAME) */}
            {mode === 'GAME' && (() => {
                const unitDebuffs = state.activeModifiers.filter(m => {
                    if (m.source !== 'card') return false;
                    if (m.remainingTurns < 0) return false;
                    if (m.remainingUses !== undefined && m.remainingUses <= 0) return false;
                    if (!m.targetId) return false;
                    if (m.sourcePlayerId !== playerId) return false;
                    const unit = state.units[m.targetId];
                    return unit && unit.owner === playerId;
                });
                if (unitDebuffs.length === 0) return null;
                return (
                    <div className="px-3 py-1.5 space-y-1">
                        <div className="text-[9px] text-panel-title font-semibold uppercase tracking-wide">Unidades afectadas</div>
                        <div className="flex flex-wrap gap-1">
                            {unitDebuffs.map((m, i) => {
                                const unit = state.units[m.targetId!];
                                const label = unit ? `[${unit.id}] ${l(`unit.class.${unit.class}`)}` : m.targetId!;
                                const displayLabel = `${label}: ${l(m.stat === 'bloqueo' ? 'unit.status.bloqueo' : m.stat)}`;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const historyEntry = state.gameHistory?.slice().reverse().find(e =>
                                                e.type === 'card' && e.cardId && e.cardId.startsWith(m.sourceName + '_')
                                            ) || state.gameHistory?.slice().reverse().find(e =>
                                                e.type === 'card' && e.cardType === 'COUNTER' && e.counterCardId && e.counterCardId.split('_')[0] === m.sourceName
                                            );
                                            if (historyEntry) {
                                                onInfoSelect?.({ type: 'historyCard', entry: historyEntry as any });
                                            } else if (m.sourceName) {
                                                onInfoSelect?.({ type: 'card', cardId: m.sourceName + '_0' });
                                            }
                                        }}
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/50 cursor-pointer hover:bg-red-900/60 transition"
                                    >
                                        {displayLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Cards in hand (GAME) */}
            {mode === 'GAME' && (
            <div className="mx-2 mb-2 bg-zinc-900 border-2 border-white/20 rounded-lg p-2.5">
                    <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mb-1.5">
                        {l('board.cards')} ({hand.length})
                    </div>
                    {hand.length > 0 ? (
                        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                            {hand.map(cid => (
                                <div
                                    key={cid}
                                    onMouseEnter={() => isOwner && setHoverAndTimer(cid)}
                                    onMouseLeave={() => { clearHoverTimer(); setHoveredCard(null); startLeaveTimer(); }}
                                    onClick={() => isOwner && onInfoSelect?.({ type: 'card', cardId: cid })}
                                            className={[
                                                'flex items-center gap-2 rounded border px-2.5 py-2 transition min-h-[38px]',
                                                selectedInfo?.type === 'card' && selectedInfo.cardId === cid
                                                    ? 'border-yellow-400 bg-zinc-800'
                                                    : isOwner
                                                        ? 'cursor-pointer border-white/20 bg-zinc-800 hover:border-white/40'
                                                        : 'border-white/10 bg-zinc-800/60',
                                            ].join(' ')}
                                        >
                                            <span className="text-sm">🃏</span>
                                            <span className="text-xs font-semibold flex-1 truncate">
                                                {isOwner ? getCardName(cid) : '?'}
                                            </span>
                                            {isOwner && hoveredCard === cid && (() => {
                                                const label = getCardActionLabel(cid);
                                                if (!label) return null;
                                                return (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleCardAction(cid); }}
                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition whitespace-nowrap shrink-0"
                                                    >
                                                        {l(`button.${label}`)}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-600 italic">{l('board.noCards')}</div>
                    )}
                </div>
            )}
        </div>
    );
}

import BustIcon from '../../../icons/BustIcon';

function statusLabel(stat: string): string {
    const t = l(`unit.status.${stat}`);
    return t || stat;
}

function descriptionForStat(stat: string, value: number, operator: string): string {
    const ops: Record<string, string> = { ADD: 'suma', MUL: 'multiplica', SET: 'establece' };
    const opStr = ops[operator] ?? operator;
    const t = l(`unit.status.${stat}`);
    const values: Record<string, string> = {
        movementCost: `${t}: ${opStr} ${value}`,
        attack: `${t}: +${value}`,
        difficulty: `${t}: ${value > 0 ? '+' : ''}${value}`,
        damage: `${t}: ${value > 0 ? '+' : ''}${value}`,
        attackCost: l('ui.attackCost', { n: value }),
        actionCost: `${l('ui.attackCost', { n: value })}`,
        blocked: l('ui.blocked'),
        dotOnHit: l('ui.dotOnHit'),
        passiveDamage: `${t} ${l('ui.passiveDamageStart')}`,
    };
    return values[stat] ?? `${stat}: ${opStr} ${value}`;
}
