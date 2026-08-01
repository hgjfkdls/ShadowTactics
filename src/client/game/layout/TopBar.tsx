import { useState, useEffect } from 'react';
import type { GameState } from '@shared';
import { l } from '@shared/i18n';
import { IDENTITY_INFO, getIdentityKey } from '../../prep/identityData';

type Props = {
    state: GameState;
    playerId: string;
    gameId?: string;
    role?: { role: string; playerId?: string } | null;
};

function getIdentityName(identityCardId: string | undefined): string {
    if (!identityCardId) return '—';
    const key = getIdentityKey(identityCardId);
    const translated = l(`identity.${key}.name`);
    if (translated && translated !== `identity.${key}.name`) return translated;
    return IDENTITY_INFO[key]?.name ?? '?';
}

function PlayerBadge({ state, pid, activePlayer, isOwner }: { state: GameState; pid: string; activePlayer: string; isOwner: boolean }) {
    const p = state.players[pid];
    if (!p) return null;
    const isActive = activePlayer === pid;
    const unitCount = Object.values(state.units).filter(u => u.owner === pid).length;
    const actionPoints = p.actionPoints ?? 0;
    const identityName = getIdentityName(p.selectedIdentity);

    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${isActive ? (pid === 'p1' ? 'bg-player1/20 ring-1 ring-player1' : 'bg-player2/20 ring-1 ring-player2') : ''}`}>
            <span className={`text-xs font-bold ${pid === 'p1' ? 'text-player1' : 'text-player2'}`}>
                {l(pid === 'p1' ? 'board.player1' : 'board.player2')}
                {isOwner ? ' (Tú)' : ''}
            </span>
            {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">{identityName}</span>
            <span className="text-[10px] text-yellow-400 font-bold">AP:{actionPoints}</span>
            <span className="text-[10px] text-zinc-500">U:{unitCount}</span>
        </div>
    );
}

export function TopBar({ state, playerId, gameId, role }: Props) {
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const activePlayer = state.activePlayer || state.currentDeployingPlayer || '';

    const [totalTime, setTotalTime] = useState(0);
    useEffect(() => {
        if (!state.gameStartTime) return;
        setTotalTime(Math.floor((Date.now() - state.gameStartTime!) / 1000));
        const id = setInterval(() => setTotalTime(Math.floor((Date.now() - state.gameStartTime!) / 1000)), 1000);
        return () => clearInterval(id);
    }, [state.gameStartTime]);

    function fmtTime(s: number): string {
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    }

    return (
        <div className="absolute top-0 left-0 right-0 z-40 bg-zinc-900/80 border-b border-white/10 px-3 py-1.5 flex items-center gap-3 text-xs">
            {gameId && (
                <span className="text-[9px] text-zinc-500 font-mono mr-1">
                    [{gameId} · {role?.role ?? 'unknown'}{role?.role === 'player' && role?.playerId ? ` (${role.playerId})` : ''}]
                </span>
            )}
            <PlayerBadge state={state} pid={playerId} activePlayer={activePlayer} isOwner={true} />
            <span className="text-zinc-600">vs</span>
            <PlayerBadge state={state} pid={opponentId} activePlayer={activePlayer} isOwner={false} />

            <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">{l('board.turnLabel')}</span>
                    <span className="text-xs font-bold text-zinc-200">{state.turn}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">{l('board.time')}</span>
                    <span className="text-xs font-bold text-zinc-200">{fmtTime(totalTime)}</span>
                </div>
            </div>
        </div>
    );
}
