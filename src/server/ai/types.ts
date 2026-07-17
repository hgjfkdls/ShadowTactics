import type { GameAction } from '@shared';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Weights = {
  hp: number;
  kill: number;
  pos: number;
  dmg: number;
  ap: number;
  card: number;
  formation: number;
};

export type TimedResult = {
  action: GameAction;
  score: number;
};
