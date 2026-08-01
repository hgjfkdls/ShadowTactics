import type { GameState, PlayerId, HexCoord } from './state';
import { createUnit } from './units';
import { applyIdentityEffects } from './phases/identity-apply';
import { getIdentityKey } from './data/identities';
import { applyTurnStart } from './phases/turn';
import { buildEffectDeck, buildIdentityDeck } from './actions/card';

interface CampaignUnitDef {
  unitId: string;
  unitClass: 'archer' | 'infantry' | 'cavalry' | 'lancer' | 'general';
  position: HexCoord;
}

interface CampaignInitConfig {
  identityKey: string;
  identityCardId: string;
  playerUnits: CampaignUnitDef[];
  enemyUnits: CampaignUnitDef[];
  mapRadius: number;
  maxAP?: number;
  seed?: number;
}

let nextUnitIdCounter = 100;

function nextUnitId(prefix: string): string {
  return `${prefix}_${nextUnitIdCounter++}`;
}

export function createCampaignInitialState(config: CampaignInitConfig): GameState {
  const s = config.seed ?? Date.now();
  const { deck: effectDeck, seed: deckSeed } = buildEffectDeck(s);
  const { deck: identityDeck } = buildIdentityDeck(deckSeed);

  const p1Units: Record<string, import('./state').Unit> = {};
  const p2Units: Record<string, import('./state').Unit> = {};

  for (const def of config.playerUnits) {
    const uid = def.unitId || nextUnitId('p1');
    p1Units[uid] = createUnit(uid, 'p1', def.position, def.unitClass as any);
  }

  for (const def of config.enemyUnits) {
    const uid = def.unitId || nextUnitId('p2');
    p2Units[uid] = createUnit(uid, 'p2', def.position, def.unitClass as any);
  }

  const allUnits: Record<string, import('./state').Unit> = { ...p1Units, ...p2Units };

  // Todas las unidades miran al general enemigo
  const p1Gen = Object.values(p1Units).find(u => u.class === 'general');
  const p2Gen = Object.values(p2Units).find(u => u.class === 'general');

  for (const id of Object.keys(allUnits)) {
    const u = allUnits[id];
    const enemyGen = u.owner === 'p1' ? p2Gen : p1Gen;
    if (enemyGen) {
      allUnits[id] = { ...u, direction: { ...enemyGen.position } };
    }
  }

  const state: GameState = {
    turn: 1,
    activePlayer: 'p1',

    gamePhase: 'GAME',
    preparationPhase: 'DONE',
    turnPhase: 'MAIN',

    map: { radius: config.mapRadius },
    centerHex: { q: 0, r: 0 },

    units: allUnits,
    graveyard: {},

    rngSeed: deckSeed,

    players: {
      p1: {
        actionPoints: 0,
        carryOver: 0,
        lastAcknowledgedIndex: -1,
        flags: [],
        cardsInHand: [],
        identityCards: [config.identityCardId],
        selectedIdentity: config.identityCardId,
        revealedIdentity: true,
      },
      p2: {
        actionPoints: 0,
        carryOver: 0,
        lastAcknowledgedIndex: -1,
        flags: [],
        cardsInHand: [],
        identityCards: identityDeck.slice(0, 1),
        selectedIdentity: identityDeck[0],
        revealedIdentity: true,
      },
    },

    diceRolls: { p1: undefined, p2: undefined },
    deploymentOrder: undefined,
    currentDeployingPlayer: undefined,
    deploymentStep: 0,
    deploymentCount: 0,

    effectDeck,
    effectDiscard: [],
    identityDeck: identityDeck.slice(1),

    activeModifiers: [],
    nextModifierId: 1,
    lastCardAction: undefined,
    gameHistory: [],
    nextHistoryId: 1,
    attackResults: [],
    gameStartTime: Date.now(),
    campaignMaxAP: config.maxAP,
    campaignMode: true,
  };

  // Aplicar identidad al jugador 1
  const identityState = applyIdentityEffects(state);

  // Direcciones: mirar al general enemigo después de aplicar identidad
  const p1GenAfter = Object.values(identityState.units).find(u => u.owner === 'p1' && u.class === 'general');
  const p2GenAfter = Object.values(identityState.units).find(u => u.owner === 'p2' && u.class === 'general');
  const finalUnits = { ...identityState.units };
  for (const id of Object.keys(finalUnits)) {
    const u = finalUnits[id];
    const enemyGen = u.owner === 'p1' ? p2GenAfter : p1GenAfter;
    if (enemyGen) {
      finalUnits[id] = { ...u, direction: { ...enemyGen.position } };
    }
  }

  const finalState = { ...identityState, units: finalUnits };

  // Aplicar turn start para que p1 tenga AP, cartas, pasivas, etc.
  return applyTurnStart(finalState, 'p1');
}
