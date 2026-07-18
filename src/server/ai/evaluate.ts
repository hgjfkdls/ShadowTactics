import type { GameState, HexCoord } from '@shared';
import { hexDistance } from '@shared';
import type { Weights, Difficulty } from './types';
import { cloneState } from './actions';
import { createUnit } from '@shared/game/units/factory';

const PIECE_VALUE: Record<string, number> = {
  general: 100, archer: 30, infantry: 20, cavalry: 25, lancer: 25,
};

function getBaseHp(cls: string): number {
  const hpMap: Record<string, number> = {
    archer: 12, infantry: 16, cavalry: 14, lancer: 14, general: 20,
  };
  return hpMap[cls] ?? 12;
}

export const PRIORITIES: Record<Difficulty, Weights> = {
  easy:   { hp: 1.5, kill: 0.5, pos: 0.3, dmg: 0.3, ap: 0.1, card: 0.2, formation: 0.1 },
  medium: { hp: 1.0, kill: 1.0, pos: 0.6, dmg: 0.6, ap: 0.3, card: 0.4, formation: 0.3 },
  hard:   { hp: 1.0, kill: 1.5, pos: 1.0, dmg: 0.8, ap: 0.5, card: 0.5, formation: 0.5 },
};

export function getWeights(difficulty: Difficulty): Weights {
  return PRIORITIES[difficulty];
}

function hasModifier(state: GameState, targetId: string | undefined, stat: string): boolean {
  return state.activeModifiers.some(
    m => m.stat === stat && (!m.targetId || m.targetId === targetId) && m.remainingTurns > 0 && (m.remainingUses === undefined || m.remainingUses > 0)
  );
}

export function evaluate(state: GameState, playerId: string, w: Weights): number {
  if (state.gamePhase === 'GAME_OVER') {
    if (state.winner === playerId) return 10000;
    return -10000;
  }

  const opponent = playerId === 'p1' ? 'p2' : 'p1';
  let score = 0;

  const myUnits = Object.values(state.units).filter(u => u.owner === playerId);
  const oppUnits = Object.values(state.units).filter(u => u.owner === opponent);

  // ── 1. HP advantage ──
  const myHp = myUnits.reduce((s, u) => s + u.hp, 0);
  const oppHp = oppUnits.reduce((s, u) => s + u.hp, 0);
  const myMaxHp = myUnits.reduce((s, u) => s + getBaseHp(u.class), 0);
  const oppMaxHp = oppUnits.reduce((s, u) => s + getBaseHp(u.class), 0);
  const hpRatio = myHp + oppHp > 0 ? (myHp - oppHp) / (myHp + oppHp) : 0;
  score += w.hp * hpRatio;

  // ── 1b. Piece value advantage ──
  let myPieceScore = 0;
  let oppPieceScore = 0;
  for (const u of myUnits) myPieceScore += (PIECE_VALUE[u.class] ?? 20) * (u.hp / getBaseHp(u.class));
  for (const u of oppUnits) oppPieceScore += (PIECE_VALUE[u.class] ?? 20) * (u.hp / getBaseHp(u.class));
  const pieceRatio = (myPieceScore + oppPieceScore) > 0 ? (myPieceScore - oppPieceScore) / (myPieceScore + oppPieceScore) : 0;
  score += w.hp * 0.5 * pieceRatio;

  // ── 2. Unit count advantage ──
  const unitCountRatio = (myUnits.length - oppUnits.length) / (myUnits.length + oppUnits.length + 1);
  score += w.hp * 0.3 * unitCountRatio;

  // ── 3. Graveyard tracking ──
  const myDead = Object.values(state.graveyard).filter(u => u.owner === playerId).length;
  const oppDead = Object.values(state.graveyard).filter(u => u.owner === opponent).length;
  const deadDiff = oppDead - myDead; // positive = we killed more
  score += w.kill * 0.3 * Math.tanh(deadDiff * 0.5);

  // ── 4. General HP safety ──
  const myGeneral = myUnits.find(u => u.class === 'general');
  const oppGeneral = oppUnits.find(u => u.class === 'general');
  if (myGeneral) {
    const genRatio = myGeneral.hp / getBaseHp('general');
    score += w.hp * 0.5 * (genRatio - 0.5); // bonus for healthy general, penalty for hurt
  }
  if (oppGeneral && myUnits.length > 0) {
    // Bonus for having units near enemy general (kill threat)
    const nearGeneral = myUnits.some(u => hexDistance(u.position, oppGeneral.position) <= u.range);
    if (nearGeneral && oppGeneral.hp <= 4) score += w.kill * 0.5;
  }

  // ── 5. Kill potential with counterattack risk ──
  const attackers = myUnits.filter(u => !u.flags?.includes('basic_attack'));
  for (const atk of attackers) {
    for (const def of oppUnits) {
      const dist = hexDistance(atk.position, def.position);
      if (dist > atk.range) continue;
      // Can kill?
      if (def.hp <= atk.attack) {
        // Check counterattack risk
        const canCounter = def.range >= dist;
        if (!canCounter) {
          score += w.kill * 0.6; // safe kill
        } else {
          score += w.kill * 0.2; // risky kill (will be counterattacked)
        }
      }
    }
  }

  // ── 6. Positional (all classes) ──
  for (const myUnit of myUnits) {
    const dists = oppUnits.map(u => hexDistance(myUnit.position, u.position));
    const nearest = dists.length > 0 ? Math.min(...dists) : 99;

    switch (myUnit.class) {
      case 'archer':
        // Archers want distance
        score += w.pos * (nearest > myUnit.range ? 0.1 : -0.1);
        break;
      case 'general':
        // Generals want protection
        const allyNear = myUnits.some(u => u.id !== myUnit.id && hexDistance(myUnit.position, u.position) <= 2);
        score += w.pos * (nearest > 2 ? 0.1 : -0.1);
        if (allyNear) score += w.pos * 0.05;
        break;
      case 'infantry':
        // Melee wants to be close (1 hex)
        score += w.pos * (nearest <= 1 ? 0.08 : nearest <= 2 ? 0.03 : -0.05);
        break;
      case 'lancer':
        // Lancer wants formation (near allies, close to enemy)
        const allyAdj = myUnits.some(u => u.id !== myUnit.id && hexDistance(myUnit.position, u.position) === 1);
        score += w.pos * (nearest <= 1 ? 0.08 : -0.03);
        if (allyAdj) score += w.pos * 0.05;
        break;
      case 'cavalry':
        // Cavalry wants flanks (range 2-3 from enemy, not adjacent)
        score += w.pos * (nearest === 2 ? 0.08 : nearest === 1 ? -0.05 : nearest >= 3 ? -0.03 : 0);
        break;
    }
  }

  // ── 7. Formation evaluation ──
  let formations = 0;
  for (const unit of myUnits) {
    // Line formation: 3+ units in a straight line (same q or same r or same q+r)
    const aligned = myUnits.filter(u => u.id !== unit.id &&
      (u.position.q === unit.position.q || u.position.r === unit.position.r ||
       u.position.q + u.position.r === unit.position.q + unit.position.r) &&
      hexDistance(unit.position, u.position) <= 3);
    if (aligned.length >= 2) formations += 0.1;

    // Adjacent formation: 3+ units mutually adjacent
    const adjacent = myUnits.filter(u => u.id !== unit.id && hexDistance(unit.position, u.position) === 1);
    if (adjacent.length >= 2) formations += 0.05;
  }
  score += w.formation * Math.min(formations, 1);

  // ── 8. Active modifiers (debuffs/buffs) ──
  for (const unit of myUnits) {
    if (hasModifier(state, unit.id, 'bloqueo')) score -= w.pos * 0.2;
    if (hasModifier(state, unit.id, 'inmovil')) score -= w.pos * 0.15;
    if (hasModifier(state, unit.id, 'passiveDamage')) score -= w.hp * 0.1; // DoT
    if (hasModifier(state, unit.id, 'defense')) score += w.hp * 0.05; // buffed
    if (hasModifier(state, unit.id, 'attack')) score += w.kill * 0.05; // buffed
  }
  for (const unit of oppUnits) {
    if (hasModifier(state, unit.id, 'bloqueo')) score += w.pos * 0.2;
    if (hasModifier(state, unit.id, 'inmovil')) score += w.pos * 0.15;
    if (hasModifier(state, unit.id, 'defense')) score -= w.kill * 0.05;
    if (hasModifier(state, unit.id, 'attack')) score -= w.hp * 0.05;
  }

  // ── 9. AP efficiency with carry-over ──
  const ap = state.players[playerId]?.actionPoints ?? 0;
  if (ap > 0) {
    const carryOver = Math.floor(ap / 2);
    const wasted = ap - carryOver; // AP that will be lost
    score -= w.ap * 0.08 * wasted;
  }

  // ── 10. Card advantage ──
  const myCards = state.players[playerId]?.cardsInHand?.length ?? 0;
  const oppCards = state.players[opponent]?.cardsInHand?.length ?? 0;
  score += w.card * Math.tanh((myCards - oppCards) * 0.3);

  return score;
}

