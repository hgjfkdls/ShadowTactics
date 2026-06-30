'use client';

import { useEffect, useState, Fragment } from 'react';

type GameAction = {
    type: string;
    playerId?: string;
    cardId?: string;
    unitId?: string;
    targetId?: string;
    abilityId?: string;
    to?: { q: number; r: number };
    path?: { q: number; r: number }[];
    position?: { q: number; r: number };
    choice?: string;
    accept?: boolean;
};

type ActionRecord = {
    index: number;
    playerId: string;
    phase: string;
    turn: number;
    action: GameAction;
};

type GameHistoryEntry = {
    id: string;
    turn: number;
    actionNumber: number;
    playerId: string;
    type: 'attack' | 'move' | 'card' | 'ability' | 'phase';
    attackerId?: string;
    targetId?: string;
    die1?: number;
    die2?: number;
    total?: number;
    difficulty?: number;
    hit?: boolean;
    damage?: number;
    counterDamage?: number;
    attackerClass?: string;
    attackTargetClass?: string;
    targetKilled?: boolean;
    attackerKilled?: boolean;
    attackName?: string;
    modifiers?: string[];
    unitId?: string;
    unitClass?: string;
    from?: { q: number; r: number };
    to?: { q: number; r: number };
    cost?: number;
    cardId?: string;
    cardName?: string;
    cardType?: string;
    targetClass?: string;
    details?: string;
    healAmount?: number;
    // ability type
    abilityId?: string;
    abilityName?: string;
    sourceClass?: string;
    sourceIdentity?: string;
    paCost?: number;
    // phase type
    phaseName?: string;
};

type Players = Record<string, { username: string; identityId: string | null }>;

type Props = { gameId: string };

const IDENTITY_NAMES: Record<string, string> = {
    robin_hood: 'Robin Hood',
    francotirador: 'Francotirador',
    dios_trueno: 'Dios del Trueno',
    capitan_guardia: 'Capitán de la Guardia',
    espartano: 'Espartano',
    samurai: 'Samurái',
    monje_shaolin: 'Monje Shaolín',
    punta_lanza: 'Punta de Lanza',
    furia_tirano: 'Furia del Tirano',
    caballos_guerra: 'Caballos de Guerra',
    escudo_comandante: 'Escudo del Comandante',
    corazon_estratega: 'Corazón Estratega',
    inspiracion_real: 'Inspiración Real',
    defensor_reino: 'Defensor del Reino',
    guardia_real: 'Guardia Real',
};

const ABILITY_NAMES: Record<string, string> = {
    patada_acrobatica: 'Patada acrobática',
    fuego_cobertura: 'Fuego de cobertura',
    accion_evasiva: 'Acción evasiva',
    doble_ataque: 'Doble ataque',
    cabalgar: 'Cabalgar',
    cabalgar_2: 'Cabalgar',
    carga: 'Carga',
    ventaja_alcance: 'Ventaja de alcance',
    rayo_celestial: 'Rayo celestial',
    a_la_carga: 'A la carga',
    torbellino: 'Torbellino',
    meditacion: 'Meditación',
    posicion_estrategica: 'Posición estratégica',
    en_nombre_del_rey: 'En nombre del Rey',
    desenvainado_veloz: 'Desenvainado veloz',
    sacrificar: 'Sacrificar',
    angel_guardian: 'Ángel guardián',
    proteger: 'Proteger',
};

const CARD_NAMES: Record<string, string> = {
    movilidad: 'Movilidad',
    ataque_extra: 'Ataque extra',
    precision: 'Precisión',
    flechas_fuego: 'Flechas de fuego',
    inspiracion_tropa: 'Inspiración de tropa',
    bajar_moral: 'Bajar la moral',
    pantano: 'Pantano',
    mantenimiento: 'Mantenimiento de equipo',
    confusion: 'Confusión en la retaguardia',
    miedo: 'Miedo',
    panacea: 'Panacea',
    ladron: 'Ladrón',
    espejo: 'Espejo',
};

const CLASS_LABELS: Record<string, string> = {
    archer: 'Arquero',
    infantry: 'Infantería',
    cavalry: 'Caballería',
    lancer: 'Lanero',
    general: 'General',
};

const CLASS_ICONS: Record<string, string> = {
    archer: '🏹',
    infantry: '🛡️',
    cavalry: '🐴',
    lancer: '🔱',
    general: '⭐',
};

