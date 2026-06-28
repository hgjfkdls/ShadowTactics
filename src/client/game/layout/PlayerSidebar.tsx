import { useState, useEffect, useRef } from 'react';
import type { GameState, GameAction } from '@shared';
import { IDENTITY_INFO, getIdentityKey } from '../../prep/identityData';
import { getCardName, getCardType } from '@shared/game/actions/card';
import { l } from '@shared/i18n';

const CLASS_BORDER: Record<string, string> = {
    archer: 'border-amber-600/50', infantry: 'border-blue-600/50', cavalry: 'border-violet-600/50', lancer: 'border-red-600/50', general: 'border-yellow-500/50',
};

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string } | null;

type Props = {
    state: GameState;
    playerId: string;
    mode: 'DEPLOYMENT' | 'GAME';
    onSelectIdentity: (playerId: string) => void;
    selectedInfo: SelectedInfo;
    selectedDeployUnitId?: string | null;
    onSelectDeployUnit?: (unitId: string | null) => void;
    onInfoSelect?: (info: SelectedInfo) => void;
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
    const gameStartRef = useRef<number | null>(null);
    useEffect(() => {
        if (isGameActive && gameStartRef.current === null) {
            gameStartRef.current = Date.now();
        }
    }, [isGameActive]);
    useEffect(() => {
        if (!isGameActive) return;
        const id = setInterval(() => {
            if (gameStartRef.current) setTotalTime(Math.floor((Date.now() - gameStartRef.current) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [isGameActive]);

    function fmtTime(s: number): string {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    return (
        <aside className="h-full border-r border-zinc-700 flex flex-col overflow-hidden bg-zinc-900/80">
            {isGameActive && (
                <div className="px-3 py-2 border-b border-zinc-700 space-y-0.5">
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
            <div className="flex-1 flex flex-col overflow-hidden border-b border-zinc-700">
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
        if (actionLabel === 'discard') {
            sendAction({ type: 'DISCARD_CARD', playerId, cardId });
        } else if (actionLabel === 'useCard' && (cardId.startsWith('confusion') || cardId.startsWith('ataque_extra') || cardId.startsWith('precision')) && onInfoSelect) {
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
                    ? 'bg-green-900/20 border-l-2 border-green-500'
                    : 'bg-red-900/20 border-l-2 border-red-500'
                : 'border-l-2 border-transparent',
        ].join(' ')}>
            {/* Player name + active badge */}
            <div className="flex items-center justify-between px-3 pt-2 pb-2">
                <span className="text-xs font-semibold text-zinc-200">{l(playerId === 'p1' ? 'board.player1' : 'board.player2')}</span>
                {isActive && (
                    <span className={[
                        'text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap tracking-wide',
                        playerId === 'p1'
                            ? 'bg-green-700/60 text-green-200'
                            : 'bg-red-700/60 text-red-200',
                    ].join(' ')}>
                        {mode === 'DEPLOYMENT' ? l('board.deploying') : l('board.yourTurn')}
                    </span>
                )}
            </div>

            {/* Compact identity card */}
            <div className="px-2 mb-2">
                <div
                    onClick={onIdentityClick}
                    className={[
                        'flex items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 transition cursor-pointer',
                        isSelected
                            ? 'border-blue-500 bg-blue-600/15'
                            : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500',
                    ].join(' ')}
                >
                    <div className="text-lg relative">
                        🛡️
                        <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 shadow-lg"
                            style={{ backgroundColor: playerId === 'p1' ? '#166534' : '#991b1b', boxShadow: playerId === 'p1' ? '0 0 6px #166534' : '0 0 6px #991b1b' }}
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
                <div className="flex gap-3 px-3 py-2 bg-zinc-800/60 border-2 border-zinc-700 mx-2 rounded-lg mb-2">
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

            {/* Player-wide effects (GAME) */}
            {mode === 'GAME' && (() => {
                const playerMods = state.activeModifiers.filter(m => {
                    if (m.remainingTurns < 0) return false;
                    if (m.remainingUses !== undefined && m.remainingUses <= 0) return false;
                    return !m.targetId && m.sourcePlayerId === playerId;
                });
                if (playerMods.length === 0) return null;
                const isDebuff = (m: { stat: string; value: number; operator?: string }) => {
                    if (m.stat === 'movementCost' && m.value === 0 && m.operator === 'SET') return false;
                    if (m.stat === 'damage' && m.value > 0) return false;
                    return ['movementCost', 'difficulty', 'attackCost', 'bloqueo', 'inmovil', 'passiveDamage'].includes(m.stat) || m.stat === 'damage' || (m.stat === 'ap' && m.value < 0);
                };
                return (
                    <div className="px-3 py-1.5 space-y-1">
                        <div className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wide">Efectos</div>
                        <div className="flex flex-wrap gap-1">
                            {playerMods.map((m, i) => (
                                <button
                                    key={i}
                                    onClick={() => onInfoSelect?.({ type: 'effect', stat: m.stat, label: statusLabel(m.stat), description: descriptionForStat(m.stat, m.value, m.operator), source: m.source, sourceName: m.sourceName })}
                                    className={[
                                        'text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition',
                                        isDebuff(m)
                                            ? 'bg-red-900/40 text-red-300 border border-red-800/50 hover:bg-red-900/60'
                                            : 'bg-green-900/40 text-green-300 border border-green-800/50 hover:bg-green-900/60',
                                    ].join(' ')}
                                >
                                    {isDebuff(m) ? '🔴' : '🟢'} {statusLabel(m.stat)}
                                </button>
                            ))}
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
                                                        ? 'border-zinc-800 bg-zinc-900/50 opacity-40 cursor-not-allowed'
                                                        : sel
                                                            ? 'border-blue-500 bg-blue-600/20'
                                                            : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500',
                                                ].join(' ')}
                                            >
                                                <ClassSvg cls={entry.unitClass} />
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

            {/* Cards in hand (GAME) */}
            {mode === 'GAME' && (
                <div className="px-2 pb-2 space-y-1.5">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wide">
                        {l('board.cards')} ({hand.length})
                    </div>
                    {hand.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                            {hand.map(cid => (
                                <div
                                    key={cid}
                                    onMouseEnter={() => isOwner && setHoveredCard(cid)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    onClick={() => isOwner && onInfoSelect?.({ type: 'card', cardId: cid })}
                                            className={[
                                                'flex items-center gap-2 rounded border px-2.5 py-2 transition',
                                                selectedInfo?.type === 'card' && selectedInfo.cardId === cid
                                                    ? 'border-blue-500 bg-blue-600/15'
                                                    : isOwner
                                                        ? 'cursor-pointer border-zinc-700 bg-zinc-800/40 hover:border-zinc-500'
                                                        : 'border-zinc-700/50 bg-zinc-800/20',
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
                                                className="text-[10px] font-semibold px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition whitespace-nowrap"
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

function ClassSvg({ cls }: { cls: string }) {
    switch (cls) {
        case 'archer':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M7 16 L17 8 M11 8 L17 8 L17 12" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
            );
        case 'infantry':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#60a5fa" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#60a5fa" strokeWidth="1.3" fill="none" />
                    <rect x="7" y="9" width="10" height="8" rx="1.5" stroke="#60a5fa" strokeWidth="1.2" fill="none" />
                    <line x1="12" y1="9" x2="12" y2="17" stroke="#60a5fa" strokeWidth="1.2" />
                </svg>
            );
        case 'cavalry':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#a78bfa" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#a78bfa" strokeWidth="1.3" fill="none" />
                    <path d="M4 17 C4 12 8 5 12 4 C16 5 20 12 20 17" stroke="#a78bfa" strokeWidth="1.2" fill="none" />
                    <circle cx="12" cy="9" r="2" fill="#a78bfa" />
                </svg>
            );
        case 'lancer':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#f87171" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#f87171" strokeWidth="1.3" fill="none" />
                    <line x1="12" y1="10" x2="12" y2="3" stroke="#f87171" strokeWidth="1.5" />
                    <line x1="12" y1="3" x2="15" y2="6" stroke="#f87171" strokeWidth="1.5" />
                </svg>
            );
        case 'general':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7" r="3.5" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M5 20 C5 14 8 11.5 12 11.5 C16 11.5 19 14 19 20" stroke="#fbbf24" strokeWidth="1.3" fill="none" />
                    <path d="M12 4 L13.5 7 L17 7.5 L14.5 9.5 L15 12.5 L12 11 L9 12.5 L9.5 9.5 L7 7.5 L10.5 7 Z" stroke="#fbbf24" strokeWidth="0.9" fill="none" />
                </svg>
            );
        default:
            return null;
    }
}

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
        attackCost: `Coste de ataque: +${value}`,
        blocked: 'Unidad bloqueada, no puede actuar',
        dotOnHit: `${t}: +1 en el próximo impacto`,
        ap: `PA: ${value > 0 ? '+' : ''}${value}`,
        passiveDamage: `${t} al inicio del turno`,
    };
    return values[stat] ?? `${stat}: ${opStr} ${value}`;
}
