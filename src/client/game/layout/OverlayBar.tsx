import { useState, useEffect } from 'react';
import type { GameState } from '@shared';
import type { TimerInfo } from '@shared/game/timer';
import { l } from '@shared/i18n';
import { IDENTITY_INFO, getIdentityKey } from '../../prep/identityData';

type Props = {
    state: GameState;
    playerId: string;
    timerInfo: TimerInfo | null;
    pausedTimerInfo?: TimerInfo | null;
    role?: { role: string; playerId?: string } | null;
    onSelectIdentity?: (playerId: string) => void;
};

const CLASS_ICONS: Record<string, string> = {
    archer: '/icons/units/arquero_icon.webp',
    infantry: '/icons/units/infanteria_icon.webp',
    cavalry: '/icons/units/caballeria_icon.webp',
    lancer: '/icons/units/lancero_icon.webp',
    general: '/icons/units/general_icon.webp',
};

const CLASS_ORDER = ['archer', 'infantry', 'cavalry', 'lancer'] as const;

function getIdentityName(identityCardId: string | undefined): string {
    if (!identityCardId) return '—';
    const key = getIdentityKey(identityCardId);
    const translated = l(`identity.${key}.name`);
    if (translated && translated !== `identity.${key}.name`) return translated;
    return IDENTITY_INFO[key]?.name ?? '?';
}

function fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function ClassCount({ state, pid }: { state: GameState; pid: string }) {
    const counts = { archer: 0, infantry: 0, cavalry: 0, lancer: 0 };
    for (const u of Object.values(state.units)) {
        if (u.owner === pid && u.class in counts) {
            counts[u.class as keyof typeof counts]++;
        }
    }
    return (
        <div className="flex gap-2 items-center">
            {CLASS_ORDER.map(cls => (
                <div key={cls} className="flex flex-col items-center gap-0.5 min-w-[28px]">
                    <img src={CLASS_ICONS[cls]} alt={cls} className="w-5 h-5 object-contain" />
                    <span className="text-[10px] font-bold text-zinc-300">{counts[cls]}</span>
                </div>
            ))}
        </div>
    );
}

