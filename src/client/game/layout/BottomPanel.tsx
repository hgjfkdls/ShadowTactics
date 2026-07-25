import { getCardName, getCardType } from '@shared/game/actions/card';
import { hexDistance } from '@shared';
import { ABILITIES } from '@shared/game/data/abilities';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { BASE_STATS } from '@shared/game/units';
import { isAbilityDisabled } from '../abilityUI';
import type { GameState, UnitId, GameAction } from '@shared';
import { l } from '@shared/i18n';
import { useKeyBindings } from '../KeyBindingsContext';
import AbilityIcon from '../icons/AbilityIcon';

type Props = {
    state: GameState;
    playerId: string;
    selectedUnitId: UnitId | null;
    canAct: boolean;
    sendAction: (action: GameAction) => void;
    addAlert?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    onRequestMove?: (unitId: UnitId) => void;
    onRequestAttack?: (unitId: UnitId) => void;
    onRequestAbilityTarget?: (abilityId: string, unitId: UnitId) => void;
    onAngelGuardian?: (unitId: UnitId) => void;
    onCardSelect?: (cardId: string) => void;
};

function keyLabel(key: string): string {
    if (key === ' ') return 'SPACE';
    if (key === 'escape') return 'ESC';
    return key.toUpperCase();
}

const CLASS_ICONS: Record<string, string> = {
    archer: '/icons/units/arquero_icon.webp',
    infantry: '/icons/units/infanteria_icon.webp',
    cavalry: '/icons/units/caballeria_icon.webp',
    lancer: '/icons/units/lancero_icon.webp',
    general: '/icons/units/general_icon.webp',
};

