import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { leaveQueue } from '@/lib/matchmaking';

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    leaveQueue(session.user.id);
    return NextResponse.json({ status: 'cancelled' });
}
