import { identityImgUrl, IDENTITY_CARD_FALLBACK } from '../game/helpers/cards';
import { IDENTITY_INFO } from '../prep/identityData';
import { l } from '@shared/i18n';
import {
  CampaignProgress,
  getCampaignStage,
  getCampaignStages,
} from './campaignConfig';
import type { ObjectiveCondition, CampaignObjective, ScoreConfig, StageConfig } from './campaignTypes';

type Props = {
  identityKey: string;
  progress: CampaignProgress;
  onPlayStage: (stage: number, config: import('./campaignConfig').CampaignStage) => void;
  onBack: () => void;
};

export function CampaignMap({ identityKey, progress, onPlayStage, onBack }: Props) {
  const stages = getCampaignStages(identityKey);
  const currentStage = getCampaignStage(progress, identityKey);
  const info = IDENTITY_INFO[identityKey];
  const name = l(`identity.${identityKey}.name`) || info?.name || identityKey;
  const className = l(`identity.${identityKey}.className`) || info?.className || '';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-700">
        <button
          onClick={onBack}
          className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-3 py-1.5 rounded-md text-sm cursor-pointer"
        >
          ← {l('campaign.back')}
        </button>
        <img
          src={identityImgUrl(identityKey)}
          alt={name}
          className="w-10 h-14 object-contain"
          onError={e => {
            if ((e.target as HTMLImageElement).src !== IDENTITY_CARD_FALLBACK)
              (e.target as HTMLImageElement).src = IDENTITY_CARD_FALLBACK;
          }}
        />
        <div>
          <h1 className="text-xl font-bold">{name}</h1>
          <div className="text-xs text-zinc-400">{className}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-zinc-400 text-sm mb-8 text-center">
          {l('campaign.mapSubtitle') || 'Progreso de la campaña'}
        </p>

        <div className="max-w-lg mx-auto relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-700" />

          <div className="space-y-8">
            {stages.map(stage => {
              const isUnlocked = stage.number <= currentStage;
              const isCurrent = stage.number === currentStage;
              const isCompleted = stage.number < currentStage;
              const stageName = l(stage.nameKey) || `Etapa ${stage.number}`;
              const stageDesc = l(stage.descKey) || '';
              const stageStory = stage.storyKey ? l(stage.storyKey) : null;
              const mainObjective = stage.config.objectives.find(o => o.type === 'main');
              const secondaryObjectives = stage.config.objectives.filter(o => o.type === 'secondary');
              const noDeployment = !!stage.config.positions;

              return (
                <div key={stage.number} className="relative flex items-start gap-4">
                  <div
                    className={[
                      'relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold shrink-0 border-2 transition',
                      isCompleted
                        ? 'bg-green-900/50 border-green-500 text-green-400'
                        : isCurrent
                          ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400 ring-2 ring-yellow-500/50'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-500',
                    ].join(' ')}
                  >
                    {isCompleted ? '✓' : stage.number}
                  </div>

                  <div className="flex-1 min-w-0 pt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={[
                          'font-bold text-base',
                          isUnlocked ? 'text-white' : 'text-zinc-500',
                        ].join(' ')}
                      >
                        {stageName}
                      </h3>
                      {isCompleted && (
                        <span className="text-xs text-green-400 font-semibold">{l('campaign.completed') || 'Completada'}</span>
                      )}
                      {isCurrent && (
                        <span className="text-xs text-yellow-400 font-semibold">{l('campaign.current') || 'Actual'}</span>
                      )}
                      {noDeployment && isUnlocked && (
                        <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded font-semibold">{l('campaign.noDeployment') || 'Sin despliegue'}</span>
                      )}
                    </div>

                    <p className={['text-sm', isUnlocked ? 'text-zinc-400' : 'text-zinc-600'].join(' ')}>
                      {stageDesc}
                    </p>

                    {stageStory && isUnlocked && (
                      <details className="mt-1 group cursor-pointer">
                        <summary className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                          📖 {l('campaign.story') || 'Historia'}
                        </summary>
                        <p className="mt-1 text-xs text-zinc-400 italic whitespace-pre-line border-l-2 border-zinc-700 pl-3">
                          {stageStory}
                        </p>
                      </details>
                    )}

                    {isUnlocked && (
                      <StageObjectives
                        mainObjective={mainObjective ?? null}
                        secondaryObjectives={secondaryObjectives}
                        score={stage.config.score}
                      />
                    )}

                    {isUnlocked && (
                      <StageDeploymentInfo config={stage.config} />
                    )}

                    {isUnlocked && (
                      <button
                        onClick={() => onPlayStage(stage.number, stage)}
                        className={[
                          'mt-2 px-4 py-1 rounded-md text-sm font-semibold transition cursor-pointer',
                          isCurrent
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                            : 'bg-zinc-600 hover:bg-zinc-500 text-white',
                        ].join(' ')}
                      >
                        {isCompleted
                          ? (l('campaign.replay') || 'Re-jugar')
                          : (l('campaign.play') || 'Jugar')}
                      </button>
                    )}

                    {!isUnlocked && (
                      <div className="mt-2 text-xs text-zinc-600 flex items-center gap-1">
                        🔒 {l('campaign.locked') || 'Bloqueado'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageDeploymentInfo({ config }: { config: StageConfig }) {
  const totalEnemies = config.enemies.archer + config.enemies.infantry + config.enemies.cavalry + config.enemies.lancer;
  const totalAllies = config.allies.archer + config.allies.infantry + config.allies.cavalry + config.allies.lancer;
  const hasPositions = !!config.positions;

  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
      <span>🗺️ {describeMap(config.map)}</span>
      <span>🎯 {describeDifficulty(config.difficulty)}</span>
      {totalAllies > 0 && <span>🛡️ {describeComposition(config.allies, l('campaign.allies') || 'Aliados')}</span>}
      {totalEnemies > 0 && <span>⚔️ {describeComposition(config.enemies, l('campaign.enemies') || 'Enemigos')}</span>}
      {hasPositions && (
        <span className="text-zinc-600">📍 {l('campaign.fixedPositions') || 'Posiciones fijas'}</span>
      )}
    </div>
  );
}

function describeMap(map: import('./campaignTypes').MapConfig): string {
  if (map.shape === 'radius' && map.radius) {
    return `${l('campaign.mapRadius') || 'Mapa radio'} ${map.radius}`;
  }
  return `${l('campaign.mapShape') || 'Mapa'} ${map.shape}`;
}

function describeDifficulty(d: string): string {
  const labels: Record<string, string> = {
    cpu_facil: 'Fácil',
    cpu_medio: 'Medio',
    cpu_dificil: 'Difícil',
    general_mares: 'General Mares',
    el_gran_general: 'El Gran General',
  };
  return labels[d] || d;
}

function describeComposition(comp: { archer: number; infantry: number; cavalry: number; lancer: number }, label: string): string {
  const total = comp.archer + comp.infantry + comp.cavalry + comp.lancer;
  const parts: string[] = [];
  if (comp.archer) parts.push(`${comp.archer}🏹`);
  if (comp.infantry) parts.push(`${comp.infantry}🛡️`);
  if (comp.cavalry) parts.push(`${comp.cavalry}🐴`);
  if (comp.lancer) parts.push(`${comp.lancer}🔱`);
  return `${label}: ${total} (${parts.join(' ')})`;
}

function StageObjectives({
  mainObjective,
  secondaryObjectives,
  score,
}: {
  mainObjective: CampaignObjective | null;
  secondaryObjectives: CampaignObjective[];
  score: ScoreConfig;
}) {
  return (
    <div className="mt-2 space-y-1">
      {mainObjective && (
        <div className="flex items-center gap-1.5 text-sm text-yellow-400 font-semibold">
          <span>🎯</span>
          <span>{l(mainObjective.descriptionKey) || describeObjectiveCondition(mainObjective.condition)}</span>
        </div>
      )}
      {secondaryObjectives.length > 0 && (
        <div className="ml-5 space-y-0.5">
          <div className="text-xs text-zinc-500 font-semibold">{l('campaign.secondary') || 'Secundarios'}</div>
          {secondaryObjectives.map(obj => (
            <div key={obj.id} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>○</span>
              <span>{l(obj.descriptionKey) || describeObjectiveCondition(obj.condition)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-zinc-500 mt-1">
        {l('campaign.maxScore') || 'Puntaje máximo'}: {score.base + score.secondaryBonus * secondaryObjectives.length}
        {score.turnPenalty != null && ` · Penalización: -${score.turnPenalty}/turno`}
      </div>
    </div>
  );
}

function describeObjectiveCondition(c: ObjectiveCondition): string {
  switch (c.type) {
    case 'eliminate_all': return 'Eliminar a todas las unidades enemigas';
    case 'eliminate_general': return 'Eliminar al general enemigo';
    case 'eliminate_units': {
      const cls = c.unitClass ? describeUnitClass(c.unitClass) : 'unidades';
      return c.unitIds ? `Eliminar unidades específicas` : `Eliminar ${c.count} ${cls}`;
    }
    case 'survive_turns': return `Sobrevivir ${c.turns} turnos`;
    case 'escort': return `Escoltar a ${c.npcId}`;
    case 'protect': return `Proteger a ${c.npcId}`;
    case 'occupy_hexes': return `Ocupar ${c.hexes.length} posiciones estratégicas`;
    case 'reach_position': return `Alcanzar la posición marcada`;
    case 'collect_items': return `Recolectar ${c.count} objetos`;
    case 'scare_enemies': {
      const cls = c.unitClass ? ` ${describeUnitClass(c.unitClass)}` : '';
      return `Ahuyentar enemigos${cls} (dejarlos por debajo del ${c.hpThreshold}% de HP)`;
    }
    default: return 'Completar la misión';
  }
}

function describeUnitClass(cls: string): string {
  const labels: Record<string, string> = {
    archer: 'arqueros',
    infantry: 'infantes',
    cavalry: 'caballería',
    lancer: 'lanceros',
  };
  return labels[cls] || cls;
}
