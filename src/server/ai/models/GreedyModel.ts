import type { GameState, GameAction } from '@shared';
import { applyAction } from '@shared/game';
import type { AIModel, AIModelConfig } from './types';
import { getValidActions, cloneState } from '../actions';
import { evaluate, getWeights } from '../evaluate';
import { PRIORITIES } from '../evaluate';

export class GreedyModel implements AIModel {
  readonly config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  async decide(state: GameState, playerId: string, timeBudgetMs?: number): Promise<GameAction> {
    const weights = this.config.weights ?? getWeights('medium');
    const budget = timeBudgetMs ?? this.config.timeLimitMs;
    const startTime = Date.now();
    const noise = this.config.noise ?? 0;

    const validActions = getValidActions(state, playerId);

    let bestAction: GameAction = validActions.find(a => a.type === 'END_TURN') ?? { type: 'END_TURN', playerId: playerId as any };
    let bestScore = -Infinity;

    for (let i = 0; i < validActions.length; i++) {
      const action = validActions[i];

      if (Date.now() - startTime > budget * 0.8) break;
      if (action.type === 'END_TURN' && bestScore > -Infinity) continue;

      const simState = cloneState(state);
      const resultState = applyAction(simState, action);

      let score = evaluate(resultState, playerId, weights);

      if (noise > 0) {
        score += (Math.random() - 0.5) * 2 * noise * Math.abs(score || 1);
      }

      // Minimax 2-ply (depth >= 2)
      if (this.config.depth >= 2 && resultState.activePlayer !== playerId && resultState.gamePhase === 'GAME') {
        const oppActions = getValidActions(resultState, resultState.activePlayer);
        let worstOppScore = Infinity;

        for (let j = 0; j < oppActions.length; j++) {
          if (Date.now() - startTime > budget * 0.9) break;
          const oppSim = cloneState(resultState);
          const oppResult = applyAction(oppSim, oppActions[j]);
          const oppScore = evaluate(oppResult, playerId, weights);
          worstOppScore = Math.min(worstOppScore, oppScore);
        }

        if (worstOppScore < Infinity) score = Math.min(score, worstOppScore);
      }

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }
}
