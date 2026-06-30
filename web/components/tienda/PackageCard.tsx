'use client';

type Props = {
    name: string;
    sc: number;
    usd: number;
    onSelect: () => void;
};

export default function PackageCard({ name, sc, usd, onSelect }: Props) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-bg-card p-6 transition-colors hover:border-brand-500/40">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-3xl">
                <img src="/img/icons/shadow_coin_icon.png" alt="" className="h-12" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-white">{name}</h3>
            <p className="mb-3 text-3xl font-bold text-yellow-400">{sc} <span className="text-sm font-normal text-zinc-500">SC</span></p>
            <p className="mb-4 text-sm text-zinc-500">USD { (usd / 100).toFixed(2) }</p>
            <button
                onClick={onSelect}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-400"
            >
                Comprar
            </button>
        </div>
    );
}
