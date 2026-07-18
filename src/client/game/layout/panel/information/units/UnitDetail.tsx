import type { GameState, Unit, ModifierInstance } from '@shared';
import { ABILITIES, CLASS_ABILITIES } from '@shared/game/data/abilities';
import { IDENTITY_EFFECTS } from '@shared/game/data/identities';
import { IDENTITY_INFO, getIdentityKey } from '../../../../../prep/identityData';
import { BASE_STATS } from '@shared/game/units';
import { l } from '@shared/i18n';
import { findPoolEntry } from './findPoolEntry';
import { getProjectedPoolUnitInfo } from './getProjectedPoolUnitInfo';
import { StatsGrid } from './StatsGrid';
import AbilityGrid from './AbilityGrid';
import type { IdentityIconData } from './AbilityGrid';
import { getMaxHp } from './getMaxHp';

function cls(cls: string): string { return l(`unit.class.${cls}`) || cls; }

function matchVerboseToAbilityId(header: string, abId: string): boolean {
  const abName = ABILITIES[abId]?.name?.toLowerCase() ?? '';
  if (!abName) return false;
  const clean = header.replace(/\([^)]*\)/g, '').toLowerCase();
  if (clean.includes(abName)) return true;
  const lastWord = abName.split(/\s+/).filter(w => w.length > 2).pop();
  if (lastWord && clean.includes(lastWord)) return true;
  return false;
}

function parseIdentityIcons(state: GameState, owner: string): { icons: IdentityIconData[]; excludeIds: string[] } | undefined {
  const identityCardId = state.players[owner]?.selectedIdentity;
  if (!identityCardId) return undefined;
  const key = getIdentityKey(identityCardId);
  const info = IDENTITY_INFO[key];
  if (!info) return undefined;

  const verbose = (() => {
    const t = l(`identity.${key}.descVerbose`);
    return t && t !== `identity.${key}.descVerbose` ? t : info.descVerbose;
  })();
  const sections = verbose.split('\n\n').filter((s: string) => s.trim());
  const abilitySections = sections.slice(1);
  if (abilitySections.length === 0) return undefined;

  const effect = IDENTITY_EFFECTS[key];
  const overrideAbilities = effect?.abilitiesOverride ?? [];
  const overrideClass = effect?.unitClassOverride as keyof typeof CLASS_ABILITIES ?? '';
  const baseClassAbilities = CLASS_ABILITIES[overrideClass] ?? [];
  const identityOnlyIds = overrideAbilities.filter(id => !baseClassAbilities.includes(id));

  const icons: IdentityIconData[] = abilitySections.map((section: string) => {
    const lines = section.split('\n');
    const header = lines[0] ?? '';
    const desc = lines.slice(1).join(' ').trim();

    let abilityId: string | undefined;
    for (const id of identityOnlyIds) {
      if (matchVerboseToAbilityId(header, id)) {
        abilityId = id;
        break;
      }
    }

    return { abilityId, header, description: desc };
  });

  return { icons, excludeIds: identityOnlyIds };
}

const CLASS_COLORS: Record<string, string> = {
    archer: 'text-class-archer', infantry: 'text-class-infantry', cavalry: 'text-class-cavalry', lancer: 'text-class-lancer', general: 'text-class-general',
};

import BustIcon from '../../../../icons/BustIcon';

const CLASS_ICONS: Record<string, string> = {
    archer: '/icons/units/arquero_icon.webp',
    infantry: '/icons/units/infanteria_icon.webp',
    cavalry: '/icons/units/caballeria_icon.webp',
    lancer: '/icons/units/lancero_icon.webp',
    general: '/icons/units/general_icon.webp',
};

