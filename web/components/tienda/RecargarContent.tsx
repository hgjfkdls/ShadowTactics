'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PackageCard from './PackageCard';
import StripeCheckout from './StripeCheckout';

type Package = {
    id: string;
    name: string;
    sc: number;
    usd: number;
};

type PurchaseHistory = {
    amountSC: number;
    amountUSD: number;
    status: string;
    createdAt: string;
};

export default function RecargarContent() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [coins, setCoins] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [selected, setSelected] = useState<Package | null>(null);
    const [processing, setProcessing] = useState(false);
    const [history, setHistory] = useState<PurchaseHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const fetchData = async () => {
        try {
            const [pkgRes, balRes, histRes] = await Promise.all([
                fetch('/api/stripe/packages'),
                fetch('/api/coins/balance'),
                fetch('/api/stripe/history'),
            ]);
            if (!pkgRes.ok || !balRes.ok) throw new Error('Error al cargar');
            const pkgData = await pkgRes.json();
            const balData = await balRes.json();
            const histData = await histRes.json();
            setPackages(pkgData.packages);
            setCoins(balData.coins);
            setHistory(histData.purchases ?? []);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleConfirm = async () => {
        if (!selected) return;
        setProcessing(true);
        try {
            const res = await fetch('/api/stripe/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId: selected.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCoins(data.coinsRemaining);
            setToast(`¡${selected.sc} SC adquiridos! Saldo: ${data.coinsRemaining} SC`);
            setHistory((prev) => [
                { amountSC: selected.sc, amountUSD: selected.usd, status: 'succeeded', createdAt: new Date().toISOString() },
                ...prev,
            ]);
        } catch (e) {
            setToast(e instanceof Error ? e.message : 'Error al procesar');
        }
        setProcessing(false);
        setSelected(null);
        setTimeout(() => setToast(''), 4000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return <p className="py-20 text-center text-red-400">{error}</p>;
    }

    return (
        <div>
            {toast && (
                <div className="fixed top-20 right-4 z-50 rounded-lg border border-green-700 bg-green-950/80 px-4 py-2 text-sm text-green-400 shadow-lg">
                    {toast}
                </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Selecciona un paquete</h2>
                    <p className="text-sm text-zinc-500">Recibe ShadowCoins al instante</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-lg font-bold text-yellow-400">
                        <img src="/img/icons/shadow_coin_icon.png" alt="" className="h-8" />
                        {coins} SC
                    </span>
                </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((pkg) => (
                    <PackageCard
                        key={pkg.id}
                        name={pkg.name}
                        sc={pkg.sc}
                        usd={pkg.usd}
                        onSelect={() => setSelected(pkg)}
                    />
                ))}
            </div>

            {selected && (
                <div className="mx-auto mb-8 max-w-md">
                    <StripeCheckout
                        name={selected.name}
                        sc={selected.sc}
                        usd={selected.usd}
                        loading={processing}
                        onConfirm={handleConfirm}
                        onCancel={() => setSelected(null)}
                    />
                </div>
            )}

            <div className="mb-8 text-center">
                <Link
                    href="/tienda"
                    className="inline-flex flex-col items-center gap-2 text-sm text-zinc-500 underline transition-colors hover:text-zinc-300"
                >
                    <img src="/img/icons/shop_icon.png" alt="" className="h-16" />
                    ← Volver a la tienda
                </Link>
            </div>

            {history.length > 0 && (
                <div className="mx-auto max-w-lg">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="mb-3 text-sm text-zinc-500 hover:text-zinc-300"
                    >
                        {showHistory ? '▼ Ocultar historial' : '▶ Ver historial de compras'}
                    </button>
                    {showHistory && (
                        <div className="space-y-2">
                            {history.map((h, i) => (
                                <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-bg-card px-4 py-2 text-sm">
                                    <span className="text-zinc-300">+{h.amountSC} SC</span>
                                    <span className="text-zinc-500">${(h.amountUSD / 100).toFixed(2)}</span>
                                    <span className="text-green-400">{h.status === 'succeeded' ? '✅' : '❌'}</span>
                                    <span className="text-xs text-zinc-600">
                                        {new Date(h.createdAt).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
