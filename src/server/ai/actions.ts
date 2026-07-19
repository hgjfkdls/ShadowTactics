import type { GameState, GameAction, HexCoord } from '@shared';
import { hexDistance, hexNeighbors, isWithinBounds } from '@shared';
import { isHexOccupied, applyAction } from '@shared/game';
import type { Unit } from '@shared/game/state';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { getCardType } from '@shared/game/actions/card';

function isUnitBlocked(state: GameState, unitId: string): boolean {
  return state.activeModifiers.some(
    m => m.stat === 'bloqueo' && (m.targetId === unitId) && m.remainingTurns > 0 && (m.remainingUses === undefined || m.remainingUses > 0)
  );
}

function canUnitMakeBasicAttack(unit: Unit): boolean {
  return !unit.flags?.includes('basic_attack') && !unit.flags?.includes('performed_action');
}

function canUnitMove(unit: Unit): boolean {
  return !unit.flags?.includes('move') && !unit.flags?.includes('performed_action');
}

function getCardTargets(state: GameState, playerId: string, cardId: string): string[] {
  const cardType = getCardType(cardId);
  if (cardType === 'BUFF') {
    return Object.values(state.units).filter(u => u.owner === playerId).map(u => u.id);
  }
  if (cardType === 'DEBUFF') {
    const opponent = playerId === 'p1' ? 'p2' : 'p1';
    return Object.values(state.units).filter(u => u.owner === opponent).map(u => u.id);
  }
  return [];
}

function getMovementActions(state: GameState, playerId: string, unit: Unit, ap: number): GameAction[] {
  const result: GameAction[] = [];
  if (!canUnitMove(unit)) return result;
  const moveCost = unit.movementCost;
  if (moveCost > ap) return result;
  for (const hex of hexNeighbors(unit.position)) {
    if (!isWithinBounds(hex, state.map.radius)) continue;
    if (isHexOccupied(state, hex)) continue;
    result.push({
      type: 'USE_ABILITY',
      playerId: playerId as any,
      unitId: unit.id,
      abilityId: 'movimiento',
      to: hex,
      path: [hex],
    });
  }
  return result;
}

function getBasicAttackActions(state: GameState, playerId: string, unit: Unit, ap: number): GameAction[] {
  const result: GameAction[] = [];
  if (!canUnitMakeBasicAttack(unit)) return result;
  const atkCost = 1;
  if (atkCost > ap) return result;
  const opponent = playerId === 'p1' ? 'p2' : 'p1';
  let range = unit.range;
  for (const mod of state.activeModifiers) {
    if (mod.targetId === unit.id && mod.stat === 'range') {
      if (mod.operator === 'ADD') range += mod.value;
      else if (mod.operator === 'SET') range = mod.value;
    }
  }
  for (const target of Object.values(state.units).filter(u => u.owner === opponent)) {
    if (hexDistance(unit.position, target.position) <= range) {
      result.push({
        type: 'USE_ABILITY',
        playerId: playerId as any,
        unitId: unit.id,
        abilityId: 'ataque_basico',
        targetId: target.id,
      });
    }
  }
  return result;
}

function canUseAbility(unit: Unit, abilityId: string): boolean {
  const config = ABILITY_CONFIG[abilityId] as any;
  if (!config || config.type === 'passive') return false;
  if (config.activation?.whenAttack || config.activation?.whenAttacked) return false;
  if (config.activation?.blockFlags?.some((f: string) => unit.flags?.includes(f))) return false;
  if (config.activation?.requireFlags?.some((f: string) => !unit.flags?.includes(f))) return false;
  return true;
}

