import { NextResponse } from 'next/server';
import { getPackages } from '@/lib/stripe.mock';

export async function GET() {
    return NextResponse.json({ packages: getPackages() });
}
