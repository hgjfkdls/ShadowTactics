import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { leaveQueue } from '@/lib/matchmaking';

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        await leaveQueue(session.user.id);
        return NextResponse.json({ status: 'cancelled' });
    } catch (error) {
        console.error('[matchmaking/leave]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 },
        );
    }
}
