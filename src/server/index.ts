import { createServer } from 'http';
import { Server } from 'socket.io';
import { getRoom, removeRoomIfEmpty } from './rooms';

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.on('JOIN_GAME', ({ gameId }) => {
        const room = getRoom(gameId);
        socket.join(gameId);

        const joinResult = room.join(socket.id);

        if (joinResult.role === 'player') {
            socket.emit('ROLE', {
                role: 'player',
                playerId: joinResult.playerId,
            });
        } else {
            socket.emit('ROLE', {
                role: 'spectator',
            });
        }

        socket.emit('STATE', room.getCurrentState());
        console.log(room.debugInfo());
    });

    socket.on('ACTION', ({ gameId, action, playerId }) => {
        const room = getRoom(gameId);

        if (!room.isPlayer(socket.id, playerId)) return;

        const newState = room.handleAction(action, playerId);

        io.to(gameId).emit('STATE', newState);
    });

    socket.on('LEAVE_GAME', ({ gameId }) => {
        const room = getRoom(gameId);
        socket.leave(gameId);
        room.leave(socket.id);
        removeRoomIfEmpty(gameId);

        console.log(`Socket ${socket.id} left game ${gameId}`);
        socket.emit('LEFT_GAME');
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);

        for (const gameId of socket.rooms) {
            if (gameId === socket.id) continue;
            const room = getRoom(gameId);
            room.leave(socket.id);
            removeRoomIfEmpty(gameId);
        }

    });
});

httpServer.listen(3000, () => {
    console.log('Socket.IO server corriendo en http://localhost:3000');
});