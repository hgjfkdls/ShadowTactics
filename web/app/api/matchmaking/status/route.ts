import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQueueStatus } from '@/lib/matchmaking';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const result = await getQueueStatus(session.user.id);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[matchmaking/status]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 },
        );
    }
}
