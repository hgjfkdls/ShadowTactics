import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import dotenv from 'dotenv';

const env = dotenv.config().parsed || {};
const isOnline = env.MODE === 'online';
const wsUrl = env.WS_URL || (isOnline
    ? env.SERVER_URL || `${env.LOCAL_URL || 'http://localhost'}:${env.SERVER_PORT || 3000}`
    : `${env.LOCAL_URL || 'http://localhost'}:${env.SERVER_PORT || 3000}`);

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@client': path.resolve(__dirname, 'src/client'),
            '@server': path.resolve(__dirname, 'src/server')
        }
    },
    define: {
        __WS_URL__: JSON.stringify(wsUrl),
        __DEPLOY_MODE__: JSON.stringify(env.DEPLOY || 'normal'),
        __DEBUG__: JSON.stringify(env.DEBUG === 'true' || env.DEBUG === '1'),
    },
    server: {
        proxy: {
            '/socket.io': {
                target: `http://localhost:${env.SERVER_PORT || 3000}`,
                ws: true,
            },
        },
    },
});