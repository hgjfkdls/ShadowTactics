import { useState } from 'react';
import type { GameState, GameAction, Unit, ModifierInstance } from '@shared';
import { IDENTITY_INFO, getIdentityKey } from '../../prep/identityData';
import { ABILITIES } from '@shared/game/data/abilities';
import { BASE_STATS } from '@shared/game/units';
import { getCardName, getCardType, getCardDescription } from '@shared/game/actions/card';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'cardTarget'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string } | null;

type Props = {
    state: GameState;
    playerId: string;
    selectedInfo: SelectedInfo;
    sendAction?: (action: GameAction) => void;
    children?: React.ReactNode;
};

const CLASS_DISPLAY: Record<string, string> = {
    archer: 'Arquero', infantry: 'Infantería', cavalry: 'Caballería', lancer: 'Lancero', general: 'General',
};

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
        return null;
    }

    return (
        <aside className="h-full border-l border-zinc-700 flex flex-col overflow-hidden bg-zinc-900/80">
            <div className="border-b border-zinc-700 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                    {selectedInfo ? 'Información' : 'Detalles'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {renderContent()}
                {children}
                {!selectedInfo && !children && (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-600">
                        Selecciona una identidad o unidad para ver detalles
                    </div>
                )}
            </div>
        </aside>
    );
}

function IdentityDetail({ state, targetPlayerId, myPlayerId }: { state: GameState; targetPlayerId: string; myPlayerId: string }) {
    const identityCardId = state.players[targetPlayerId]?.selectedIdentity;
    if (!identityCardId) return <div className="text-xs text-zinc-500">Sin identidad seleccionada</div>;

    const key = getIdentityKey(identityCardId);
    const info = IDENTITY_INFO[key];
    if (!info) return <div className="text-xs text-zinc-500">Identidad desconocida</div>;

    const isMine = targetPlayerId === myPlayerId;
    const unitCount = Object.values(state.units).filter(u => u.owner === targetPlayerId).length;

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">🛡️</div>
                <div>
                    <div className="text-lg font-bold">{info.name}</div>
                    <div className={`text-sm font-semibold ${CLASS_COLORS[identityCardId.includes('robin') || identityCardId.includes('franco') ? 'archer' : 'infantry']}`}>
                        {info.className}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-blue-400' : 'text-red-400'}`}>
                        {isMine ? 'ALIADO' : 'ENEMIGO'}
                    </div>
                </div>
            </div>

            <div className="text-xs text-zinc-400">
                Unidades: <span className="text-zinc-200 font-semibold">{unitCount}</span>
            </div>

            <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Descripción</div>
                <div className="text-xs text-zinc-300 bg-zinc-800/50 rounded-lg p-3 leading-relaxed whitespace-pre-line">
                    {info.desc}
                </div>
            </div>

            <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Información completa</div>
                <div className="text-xs text-zinc-300 bg-zinc-800/50 rounded-lg p-3 leading-relaxed whitespace-pre-line">
                    {info.descVerbose}
                </div>
            </div>
        </div>
    );
}

function CardDetail({ cardId }: { cardId: string }) {
    const ctype = getCardType(cardId);

    const TYPE_LABELS: Record<string, string> = {
        BUFF: 'Mejora',
        DEBUFF: 'Debilidad',
        COUNTER: 'Contra',
    };

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
                        {ctype ? TYPE_LABELS[ctype] ?? ctype : '?'}
                    </div>
                </div>
            </div>

            <div className={['rounded-lg border p-3 text-xs text-zinc-300 leading-relaxed', ctype ? TYPE_BG[ctype] ?? '' : 'bg-zinc-800/30 border-zinc-700'].join(' ')}>
                {getCardDescription(cardId) || 'Sin descripción'}
            </div>
        </div>
    );
}

