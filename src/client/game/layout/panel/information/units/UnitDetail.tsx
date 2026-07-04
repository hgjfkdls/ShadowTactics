import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, Unit, ModifierInstance } from '@shared';
import { hexDistance, generateHexMap } from '@shared';
import { isWithinBounds } from '@shared/game/utils';
import { IDENTITY_INFO, getIdentityKey } from '../../../../../prep/identityData';
import { ABILITIES, CLASS_ABILITIES } from '@shared/game/data/abilities';
import { BASE_STATS } from '@shared/game/units';
import { getCardName } from '@shared/game/actions/card';
import { getAuraBuffs, AURA_CONFIG } from '@shared/game/aura';
import { l } from '@shared/i18n';
import { findPoolEntry } from './findPoolEntry';
import { getProjectedPoolUnitInfo } from './getProjectedPoolUnitInfo';
import { StatBox } from './StatBox';
import { AbilityList } from './AbilityList';
import AuraBox from '../abilities/AuraBox';
import { getUnitStatus } from './getUnitStatus';
import { statusLabel } from './statusLabel';
import { getMaxHp } from './getMaxHp';

function cls(cls: string): string { return l(`unit.class.${cls}`) || cls; }

const CLASS_COLORS: Record<string, string> = {
    archer: 'text-class-archer', infantry: 'text-class-infantry', cavalry: 'text-class-cavalry', lancer: 'text-class-lancer', general: 'text-class-general',
};

