import type { StageConfig, CampaignObjective } from './campaignTypes';

export type CampaignProgress = Record<string, number>;

export interface CampaignStage {
  number: number;
  nameKey: string;
  descKey: string;
  storyKey?: string;
  config: StageConfig;
}

const STORAGE_KEY = 'shadowtactics_campaign_progress';

export const DEFAULT_PROGRESS: CampaignProgress = {
  monje_shaolin: 2,
  capitan_guardia: 1,
  francotirador: 4,
};

const GENERIC_STAGES: CampaignStage[] = [
  { number: 1, nameKey: 'campaign.stage1Name', descKey: 'campaign.stage1Desc', config: getDefaultStageConfig(1) },
  { number: 2, nameKey: 'campaign.stage2Name', descKey: 'campaign.stage2Desc', config: getDefaultStageConfig(2) },
  { number: 3, nameKey: 'campaign.stage3Name', descKey: 'campaign.stage3Desc', config: getDefaultStageConfig(3) },
  { number: 4, nameKey: 'campaign.stage4Name', descKey: 'campaign.stage4Desc', config: getDefaultStageConfig(4) },
  { number: 5, nameKey: 'campaign.stage5Name', descKey: 'campaign.stage5Desc', config: getDefaultStageConfig(5) },
];

function getDefaultStageConfig(stage: number): StageConfig {
  const alliesPerStage: Record<number, { archer: number; infantry: number; cavalry: number; lancer: number }> = {
    1: { archer: 1, infantry: 1, cavalry: 0, lancer: 0 },
    2: { archer: 1, infantry: 1, cavalry: 1, lancer: 1 },
    3: { archer: 2, infantry: 2, cavalry: 1, lancer: 1 },
    4: { archer: 2, infantry: 2, cavalry: 2, lancer: 2 },
    5: { archer: 3, infantry: 3, cavalry: 2, lancer: 2 },
  };

  const enemiesPerStage: Record<number, { archer: number; infantry: number; cavalry: number; lancer: number }> = {
    1: { archer: 1, infantry: 2, cavalry: 0, lancer: 0 },
    2: { archer: 2, infantry: 2, cavalry: 1, lancer: 1 },
    3: { archer: 2, infantry: 3, cavalry: 2, lancer: 1 },
    4: { archer: 3, infantry: 3, cavalry: 2, lancer: 2 },
    5: { archer: 3, infantry: 4, cavalry: 3, lancer: 2 },
  };

  const difficulties: StageConfig['difficulty'][] = [
    'cpu_facil', 'cpu_facil', 'cpu_medio', 'cpu_dificil', 'el_gran_general',
  ];

  const mainMission: Record<number, CampaignObjective> = {
    1: { id: 'main', type: 'main', condition: { type: 'eliminate_units', count: 2 }, descriptionKey: 'campaign.obj.eliminateCount' },
    2: { id: 'main', type: 'main', condition: { type: 'eliminate_general' }, descriptionKey: 'campaign.obj.eliminateGeneral' },
    3: { id: 'main', type: 'main', condition: { type: 'eliminate_all' }, descriptionKey: 'campaign.obj.eliminateAll' },
    4: { id: 'main', type: 'main', condition: { type: 'survive_turns', turns: 6 }, descriptionKey: 'campaign.obj.surviveTurns' },
    5: { id: 'main', type: 'main', condition: { type: 'eliminate_all' }, descriptionKey: 'campaign.obj.eliminateAll' },
  };

  const secondaryObjectives: Record<number, CampaignObjective[]> = {
    1: [
      { id: 'sec_scare', type: 'secondary', condition: { type: 'scare_enemies', hpThreshold: 30 }, descriptionKey: 'campaign.obj.scareEnemies' },
    ],
    2: [
      { id: 'sec_survive', type: 'secondary', condition: { type: 'survive_turns', turns: 5 }, descriptionKey: 'campaign.obj.surviveTurns' },
      { id: 'sec_scare', type: 'secondary', condition: { type: 'scare_enemies', hpThreshold: 30, unitClass: 'infantry' }, descriptionKey: 'campaign.obj.scareInfantry' },
    ],
    3: [
      { id: 'sec_eliminate', type: 'secondary', condition: { type: 'eliminate_units', count: 1, unitClass: 'cavalry' }, descriptionKey: 'campaign.obj.eliminateCavalry' },
    ],
    4: [
      { id: 'sec_eliminate', type: 'secondary', condition: { type: 'eliminate_units', count: 2 }, descriptionKey: 'campaign.obj.eliminateCountSec' },
    ],
    5: [
      { id: 'sec_survive', type: 'secondary', condition: { type: 'survive_turns', turns: 4 }, descriptionKey: 'campaign.obj.surviveTurnsSec' },
      { id: 'sec_scare', type: 'secondary', condition: { type: 'scare_enemies', hpThreshold: 25 }, descriptionKey: 'campaign.obj.scareEnemiesSec' },
    ],
  };

  const objectives = [mainMission[stage], ...(secondaryObjectives[stage] ?? [])];

  return {
    map: { shape: 'radius', radius: 5 },
    allies: alliesPerStage[stage],
    enemies: enemiesPerStage[stage],
    difficulty: difficulties[stage - 1],
    objectives,
    lossConditions: [{ type: 'general_killed' }, { type: 'all_units_killed' }],
    score: { base: 100, secondaryBonus: 50 },
  };
}

