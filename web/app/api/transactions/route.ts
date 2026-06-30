import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TransactionType } from '@prisma/client';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const typeFilter = searchParams.get('type') as TransactionType | null;

    const where: Record<string, unknown> = { userId: session.user.id };
    if (typeFilter) where.type = typeFilter;

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where: where as never,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.transaction.count({ where: where as never }),
    ]);

    return NextResponse.json({
        transactions: transactions.map((t) => ({
            id: t.id,
            amount: t.amount,
            type: t.type,
            concept: t.concept,
            createdAt: t.createdAt.toISOString(),
        })),
        pagination: { page, limit, total },
    });
}
