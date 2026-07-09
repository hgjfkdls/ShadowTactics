import type { GameState } from '../state';
import { BASE_STATS } from '../units';
import { CLASS_ABILITIES } from '../data/abilities';
import { IDENTITY_EFFECTS, getIdentityKey } from '../data/identities';
import { AURA_CONFIG } from '../aura';

function isArcherOrGeneral(cls: string): boolean {
  return cls === 'archer' || cls === 'general';
}

export function applyIdentityEffects(state: GameState): GameState {
  let units = { ...state.units };

  for (const [playerId, player] of Object.entries(state.players)) {
    if (!player.selectedIdentity) continue;

    const key = getIdentityKey(player.selectedIdentity);
    const effect = IDENTITY_EFFECTS[key];
    if (!effect) continue;

    // 1. Class override — general gets the identity's abilities and optionally its stats
    const generalId = Object.keys(units).find(
      uid => units[uid].owner === playerId && units[uid].class === 'general'
    );
    if (generalId) {
      const general = units[generalId];
      const abilities = effect.abilitiesOverride ?? CLASS_ABILITIES[effect.unitClassOverride];

      if (effect.copyStats) {
        const overrideStats = BASE_STATS[effect.unitClassOverride];
        const toCopy = effect.statsToCopy ?? ['range', 'movementCost', 'difficulty'];
        const statOverrides: Record<string, number> = {};
        for (const s of toCopy) statOverrides[s] = overrideStats[s];
        units[generalId] = {
          ...general,
          abilities: [...abilities],
          ...statOverrides,
        };
      } else {
        units[generalId] = {
          ...general,
          abilities: [...abilities],
        };
      }
    }

    // 2. Identity-specific global effects
    for (const [uid, unit] of Object.entries(units)) {
      if (unit.owner !== playerId) continue;

      if (key === 'robin_hood' && isArcherOrGeneral(unit.class)) {
        units[uid] = {
          ...unit,
          movementCost: 1,
          abilities: unit.abilities ?? [],
        };
      } else if (key === 'francotirador' && isArcherOrGeneral(unit.class)) {
        units[uid] = {
          ...unit,
          abilities: [...new Set([...(unit.abilities ?? []), 'tiro_a_distancia'])],
        };
      } else if (key === 'dios_trueno' && (unit.class === 'infantry' || unit.class === 'general')) {
        units[uid] = {
          ...unit,
          abilities: [...new Set([...(unit.abilities ?? []), 'furia_berserker'])],
        };
      } else if (key === 'cazadores' && (unit.class === 'cavalry' || unit.class === 'general')) {
        units[uid] = {
          ...unit,
          abilities: [...new Set([...(unit.abilities ?? []), 'acechar', 'hostigar'])],
        };
      } else if (key === 'caballos_guerra' && unit.class === 'cavalry') {
        units[uid] = {
          ...unit,
          abilities: unit.abilities?.map(a => a === 'cabalgar' ? 'cabalgar_2' : a) ?? [],
        };
      } else if (key === 'monje_shaolin' && unit.class === 'general') {
        // Monje Shaolin: performed_action tracking starts clear
        units[uid] = {
          ...unit,
          abilities: [...(unit.abilities ?? []), 'meditacion_2'],
          flags: [],
        };
      }
    }

    // 3. Player-level identity tracking
    if (key === 'caballos_guerra') {
      state = {
        ...state,
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], aLaCargaCost: 0 },
        },
      };
    }
  }

  // Aura de mando: dificultad base del general sube a 7
  if (AURA_CONFIG.isActive) {
    for (const [uid, u] of Object.entries(units)) {
      if (u.class === 'general') {
        units[uid] = { ...u, difficulty: 7 };
      }
    }
  }

  return { ...state, units };
}