function unitName(action: GameAction, historyEntries: GameHistoryEntry[]): string {
    const cls = historyEntries.find(e => e.type === 'attack' || e.type === 'move')?.attackerClass
        ?? historyEntries.find(e => e.type === 'move')?.unitClass;
    if (cls && CLASS_LABELS[cls]) return `${CLASS_ICONS[cls] ?? ''} ${CLASS_LABELS[cls]}`;
    const raw = action.unitId ?? '';
    return raw.length > 6 ? raw.slice(0, 4) + '…' : raw;
}

function targetName(action: GameAction, historyEntries: GameHistoryEntry[]): string {
    const cls = historyEntries.find(e => e.type === 'attack')?.attackTargetClass;
    if (cls && CLASS_LABELS[cls]) return `${CLASS_ICONS[cls] ?? ''} ${CLASS_LABELS[cls]}`;
    const raw = action.targetId ?? '';
    return raw.length > 6 ? raw.slice(0, 4) + '…' : raw;
}

type InitialDeployment = {
    unitId: string;
    unitClass: string;
    playerId: string;
    q: number;
    r: number;
};

export function ActionLog({ gameId }: Props) {
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
    const [players, setPlayers] = useState<Players>({});
    const [playerMapping, setPlayerMapping] = useState<Record<string, string>>({});
    const [initialDeployments, setInitialDeployments] = useState<InitialDeployment[]>([]);
    const [diceResults, setDiceResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/games/replay?gameId=${gameId}`)
            .then((r) => {
                if (!r.ok) throw new Error('No disponible');
                return r.json();
            })
            .then((data) => {
                setActions(data.actions ?? []);
                setGameHistory(data.gameHistory ?? []);
                setPlayers(data.players ?? {});
                setPlayerMapping(data.playerMapping ?? {});
                setInitialDeployments(data.initialDeployments ?? []);
                setDiceResults(data.diceResults ?? []);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [gameId]);

    if (loading) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                <div className="animate-pulse space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-5 rounded bg-zinc-800/50" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
                <p className="text-sm text-zinc-500">Registro de acciones no disponible</p>
                <p className="text-xs text-zinc-600">{error}</p>
            </div>
        );
    }

    if (actions.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
                <p className="text-sm text-zinc-500">No hay acciones registradas</p>
            </div>
        );
    }

    const playerIds = Object.keys(players);
    const p1Id = playerIds[0] ?? '';
    const p2Id = playerIds[1] ?? '';
    const p1Username = players[p1Id]?.username ?? 'J1';
    const p2Username = players[p2Id]?.username ?? 'J2';

    function pStr(pid: string): string {
        const uuid = playerMapping[pid] ?? pid;
        return uuid === p1Id ? p1Username : uuid === p2Id ? p2Username : pid.slice(0, 6);
    }

    function playerBadge(pid: string) {
        const uuid = playerMapping[pid] ?? pid;
        const isP1 = uuid === p1Id;
        return (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold ${
                isP1 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
                {isP1 ? p1Username : p2Username}
            </span>
        );
    }

    let declaredTurns = 0;
    const seenTurns = new Set<number>();
    for (const rec of actions) {
        if (rec.turn && !seenTurns.has(rec.turn)) {
            seenTurns.add(rec.turn);
            declaredTurns++;
        }
    }

    // Build map: action index → turn number (from actual record turn field)
    const turnByIndex = new Map<number, number>();
    for (const rec of actions) {
        turnByIndex.set(rec.index, rec.turn ?? 1);
    }

    const lastPrepIndex = [...actions].reverse().findIndex(r => r.phase === 'preparation');
    const lastPrepIdx = lastPrepIndex >= 0 ? actions.length - 1 - lastPrepIndex : -1;

    function producesHistory(rec: ActionRecord): boolean {
        switch (rec.action.type) {
            case 'ATTACK_UNIT':
            case 'MOVE_UNIT':
            case 'USE_CARD':
            case 'USE_ABILITY':
            case 'IDENTITY_ABILITY':
                return true;
            case 'OCCUPY_POSITION':
                return rec.action.accept === true;
            default:
                return false;
        }
    }

    // Build map: action index → history entries (sequential by turn)
    const historyByAction = new Map<number, GameHistoryEntry[]>();
    let hi = 0;
    for (const rec of actions) {
        const turn = turnByIndex.get(rec.index) ?? 1;
        const entries: GameHistoryEntry[] = [];

        while (hi < gameHistory.length && gameHistory[hi].turn < turn) hi++;

        if (producesHistory(rec) && hi < gameHistory.length && gameHistory[hi].turn === turn) {
            entries.push(gameHistory[hi]);
            hi++;

            if (hi < gameHistory.length && gameHistory[hi].turn === turn) {
                const prev = entries[entries.length - 1];
                const curr = gameHistory[hi];
                if (prev.type === 'attack' && curr.type === 'attack' &&
                    (curr.attackName === 'Karma' || curr.targetKilled || curr.attackerKilled)) {
                    entries.push(curr);
                    hi++;
                }
            }
        }

        historyByAction.set(rec.index, entries);
    }

    return (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Registro de acciones</h3>
                <span className="text-xs text-zinc-600">{actions.length} acciones · {declaredTurns} turnos</span>
            </div>
            <div className="space-y-0.5">
                {actions.map((rec, i) => {
                    const historyEntries = historyByAction.get(rec.index) ?? [];
                    const turn = turnByIndex.get(rec.index) ?? 1;
                    const prevTurn = i > 0 ? turnByIndex.get(actions[i - 1].index) ?? 1 : turn;
                    const prevPhase = i > 0 ? actions[i - 1].phase : null;
                    const isFirstPrep = rec.phase === 'preparation' && prevPhase !== 'preparation';
                    const isLastPrep = rec.phase !== 'preparation' && prevPhase === 'preparation';
                    return (
                        <Fragment key={rec.index}>
                            {isFirstPrep && (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="h-px flex-1 bg-purple-700/50" />
                                    <span className="text-xs font-semibold text-purple-400">📦 Fase de despliegue</span>
                                    <div className="h-px flex-1 bg-purple-700/50" />
                                </div>
                            )}
                            {isLastPrep && (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="h-px flex-1 bg-brand-600/50" />
                                    <span className="text-xs font-semibold text-emerald-400">⚔️ Inicio del juego</span>
                                    <div className="h-px flex-1 bg-brand-600/50" />
                                </div>
                            )}
                            {turn !== prevTurn && (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="h-px flex-1 bg-zinc-700/50" />
                                    <span className="text-xs font-semibold text-zinc-500">Turno {turn}</span>
                                    <div className="h-px flex-1 bg-zinc-700/50" />
                                </div>
                            )}
                            <ActionRow
                                rec={rec}
                                historyEntries={historyEntries}
                                pStr={pStr}
                                playerBadge={playerBadge}
                                initialDeployments={initialDeployments}
                                diceResults={diceResults}
                            />
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
}

function ActionRow({
    rec,
    historyEntries,
    pStr,
    playerBadge,
    initialDeployments: deps,
    diceResults: dices,
}: {
    rec: ActionRecord;
    historyEntries: GameHistoryEntry[];
    pStr: (pid: string) => string;
    playerBadge: (pid: string) => React.ReactNode;
    initialDeployments: InitialDeployment[];
    diceResults: string[];
}) {
    const action = rec.action;

    return (
        <div className="group rounded px-3 py-1.5 text-sm transition-colors hover:bg-white/5">
            <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-xs">{iconFor(action)}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {playerBadge(rec.playerId)}
                        <span className="text-zinc-300">{actionSummary(action, pStr(rec.playerId), historyEntries, deps, dices)}</span>
                    </div>
                    {historyEntries.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                            {historyEntries.map((entry) => (
                                <HistoryDetail key={entry.id} entry={entry} />
                            ))}
                        </div>
                    )}
                </div>
                <span className="flex-shrink-0 text-xs text-zinc-600">#{rec.index}</span>
            </div>
        </div>
    );
}

function iconFor(action: GameAction): string {
    switch (action.type) {
        case 'SELECT_IDENTITY': return '🎭';
        case 'ROLL_DICE': return '🎲';
        case 'DEPLOY_UNIT': return '📦';
        case 'MOVE_UNIT': return '🚶';
        case 'ATTACK_UNIT': return '⚔️';
        case 'USE_ABILITY': return '⚡';
        case 'USE_CARD': return '🃏';
        case 'END_TURN': return '➡️';
        case 'SURRENDER': return '🏳️';
        case 'PASS_COUNTER': return '⏭️';
        case 'DISCARD_CARD': return '🗑️';
        case 'GAME_OVER': return '🏁';
        default: return '•';
    }
}

    function actionSummary(action: GameAction, p: string, history: GameHistoryEntry[], deps: InitialDeployment[], dices: string[]): string {
        switch (action.type) {
            case 'SELECT_IDENTITY':
                return `seleccionó ${IDENTITY_NAMES[action.cardId ?? ''] ?? action.cardId}`;
            case 'ROLL_DICE': {
                const diceInfo = dices.length > 0 ? ` — ${dices[0]}` : '';
                return `tiró los dados${diceInfo}`;
            }
            case 'DEPLOY_UNIT': {
                const dep = deps.find(d => d.unitId === action.unitId);
                const cls = dep?.unitClass ?? '';
                const pos = action.position ? `(${action.position.q},${action.position.r})` : '';
                const clsLabel = cls ? `${CLASS_ICONS[cls] ?? ''} ${CLASS_LABELS[cls] ?? cls}` : 'unidad';
                return `desplegó ${clsLabel} en ${pos}`;
            }
            case 'MOVE_UNIT': {
            const cls = history.find(e => e.type === 'move')?.unitClass;
            const name = cls ? CLASS_LABELS[cls] ?? cls : (action.unitId ?? '').slice(0, 4);
            return `movió ${name}`;
        }
        case 'ATTACK_UNIT': {
            const attClass = history.find(e => e.type === 'attack')?.attackerClass;
            const tgtClass = history.find(e => e.type === 'attack')?.attackTargetClass;
            const attacker = attClass ? CLASS_LABELS[attClass] ?? attClass : (action.unitId ?? '').slice(0, 4);
            const target = tgtClass ? CLASS_LABELS[tgtClass] ?? tgtClass : (action.targetId ?? '').slice(0, 4);
            return `atacó ${target} con ${attacker}`;
        }
        case 'USE_ABILITY':
            return `usó ${ABILITY_NAMES[action.abilityId ?? ''] ?? action.abilityId}${action.targetId ? ` en ${action.targetId}` : ''}`;
        case 'USE_CARD':
            return `jugó ${CARD_NAMES[action.cardId?.replace(/_\d+$/, '') ?? ''] ?? action.cardId}${action.targetId ? ` en ${action.targetId}` : ''}`;
        case 'PASS_COUNTER':
            return `pasó de contrajugar`;
        case 'DISCARD_CARD':
            return `descartó una carta`;
        case 'END_TURN':
            return `terminó su turno`;
        case 'SURRENDER':
            return `se rindió`;
        case 'GAME_OVER': {
            const reasonLabels: Record<string, string> = {
                general_killed: 'General eliminado',
                surrender: 'Rendición',
                disconnect: 'Desconexión',
            };
            return `fin de la partida — ${reasonLabels[(action as any).reason] ?? (action as any).reason ?? 'desconocida'}`;
        }
        case 'IDENTITY_ABILITY':
            return `usó habilidad de identidad en ${action.targetId ?? ''}`;
        case 'ESPARTANO_CHOICE':
            return `eligió ${action.choice === 'range' ? 'alcance' : 'defensa'} (Espartano)`;
        case 'COMANDANTE_CHOICE':
            return `eligió ${action.choice === 'attack' ? 'ataque' : 'defensa'} (Comandante)`;
        case 'OCCUPY_POSITION':
            return `${action.accept ? 'ocupó' : 'rechazó'} la posición`;
        default:
            return `${action.type}`;
    }
}

function HistoryDetail({ entry }: { entry: GameHistoryEntry }) {
    const clsIcon = (c: string) => CLASS_ICONS[c] ?? '';

    switch (entry.type) {
        case 'attack': {
            return (
                <div className="ml-4 space-y-0.5 border-l-2 border-red-500/30 pl-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                        <span className="text-zinc-400">
                            🎲 {entry.die1} + {entry.die2} = <strong className="text-white">{entry.total}</strong>
                            {' vs '} Dificultad <strong className="text-white">{entry.difficulty}</strong>
                        </span>
                        <span className={entry.hit ? 'text-emerald-400' : 'text-red-400'}>
                            {entry.hit ? '✅ Impacto' : '❌ Fallo'}
                        </span>
                    </div>
                    {entry.hit && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                            <span>💥 <strong className="text-white">{entry.damage}</strong> daño</span>
                            {entry.counterDamage != null && entry.counterDamage > 0 && (
                                <span>↩️ <strong className="text-yellow-400">{entry.counterDamage}</strong> contraataque</span>
                            )}
                            {entry.targetKilled && <span className="text-red-400">💀 Eliminado</span>}
                            {entry.attackerKilled && <span className="text-red-400">💀 Atacante eliminado</span>}
                            {entry.attackName && entry.attackName !== 'Ataque básico' && (
                                <span className="text-purple-400">[{entry.attackName}]</span>
                            )}
                        </div>
                    )}
                    {entry.modifiers && entry.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 text-xs text-zinc-500">
                            {entry.modifiers.map((m, i) => (
                                <span key={i} className="rounded bg-zinc-800/50 px-1.5 py-0.5">{m}</span>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        case 'move': {
            return (
                <div className="ml-4 border-l-2 border-blue-500/30 pl-3 text-xs text-zinc-400">
                    <span>{entry.from ? `(${entry.from.q},${entry.from.r})` : '?'} → {entry.to ? `(${entry.to.q},${entry.to.r})` : '?'}</span>
                    {entry.cost != null && <span className="ml-2 text-zinc-500">{entry.cost} PA</span>}
                    {entry.modifiers && entry.modifiers.length > 0 && (
                        <span className="ml-2 text-zinc-600">[{entry.modifiers.join(', ')}]</span>
                    )}
                </div>
            );
        }
        case 'card': {
            return (
                <div className="ml-4 border-l-2 border-emerald-500/30 pl-3 space-y-0.5">
                    <div className="flex flex-wrap gap-x-2 text-xs">
                        <span className="text-zinc-300">
                            {entry.cardName ?? entry.cardId}
                            {entry.cardType ? ` (${entry.cardType === 'BUFF' ? 'Mejora' : entry.cardType === 'DEBUFF' ? 'Debilitación' : 'Contra'})` : ''}
                        </span>
                        {entry.targetClass && (
                            <span className="text-zinc-500">→ {clsIcon(entry.targetClass)} {CLASS_LABELS[entry.targetClass] ?? entry.targetClass}</span>
                        )}
                        {entry.targetId && (
                            <span className="text-zinc-500">→ {entry.targetId}</span>
                        )}
                    </div>
                    {entry.details && (
                        <div className="text-xs text-zinc-500">{entry.details}</div>
                    )}
                    {entry.healAmount != null && (
                        <div className="text-xs text-emerald-400">+{entry.healAmount} HP</div>
                    )}
                </div>
            );
        }
        case 'ability': {
            return (
                <div className="ml-4 border-l-2 border-purple-500/30 pl-3 space-y-0.5">
                    <div className="flex flex-wrap gap-x-2 text-xs">
                        <span className="text-purple-300">
                            ⚡ {ABILITY_NAMES[entry.abilityId ?? ''] ?? entry.abilityName ?? entry.abilityId}
                        </span>
                        {entry.sourceClass && (
                            <span className="text-zinc-500">{clsIcon(entry.sourceClass)} {CLASS_LABELS[entry.sourceClass] ?? entry.sourceClass}</span>
                        )}
                        {entry.sourceIdentity && (
                            <span className="text-zinc-600">[{IDENTITY_NAMES[entry.sourceIdentity] ?? entry.sourceIdentity}]</span>
                        )}
                        {entry.targetId && (
                            <span className="text-zinc-500">→ {entry.targetId}</span>
                        )}
                        {entry.paCost != null && (
                            <span className="text-zinc-600">{entry.paCost} PA</span>
                        )}
                    </div>
                    {entry.hit != null && (
                        <div className="flex flex-wrap gap-x-3 text-xs">
                            {entry.die1 != null && entry.die2 != null && (
                                <span className="text-zinc-400">🎲 {entry.die1}+{entry.die2}={entry.total}</span>
                            )}
                            {entry.hit !== undefined && (
                                <span className={entry.hit ? 'text-emerald-400' : 'text-red-400'}>
                                    {entry.hit ? '✅ Impacto' : '❌ Fallo'}
                                </span>
                            )}
                            {entry.damage != null && entry.damage > 0 && (
                                <span className="text-zinc-400">💥 <strong className="text-white">{entry.damage}</strong> daño</span>
                            )}
                            {entry.targetKilled && <span className="text-red-400">💀 Eliminado</span>}
                        </div>
                    )}
                    {entry.details && (
                        <div className="text-xs text-zinc-500">{entry.details}</div>
                    )}
                    {entry.modifiers && entry.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 text-xs text-zinc-500">
                            {entry.modifiers.map((m, i) => (
                                <span key={i} className="rounded bg-zinc-800/50 px-1.5 py-0.5">{m}</span>
                            ))}
                        </div>
                    )}
                    {entry.healAmount != null && (
                        <div className="text-xs text-emerald-400">+{entry.healAmount} HP</div>
                    )}
                </div>
            );
        }
        case 'phase': {
            const phaseLabels: Record<string, string> = {
                turn_start: 'Inicio del turno',
                turn_end: 'Fin del turno',
                draw: 'Robó una carta',
                discard: 'Descartó una carta',
                identity_select: 'Seleccionó identidad',
                roll: 'Resultado de dados',
                game_start: 'Inicio de la partida',
            };
            return (
                <div className="ml-4 border-l-2 border-zinc-600/30 pl-3">
                    <div className="flex flex-wrap gap-x-2 text-xs text-zinc-500">
                        <span>{phaseLabels[entry.phaseName ?? ''] ?? entry.phaseName}</span>
                        {entry.details && <span className="text-zinc-600">{entry.details}</span>}
                    </div>
                </div>
            );
        }
        default:
            return null;
    }
}
