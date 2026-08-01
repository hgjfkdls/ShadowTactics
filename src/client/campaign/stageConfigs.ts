import type { CampaignStage } from './campaignConfig';
import type { StageConfig, StagePositions, HexCoord, ObjectiveCondition, CampaignObjective, NPCConfig } from './campaignTypes';

export function hex(q: number, r: number): HexCoord {
  return { q, r };
}

export function obj(
  id: string,
  type: 'main' | 'secondary',
  condition: ObjectiveCondition,
  descriptionKey: string,
): CampaignObjective {
  return { id, type, condition, descriptionKey };
}

export function mainObj(condition: ObjectiveCondition, descriptionKey: string): CampaignObjective {
  return obj('main', 'main', condition, descriptionKey);
}

export function pos(q: number, r: number): HexCoord {
  return { q, r };
}

export function fixedPositions(playerGeneral: HexCoord, enemies: HexCoord[], playerAllies?: HexCoord[], enemyGeneral?: HexCoord): StagePositions {
  return { playerGeneral, enemies, playerAllies, enemyGeneral };
}

export function secObj(id: string, condition: ObjectiveCondition, descriptionKey: string): CampaignObjective {
  return obj(id, 'secondary', condition, descriptionKey);
}

export function makeStageConfig(overrides: Partial<StageConfig>): StageConfig {
  return {
    map: { shape: 'radius', radius: 5 },
    allies: { archer: 1, infantry: 1, cavalry: 0, lancer: 0 },
    enemies: { archer: 1, infantry: 1, cavalry: 0, lancer: 0 },
    difficulty: 'cpu_medio',
    objectives: [mainObj({ type: 'eliminate_all' }, 'campaign.obj.eliminateAll')],
    lossConditions: [{ type: 'general_killed' }, { type: 'all_units_killed' }],
    score: { base: 100, secondaryBonus: 50 },
    ...overrides,
  };
}

export function makeStage(
  number: number,
  nameKey: string,
  descKey: string,
  configOverride: Partial<StageConfig> = {},
): CampaignStage {
  return {
    number,
    nameKey,
    descKey,
    config: makeStageConfig(configOverride),
  };
}

// Ejemplo: etapa 1 de Robin Hood con escolta, posiciones fijas y secundario
// export const ROBIN_HOOD_STAGE_1 = makeStage(1,
//   'campaign.robin_hood.stage1Name',
//   'campaign.robin_hood.stage1Desc',
//   {
//     map: { shape: 'radius', radius: 4, excludedHexes: [hex(0, 5)] },
//     allies: { archer: 2, infantry: 1, cavalry: 0, lancer: 0 },
//     enemies: { archer: 1, infantry: 2, cavalry: 0, lancer: 0 },
//     difficulty: 'cpu_facil',
//     objectives: [
//       mainObj({ type: 'escort', npcId: 'aldeano' }, 'campaign.robin_hood.obj1'),
//       secObj('sec_scare', { type: 'scare_enemies', hpThreshold: 30 }, 'campaign.robin_hood.obj1_sec'),
//     ],
//     npcs: [{ id: 'aldeano', unitClass: 'infantry', hp: 8, behavior: 'move_to_point', destination: hex(3, -2) }],
//     positions: fixedPositions(hex(-4, 0), [hex(-1, 1), hex(0, -1)], [hex(-2, 0)]),
//   },
// );
