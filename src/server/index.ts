import 'dotenv/config';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { Server } from 'socket.io';
import { getRoom, removeRoomIfEmpty } from './rooms';

const isOnline = process.env.MODE === 'online';
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3000');
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost';

const clientUrl = isOnline
    ? process.env.CLIENT_URL || `${LOCAL_URL}:${SERVER_PORT}`
    : `${LOCAL_URL}:5173`;

const serverHost = isOnline ? '0.0.0.0' : 'localhost';
const serverUrl = isOnline
    ? process.env.SERVER_URL || `${LOCAL_URL}:${SERVER_PORT}`
    : `${LOCAL_URL}:${SERVER_PORT}`;

const MIME: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const httpServer = createServer((req, res) => {
    if (!isOnline) {
        res.writeHead(404);
        res.end();
        return;
    }
    let path = req.url === '/' ? '/index.html' : req.url!;
    const filePath = join(process.cwd(), 'dist', path);
    if (!existsSync(filePath)) {
        // SPA fallback
        const fallback = join(process.cwd(), 'dist', 'index.html');
        if (existsSync(fallback)) {
            const html = readFileSync(fallback, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
            return;
        }
        res.writeHead(404);
        res.end();
        return;
    }
    const ext = extname(filePath);
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
});

const io = new Server(httpServer, {
    cors: {
        origin: clientUrl
    }
});

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.on('JOIN_GAME', ({ gameId }) => {
        const room = getRoom(gameId);
        socket.join(gameId);
        socket.data.gameId = gameId;

        const joinResult = room.join(socket.id);

        if (joinResult.role === 'player') {
            socket.emit('ROLE', {
                role: 'player',
                playerId: joinResult.playerId,
            });

            // Reconnection check: si el jugador se había desconectado, restaurar
            const disconnectedId = room.getDisconnectedPlayerId();
            if (disconnectedId === joinResult.playerId) {
                const reconnected = room.onPlayerReconnect(joinResult.playerId);
                if (reconnected) {
                    io.to(gameId).emit('OPPONENT_RECONNECTED', { playerId: joinResult.playerId });
                }
            }
        } else {
            socket.emit('ROLE', {
                role: 'spectator',
            });
        }

        socket.emit('STATE', room.getCurrentState());

        // Cuando ambos jugadores están conectados, notificar a todos
        if (room.getPlayerCount() === 2) {
            io.to(gameId).emit('BOTH_PLAYERS_READY');
        }

        console.log(room.debugInfo());
    });

    socket.on('ACTION', ({ gameId, action, playerId }) => {
        const room = getRoom(gameId);

        if (!room.isPlayer(socket.id, playerId)) return;

        const newState = room.handleAction(action, playerId);

        io.to(gameId).emit('STATE', newState);
    });

    socket.on('SURRENDER', ({ gameId, playerId }) => {
        const room = getRoom(gameId);
        if (!room.isPlayer(socket.id, playerId)) return;
        const newState = room.handleAction({ type: 'SURRENDER', playerId }, playerId);
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

        const gameId = socket.data.gameId as string | undefined;
        if (gameId) {
            const room = getRoom(gameId);
            const playerId = room.getPlayerIdBySocket(socket.id);

            if (playerId && room.getCurrentState().gamePhase === 'GAME') {
                room.onPlayerDisconnect(playerId);
                io.to(gameId).emit('OPPONENT_DISCONNECTED', { playerId });
                io.to(gameId).emit('STATE', room.getCurrentState());

                room.onDisconnectCallback = (finalState) => {
                    io.to(gameId).emit('STATE', finalState);
                };
            }

            room.leave(socket.id);
            removeRoomIfEmpty(gameId);
        }
    });
});

httpServer.listen(SERVER_PORT, serverHost, () => {
    console.log(`Socket.IO server corriendo en ${serverUrl}`);
});
