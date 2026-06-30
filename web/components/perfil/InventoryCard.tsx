'use client';

import RarityBadge from '@/components/tienda/RarityBadge';

const unitClassLabel: Record<string, string> = {
    ARCHER: 'Arquero',
    INFANTRY: 'Infantería',
    CAVALRY: 'Caballería',
    LANCER: 'Lancero',
    GENERAL: 'General',
};

type Props = {
    id: string;
    name: string;
    type: string;
    rarity: string;
    equipped: boolean;
    attributes?: Record<string, unknown>;
    onEquip: (id: string, equip: boolean) => void;
};

export default function InventoryCard({ id, name, type, rarity, equipped, attributes, onEquip }: Props) {
    const unitClass = type === 'SKIN' || type === 'WEAPON'
        ? unitClassLabel[attributes?.unitClass as string] ?? null
        : null;

    return (
        <div className="flex flex-col rounded-xl border border-white/10 bg-bg-card p-4">
            <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-bg-dark">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-xl">
                    🖼️
                </div>
            </div>
            <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{name}</h3>
                <RarityBadge rarity={rarity} />
            </div>
            <p className="mb-1 text-xs text-zinc-500">
                {type}
                {unitClass && <span className="ml-1 text-zinc-400">— {unitClass}</span>}
            </p>
            <div className="mt-auto flex items-center justify-between">
                {equipped ? (
                    <>
                        <span className="rounded-lg border border-green-700 bg-green-950/30 px-3 py-1.5 text-xs font-semibold text-green-400">
                            ✅ Equipado
                        </span>
                        <button
                            onClick={() => onEquip(id, false)}
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500"
                        >
                            Desequipar
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => onEquip(id, true)}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
                    >
                        Equipar
                    </button>
                )}
            </div>
        </div>
    );
}
