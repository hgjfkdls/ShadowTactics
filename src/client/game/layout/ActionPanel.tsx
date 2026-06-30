import { hexDistance } from '@shared';
import { ABILITIES } from '@shared/game/data/abilities';
import { BASE_STATS } from '@shared/game/units';
import { getPlayerAP } from '@shared/game/actions';
import { useKeyBindings } from '../KeyBindingsContext';
import type { GameState, UnitId, GameAction } from '@shared';
import { l } from '@shared/i18n';

type Props = {
    state: GameState;
    unitId: UnitId | null;
    playerId: string;
    canAct: boolean;
    onRequestMove?: (unitId: UnitId) => void;
    onRequestAttack?: (unitId: UnitId) => void;
    onRequestAbilityTarget?: (abilityId: string, unitId: UnitId) => void;
    onALaCarga?: (unitId: UnitId) => void;
    onAngelGuardian?: (unitId: UnitId) => void;
    sendAction?: (action: GameAction) => void;
    addAlert?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
};

function keyLabel(key: string): string {
    if (key === ' ') return 'SPACE';
    if (key === 'escape') return 'ESC';
    return key.toUpperCase();
}

export function ActionPanel({ state, unitId, playerId, canAct, onRequestMove, onRequestAttack, onRequestAbilityTarget, onALaCarga, onAngelGuardian, sendAction, addAlert }: Props) {
    const { bindings } = useKeyBindings();

    const unit = (unitId && state.units[unitId]?.owner === playerId && canAct) ? state.units[unitId] : null;

    const ap = unit ? getPlayerAP(state, playerId) : 0;
    const extraCharges = unit?.ataqueExtraCharges ?? 0;

    const effectiveMoveCost = unit ? (() => {
        let cost = unit.movementCost;
        const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
        if (hasSurcharge) cost += 1;
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

    const hasAdjacentEnemy = unit
        ? Object.values(state.units).filter(u => u.owner !== playerId).some(u => hexDistance(unit.position, u.position) === 1)
        : false;

    const basicActions = unit ? [
        {
            id: '__attack__',
            label: (unit.attackedThisTurn && !extraCharges) ? l('button.alreadyAttacked') : l('button.basicAttack'),
            cost: extraCharges > 0 ? 0 : 1,
            disabled: unit.attackedThisTurn && !extraCharges,
            binding: bindings.BASIC_ATTACK,
        },
        { id: '__move__', label: l('button.move'), cost: effectiveMoveCost, disabled: ap < effectiveMoveCost, binding: bindings.MOVE },
    ] : [];

    const aLaCargaCost = state.players[playerId]?.aLaCargaCost ?? 0;

    const abilityActions = unit
        ? activeAbilities.map((a, i) => {
            const cost = a.id === 'a_la_carga' ? aLaCargaCost : (a.def!.cost ?? 0);
            const disabled =
                (a.id === 'accion_evasiva' && (!!unit.movedThisTurn || !hasAdjacentEnemy)) ||
                (a.id === 'patada_acrobatica' && (!!unit.usedPatadaAcrobatica || !hasAdjacentEnemy)) ||
                (a.id === 'doble_ataque' && (!!unit.usedCarga || !unit.attackedThisTurn || !!unit.usedDobleAtaque || !!unit.usedVentajaAlcance)) ||
                (a.id === 'cabalgar' && (!!unit.attackedThisTurn || !!unit.usedCabalgar || !!unit.movedThisTurn)) ||
                (a.id === 'cabalgar_2' && (!!unit.attackedThisTurn || !!unit.usedCabalgar || !!unit.movedThisTurn)) ||
                (a.id === 'carga' && (!unit.usedCabalgar || !!unit.usedCarga || !!unit.movedThisTurn || !!unit.attackedThisTurn)) ||
                (a.id === 'ventaja_alcance' && (!!unit.attackedThisTurn || !!unit.usedVentajaAlcance || !!unit.usedDobleAtaque)) ||
                (a.id === 'rayo_celestial' && !!unit.usedRayoCelestial) ||
                (a.id === 'a_la_carga' && (!!unit.aLaCargaActive || !!unit.usedCabalgar || !!unit.movedThisTurn || !!unit.attackedThisTurn || ap < cost + 1)) ||
                (a.id === 'torbellino' && !!unit.usedTorbellino) ||
                (a.id === 'meditacion' && (unit.hp >= BASE_STATS[unit.class].hp || ap < 2)) ||
                (a.id === 'posicion_estrategica' && !!unit.usedPosicionEstrategica) ||
                (a.id === 'en_nombre_del_rey' && !!unit.usedEnNombreDelRey) ||
                (a.id === 'desenvainado_veloz' && !!unit.usedDesenvainadoVeloz) ||
                (a.id === 'sacrificar' && (unit.hp >= BASE_STATS[unit.class].hp || !Object.values(state.units).some(u => u.owner === playerId && u.id !== unit.id && hexDistance(unit.position, u.position) === 1))) ||
                (a.id === 'angel_guardian' && ap < 2) ||
                (a.id === 'proteger' && !Object.values(state.units).some(u => u.owner === playerId && u.id !== unit.id && hexDistance(unit.position, u.position) <= 3)) ||
                ap < cost;
            const abBinding = i === 0 ? bindings.ABILITY_1 : i === 1 ? bindings.ABILITY_2 : bindings.ABILITY_3;
            const abName = l(`ability.${a.id}.name`) || a.def!.name;
            return {
                id: a.id, label: abName, cost,
                disabled, binding: abBinding, def: a.def,
            };
        })
        : [];

    const allActions = [...basicActions, ...abilityActions];

    function handleClick(actionId: string) {
        if (!unit) return;
        if (actionId === '__attack__') {
            const ec = unit.ataqueExtraCharges ?? 0;
            if (unit.attackedThisTurn && !ec) {
                addAlert?.(l('alert.alreadyAttacked'), 'warning');
            } else if (ap < 1 && !ec) {
                addAlert?.(l('alert.noPA'), 'warning');
            } else {
                onRequestAttack?.(unit.id);
            }
        } else if (actionId === '__move__') {
            if (ap < effectiveMoveCost) {
                addAlert?.(l('alert.noPA'), 'warning');
            } else {
                onRequestMove?.(unit.id);
            }
        } else if (actionId === 'a_la_carga' && unit) {
            onALaCarga?.(unit.id);
        } else if (actionId === 'angel_guardian' && unit) {
            onAngelGuardian?.(unit.id);
        } else {
            const ab = abilityActions.find(a => a.id === actionId);
            if (ab?.disabled) {
                addAlert?.(l('alert.abilityNotAvailable'), 'warning');
            } else if (!ab?.def?.requiresTarget && !['cabalgar', 'cabalgar_2', 'accion_evasiva', 'posicion_estrategica'].includes(actionId) && unit) {
                sendAction?.({ type: 'USE_ABILITY', playerId, unitId: unit.id, abilityId: actionId });
            } else {
                onRequestAbilityTarget?.(actionId, unit.id);
            }
        }
    }

    return (
        <div className="absolute bottom-4 right-4 bg-zinc-800/95 border border-zinc-600 rounded-lg p-3 shadow-xl z-30 w-[300px] h-[253px] flex flex-col">
            <div className="text-xs font-semibold text-zinc-400 mb-2">{l('abilityPanel.title')}</div>
            {unit ? (
                <div className="flex flex-col gap-1 flex-1">
                    {allActions.map((a, i) => (
                        <div
                            key={a.id}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition cursor-pointer ${
                                a.disabled
                                    ? 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 hover:text-white'
                            }`}
                            onClick={() => { if (!a.disabled) handleClick(a.id); }}
                        >
                            <span className={a.disabled ? 'text-zinc-500' : 'text-zinc-200'}>
                                {a.label} ({a.cost} PA)
                            </span>
                            {a.binding && (
                                <span className="ml-3 text-xs font-bold text-blue-400">[{keyLabel(a.binding)}]</span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                    {l('board.noSelection')}
                </div>
            )}
        </div>
    );
}
