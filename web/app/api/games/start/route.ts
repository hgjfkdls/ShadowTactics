import { NextRequest, NextResponse } from 'next/server';
import { confirmGameStarted } from '@/lib/matchmaking';

const EXPECTED_API_KEY = process.env.REPORT_API_KEY ?? 'dev-key-change-me';

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== EXPECTED_API_KEY) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: { gameId: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { gameId } = body;
    if (!gameId) {
        return NextResponse.json({ error: 'gameId requerido' }, { status: 400 });
    }

    const cleared = await confirmGameStarted(gameId);
    if (!cleared) {
        return NextResponse.json({ error: 'gameId no encontrado o ya iniciado' }, { status: 404 });
    }

    return NextResponse.json({ status: 'ok' });
}
