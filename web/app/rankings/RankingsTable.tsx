'use client';

import { useEffect, useState } from 'react';

type Player = {
    position: number;
    username: string;
    elo: number;
    wins: number;
    losses: number;
    winrate: number;
    total: number;
};

type RankingsData = {
    players: Player[];
    total: number;
    page: number;
    totalPages: number;
};

export default function RankingsTable({ currentUsername }: { currentUsername: string | null }) {
    const [data, setData] = useState<RankingsData | null>(null);
    const [page, setPage] = useState(1);
    const limit = 20;

    useEffect(() => {
        fetch(`/api/rankings?page=${page}&limit=${limit}`)
            .then((r) => r.json())
            .then(setData);
    }, [page]);

    if (!data) {
        return (
            <div className="animate-pulse space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-zinc-800/50" />
                ))}
            </div>
        );
    }

    if (data.players.length === 0) {
        return (
            <div className="rounded-xl border border-zinc-800 bg-bg-card p-8 text-center">
                <p className="text-lg font-semibold text-white">Aún no hay partidas registradas</p>
                <p className="mt-1 text-sm text-zinc-500">Los jugadores aparecerán aquí cuando jueguen su primera partida.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-bg-dark text-left">
                            <th className="px-4 py-3 font-semibold text-zinc-300">#</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Jugador</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">ELO</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">V</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">D</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">%</th>
                            <th className="px-4 py-3 font-semibold text-zinc-300">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.players.map((p) => {
                            const isCurrentUser = currentUsername !== null && p.username === currentUsername;
                            return (
                                <tr
                                    key={p.position}
                                    className="border-t border-white/5 transition-colors hover:bg-white/5"
                                >
                                    <td className="px-4 py-3 text-zinc-400">{p.position}</td>
                                    <td className={`px-4 py-3 font-medium ${isCurrentUser ? 'text-brand-400' : 'text-white'}`}>
                                        {p.username}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-white">{p.elo}</td>
                                    <td className="px-4 py-3 text-emerald-400">{p.wins}</td>
                                    <td className="px-4 py-3 text-red-400">{p.losses}</td>
                                    <td className="px-4 py-3 text-zinc-400">{p.winrate}%</td>
                                    <td className="px-4 py-3 text-zinc-500">{p.total}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {data.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        &lt;
                    </button>
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                        const n = start + i;
                        if (n > data.totalPages) return null;
                        return (
                            <button
                                key={n}
                                onClick={() => setPage(n)}
                                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                    n === page
                                        ? 'bg-brand-500 text-white'
                                        : 'border border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
                                }`}
                            >
                                {n}
                            </button>
                        );
                    })}
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