function BustSvg({ cls, size }: { cls: string; size: number }) {
    const CLASS_FILL: Record<string, string> = {
        archer: 'var(--color-class-archer)', infantry: 'var(--color-class-infantry)',
        cavalry: 'var(--color-class-cavalry)', lancer: 'var(--color-class-lancer)', general: 'var(--color-class-general)',
    };
    const fill = CLASS_FILL[cls] ?? 'var(--color-effect-other)';
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="4.5" fill={fill} stroke="black" strokeWidth="1.2" />
            <path d="M4 22 C4 14 8 11 12 11 C16 11 20 14 20 22" fill={fill} stroke="black" strokeWidth="1" />
        </svg>
    );
}

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

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <BustSvg cls={unitClass} size={28} />
                <div>
                    <div className={`text-lg font-bold ${CLASS_COLORS[unitClass]}`}>
                        {unit?.id ? `[${unit.id}]` : ''}{cls(unitClass)}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-player1' : 'text-player2'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                        {poolEntry ? ' (Sin desplegar)' : !isAlive ? ' (Eliminada)' : ''}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <StatBox label={l('unitDetail.hp')} value={`${liveUnit ? currentHp + (liveUnit.auraShield ?? 0) : currentHp}/${maxHp}`} hp={liveUnit ? currentHp : undefined} shield={liveUnit ? (liveUnit.auraShield ?? 0) : 0} maxHp={maxHp} />
                <StatBox label={l('unitDetail.attack')} value={`${unit?.attack ?? projected?.stats.attack ?? 3}`} />
                <StatBox label={l('unitDetail.difficulty')} value={`${unit?.difficulty ?? projected?.stats.difficulty ?? 6}`} />
                <StatBox label={l('unitDetail.range')} value={`${unit?.range ?? projected?.stats.range ?? 1}`} />
                <StatBox label={l('unitDetail.movement')} value={`${unit?.movementCost ?? projected?.stats.movementCost ?? 1}`} />
            </div>

            {liveUnit && liveUnit.class === 'general' && AURA_CONFIG.isActive && (
                <AuraBox state={state} playerId={liveUnit.owner} />
            )}

            {liveUnit && (() => {
                const { buffs, debuffs } = getUnitStatus(liveUnit, state.activeModifiers);
                const all = [...buffs.map(s => ({ s, isDebuff: false })), ...debuffs.map(s => ({ s, isDebuff: true }))];
                if (all.length === 0) return null;
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">{l('unitDetail.activeEffects')}</div>
                        <div className="space-y-1">
                            {all.map(({ s, isDebuff }) => (
                                <div key={s} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${isDebuff ? 'border-red-800/60 bg-red-900/15' : 'border-green-800/60 bg-green-900/15'}`}>
                                    <span>{isDebuff ? 'ðŸ”´' : 'ðŸŸ¢'}</span>
                                    <span className={`font-semibold ${isDebuff ? 'text-red-300' : 'text-green-300'}`}>
                                        {statusLabel(s)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {liveUnit && (
                <div className="text-xs text-zinc-500">
                    {l('unitDetail.position', { q: liveUnit.position.q, r: liveUnit.position.r })}
                    {liveUnit.movedThisTurn && <span className="ml-2 text-zinc-400">Â· {l('unitDetail.moved')}</span>}
                    {liveUnit.attackedThisTurn && <span className="ml-2 text-zinc-400">Â· {l('unitDetail.attacked')}</span>}
                </div>
            )}

            {liveUnit && liveUnit.class === 'general' && (() => {
                const identityCardId = state.players[liveUnit.owner]?.selectedIdentity;
                if (!identityCardId) return null;
                const key = getIdentityKey(identityCardId);
                const identityInfo = IDENTITY_INFO[key];
                if (!identityInfo) return null;
                const verbose = (() => { const t = l(`identity.${key}.descVerbose`); return t && t !== `identity.${key}.descVerbose` ? t : identityInfo.descVerbose; })();
                const sections = verbose.split('\n\n').filter(s => s.trim());
                const abilitySections = sections.slice(1);
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">{l('identity.cardLabel')} â€” {l(`identity.${key}.name`) || identityInfo.name}</div>
                        <div className="space-y-2">
                            {abilitySections.map((section, i) => {
                                const lines = section.split('\n');
                                const header = lines[0] ?? '';
                                const desc = lines.slice(1).join(' ').trim();
                                const isEspecial = header.startsWith('Especial');
                                return (
                                    <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-[9px] font-mono text-panel-title">ðŸ‘‘</span>
                                            <span className="font-semibold text-zinc-200">{header}</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-300 leading-relaxed">{desc}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {unit?.abilities && unit.abilities.length > 0 && (
                <AbilityList key={unit.id} abilities={unit.abilities} ownerPlayerId={unit.owner} startCollapsed={unit.class === 'general'} />
            )}
            {!unit && projected && projected.abilities.length > 0 && (
                <AbilityList abilities={projected.abilities} ownerPlayerId={poolEntry?.owner} startCollapsed={unitClass === 'general'} />
            )}

            {poolEntry && unitClass === 'general' && (() => {
              const identityCardId = state.players[poolEntry.owner]?.selectedIdentity;
              if (!identityCardId) return null;
              const key = getIdentityKey(identityCardId);
               const identityInfo = IDENTITY_INFO[key];
               if (!identityInfo) return null;
               const verbose = l(`identity.${key}.descVerbose`) || identityInfo.descVerbose;
               const sections = verbose.split('\n\n').filter(s => s.trim());
               const abilitySections = sections.slice(1);
               return (
                 <div className="space-y-1">
                   <div className="text-xs font-semibold text-panel-title uppercase tracking-wide">{l('identity.cardLabel')} â€” {l(`identity.${key}.name`) || identityInfo.name}</div>
                  <div className="space-y-2">
                    {abilitySections.map((section, i) => {
                      const lines = section.split('\n');
                      const header = lines[0] ?? '';
                      const desc = lines.slice(1).join(' ').trim();
                      return (
                        <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] font-mono text-zinc-500">ðŸ‘‘</span>
                            <span className="font-semibold text-zinc-200">{header}</span>
                          </div>
                          <div className="text-[11px] text-zinc-300 leading-relaxed">{desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {poolEntry && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-[10px] text-zinc-400">
                    Unidad en {l('ui.poolUnitDesc')}
                </div>
            )}
        </div>
    );
}
