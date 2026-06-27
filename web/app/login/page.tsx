import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
    title: 'Iniciar sesión',
};

export default function LoginPage() {
    return (
        <>
            <Navbar />
            <main className="flex min-h-screen items-center justify-center px-4 pt-16">
                <div className="w-full max-w-sm">
                    <h1 className="mb-2 text-3xl font-bold text-white">Iniciar sesión</h1>
                    <p className="mb-8 text-zinc-500">
                        Accede a tu cuenta para jugar y consultar tus estadísticas.
                    </p>
                    <LoginForm />
                </div>
            </main>
            <Footer />
        </>
    );
}