function EffectDetail({ stat, label, description }: { stat: string; label: string; description: string }) {
    const isDebuff = ['movementCost', 'difficulty', 'attackCost', 'blocked', 'passiveDamage', 'movementPenalty'].includes(stat);
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">{isDebuff ? '🔴' : '🟢'}</div>
                <div>
                    <div className="text-lg font-bold">{label}</div>
                    <div className={`text-xs font-semibold mt-1 ${isDebuff ? 'text-red-400' : 'text-green-400'}`}>
                        {isDebuff ? 'EFECTO NEGATIVO' : 'EFECTO POSITIVO'}
                    </div>
                </div>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed">
                {description}
            </div>
        </div>
    );
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

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="text-3xl">{poolEntry ? '📦' : isAlive ? '⚔️' : '💀'}</div>
                <div>
                    <div className={`text-lg font-bold ${CLASS_COLORS[unitClass]}`}>
                        {unit?.id ? `[${unit.id}]` : ''}{CLASS_DISPLAY[unitClass] ?? unitClass}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-blue-400' : 'text-red-400'}`}>
                        {isMine ? 'ALIADA' : 'ENEMIGA'}
                        {poolEntry ? ' (Sin desplegar)' : !isAlive ? ' (Eliminada)' : ''}
                    </div>
                </div>
            </div>

            {/* Unit stats */}
            <div className="grid grid-cols-2 gap-2">
                <StatBox label="HP" value={`${currentHp}/${maxHp}`} bar={poolEntry ? 100 : Math.round((currentHp / maxHp) * 100)} />
                <StatBox label="Ataque" value={`${unit?.attack ?? 3}`} />
                <StatBox label="Dificultad" value={`${unit?.difficulty ?? 6}`} />
                <StatBox label="Rango" value={`${unit?.range ?? 1}`} />
                <StatBox label="Movimiento" value={`${unit?.movementCost ?? 1}`} />
            </div>

            {/* Active effects */}
            {liveUnit && (() => {
                const { buffs, debuffs } = getUnitStatus(liveUnit, state.activeModifiers);
                const all = [...buffs.map(s => ({ s, isDebuff: false })), ...debuffs.map(s => ({ s, isDebuff: true }))];
                if (all.length === 0) return null;
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Efectos activos</div>
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
                    Posición: ({liveUnit.position.q}, {liveUnit.position.r})
                    {liveUnit.movedThisTurn && <span className="ml-2 text-zinc-400">· Se movió</span>}
                    {liveUnit.attackedThisTurn && <span className="ml-2 text-zinc-400">· Atacó</span>}
                </div>
            )}

            {/* Identity card abilities (general only) — special + global as cards */}
            {liveUnit && liveUnit.class === 'general' && (() => {
                const identityCardId = state.players[liveUnit.owner]?.selectedIdentity;
                if (!identityCardId) return null;
                const key = getIdentityKey(identityCardId);
                const identityInfo = IDENTITY_INFO[key];
                if (!identityInfo) return null;
                const sections = identityInfo.descVerbose.split('\n\n').filter(s => s.trim());
                const abilitySections = sections.slice(1); // skip flavor text
                return (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Identidad — {identityInfo.name}</div>
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
            {(unit?.abilities && unit.abilities.length > 0) && (
                <AbilityList key={unit.id} abilities={unit.abilities} ownerPlayerId={unit.owner} startCollapsed={unit.class === 'general'} />
            )}

            {poolEntry && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-[10px] text-zinc-400">
                    Unidad en pool de despliegue. Stats base de {CLASS_DISPLAY[unitClass]}.
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
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Habilidades</div>
            <div className="space-y-2">
                {abilities.map(abId => {
                    const ab = ABILITIES[abId];
                    if (!ab) return null;
                    const isOpen = expanded.has(abId);
                    let description = ab.description;
                    if (abId === 'blanco_facil' && ownerPlayerId?.startsWith('francotirador')) {
                        description = description.replace('-1 dificultad', '-2 dificultad');
                    }
                    return (
                        <div key={abId} className="border border-zinc-700 bg-zinc-800/50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs cursor-pointer select-none" onClick={() => toggleAbility(abId)}>
                                <span className="text-[9px] font-mono text-zinc-500">
                                    {ab.type === 'active' ? `⚡${ab.cost ?? '?'}PA` : '🔰'}
                                </span>
                                <span className="font-semibold text-zinc-200">{ab.name}</span>
                                <span className="ml-auto text-zinc-600 text-[10px]">{isOpen ? '▼' : '▶'}</span>
                            </div>
                            {isOpen && (
                                <>
                                    <div className="text-[11px] text-zinc-300 leading-relaxed">{description}</div>
                                    {ab.restrictions && (
                                        <div className="text-[10px] text-amber-400/80 italic">{ab.restrictions}</div>
                                    )}
                                    <div className="text-[9px] text-zinc-500">{ab.type === 'active' ? 'Activa' : 'Pasiva'}{ab.cost !== undefined ? ` · Coste: ${ab.cost} PA` : ''}</div>
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

function getMaxHp(cls: string): number {
    return BASE_STATS[cls as keyof typeof BASE_STATS]?.hp ?? 10;
}

function getUnitStatus(unit: Unit, modifiers: ModifierInstance[]): { buffs: string[]; debuffs: string[] } {
    const buffs: string[] = [];
    const debuffs: string[] = [];
    const harmfulStats = ['movementCost', 'difficulty', 'attackCost', 'bloqueo', 'inmovil'];
    const helpfulStats = ['attack', 'damage', 'ap', 'dotOnHit'];
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
    switch (stat) {
        case 'movementCost': return 'Coste movimiento alterado';
        case 'attack': return 'Ataque potenciado';
        case 'difficulty': return 'Dificultad modificada';
        case 'damage': return 'Daño alterado';
        case 'attackCost': return 'Coste ataque aumentado';
        case 'bloqueo': return 'Bloqueado';
        case 'inmovil': return 'Inmovilizado';
        case 'dotOnHit': return 'Daño pasivo preparado';
        case 'ap': return 'PA modificados';
        case 'passiveDamage': return 'Recibiendo daño pasivo';
        case 'movementPenalty': return 'Penalización de movimiento (×2)';
        default: return stat;
    }
}