function getOtherAbilityActions(state: GameState, playerId: string, unit: Unit): GameAction[] {
  const result: GameAction[] = [];
  const opponent = playerId === 'p1' ? 'p2' : 'p1';
  for (const abilityId of (unit.abilities ?? [])) {
    if (abilityId === 'movimiento' || abilityId === 'ataque_basico') continue;
    if (!canUseAbility(unit, abilityId)) continue;
    const config = ABILITY_CONFIG[abilityId] as any;
    if (config.targetType === 'self') {
      result.push({ type: 'USE_ABILITY', playerId: playerId as any, unitId: unit.id, abilityId });
    }
    if (config.targetType === 'ally') {
      const baseRange = typeof config.range === 'object' ? config.range?.value ?? 1 : 1;
      for (const ally of Object.values(state.units).filter(u => u.owner === playerId && u.id !== unit.id)) {
        if (hexDistance(unit.position, ally.position) <= baseRange) {
          result.push({ type: 'USE_ABILITY', playerId: playerId as any, unitId: unit.id, abilityId, targetId: ally.id });
        }
      }
    }
    if (config.targetType === 'enemy' || config.type === 'attack') {
      const baseRange = typeof config.range === 'object' ? config.range?.value ?? unit.range : unit.range;
      for (const enemy of Object.values(state.units).filter(u => u.owner === opponent)) {
        if (hexDistance(unit.position, enemy.position) <= baseRange) {
          result.push({ type: 'USE_ABILITY', playerId: playerId as any, unitId: unit.id, abilityId, targetId: enemy.id });
        }
      }
    }
    if (config.targetType === 'position') {
      for (const hex of hexNeighbors(unit.position)) {
        if (!isWithinBounds(hex, state.map.radius)) continue;
        if (isHexOccupied(state, hex)) continue;
        result.push({ type: 'USE_ABILITY', playerId: playerId as any, unitId: unit.id, abilityId, to: hex, path: [hex] });
      }
    }
  }
  return result;
}

function getCardActions(state: GameState, playerId: string): GameAction[] {
  const result: GameAction[] = [];
  for (const cardId of (state.players[playerId]?.cardsInHand ?? [])) {
    const targets = getCardTargets(state, playerId, cardId);
    for (const targetId of targets) {
      result.push({ type: 'USE_CARD', playerId: playerId as any, cardId, targetId });
    }
  }
  return result;
}

export function getAllValidActions(state: GameState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];

  if (state.turnPhase === 'COUNTER') {
    const counterCards = (state.players[playerId]?.cardsInHand ?? []).filter(c => getCardType(c) === 'COUNTER');
    for (const cardId of counterCards) {
      actions.push({ type: 'USE_CARD', playerId: playerId as any, cardId });
    }
    actions.push({ type: 'PASS_COUNTER', playerId: playerId as any });
    return actions;
  }

  if (state.turnPhase === 'DRAW' && (state.players[playerId]?.cardsInHand?.length ?? 0) > 3) {
    for (const cardId of (state.players[playerId]?.cardsInHand ?? [])) {
      actions.push({ type: 'DISCARD_CARD', playerId: playerId as any, cardId });
    }
    return actions;
  }

  if (state.turnPhase !== 'MAIN') {
    actions.push({ type: 'END_TURN', playerId: playerId as any });
    return actions;
  }

  if (state.players[playerId]?.pendingIdentityTarget) {
    const opponent = playerId === 'p1' ? 'p2' : 'p1';
    const targets = Object.values(state.units).filter(u => u.owner === opponent && u.class !== 'general');
    for (const t of targets) {
      actions.push({ type: 'IDENTITY_ABILITY', playerId: playerId as any, targetId: t.id });
    }
    return actions;
  }

  if (state.players[playerId]?.pendingEspartanoChoice) {
    actions.push({ type: 'ESPARTANO_CHOICE', playerId: playerId as any, choice: 'defense' });
    return actions;
  }

  if (state.players[playerId]?.pendingPlanBatalla) {
    actions.push({ type: 'COMANDANTE_CHOICE', playerId: playerId as any, choice: 'attack' });
    return actions;
  }

  actions.push({ type: 'END_TURN', playerId: playerId as any });

  const playerUnits = Object.values(state.units).filter(u => u.owner === playerId);
  const ap = state.players[playerId]?.actionPoints ?? 0;

  for (const unit of playerUnits) {
    if (isUnitBlocked(state, unit.id)) continue;
    actions.push(...getMovementActions(state, playerId, unit, ap));
    actions.push(...getBasicAttackActions(state, playerId, unit, ap));
    actions.push(...getOtherAbilityActions(state, playerId, unit));
  }

  actions.push(...getCardActions(state, playerId));

  return actions;
}

export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

export function getValidActions(state: GameState, playerId: string): GameAction[] {
  const allActions = getAllValidActions(state, playerId);
  const valid: GameAction[] = [];
  for (const action of allActions) {
    const sim = cloneState(state);
    const result = applyAction(sim, action);
    // Check if action actually changed the state
    const apBefore = state.players[playerId]?.actionPoints ?? 0;
    const apAfter = result.players[playerId]?.actionPoints ?? 0;
    if (apBefore !== apAfter || result !== sim) {
      valid.push(action);
    }
  }
  // END_TURN is always valid
  if (allActions.some(a => a.type === 'END_TURN') && !valid.some(a => a.type === 'END_TURN')) {
    valid.push({ type: 'END_TURN', playerId: playerId as any });
  }
  return valid;
}
