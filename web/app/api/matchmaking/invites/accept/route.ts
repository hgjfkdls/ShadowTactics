import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptInvite } from '@/lib/matchmaking';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { inviteId } = await req.json();
    if (!inviteId) {
        return NextResponse.json({ error: 'Se requiere inviteId' }, { status: 400 });
    }

    const result = acceptInvite(inviteId, session.user.id, session.user.username);
    return NextResponse.json(result);
}
