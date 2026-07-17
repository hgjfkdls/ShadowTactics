import type { GameState, GameAction } from '@shared';
import { generateHexMap, isWithinBounds } from '@shared';
import { isHexOccupied } from '@shared/game';
import type { Difficulty } from './types';

function getIdentityScore(cardId: string): 'archer' | 'cavalry' | 'infantry' | 'lancer' | 'general' {
  const name = cardId.toLowerCase();
  if (name.includes('robin') || name.includes('francotirador')) return 'archer';
  if (name.includes('caballos') || name.includes('cazadores') || name.includes('guerra')) return 'cavalry';
  if (name.includes('dios') || name.includes('capitan') || name.includes('guardia')) return 'infantry';
  if (name.includes('punta') || name.includes('espartano')) return 'lancer';
  return 'general';
}

export function decideIdentity(state: GameState, playerId: string, _difficulty?: Difficulty): GameAction {
  const cards = state.players[playerId]?.identityCards ?? [];
  if (cards.length === 0) return { type: 'SELECT_IDENTITY', playerId, cardId: '' };

  const deployedClasses = Object.values(state.units)
    .filter(u => u.owner === playerId)
    .map(u => u.class);

  const classCounts: Record<string, number> = { archer: 0, cavalry: 0, infantry: 0, lancer: 0, general: 0 };
  for (const cls of deployedClasses) classCounts[cls] = (classCounts[cls] ?? 0) + 1;

  // At early deployment, no units deployed yet — choose balanced
  const totalDeployed = deployedClasses.length;
  if (totalDeployed === 0) {
    return { type: 'SELECT_IDENTITY', playerId, cardId: cards[0] };
  }

  // Score each identity by how well it fits the current army composition
  let bestCard = cards[0];
  let bestScore = -1;

  for (const cardId of cards) {
    const idType = getIdentityScore(cardId);
    let score = 1;
    if (idType === 'archer' && classCounts.archer > 0) score += 2;
    if (idType === 'cavalry' && classCounts.cavalry > 0) score += 2;
    if (idType === 'infantry' && classCounts.infantry > 0) score += 2;
    if (idType === 'lancer' && classCounts.lancer > 0) score += 2;
    if (idType === 'general') score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestCard = cardId;
    }
  }

  return { type: 'SELECT_IDENTITY', playerId, cardId: bestCard };
}

export function decideRoll(_state: GameState, playerId: string): GameAction {
  return { type: 'ROLL_DICE', playerId };
}

export function decideDeploy(state: GameState, playerId: string, difficulty: Difficulty): GameAction | null {
  const toDeploy = state.players[playerId]?.unitsToDeploy;
  if (!toDeploy || toDeploy.length === 0) return null;

  const entry = toDeploy[0];
  const opponent = playerId === 'p1' ? 'p2' : 'p1';

  const allHexes = generateHexMap(state.map).filter(h =>
    isWithinBounds(h, state.map.radius) && !isHexOccupied(state, h)
  );

  // If general not deployed and this unit can be, prioritize
  const allDeployed = Object.values(state.units).filter(u => u.owner === playerId);
  const hasGeneralDeployed = allDeployed.some(u => u.class === 'general');

  // Score hexes
  let bestHex = allHexes[0];
  let bestScore = -Infinity;

  for (const hex of allHexes) {
    let score = 0;

    // Prefer deployment zone (center area)
    const distFromCenter = Math.abs(hex.q) + Math.abs(hex.r);
    score -= distFromCenter * 0.1;

    // Prefer being near friendly units (formation)
    for (const ally of allDeployed) {
      const d = Math.abs(hex.q - ally.position.q) + Math.abs(hex.r - ally.position.r) + Math.abs(hex.q + hex.r - ally.position.q - ally.position.r);
      if (d <= 3) score += 0.2;
      if (d <= 1) score += 0.3;
    }

    // Avoid clustering too much
    for (const ally of allDeployed) {
      const d = Math.abs(hex.q - ally.position.q) + Math.abs(hex.r - ally.position.r) + Math.abs(hex.q + hex.r - ally.position.q - ally.position.r);
      if (d === 0) score -= 5;
    }

    // Avoid enemy proximity
    for (const enemy of Object.values(state.units).filter(u => u.owner === opponent)) {
      const d = Math.abs(hex.q - enemy.position.q) + Math.abs(hex.r - enemy.position.r) + Math.abs(hex.q + hex.r - enemy.position.q - enemy.position.r);
      if (d <= 2) score -= 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestHex = hex;
    }
  }

  return {
    type: 'DEPLOY_UNIT',
    playerId,
    unitId: entry.unitId,
    position: bestHex,
  };
}
