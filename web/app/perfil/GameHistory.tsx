'use client';

import { useEffect, useState } from 'react';

type GameEntry = {
    id: string;
    opponent: string;
    result: 'victoria' | 'derrota';
    eloChange: string | null;
    type: string;
    date: string;
    duration: number | null;
    totalTurns: number | null;
    hasReplay: boolean;
};

type GameHistoryData = {
    games: GameEntry[];
    total: number;
    page: number;
    totalPages: number;
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GameHistory({ userId }: { userId: string }) {
    const [data, setData] = useState<GameHistoryData | null>(null);
    const [page, setPage] = useState(1);
    const limit = 10;

    useEffect(() => {
        fetch(`/api/games?userId=${userId}&page=${page}&limit=${limit}`)
            .then((r) => r.json())
            .then(setData);
    }, [userId, page]);

    if (!data) {
        return (
            <div className="mt-8">
                <h2 className="mb-4 text-xl font-bold text-white">Historial de partidas</h2>
                <div className="animate-pulse space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg bg-zinc-800/50" />
                    ))}
                </div>
            </div>
        );
    }

    if (data.games.length === 0) return null;

    return (
        <div className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-white">Historial de partidas</h2>

            <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-bg-dark text-left">
                            <th className="px-4 py-3 font-semibold text-zinc-300">Oponente</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Resultado</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">ELO</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Modo</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Duración</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Turnos</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Replay</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.games.map((g) => (
                            <tr key={g.id} className="border-t border-white/5 transition-colors hover:bg-white/5">
                                <td className="px-4 py-3 font-medium text-white">{g.opponent}</td>
                                <td className="px-4 py-3">
                                    <span className={g.result === 'victoria' ? 'text-emerald-400' : 'text-red-400'}>
                                        {g.result === 'victoria' ? '🟢 Victoria' : '🔴 Derrota'}
                                    </span>
                                </td>
                                <td className={`px-4 py-3 ${g.eloChange ? (g.eloChange.startsWith('+') ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-600'}`}>
                                    {g.eloChange ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-zinc-400">{g.type === 'ranked' ? 'Competitiva' : 'Rápida'}</td>
                                <td className="px-4 py-3 text-zinc-400">{formatDuration(g.duration)}</td>
                                <td className="px-4 py-3 text-zinc-400">{g.totalTurns ?? '—'}</td>
                                <td className="px-4 py-3">
                                    {g.hasReplay ? (
                                        <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                                            Ver replay
                                        </button>
                                    ) : (
                                        <span className="text-zinc-600">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-zinc-500">{formatDate(g.date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        &lt;
                    </button>
                    <span className="text-sm text-zinc-500">
                        Página {page} de {data.totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={page >= data.totalPages}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        &gt;
                    </button>
                </div>
            )}
        </div>
    );
}
