'use client';

import { useEffect, useState, Fragment } from 'react';

type PerformanceData = {
    score: number;
    winBonus: number;
    hitRate: number;
    damageTradeRatio: number;
    survivalRate: number;
    killParticipation: number;
    counterEfficiency: number;
    cardsPlayedPerTurn: number;
    generalProtection: number;
    firstBlood: number;
    comeback: number;
};

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
    performance: PerformanceData | null;
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

function scoreColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400';
    if (score >= 60) return 'bg-green-500/20 text-green-400';
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-400';
    if (score >= 20) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
}

const perfLabels: Record<keyof PerformanceData, string> = {
    score: 'Puntuación',
    winBonus: 'Bono Victoria',
    hitRate: 'Precisión',
    damageTradeRatio: 'Daño recibido/infligido',
    survivalRate: 'Supervivencia',
    killParticipation: 'Participación bajas',
    counterEfficiency: 'Eficiencia contraataques',
    cardsPlayedPerTurn: 'Cartas por turno',
    generalProtection: 'Protección general',
    firstBlood: 'Primera sangre',
    comeback: 'Remontada',
};

function formatPct(v: number): string {
    return `${(v * 100).toFixed(1)}%`;
}

function PerformanceDetail({ perf, won }: { perf: PerformanceData; won: boolean }) {
    const entries: { key: keyof PerformanceData; label: string; value: string }[] = [
        { key: 'score', label: perfLabels.score, value: perf.score.toFixed(1) },
        { key: 'winBonus', label: perfLabels.winBonus, value: won ? `+${perf.winBonus.toFixed(1)}` : '0' },
        { key: 'hitRate', label: perfLabels.hitRate, value: formatPct(perf.hitRate) },
        { key: 'damageTradeRatio', label: perfLabels.damageTradeRatio, value: perf.damageTradeRatio.toFixed(2) },
        { key: 'survivalRate', label: perfLabels.survivalRate, value: formatPct(perf.survivalRate) },
        { key: 'killParticipation', label: perfLabels.killParticipation, value: formatPct(perf.killParticipation) },
        { key: 'counterEfficiency', label: perfLabels.counterEfficiency, value: formatPct(perf.counterEfficiency) },
        { key: 'cardsPlayedPerTurn', label: perfLabels.cardsPlayedPerTurn, value: perf.cardsPlayedPerTurn.toFixed(2) },
        { key: 'generalProtection', label: perfLabels.generalProtection, value: formatPct(perf.generalProtection) },
        { key: 'firstBlood', label: perfLabels.firstBlood, value: formatPct(perf.firstBlood) },
        { key: 'comeback', label: perfLabels.comeback, value: formatPct(perf.comeback) },
    ];

    return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
            {entries.map((e) => (
                <div key={e.key} className="flex justify-between gap-2 text-xs">
                    <span className="text-zinc-500">{e.label}</span>
                    <span className="font-medium text-white">{e.value}</span>
                </div>
            ))}
        </div>
    );
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
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
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
                                <th className="px-4 py-3 font-semibold text-zinc-300">Desempeño</th>
                                <th className="px-4 py-3 font-semibold text-zinc-300">Replay</th>
                                <th className="px-4 py-3 font-semibold text-zinc-300">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.games.map((g) => (
                                <Fragment key={g.id}>
                                    <tr className="border-t border-white/5 transition-colors hover:bg-white/5">
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
                                            {g.performance ? (
                                                <button
                                                    onClick={() => setExpandedRow(expandedRow === g.id ? null : g.id)}
                                                    className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${scoreColor(g.performance.score)}`}
                                                >
                                                    {g.performance.score.toFixed(0)}
                                                </button>
                                            ) : (
                                                <span className="text-zinc-600">—</span>
                                            )}
                                        </td>
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
                                    {expandedRow === g.id && g.performance && (
                                        <tr className="bg-bg-dark/50">
                                            <td colSpan={9} className="px-4 py-4">
                                                <PerformanceDetail perf={g.performance} won={g.result === 'victoria'} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
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
