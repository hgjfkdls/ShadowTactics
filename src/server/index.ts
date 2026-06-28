import { createServer } from 'http';
import { Server } from 'socket.io';
import { getRoom, removeRoomIfEmpty } from './rooms';
import { submitReport } from './report';

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.on('JOIN_GAME', ({ gameId, userId, matchType }) => {
        const room = getRoom(gameId);
        socket.join(gameId);
        socket.data.gameId = gameId;

        if (matchType === 'ranked' || matchType === 'quickplay') {
            room.setMatchType(matchType);
        }

        const joinResult = room.join(socket.id, userId);

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

            if (!room.onGameOverCallback) {
                const userIdMapping = room.getUserIdMapping();
                room.onGameOverCallback = (finalState) => {
                    const history = room.getHistory();
                    submitReport(gameId, finalState, history.actions, userIdMapping, room.getMatchType());
                };
            }

            // Notificar al web API que la partida comenzó para cancelar el timeout del ActiveMatch
            const webApiUrl = process.env.WEB_API_URL ?? 'http://localhost:3001';
            const apiKey = process.env.REPORT_API_KEY ?? 'dev-key-change-me';
            fetch(`${webApiUrl}/api/games/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({ gameId }),
            }).then((res) => {
                if (!res.ok) {
                    console.warn(`[game/start] Respuesta ${res.status} para game ${gameId}: no se pudo cancelar el timeout`);
                }
            }).catch((err) => {
                console.warn(`[game/start] Error de red para game ${gameId}:`, err?.message ?? err);
            });
        }

        // console.log(room.debugInfo());
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

                const originalCallback = room.onDisconnectCallback;
                room.onDisconnectCallback = (finalState) => {
                    io.to(gameId).emit('STATE', finalState);
                    originalCallback?.(finalState);
                };
            }

            room.leave(socket.id);
            removeRoomIfEmpty(gameId);
        }
    });
});

httpServer.listen(3000, () => {
    console.log('Socket.IO server corriendo en http://localhost:3000');
});
