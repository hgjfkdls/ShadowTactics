import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
    title: 'Registro',
};

export default function RegistroPage() {
    return (
        <>
            <Navbar />
            <main className="flex min-h-screen items-center justify-center px-4 pt-16">
                <div className="w-full max-w-sm">
                    <h1 className="mb-2 text-3xl font-bold text-white">Crear cuenta</h1>
                    <p className="mb-8 text-zinc-500">
                        Regístrate para jugar partidas competitivas y acceder a rankings.
                    </p>
                    <RegisterForm />
                </div>
            </main>
            <Footer />
        </>
    );
}
