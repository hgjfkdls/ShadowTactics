'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const body = {
            email: form.get('email'),
            username: form.get('username'),
            password: form.get('password'),
        };

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? 'Error al registrarse');
                return;
            }

            await signIn('credentials', {
                email: body.email,
                password: body.password,
                redirect: false,
            });

            router.push('/perfil');
            router.refresh();
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-lg border border-red-700 bg-red-950/30 px-4 py-2 text-sm text-red-400">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="email" className="mb-1 block text-sm text-zinc-400">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-zinc-700 bg-bg-card px-4 py-2 text-white outline-none transition-colors focus:border-brand-400"
                />
            </div>

            <div>
                <label htmlFor="username" className="mb-1 block text-sm text-zinc-400">
                    Nombre de usuario
                </label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    minLength={3}
                    maxLength={20}
                    className="w-full rounded-lg border border-zinc-700 bg-bg-card px-4 py-2 text-white outline-none transition-colors focus:border-brand-400"
                />
            </div>

            <div>
                <label htmlFor="password" className="mb-1 block text-sm text-zinc-400">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-zinc-700 bg-bg-card px-4 py-2 text-white outline-none transition-colors focus:border-brand-400"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
            >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
        </form>
    );
}