// Datos de campaña por identidad.
// Cada identidad tiene sus propias etapas con configuracion completa,
// incluyendo historia, mapa, unidades, objetivos y posiciones.
// Si una identidad no está registrada aquí, se usan las etapas genéricas.
export const CAMPAIGN_DATA: Record<string, { stages: CampaignStage[] }> = {
  monje_shaolin: {
    stages: [
      {
        number: 1,
        nameKey: 'campaign.monje_shaolin.stage1Name',
        descKey: 'campaign.monje_shaolin.stage1Desc',
        storyKey: 'campaign.monje_shaolin.stage1Story',
        config: {
          map: { shape: 'radius', radius: 3 },
          allies: { archer: 0, infantry: 0, cavalry: 0, lancer: 0 },
          enemies: { archer: 0, infantry: 2, cavalry: 0, lancer: 0 },
          difficulty: 'cpu_facil',
          objectives: [
            { id: 'main', type: 'main', condition: { type: 'scare_enemies', hpThreshold: 20 }, descriptionKey: 'campaign.obj.scareEnemies20' },
          ],
          lossConditions: [{ type: 'general_killed' }],
          score: { base: 100, secondaryBonus: 50 },
          maxAP: 3,
          positions: {
            playerGeneral: { q: -3, r: 0 },
            enemies: [{ q: -1, r: 0 }, { q: 0, r: -1 }],
          },
        },
      },
    ],
  },
};

export function getCampaignStages(identityKey: string): readonly CampaignStage[] {
  return CAMPAIGN_DATA[identityKey]?.stages ?? GENERIC_STAGES;
}

export function loadCampaignProgress(): CampaignProgress {
  const merged = { ...DEFAULT_PROGRESS };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: CampaignProgress = JSON.parse(saved);
      for (const [key, val] of Object.entries(parsed)) {
        merged[key] = val;
      }
    }
  } catch {}
  return merged;
}

export function saveCampaignProgress(progress: CampaignProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getCampaignStage(progress: CampaignProgress, identityKey: string): number {
  return progress[identityKey] ?? 0;
}

export function startCampaign(progress: CampaignProgress, identityKey: string): CampaignProgress {
  if (!progress[identityKey]) {
    return { ...progress, [identityKey]: 1 };
  }
  return progress;
}

export function advanceCampaign(progress: CampaignProgress, identityKey: string): CampaignProgress {
  const current = progress[identityKey] ?? 1;
  if (current >= 5) return progress;
  return { ...progress, [identityKey]: current + 1 };
}
