import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPackage, generateMockPiId } from '@/lib/stripe.mock';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { packageId } = await req.json();
    const pkg = getPackage(packageId);
    if (!pkg) {
        return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 });
    }

    const [purchase] = await prisma.$transaction([
        prisma.purchase.create({
            data: {
                userId: session.user.id,
                packageId: pkg.id,
                amountSC: pkg.sc,
                amountUSD: pkg.usd,
                stripePiId: generateMockPiId(),
                status: 'succeeded',
                succeededAt: new Date(),
            },
        }),
        prisma.user.update({
            where: { id: session.user.id },
            data: { coins: { increment: pkg.sc } },
        }),
    ]);

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { coins: true },
    });

    return NextResponse.json({
        status: 'ok',
        coinsRemaining: user?.coins ?? 0,
        amountSC: pkg.sc,
        purchaseId: purchase.id,
    });
}
