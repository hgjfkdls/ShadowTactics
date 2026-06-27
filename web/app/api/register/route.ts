import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
    email: z.string().email('Email inválido'),
    username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').max(20),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            const first = parsed.error.issues[0]?.message ?? 'Datos inválidos';
            return NextResponse.json({ error: first }, { status: 400 });
        }

        const { email, username, password } = parsed.data;

        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
        }

        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 409 });
        }

        const hashed = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: { email, username, password: hashed },
        });

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
