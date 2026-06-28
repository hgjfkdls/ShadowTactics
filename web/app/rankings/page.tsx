import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RankingsTable from './RankingsTable';

export const metadata = { title: 'Clasificación' };

export default async function RankingsPage() {
    const session = await auth();
    let currentUsername: string | null = null;
    if (session?.user?.id) {
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
        currentUsername = user?.username ?? null;
    }

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 pt-28 pb-20">
                <h1 className="mb-2 text-3xl font-bold text-white">Clasificación</h1>
                <p className="mb-8 text-zinc-500">
                    Ranking global de jugadores ordenado por ELO.
                </p>
                <RankingsTable currentUsername={currentUsername} />
            </main>
            <Footer />
        </>
    );
}
