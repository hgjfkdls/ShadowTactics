import { GameState } from '@shared';
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

export function createInitialGameState(): GameState {
    return {
        turn: 1,
        activePlayer: 'p1',

        map: {
            radius: 3
        },

        units: {
            u1: {
                id: 'u1',
                owner: 'p1',
                position: { q: 0, r: 0 },
                movement: 2
            },
            u2: {
                id: 'u2',
                owner: 'p2',
                position: { q: 2, r: -2 },
                movement: 2
            }
        }
    };
}

let gameState = createInitialGameState();

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.emit('STATE', gameState);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

httpServer.listen(3000, () => {
    console.log('Socket.IO server corriendo en http://localhost:3000');
});