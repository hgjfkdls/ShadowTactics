import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Cómo jugar',
};

export default function ComoJugarPage() {
    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 pt-28 pb-20">
                <h1 className="mb-2 text-4xl font-bold text-white">Cómo jugar</h1>
                <p className="mb-12 text-zinc-500">
                    Todo lo que necesitas saber para comenzar tu primera partida de Shadow Tactics.
                </p>

                <div className="space-y-16">
                    <Section title="1. Objetivo del juego">
                        <p>
                            Shadow Tactics es un juego táctico por turnos para dos jugadores. Cada jugador
                            comanda un ejército de 11 unidades con el objetivo de <strong>eliminar al general enemigo</strong>.
                        </p>
                        <p>
                            El juego combina combate por turnos en un tablero hexagonal, cartas de efecto con
                            habilidades únicas, e identidades que modifican las reglas de cada partida.
                        </p>
                    </Section>

                    <Section title="2. Fase de preparación">
                        <p>Antes de la batalla, ambos jugadores pasan por tres subfases:</p>

                        <h3 className="mb-2 mt-6 font-bold text-white">2.1. Selección de identidad</h3>
                        <p>
                            Cada jugador recibe 3 cartas de identidad al azar y elige 1. Las identidades determinan
                            la clase del general (arquero, infantería, caballería, lancero o general puro) y otorgan
                            habilidades globales a todo tu ejército. Hay 15 identidades únicas.
                        </p>

                        <h3 className="mb-2 mt-6 font-bold text-white">2.2. Tirada de dados</h3>
                        <p>
                            Ambos jugadores tiran 2d6. Quien obtenga la suma más alta es el <strong>jugador activo</strong>
                            (P1) y decide quién despliega primero. El jugador activo mueve primero en el primer turno.
                        </p>

                        <h3 className="mb-2 mt-6 font-bold text-white">2.3. Despliegue</h3>
                        <p>
                            Los jugadores colocan sus 11 unidades en el tablero hexagonal alternando turnos:
                            P2 coloca 1, P1 coloca 2, y así sucesivamente hasta completar 11 unidades cada uno.
                            La primera unidad de cada jugador debe colocarse a distancia 2 del centro del tablero;
                            las siguientes, a distancia 2 de cualquier aliado ya desplegado.
                        </p>
                    </Section>

                    <Section title="3. Clases de unidad">
                        <p>Cada jugador despliega 11 unidades de hasta 5 clases distintas:</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {unitClasses.map((u) => (
                                <div key={u.name} className="rounded-lg border border-white/10 bg-bg-card p-4">
                                    <p className="font-bold text-white">{u.name}</p>
                                    <p className="mb-2 text-sm text-zinc-500">{u.desc}</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
                                        <span>HP: {u.hp}</span>
                                        <span>Ataque: {u.atk}</span>
                                        <span>Rango: {u.range}</span>
                                        <span>Movimiento: {u.move} PA</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="4. Estructura del turno">
                        <p>Cada turno se divide en 3 subfases:</p>

                        <div className="mt-4 space-y-4">
                            <div className="rounded-lg border-l-4 border-sky-500 bg-bg-card p-4">
                                <p className="font-bold text-white">DRAW</p>
                                <p className="text-sm text-zinc-400">
                                    Automática. Robas 1 carta del mazo (máximo 3 en mano). Si tienes más de 3,
                                    debes descartar hasta quedarte con 3. Recibes 5 PA (puntos de acción).
                                    Los modificadores activos se procesan al inicio de tu turno.
                                </p>
                            </div>

                            <div className="rounded-lg border-l-4 border-emerald-500 bg-bg-card p-4">
                                <p className="font-bold text-white">MAIN</p>
                                <p className="text-sm text-zinc-400">
                                    Fase principal. Puedes mover unidades (coste PA según clase), atacar (1 PA),
                                    usar habilidades activas (coste variable) y jugar cartas BUFF o DEBUFF (0 PA).
                                    El PA no usado se reduce a la mitad (redondeado hacia abajo) y pasa al
                                    siguiente turno. Máximo 8 PA.
                                </p>
                            </div>

                            <div className="rounded-lg border-l-4 border-amber-500 bg-bg-card p-4">
                                <p className="font-bold text-white">COUNTER</p>
                                <p className="text-sm text-zinc-400">
                                    Subfase opcional. Cuando juegas una carta BUFF o DEBUFF, tu rival puede
                                    responder con una carta COUNTER (Ladrón, Espejo o Panacea) o pasar.
                                    Esta es la única acción que puede hacer fuera de su turno.
                                </p>
                            </div>
                        </div>
                    </Section>

                    <Section title="5. Combate">
                        <p>Cuando atacas a una unidad enemiga, el combate se resuelve así:</p>

                        <ol className="list-decimal space-y-3 pl-5 text-zinc-400">
                            <li>
                                <strong className="text-white">Calcular dificultad:</strong> El atacante tiene una
                                dificultad base (6 para la mayoría, 7 para caballería/lancero). Los arqueros
                                suman la distancia al objetivo (5 + distancia con Francotirador). Se aplican
                                modificadores de habilidades y cartas.
                            </li>
                            <li>
                                <strong className="text-white">Tirada de 2d6:</strong> El atacante lanza dos dados
                                de 6 caras.
                            </li>
                            <li>
                                <strong className="text-white">Resultado:</strong>
                                <ul className="mt-1 list-disc pl-5 space-y-1">
                                    <li><strong className="text-emerald-400">Acierto</strong> (2d6 &ge; dificultad): aplicas el daño de ataque + modificadores.</li>
                                    <li><strong className="text-yellow-400">Crítico</strong> (2d6 &ge; 11): +2 daño adicional.</li>
                                    <li><strong className="text-red-400">Fallo</strong> (2d6 &lt; dificultad): el defensor contraataca infligiendo 2 de daño al atacante.</li>
                                </ul>
                            </li>
                        </ol>
                    </Section>

                    <Section title="6. Cartas de efecto">
                        <p className="mb-4">
                            Hay 13 cartas de efecto diferentes, divididas en 3 categorías. Cada carta tiene 4 copias
                            en el mazo (52 cartas en total).
                        </p>

                        <h3 className="mb-3 font-bold text-emerald-400">BUFF — juega en tu turno</h3>
                        <CardsTable cards={buffs} />

                        <h3 className="mb-3 mt-8 font-bold text-red-400">DEBUFF — juega en tu turno, afecta al rival</h3>
                        <CardsTable cards={debuffs} />

                        <h3 className="mb-3 mt-8 font-bold text-amber-400">COUNTER — juega en el turno del rival</h3>
                        <CardsTable cards={counters} />
                    </Section>

                    <Section title="7. Identidades">
                        <p className="mb-4">
                            Cada identidad tiene una habilidad <strong>Especial</strong> (usable por el general)
                            y una <strong>Global</strong> (afecta a todo tu ejército).
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {identities.map((id) => (
                                <div key={id.name} className="rounded-lg border border-white/10 bg-bg-card p-4">
                                    <p className="font-bold text-white">
                                        {id.name}
                                        <span className="ml-2 text-xs font-normal text-zinc-500">({id.class})</span>
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        <span className="text-emerald-400">Especial:</span> {id.special}
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        <span className="text-amber-400">Global:</span> {id.global}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="8. Fin del juego">
                        <p>
                            La partida termina cuando el <strong>general</strong> de uno de los jugadores es eliminado.
                            Ese jugador pierde inmediatamente. También se puede perder por <strong>rendición</strong>
                            o por <strong>desconexión</strong> (60 segundos de espera).
                        </p>
                    </Section>
                </div>
            </main>
            <Footer />
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
            <div className="space-y-3 leading-relaxed text-zinc-400">{children}</div>
        </section>
    );
}

function CardsTable({ cards }: { cards: { name: string; effect: string }[] }) {
    return (
        <div className="overflow-hidden rounded-lg border border-white/10">
            {cards.map((c, i) => (
                <div key={c.name} className={`flex gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-bg-card' : 'bg-bg-dark'}`}>
                    <span className="w-36 shrink-0 font-semibold text-white">{c.name}</span>
                    <span className="text-sm text-zinc-400">{c.effect}</span>
                </div>
            ))}
        </div>
    );
}

const unitClasses = [
    { name: 'Arquero', desc: 'Unidad de rango. Ataca a distancia. Vulnerable en cuerpo a cuerpo.', hp: 8, atk: 3, range: 4, move: 2 },
    { name: 'Infantería', desc: 'Tanque. Alta vida y defensa. Ideal para primera línea.', hp: 12, atk: 3, range: 1, move: 1 },
    { name: 'Caballería', desc: 'Alta movilidad y ataque. Ignora defensas con Romper filas.', hp: 10, atk: 4, range: 1, move: 1 },
    { name: 'Lancero', desc: 'Anti-caballería. Formación defensiva. Bueno protegiendo el flanco.', hp: 10, atk: 4, range: 1, move: 1 },
    { name: 'General', desc: 'Unidad más poderosa. Si muere, pierdes la partida.', hp: 15, atk: 5, range: 1, move: 1 },
];

const buffs = [
    { name: 'Movilidad', effect: 'La primera unidad que muevas este turno gasta 0 PA. Se consume al moverse.' },
    { name: 'Ataque extra', effect: 'Una unidad puede atacar de nuevo (incluso si ya atacó). Ataque gratis con +1 daño y +2 dificultad.' },
    { name: 'Precisión', effect: 'El siguiente ataque básico tiene -2 de dificultad. Se consume al atacar (acierto o fallo).' },
    { name: 'Flechas de fuego', effect: 'El próximo ataque hace +1 de daño. Al acertar, el objetivo recibe 1 de daño durante 2 turnos del atacante (DoT). Total: +3 de daño extra.' },
    { name: 'Inspiración de tropa', effect: 'Ganas +1 PA al instante. No se puede usar si tu general fue atacado el turno anterior.' },
];

const debuffs = [
    { name: 'Bajar la moral', effect: 'El rival empieza su próximo turno con -1 PA.' },
    { name: 'Pantano', effect: 'El primer movimiento del rival cuesta el doble de PA. Se consume al moverse.' },
    { name: 'Mantenimiento de equipo', effect: 'El primer ataque del rival hace -1 de daño. Se consume al atacar.' },
    { name: 'Confusión en la retaguardia', effect: 'Una unidad enemiga no puede moverse ni atacar en su próximo turno. No apila.' },
    { name: 'Miedo', effect: 'El primer ataque del rival cuesta +1 PA. Se consume al atacar.' },
];

const counters = [
    { name: 'Ladrón', effect: 'Roba la carta de efecto pendiente del rival y la añade a tu mano. Válido contra BUFF y DEBUFF.' },
    { name: 'Espejo', effect: 'Refleja el DEBUFF de vuelta al rival que lo jugó. Válido solo contra DEBUFF.' },
    { name: 'Panacea', effect: 'Elimina todos los debuffs activos que te afectan. Válido solo contra DEBUFF.' },
];

const identities = [
    { name: 'Robin Hood', class: 'Arquero', special: '1 vez por turno, inflige 1 de daño gratis a un enemigo (no al general rival).', global: 'Arqueros mueven por 1 PA. Pierden Acción evasiva. El primer arquero que acierta cada turno cura 1 HP.' },
    { name: 'Francotirador del Bosque', class: 'Arquero', special: 'El general es arquero. +1 rango en Fuego de cobertura.', global: 'Arqueros tienen +1 rango en ataques básicos. Blanco fácil reduce -2 de dificultad.' },
    { name: 'Dios del Trueno', class: 'Infantería', special: 'Bendice a un aliado: +3/+2/+1 de daño según usos restantes (empieza en 3).', global: 'Infantería y general hacen +1 de daño si tienen ≤50% de HP.' },
    { name: 'Capitán de la Guardia', class: 'Infantería', special: 'Contraataca con +1 de daño si el general es atacado en rango 1 (1 vez por enemigo por turno).', global: 'Cuando infantería o general elimina a un enemigo, toda la infantería obtiene Presión el siguiente turno.' },
    { name: 'Caballos de Guerra', class: 'Caballería', special: 'El general es caballería. Cabalgar avanza hasta 3 hexes. Coste progresivo +0/+1/+2.', global: 'La caballería ignora la línea recta al usar Cabalgar.' },
    { name: 'Cazadores', class: 'Caballería', special: 'El general es caballería. +2 de daño contra enemigos aislados (+1 contra el general rival).', global: 'Caballería tiene -1 de dificultad contra enemigos con ≤50% de HP.' },
    { name: 'Punta de Lanza', class: 'Lancero', special: 'Torbellino (coste 3): 2 de daño a todos los enemigos adyacentes. Si falla, 1 de daño a todos excepto el general.', global: '1 vez por turno, un lancero que acierta un ataque cuerpo a cuerpo hace +1 de daño a 2 hex detrás del objetivo.' },
    { name: 'Espartano', class: 'Lancero', special: 'Cada turno elige: +1 de rango o -1 de daño recibido hasta tu próximo turno.', global: 'Lanceros adyacentes al general reciben -1 de daño.' },
    { name: 'Monje Shaolin', class: 'General', special: 'Si no realizaste acciones ofensivas el turno anterior, obtienes Resistencia. Puedes pagar 1 PA para curar 1 HP.', global: 'Karma: cuando un aliado muere, el asesino recibe 1 de daño.' },
    { name: 'Corazón de Estratega', class: 'General', special: '1 vez por turno, el general se mueve 1 hex gratis a un hex adyacente a un aliado.', global: 'Formación en línea: -1 de daño recibido. Formación en triángulo: +1 de daño infligido.' },
    { name: 'Comandante Supremo', class: 'General', special: 'La primera vez que el general se mueve, puedes mover un aliado 1 hex gratis.', global: 'Cada turno elige: Avanzar (+1 de daño al primer ataque) o Reagruparse (-1 de daño al recibir el primer golpe).' },
    { name: 'Inspiración Real', class: 'General', special: 'Coste 2. Un aliado a rango ≤2 obtiene ATK 5 y un escudo de 3 HP. El general no puede atacar este turno.', global: 'Unidades adyacentes al general tienen +1 de ataque y -1 de daño recibido hasta que ataquen o reciban daño.' },
    { name: 'Furia del Tirano', class: 'General', special: 'Coste 1. Sacrifica un aliado adyacente: recibe 2 de daño, el general cura 3 (5 si el aliado muere).', global: 'Terror: cuando un aliado mata en combate cuerpo a cuerpo, los enemigos adyacentes tienen +1 de dificultad en su próximo ataque.' },
    { name: 'Samurái', class: 'General', special: 'Coste 1. Próximo ataque -1 de dificultad. Al acertar, el objetivo no puede moverse el próximo turno.', global: 'Camino del Guerrero: cuando un aliado mata en combate cuerpo a cuerpo, recuperas 1 PA.' },
    { name: 'Escudo del Comandante', class: 'General', special: 'Coste 2. Todos los aliados obtienen un escudo de 2 HP hasta tu próximo turno.', global: 'Proteger aliado (rango ≤3): -1 de daño de todas las fuentes hasta tu próximo turno.' },
];
