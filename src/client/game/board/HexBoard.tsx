import { useState } from 'react';
import { generateHexMap, hexDistance } from '@shared';
import { HexTile } from './HexTile';
import { UnitsLayer } from './UnitsLayer';
import { useBoardInteraction } from './useBoardInteraction';
import { useViewport } from './useViewport';
import { getMoveRange } from './movementRange';
import { AttackResultPanel } from '../layout/AttackResultPanel';
import type { GameAction, GameState, HexCoord, UnitId } from '@shared';
import { isHexOccupied, isWithinBounds, countPlayerClasses } from '@shared/game/utils';
import { ABILITIES } from '@shared/game/data/abilities';

type PendingAbility = { abilityId: string; unitId: UnitId } | null;

type Props = {
    state: GameState;
    sendAction: (action: any) => void;
    mode?: 'GAME' | 'DEPLOYMENT';
    playerId?: string;
    selectedDeployUnitId?: string | null;
    onInfoSelect?: (info: { type: 'unit'; unitId: string }) => void;
    addAlert?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
};

export function HexBoard({ state, sendAction, mode = 'GAME', playerId, selectedDeployUnitId, onInfoSelect, addAlert }: Props) {
    const hexes = generateHexMap(state.map);
    const {
        hoveredHex,
        selectedHex,
        selectedUnitId,
        setHoveredHex,
        setSelectedHex,
        setSelectedUnitId,
    } = useBoardInteraction();
    const [movingUnitId, setMovingUnitId] = useState<UnitId | null>(null);
    const [attackingUnitId, setAttackingUnitId] = useState<UnitId | null>(null);
    const [pendingAbility, setPendingAbility] = useState<PendingAbility>(null);

    const { scale, x, y, zoom, pan } = useViewport();

    const myPlayerId = playerId ?? 'p1';
    const isMyTurn = mode === 'DEPLOYMENT'
        ? state.currentDeployingPlayer === myPlayerId
        : state.activePlayer === myPlayerId || true;

    const moveRange = mode === 'GAME' && movingUnitId
        ? getMoveRange(state, movingUnitId)
        : [];

    const attackTargets = mode === 'GAME' && attackingUnitId
        ? getAttackTargets(state, attackingUnitId, myPlayerId)
        : [];

    const abilityTargets = mode === 'GAME' && pendingAbility
        ? getAbilityTargets(state, pendingAbility.unitId, pendingAbility.abilityId, myPlayerId)
        : [];

    const abilityMoveTargets = mode === 'GAME' && pendingAbility
        ? getAbilityMoveTargets(state, pendingAbility.unitId, pendingAbility.abilityId)
        : [];

    const rangeHexes = mode === 'GAME' && (attackingUnitId || pendingAbility)
        ? getRangeHexes(state, attackingUnitId, pendingAbility)
        : [];

    const deployValidHexes = mode === 'DEPLOYMENT' && selectedDeployUnitId
        ? getDeployableHexes(state, myPlayerId)
        : [];

    function isReachable(hex: HexCoord) {
        return moveRange.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isAttackTarget(hex: HexCoord) {
        return attackTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isDeployable(hex: HexCoord) {
        return deployValidHexes.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isAbilityTarget(hex: HexCoord) {
        return abilityTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isAbilityMoveTarget(hex: HexCoord) {
        return abilityMoveTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isInRange(hex: HexCoord) {
        return rangeHexes.some(h => h.q === hex.q && h.r === hex.r);
    }

    function onHexClick(hex: HexCoord) {
        if (!isMyTurn) return;

        if (mode === 'DEPLOYMENT') {
            if (selectedDeployUnitId && isDeployable(hex)) {
                const poolEntry = state.players[myPlayerId]?.unitsToDeploy?.find(u => u.unitId === selectedDeployUnitId);
                if (poolEntry) {
                    const classCounts = countPlayerClasses(state, myPlayerId);
                    const deployed = state.players[myPlayerId]?.deployedUnits?.length ?? 0;
                    if (classCounts.general === 0 && poolEntry.unitClass !== 'general' && deployed >= 10) {
                        addAlert?.('Debes desplegar primero a tu general', 'warning');
                        return;
                    }
                }
                const action: GameAction = {
                    type: 'DEPLOY_UNIT',
                    playerId: myPlayerId,
                    unitId: selectedDeployUnitId,
                    position: hex,
                };
                sendAction(action);
            } else if (selectedDeployUnitId) {
                addAlert?.('Posición no válida para desplegar', 'warning');
            }
            return;
        }

        setSelectedHex(hex);

        if (movingUnitId && isReachable(hex)) {
            const action: GameAction = {
                type: 'MOVE_UNIT',
                playerId: myPlayerId,
                unitId: movingUnitId,
                to: hex,
            };
            sendAction(action);
            setMovingUnitId(null);
        } else if (movingUnitId && !isReachable(hex)) {
            addAlert?.('No puedes moverte a esa casilla', 'warning');
        } else if (attackingUnitId && isAttackTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && target.owner !== myPlayerId) {
                sendAction({ type: 'ATTACK_UNIT', playerId: myPlayerId, unitId: attackingUnitId, targetId: target.id });
                setAttackingUnitId(null);
            }
        } else if (attackingUnitId && !isAttackTarget(hex)) {
            addAlert?.('No hay enemigos en esa posición', 'warning');
        } else if (pendingAbility) {
            if (isAbilityMoveTarget(hex)) {
                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, to: hex });
                setPendingAbility(null);
            } else if (isAbilityTarget(hex)) {
                const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                if (target && target.owner !== myPlayerId) {
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, targetId: target.id });
                    setPendingAbility(null);
                }
            } else {
                addAlert?.('Posición no válida para esa habilidad', 'warning');
            }
        }
    }

    return (
        <>
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="-400 -400 800 800"
                onWheel={e => zoom(-e.deltaY * 0.001)}
                onMouseMove={e => e.buttons === 1 && pan(e.movementX, e.movementY)}
            >
                <g transform={`translate(${x} ${y}) scale(${scale})`}>
                    {hexes.map(hex => (
                        <HexTile
                            key={`${hex.q},${hex.r}`}
                            hex={hex}
                            hovered={
                                hoveredHex?.q === hex.q &&
                                hoveredHex?.r === hex.r
                            }
                            selected={false}
                            reachable={
                                mode === 'DEPLOYMENT' ? isDeployable(hex)
                                : mode === 'GAME' && pendingAbility ? isAbilityMoveTarget(hex)
                                : isReachable(hex)
                            }
                            attackable={
                                mode === 'GAME'
                                ? (attackingUnitId !== null && isAttackTarget(hex)) ||
                                  (pendingAbility !== null && isAbilityTarget(hex))
                                : false
                            }
                            inRange={
                                mode === 'GAME' && !isReachable(hex) && !(attackingUnitId !== null && isAttackTarget(hex)) && !(pendingAbility !== null && isAbilityTarget(hex))
                                ? isInRange(hex)
                                : false
                            }
                            onHover={setHoveredHex}
                            onClick={onHexClick}
                        />
                    ))}

                    <UnitsLayer
                        state={state}
                        selectedUnitId={selectedUnitId}
                        attackingUnitId={attackingUnitId}
                        pendingAbilityId={pendingAbility?.abilityId ?? null}
                        pendingAbilityUnitId={pendingAbility?.unitId ?? null}
                        playerId={myPlayerId}
                        canAct={mode === 'GAME' && isMyTurn}
                        onInfoSelect={onInfoSelect}
                        sendAction={sendAction}
                        onSelectUnit={unitId => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            setSelectedUnitId(unitId);
                            setMovingUnitId(null);
                            setAttackingUnitId(null);
                            setPendingAbility(null);
                        }}
                        onRequestMove={unitId => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            setSelectedUnitId(unitId);
                            setMovingUnitId(unitId);
                            setAttackingUnitId(null);
                            setPendingAbility(null);
                        }}
                        onRequestAttack={unitId => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            setSelectedUnitId(unitId);
                            setAttackingUnitId(unitId);
                            setMovingUnitId(null);
                            setPendingAbility(null);
                        }}
                        onAttackUnit={(attackerId, targetId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            sendAction({ type: 'ATTACK_UNIT', playerId: myPlayerId, unitId: attackerId, targetId });
                            setAttackingUnitId(null);
                        }}
                        onRequestAbilityTarget={(abilityId, unitId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            setSelectedUnitId(unitId);
                            setPendingAbility({ abilityId, unitId });
                            setMovingUnitId(null);
                            setAttackingUnitId(null);
                        }}
                        onUseAbilityOnUnit={(abilityId, unitId, targetId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, targetId });
                            setPendingAbility(null);
                        }}
                    />
                </g>
            </svg>
            <AttackResultPanel lastAttackResult={state.lastAttackResult} />
        </>
    );
}

