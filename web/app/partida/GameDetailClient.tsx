'use client';

import { useState } from 'react';
import type { GameDetailData } from './[gameId]/page';
import { ClassStatsSection } from './ClassStatsSection';
import { IdentityStatsSection } from './IdentityStatsSection';
import { ActionLog } from './ActionLog';

type Tab = 'resumen' | 'classStats' | 'identityStats' | 'acciones';

const GAME_CLIENT_URL = process.env.NEXT_PUBLIC_GAME_CLIENT_URL ?? 'http://localhost:5173';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function scoreColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400';
    if (score >= 60) return 'bg-green-500/20 text-green-400';
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-400';
    if (score >= 20) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
}

type Props = {
    data: GameDetailData;
    gameId: string;
};

export function GameDetailClient({ data, gameId }: Props) {
    const [tab, setTab] = useState<Tab>('resumen');
    const { player1, player2, winnerId, winner, result, type, duration, totalTurns, createdAt, hasReplay, eloChanges, performances } = data;

    const myPerf = performances.find((p) => p.playerId === (data.isPlayer1 ? player1.id : player2.id));
    const oppPerf = performances.find((p) => p.playerId !== (data.isPlayer1 ? player1.id : player2.id));

    const tabs: { key: Tab; label: string }[] = [
        { key: 'resumen', label: 'Resumen' },
        { key: 'classStats', label: 'Por clase' },
        { key: 'identityStats', label: 'Por identidad' },
        { key: 'acciones', label: 'Registro de acciones' },
    ];

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-lg font-bold text-white">{player1.username}</div>
                            <div className="text-xs text-zinc-500">ELO {player1.elo}</div>
                        </div>
                        <div className="text-2xl font-bold text-zinc-600">VS</div>
                        <div className="text-left">
                            <div className="text-lg font-bold text-white">{player2.username}</div>
                            <div className="text-xs text-zinc-500">ELO {player2.elo}</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {result && (
                            <span className={`text-lg font-bold ${result === 'victoria' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {result === 'victoria' ? 'Victoria' : 'Derrota'}
                            </span>
                        )}
                        <span className="text-xs text-zinc-500">
                            {type === 'ranked' ? 'Competitiva' : 'Partida rápida'}
                            {' · '}{formatDuration(duration)}
                            {totalTurns ? ` · ${totalTurns} turnos` : ''}
                        </span>
                        <span className="text-xs text-zinc-600">{formatDate(createdAt)}</span>
                    </div>
                </div>

                {eloChanges && (
                    <div className="mt-4 flex gap-4 border-t border-white/5 pt-4">
                        <div className="text-sm">
                            <span className="text-zinc-500">{player1.username}: </span>
                            <span className={`font-semibold ${eloChanges[player1.id]?.diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {eloChanges[player1.id]?.diff >= 0 ? '+' : ''}{eloChanges[player1.id]?.diff ?? 0} ELO
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className="text-zinc-500">{player2.username}: </span>
                            <span className={`font-semibold ${eloChanges[player2.id]?.diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {eloChanges[player2.id]?.diff >= 0 ? '+' : ''}{eloChanges[player2.id]?.diff ?? 0} ELO
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50 p-1">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            tab === t.key
                                ? 'bg-brand-600 text-white'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'resumen' && (
                <div className="space-y-6">
                    {performances.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                            <h3 className="mb-4 text-lg font-bold text-white">Desempeño</h3>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <PerformanceCard perf={myPerf} label="Tu desempeño" won={result === 'victoria'} />
                                <PerformanceCard
                                    perf={oppPerf}
                                    label={`${oppPerf?.username ?? 'Rival'} — Desempeño`}
                                    won={oppPerf ? oppPerf.playerId === winnerId : false}
                                />
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                        <h3 className="mb-4 text-lg font-bold text-white">Información de la partida</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-zinc-500">ID:</span>
                                <span className="ml-2 font-mono text-xs text-zinc-300">{gameId}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Ganador:</span>
                                <span className="ml-2 text-white">{winner ?? '—'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Duración:</span>
                                <span className="ml-2 text-white">{formatDuration(duration)}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Turnos:</span>
                                <span className="ml-2 text-white">{totalTurns ?? '—'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Fecha:</span>
                                <span className="ml-2 text-white">{formatDate(createdAt)}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Modo:</span>
                                <span className="ml-2 text-white">{type === 'ranked' ? 'Competitiva' : 'Rápida'}</span>
                            </div>
                        </div>
                    </div>

                    {hasReplay && (
                        <div className="rounded-xl border border-brand-500/20 bg-brand-950/10 p-6 text-center">
                            <p className="mb-3 text-sm text-zinc-400">
                                Este replay se puede visualizar en el cliente de juego.
                            </p>
                            <a
                                href={`${GAME_CLIENT_URL}/replay/${gameId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                            >
                                Ver replay visual
                            </a>
                        </div>
                    )}
                </div>
            )}

            {tab === 'classStats' && <ClassStatsSection data={data} />}
            {tab === 'identityStats' && <IdentityStatsSection data={data} />}
            {tab === 'acciones' && <ActionLog gameId={gameId} />}
        </div>
    );
}

function PerformanceCard({
    perf,
    label,
    won,
}: {
    perf: { playerId: string; username: string; score: number; winBonus: number; hitRate: number; damageTradeRatio: number; survivalRate: number; killParticipation: number; counterEfficiency: number; cardsPlayedPerTurn: number; generalProtection: number; firstBlood: number; comeback: number } | undefined;
    label: string;
    won: boolean;
}) {
    if (!perf) return null;

    return (
        <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-4">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${scoreColor(perf.score)}`}>
                    {perf.score.toFixed(1)}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <MetricRow label="Bono victoria" value={won ? `+${perf.winBonus.toFixed(1)}` : '0'} />
                <MetricRow label="Precisión" value={`${(perf.hitRate * 100).toFixed(1)}%`} />
                <MetricRow label="Daño rec./inf." value={perf.damageTradeRatio.toFixed(2)} />
                <MetricRow label="Supervivencia" value={`${(perf.survivalRate * 100).toFixed(1)}%`} />
                <MetricRow label="Participación bajas" value={`${(perf.killParticipation * 100).toFixed(1)}%`} />
                <MetricRow label="Efic. contraataques" value={`${(perf.counterEfficiency * 100).toFixed(1)}%`} />
                <MetricRow label="Cartas por turno" value={perf.cardsPlayedPerTurn.toFixed(2)} />
                <MetricRow label="Protección general" value={`${(perf.generalProtection * 100).toFixed(1)}%`} />
                <MetricRow label="Primera sangre" value={`${(perf.firstBlood * 100).toFixed(1)}%`} />
                <MetricRow label="Remontada" value={`${(perf.comeback * 100).toFixed(1)}%`} />
            </div>
        </div>
    );
}

function MetricRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-2 text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="font-medium text-white">{value}</span>
        </div>
    );
}
