import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { joinQueue } from '@/lib/matchmaking';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type === 'ranked' ? 'ranked' : 'quickplay';

    const result = await joinQueue(session.user.id, type);
    return NextResponse.json(result);
}
