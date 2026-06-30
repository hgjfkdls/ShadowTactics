'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import InventoryCard from './InventoryCard';

type ShopItem = {
    id: string;
    name: string;
    type: string;
    rarity: string;
    owned: boolean;
    equipped: boolean;
    attributes: Record<string, unknown>;
};

const categoryGroups: Record<string, string[]> = {
    Todos: [],
    Equipados: [],
    Tableros: ['BOARD', 'HEX_VARIANT', 'CLIMATE', 'LIGHTING'],
    Unidades: ['SKIN', 'WEAPON', 'ANIMATION_MOVEMENT', 'ANIMATION_ELIMINATION', 'ANIMATION_SUMMON'],
    Perfil: ['PROFILE_FRAME', 'AVATAR', 'PROFILE_BACKGROUND', 'TITLE'],
    Social: ['EMOTE', 'QUICK_MESSAGE', 'REACTION', 'BANNER', 'PET', 'COMPANION'],
    Colección: ['LOADING_SCREEN', 'CURSOR', 'UI_THEME', 'MENU_BACKGROUND'],
};

export default function InventorySection() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Todos');

    useEffect(() => {
        fetch('/api/shop/items')
            .then((r) => r.json())
            .then((data) => {
                setItems(data.items.filter((i: ShopItem) => i.owned));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleEquip = async (cosmeticId: string, equip: boolean) => {
        const res = await fetch('/api/shop/equip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cosmeticId, equip }),
        });
        if (!res.ok) return;
        setItems((prev) => {
            if (equip) {
                const target = prev.find((i) => i.id === cosmeticId);
                const targetType = target?.type;
                return prev.map((i) =>
                    targetType && i.type === targetType && i.id !== cosmeticId
                        ? { ...i, equipped: false }
                        : i.id === cosmeticId
                        ? { ...i, equipped: true }
                        : i
                );
            }
            return prev.map((i) => (i.id === cosmeticId ? { ...i, equipped: false } : i));
        });
    };

    const g = categoryGroups[filter];
    const equipped = items.filter((i) => i.equipped);
    const filtered = filter === 'Equipados' ? equipped
        : Array.isArray(g) && g.length ? items.filter((i) => g.includes(i.type))
        : items;

    if (loading) {
        return (
            <div className="mt-8 flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="mt-8 rounded-xl border border-zinc-800 bg-bg-card p-8 text-center">
                <p className="text-lg font-semibold text-white">Aún no tienes cosméticos</p>
                <p className="mt-1 text-sm text-zinc-500">
                    Visita la{' '}
                    <Link href="/tienda" className="text-brand-400 hover:underline">
                        Tienda
                    </Link>{' '}
                    para adquirir tus primeros cosméticos.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                    <img src="/img/icons/inventario_icon.png" alt="" className="h-12" />
                    Inventario
                </h2>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(categoryGroups).map((key) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                                filter === key
                                    ? 'bg-brand-500 text-white'
                                    : 'border border-zinc-700 text-zinc-400'
                            }`}
                        >
                            {key === 'Equipados' ? `✅ ${key} (${equipped.length})` : key === 'Todos' ? `${key} (${items.length})` : key}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="py-6 text-center text-zinc-500">No hay cosméticos en esta categoría</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((item) => (
                        <InventoryCard
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            type={item.type}
                            rarity={item.rarity}
                            equipped={item.equipped}
                            attributes={item.attributes}
                            onEquip={handleEquip}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
