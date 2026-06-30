'use client';

type Props = {
    name: string;
    sc: number;
    usd: number;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
};

export default function StripeCheckout({ name, sc, usd, onConfirm, onCancel, loading }: Props) {
    return (
        <div className="rounded-xl border border-brand-500/30 bg-bg-card p-6">
            <h4 className="mb-2 text-lg font-bold text-white">Resumen de compra</h4>
            <div className="mb-4 space-y-1 text-sm text-zinc-400">
                <p>Paquete: <span className="text-white">{name}</span></p>
                <p>ShadowCoins: <span className="text-yellow-400">{sc} SC</span></p>
                <p>Total: <span className="text-white">${(usd / 100).toFixed(2)} USD</span></p>
            </div>

            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center text-sm text-zinc-500">
                <p className="mb-1">🔒 Modo de prueba</p>
                <p className="text-xs">Stripe no está integrado. Esta es una simulación.</p>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? 'Procesando...' : '✅ Simular pago exitoso'}
                </button>
            </div>
        </div>
    );
}