function ActionCell({ icon, paCost, keyBind, label, description, disabled, onClick }: {
    icon: React.ReactNode;
    paCost: number | string;
    keyBind: string;
    label: string;
    description?: string;
    disabled?: boolean;
    onClick?: () => void;
}) {
    const content = (
        <div className={`flex w-full h-full rounded bg-zinc-800/50 group relative hover:bg-zinc-700/60 transition cursor-pointer p-1.5 ${disabled ? 'opacity-40 hover:opacity-100' : ''}`}>
            <div className="w-10 h-10 shrink-0 flex items-center justify-center self-center">
                {icon}
            </div>
            <div className="flex flex-col items-end justify-between flex-1 min-w-0 py-0.5">
                <span className="text-[8px] text-blue-400 font-bold leading-none">{keyBind ? `[${keyBind}]` : ''}</span>
                <span className="text-[8px] text-zinc-500 font-mono leading-none">{paCost}PA</span>
            </div>
            {label && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                    <div className="bg-zinc-900/95 border border-zinc-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap min-w-[160px]">
                        <div className="text-[11px] font-bold text-zinc-200 border-b border-zinc-700 pb-1 mb-1">{label}</div>
                        {description && <div className="text-[9px] text-zinc-400 max-w-[200px] whitespace-normal">{description}</div>}
                        <div className="flex gap-3 mt-1.5 text-[8px] text-zinc-500 border-t border-zinc-700/50 pt-1">
                            <span>{paCost} PA</span>
                            <span className="text-blue-400 font-bold">[{keyBind}]</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    if (onClick) {
        return <button disabled={disabled} onClick={onClick} className="w-full h-full">{content}</button>;
    }
    return <div className="w-full h-full">{content}</div>;
}

export function BottomPanel({ state, playerId, selectedUnitId, canAct, sendAction, addAlert, onRequestMove, onRequestAttack, onRequestAbilityTarget, onAngelGuardian, onCardSelect }: Props) {
    const { bindings } = useKeyBindings();
    const hand = state.players[playerId]?.cardsInHand ?? [];
    const isMyTurn = state.activePlayer === playerId;
    const isDrawDiscard = state.turnPhase === 'DRAW' && isMyTurn && hand.length > 3;
    const isCounterWindow = state.turnPhase === 'COUNTER' && !isMyTurn;

    const unit = (selectedUnitId && state.units[selectedUnitId]?.owner === playerId && canAct) ? state.units[selectedUnitId] : null;
    const ap = unit ? (state.players[playerId]?.actionPoints ?? 0) : 0;

    const effectiveMoveCost = unit ? (() => {
        let cost = unit.movementCost;
        cost += state.activeModifiers
            .filter(m => m.stat === 'actionCost' && m.targetId === unit.id && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0)
            .reduce((s, m) => s + m.value, 0);
        const moveMods = state.activeModifiers.filter(
            m => m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
        );
        for (const m of moveMods) {
            if (m.operator === 'SET') cost = m.value;
            else if (m.operator === 'ADD') cost += m.value;
            else if (m.operator === 'MUL') cost *= m.value;
        }
        return Math.max(0, cost);
    })() : 0;

    const activeAbilities = unit
        ? (unit.abilities ?? []).map(id => ({ id, def: ABILITIES[id] })).filter(a => a.def?.type === 'active')
        : [];

    const uFlags = unit?.flags ?? [];
    const attackCostSet = unit ? state.activeModifiers.find(m =>
        m.stat === 'attackCost' && m.operator === 'SET' && m.targetId === unit.id && (m.remainingUses ?? 1) > 0
        && (m.consumedBy === undefined || m.consumedBy === 'ataque_basico')
    ) : undefined;
    const extraCharges = unit?.ataqueExtraCharges ?? 0;
    const basicAttackCost = attackCostSet !== undefined ? Math.max(0, attackCostSet.value) : (extraCharges > 0 ? 0 : 1);
    const basicAttackDisabled = extraCharges > 0 ? false : !!(unit && isAbilityDisabled(state, 'ataque_basico', unit, playerId, ap));

    const attacksDisabled = !unit || basicAttackDisabled;
    const movesDisabled = !unit || ap < effectiveMoveCost;

    function getAbilityDesc(id: string): string {
        const cfg = ABILITY_CONFIG[id];
        if (!cfg) return '';
        const txt = l(`ability.${id}.desc`);
        if (txt && txt !== `ability.${id}.desc`) return txt;
        return cfg.description ?? '';
    }

    const abilities = unit ? activeAbilities.slice(0, 3).map((a, i) => {
        const cost = a.id === 'a_la_carga' ? 1 : (a.def!.cost ?? 0);
        const disabledReason = isAbilityDisabled(state, a.id, unit, playerId, ap);
        const extraBlock =
            (a.id === 'a_la_carga' && (uFlags.includes('a_la_carga') || uFlags.includes('carga') || uFlags.includes('basic_attack') || ap < cost)) ||
            (a.id === 'sacrificar' && (unit.hp >= BASE_STATS[unit.class].hp || !Object.values(state.units).some(u => u.owner === playerId && u.id !== unit.id && hexDistance(unit.position, u.position) === 1))) ||
            (a.id === 'ejecutar' && !Object.values(state.units).some(u => u.owner !== playerId && hexDistance(unit.position, u.position) === 1 && u.hp <= 2)) ||
            (a.id === 'proteger' && !Object.values(state.units).some(u => u.owner === playerId && u.id !== unit.id && hexDistance(unit.position, u.position) <= 3)) ||
            ap < cost;
        const disabled = !!disabledReason || extraBlock;
        const abBinding = i === 0 ? bindings.ABILITY_1 : i === 1 ? bindings.ABILITY_2 : bindings.ABILITY_3;
        const abName = l(`ability.${a.id}.name`) || a.def!.name;
        return { id: a.id, label: abName, desc: getAbilityDesc(a.id), cost, disabled, binding: abBinding };
    }) : [];

    function handleCardClick(cid: string) {
        if (!onCardSelect) return;
        onCardSelect(cid);
    }

    function handleAttack() {
        if (!unit) return;
        const ec = unit.ataqueExtraCharges ?? 0;
        if (unit.attackedThisTurn && !ec) { addAlert?.(l('alert.alreadyAttacked'), 'warning'); return; }
        if (ap < basicAttackCost) { addAlert?.(l('alert.noPA'), 'warning'); return; }
        onRequestAttack?.(unit.id);
    }

    function handleMove() {
        if (!unit) return;
        if (ap < effectiveMoveCost) { addAlert?.(l('alert.noPA'), 'warning'); return; }
        onRequestMove?.(unit.id);
    }

    function handleAbility(a: { id: string }) {
        if (!unit) return;
        if (a.id === 'a_la_carga') { onRequestAbilityTarget?.(a.id, unit.id); return; }
        if (a.id === 'angel_guardian') { onAngelGuardian?.(unit.id); return; }
        const def = activeAbilities.find(x => x.id === a.id)?.def;
        if (!def?.requiresTarget && !['cabalgar', 'cabalgar_2', 'posicion_estrategica'].includes(a.id)) {
            sendAction({ type: 'USE_ABILITY', playerId, unitId: unit.id, abilityId: a.id });
        } else {
            onRequestAbilityTarget?.(a.id, unit.id);
        }
    }

    const unitCls = unit?.class;

    return (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <div className="bg-zinc-800/80 border border-zinc-600/60 border-b-0 rounded-t-lg shadow-xl pointer-events-auto flex flex-col h-[132px] min-h-[132px] w-[800px] max-w-[95vw]">
                {/* Title row */}
                <div className="flex shrink-0 border-b border-zinc-700/40">
                    <div className="flex-[3] text-[9px] text-zinc-500 font-semibold uppercase tracking-wide text-center py-1">{l('board.cards')}</div>
                    <div className="flex-[2] text-[9px] text-zinc-500 font-semibold uppercase tracking-wide text-center py-1">{l('abilityPanel.title')}</div>
                </div>
                {/* Content row */}
                <div className="flex flex-1 min-h-0">
                {/* Left section: cards */}
                <div className="flex-[3] flex items-start px-2 pt-0.5">
                    <div className="flex flex-col gap-1 w-full">
                        <div className="grid grid-cols-5 gap-y-1 w-full items-start">
                            {/* Col 1: Card icon + count (same style as overlay) */}
                            <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 h-[58px] self-center">
                                <img src="/cards/es/reverso.webp" alt="cards" className="w-[29px] h-[41px] rounded object-contain shrink-0" />
                                <span className="text-[10px] font-bold text-zinc-300">x{hand.length}</span>
                            </div>

                            {/* Cols 2-5: Card icons */}
                            {Array.from({ length: 4 }).map((_, i) => {
                                const cid = hand[i];
                                const iconUrl = cid ? `/cards/icons/${cid.replace(/_\d+$/, '')}_icon.webp` : null;
                                return (
                                    <button
                                        key={i}
                                        disabled={!cid || (!isMyTurn && !isCounterWindow && !isDrawDiscard)}
                                        onClick={() => cid && handleCardClick(cid)}
                                        className={`flex flex-col items-center gap-0.5 min-w-0 rounded transition cursor-pointer py-1 ${
                                            cid
                                                ? 'hover:bg-zinc-700/40'
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <div className={`w-[58px] h-[58px] rounded-xl border-2 flex items-center justify-center shrink-0 overflow-hidden ${
                                            cid
                                                ? 'border-white/30 bg-zinc-800/80'
                                                : 'bg-zinc-800/40 border-zinc-700/30'
                                        }`}>
                                            {cid && iconUrl && <img src={iconUrl} alt="" className="w-[38px] h-[38px] object-contain" />}
                                        </div>
                                        <span className="text-[9px] font-semibold text-zinc-400 truncate max-w-[60px] leading-tight text-center">
                                            {cid ? getCardName(cid) : '—'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {/* Alert row spanning full width */}
                        <div className="text-center">
                            {isDrawDiscard && <span className="text-[9px] text-amber-400 font-semibold">{l('alert.discardBeforeAct')}</span>}
                            {isCounterWindow && <span className="text-[9px] text-violet-400 font-semibold uppercase">{l('board.counterWindow')}</span>}
                        </div>
                    </div>
                </div>

                {/* Right section: 3x2 grid (40%) */}
                <div className="flex-[2] flex flex-col items-center px-2 h-full">
                    <div className="flex-1 w-full">
                    {!unit ? (
                        <div className="flex items-center justify-center w-full h-full bg-zinc-800/30 rounded">
                            <span className="text-[10px] text-zinc-500 italic">{l('board.noSelection')}</span>
                        </div>
                    ) : (
                    <div className="grid grid-cols-3 grid-rows-2 gap-1.5 h-full w-full">
                        {/* (0,0): Class icon + name */}
                        <div className="flex items-center gap-1 bg-zinc-800/40 rounded group relative pl-1 pr-1.5">
                            <img src={CLASS_ICONS[unit.class] || '/icons/units/infanteria_icon.webp'} alt={unit.class} className="w-12 h-12 object-contain shrink-0" />
                            <span className="text-[11px] font-semibold text-zinc-300 leading-tight">{l(`unit.class.${unit.class}`)}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                <div className="bg-zinc-900/95 border border-zinc-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                    <div className="text-[11px] font-bold text-zinc-200">{l(`unit.class.${unit.class}`)}</div>
                                    <div className="text-[9px] text-zinc-400">{l('unitDetail.hp')}: {unit.hp}/{BASE_STATS[unit.class]?.hp} · {l('unitDetail.attack')}: {unit.attack} · {l('unitDetail.difficulty')}: {unit.difficulty}</div>
                                </div>
                            </div>
                        </div>

                        {/* (1,0): Basic attack */}
                        <ActionCell
                            icon={<img src="/icons/stats/atk_icon.webp" alt="atk" className="w-10 h-10 object-contain" />}
                            paCost={basicAttackCost}
                            keyBind={keyLabel(bindings.BASIC_ATTACK)}
                            label={l('button.basicAttack')}
                            description={l('ability.ataque_basico.desc')}
                            disabled={attacksDisabled}
                            onClick={handleAttack}
                        />

                        {/* (2,0): Move */}
                        <ActionCell
                            icon={<img src="/icons/stats/mov_icon.webp" alt="mov" className="w-10 h-10 object-contain" />}
                            paCost={effectiveMoveCost}
                            keyBind={keyLabel(bindings.MOVE)}
                            label={l('button.move')}
                            description={l('ability.movimiento.desc')}
                            disabled={movesDisabled}
                            onClick={handleMove}
                        />

                        {/* (0,1): Ability 1 */}
                        {abilities[0] ? (
                            <ActionCell
                                icon={<AbilityIcon abilityId={abilities[0].id} size={40} cls={unitCls} />}
                                paCost={abilities[0].cost}
                                keyBind={keyLabel(abilities[0].binding)}
                                label={abilities[0].label}
                                description={abilities[0].desc}
                                disabled={abilities[0].disabled}
                                onClick={() => handleAbility(abilities[0])}
                            />
                        ) : (
                            <div className="bg-zinc-800/30 rounded" />
                        )}

                        {/* (1,1): Ability 2 */}
                        {abilities[1] ? (
                            <ActionCell
                                icon={<AbilityIcon abilityId={abilities[1].id} size={40} cls={unitCls} />}
                                paCost={abilities[1].cost}
                                keyBind={keyLabel(abilities[1].binding)}
                                label={abilities[1].label}
                                description={abilities[1].desc}
                                disabled={abilities[1].disabled}
                                onClick={() => handleAbility(abilities[1])}
                            />
                        ) : (
                            <div className="bg-zinc-800/30 rounded" />
                        )}

                        {/* (2,1): Ability 3 */}
                        {abilities[2] ? (
                            <ActionCell
                                icon={<AbilityIcon abilityId={abilities[2].id} size={40} cls={unitCls} />}
                                paCost={abilities[2].cost}
                                keyBind={keyLabel(abilities[2].binding)}
                                label={abilities[2].label}
                                description={abilities[2].desc}
                                disabled={abilities[2].disabled}
                                onClick={() => handleAbility(abilities[2])}
                            />
                        ) : (
                            <div className="bg-zinc-800/30 rounded" />
                        )}
                    </div>
                    )}
                </div>
            </div>
        </div>
    </div>
</div>
    );
}
