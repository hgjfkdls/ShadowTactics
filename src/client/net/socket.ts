import { io } from 'socket.io-client';

declare var __WS_URL__: string;  // Inyectado por Vite define

export const socket = io(__WS_URL__, { autoConnect: true });