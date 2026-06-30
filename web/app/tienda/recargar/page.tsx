import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RecargarContent from '@/components/tienda/RecargarContent';

export const metadata = { title: 'Recargar ShadowCoins' };

export default async function RecargarPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 pt-28 pb-20">
                <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold text-white">
                    <img src="/img/icons/shadow_coin_icon.png" alt="" className="h-16" />
                    Recargar ShadowCoins
                </h1>
                <p className="mb-8 text-zinc-500">
                    Adquiere ShadowCoins al instante para gastar en la tienda.
                </p>
                <RecargarContent />
            </main>
            <Footer />
        </>
    );
}