function getDeployableHexes(state: GameState, playerId: string): HexCoord[] {
    const hexes = generateHexMap(state.map);
    const deployedCount = state.players[playerId]?.deployedUnits?.length ?? 0;

    return hexes.filter(hex => {
        if (isHexOccupied(state, hex)) return false;
        if (!isWithinBounds(hex, state.map.radius)) return false;

        if (deployedCount === 0) {
            return hexDistance(hex, state.centerHex) === 2;
        }

        const nearAlly = Object.values(state.units)
            .filter(u => u.owner === playerId)
            .some(u => hexDistance(u.position, hex) <= 2);
        return nearAlly;
    });
}

function getAttackTargets(state: GameState, unitId: UnitId, playerId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    const range = unit.range;

    return Object.values(state.units)
        .filter(u => u.owner !== playerId)
        .filter(u => hexDistance(unit.position, u.position) <= range)
        .map(u => u.position);
}

function getAbilityTargets(state: GameState, unitId: UnitId, abilityId: string, playerId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    let range: number;
    switch (abilityId) {
        case 'disparo_rapido': range = 2; break;
        case 'doble_ataque':
        case 'fuego_cobertura':
        case 'avance': range = unit.range; break;
        case 'carga': range = 1; break;
        case 'ventaja_alcance': range = unit.range + 1; break;
        default: return [];
    }

    return Object.values(state.units)
        .filter(u => u.owner !== playerId)
        .filter(u => hexDistance(unit.position, u.position) <= range)
        .map(u => u.position);
}

