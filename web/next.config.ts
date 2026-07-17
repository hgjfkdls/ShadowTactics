import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    outputFileTracingRoot: __dirname,
    serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;
