import type { GameState, GameAction } from '@shared';
import { getModel } from './models/registry';
import { registerPresets } from './models/presets';
import { decideIdentity, decideRoll } from './preparation';

let presetsRegistered = false;

function ensurePresets(): void {
  if (!presetsRegistered) {
    registerPresets();
    presetsRegistered = true;
  }
}

export async function decideAI(modelId: string, state: GameState, playerId: string, timeBudgetMs?: number): Promise<GameAction> {
  ensurePresets();

  if (state.gamePhase === 'PREPARATION') {
    const prepPhase = state.preparationPhase;
    if (prepPhase === 'IDENTITY_SELECTION') return decideIdentity(state, playerId);
    if (prepPhase === 'ROLL') return decideRoll(state, playerId);
    return { type: 'END_TURN', playerId: playerId as any };
  }

  if (state.gamePhase !== 'GAME') {
    return { type: 'END_TURN', playerId: playerId as any };
  }

  const model = getModel(modelId);
  if (!model) {
    console.warn(`[AI] Unknown model "${modelId}", falling back to cpu_medio`);
    const fallback = getModel('cpu_medio');
    if (fallback) return await fallback.decide(state, playerId, timeBudgetMs);
    return { type: 'END_TURN', playerId: playerId as any };
  }

  return await model.decide(state, playerId, timeBudgetMs);
}
