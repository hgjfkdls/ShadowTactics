import type { GameState, GameAction } from '@shared';
import { applyAction } from '@shared/game';
import { hexDistance } from '@shared';
import type { AIModel, AIModelConfig } from './types';
import { getValidActions, cloneState } from '../actions';
import { evaluate, getWeights } from '../evaluate';
import type { Weights } from '../types';
import { yieldEventLoop } from './utils';

// ─── Transposition Table ──────────────────────────────────────────

type TTFlag = 'exact' | 'lowerbound' | 'upperbound';

type TTEntry = {
  depth: number;
  score: number;
  flag: TTFlag;
  bestAction: GameAction | null;
};

function getActionKey(action: GameAction): string {
  if (action.type === 'USE_ABILITY') return `${action.type}_${action.unitId}_${action.abilityId}_${action.targetId ?? ''}_${action.to?.q ?? ''}_${action.to?.r ?? ''}`;
  if (action.type === 'MOVE_UNIT') return `${action.type}_${action.unitId}_${action.to.q}_${action.to.r}`;
  if (action.type === 'ATTACK_UNIT') return `${action.type}_${action.unitId}_${action.targetId}`;
  if (action.type === 'USE_CARD') return `${action.type}_${action.cardId}_${action.targetId ?? ''}`;
  return action.type;
}

