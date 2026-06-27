'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex items-center gap-3">
                <Link
                    href="/perfil"
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                    {session.user?.username ?? session.user?.email}
                </Link>
                <button
                    onClick={() => signOut()}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
                >
                    Cerrar sesión
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Link
                href="/login"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            >
                Iniciar sesión
            </Link>
            <Link
                href="/registro"
                className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
            >
                Registrarse
            </Link>
        </div>
    );
}
