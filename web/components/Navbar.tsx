'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AuthButton from './AuthButton';

const publicLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/como-jugar', label: 'Cómo jugar' },
    { href: '/cartas', label: 'Cartas' },
    { href: '/rankings', label: 'Rankings' },
];

const authLinks = [
    { href: '/tienda', label: 'Tienda' },
    { href: '/tienda/recargar', label: 'Recargar' },
    { href: '/jugar', label: 'Jugar' },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const { data: session } = useSession();
    const links = session ? [...publicLinks, ...authLinks] : publicLinks;

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-bg-dark/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="text-xl font-bold tracking-tight text-white">
                    Shadow<span className="text-brand-400">Tactics</span>
                </Link>

                <div className="hidden items-center gap-6 md:flex">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="text-sm text-zinc-400 transition-colors hover:text-white"
                        >
                            {l.label}
                        </Link>
                    ))}
                    <AuthButton />
                </div>

                <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menú">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {open ? (
                            <path d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {open && (
                <div className="border-t border-white/10 bg-bg-dark px-4 pb-4 md:hidden">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="block py-2 text-sm text-zinc-400"
                            onClick={() => setOpen(false)}
                        >
                            {l.label}
                        </Link>
                    ))}
                    <div className="mt-2">
                        <AuthButton />
                    </div>
                </div>
            )}
        </nav>
    );
}
