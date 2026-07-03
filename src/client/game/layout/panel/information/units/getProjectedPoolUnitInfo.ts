import { CLASS_ABILITIES } from '@shared/game/data/abilities';
import { IDENTITY_EFFECTS } from '@shared/game/data/identities';
import { BASE_STATS } from '@shared/game/units';
import { getIdentityKey } from '../../../../../prep/identityData';

export function getProjectedPoolUnitInfo(
  cls: string,
  identityId: string | undefined
): { abilities: string[]; stats: { attack: number; hp: number; difficulty: number; range: number; movementCost: number } } {
  const baseAbilities = CLASS_ABILITIES[cls as keyof typeof CLASS_ABILITIES] ?? [];
  let abilities = [...baseAbilities];
  const base = BASE_STATS[cls as keyof typeof BASE_STATS];
  const stats = { attack: base.attack, hp: base.hp, difficulty: base.difficulty, range: base.range, movementCost: base.movementCost };

  if (!identityId) return { abilities, stats };

  const key = getIdentityKey(identityId);
  const effect = IDENTITY_EFFECTS[key];
  if (!effect) return { abilities, stats };

  if (cls === 'general') {
    const overrideAbilities = effect.abilitiesOverride ?? CLASS_ABILITIES[effect.unitClassOverride];
    abilities = [...overrideAbilities];
    if (effect.copyStats) {
      const overrideStats = BASE_STATS[effect.unitClassOverride];
      const toCopy = effect.statsToCopy ?? (['range', 'movementCost', 'difficulty'] as const);
      for (const s of toCopy) {
        stats[s] = overrideStats[s];
      }
    }
  }

  if (key === 'robin_hood' && (cls === 'archer' || cls === 'general')) {
    stats.movementCost = 1;
  }
  if (key === 'caballos_guerra' && cls === 'cavalry') {
    abilities = abilities.map(a => a === 'cabalgar' ? 'cabalgar_2' : a);
  }

  return { abilities, stats };
}
