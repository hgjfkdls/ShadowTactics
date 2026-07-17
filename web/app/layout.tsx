import type { Metadata } from 'next';
import Provider from '@/components/Provider';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'Shadow Tactics — Juego de estrategia por turnos',
        template: '%s | Shadow Tactics',
    },
    description:
        'Shadow Tactics es un juego táctico por turnos con cartas de efecto, identidades únicas y combate estratégico. ¡Elimina al general enemigo!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className="dark">
            <body className="min-h-screen antialiased">
                <Provider>{children}</Provider>
            </body>
        </html>
    );
}
