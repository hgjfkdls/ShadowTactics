import { useState } from 'react';
import type { GameState, GameAction, Unit, ModifierInstance } from '@shared';
import { IDENTITY_INFO, getIdentityKey } from '../../prep/identityData';
import { ABILITIES, CLASS_ABILITIES } from '@shared/game/data/abilities';
import { IDENTITY_EFFECTS } from '@shared/game/data/identities';
import { BASE_STATS } from '@shared/game/units';
import { getCardName, getCardType, getCardDescription } from '@shared/game/actions/card';
import { l } from '@shared/i18n';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string } | { type: 'attackResult'; resultIndex: number } | { type: 'historyAttack'; entry: any } | { type: 'historyMove'; entry: any } | { type: 'historyCard'; entry: any } | null;

type Props = {
    state: GameState;
    playerId: string;
    selectedInfo: SelectedInfo;
    sendAction?: (action: GameAction) => void;
    children?: React.ReactNode;
};

function cls(cls: string): string { return l(`unit.class.${cls}`) || cls; }

const CLASS_COLORS: Record<string, string> = {
    archer: 'text-amber-400', infantry: 'text-blue-400', cavalry: 'text-violet-400', lancer: 'text-red-400', general: 'text-yellow-300',
};

export function RightPanel({ state, playerId, selectedInfo, sendAction, children }: Props) {
    function renderContent() {
        if (selectedInfo?.type === 'identity') {
            return <IdentityDetail state={state} targetPlayerId={selectedInfo.playerId} myPlayerId={playerId} />;
        }
        if (selectedInfo?.type === 'unit') {
            return <UnitDetail state={state} unitId={selectedInfo.unitId} myPlayerId={playerId} />;
        }
        if (selectedInfo?.type === 'card') {
            return <CardDetail cardId={selectedInfo.cardId} />;
        }
        if (selectedInfo?.type === 'effect') {
            return <EffectDetail stat={selectedInfo.stat} label={selectedInfo.label} description={selectedInfo.description} />;
        }
        if (selectedInfo?.type === 'attackResult') {
            const r = state.attackResults?.[selectedInfo.resultIndex];
            if (!r) return null;
            return <AttackResultDetail result={r} />;
        }
        if (selectedInfo?.type === 'historyAttack') {
            return <HistoryAttackDetail entry={selectedInfo.entry} />;
        }
        if (selectedInfo?.type === 'historyMove') {
            return <HistoryMoveDetail entry={selectedInfo.entry} />;
        }
        if (selectedInfo?.type === 'historyCard') {
            return <HistoryCardDetail entry={selectedInfo.entry} />;
        }
        return null;
    }

    return (
        <aside className="h-full border-l border-zinc-700 flex flex-col overflow-hidden bg-zinc-900/80">
            <div className="border-b border-zinc-700 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                    {selectedInfo ? l('board.info') : l('board.details')}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {renderContent()}
                {children}
                {!selectedInfo && !children && (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-600">
                        {l('board.noDetails')}
                    </div>
                )}
            </div>
        </aside>
    );
}

