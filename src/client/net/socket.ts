import { io } from 'socket.io-client';

export const socket = io(window.location.origin, { autoConnect: true });

export function createAIGame(modelId: string) {
  socket.emit('CREATE_AI_GAME', { modelId });
}