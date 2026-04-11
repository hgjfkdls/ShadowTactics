import type { GameAction, GameState } from '@shared';

export type PlayerSlot = {
    socketId: string;
    playerId: string; // p1 | p2
};

export type ActionRecord = {
    action: GameAction;
    playerId: string;
    turn: number;
    time: number;
};

export type StateSnapshot = {
  state: GameState;
  actionIndex: number;
  time: number;
};
