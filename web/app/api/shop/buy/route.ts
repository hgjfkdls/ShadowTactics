import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { effectivePrice } from '@/lib/pricing';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { cosmeticId } = await req.json();
    if (!cosmeticId) {
        return NextResponse.json({ error: 'cosmeticId requerido' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { coins: true },
    });
    if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const cosmetic = await prisma.cosmetic.findUnique({ where: { id: cosmeticId } });
    if (!cosmetic) {
        return NextResponse.json({ error: 'Cosmético no encontrado' }, { status: 404 });
    }

    const finalPrice = effectivePrice(cosmetic.price, cosmetic.discountPercent, cosmetic.discountEndsAt);

    if (user.coins < finalPrice) {
        return NextResponse.json({ error: 'Monedas insuficientes' }, { status: 400 });
    }

    const existing = await prisma.userCosmetic.findUnique({
        where: { userId_cosmeticId: { userId: session.user.id, cosmeticId } },
    });
    if (existing) {
        return NextResponse.json({ error: 'Ya posees este cosmético' }, { status: 400 });
    }

    const discountLabel = finalPrice < cosmetic.price ? ` (${cosmetic.discountPercent}% descuento)` : '';

    await prisma.$transaction([
        prisma.userCosmetic.create({
            data: { userId: session.user.id, cosmeticId },
        }),
        prisma.transaction.create({
            data: {
                userId: session.user.id,
                amount: -finalPrice,
                type: 'SPEND',
                concept: `Compra: ${cosmetic.name}${discountLabel}`,
            },
        }),
        prisma.user.update({
            where: { id: session.user.id },
            data: { coins: { decrement: finalPrice } },
        }),
    ]);

    return NextResponse.json({ status: 'ok', coinsRemaining: user.coins - finalPrice, discountApplied: finalPrice < cosmetic.price });
}
