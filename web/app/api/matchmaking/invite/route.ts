import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createInvite } from '@/lib/matchmaking';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { username } = await req.json();
        if (!username || typeof username !== 'string') {
            return NextResponse.json({ error: 'Se requiere un nombre de usuario' }, { status: 400 });
        }

        const result = await createInvite(session.user.id, username);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[matchmaking/invite]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 },
        );
    }
}
