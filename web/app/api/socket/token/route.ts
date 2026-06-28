import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const token = jwt.sign(
        { id: session.user.id, username: session.user.username },
        process.env.AUTH_SECRET!,
        { expiresIn: '5m' },
    );

    return NextResponse.json({ token });
}
