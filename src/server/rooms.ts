import { GameRoom } from './GameRoom';

const rooms = new Map<string, GameRoom>();

export function getRoom(gameId: string): GameRoom {
    let room = rooms.get(gameId);

    if (!room) {
        room = new GameRoom(gameId);
        rooms.set(gameId, room);
    }

    return room;
}

export function removeRoomIfEmpty(gameId: string) {
    const room = rooms.get(gameId);
    if (!room) return;

    if (room.isEmpty()) {
        rooms.delete(gameId);
        console.log(`Room ${gameId} destroyed (empty)`);
    }
}
