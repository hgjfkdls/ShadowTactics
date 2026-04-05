import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

httpServer.listen(3000, () => {
    console.log('Socket.IO server corriendo en http://localhost:3000');
});