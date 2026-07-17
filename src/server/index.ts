import 'dotenv/config';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { Server } from 'socket.io';
import { getRoom, removeRoomIfEmpty } from './rooms';
import { submitReport } from './report';

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
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
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
        origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            callback(null, true);
        },
        credentials: true,
    },
});

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.on('JOIN_GAME', ({ gameId, userId, matchType }) => {
        const room = getRoom(gameId);
        socket.join(gameId);
        socket.data.gameId = gameId;

        if (!room.onTimerTick) {
            room.onTimerTick = (info, pausedInfo) => {
                io.to(gameId).emit('TIMER', { active: info, paused: pausedInfo ?? null });
            };
        }

        if (!room.onStateChanged) {
            room.onStateChanged = (state) => {
                io.to(gameId).emit('STATE', state);
            };
        }

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

        // Cuando ambos jugadores están conectados, notificar a todos y arrancar timer
        if (room.getPlayerCount() === 2) {
            io.to(gameId).emit('BOTH_PLAYERS_READY');
            room.refreshTimer();

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

        room.handleAction(action, playerId);
    });

    socket.on('SURRENDER', ({ gameId, playerId }) => {
        const room = getRoom(gameId);
        if (!room.isPlayer(socket.id, playerId)) return;
        room.handleAction({ type: 'SURRENDER', playerId }, playerId);
    });

    socket.on('DISMISS_REVEAL', ({ gameId, playerId }) => {
        const room = getRoom(gameId);
        if (!room.isPlayer(socket.id, playerId)) return;
        room.handleRevealDismiss(playerId);
    });

    socket.on('DISMISS_ROLL_RESULT', ({ gameId, playerId }) => {
        const room = getRoom(gameId);
        if (!room.isPlayer(socket.id, playerId)) return;
        room.handleRollResultDismiss(playerId);
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

httpServer.listen(SERVER_PORT, serverHost, () => {
    console.log(`Socket.IO server corriendo en ${serverUrl}`);
});
