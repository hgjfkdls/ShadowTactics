import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQueueStatus } from '@/lib/matchmaking';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const result = await getQueueStatus(session.user.id);
    return NextResponse.json(result);
}
