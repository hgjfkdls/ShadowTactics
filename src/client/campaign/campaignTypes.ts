export type HexCoord = { q: number; r: number };

export type UnitClass = 'archer' | 'infantry' | 'cavalry' | 'lancer';

export type Difficulty = 'cpu_facil' | 'cpu_medio' | 'cpu_dificil' | 'general_mares' | 'el_gran_general';

export interface MapConfig {
  shape: 'radius' | 'rect' | 'polygon';
  radius?: number;
  excludedHexes?: HexCoord[];
  boundary?: HexCoord[];
}

export interface UnitComposition {
  archer: number;
  infantry: number;
  cavalry: number;
  lancer: number;
}

export type ObjectiveCondition =
  | { type: 'eliminate_all' }
  | { type: 'eliminate_general' }
  | { type: 'eliminate_units'; count: number; unitClass?: UnitClass; unitIds?: string[] }
  | { type: 'survive_turns'; turns: number }
  | { type: 'escort'; npcId: string }
  | { type: 'protect'; npcId: string }
  | { type: 'occupy_hexes'; hexes: HexCoord[] }
  | { type: 'reach_position'; hex: HexCoord }
  | { type: 'collect_items'; count: number }
  | { type: 'scare_enemies'; hpThreshold: number; unitClass?: UnitClass };

export interface CampaignObjective {
  id: string;
  type: 'main' | 'secondary';
  condition: ObjectiveCondition;
  descriptionKey: string;
}

export type LossCondition =
  | { type: 'general_killed' }
  | { type: 'all_units_killed' }
  | { type: 'npc_killed'; npcId: string }
  | { type: 'turns_exceeded'; turns: number };

export interface StagePositions {
  playerGeneral: HexCoord;
  playerAllies?: HexCoord[];
  enemyGeneral?: HexCoord;
  enemies: HexCoord[];
}

export interface NPCConfig {
  id: string;
  unitClass: UnitClass;
  hp: number;
  behavior: 'stand_still' | 'follow_player' | 'move_to_point' | 'patrol';
  path?: HexCoord[];
  destination?: HexCoord;
}

export interface ScoreConfig {
  base: number;
  secondaryBonus: number;
  turnPenalty?: number;
}

export interface StageConfig {
  map: MapConfig;
  allies: UnitComposition;
  enemies: UnitComposition;
  difficulty: Difficulty;
  objectives: CampaignObjective[];
  lossConditions: LossCondition[];
  score: ScoreConfig;
  npcs?: NPCConfig[];
  positions?: StagePositions;
  deploymentZone?: HexCoord[];
  enemyDeploymentZone?: HexCoord[];
  maxAP?: number;
}
