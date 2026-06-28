'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Tab = 'identidades' | 'unidades' | 'efecto';

export default function CartasPage() {
    const [tab, setTab] = useState<Tab>('identidades');

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'identidades', label: 'Identidades', icon: '👑' },
        { key: 'unidades', label: 'Unidades', icon: '⚔️' },
        { key: 'efecto', label: 'Cartas de Efecto', icon: '🃏' },
    ];

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 pt-28 pb-20">
                <h1 className="mb-2 text-4xl font-bold text-white">Cartas</h1>
                <p className="mb-8 text-zinc-500">
                    Todas las cartas de identidad, clases de unidad y cartas de efecto de Shadow Tactics.
                </p>

                <div className="mb-10 flex gap-2 border-b border-white/10">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors ${
                                tab === t.key
                                    ? 'border-b-2 border-brand-400 text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <span>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'identidades' && <IdentidadesTab />}
                {tab === 'unidades' && <UnidadesTab />}
                {tab === 'efecto' && <EfectoTab />}
            </main>
            <Footer />
        </>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-6 text-2xl font-bold text-white">{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="mb-3 mt-8 text-lg font-bold text-white">{children}</h3>;
}

// ─── IDENTIDADES ─────────────────────────────────────────────────

function IdentidadesTab() {
    return (
        <div>
            <SectionTitle>Cartas de Identidad</SectionTitle>
            <p className="mb-8 text-zinc-500">
                Hay 15 cartas de identidad. Durante la fase de preparación, cada jugador roba 3,
                selecciona 1 y devuelve 2 al mazo. Ambos revelan su carta simultáneamente.
                La carta de identidad dicta las habilidades del <strong className="text-white">General</strong> y
                aplica bonificaciones <strong className="text-white">Globales</strong> a todo tu ejército.
            </p>

            {identityGroups.map((group) => (
                <div key={group.class} className="mb-12">
                    <SubTitle>{group.class}</SubTitle>
                    <div className="grid gap-5 sm:grid-cols-2">
                        {group.items.map((id) => (
                            <IdentityCard key={id.name} identity={id} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CardModal({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={onClose}
        >
            <img
                src={src}
                alt="Carta"
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

function IdentityCard({ identity }: { identity: IdentityData }) {
    const borderColor =
        identity.classLabel === 'Arquero' ? 'border-emerald-700'
            : identity.classLabel === 'Infantería' ? 'border-blue-700'
            : identity.classLabel === 'Caballería' ? 'border-amber-700'
            : identity.classLabel === 'Lancero' ? 'border-rose-700'
            : 'border-purple-700';

    const [modalImg, setModalImg] = useState<string | null>(null);

    return (
        <>
            <div className={`rounded-xl border ${borderColor}/40 bg-bg-card p-5 flex gap-5`}>
                {identity.image && (
                    <button onClick={() => setModalImg(identity.image!)} className="shrink-0 self-start">
                        <img
                            src={identity.image}
                            alt={identity.name}
                            className="w-28 rounded-lg object-cover shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                        />
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-start justify-between">
                        <div>
                            <p className="text-lg font-bold text-white">{identity.name}</p>
                            <span className="text-xs text-zinc-500">{identity.classLabel}</span>
                        </div>
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-zinc-400 italic">
                        {identity.lore}
                    </p>
                    <div className="space-y-3 text-sm">
                        <div className="rounded-lg border-l-4 border-emerald-600 bg-bg-dark/50 pl-3 py-2">
                            <span className="font-semibold text-emerald-400">Especial</span>
                            <p className="mt-0.5 text-zinc-400">{identity.special}</p>
                        </div>
                        <div className="rounded-lg border-l-4 border-amber-600 bg-bg-dark/50 pl-3 py-2">
                            <span className="font-semibold text-amber-400">Global</span>
                            <p className="mt-0.5 text-zinc-400">{identity.global}</p>
                        </div>
                        <div className="rounded-lg bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
                            💡 {identity.strategy}
                        </div>
                    </div>
                </div>
            </div>
            {modalImg && <CardModal src={modalImg} onClose={() => setModalImg(null)} />}
        </>
    );
}

// ─── UNIDADES ─────────────────────────────────────────────────────

function UnidadesTab() {
    return (
        <div>
            <SectionTitle>Clases de Unidad</SectionTitle>
            <p className="mb-8 text-zinc-500">
                Cada jugador despliega 11 unidades de hasta 5 clases distintas. Máximo 3 unidades por clase
                y exactamente 1 general por bando.
            </p>

            <div className="space-y-10">
                {unitDetails.map((u) => (
                    <UnitDetail key={u.name} unit={u} />
                ))}
            </div>
        </div>
    );
}

function UnitDetail({ unit }: { unit: UnitDetailData }) {
    const [modalImg, setModalImg] = useState<string | null>(null);

    const borderColor =
        unit.name === 'Arquero' ? 'border-emerald-700'
            : unit.name === 'Infantería' ? 'border-blue-700'
            : unit.name === 'Caballería' ? 'border-amber-700'
            : unit.name === 'Lancero' ? 'border-rose-700'
            : 'border-purple-700';

    return (
        <>
            <section className={`rounded-xl border ${borderColor}/40 bg-bg-card p-6 flex gap-6`}>
                {unit.image && (
                    <button onClick={() => setModalImg(unit.image!)} className="shrink-0 self-start">
                        <img
                            src={unit.image}
                            alt={unit.name}
                            className="w-36 rounded-lg object-cover shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                        />
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <div className="mb-4 flex items-center gap-3">
                        {/* <span className="text-2xl">{unit.icon}</span> */}
                        {unit.token && (
                            <img src={unit.token} alt={`${unit.name} token`} className="h-20 object-contain" />
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-white">{unit.name}</h3>
                            <p className="text-sm text-zinc-500">{unit.role}</p>
                        </div>
                    </div>

                    <p className="mb-5 text-sm leading-relaxed text-zinc-400">{unit.description}</p>

                    <div className="mb-5 overflow-hidden rounded-lg border border-white/10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-bg-dark">
                                    {unit.stats.headers.map((h) => (
                                        <th key={h} className="px-3 py-2 text-left font-semibold text-zinc-300">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-white/5">
                                    {unit.stats.values.map((v, i) => (
                                        <td key={i} className="px-3 py-2 text-zinc-400">{v}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3">
                        {unit.abilities.map((a) => (
                            <div key={a.name} className="rounded-lg border border-white/5 bg-bg-dark/50 p-3">
                                <p className="text-sm font-semibold text-white">
                                    {a.name}
                                    {a.cost && <span className="ml-2 text-xs text-zinc-500">({a.cost})</span>}
                                </p>
                                <p className="mt-0.5 text-sm text-zinc-400">{a.description}</p>
                                {a.restriction && (
                                    <p className="mt-1 text-xs italic text-zinc-500">⚠ {a.restriction}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {modalImg && <CardModal src={modalImg} onClose={() => setModalImg(null)} />}
        </>
    );
}

// ─── CARTAS DE EFECTO ─────────────────────────────────────────────

function EfectoTab() {
    return (
        <div>
            <SectionTitle>Cartas de Efecto</SectionTitle>
            <p className="mb-8 text-zinc-500">
                52 cartas (13 tipos × 4 copias). Mazo barajado al inicio con Fisher-Yates.
                Las cartas se juegan desde la mano durante la fase MAIN (máximo 3 cartas en mano).
                Las cartas BUFF y DEBUFF pueden ser contrarrestadas con COUNTER.
            </p>

            <div className="mb-10">
                <SubTitle>🟢 BUFF — juega en tu turno</SubTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                    {effectBuffs.map((c) => (
                        <EffectCard key={c.name} card={c} accent="border-emerald-700/50 bg-emerald-950/10" />
                    ))}
                </div>
            </div>

            <div className="mb-10">
                <SubTitle>🔴 DEBUFF — juega en tu turno, afecta al rival</SubTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                    {effectDebuffs.map((c) => (
                        <EffectCard key={c.name} card={c} accent="border-red-700/50 bg-red-950/10" />
                    ))}
                </div>
            </div>

            <div>
                <SubTitle>🟡 COUNTER — juega en el turno del rival</SubTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                    {effectCounters.map((c) => (
                        <EffectCard key={c.name} card={c} accent="border-amber-700/50 bg-amber-950/10" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function EffectCard({ card, accent }: { card: EffectCardData; accent: string }) {
    const [modalImg, setModalImg] = useState<string | null>(null);
    return (
        <>
            <div className={`rounded-xl border ${accent} p-4 flex gap-4`}>
                {card.image && (
                    <button onClick={() => setModalImg(card.image!)} className="shrink-0 self-start">
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-20 rounded-lg object-cover shadow transition-transform hover:scale-[1.02] cursor-pointer"
                        />
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <p className="mb-2 text-base font-bold text-white">{card.name}</p>
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-400">{card.type}</span>
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-400">{card.target}</span>
                        {card.application && (
                            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-400">{card.application}</span>
                        )}
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-400">{card.effect}</p>
                </div>
            </div>
            {modalImg && <CardModal src={modalImg} onClose={() => setModalImg(null)} />}
        </>
    );
}

// ─── DATA ─────────────────────────────────────────────────────────

type IdentityData = {
    name: string;
    classLabel: string;
    image: string;
    lore: string;
    special: string;
    global: string;
    strategy: string;
};

type IdentityGroup = {
    class: string;
    items: IdentityData[];
};

const identityGroups: IdentityGroup[] = [
    {
        class: '🎯 Arqueros (2 cartas)',
        items: [
            {
                name: 'Robin Hood', classLabel: 'Arquero', image: '/img/identidades/robin_hood.png',
                lore: 'Forajido de Sherwood, roba a los ricos para dar a los pobres. Arquero certero y defensor del pueblo.',
                special: 'En la mira (Pasiva) — Al comienzo de cada turno, elige una unidad enemiga e inflige 1 de daño sin coste. No puedes elegir al general enemigo.',
                global: 'Robar a los ricos (Pasiva) — Tus arqueros tienen coste movimiento 1 y pierden Acción evasiva. El primer arquero que acierta un ataque cada turno recupera 1 HP.',
                strategy: 'Desgaste constante con daño gratuito cada turno. Arqueros móviles que se curan solos.',
            },
            {
                name: 'Francotirador del Bosque', classLabel: 'Arquero', image: '/img/identidades/francotirador_del_bosque.png',
                lore: 'Cazador solitario. Una flecha, un muerto. Nadie ve de dónde vino el disparo.',
                special: 'Francotirador (Pasiva) — Tu General tiene +1 rango de habilidades de arquero.',
                global: 'Tiro a distancia (Pasiva) — Tus arqueros obtienen +1 de rango para ataques básicos. Mejora Blanco fácil: -2 dificultad si el objetivo no se movió (en lugar de -1).',
                strategy: 'Potencia la ofensiva de tus arqueros con rango y precisión, pero necesitas unidades de primera línea que protejan la retaguardia.',
            },
        ],
    },
    {
        class: '🛡️ Infantería (2 cartas)',
        items: [
            {
                name: 'Dios del Trueno', classLabel: 'Infantería', image: '/img/identidades/dios_del_trueno.png',
                lore: 'Thor, el dios nórdico del trueno. Su martillo forja tormentas y bendice a los suyos con rayos divinos.',
                special: 'Rayo celestial (coste 1) — Elige un aliado a rango ≤2 que realice ataques cuerpo a cuerpo: su siguiente ataque hace +3 de daño. Cada vez que usas esta habilidad, el daño se reduce en 1 (+3/+2/+1).',
                global: 'Furia berserker (Pasiva) — El General y tus unidades de infantería hacen +1 de daño mientras tengan 50% o menos de HP.',
                strategy: 'Infantería ofensiva que se vuelve más letal cuanto más daño recibe. Usa Rayo celestial para asegurar bajas clave.',
            },
            {
                name: 'Capitán de la Guardia', classLabel: 'Infantería', image: '/img/identidades/capitan_de_la_guardia.png',
                lore: 'Veterano de mil batallas, lidera desde el frente. No pide a nadie lo que él no haría primero.',
                special: 'Contraataque (Pasiva) — Una vez por turno del enemigo, si tu General recibe un ataque melee, inflige +1 de daño al atacante.',
                global: 'Liderar a las tropas (Pasiva) — Si el General o una unidad de infantería a rango ≤2 del General elimina a un enemigo, todas tus unidades de infantería y el General activan Presión en el siguiente turno.',
                strategy: 'General de primera línea que castiga a quien lo ataca y motiva a toda la infantería cuando consiguen bajas.',
            },
        ],
    },
    {
        class: '🐎 Caballería (2 cartas)',
        items: [
            {
                name: 'Caballos de Guerra', classLabel: 'Caballería', image: '/img/identidades/caballos_de_guerra.png',
                lore: 'Caballería pesada de choque. Galopar, impactar y romper la línea. No hay formación que resista una carga bien ejecutada.',
                special: 'A la carga (coste progresivo: +0/+1/+2/+3) — Tu General puede avanzar 3 casillas (en lugar de 2) cuando usa Cabalgar hacia un enemigo. Cada activación aumenta su coste en 1 PA.',
                global: 'Maniobras acrobáticas (Pasiva) — La caballería puede ignorar línea recta al Cabalgar. Carga debe respetar línea recta desde la última casilla avanzada.',
                strategy: 'Caballería de choque con alto impacto inicial. La maniobrabilidad extra permite posicionar cargas devastadoras.',
            },
            {
                name: 'Cazadores', classLabel: 'Caballería', image: '/img/identidades/cazadores.png',
                lore: 'Jinetes nómadas que rastrean a sus presas como lobos. Atacan al débil, al aislado, al que huye.',
                special: 'Acechar (Pasiva) — Tu General hace +2 de daño al atacar una unidad que no tenga aliados adyacentes. Contra el General enemigo, el bono es +1.',
                global: 'Hostigar (Pasiva) — Tus unidades de caballería tienen -1 dificultad al atacar a un enemigo con 50% de HP o menos.',
                strategy: 'Caballería táctica que busca unidades aisladas o débiles. Flanqueo y remate constante.',
            },
        ],
    },
    {
        class: '🗡️ Lanceros (2 cartas)',
        items: [
            {
                name: 'Punta de Lanza', classLabel: 'Lancero', image: '/img/identidades/punta_de_lanza.png',
                lore: 'La vanguardia del ejército. Su lanza es la primera en impactar y la última en retirarse.',
                special: 'Torbellino (coste 3) — El General puede girar su lanza una vez por turno. Inflige 2 de daño a todos los enemigos adyacentes y 1 de daño a los aliados adyacentes. Ignora cualquier habilidad defensiva.',
                global: 'Proyección (Pasiva) — 1 vez por turno, cuando un lancero acierta un ataque cuerpo a cuerpo, hace 1 de daño a las 2 casillas detrás del objetivo (en línea recta desde el atacante).',
                strategy: 'Bomba de área que arrasa formaciones cerradas. Proyección castiga a los que se reagrupan detrás del objetivo.',
            },
            {
                name: 'Espartano', classLabel: 'Lancero', image: '/img/identidades/espartano.png',
                lore: 'Guerrero de Esparta. Su escudo protege a su hermano. Su lanza alcanza al enemigo. La falange nunca retrocede.',
                special: 'Lanza y escudo (Pasiva) — Una vez por turno, elige: +1 de rango, o recibes -1 de daño hasta tu siguiente turno.',
                global: 'Muro espartano (Pasiva) — Tus lanceros adyacentes entre sí reciben -1 de daño.',
                strategy: 'Control y defensa. La falange protege mientras el General decide entre alcanzar al enemigo o resistir el contraataque.',
            },
        ],
    },
    {
        class: '⚜️ General (7 cartas)',
        items: [
            {
                name: 'Monje Shaolin', classLabel: 'General', image: '/img/identidades/monje_shaolin.png',
                lore: 'Monje del templo Shaolin. Años de disciplina forjan su cuerpo como arma. Mente en calma, puño de hierro.',
                special: 'Meditación (coste variable) — Si no realizaste ninguna acción ofensiva el turno anterior, tu General gana Resistencia (-1 de daño la primera vez que recibe daño). Durante tu turno, paga 1 PA por cada HP que quieras curar (sin límite).',
                global: 'Karma (Pasiva) — Cuando una unidad aliada es eliminada, la unidad que la eliminó recibe 1 de daño.',
                strategy: 'General defensivo que desgasta al rival. Curarte consume PA pero te mantiene vivo. Karma castiga al agresor por cada baja.',
            },
            {
                name: 'Corazón de Estratega', classLabel: 'General', image: '/img/identidades/corazon_de_estratega.png',
                lore: 'Mente maestra del campo de batalla. Mueve sus piezas con precisión y saca ventaja de cada formación.',
                special: 'Posición estratégica (Pasiva) — Una vez por turno, tu General puede moverse 1 casilla sin coste de PA. La casilla destino debe estar adyacente a un aliado.',
                global: 'Formaciones tácticas (Pasiva) — Línea (3+ aliados adyacentes en línea recta): todos reciben -1 de daño. Triángulo (3 aliados adyacentes en grupo cerrado): todos hacen +1 de daño.',
                strategy: 'El General se reposiciona gratis para mantener las formaciones activas. Coordina tus unidades para maximizar los bonos.',
            },
            {
                name: 'Comandante Supremo', classLabel: 'General', image: '/img/identidades/comandante_supremo.png',
                lore: 'General veterano que ha dirigido innumerables batallas. Su experiencia le permite leer el campo como nadie.',
                special: 'Voz de mando (Pasiva) — La primera vez que mueves a tu General en tu turno, puedes mover a una unidad aliada 1 casilla sin coste de PA. Esa unidad recibe el doble del efecto de Plan de batalla.',
                global: 'Plan de batalla (Pasiva) — Al inicio de tu turno, elige: Avanzar (+1 daño al primer ataque de cada unidad) o Reagruparse (-1 daño la primera vez que cada unidad es atacada).',
                strategy: 'General táctico que se adapta cada turno. Voz de mando permite reposicionar aliados y potenciarlos.',
            },
            {
                name: 'Inspiración Real', classLabel: 'General', image: '/img/identidades/inspiracion_real.png',
                lore: 'La realeza en el campo de batalla. No es el más fuerte, pero su presencia convierte a hombres comunes en héroes.',
                special: 'En nombre del rey (coste 2) — Elige un aliado a rango ≤2. Hasta tu siguiente turno, ese aliado tiene ataque 5 y un escudo de 3 HP. El General no puede atacar este turno.',
                global: 'Guardia real (Pasiva) — Unidades adyacentes al General tienen +1 de ataque y -1 de daño recibido. Al atacar o recibir daño, pierden ambas bonificaciones.',
                strategy: 'Potencia a una unidad clave convirtiéndola en una amenaza mayor. Guarda la Guardia real para el momento justo.',
            },
            {
                name: 'Furia del Tirano', classLabel: 'General', image: '/img/identidades/furia_del_tirano.png',
                lore: 'General tirano que ve a su ejército como herramientas. No duda en sacrificarlos si eso le acerca a la victoria.',
                special: 'Sacrificar (coste 1) — Elige un aliado adyacente: recibe 2 de daño y el General recupera 3 HP. Si el aliado muere, el General recupera 5 HP.',
                global: 'Terror (Pasiva) — Cuando un aliado elimina a un enemigo con un ataque cuerpo a cuerpo, los enemigos adyacentes tienen +1 de dificultad en su siguiente ataque.',
                strategy: 'General egoísta que se cura a costa de sus tropas. Terror intimida a los enemigos cuando consigues bajas cuerpo a cuerpo.',
            },
            {
                name: 'Samurái', classLabel: 'General', image: '/img/identidades/samurai.png',
                lore: 'Guerrero de élite, forjado por años de disciplina. Su katana es precisa, su espíritu inquebrantable.',
                special: 'Desenvainado veloz (coste 1) — El siguiente ataque de tu General tiene -1 de dificultad. Si acierta, el objetivo no puede moverse en su siguiente turno (puede atacar).',
                global: 'Camino del guerrero (Pasiva) — Cuando un aliado elimina a un enemigo con un ataque cuerpo a cuerpo, recuperas 1 PA (1 vez por turno).',
                strategy: 'General que inmoviliza enemigos clave mientras su ejército genera PA extra con cada baja cuerpo a cuerpo.',
            },
            {
                name: 'Escudo del Comandante', classLabel: 'General', image: '/img/identidades/escudo_del_comandante.png',
                lore: 'Protector nato. Su misión no es vencer al enemigo, sino asegurarse de que todos los suyos vuelvan a casa.',
                special: 'Ángel Guardián (coste 2) — Todos tus aliados reciben un escudo de 2 HP hasta tu siguiente turno.',
                global: 'Proteger (Pasiva) — Una vez por turno, protege a un aliado a rango ≤3: recibe -1 de daño de todas las fuentes hasta tu siguiente turno. Si no eliges, el General se protege a sí mismo.',
                strategy: 'General defensivo que mantiene a su ejército con vida. Ángel Guardián en el momento crítico, Proteger para salvar unidades clave.',
            },
        ],
    },
];

// ─── DATOS DE UNIDADES ────────────────────────────────────────────

type UnitAbility = {
    name: string;
    cost?: string;
    description: string;
    restriction?: string;
};

type UnitDetailData = {
    name: string;
    icon: string;
    role: string;
    image?: string;
    token?: string;
    description: string;
    stats: { headers: string[]; values: string[] };
    abilities: UnitAbility[];
};

const unitDetails: UnitDetailData[] = [
    {
        name: 'Arquero',
        icon: '🏹',
        image: '/img/unidades/arquero.png', token: '/img/fichas/ficha_arquero.png',
        role: 'Unidad de rango. Control y daño a distancia.',
        description: 'El arquero es un maestro del combate a distancia, siempre atento al movimiento de sus enemigos. Su precisión y rapidez le permiten ralentizar a los adversarios y mantenerlos bajo control, mientras se mantiene fuera del alcance de los ataques más peligrosos.',
        stats: { headers: ['HP', 'Ataque', 'Dificultad', 'Coste Mov.', 'Rango'], values: ['8', '3', '6 + distancia', '2 PA', '4'] },
        abilities: [
            { name: 'Blanco fácil', cost: 'Pasiva', description: 'Si el objetivo no se movió el turno anterior, -1 dificultad.' },
            { name: 'Disparo rápido', cost: 'coste 1', description: 'Si el enemigo está a 2 o menos de distancia, puedes realizar un segundo ataque con dificultad +1.' },
            { name: 'Fuego de cobertura', cost: 'coste 2', description: 'Si el ataque impacta, el objetivo tendrá coste +1 en su próximo turno (máx 2 acciones).' },
            { name: 'Acción evasiva', cost: 'coste 1', description: 'Si hay enemigos adyacentes al inicio del turno, esta habilidad reemplaza al primer movimiento.', restriction: 'Cada arquero puede usar Fuego de cobertura 1 vez por turno. El efecto no se acumula.' },
        ],
    },
    {
        name: 'Caballería',
        icon: '🐎',
        image: '/img/unidades/caballeria.png', token: '/img/fichas/ficha_caballeria.png',
        role: 'Alta movilidad y ataque de impacto.',
        description: 'Especialistas en velocidad y ataque de impacto. Su bajo coste de movimiento les permite recorrer el campo rápidamente, romper formaciones enemigas y golpear con fuerza concentrada.',
        stats: { headers: ['HP', 'Ataque', 'Dificultad', 'Coste Mov.', 'Rango'], values: ['10', '4', '7', '1 PA', '1'] },
        abilities: [
            { name: 'Romper filas', cost: 'Pasiva', description: 'Ignora Resistencia y Línea defensiva (habilidades de infantería).' },
            { name: 'Doble ataque', cost: 'coste 1', description: 'Realiza un segundo ataque contra el mismo objetivo con -1 de daño.' },
            { name: 'Cabalgar', cost: 'coste 1', description: '1 vez por turno puedes mover 2 casillas en línea recta. Reemplaza el movimiento normal.' },
            { name: 'Carga', cost: 'coste 1', description: 'Luego de Cabalgar, realiza un ataque con -1 dificultad y +1 daño a un objetivo en la misma línea recta.', restriction: 'Si usa Carga, no puede volver a atacar este turno.' },
        ],
    },
    {
        name: 'Lancero',
        icon: '🗡️',
        image: '/img/unidades/lanceros.png', token: '/img/fichas/ficha_lancero.png',
        role: 'Anti-caballería. Defensa y control.',
        description: 'Defensores expertos contra la caballería, equilibran ofensiva y resistencia. Mantienen la línea, controlan el avance enemigo y pueden hostigar unidades fuertes mientras protegen a sus aliados de cargas devastadoras.',
        stats: { headers: ['HP', 'Ataque', 'Dificultad', 'Coste Mov.', 'Rango'], values: ['10', '4', '7', '1 PA', '1'] },
        abilities: [
            { name: 'Anti-caballería', cost: 'Pasiva', description: 'Al atacar unidades de caballería, +2 de daño.' },
            { name: 'Formación defensiva', cost: 'Pasiva', description: 'Al ser atacado con Carga, anula el bono de dificultad del atacante. Si el lancero gana, el atacante recibe +1 daño.' },
            { name: 'Doble ataque', cost: 'coste 1', description: 'Realiza un segundo ataque contra el mismo objetivo con -1 de daño.' },
            { name: 'Ventaja de alcance', cost: 'coste 1', description: 'Una vez por turno, uno de tus ataques tiene +1 rango.', restriction: 'Solo puede usarse en el primer ataque. Si usas Ventaja de alcance, no puedes usar Doble ataque el mismo turno.' },
        ],
    },
    {
        name: 'Infantería',
        icon: '🛡️',
        image: '/img/unidades/Infanteria.png', token: '/img/fichas/ficha_infanteria.png',
        role: 'Tanque. Primera línea y resistencia.',
        description: 'Pilar del frente, resistente y constante. Su función es absorber daño, mantener la formación y presionar a los enemigos con ataques sostenidos, asegurando que la línea se mantenga firme incluso bajo presión intensa.',
        stats: { headers: ['HP', 'Ataque', 'Dificultad', 'Coste Mov.', 'Rango'], values: ['12', '3', '6', '1 PA', '1'] },
        abilities: [
            { name: 'Resistencia', cost: 'Pasiva', description: 'La primera vez que recibes daño en un turno, -1 de daño.' },
            { name: 'Línea defensiva', cost: 'Pasiva', description: 'Si no te moviste en tu turno anterior, -1 de daño este turno. No se acumula con Resistencia.' },
            { name: 'Presión', cost: 'Pasiva', description: 'Si esta unidad ataca al mismo objetivo que atacó el turno anterior, +1 de daño.' },
            { name: 'Avance', cost: 'coste 1', description: 'Si elimina a un enemigo, puede ocupar su posición sin romper Línea defensiva.' },
        ],
    },
    {
        name: 'General',
        icon: '👑',
        image: '/img/unidades/general.png', token: '/img/fichas/ficha_general.png',
        role: 'Unidad más poderosa. Si muere, pierdes la partida.',
        description: 'El General comanda tu ejército. Sus estadísticas base pueden modificarse según la carta de identidad seleccionada. Protegerlo es la clave de la victoria.',
        stats: { headers: ['HP', 'Ataque', 'Dificultad', 'Coste Mov.', 'Rango'], values: ['15', '5', '6', '1 PA', '1'] },
        abilities: [
            { name: 'Carta de identidad', cost: '1 vez tras despliegue', description: 'Roba 3 cartas de identidad y escoge 1. Se revela cuando ambos jugadores han seleccionado. Otorga habilidades Especiales y Globales.' },
        ],
    },
];

// ─── DATOS DE CARTAS DE EFECTO ────────────────────────────────────

type EffectCardData = {
    name: string;
    type: string;
    target: string;
    image?: string;
    application?: string;
    effect: string;
};

const effectBuffs: EffectCardData[] = [
    {
        name: 'Movilidad', type: 'BUFF', target: 'Jugador', image: '/img/efectos/movilidad.png', application: 'Acumulativa',
        effect: 'El primer movimiento de cualquier unidad cuesta 0 PA. Se consume al moverse. Expira al terminar el turno.',
    },
    {
        name: 'Ataque extra', type: 'BUFF', target: 'Una unidad aliada', image: '/img/efectos/ataque_extra.png', application: 'Cargas',
        effect: 'La unidad puede atacar de nuevo aunque ya haya atacado. El ataque es gratis, hace +1 de daño y tiene +2 de dificultad. Acumulable (varias copias = varios ataques extra).',
    },
    {
        name: 'Precisión', type: 'BUFF', target: 'Una unidad aliada', image: '/img/efectos/precision.png', application: 'Cargas',
        effect: '-2 dificultad al siguiente ataque básico de la unidad. Se consume al atacar (acierte o no). Acumulable.',
    },
    {
        name: 'Flechas de fuego', type: 'BUFF', target: 'Jugador', image: '/img/efectos/flechas_de_fuego.png', application: 'Acumulativa + Cargas',
        effect: 'El siguiente ataque hace +1 de daño. Si acierta, el objetivo recibe 1 de daño al inicio de cada uno de los 2 siguientes turnos del atacante (DoT). Total potencial: +3 de daño extra.',
    },
    {
        name: 'Inspiración de tropa', type: 'BUFF', target: 'Jugador', image: '/img/efectos/inspiracion_de_tropa.png', application: 'Instantánea',
        effect: '+1 PA inmediato. No deja modificadores persistentes. No se puede usar si tu General fue atacado el turno anterior.',
    },
];

const effectDebuffs: EffectCardData[] = [
    {
        name: 'Bajar la moral', type: 'DEBUFF', target: 'Jugador rival', image: '/img/efectos/bajar_la_moral.png', application: 'Acumulativa',
        effect: 'El rival empieza su próximo turno con -1 PA.',
    },
    {
        name: 'Pantano', type: 'DEBUFF', target: 'Jugador rival', image: '/img/efectos/pantano.png', application: 'Acumulativa',
        effect: 'El primer movimiento del oponente cuesta el doble de PA. Se consume al moverse. Expira al terminar el turno.',
    },
    {
        name: 'Mantenimiento de equipo', type: 'DEBUFF', target: 'Jugador rival', image: '/img/efectos/mantenimiento_de_equipo.png', application: 'Acumulativa',
        effect: 'El primer ataque del oponente hace -1 de daño. Se consume al atacar (acierte o no). Expira al terminar el turno.',
    },
    {
        name: 'Confusión en la retaguardia', type: 'DEBUFF', target: 'Una unidad enemiga', image: '/img/efectos/confusion_en_la_retaguardia.png', application: 'Acumulativa',
        effect: 'La unidad no puede moverse ni atacar en su próximo turno. La unidad objetivo no puede cambiarse. No se acumula (si ya tiene Confusión activa, la nueva se rechaza).',
    },
    {
        name: 'Miedo', type: 'DEBUFF', target: 'Jugador rival', image: '/img/efectos/miedo.png', application: 'Acumulativa',
        effect: 'El primer ataque del oponente cuesta +1 PA. Se consume al atacar. Expira al terminar el turno.',
    },
];

const effectCounters: EffectCardData[] = [
    {
        name: 'Panacea', type: 'COUNTER', target: 'Jugador', image: '/img/efectos/panacea.png', application: 'Instantánea',
        effect: 'Elimina todos los modificadores activos que te afectan (debuffs). Válida solo contra DEBUFF. Se descartan ambas cartas y vuelves a MAIN.',
    },
    {
        name: 'Ladrón', type: 'COUNTER', target: 'Jugador', image: '/img/efectos/ladron.png', application: 'Instantánea',
        effect: 'Roba la carta de efecto pendiente del rival y la añade a tu mano. La carta original se descarta sin efecto. Válida contra BUFF y DEBUFF.',
    },
    {
        name: 'Espejo', type: 'COUNTER', target: 'Jugador rival', image: '/img/efectos/espejo.png', application: 'Instantánea',
        effect: 'Refleja el DEBUFF pendiente al rival que lo jugó. Válido solo contra DEBUFF.',
    },
];
