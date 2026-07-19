import type { GameState, GameAction } from '@shared';
import type { Weights } from '../types';

export type AlgorithmType = 'greedy' | 'mcts';

export type AIModelConfig = {
  id: string;
  name: string;
  description: string;
  algorithm: AlgorithmType;
  depth: number;
  timeLimitMs: number;
  noise: number;
  weights?: Weights;
};

export interface AIModel {
  readonly config: AIModelConfig;
  decide(state: GameState, playerId: string, timeBudgetMs?: number): Promise<GameAction>;
}
