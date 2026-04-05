import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000',
    {
        autoConnect: true
    }
);

socket.on('connect', () => {
    console.log('Conectado al server con id:', socket.id);
});