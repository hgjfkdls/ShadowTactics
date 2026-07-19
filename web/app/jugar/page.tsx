'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type GameMode = 'quickplay' | 'ranked' | 'invite';
type SearchStatus = 'idle' | 'searching' | 'matched' | 'timeout' | 'error';

export default function JugarPage() {
    const { data: session } = useSession();
    const [mode, setMode] = useState<GameMode | null>(null);

    if (!session) {
        return (
            <>
                <Navbar />
                <main className="flex min-h-screen items-center justify-center px-4 pt-16">
                    <div className="text-center">
                        <h1 className="mb-4 text-3xl font-bold text-white">Jugar</h1>
                        <p className="mb-6 text-zinc-500">Debes iniciar sesión para jugar.</p>
                        <a href="/login" className="rounded-xl bg-brand-500 px-6 py-2 font-semibold text-white">
                            Iniciar sesión
                        </a>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (!mode) {
        return <ModeSelector onSelect={setMode} />;
    }

    if (mode === 'invite') {
        return <InviteMode onBack={() => setMode(null)} />;
    }

    return <QueueMode mode={mode} onBack={() => setMode(null)} />;
}

function ModeSelector({ onSelect }: { onSelect: (m: GameMode) => void }) {
    const { data: session } = useSession();
    const [pendingInvites, setPendingInvites] = useState<{ id: string; inviterName: string }[]>([]);

    useEffect(() => {
        if (!session?.user?.id) return;

        const check = () => {
            fetch('/api/matchmaking/invites')
                .then((r) => r.json())
                .then((data) => setPendingInvites(data.invites ?? []))
                .catch(() => {});
        };

        check();
        const interval = setInterval(check, 3000);
        return () => clearInterval(interval);
    }, [session?.user?.id]);

    function handleAccept(inviteId: string) {
        fetch('/api/matchmaking/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteId }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.status === 'accepted' && session?.user?.id) {
                    const params = new URLSearchParams({ userId: session.user.id, matchType: 'quickplay' });
                    window.location.href = `http://localhost:5173/game/${data.gameId}?${params}`;
                }
            })
            .catch(() => {});
    }

    const modes: { key: GameMode; title: string; desc: string; icon: string; accent: string }[] = [
        { key: 'quickplay', title: 'Partida rápida', desc: 'Sin afectar tu ELO. Enfréntate a quien sea.', icon: '⚔️', accent: 'border-yellow-700/50 bg-yellow-950/20 text-yellow-400' },
        { key: 'ranked', title: 'Ranked', desc: 'Compite por ELO y sube en el ranking.', icon: '🏆', accent: 'border-brand-500/50 bg-brand-950/20 text-brand-400' },
        { key: 'invite', title: 'Invitar amigo', desc: 'Crea una sala privada para jugar con un amigo.', icon: '👤', accent: 'border-emerald-700/50 bg-emerald-950/20 text-emerald-400' },
    ];

    return (
        <>
            <Navbar />
            <main className="flex min-h-screen items-center justify-center px-4 pt-16">
                <div className="w-full max-w-lg text-center">
                    <h1 className="mb-2 text-3xl font-bold text-white">Elige un modo de juego</h1>
                    <p className="mb-8 text-zinc-500">
                        ¿Qué tipo de partida quieres jugar?
                    </p>

                    {pendingInvites.length > 0 && (
                        <div className="mb-8 space-y-3">
                            {pendingInvites.map((inv) => (
                                <div key={inv.id} className="rounded-xl border border-brand-500/30 bg-brand-950/20 p-4">
                                    <p className="mb-2 text-sm text-white">
                                        <span className="font-semibold">{inv.inviterName}</span> te ha invitado a una partida
                                    </p>
                                    <button
                                        onClick={() => handleAccept(inv.id)}
                                        className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
                                    >
                                        Aceptar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-4">
                        {modes.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => onSelect(m.key)}
                                className={`w-full rounded-xl border p-5 text-left transition-all hover:scale-[1.02] ${m.accent}`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{m.icon}</span>
                                    <div>
                                        <p className="text-lg font-bold">{m.title}</p>
                                        <p className="mt-0.5 text-sm opacity-70">{m.desc}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-10 border-t border-zinc-800 pt-8">
                        <h2 className="mb-4 text-lg font-bold text-white">Practicar contra la IA</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                { id: 'cpu_facil', label: 'Facil', color: 'border-emerald-700/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40' },
                                { id: 'cpu_medio', label: 'Medio', color: 'border-emerald-700/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40' },
                                { id: 'cpu_dificil', label: 'Dificil', color: 'border-orange-700/50 bg-orange-950/20 text-orange-400 hover:bg-orange-950/40' },
                                { id: 'general_mares', label: 'Gral. Mares', color: 'border-violet-700/50 bg-violet-950/20 text-violet-400 hover:bg-violet-950/40' },
                                { id: 'el_gran_general', label: 'Gran Gral.', color: 'border-amber-700/50 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40' },
                            ] as const).map((ai) => (
                                <button
                                    key={ai.id}
                                    onClick={() => {
                                        const params = new URLSearchParams({ ai: ai.id });
                                        window.location.href = `http://localhost:5173/?${params}`;
                                    }}
                                    className={`rounded-xl border p-4 text-center transition-all hover:scale-[1.02] ${ai.color}`}
                                >
                                    <p className="text-lg font-bold">VS {ai.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

function QueueMode({ mode, onBack }: { mode: 'quickplay' | 'ranked'; onBack: () => void }) {
    const [status, setStatus] = useState<SearchStatus>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [queueLength, setQueueLength] = useState(0);
    const [matchedGameId, setMatchedGameId] = useState<string | null>(null);
    const [matchedOpponent, setMatchedOpponent] = useState<{ username: string; elo: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const title = mode === 'ranked' ? 'Ranked' : 'Partida rápida';
    const accentBorder = mode === 'ranked' ? 'border-brand-500/50' : 'border-yellow-700/50';
    const accentBg = mode === 'ranked' ? 'bg-brand-950/20' : 'bg-yellow-950/20';

    function startSearch() {
        setStatus('searching');
        setElapsed(0);
        setQueueLength(1);
        setMatchedGameId(null);
        setMatchedOpponent(null);

        fetch('/api/matchmaking/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: mode }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.status === 'matched') {
                    setStatus('matched');
                    setMatchedGameId(data.gameId);
                    setMatchedOpponent(data.opponent ?? null);
                    return;
                }
                if (data.status === 'searching') {
                    setStatus('searching');
                    setQueueLength(data.position);
                }
            })
            .catch(() => {
                setStatus('error');
                setErrorMsg('Error de conexión');
            });
    }

    function cancelSearch() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        fetch('/api/matchmaking/leave', { method: 'POST' }).catch(() => {});
        setStatus('idle');
    }

    function reset() {
        cancelSearch();
        setMatchedGameId(null);
        setMatchedOpponent(null);
        setErrorMsg('');
    }

    useEffect(() => {
        if (status !== 'searching') {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            fetch('/api/matchmaking/status')
                .then((r) => r.json())
                .then((data) => {
                    if (data.status === 'matched') {
                        setStatus('matched');
                        setMatchedGameId(data.gameId);
                        return;
                    }
                    if (data.status === 'searching') {
                        setQueueLength(data.queueLength);
                        setElapsed(data.elapsed);
                        return;
                    }
                    if (data.status === 'timeout') {
                        cancelSearch();
                        setStatus('timeout');
                    }
                })
                .catch(() => {
                    cancelSearch();
                    setStatus('error');
                    setErrorMsg('Error al consultar estado');
                });
        }, 2000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [status]);

    const { data: session } = useSession();

    useEffect(() => {
        if (status === 'matched' && matchedGameId && session?.user?.id) {
            const timer = setTimeout(() => {
                const params = new URLSearchParams({ userId: session.user.id, matchType: mode });
                window.location.href = `http://localhost:5173/game/${matchedGameId}?${params}`;
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [status, matchedGameId, session, mode]);

    return (
        <>
            <Navbar />
            <main className="flex min-h-screen items-center justify-center px-4 pt-16">
                <div className="w-full max-w-md text-center">
                    <button onClick={onBack} className="mb-6 text-sm text-zinc-500 hover:text-white">&larr; Volver</button>
                    <h1 className="mb-2 text-3xl font-bold text-white">{title}</h1>

                    {status === 'idle' && (
                        <button
                            onClick={startSearch}
                            className="mt-8 w-full rounded-xl bg-brand-500 px-6 py-3 text-lg font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400"
                        >
                            {mode === 'ranked' ? '🏆 Buscar partida' : '⚔️ Buscar partida'}
                        </button>
                    )}

                    {status === 'searching' && (
                        <div className="mt-8 space-y-4">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-700 border-t-brand-400" />
                            </div>
                            <p className="text-lg font-semibold text-white">Buscando oponente...</p>
                            <div className="flex justify-center gap-8 text-sm text-zinc-500">
                                <span>Tiempo: {elapsed}s</span>
                                <span>En cola: {queueLength}</span>
                            </div>
                            <button
                                onClick={cancelSearch}
                                className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {status === 'matched' && (
                        <div className="mt-8 space-y-4">
                            <div className={`rounded-xl border ${accentBorder} ${accentBg} p-8`}>
                                <p className="mb-2 text-2xl">✅</p>
                                <p className="text-lg font-bold text-emerald-400">Partida encontrada</p>
                                {matchedOpponent && (
                                    <p className="mt-2 text-sm text-zinc-400">
                                        Oponente: <span className="text-white">{matchedOpponent.username}</span>
                                        {' · '}ELO: {matchedOpponent.elo}
                                    </p>
                                )}
                                <p className="mt-4 text-sm text-zinc-500">Redirigiendo al juego...</p>
                            </div>
                        </div>
                    )}

                    {status === 'timeout' && (
                        <div className="mt-8 space-y-4">
                            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-8">
                                <p className="mb-2 text-lg font-semibold text-amber-400">No se encontró oponente</p>
                                <p className="text-sm text-zinc-500">No hay jugadores disponibles. Intenta de nuevo.</p>
                            </div>
                            <button
                                onClick={reset}
                                className="rounded-xl bg-brand-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-brand-400"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mt-8 rounded-xl border border-red-700 bg-red-950/30 p-8">
                            <p className="text-lg font-semibold text-red-400">Error</p>
                            <p className="mt-1 text-sm text-zinc-500">{errorMsg}</p>
                            <button
                                onClick={reset}
                                className="mt-4 rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400"
                            >
                                Volver
                            </button>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

function InviteMode({ onBack }: { onBack: () => void }) {
    const { data: session } = useSession();
    const [username, setUsername] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; gameId?: string } | null>(null);

    function handleInvite() {
        if (!username.trim()) return;
        setSending(true);
        setResult(null);

        fetch('/api/matchmaking/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim() }),
        })
            .then((r) => r.json())
            .then((data) => {
                setSending(false);
                if (data.status === 'invited') {
                    setResult({ type: 'success', message: 'Invitación enviada. Redirigiendo...', gameId: data.gameId });
                    if (session?.user?.id) {
                        const params = new URLSearchParams({ userId: session.user.id, matchType: 'quickplay' });
                        const redirectUrl = `http://localhost:5173/game/${data.gameId}?${params}`;
                        setTimeout(() => {
                            window.location.href = redirectUrl;
                        }, 1500);
                    } else {
                        setTimeout(() => {
                            window.location.href = `http://localhost:5173/game/${data.gameId}`;
                        }, 1500);
                    }
                } else {
                    setResult({ type: 'error', message: data.message ?? 'Error al enviar invitación' });
                }
            })
            .catch(() => {
                setSending(false);
                setResult({ type: 'error', message: 'Error de conexión' });
            });
    }

    return (
        <>
            <Navbar />
            <main className="flex min-h-screen items-center justify-center px-4 pt-16">
                <div className="w-full max-w-md text-center">
                    <button onClick={onBack} className="mb-6 text-sm text-zinc-500 hover:text-white">&larr; Volver</button>
                    <h1 className="mb-2 text-3xl font-bold text-white">Invitar a un amigo</h1>
                    <p className="mb-8 text-zinc-500">Introduce el nombre de usuario de tu amigo.</p>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Nombre de usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            className="flex-1 rounded-xl border border-zinc-700 bg-bg-dark px-4 py-3 text-white outline-none transition-colors focus:border-brand-500"
                        />
                        <button
                            onClick={handleInvite}
                            disabled={sending || !username.trim()}
                            className="rounded-xl bg-brand-500 px-6 py-3 font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 disabled:opacity-50"
                        >
                            {sending ? '...' : 'Invitar'}
                        </button>
                    </div>

                    {result && (
                        <div className={`mt-6 rounded-xl border p-4 text-sm ${result.type === 'success' ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400' : 'border-red-700 bg-red-950/30 text-red-400'}`}>
                            {result.message}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
