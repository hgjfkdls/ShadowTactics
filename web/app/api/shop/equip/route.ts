import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { cosmeticId, equip: equipParam } = await req.json();
    if (!cosmeticId) {
        return NextResponse.json({ error: 'cosmeticId requerido' }, { status: 400 });
    }

    const shouldEquip = equipParam !== false;

    const userCosmetic = await prisma.userCosmetic.findUnique({
        where: { userId_cosmeticId: { userId: session.user.id, cosmeticId } },
        include: { cosmetic: true },
    });

    if (!userCosmetic) {
        return NextResponse.json({ error: 'No posees este cosmético' }, { status: 400 });
    }

    if (!shouldEquip) {
        await prisma.userCosmetic.update({
            where: { userId_cosmeticId: { userId: session.user.id, cosmeticId } },
            data: { equipped: false, equippedAt: null },
        });
        return NextResponse.json({ status: 'ok', equipped: false });
    }

    const cosmeticType = userCosmetic.cosmetic.type;
    const unitClass = (userCosmetic.cosmetic.attributes as Record<string, unknown>)?.unitClass as string | undefined;
    const isSlotPerUnit = cosmeticType === 'SKIN' || cosmeticType === 'WEAPON';

    await prisma.$transaction(async (tx) => {
        const sameTypeEquipped = await tx.userCosmetic.findMany({
            where: {
                userId: session.user.id,
                equipped: true,
                cosmetic: { type: cosmeticType },
                cosmeticId: { not: cosmeticId },
            },
            include: { cosmetic: true },
        });

        for (const uc of sameTypeEquipped) {
            let shouldUnequip = true;
            if (isSlotPerUnit && unitClass) {
                const ucUnitClass = (uc.cosmetic.attributes as Record<string, unknown>)?.unitClass as string | undefined;
                shouldUnequip = ucUnitClass === unitClass;
            }
            if (shouldUnequip) {
                await tx.userCosmetic.update({
                    where: { userId_cosmeticId: { userId: session.user.id, cosmeticId: uc.cosmeticId } },
                    data: { equipped: false, equippedAt: null },
                });
            }
        }

        await tx.userCosmetic.update({
            where: { userId_cosmeticId: { userId: session.user.id, cosmeticId } },
            data: { equipped: true, equippedAt: new Date() },
        });
    });

    return NextResponse.json({ status: 'ok', equipped: true });
}