export function OverlayBar({ state, playerId, timerInfo, pausedTimerInfo, role, onSelectIdentity }: Props) {
    const activePlayer = state.activePlayer || state.currentDeployingPlayer || '';

    const [totalTime, setTotalTime] = useState(0);
    useEffect(() => {
        if (!state.gameStartTime) return;
        setTotalTime(Math.floor((Date.now() - state.gameStartTime!) / 1000));
        const id = setInterval(() => setTotalTime(Math.floor((Date.now() - state.gameStartTime!) / 1000)), 1000);
        return () => clearInterval(id);
    }, [state.gameStartTime]);

    const p1General = Object.values(state.units).find(u => u.owner === 'p1' && u.class === 'general');
    const p2General = Object.values(state.units).find(u => u.owner === 'p2' && u.class === 'general');

    const p1IdentityName = getIdentityName(state.players['p1']?.selectedIdentity);
    const p2IdentityName = getIdentityName(state.players['p2']?.selectedIdentity);

    const turnUrgent = timerInfo && timerInfo.remaining <= 10;
    const turnRemaining = timerInfo ? timerInfo.remaining : 0;

    const p1Active = activePlayer === 'p1';
    const p2Active = activePlayer === 'p2';
    const activeBorderP1 = p1Active ? 'border-b-[3px] border-player1' : '';
    const activeBorderP2 = p2Active ? 'border-b-[3px] border-player2' : '';

    return (
        <div className="absolute top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
            {/* Content */}
            <div className="flex items-end justify-center gap-0.5 py-2.5 text-xs pointer-events-auto bg-zinc-900/70 border-b border-zinc-700/60 rounded-b-lg shadow-lg w-[780px] max-w-full" style={{ transform: 'scale(1.2)', transformOrigin: 'top center' }}>

                {/* P1 section */}
                <div className={`grid grid-cols-[auto_auto_auto_auto] gap-x-1 gap-y-0.5 pb-0.5 items-center ${activeBorderP1}`}>
                    {/* (0,0): Turn badge (only when active) */}
                    {p1Active ? (
                        <div className="flex items-center justify-center">
                                <div className="bg-emerald-600 rounded px-2.5 py-0.5">
                                    <span className="text-[9px] font-medium text-white">{l('board.yourTurn')}</span>
                                </div>
                        </div>
                    ) : <div />}

                    {/* (1,0): empty */}
                    <div />

                    {/* (2,0): Identity name */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => onSelectIdentity?.('p1')}
                            className={`rounded px-2.5 py-0.5 transition cursor-pointer hover:opacity-80 whitespace-nowrap ${p1Active ? 'bg-player1/20' : 'bg-zinc-800/60'} text-player1`}
                        >
                            <span className="text-[9px] font-semibold truncate max-w-[90px]">{p1IdentityName}</span>
                        </button>
                    </div>

                    {/* (3,0): empty */}
                    <div />

                    {/* (0,1): Player info */}
                    <div className="flex flex-col items-center gap-0 w-[72px] border border-yellow-500/50 rounded px-1 py-0.5">
                        <span className="text-[9px] font-bold text-player1 text-center">
                            {l('board.player1')}
                            {playerId === 'p1' && <span className="text-[8px] text-zinc-500 font-normal">(Tú)</span>}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-zinc-900/60 border-2 border-player1/60 flex items-center justify-center overflow-hidden shrink-0">
                            {p1General && (
                                <img src={CLASS_ICONS[p1General.class] || ''} alt="" className="w-6 h-6 object-contain" />
                            )}
                        </div>
                    </div>

                    {/* (1,1): Cards */}
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2 h-[44px]">
                            <img src="/cards/es/reverso.webp" alt="cards" className="w-5 h-[28px] rounded object-contain shrink-0" />
                            <span className="text-[9px] font-bold text-zinc-300">x{state.players['p1']?.cardsInHand?.length ?? 0}</span>
                        </div>
                    </div>

                    {/* (2,1): ClassCount */}
                    <div className="flex items-center justify-center">
                        <div className="bg-zinc-800/60 rounded-lg px-3 py-1.5 flex items-center">
                            <ClassCount state={state} pid="p1" />
                        </div>
                    </div>

                    {/* (3,1): PA */}
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] font-bold text-yellow-400">PA</span>
                            <span className="text-[10px] font-bold text-zinc-300">{state.players['p1']?.actionPoints ?? 0}</span>
                        </div>
                    </div>
                </div>

                {/* Center: Timer info */}
                <div className="flex flex-col items-center gap-1 px-[5px] w-[120px]">
                    <div className="text-[9px] text-zinc-500 font-medium">
                        {l('board.time')}: {fmtTime(totalTime)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">
                        {l('board.turnLabel')} {state.turn}
                    </div>
                    {timerInfo && (
                        <div className={`flex items-center gap-2 border rounded-lg px-3 py-1 shadow transition-colors ${
                            turnUrgent ? 'bg-red-900/80 border-red-500' : 'bg-zinc-800/80 border-zinc-600'
                        }`}>
                            <span className={`text-[9px] font-semibold ${turnUrgent ? 'text-red-200' : 'text-zinc-500'}`}>
                                {l('board.timeLimit')}
                            </span>
                            <span className={`text-[9px] font-semibold ${turnUrgent ? 'text-red-200 animate-pulse' : 'text-zinc-200'}`}>
                                {fmtTime(turnRemaining)}
                            </span>
                            {pausedTimerInfo && (
                                <span className="text-[10px] text-zinc-500 ml-1 border-l border-zinc-600 pl-2">
                                    ⏸ {fmtTime(pausedTimerInfo.remaining)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* P2 section (mirrored) */}
                <div className={`grid grid-cols-[auto_auto_auto_auto] gap-x-1 gap-y-0.5 pb-0.5 items-center ${activeBorderP2}`}>
                    {/* (0,0): empty */}
                    <div />

                    {/* (1,0): Identity name */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => onSelectIdentity?.('p2')}
                            className={`rounded px-2.5 py-0.5 transition cursor-pointer hover:opacity-80 whitespace-nowrap ${p2Active ? 'bg-player2/20' : 'bg-zinc-800/60'} text-player2`}
                        >
                            <span className="text-[9px] font-semibold truncate max-w-[90px]">{p2IdentityName}</span>
                        </button>
                    </div>

                    {/* (2,0): empty */}
                    <div />

                    {/* (3,0): Turn badge (only when active) */}
                    {p2Active ? (
                        <div className="flex items-center justify-center">
                                <div className="bg-emerald-600 rounded px-2.5 py-0.5">
                                    <span className="text-[9px] font-medium text-white">{l('board.yourTurn')}</span>
                                </div>
                        </div>
                    ) : <div />}

                    {/* (0,1): PA */}
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] font-bold text-yellow-400">PA</span>
                            <span className="text-[10px] font-bold text-zinc-300">{state.players['p2']?.actionPoints ?? 0}</span>
                        </div>
                    </div>

                    {/* (1,1): ClassCount */}
                    <div className="flex items-center justify-center">
                        <div className="bg-zinc-800/60 rounded-lg px-3 py-1.5 flex items-center">
                            <ClassCount state={state} pid="p2" />
                        </div>
                    </div>

                    {/* (2,1): Cards */}
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2 h-[44px]">
                            <img src="/cards/es/reverso.webp" alt="cards" className="w-5 h-[28px] rounded object-contain shrink-0" />
                            <span className="text-[9px] font-bold text-zinc-300">x{state.players['p2']?.cardsInHand?.length ?? 0}</span>
                        </div>
                    </div>

                    {/* (3,1): Player info */}
                    <div className="flex flex-col items-center gap-0 w-[72px] border border-yellow-500/50 rounded px-1 py-0.5">
                        <span className="text-[9px] font-bold text-player2 text-center">
                            {l('board.player2')}
                            {playerId === 'p2' && <span className="text-[8px] text-zinc-500 font-normal">(Tú)</span>}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-zinc-900/60 border-2 border-player2/60 flex items-center justify-center overflow-hidden shrink-0">
                            {p2General && (
                                <img src={CLASS_ICONS[p2General.class] || ''} alt="" className="w-6 h-6 object-contain" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
