'use client';

import type { GameDetailData } from './[gameId]/page';

type Props = { data: GameDetailData };

const CLASS_LABELS: Record<string, string> = {
    archer: 'Arquero',
    infantry: 'Infantería',
    cavalry: 'Caballería',
    lancer: 'Lanero',
    general: 'General',
};

export function ClassStatsSection({ data }: Props) {
    const { player1, player2 } = data;
    const p1Stats = data.classStats.filter((cs) => cs.playerId === player1.id);
    const p2Stats = data.classStats.filter((cs) => cs.playerId === player2.id);

    return (
        <div className="space-y-6">
            <ClassStatsTable title={player1.username} stats={p1Stats} />
            <ClassStatsTable title={player2.username} stats={p2Stats} />
        </div>
    );
}

function ClassStatsTable({ title, stats }: { title: string; stats: GameDetailData['classStats'] }) {
    if (stats.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-zinc-500">Sin datos</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-left">
                            <th className="px-3 py-2 font-semibold text-zinc-400">Clase</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Unidades</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Bajas</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Daño infligido</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Daño recibido</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Ataques</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Precisión</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Críticos</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Movimientos</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Sobrevivió</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((cs) => {
                            const totalAttacks = cs.attacksMade;
                            const accuracy = totalAttacks > 0 ? ((cs.attacksHit / totalAttacks) * 100).toFixed(0) : '—';
                            return (
                                <tr key={`${cs.playerId}-${cs.unitClass}`} className="border-b border-white/5 text-white transition-colors hover:bg-white/5">
                                    <td className="px-3 py-2 font-medium">{CLASS_LABELS[cs.unitClass] ?? cs.unitClass}</td>
                                    <td className="px-3 py-2">{cs.count}</td>
                                    <td className="px-3 py-2">{cs.kills}</td>
                                    <td className="px-3 py-2">{cs.damageDealt}</td>
                                    <td className="px-3 py-2">{cs.damageReceived}</td>
                                    <td className="px-3 py-2">{cs.attacksMade}</td>
                                    <td className="px-3 py-2">{accuracy}{accuracy !== '—' ? '%' : ''}</td>
                                    <td className="px-3 py-2">{cs.criticalHits}</td>
                                    <td className="px-3 py-2">{cs.totalMoves}</td>
                                    <td className="px-3 py-2">
                                        <span className={cs.survived ? 'text-emerald-400' : 'text-red-400'}>
                                            {cs.survived ? 'Sí' : 'No'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