function getAbilityMoveTargets(state: GameState, unitId: UnitId, abilityId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];
    const hexes = generateHexMap(state.map);

    if (abilityId === 'accion_evasiva') {
        const hasAdjacentEnemy = Object.values(state.units)
            .filter(u => u.owner !== unit.owner)
            .some(u => hexDistance(unit.position, u.position) === 1);
        if (!hasAdjacentEnemy) return [];
        return hexes.filter(h => !isHexOccupied(state, h) && hexDistance(unit.position, h) === 1);
    }

    if (abilityId === 'cabalgar') {
        return hexes.filter(h => {
            const d = hexDistance(unit.position, h);
            if (d !== 2) return false;
            if (isHexOccupied(state, h)) return false;
            const dq = h.q - unit.position.q;
            const dr = h.r - unit.position.r;
            // Solo los 6 ejes hexagonales: (2,0), (0,2), (-2,2), (-2,0), (0,-2), (2,-2)
            if (dq !== 0 && dr !== 0 && dq !== -dr) return false;
            // Check intermediate hex is not occupied
            if (dq !== 0 && dr !== 0) {
                // Diagonal: both possible intermediate hexes must be free
                const mid1 = { q: unit.position.q + dq, r: unit.position.r };
                const mid2 = { q: unit.position.q, r: unit.position.r + dr };
                if (isHexOccupied(state, mid1) || isHexOccupied(state, mid2)) return false;
            } else {
                // Straight axis: single midpoint
                const mid = { q: unit.position.q + dq / 2, r: unit.position.r + dr / 2 };
                if (isHexOccupied(state, mid)) return false;
            }
            return true;
        });
    }

    return [];
}

function getRangeHexes(state: GameState, attackingUnitId: UnitId | null, pendingAbility: { abilityId: string; unitId: UnitId } | null): HexCoord[] {
    if (!attackingUnitId && !pendingAbility) return [];

    const unitId = attackingUnitId ?? pendingAbility!.unitId;
    const unit = state.units[unitId];
    if (!unit) return [];

    let range: number;
    if (attackingUnitId) {
        range = unit.range;
    } else {
        const abilityId = pendingAbility!.abilityId;
        switch (abilityId) {
            case 'disparo_rapido': range = 2; break;
            case 'carga': range = 1; break;
            case 'doble_ataque':
            case 'fuego_cobertura':
            case 'avance': range = unit.range; break;
            case 'ventaja_alcance': range = unit.range + 1; break;
            default: return [];
        }
    }

    const hexes = generateHexMap(state.map);
    return hexes.filter(h =>
        isWithinBounds(h, state.map.radius) &&
        hexDistance(unit.position, h) <= range
    );
}
