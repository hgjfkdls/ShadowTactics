import { io } from 'socket.io-client';

export const socket = io(window.location.origin, { autoConnect: true });

export function createAIGame(modelId: string) {
  socket.emit('CREATE_AI_GAME', { modelId });
}

export function createCampaignGame(data: {
  identityKey: string;
  identityCardId: string;
  playerUnits: { unitId: string; unitClass: string; position: { q: number; r: number } }[];
  enemyUnits: { unitId: string; unitClass: string; position: { q: number; r: number } }[];
  mapRadius: number;
  maxAP?: number;
}) {
  socket.emit('CREATE_CAMPAIGN_GAME', data);
}