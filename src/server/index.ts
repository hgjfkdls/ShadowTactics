import { applyAction, GameAction, GameState } from '@shared';
import { createInitialGameState } from '@shared/game/init';
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

let gameState = createInitialGameState();

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.emit('STATE', gameState);

    socket.on('ACTION', (action: GameAction) => {
        console.log('ACTION:', socket.id, action);
        gameState = applyAction(gameState, action);
        gameState = applyAction(gameState, { type: 'END_TURN' });
        socket.emit('STATE', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

httpServer.listen(3000, () => {
    console.log('Socket.IO server corriendo en http://localhost:3000');
});