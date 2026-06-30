import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GameHistory from './GameHistory';
import InventorySection from '@/components/perfil/InventorySection';

export const metadata = { title: 'Mi perfil' };

export default async function PerfilPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            username: true,
            email: true,
            elo: true,
            wins: true,
            losses: true,
            coins: true,
            createdAt: true,
        },
    });

    if (!user) redirect('/login');

    const total = user.wins + user.losses;
    const winrate = total > 0 ? Math.round((user.wins / total) * 100) : 0;

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 pt-28 pb-20">
                <h1 className="mb-8 text-3xl font-bold text-white">Mi perfil</h1>

                <div className="rounded-xl border border-white/10 bg-bg-card p-6">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
                            {user.username[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{user.username}</p>
                            <p className="text-sm text-zinc-500">{user.email}</p>
                            <p className="text-xs text-zinc-600">
                                Miembro desde {new Date(user.createdAt).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                        <StatCard label="ELO" value={user.elo} />
                        <StatCard label="Victorias" value={user.wins} />
                        <StatCard label="Derrotas" value={user.losses} />
                        <StatCard label="Winrate" value={`${winrate}%`} />
                        <StatCard
                            label="ShadowCoins"
                            value={
                                <span className="flex items-center justify-center gap-1 text-yellow-400">
                                    <img src="/img/icons/shadow_coin_icon.png" alt="" className="h-5" />
                                    {user.coins}
                                </span>
                            }
                        />
                    </div>
                </div>

                {total > 0 && <GameHistory userId={session.user.id} />}

                {total === 0 && (
                    <div className="mt-8 rounded-xl border border-zinc-800 bg-bg-card p-8 text-center">
                        <p className="text-lg font-semibold text-white">Aún no has jugado ninguna partida</p>
                        <p className="mt-1 text-sm text-zinc-500">
                            Conéctate al cliente de juego con tu Game ID para comenzar.
                        </p>
                    </div>
                )}

                <InventorySection />
            </main>
            <Footer />
        </>
    );
}

function StatCard({ label, value }: { label: string; value: number | string | React.ReactNode }) {
    return (
        <div className="rounded-lg border border-white/5 bg-bg-dark p-4 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-zinc-500">{label}</p>
        </div>
    );
}
