'use client';

import RarityBadge from './RarityBadge';

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

type Props = {
    item: ShopItem;
    userCoins: number;
    onBuy: (item: ShopItem) => void;
    onEquip: (item: ShopItem, equip: boolean) => void;
};

export default function ShopCard({ item, userCoins, onBuy, onEquip }: Props) {
    const isOnSale = item.discountPercent > 0 && !!item.discountEndsAt;
    const canBuy = !item.owned && userCoins >= item.effectivePrice;
    const insufficientCoins = !item.owned && userCoins < item.effectivePrice;

    const borderClass = isOnSale ? 'border-yellow-700/40' : 'border-white/10';
    const hoverBorderClass = isOnSale ? 'hover:border-yellow-600/60' : 'hover:border-white/20';

    return (
        <div className={`flex flex-col rounded-xl border bg-bg-card p-4 transition-colors ${borderClass} ${hoverBorderClass}`}>
            <div className="relative mb-3 flex h-32 items-center justify-center rounded-lg bg-bg-dark">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-2xl">
                    🖼️
                </div>
                {isOnSale && (
                    <span className="absolute top-1 right-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow-lg">
                        -{item.discountPercent}%
                    </span>
                )}
            </div>
            <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{item.name}</h3>
                <RarityBadge rarity={item.rarity} />
            </div>
            <p className="mb-3 text-xs text-zinc-500">{item.description}</p>
            <div className="mb-2 flex items-center gap-2">
                {isOnSale ? (
                    <>
                        <span className="text-sm font-bold text-yellow-400">{item.effectivePrice} SC</span>
                        <span className="text-xs text-zinc-600 line-through">{item.price} SC</span>
                    </>
                ) : (
                    <span className="text-sm font-bold text-zinc-300">{item.price} SC</span>
                )}
            </div>
            <div className="mt-auto">
                {item.owned ? (
                    <button
                        onClick={() => onEquip(item, !item.equipped)}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            item.equipped
                                ? 'border border-green-700 bg-green-950/30 text-green-400 hover:bg-green-900/30'
                                : 'border border-zinc-700 text-zinc-300 hover:border-zinc-500'
                        }`}
                    >
                        {item.equipped ? '✅ Equipado' : 'Equipar'}
                    </button>
                ) : insufficientCoins ? (
                    <span className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-center text-xs text-zinc-600">
                        🔒 {item.effectivePrice} SC
                    </span>
                ) : (
                    <button
                        onClick={() => onBuy(item)}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors ${
                            isOnSale
                                ? 'bg-red-700 hover:bg-red-600'
                                : 'bg-brand-500 hover:bg-brand-400'
                        }`}
                    >
                        {isOnSale ? `Comprar -${item.discountPercent}%` : `Comprar ${item.effectivePrice} SC`}
                    </button>
                )}
            </div>
        </div>
    );
}