function IdentityDetail({ state, targetPlayerId, myPlayerId }: { state: GameState; targetPlayerId: string; myPlayerId: string }) {
    const identityCardId = state.players[targetPlayerId]?.selectedIdentity;
    if (!identityCardId) return <div className="text-xs text-zinc-500">{l('identity.noIdentity')}</div>;

    const key = getIdentityKey(identityCardId);
    const info = IDENTITY_INFO[key];
    if (!info) return <div className="text-xs text-zinc-500">{l('identity.unknown')}</div>;

    const isMine = targetPlayerId === myPlayerId;
    const unitCount = Object.values(state.units).filter(u => u.owner === targetPlayerId).length;
    const iName = l(`identity.${key}.name`) || info.name;
    const iClass = l(`identity.${key}.className`) || info.className;

    const verbose = (() => { const t = l(`identity.${key}.descVerbose`); return t && t !== `identity.${key}.descVerbose` ? t : info.descVerbose; })();
    const sections = verbose.split('\n\n').filter((s: string) => s.trim());
    const flavor = sections[0] ?? '';
    const abilitySections = sections.slice(1);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">🛡️</div>
                <div>
                    <div className="text-lg font-bold">{iName}</div>
                    <div className={`text-sm font-semibold ${CLASS_COLORS[identityCardId.includes('robin') || identityCardId.includes('franco') ? 'archer' : 'infantry']}`}>
                        {iClass}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-blue-400' : 'text-red-400'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                    </div>
                </div>
            </div>

            <div className="text-xs text-zinc-400">
                {l('identity.units', { count: unitCount })}
            </div>

            {/* Reseña */}
            {flavor && (
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('identity.description')}</div>
                    <div className="text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3 leading-relaxed italic">
                        {flavor}
                    </div>
                </div>
            )}

            {/* Habilidades (Especial + Global) */}
            {abilitySections.length > 0 && (
                <div className="space-y-2">
                    {abilitySections.map((section: string, i: number) => {
                        const lines = section.split('\n');
                        const header = lines[0] ?? '';
                        const desc = lines.slice(1).join(' ').trim();
                        const isEspecial = header.startsWith('Especial');
                        return (
                            <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[9px] font-mono text-zinc-500">👑</span>
                                    <span className="font-semibold text-zinc-200">{header}</span>
                                </div>
                                <div className="text-[11px] text-zinc-300 leading-relaxed">{desc}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CardDetail({ cardId }: { cardId: string }) {
    const ctype = getCardType(cardId);

    const TYPE_COLORS: Record<string, string> = {
        BUFF: 'text-emerald-400 border-emerald-700',
        DEBUFF: 'text-red-400 border-red-700',
        COUNTER: 'text-violet-400 border-violet-700',
    };

    const TYPE_BG: Record<string, string> = {
        BUFF: 'bg-emerald-900/20',
        DEBUFF: 'bg-red-900/20',
        COUNTER: 'bg-violet-900/20',
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">🃏</div>
                <div>
                    <div className="text-lg font-bold">{getCardName(cardId)}</div>
                    <div className={['text-xs font-semibold', ctype ? TYPE_COLORS[ctype]?.split(' ')[0] : 'text-zinc-400'].join(' ')}>
                        {l(`cardType.${ctype}`) || ctype || '?'}
                    </div>
                </div>
            </div>

            <div className={['rounded-lg border p-3 text-xs text-zinc-300 leading-relaxed', ctype ? TYPE_BG[ctype] ?? '' : 'bg-zinc-800/30 border-zinc-700'].join(' ')}>
                {getCardDescription(cardId) || getCardName(cardId)}
            </div>
        </div>
    );
}

function AttackResultDetail({ result }: { result: NonNullable<GameState['attackResults']>[number] }) {
    const attackerName = `[${result.attackerId}]${result.attackerClass === 'torbellino' ? 'Torbellino' : cls(result.attackerClass)}`;
    const targetName = result.targetId ? `[${result.targetId}]${cls(result.targetClass)}` : '';
    const isCritical = result.total >= 11;

    const dieFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">⚔️</div>
                <div>
                    <div className="text-lg font-bold">{result.attackName ?? 'Ataque básico'}</div>
                    <div className="text-xs text-zinc-500">Turno {result.turn}{result.attackInTurn ? `.${result.attackInTurn}` : ''}</div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400 font-semibold">Atacante</span>
                    <span className="text-zinc-200">{attackerName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400 font-semibold">Defensor</span>
                    <span className="text-zinc-200">{targetName || '—'}</span>
                </div>
            </div>

            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Dificultad</span>
                    <span className="text-zinc-200 font-semibold">{result.difficulty}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Dados</span>
                    <span className="text-zinc-200 font-semibold">
                        {dieFaces[result.die1] ?? result.die1} + {dieFaces[result.die2] ?? result.die2} = <span className="text-white">{result.total}</span>
                        {isCritical && <span className="text-yellow-400 ml-1">CRÍTICO</span>}
                    </span>
                </div>
            </div>

            <div className={[
                'rounded-lg p-3 space-y-1 text-xs',
                result.hit ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50',
            ].join(' ')}>
                <div className="flex items-center justify-between">
                    <span className="font-semibold">{result.hit ? '✅ Acierta' : '❌ Fallo'}</span>
                    {result.hit && <span className="text-green-300 font-bold">-{result.damage} HP</span>}
                </div>
                {result.counterDamage > 0 && (
                    <div className="flex items-center justify-between text-red-300">
                        <span>Daño de contraataque</span>
                        <span className="font-bold">-{result.counterDamage} HP</span>
                    </div>
                )}
                {(result.targetKilled || result.attackerKilled) && (
                    <div className="text-yellow-400 font-semibold pt-1 border-t border-zinc-700 mt-1">
                        {result.targetKilled && '⚫ Objetivo eliminado'}
                        {result.attackerKilled && ' ⚫ Atacante eliminado'}
                    </div>
                )}
            </div>

            {result.elapsed !== undefined && (
                <div className="text-[10px] text-zinc-600">
                    Tiempo: {Math.floor(result.elapsed / 60)}:{(result.elapsed % 60).toString().padStart(2, '0')}
                </div>
            )}
        </div>
    );
}

function HistoryAttackDetail({ entry }: { entry: any }) {
    const isCritical = entry.total >= 11;
    const dieFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">⚔️</div>
                <div>
                    <div className="text-lg font-bold">{entry.attackName ?? l('button.basicAttack')}</div>
                    <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400 font-semibold">{l('attackDetail.attacker')}</span>
                    <span className="text-zinc-200">[{entry.attackerId}]{cls(entry.attackerClass)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400 font-semibold">{l('attackDetail.defender')}</span>
                    <span className="text-zinc-200">[{entry.targetId}]{cls(entry.targetClass)}</span>
                </div>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.paCost')}</span>
                    <span className="text-zinc-200 font-semibold">{entry.paCost ?? 1} PA</span>
                </div>
                {entry.paModifiers && entry.paModifiers.length > 0 && (
                    <div className="text-[10px] text-zinc-400 space-y-0.5">
                        {entry.paModifiers.map((m: string, i: number) => <div key={i}>{m}</div>)}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.baseDamage')}</span>
                    <span className="text-zinc-200">{entry.baseAttack}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.baseDifficulty')}</span>
                    <span className="text-zinc-200">{entry.baseDifficulty}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.finalDifficulty')}</span>
                    <span className="text-zinc-200 font-semibold">{entry.difficulty}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('attackDetail.dice')}</span>
                    <span className="text-zinc-200 font-semibold">
                        {dieFaces[entry.die1] ?? entry.die1} + {dieFaces[entry.die2] ?? entry.die2} = <span className="text-white">{entry.total}</span>
                        {isCritical && <span className="text-yellow-400 ml-1">💥</span>}
                    </span>
                </div>
            </div>
            {entry.modifiers && entry.modifiers.length > 0 && (
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('attackDetail.modifiers')}</div>
                    <div className="space-y-1">
                        {entry.modifiers.map((m: string, i: number) => (
                            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300">{m}</div>
                        ))}
                    </div>
                </div>
            )}
            <div className={[
                'rounded-lg p-3 text-xs space-y-1',
                entry.hit ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50',
            ].join(' ')}>
                <div className="flex items-center justify-between">
                    <span className="font-semibold">{entry.hit ? l('attackDetail.hit') : l('attackDetail.miss')}</span>
                    {entry.hit && <span className="text-green-300 font-bold">-{entry.damage} HP{entry.total >= 11 ? ' 💥' : ''}</span>}
                </div>
                {entry.hit && entry.total >= 11 && (
                    <div className="text-yellow-400 text-[10px] font-bold">{l('attackDetail.critical')}</div>
                )}
                {entry.counterDamage > 0 && (
                    <div className="flex items-center justify-between text-red-300">
                        <span>{l('attackDetail.counterattack')}</span>
                        <span className="font-bold">-{entry.counterDamage} HP</span>
                    </div>
                )}
                {(entry.targetKilled || entry.attackerKilled) && (
                    <div className="text-yellow-400 font-semibold pt-1 border-t border-zinc-700 mt-1">
                        {entry.targetKilled && `⚫ ${l('attackDetail.targetKilled')}`}
                        {entry.attackerKilled && ` ⚫ ${l('attackDetail.attackerKilled')}`}
                    </div>
                )}
            </div>
        </div>
    );
}

function HistoryMoveDetail({ entry }: { entry: any }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">👟</div>
                <div>
                    <div className="text-lg font-bold">{l('button.move')}</div>
                    <div className="text-xs text-zinc-500">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-400 font-semibold">{l('moveDetail.unit')}</span>
                    <span className="text-zinc-200">[{entry.unitId}]{cls(entry.unitClass)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">{l('moveDetail.origin')}</span>
                    <span className="text-zinc-200 font-mono">({entry.from.q}, {entry.from.r})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">{l('moveDetail.destination')}</span>
                    <span className="text-zinc-200 font-mono">({entry.to.q}, {entry.to.r})</span>
                </div>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('moveDetail.baseCost')}</span>
                    <span className="text-zinc-200">{entry.baseCost} PA</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{l('moveDetail.finalCost')}</span>
                    <span className={entry.cost === 0 ? 'text-green-400 font-bold' : 'text-zinc-200 font-semibold'}>{entry.cost} PA</span>
                </div>
            </div>
            {entry.modifiers && entry.modifiers.length > 0 && (
                <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('moveDetail.modifiers')}</div>
                    <div className="space-y-1">
                        {entry.modifiers.map((m: string, i: number) => (
                            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300">{m}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function HistoryCardDetail({ entry }: { entry: any }) {
    const isCounter = entry.cardType === 'COUNTER';
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">🃏</div>
                <div>
                    <div className="text-lg font-bold">{nameForHistoryCard(entry.cardId)}</div>
                    <div className={[
                        'text-xs font-semibold',
                        isCounter ? 'text-violet-400' : entry.cardType === 'BUFF' ? 'text-emerald-400' : 'text-red-400',
                    ].join(' ')}>
                        {l(`cardType.${entry.cardType}`) || entry.cardType}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{l('board.turnLabel')} {entry.turn} · {l('history.player', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                </div>
            </div>
            <div className="space-y-1">
                {entry.targetId && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500">{l('cardDetail.objective')}</span>
                        <span className="text-zinc-200">[{entry.targetId}]{entry.targetClass ? cls(entry.targetClass) : ''}</span>
                    </div>
                )}
                {entry.counterCardId && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-violet-400 font-semibold">{l('cardDetail.counters')}</span>
                        <span className="text-zinc-200">{nameForHistoryCard(entry.counterCardId)}</span>
                    </div>
                )}
            </div>
            {entry.counterCardId ? (() => {
                const desc = descForHistoryCard(entry.cardId) ?? descForHistoryCard(entry.counterCardId);
                const cdesc = descForHistoryCard(entry.counterCardId);
                const atkName = nameForHistoryCard(entry.cardId);
                const cName = nameForHistoryCard(entry.counterCardId);
                return (
                    <div className="space-y-3">
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                            <div className="text-zinc-400 text-[10px] mb-1">{l('cardDetail.playerPlays', { n: entry.playerId === 'p1' ? '1' : '2' })}</div>
                            <div className="font-semibold text-zinc-200 mb-1">{cName}</div>
                            {cdesc && <div>{cdesc}</div>}
                        </div>
                        <div className="bg-violet-900/15 border border-violet-700/40 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                            <div className="text-violet-400 text-[10px] mb-1">{l('cardDetail.butOpponentCounters')}</div>
                            <div className="font-semibold text-violet-300 mb-1">{atkName}</div>
                            {desc && <div>{desc}</div>}
                        </div>
                    </div>
                );
            })() : (() => {
                const desc = descForHistoryCard(entry.cardId);
                const name = nameForHistoryCard(entry.cardId);
                return (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                        <div className="font-semibold text-zinc-200 mb-1">{name}</div>
                        {desc && <div>{desc}</div>}
                        {entry.details && <div className="text-zinc-400 mt-1 text-[10px]">{entry.details}</div>}
                    </div>
                );
            })()}
        </div>
    );
}

function EffectDetail({ stat, label, description, source, sourceName }: { stat: string; label: string; description: string; source?: string; sourceName?: string }) {
    const isDebuff = ['movementCost', 'difficulty', 'attackCost', 'blocked', 'damage', 'passiveDamage', 'movementPenalty'].includes(stat);
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">{isDebuff ? '🔴' : '🟢'}</div>
                <div>
                    <div className="text-lg font-bold">{label}</div>
                    <div className={`text-xs font-semibold mt-1 ${isDebuff ? 'text-red-400' : 'text-green-400'}`}>
                        {isDebuff ? l('effect.negative') : l('effect.positive')}
                    </div>
                </div>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                {description}
                {source && sourceName && (
                    <div className="text-[10px] text-zinc-500 mt-1">({source}: {sourceName})</div>
                )}
            </div>
        </div>
    );
}

function getProjectedPoolUnitInfo(
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
    abilities = abilities.filter(a => a !== 'accion_evasiva');
  }
  if (key === 'caballos_guerra' && cls === 'cavalry') {
    abilities = abilities.map(a => a === 'cabalgar' ? 'cabalgar_2' : a);
  }

  return { abilities, stats };
}

function UnitDetail({ state, unitId, myPlayerId }: { state: GameState; unitId: string; myPlayerId: string }) {

    // Try live unit, then graveyard, then pool (undeployed)
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
                <div className="text-3xl">{poolEntry ? '📦' : isAlive ? '⚔️' : '💀'}</div>
                <div>
                    <div className={`text-lg font-bold ${CLASS_COLORS[unitClass]}`}>
                        {unit?.id ? `[${unit.id}]` : ''}{cls(unitClass)}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-blue-400' : 'text-red-400'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                        {poolEntry ? ' (Sin desplegar)' : !isAlive ? ' (Eliminada)' : ''}
                    </div>
                </div>
            </div>

            {/* Unit stats */}
            <div className="grid grid-cols-2 gap-2">
                <StatBox label={l('unitDetail.hp')} value={`${currentHp}/${maxHp}`} bar={poolEntry ? 100 : Math.round((currentHp / maxHp) * 100)} />
                <StatBox label={l('unitDetail.attack')} value={`${unit?.attack ?? projected?.stats.attack ?? 3}`} />
                <StatBox label={l('unitDetail.difficulty')} value={`${unit?.difficulty ?? projected?.stats.difficulty ?? 6}`} />
                <StatBox label={l('unitDetail.range')} value={`${unit?.range ?? projected?.stats.range ?? 1}`} />
                <StatBox label={l('unitDetail.movement')} value={`${unit?.movementCost ?? projected?.stats.movementCost ?? 1}`} />
            </div>

            {/* Active effects */}
            {liveUnit && (() => {
                const { buffs, debuffs } = getUnitStatus(liveUnit, state.activeModifiers);
                const all = [...buffs.map(s => ({ s, isDebuff: false })), ...debuffs.map(s => ({ s, isDebuff: true }))];
                if (all.length === 0) return null;
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('unitDetail.activeEffects')}</div>
                        <div className="space-y-1">
                            {all.map(({ s, isDebuff }) => (
                                <div key={s} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${isDebuff ? 'border-red-800/60 bg-red-900/15' : 'border-green-800/60 bg-green-900/15'}`}>
                                    <span>{isDebuff ? '🔴' : '🟢'}</span>
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
                    {liveUnit.movedThisTurn && <span className="ml-2 text-zinc-400">· {l('unitDetail.moved')}</span>}
                    {liveUnit.attackedThisTurn && <span className="ml-2 text-zinc-400">· {l('unitDetail.attacked')}</span>}
                </div>
            )}

            {/* Identity card abilities (general only) — special + global as cards */}
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
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('identity.cardLabel')} — {l(`identity.${key}.name`) || identityInfo.name}</div>
                        <div className="space-y-2">
                            {abilitySections.map((section, i) => {
                                const lines = section.split('\n');
                                const header = lines[0] ?? '';
                                const desc = lines.slice(1).join(' ').trim();
                                const isEspecial = header.startsWith('Especial');
                                return (
                                    <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-[9px] font-mono text-zinc-500">👑</span>
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

            {/* Abilities with clickable names (collapsed by default for generals) */}
            {unit?.abilities && unit.abilities.length > 0 && (
                <AbilityList key={unit.id} abilities={unit.abilities} ownerPlayerId={unit.owner} startCollapsed={unit.class === 'general'} />
            )}
            {!unit && projected && projected.abilities.length > 0 && (
                <AbilityList abilities={projected.abilities} ownerPlayerId={poolEntry?.owner} startCollapsed={unitClass === 'general'} />
            )}

            {/* Identity abilities for general in pool */}
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
                   <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('identity.cardLabel')} — {l(`identity.${key}.name`) || identityInfo.name}</div>
                  <div className="space-y-2">
                    {abilitySections.map((section, i) => {
                      const lines = section.split('\n');
                      const header = lines[0] ?? '';
                      const desc = lines.slice(1).join(' ').trim();
                      return (
                        <div key={i} className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] font-mono text-zinc-500">👑</span>
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
                    Unidad en pool de despliegue. Las stats y habilidades mostradas son proyectadas según la identidad seleccionada.
                </div>
            )}
        </div>
    );
}

function AbilityList({ abilities, ownerPlayerId, startCollapsed }: { abilities: string[]; ownerPlayerId?: string; startCollapsed?: boolean }) {
    const [expanded, setExpanded] = useState<Set<string>>(() => startCollapsed ? new Set() : new Set(abilities));

    function toggleAbility(id: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    return (
        <div className="space-y-1">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{l('unitDetail.abilities')}</div>
            <div className="space-y-2">
                {abilities.map(abId => {
                    const ab = ABILITIES[abId];
                    if (!ab) return null;
                    const isOpen = expanded.has(abId);
                    let description = l(`ability.${abId}.desc`);
                    if (!description || description === `ability.${abId}.desc`) description = ab.description;
                    if (abId === 'blanco_facil' && ownerPlayerId?.startsWith('francotirador')) {
                        description = description.replace('-1', '-2');
                    }
                    return (
                        <div key={abId} className="border border-zinc-700 bg-zinc-800/50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs cursor-pointer select-none" onClick={() => toggleAbility(abId)}>
                                <span className="text-[9px] font-mono text-zinc-500">
                                    {ab.type === 'active' ? `⚡${ab.cost ?? '?'}PA` : '🔰'}
                                </span>
                                <span className="font-semibold text-zinc-200">{l(`ability.${abId}.name`) || ab.name}</span>
                                <span className="ml-auto text-zinc-600 text-[10px]">{isOpen ? '▼' : '▶'}</span>
                            </div>
                            {isOpen && (
                                <>
                                    <div className="text-[11px] text-zinc-300 leading-relaxed">{description}</div>
                                    {(() => {
                                        const tr = l(`ability.${abId}.restriction`);
                                        const restriction = (tr && tr !== `ability.${abId}.restriction`) ? tr : (ab.restrictions || '');
                                        if (!restriction) return null;
                                        return <div className="text-[10px] text-amber-400/80 italic">{restriction}</div>;
                                    })()}
                                    <div className="text-[9px] text-zinc-500">{ab.type === 'active' ? l('unitDetail.typeActive') : l('unitDetail.typePassive')}{ab.cost !== undefined ? ` · ${l('unitDetail.costLabel', { n: ab.cost })}` : ''}</div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function findPoolEntry(state: GameState, unitId: string): { owner: string; unitClass: string } | undefined {
    for (const [pid, p] of Object.entries(state.players)) {
        const entry = p.unitsToDeploy?.find(e => e.unitId === unitId);
        if (entry) return { owner: pid, unitClass: entry.unitClass };
    }
    return undefined;
}

function StatBox({ label, value, bar }: { label: string; value: string; bar?: number }) {
    return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2">
            <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
            <div className="text-sm font-bold">{value}</div>
            {bar !== undefined && (
                <div className="w-full h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${bar > 50 ? 'bg-green-500' : bar > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function descForHistoryCard(cardId: string): string | undefined {
    const cardDesc = getCardDescription(cardId);
    if (cardDesc) return cardDesc;
    const ab = ABILITIES[cardId];
    if (ab) {
        const translated = l(`ability.${cardId}.desc`);
        if (translated && translated !== `ability.${cardId}.desc`) return translated;
        return ab.description;
    }
    return undefined;
}

function nameForHistoryCard(cardId: string): string {
    const cardName = getCardName(cardId);
    if (cardName !== cardId) return cardName;
    const ab = ABILITIES[cardId];
    if (ab) {
        const translated = l(`ability.${cardId}.name`);
        if (translated && translated !== `ability.${cardId}.name`) return translated;
        return ab.name;
    }
    return cardId;
}

function getMaxHp(cls: string): number {
    return BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
}

function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];
    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'bloqueo', 'inmovil'];
    const helpfulStats = ['attack', 'ap', 'dotOnHit'];
    const passiveStats = ['passiveDamage'];
    for (const m of modifiers) {
        if (m.remainingTurns < 0) continue;
        if (m.remainingUses !== undefined && m.remainingUses <= 0) continue;
        const isUnitSpecific = m.targetId === unit.id;
        const isPlayerWide = !m.targetId && m.sourcePlayerId === unit.owner;
        if (!isUnitSpecific && !isPlayerWide) continue;
        const stat = m.stat;
        if (stat === 'movementCost' && m.value === 0 && m.operator === 'SET') {
            if (!buffs.includes(stat)) buffs.push(stat);
            continue;
        }
        if (stat === 'damage' && m.value < 0 && m.targetId) {
            continue;
        }
        if (stat === 'attack' && m.value > 0 && m.targetId) {
            continue;
        }
        if (stat === 'damage') {
            if (m.value > 0) { if (!buffs.includes(stat)) buffs.push(stat); }
            else if (m.value < 0) { if (!debuffs.includes(stat)) debuffs.push(stat); }
            continue;
        }
        if (stat === 'ap' && m.value < 0) {
            if (!debuffs.includes(stat)) debuffs.push(stat);
            continue;
        }
        if (harmfulStats.includes(stat)) { if (!debuffs.includes(stat)) debuffs.push(stat); }
        else if (helpfulStats.includes(stat)) { if (!buffs.includes(stat)) buffs.push(stat); }
        else if (passiveStats.includes(stat)) { if (!debuffs.includes(stat)) debuffs.push(stat); }
    }
    if ((unit.fuegoCoberturaCharges ?? 0) > 0) {
        if (!debuffs.includes('movementPenalty')) debuffs.push('movementPenalty');
    }
    return { buffs, debuffs };
}

function statusLabel(stat: string): string {
    const t = l(`unit.status.${stat}`);
    return t || stat;
}
