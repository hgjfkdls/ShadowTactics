import type { GameState, GameAction } from '@shared';
import { applyAction } from '@shared/game';
import type { AIModel, AIModelConfig } from './types';
import { getValidActions, cloneState } from '../actions';
import { evaluate, getWeights } from '../evaluate';
import type { Weights } from '../types';

function getOpponent(pid: string): string {
  return pid === 'p1' ? 'p2' : 'p1';
}

class MCTSNode {
  state: GameState;
  action: GameAction | null;
  parent: MCTSNode | null;
  playerId: string;
  weights: Weights;
  children: MCTSNode[] = [];
  visits: number = 0;
  wins: number = 0;
  untriedActions: GameAction[];
  isTerminal: boolean = false;

  constructor(state: GameState, action: GameAction | null, parent: MCTSNode | null, playerId: string, weights: Weights) {
    this.state = state;
    this.action = action;
    this.parent = parent;
    this.playerId = playerId;
    this.weights = weights;

    const actions = getValidActions(state, playerId);
    if (state.gamePhase === 'GAME_OVER' || actions.length === 0 || (actions.length === 1 && actions[0].type === 'END_TURN')) {
      this.isTerminal = true;
      this.untriedActions = [];
    } else {
      this.untriedActions = actions;
    }
  }

  selectChild(): MCTSNode {
    let bestChild: MCTSNode | null = null;
    let bestValue = -Infinity;

    for (const child of this.children) {
      if (child.visits === 0) return child;
      const ucb1 = child.wins / child.visits + Math.sqrt(2 * Math.log(this.visits) / child.visits);
      if (ucb1 > bestValue) {
        bestValue = ucb1;
        bestChild = child;
      }
    }
    return bestChild!;
  }

  expand(): MCTSNode | null {
    if (this.isTerminal) return null;
    const index = Math.floor(Math.random() * this.untriedActions.length);
    const action = this.untriedActions.splice(index, 1)[0];
    const sim = cloneState(this.state);
    const newState = applyAction(sim, action);
    const nextPlayer = newState.gamePhase === 'GAME' ? newState.activePlayer : this.playerId;
    const child = new MCTSNode(newState, action, this, nextPlayer, this.weights);
    this.children.push(child);
    return child;
  }

  simulate(): number {
    let simState = cloneState(this.state);
    let simPlayer = this.playerId;
    const maxDepth = 30;

    for (let i = 0; i < maxDepth; i++) {
      if (simState.gamePhase === 'GAME_OVER') {
        return simState.winner === this.playerId ? 1 : -1;
      }
      const actions = getValidActions(simState, simPlayer);
      if (actions.length === 0) return 0;
      const action = actions[Math.floor(Math.random() * actions.length)];
      const simClone = cloneState(simState);
      simState = applyAction(simClone, action);
      if (simState.gamePhase === 'GAME' && simState.activePlayer !== simPlayer) {
        simPlayer = simState.activePlayer;
      }
    }

    // Heuristic evaluation when simulation timeout (no GAME_OVER reached)
    const score = evaluate(simState, this.playerId, this.weights);
    return Math.tanh(score * 0.1); // normalize to [-1, 1]
  }

  backpropagate(result: number): void {
    this.visits++;
    this.wins += result;
    if (this.parent) this.parent.backpropagate(result);
  }

  bestAction(): GameAction | null {
    if (this.children.length === 0) return null;
    let best: MCTSNode | null = null;
    let bestVisits = 0;
    for (const child of this.children) {
      if (child.visits > bestVisits) {
        bestVisits = child.visits;
        best = child;
      }
    }
    return best?.action ?? null;
  }
}

export class MCTSModel implements AIModel {
  readonly config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  decide(state: GameState, playerId: string, timeBudgetMs?: number): GameAction {
    const weights = this.config.weights ?? getWeights('medium');
    const budget = timeBudgetMs ?? this.config.timeLimitMs;
    const root = new MCTSNode(state, null, null, playerId, weights);
    const startTime = Date.now();

    let iterations = 0;
    while (Date.now() - startTime < budget * 0.9) {
      let node = root;

      // SELECT
      while (!node.isTerminal && node.untriedActions.length === 0 && node.children.length > 0) {
        node = node.selectChild();
      }

      // EXPAND
      if (!node.isTerminal && node.untriedActions.length > 0) {
        const expanded = node.expand();
        if (expanded) node = expanded;
      }

      // SIMULATE (returns heuristic result if no GAME_OVER, or -1/0/1)
      const result = node.simulate();

      // BACKPROPAGATE
      node.backpropagate(result);

      iterations++;
    }

    const best = root.bestAction();
    return best ?? { type: 'END_TURN', playerId: playerId as any };
  }
}
