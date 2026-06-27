import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function HomePage() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <FeaturesSection />
                <UnitsSection />
                <CTASection />
            </main>
            <Footer />
        </>
    );
}

function HeroSection() {
    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,40,204,0.15),transparent_70%)]" />
            <div className="relative z-10 mx-auto max-w-4xl text-center">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-400">
                    Juego táctico por turnos
                </p>
                <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-extrabold leading-tight text-transparent sm:text-6xl md:text-7xl">
                    Sombra, estrategia
                    <br />
                    y contrajuego
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
                    Shadow Tactics combina combate táctico por turnos, cartas de efecto e identidades únicas.
                    Despliega tu ejército, aplica modificadores y elimina al general enemigo.
                </p>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <Link
                        href="/registro"
                        className="rounded-xl bg-brand-500 px-8 py-3 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-400/30"
                    >
                        Jugar ahora
                    </Link>
                    <Link
                        href="/jugar"
                        className="rounded-xl border border-yellow-700/50 bg-yellow-950/20 px-8 py-3 text-base font-semibold text-yellow-400 transition-colors hover:bg-yellow-900/30"
                    >
                        ⚔️ Partida rápida
                    </Link>
                    <Link
                        href="/como-jugar"
                        className="rounded-xl border border-zinc-700 px-8 py-3 text-base font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                    >
                        Cómo jugar
                    </Link>
                </div>
            </div>
        </section>
    );
}

function FeaturesSection() {
    const features = [
        {
            title: '15 identidades',
            desc: 'Cada partida empieza eligiendo entre identidades únicas que modifican tu general y otorgan habilidades globales a tu ejército.',
            icon: '👑',
        },
        {
            title: '13 cartas de efecto',
            desc: 'Buff, debuff y counter. Juega cartas para potenciar tus unidades, sabotear al enemigo o contraatacar en su turno.',
            icon: '🃏',
        },
        {
            title: '5 clases de unidad',
            desc: 'Arquero, infantería, caballería, lancero y general. Cada clase con estadísticas y habilidades pasivas y activas únicas.',
            icon: '⚔️',
        },
        {
            title: 'Combate táctico',
            desc: 'Sistema de dificultad por distancia, modificadores, críticos, contraataques y cobertura. Cada decisión cuenta.',
            icon: '🎲',
        },
        {
            title: 'Despliegue estratégico',
            desc: 'Coloca tus 11 unidades en un tablero hexagonal. La posición inicial define tu estrategia para toda la partida.',
            icon: '🗺️',
        },
        {
            title: 'Multijugador 1v1',
            desc: 'Enfréntate a otro jugador en partidas por turnos. Salas privadas con amigos o matchmaking competitivo.',
            icon: '🎮',
        },
    ];

    return (
        <section id="caracteristicas" className="border-t border-white/5 px-4 py-24">
            <div className="mx-auto max-w-6xl">
                <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
                    Características del juego
                </h2>
                <p className="mx-auto mb-16 max-w-xl text-center text-zinc-500">
                    Todo lo que necesitas para dominar el arte de la estrategia por turnos.
                </p>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="group rounded-xl border border-white/5 bg-bg-card p-6 transition-colors hover:bg-bg-card-hover"
                        >
                            <span className="text-3xl">{f.icon}</span>
                            <h3 className="mb-2 mt-4 text-lg font-bold text-white">{f.title}</h3>
                            <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function UnitsSection() {
    const units = [
        { name: 'Arquero', hp: 12, atk: 3, range: 3, diff: 6, color: 'border-emerald-700', bg: 'bg-emerald-950/30' },
        { name: 'Infantería', hp: 16, atk: 2, range: 1, diff: 6, color: 'border-blue-700', bg: 'bg-blue-950/30' },
        { name: 'Caballería', hp: 14, atk: 3, range: 1, diff: 7, color: 'border-amber-700', bg: 'bg-amber-950/30' },
        { name: 'Lancero', hp: 14, atk: 3, range: 1, diff: 7, color: 'border-rose-700', bg: 'bg-rose-950/30' },
        { name: 'General', hp: 20, atk: 4, range: 1, diff: 6, color: 'border-purple-700', bg: 'bg-purple-950/30' },
    ];

    return (
        <section className="border-t border-white/5 px-4 py-24">
            <div className="mx-auto max-w-6xl">
                <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">Clases de unidad</h2>
                <p className="mx-auto mb-16 max-w-xl text-center text-zinc-500">
                    Cada clase tiene un rol distinto en el campo de batalla.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {units.map((u) => (
                        <div
                            key={u.name}
                            className={`rounded-xl border ${u.color} ${u.bg} p-5 text-center`}
                        >
                            <p className="mb-2 text-lg font-bold text-white">{u.name}</p>
                            <div className="space-y-1 text-sm text-zinc-400">
                                <p>❤️ HP {u.hp}</p>
                                <p>⚔️ ATQ {u.atk}</p>
                                <p>🎯 Rango {u.range}</p>
                                <p>📊 Dif. {u.diff}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CTASection() {
    return (
        <section className="border-t border-white/5 px-4 py-24">
            <div className="mx-auto max-w-3xl text-center">
                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-12">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                        ¿Listo para la batalla?
                    </h2>
                    <p className="mx-auto mt-4 max-w-lg text-zinc-400">
                    Shadow Tactics está en desarrollo. Pronto podrás registrarte, enfrentarte a otros jugadores
                        y subir en el ranking competitivo.
                    </p>
                    <Link
                        href="/como-jugar"
                        className="mt-8 inline-block rounded-xl bg-brand-500 px-8 py-3 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400"
                    >
                        Aprende las reglas
                    </Link>
                </div>
            </div>
        </section>
    );
}
