'use client';

import type { GameDetailData } from './[gameId]/page';

type Props = { data: GameDetailData };

const IDENTITY_LABELS: Record<string, string> = {
    robin_hood: 'Robin Hood',
    francotirador: 'Francotirador',
    dios_trueno: 'Dios del Trueno',
    capitan_guardia: 'Capitán de la Guardia',
    espartano: 'Espartano',
    samurai: 'Samurái',
    monje_shaolin: 'Monje Shaolín',
    punta_lanza: 'Punta de Lanza',
    furia_tirano: 'Furia del Tirano',
    caballos_guerra: 'Caballos de Guerra',
    escudo_comandante: 'Escudo del Comandante',
    corazon_estratega: 'Corazón Estratega',
    inspiracion_real: 'Inspiración Real',
    defensor_reino: 'Defensor del Reino',
    guardia_real: 'Guardia Real',
};

export function IdentityStatsSection({ data }: Props) {
    const { player1, player2 } = data;
    const p1Stats = data.identityStats.filter((is) => is.playerId === player1.id);
    const p2Stats = data.identityStats.filter((is) => is.playerId === player2.id);

    return (
        <div className="space-y-6">
            <IdentityStatsTable title={player1.username} stats={p1Stats} />
            <IdentityStatsTable title={player2.username} stats={p2Stats} />
        </div>
    );
}

function IdentityStatsTable({ title, stats }: { title: string; stats: GameDetailData['identityStats'] }) {
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
                            <th className="px-3 py-2 font-semibold text-zinc-400">Identidad</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Victorioso</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Bajas</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Daño infligido</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Daño recibido</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Habilidades</th>
                            <th className="px-3 py-2 font-semibold text-zinc-400">Cartas jugadas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((is) => (
                            <tr key={`${is.playerId}-${is.identityId}`} className="border-b border-white/5 text-white transition-colors hover:bg-white/5">
                                <td className="px-3 py-2 font-medium">{IDENTITY_LABELS[is.identityId] ?? is.identityId}</td>
                                <td className="px-3 py-2">
                                    <span className={is.won ? 'text-emerald-400' : 'text-red-400'}>
                                        {is.won ? 'Sí' : 'No'}
                                    </span>
                                </td>
                                <td className="px-3 py-2">{is.kills}</td>
                                <td className="px-3 py-2">{is.damageDealt}</td>
                                <td className="px-3 py-2">{is.damageReceived}</td>
                                <td className="px-3 py-2">{is.abilityUses}</td>
                                <td className="px-3 py-2">{is.cardsPlayed}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
