import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-bg-dark py-12">
            <div className="mx-auto max-w-6xl px-4">
                <div className="grid gap-8 md:grid-cols-3">
                    <div>
                        <p className="text-lg font-bold text-white">
                            Shadow<span className="text-brand-400">Tactics</span>
                        </p>
                        <p className="mt-2 text-sm text-zinc-500">
                            Un juego táctico por turnos con cartas, identidades y combate estratégico.
                        </p>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-zinc-400">Enlaces</p>
                        <div className="flex flex-col gap-1">
                            <Link href="/" className="text-sm text-zinc-600 transition-colors hover:text-white">
                                Inicio
                            </Link>
                            <Link href="/como-jugar" className="text-sm text-zinc-600 transition-colors hover:text-white">
                                Cómo jugar
                            </Link>
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-zinc-400">Próximamente</p>
                        <ul className="space-y-1 text-sm text-zinc-600">
                            <li>Tienda de cosméticos</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-zinc-700">
                    Shadow Tactics &copy; {new Date().getFullYear()}
                </div>
            </div>
        </footer>
    );
}