export function UnitDetail({ state, unitId, myPlayerId }: { state: GameState; unitId: string; myPlayerId: string }) {

    const liveUnit = state.units[unitId];
    const deadUnit = !liveUnit ? Object.values(state.graveyard).find(u => u.id === unitId) : undefined;
    const poolEntry = (!liveUnit && !deadUnit)
        ? findPoolEntry(state, unitId)
        : undefined;

    if (!liveUnit && !deadUnit && !poolEntry) {
        return <div className="text-xs text-zinc-500">Unidad no encontrada</div>;
    }

    const unit = liveUnit ?? deadUnit;
    const isMine = unit ? unit.owner === myPlayerId : (poolEntry?.owner ?? '') === myPlayerId;
    const isAlive = !!liveUnit;
    const unitClass = unit?.class ?? poolEntry!.unitClass;
    const maxHp = getMaxHp(unitClass);
    const currentHp = unit?.hp ?? maxHp;

    const projected = poolEntry ? getProjectedPoolUnitInfo(
      unitClass,
      state.players[poolEntry.owner]?.selectedIdentity
    ) : null;

    const identityData = (unitClass === 'general' && unit?.abilities && unit.abilities.length > 0)
      ? parseIdentityIcons(state, unit.owner)
      : (unitClass === 'general' && !unit && projected && projected.abilities.length > 0)
        ? parseIdentityIcons(state, poolEntry!.owner)
        : undefined;

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <img
                    src={CLASS_ICONS[unitClass] ?? '/icons/units/infanteria_icon.png'}
                    alt={unitClass}
                    className="w-12 h-12 object-contain"
                />
                <div>
                    <div className={`text-lg font-bold ${isMine ? 'text-player1' : 'text-player2'}`}>
                        {unit?.id ? `[${unit.id}]` : ''}{cls(unitClass)}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-player1' : 'text-player2'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                        {poolEntry ? ' (Sin desplegar)' : !isAlive ? ' (Eliminada)' : ''}
                    </div>
                </div>
            </div>

            <StatsGrid
              hp={currentHp}
              maxHp={maxHp}
              shield={liveUnit?.auraShield ?? 0}
              attack={unit?.attack ?? projected?.stats.attack ?? 3}
              difficulty={unit?.difficulty ?? projected?.stats.difficulty ?? 6}
              range={unit?.range ?? projected?.stats.range ?? 1}
              movement={unit?.movementCost ?? projected?.stats.movementCost ?? 1}
            />

            {liveUnit && (
                <div className="text-xs text-zinc-500">
                    {l('unitDetail.position', { q: liveUnit.position.q, r: liveUnit.position.r })}
                    {liveUnit.movedThisTurn && <span className="ml-2 text-zinc-400">· {l('unitDetail.moved')}</span>}
                    {liveUnit.attackedThisTurn && <span className="ml-2 text-zinc-400">· {l('unitDetail.attacked')}</span>}
                </div>
            )}

            {unit?.abilities && unit.abilities.length > 0 && (() => {
                const classAbilities = unit.class === 'general'
                  ? unit.abilities
                  : unit.abilities.filter(a => (CLASS_ABILITIES[unit.class as keyof typeof CLASS_ABILITIES] ?? []).includes(a));
                if (classAbilities.length === 0) return null;
                return (
                  <AbilityGrid key={unitId}
                    abilities={classAbilities}
                    identityIcons={unit.class === 'general' ? identityData?.icons : undefined}
                    identityExcludeIds={unit.class === 'general' ? identityData?.excludeIds : undefined}
                  />
                );
            })()}
            {!unit && projected && projected.abilities.length > 0 && (() => {
                const classAbilities = unitClass === 'general'
                  ? projected.abilities
                  : projected.abilities.filter(a => (CLASS_ABILITIES[unitClass as keyof typeof CLASS_ABILITIES] ?? []).includes(a));
                if (classAbilities.length === 0) return null;
                return (
                  <AbilityGrid key={unitId}
                    abilities={classAbilities}
                    identityIcons={unitClass === 'general' ? identityData?.icons : undefined}
                    identityExcludeIds={unitClass === 'general' ? identityData?.excludeIds : undefined}
                  />);
            })()}

            {poolEntry && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-[10px] text-zinc-400">
                    Unidad en {l('ui.poolUnitDesc')}
                </div>
            )}
        </div>
    );
}
