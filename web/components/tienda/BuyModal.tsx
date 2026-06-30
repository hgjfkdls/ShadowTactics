'use client';

import { useEffect } from 'react';

type Props = {
    name: string;
    price: number;
    discountPercent?: number;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function BuyModal({ name, price, discountPercent, onConfirm, onCancel }: Props) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    const isOnSale = (discountPercent ?? 0) > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-bg-card p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-2 text-lg font-bold text-white">Confirmar compra</h3>
                <p className="mb-1 text-zinc-400">
                    ¿Comprar <span className="text-white">{name}</span> por{' '}
                    <span className="text-yellow-400">{price} SC</span>?
                </p>
                {isOnSale && (
                    <p className="mb-1 text-sm text-red-400">
                        🔥 Descuento de {discountPercent}% aplicado
                    </p>
                )}
                <div className="flex justify-end gap-3 pt-3">
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                    >
                        Comprar
                    </button>
                </div>
            </div>
        </div>
    );
}
