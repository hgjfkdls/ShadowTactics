import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const purchases = await prisma.purchase.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
            amountSC: true,
            amountUSD: true,
            status: true,
            createdAt: true,
        },
    });

    return NextResponse.json({
        purchases: purchases.map((p: { amountSC: number; amountUSD: number; status: string; createdAt: Date }) => ({
            amountSC: p.amountSC,
            amountUSD: p.amountUSD,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
        })),
    });
}
