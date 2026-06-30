'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ShopCard from './ShopCard';
import BuyModal from './BuyModal';

type ShopItem = {
    id: string;
    name: string;
    description: string;
    type: string;
    rarity: string;
    imageUrl: string;
    price: number;
    discountPercent: number;
    discountEndsAt: string | null;
    effectivePrice: number;
    owned: boolean;
    equipped: boolean;
};

const categoryGroups: Record<string, string[] | 'onsale'> = {
    Todos: [],
    Ofertas: 'onsale',
    Tableros: ['BOARD', 'HEX_VARIANT', 'CLIMATE', 'LIGHTING'],
    Unidades: ['SKIN', 'WEAPON', 'ANIMATION_MOVEMENT', 'ANIMATION_ELIMINATION', 'ANIMATION_SUMMON'],
    Perfil: ['PROFILE_FRAME', 'AVATAR', 'PROFILE_BACKGROUND', 'TITLE'],
    Social: ['EMOTE', 'QUICK_MESSAGE', 'REACTION', 'BANNER', 'PET', 'COMPANION'],
    Colección: ['LOADING_SCREEN', 'CURSOR', 'UI_THEME', 'MENU_BACKGROUND'],
};

const rarities = ['Todas', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

export default function ShopContent() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [allItems, setAllItems] = useState<ShopItem[]>([]);
    const [coins, setCoins] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [buyTarget, setBuyTarget] = useState<ShopItem | null>(null);
    const [group, setGroup] = useState('Todos');
    const [rarityFilter, setRarityFilter] = useState('Todas');

    const fetchItems = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            const g = categoryGroups[group];
            if (g === 'onsale') {
                params.set('onsale', 'true');
            } else if (group !== 'Todos' && Array.isArray(g) && g.length) {
                params.set('type', g[0]);
            }
            if (rarityFilter !== 'Todas') params.set('rarity', rarityFilter);
            const qs = params.toString();
            const res = await fetch(`/api/shop/items${qs ? `?${qs}` : ''}`);
            if (!res.ok) throw new Error('Error al cargar');
            const data = await res.json();
            setAllItems(data.items);
            setCoins(data.coins);
        } catch {
            setError('Error al cargar la tienda');
        } finally {
            setLoading(false);
        }
    }, [group, rarityFilter]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    useEffect(() => {
        let filtered = allItems;
        const g = categoryGroups[group];
        if (Array.isArray(g) && g.length) {
            filtered = filtered.filter((i) => g.includes(i.type));
        }
        if (rarityFilter !== 'Todas') {
            filtered = filtered.filter((i) => i.rarity === rarityFilter);
        }
        setItems(filtered);
    }, [allItems, group, rarityFilter]);

    const handleBuy = async () => {
        if (!buyTarget) return;
        try {
            const res = await fetch('/api/shop/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cosmeticId: buyTarget.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCoins(data.coinsRemaining);
            setAllItems((prev) => prev.map((i) => (i.id === buyTarget.id ? { ...i, owned: true } : i)));
            const discountMsg = data.discountApplied ? ` (${buyTarget.discountPercent}% desc.)` : '';
            setToast(`¡${buyTarget.name} adquirido! Saldo: ${data.coinsRemaining} SC${discountMsg}`);
        } catch (e) {
            setToast(e instanceof Error ? e.message : 'Error al comprar');
        }
        setBuyTarget(null);
        setTimeout(() => setToast(''), 3000);
    };

    const handleEquip = async (item: ShopItem, equip: boolean) => {
        try {
            const res = await fetch('/api/shop/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cosmeticId: item.id, equip }),
            });
            if (!res.ok) throw new Error('Error al equipar');
            setAllItems((prev) => {
                if (equip) {
                    return prev.map((i) =>
                        i.type === item.type && i.id !== item.id
                            ? { ...i, equipped: false }
                            : i.id === item.id
                            ? { ...i, equipped: true }
                            : i
                    );
                }
                return prev.map((i) => (i.id === item.id ? { ...i, equipped: false } : i));
            });
            setToast(equip ? `${item.name} equipado` : `${item.name} desequipado`);
        } catch {
            setToast('Error al equipar');
        }
        setTimeout(() => setToast(''), 3000);
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

            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    {Object.keys(categoryGroups).map((g) => (
                        <button
                            key={g}
                            onClick={() => setGroup(g)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                group === g
                                    ? g === 'Ofertas'
                                        ? 'bg-red-700 text-white'
                                        : 'bg-brand-500 text-white'
                                    : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                        >
                            {g === 'Ofertas' ? '🔥 Ofertas' : g}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {rarities.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRarityFilter(r)}
                            className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                                rarityFilter === r
                                    ? 'bg-zinc-700 text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {r === 'Todas' ? 'Todas' : r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6 text-right">
                <Link
                    href="/tienda/recargar"
                    className="inline-flex items-center gap-2 text-lg font-bold text-yellow-400 transition-colors hover:text-yellow-300"
                >
                    <img src="/img/icons/shadow_coin_icon.png" alt="" className="h-10" />
                    <span>{coins} SC</span>
                    <span className="text-xs font-normal text-zinc-500 underline">Recargar</span>
                </Link>
            </div>

            {items.length === 0 ? (
                <p className="py-10 text-center text-zinc-500">No hay cosméticos en esta categoría</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                        <ShopCard key={item.id} item={item} userCoins={coins} onBuy={setBuyTarget} onEquip={handleEquip} />
                    ))}
                </div>
            )}

            <div className="mt-8 border-t border-zinc-800 pt-6 text-center">
                <Link
                    href="/tienda/recargar"
                    className="inline-flex items-center gap-2 rounded-lg border border-yellow-700/40 bg-yellow-950/20 px-5 py-3 text-sm font-semibold text-yellow-400 transition-colors hover:bg-yellow-950/40"
                >
                    <img src="/img/icons/recarga_icon.png" alt="" className="h-16" />
                    ¿Necesitas más ShadowCoins? <span className="underline">Recargar SC →</span>
                </Link>
            </div>

            {buyTarget && (
                <BuyModal
                    name={buyTarget.name}
                    price={buyTarget.effectivePrice}
                    discountPercent={buyTarget.discountPercent}
                    onConfirm={handleBuy}
                    onCancel={() => setBuyTarget(null)}
                />
            )}
        </div>
    );
}