export function evaluateDeployPosition(
  state: GameState, playerId: string,
  unitId: string, unitClass: string, hex: HexCoord
): number {
  const sim = cloneState(state);
  sim.units[unitId] = createUnit(unitId, playerId, hex, unitClass);

  // Remove this unit from unitsToDeploy
  const newPlayers = { ...sim.players };
  const pl = { ...newPlayers[playerId] };
  if (pl.unitsToDeploy) {
    pl.unitsToDeploy = pl.unitsToDeploy.filter((e: any) => e.unitId !== unitId);
  }
  newPlayers[playerId] = pl;
  sim.players = newPlayers;

  const weights = getWeights('medium');
  let score = evaluate(sim, playerId, weights);

  // Bonus por cercania a aliados (formacion)
  const allies = Object.values(sim.units).filter(u => u.owner === playerId && u.id !== unitId);
  for (const ally of allies) {
    const d = hexDistance(hex, ally.position);
    if (d === 1) score += 0.1;
    if (d === 0) score -= 0.3;
  }

  // Bonus por cercania al general
  const general = allies.find(u => u.class === 'general');
  if (general) {
    const d = hexDistance(hex, general.position);
    if (d <= 2) score += 0.2;
  }

  // Bonus posicional por clase
  const nearestEnemy = Object.values(sim.units)
    .filter(u => u.owner !== playerId)
    .reduce((min: number, u) => Math.min(min, hexDistance(hex, u.position)), 99);

  if (unitClass === 'archer' && nearestEnemy > 3) score += 0.15;
  if (unitClass === 'cavalry' && nearestEnemy >= 2 && nearestEnemy <= 3) score += 0.1;

  return score;
}
