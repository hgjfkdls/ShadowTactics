import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptInvite } from '@/lib/matchmaking';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { inviteId } = await req.json();
        if (!inviteId) {
            return NextResponse.json({ error: 'Se requiere inviteId' }, { status: 400 });
        }

        const result = await acceptInvite(inviteId, session.user.id, session.user.username);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[matchmaking/accept]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 },
        );
    }
}
