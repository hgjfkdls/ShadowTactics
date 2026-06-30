import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CosmeticType, Rarity } from '@prisma/client';
import { effectivePrice } from '@/lib/pricing';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type') as CosmeticType | null;
    const rarityFilter = searchParams.get('rarity') as Rarity | null;
    const onsale = searchParams.get('onsale') === 'true';

    const where: Record<string, unknown> = {};
    if (typeFilter) where.type = typeFilter;
    if (rarityFilter) where.rarity = rarityFilter;

    if (onsale) {
        where.discountPercent = { gt: 0 };
        where.discountEndsAt = { gt: new Date() };
    }

    const now = new Date();
    const [cosmetics, userCosmetics, user] = await Promise.all([
        prisma.cosmetic.findMany({ where: where as never, orderBy: { price: 'asc' } }),
        prisma.userCosmetic.findMany({
            where: { userId: session.user.id },
            select: { cosmeticId: true, equipped: true },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { coins: true },
        }),
    ]);

    const ownedMap = new Map(userCosmetics.map((uc) => [uc.cosmeticId, uc.equipped]));

    const items = cosmetics.map((c) => {
        const isOnSale = c.discountPercent > 0 && c.discountEndsAt && now < c.discountEndsAt;
        return {
            id: c.id,
            name: c.name,
            description: c.description,
            type: c.type,
            rarity: c.rarity,
            imageUrl: c.imageUrl,
            price: c.price,
            discountPercent: isOnSale ? c.discountPercent : 0,
            discountEndsAt: isOnSale ? c.discountEndsAt!.toISOString() : null,
            effectivePrice: effectivePrice(c.price, c.discountPercent, c.discountEndsAt),
            owned: ownedMap.has(c.id),
            equipped: ownedMap.get(c.id) ?? false,
            attributes: c.attributes,
        };
    });

    return NextResponse.json({ items, coins: user?.coins ?? 0 });
}
