import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingInvites } from '@/lib/matchmaking';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const invites = await getPendingInvites(session.user.id);
        return NextResponse.json({ invites });
    } catch (error) {
        console.error('[matchmaking/invites]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 },
        );
    }
}
