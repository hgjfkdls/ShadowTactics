import { registerModel } from './registry';
import { GreedyModel } from './GreedyModel';
import { MCTSModel } from './MCTSModel';
import { MinimaxModel } from './MinimaxModel';
import { PRIORITIES } from '../evaluate';

export function registerPresets(): void {
  registerModel(new GreedyModel({
    id: 'cpu_facil',
    name: 'CPU Facil',
    description: 'Greedy 1-ply con ruido y pesos defensivos',
    algorithm: 'greedy',
    depth: 1,
    timeLimitMs: 2000,
    noise: 0.2,
    weights: PRIORITIES.easy,
  }));

  registerModel(new GreedyModel({
    id: 'cpu_medio',
    name: 'CPU Medio',
    description: 'Greedy 1-ply sin ruido, pesos balanceados',
    algorithm: 'greedy',
    depth: 1,
    timeLimitMs: 3000,
    noise: 0,
    weights: PRIORITIES.medium,
  }));

  registerModel(new GreedyModel({
    id: 'cpu_dificil',
    name: 'CPU Dificil',
    description: 'Greedy 2-ply minimax con pesos agresivos',
    algorithm: 'greedy',
    depth: 2,
    timeLimitMs: 5000,
    noise: 0,
    weights: PRIORITIES.hard,
  }));

  registerModel(new MinimaxModel({
    id: 'el_gran_general',
    name: 'El Gran General',
    description: 'Minimax con poda Alfa-Beta, Quiescence Search, TT e Iterative Deepening',
    algorithm: 'minimax',
    depth: 20,
    timeLimitMs: 10000,
    noise: 0,
    weights: PRIORITIES.hard,
  }));

  registerModel(new MCTSModel({
    id: 'general_mares',
    name: 'General de los Mares',
    description: 'Monte Carlo Tree Search con 50 simulaciones por nodo',
    algorithm: 'mcts',
    depth: 50,
    timeLimitMs: 10000,
    noise: 0,
    weights: PRIORITIES.hard,
  }));
}