function zobristHash(state: GameState, playerId: string): number {
  let h = 5381;
  // Hash units: id + owner + position + hp + flags
  for (const [id, u] of Object.entries(state.units)) {
    h = ((h << 5) + h) ^ hashString(`${id}_${u.owner}_${u.position.q}_${u.position.r}_${u.hp}_${u.flags?.join(',') ?? ''}`);
  }
  // Hash players: AP + cardsInHand
  for (const [pid, p] of Object.entries(state.players)) {
    h = ((h << 5) + h) ^ hashString(`${pid}_${p.actionPoints}_${p.cardsInHand?.length ?? 0}`);
  }
  // Hash activePlayer + turnPhase + gamePhase
  h = ((h << 5) + h) ^ hashString(`${state.activePlayer}_${state.turnPhase}_${state.gamePhase}_${state.turn}`);
  // Hash modifiers
  for (const m of state.activeModifiers) {
    h = ((h << 5) + h) ^ hashString(`${m.stat}_${m.targetId ?? ''}_${m.remainingTurns}_${m.remainingUses ?? 0}`);
  }
  return h;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

// ─── Search Actions (filter END_TURN) ─────────────────────────────

function getSearchActions(state: GameState, playerId: string): GameAction[] {
  const all = getValidActions(state, playerId);
  const useful = all.filter(a => a.type !== 'END_TURN');
  return useful.length > 0 ? useful : all;
}

// ─── Action Ordering ───────────────────────────────────────────────

function actionScore(action: GameAction, state: GameState, playerId: string, ttBestKey?: string): number {
  const key = getActionKey(action);
  if (ttBestKey && key === ttBestKey) return 10000;

  let score = 0;

  // Captures (targetId present)
  if ('targetId' in action && action.targetId) {
    const target = state.units[action.targetId];
    if (target) {
      score += 1000 - target.hp; // prefer low HP targets (easier to kill)
    }
  }

  // Moves: prefer moves toward enemies
  if (action.type === 'MOVE_UNIT' || (action.type === 'USE_ABILITY' && 'to' in action && action.to)) {
    const pos = 'to' in action ? action.to : action.type === 'MOVE_UNIT' ? (action as any).to : null;
    if (pos) {
      const myUnit = state.units[(action as any).unitId];
      if (myUnit) {
        const nearest = Object.values(state.units)
          .filter(u => u.owner !== playerId)
          .reduce((min, u) => Math.min(min, hexDistance(pos, u.position)), 99);
        score += Math.max(0, 50 - nearest * 10);
      }
    }
  }

  // Cards: prefer BUFF over DEBUFF
  if (action.type === 'USE_CARD') {
    const card = state.players[playerId]?.cardsInHand?.find(c => c === action.cardId);
    if (card) score += 200;
  }

  return score;
}

function sortActions(actions: GameAction[], state: GameState, playerId: string, hash: number, tt: Map<number, TTEntry>): void {
  const entry = tt.get(hash);
  const ttBestKey = entry?.bestAction ? getActionKey(entry.bestAction) : undefined;
  actions.sort((a, b) => actionScore(b, state, playerId, ttBestKey) - actionScore(a, state, playerId, ttBestKey));
}

// ─── Quiescence Search ─────────────────────────────────────────────

function quiescenceSearch(
  state: GameState, alpha: number, beta: number,
  playerId: string, weights: Weights, qDepth: number,
  tt: Map<number, TTEntry>
): number {
  const standPat = evaluate(state, playerId, weights);
  if (qDepth <= 0) return standPat;

  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const actions = getValidActions(state, playerId)
    .filter(a => (a as any).targetId || a.type === 'USE_CARD');

  if (actions.length === 0) return standPat;

  sortActions(actions, state, playerId, zobristHash(state, playerId), tt);

  for (const action of actions) {
    const sim = cloneState(state);
    const result = applyAction(sim, action);
    const nextPid = result.gamePhase === 'GAME' ? result.activePlayer : playerId;
    const score = -quiescenceSearch(result, -beta, -alpha, nextPid, weights, qDepth - 1, tt);

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ─── Alpha-Beta con TT ─────────────────────────────────────────────

async function alphaBeta(
  state: GameState, depth: number,
  alpha: number, beta: number,
  playerId: string, isMaximizing: boolean,
  weights: Weights, startTime: number, timeBudget: number,
  yieldCounter: { count: number },
  tt: Map<number, TTEntry>
): Promise<number> {
  // Yield every 20 nodes to let event loop process timers
  yieldCounter.count++;
  if (yieldCounter.count % 20 === 0) {
    await yieldEventLoop();
  }

  // Time check
  if (Date.now() - startTime > timeBudget * 0.95) return evaluate(state, playerId, weights);

  // Transposition table lookup
  const hash = zobristHash(state, playerId);
  const ttEntry = tt.get(hash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.score;
    if (ttEntry.flag === 'lowerbound' && ttEntry.score > alpha) alpha = ttEntry.score;
    if (ttEntry.flag === 'upperbound' && ttEntry.score < beta) beta = ttEntry.score;
    if (alpha >= beta) return ttEntry.score;
  }

  // Terminal or depth limit → quiescence
  if (depth === 0 || state.gamePhase === 'GAME_OVER') {
    const score = quiescenceSearch(state, alpha, beta, playerId, weights, 3, tt);
    tt.set(hash, { depth, score, flag: 'exact', bestAction: null });
    return score;
  }

  const actions = getSearchActions(state, playerId);
  if (actions.length === 0) {
    const score = evaluate(state, playerId, weights);
    tt.set(hash, { depth, score, flag: 'exact', bestAction: null });
    return score;
  }

  sortActions(actions, state, playerId, hash, tt);

  let bestAction: GameAction | null = null;
  let score: number;
  let flag: TTFlag = 'upperbound';
  const originalAlpha = alpha;

  if (isMaximizing) {
    score = -Infinity;
    for (const action of actions) {
      if (Date.now() - startTime > timeBudget * 0.95) break;
      const sim = cloneState(state);
      const result = applyAction(sim, action);
      const nextPid = result.gamePhase === 'GAME' ? result.activePlayer : playerId;
      const val = await alphaBeta(result, depth - 1, alpha, beta, nextPid, nextPid === playerId, weights, startTime, timeBudget, yieldCounter, tt);
      if (val > score) { score = val; bestAction = action; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) { flag = 'lowerbound'; break; }
    }
  } else {
    score = Infinity;
    for (const action of actions) {
      if (Date.now() - startTime > timeBudget * 0.95) break;
      const sim = cloneState(state);
      const result = applyAction(sim, action);
      const nextPid = result.gamePhase === 'GAME' ? result.activePlayer : playerId;
      const val = await alphaBeta(result, depth - 1, alpha, beta, nextPid, nextPid === playerId, weights, startTime, timeBudget, yieldCounter, tt);
      if (val < score) { score = val; bestAction = action; }
      if (score < beta) beta = score;
      if (alpha >= beta) { flag = 'lowerbound'; break; }
    }
  }

  if (alpha > originalAlpha && alpha < beta && flag !== 'lowerbound') flag = 'exact';
  tt.set(hash, { depth, score, flag, bestAction });

  return score;
}

// ─── Iterative Deepening ───────────────────────────────────────────

async function iterativeDeepening(
  state: GameState, playerId: string,
  maxDepth: number, timeBudgetMs: number, weights: Weights,
  tt: Map<number, TTEntry>
): Promise<GameAction> {
  const startTime = Date.now();
  let bestAction: GameAction = { type: 'END_TURN', playerId: playerId as any };
  let nodesSearched = 0;
  let depthCompleted = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Yield between depths to allow timer ticks
    await yieldEventLoop();

    if (Date.now() - startTime > timeBudgetMs * 0.8) break;

    // Time management: estimate if next depth has time to complete
    if (depthCompleted > 0 && nodesSearched > 100) {
      const elapsed = Date.now() - startTime;
      const avgTimePerNode = elapsed / nodesSearched;
      const estimatedNodes = nodesSearched * 2.5; // heuristic: branching factor ~2.5x per depth
      const estimatedTime = avgTimePerNode * estimatedNodes;
      if (estimatedTime > (timeBudgetMs - elapsed) * 1.5) {
        break; // not enough time for next depth
      }
    }

    const actions = getSearchActions(state, playerId);
    if (actions.length === 0) break;

    sortActions(actions, state, playerId, zobristHash(state, playerId), tt);

    let currentBest = actions[0];
    let depthNodes = 0;

    for (const action of actions) {
      if (Date.now() - startTime > timeBudgetMs * 0.85) break;
      const sim = cloneState(state);
      const result = applyAction(sim, action);
      const nextPid = result.gamePhase === 'GAME' ? result.activePlayer : playerId;

      const yieldCounter = { count: 0 };
      const score = await alphaBeta(
        result, depth - 1, -Infinity, Infinity,
        nextPid, nextPid === playerId,
        weights, startTime, timeBudgetMs,
        yieldCounter, tt
      );

      depthNodes++;
      nodesSearched++;

      if (score > -Infinity) {
        currentBest = action;
      }
    }

    bestAction = currentBest;
    depthCompleted = depth;
  }

  return bestAction;
}

// ─── MinimaxModel ──────────────────────────────────────────────────

export class MinimaxModel implements AIModel {
  readonly config: AIModelConfig;
  private tt: Map<number, TTEntry> = new Map();

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  async decide(state: GameState, playerId: string, timeBudgetMs?: number): Promise<GameAction> {
    const weights = this.config.weights ?? getWeights('medium');
    const budget = timeBudgetMs ?? this.config.timeLimitMs;
    const maxDepth = this.config.depth;
    this.tt = new Map(); // fresh for each decision

    return await iterativeDeepening(state, playerId, maxDepth, budget, weights, this.tt);
  }
}
