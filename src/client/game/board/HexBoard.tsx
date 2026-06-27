import { useState, useEffect, useRef } from 'react';
import { generateHexMap, hexDistance } from '@shared';
import { HexTile } from './HexTile';
import { UnitsLayer } from './UnitsLayer';
import { useBoardInteraction } from './useBoardInteraction';
import { useViewport } from './useViewport';
import { getMoveRange } from './movementRange';
import { HistoryPanel } from '../layout/AttackResultPanel';
import { PendingOccupationPanel } from '../layout/PendingOccupationPanel';
import { ActionPanel } from '../layout/ActionPanel';
import type { GameAction, GameState, HexCoord, UnitId } from '@shared';
import { isHexOccupied, isWithinBounds, countPlayerClasses } from '@shared/game/utils';
import { ABILITIES } from '@shared/game/data/abilities';
import { BASE_STATS } from '@shared/game/units';
import { getPlayerAP } from '@shared/game/actions';
import { getCardName, getCardType } from '@shared/game/actions/card';
import { useKeyBindings } from '../KeyBindingsContext';

type PendingAbility = { abilityId: string; unitId: UnitId } | null;

type Props = {
    state: GameState;
    sendAction: (action: any) => void;
    mode?: 'GAME' | 'DEPLOYMENT';
    playerId?: string;
    selectedDeployUnitId?: string | null;
    selectedInfo?: { type: string; [key: string]: any } | null;
    onInfoSelect?: (info: any) => void;
    addAlert?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    disableInput?: boolean;
};

export function HexBoard({ state, sendAction, mode = 'GAME', playerId, selectedDeployUnitId, selectedInfo, onInfoSelect, addAlert, disableInput }: Props) {
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
    const [pendingIdentityTargetId, setPendingIdentityTargetId] = useState<UnitId | null>(null);
    const [pendingPatadaTargetId, setPendingPatadaTargetId] = useState<UnitId | null>(null);
    const [cabalgarPath, setCabalgarPath] = useState<HexCoord[]>([]);
    const [cabalgarIsLaCarga, setCabalgarIsLaCarga] = useState(false);
    const [pendingTorbellino, setPendingTorbellino] = useState(false);
    const [pendingAngelGuardian, setPendingAngelGuardian] = useState(false);
    const [pendingCounterEspejoCard, setPendingCounterEspejoCard] = useState<string | null>(null);
    const [animPath, setAnimPath] = useState<HexCoord[] | null>(null);
    const [animStartPos, setAnimStartPos] = useState<HexCoord | null>(null);
    const [animUnitId, setAnimUnitId] = useState<UnitId | null>(null);
    const [animStep, setAnimStep] = useState(0);
    const animStepRef = useRef(0);
    const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!animPath || !animStartPos) return;
        const totalSteps = animPath.length + 1;
        if (animStep >= totalSteps) {
            setAnimPath(null);
            setAnimStartPos(null);
            if (animUnitId) onInfoSelect?.({ type: 'unit', unitId: animUnitId });
            setAnimUnitId(null);
            setAnimStep(0);
            animStepRef.current = 0;
            return;
        }
        animTimerRef.current = setTimeout(() => {
            const next = animStepRef.current + 1;
            animStepRef.current = next;
            setAnimStep(next);
        }, 700);
        return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
    }, [animPath, animStartPos, animStep, animUnitId, onInfoSelect]);

    const { scale, x, y, zoom, pan } = useViewport();

    const myPlayerId = playerId ?? 'p1';
    const isMyTurn = mode === 'DEPLOYMENT'
        ? state.currentDeployingPlayer === myPlayerId
        : state.activePlayer === myPlayerId || true;

    useEffect(() => {
        if (!selectedInfo || selectedInfo.type !== 'unit') {
            setSelectedUnitId(null);
            setMovingUnitId(null);
            setAttackingUnitId(null);
            setPendingAbility(null);
            setCabalgarPath([]);
            setCabalgarIsLaCarga(false);
            setPendingTorbellino(false);
        }
    }, [selectedInfo]);

    function clearAllSelections() {
        setSelectedUnitId(null);
        setMovingUnitId(null);
        setAttackingUnitId(null);
        setPendingAbility(null);
        setPendingIdentityTargetId(null);
        setPendingPatadaTargetId(null);
        setCabalgarPath([]);
        setCabalgarIsLaCarga(false);
        setPendingTorbellino(false);
        setPendingAngelGuardian(false);
        setPendingCounterEspejoCard(null);
        setAnimUnitId(null);
        setAnimPath(null);
        setAnimStartPos(null);
        setAnimStep(0);
        onInfoSelect?.(null);
    }

    const { bindings } = useKeyBindings();

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (disableInput || mode !== 'GAME' || !isMyTurn) return;
            const unit = selectedUnitId ? state.units[selectedUnitId] : null;
            const ap = getPlayerAP(state, myPlayerId);
            const key = e.key.toLowerCase();

            if (key === bindings.DESELECT) {
                clearAllSelections();
                e.preventDefault();
                return;
            }
            if (key === bindings.END_TURN) {
                sendAction({ type: 'END_TURN', playerId: myPlayerId });
                e.preventDefault();
                return;
            }
            if (!unit || unit.owner !== myPlayerId) return;

            if (key === bindings.BASIC_ATTACK) {
                const extraCharges = unit.ataqueExtraCharges ?? 0;
                if (unit.attackedThisTurn && !extraCharges) {
                    addAlert?.('Ya has atacado este turno', 'warning');
                } else if (ap < 1 && !extraCharges) {
                    addAlert?.('No tienes PA suficientes', 'warning');
                } else {
                    setAttackingUnitId(unit.id);
                    setMovingUnitId(null);
                    setPendingAbility(null);
                    setCabalgarIsLaCarga(false);
                    setCabalgarPath([]);
                }
                e.preventDefault();
                return;
            }
            if (key === bindings.MOVE) {
                let effectiveMoveCost = unit.movementCost;
                const hasSurcharge = (unit.fuegoCoberturaCharges ?? 0) > 0;
                if (hasSurcharge) effectiveMoveCost += 1;
                const moveMods = state.activeModifiers.filter(
                    m => m.stat === 'movementCost' && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0
                );
                for (const m of moveMods) {
                    if (m.operator === 'SET') effectiveMoveCost = m.value;
                    else if (m.operator === 'ADD') effectiveMoveCost += m.value;
                    else if (m.operator === 'MUL') effectiveMoveCost *= m.value;
                }
                effectiveMoveCost = Math.max(0, effectiveMoveCost);
                if (ap < effectiveMoveCost) {
                    addAlert?.('No tienes PA suficientes', 'warning');
                } else {
                    setMovingUnitId(unit.id);
                    setAttackingUnitId(null);
                    setPendingAbility(null);
                    setCabalgarIsLaCarga(false);
                    setCabalgarPath([]);
                }
                e.preventDefault();
                return;
            }

            const abilityKeys = [bindings.ABILITY_1, bindings.ABILITY_2, bindings.ABILITY_3];
            const abIdx = abilityKeys.indexOf(key);
            if (abIdx !== -1) {
                const activeAbilities = (unit.abilities ?? [])
                    .map(id => ({ id, def: ABILITIES[id] }))
                    .filter(a => a.def?.type === 'active');
                if (abIdx < activeAbilities.length) {
                    const ab = activeAbilities[abIdx];
                    const hasAdjacentEnemy = Object.values(state.units)
                        .filter(u => u.owner !== myPlayerId)
                        .some(u => hexDistance(unit.position, u.position) === 1);
                    const aLaCargaCost = state.players[myPlayerId]?.aLaCargaCost ?? 0;
                    const disabled =
                        (ab.id === 'accion_evasiva' && (!!unit.movedThisTurn || !hasAdjacentEnemy)) ||
                        (ab.id === 'patada_acrobatica' && (!!unit.usedPatadaAcrobatica || !hasAdjacentEnemy)) ||
                        (ab.id === 'doble_ataque' && (!!unit.usedCarga || !unit.attackedThisTurn || !!unit.usedDobleAtaque || !!unit.usedVentajaAlcance)) ||
                        (ab.id === 'cabalgar' && (!!unit.attackedThisTurn || !!unit.usedCabalgar || !!unit.movedThisTurn)) ||
                        (ab.id === 'cabalgar_2' && (!!unit.attackedThisTurn || !!unit.usedCabalgar || !!unit.movedThisTurn)) ||
                        (ab.id === 'carga' && (!unit.usedCabalgar || !!unit.usedCarga || !!unit.movedThisTurn || !!unit.attackedThisTurn)) ||
                        (ab.id === 'ventaja_alcance' && (!!unit.attackedThisTurn || !!unit.usedVentajaAlcance || !!unit.usedDobleAtaque)) ||
                        (ab.id === 'torbellino' && !!unit.usedTorbellino) ||
                        (ab.id === 'meditacion' && (unit.hp >= BASE_STATS[unit.class].hp || ap < 2)) ||
                        (ab.id === 'posicion_estrategica' && !!unit.usedPosicionEstrategica) ||
                        (ab.id === 'en_nombre_del_rey' && !!unit.usedEnNombreDelRey) ||
                        (ab.id === 'desenvainado_veloz' && !!unit.usedDesenvainadoVeloz) ||
                        (ab.id === 'rayo_celestial' && (state.players[myPlayerId]?.celestialRayBonus ?? 0) <= 0) ||
                        (ab.id === 'a_la_carga' && (!!unit.aLaCargaActive || !!unit.usedCabalgar || !!unit.movedThisTurn || !!unit.attackedThisTurn || ap < aLaCargaCost)) ||
                        (ab.id === 'sacrificar' && (unit.hp >= BASE_STATS[unit.class].hp || !Object.values(state.units).some(u => u.owner === myPlayerId && u.id !== unit.id && hexDistance(unit.position, u.position) === 1))) ||
                        (ab.id === 'angel_guardian' && ap < 2) ||
                        (ab.id === 'proteger' && !Object.values(state.units).some(u => u.owner === myPlayerId && u.id !== unit.id && hexDistance(unit.position, u.position) <= 3));
                    const cost = ab.id === 'a_la_carga' ? aLaCargaCost : (ab.def?.cost ?? 0);
                    if (disabled) {
                        addAlert?.('Habilidad no disponible en este momento', 'warning');
                    } else if (ap < cost) {
                        addAlert?.('No tienes PA suficientes', 'warning');
                    } else {
                        if (ab.id === 'a_la_carga') {
                            setPendingAbility({ abilityId: 'cabalgar_2', unitId: unit.id });
                            setCabalgarIsLaCarga(true);
                        } else if (ab.id === 'angel_guardian') {
                            setPendingAbility({ abilityId: 'angel_guardian', unitId: unit.id });
                            setPendingAngelGuardian(true);
                        } else if (!ab.def?.requiresTarget && !['torbellino', 'cabalgar', 'cabalgar_2', 'accion_evasiva', 'posicion_estrategica'].includes(ab.id)) {
                            sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: unit.id, abilityId: ab.id });
                        } else {
                            setPendingAbility({ abilityId: ab.id, unitId: unit.id });
                            setPendingPatadaTargetId(null);
                            setCabalgarIsLaCarga(false);
                            setCabalgarPath([]);
                            if (ab.id === 'torbellino') setPendingTorbellino(true);
                        }
                        setMovingUnitId(null);
                        setAttackingUnitId(null);
                    }
                }
                e.preventDefault();
                return;
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, isMyTurn, selectedUnitId, state, myPlayerId, sendAction, setSelectedUnitId, setMovingUnitId, setAttackingUnitId, setPendingAbility, setPendingIdentityTargetId, onInfoSelect, bindings, addAlert, disableInput]);

    const moveRange = mode === 'GAME' && movingUnitId
        ? getMoveRange(state, movingUnitId)
        : [];

    const isIdentityTargetMode = mode === 'GAME' && state.players[myPlayerId]?.pendingIdentityTarget;

    const noAtaqueTargetAlerted = useRef(false);
    const cardTargetInfo = (() => {
        const isMode = mode === 'GAME' && selectedInfo?.type === 'cardTarget' && state.activePlayer === myPlayerId && state.turnPhase !== 'COUNTER';
        if (!isMode) {
            noAtaqueTargetAlerted.current = false;
            return { isCardTargetMode: false, isCardTargetAlly: false, isCardTargetEnemy: false, cardTargets: [] as HexCoord[], hasNoAtaqueExtraTargets: false };
        }
        const cardId = selectedInfo?.cardId ?? '';
        const isAlly = getCardType(cardId) === 'BUFF';
        const raw = isAlly
            ? Object.values(state.units).filter(u => {
                if (u.owner !== myPlayerId) return false;
                if (cardId.startsWith('ataque_extra') && !u.attackedThisTurn) return false;
                return true;
            }).map(u => u.position)
            : Object.values(state.units).filter(u => u.owner !== myPlayerId).map(u => u.position);
        const noTargets = cardId.startsWith('ataque_extra') && raw.length === 0;
        if (noTargets && !noAtaqueTargetAlerted.current) {
            noAtaqueTargetAlerted.current = true;
            setTimeout(() => {
                addAlert?.('No hay unidades que hayan atacado este turno', 'warning');
                onInfoSelect?.(null);
            }, 0);
        }
        return {
            isCardTargetMode: !noTargets,
            isCardTargetAlly: isAlly,
            isCardTargetEnemy: !isAlly,
            cardTargets: raw,
            hasNoAtaqueExtraTargets: noTargets,
        };
    })();
    const { isCardTargetMode, isCardTargetAlly, isCardTargetEnemy, cardTargets } = cardTargetInfo;

    const identityTargets = isIdentityTargetMode
        ? Object.values(state.units)
            .filter(u => u.owner !== myPlayerId && u.class !== 'general')
            .map(u => u.position)
        : [];

    const attackTargets = mode === 'GAME' && attackingUnitId
        ? getAttackTargets(state, attackingUnitId, myPlayerId)
        : [];

    const abilityTargets = mode === 'GAME' && pendingAbility
        ? getAbilityTargets(state, pendingAbility.unitId, pendingAbility.abilityId, myPlayerId)
        : [];

    const torbellinoTargets = pendingAbility?.abilityId === 'torbellino' && state.units[pendingAbility.unitId]
        ? generateHexMap(state.map).filter(h => isWithinBounds(h, state.map.radius) && hexDistance(state.units[pendingAbility.unitId].position, h) === 1)
        : [];

    const allyTargets = mode === 'GAME' && pendingAbility
        ? getAllyAbilityTargets(state, pendingAbility.unitId, pendingAbility.abilityId, myPlayerId)
        : [];

    const abilityMoveTargets = mode === 'GAME' && pendingAbility
        ? getAbilityMoveTargets(state, pendingAbility.unitId, pendingAbility.abilityId)
        : [];

    const patadaDestHexes = mode === 'GAME' && pendingAbility?.abilityId === 'patada_acrobatica' && pendingPatadaTargetId
        ? getAbilityMoveTargets(state, pendingAbility.unitId, 'patada_acrobatica', pendingPatadaTargetId)
        : [];

    const moveRangeRaw = mode === 'GAME' && movingUnitId && state.units[movingUnitId]
        ? generateHexMap(state.map).filter(h => hexDistance(state.units[movingUnitId].position, h) <= 1 && isWithinBounds(h, state.map.radius))
        : [];
    const cabalgarRangeHexes = pendingAbility?.abilityId === 'cabalgar_2' && state.units[pendingAbility.unitId]
        ? generateHexMap(state.map).filter(h => isWithinBounds(h, state.map.radius) && hexDistance(state.units[pendingAbility.unitId].position, h) <= (cabalgarIsLaCarga ? 3 : 2))
        : [];
    const rangeHexes = cabalgarRangeHexes.length > 0
        ? cabalgarRangeHexes
        : moveRangeRaw.length > 0
            ? moveRangeRaw
            : mode === 'GAME' && (attackingUnitId || pendingAbility)
                ? getRangeHexes(state, attackingUnitId, pendingAbility)
                : [];

    const animPositions = animPath && animStartPos && animUnitId
        ? { [animUnitId]: animStep === 0 ? animStartPos : animPath[Math.min(animStep - 1, animPath.length - 1)] }
        : {};

    const highlightedHexes = (() => {
        if (selectedInfo?.type === 'historyAttack') {
            const e = selectedInfo.entry;
            return Object.values(state.units)
                .filter(u => u.id === e.attackerId || u.id === e.targetId)
                .map(u => u.position);
        }
        if (selectedInfo?.type === 'historyMove') {
            const e = selectedInfo.entry;
            const u = Object.values(state.units).find(u => u.id === e.unitId);
            if (u) return [u.position, e.from, e.to];
            return [e.from, e.to];
        }
        if (selectedInfo?.type === 'historyCard') {
            const e = selectedInfo.entry;
            if (e.targetId) {
                const t = Object.values(state.units).find(u => u.id === e.targetId);
                if (t) return [t.position];
            }
            return [];
        }
        return [];
    })();

    const angelGuardianHexes = pendingAngelGuardian
        ? Object.values(state.units)
            .filter(u => u.owner === myPlayerId && u.class !== 'general')
            .map(u => u.position)
        : [];

    const isCounterPhase = mode === 'GAME' && state.turnPhase === 'COUNTER';
    const isWaitingForCounter = isCounterPhase && state.activePlayer === myPlayerId;
    const isCounterPrompt = isCounterPhase && state.activePlayer !== myPlayerId;
    const pendingCard = state.lastCardAction;

    const counterTargets = pendingCounterEspejoCard && pendingCard
        ? Object.values(state.units)
            .filter(u => u.owner === pendingCard.playerId)
            .map(u => u.position)
        : [];

    const currentDeployerId = mode === 'DEPLOYMENT' ? state.currentDeployingPlayer : undefined;
    const deployHexes = currentDeployerId ? getDeployableHexes(state, currentDeployerId) : [];
    const isMyDeployTurn = currentDeployerId === myPlayerId;

    const cabalgarMaxSteps = cabalgarIsLaCarga ? 3 : 2;
    const cabalgarNextHexes = pendingAbility?.abilityId === 'cabalgar_2' && cabalgarPath.length < cabalgarMaxSteps
        ? (() => {
            const from = cabalgarPath.length === 0 ? state.units[pendingAbility.unitId]?.position : cabalgarPath[cabalgarPath.length - 1];
            if (!from) return [];
            const hexes = generateHexMap(state.map);
            return hexes.filter(h => {
                if (hexDistance(from, h) !== 1) return false;
                if (cabalgarPath.some(p => p.q === h.q && p.r === h.r)) return false;
                if (Object.values(state.units).some(u => u.position.q === h.q && u.position.r === h.r)) return false;
                return true;
            });
        })()
        : [];

    function isReachable(hex: HexCoord) {
        return moveRange.some(h => h.q === hex.q && h.r === hex.r);
    }

    const occupationHex = state.pendingOccupation?.position;

    function isAttackTarget(hex: HexCoord) {
        return attackTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isIdentityTarget(hex: HexCoord) {
        return identityTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isCardTarget(hex: HexCoord) {
        return cardTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isDeployable(hex: HexCoord) {
        return deployHexes.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isAbilityTarget(hex: HexCoord) {
        return abilityTargets.some(h => h.q === hex.q && h.r === hex.r);
    }

    function isAllyTarget(hex: HexCoord) {
        return allyTargets.some(h => h.q === hex.q && h.r === hex.r);
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
            const movedId = movingUnitId;
            setTimeout(() => setSelectedUnitId(movedId), 50);
        } else if (movingUnitId && !isReachable(hex)) {
            addAlert?.('No puedes moverte a esa casilla', 'warning');
        } else if (attackingUnitId && isAttackTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && target.owner !== myPlayerId) {
                sendAction({ type: 'ATTACK_UNIT', playerId: myPlayerId, unitId: attackingUnitId, targetId: target.id });
                setAttackingUnitId(null);
                const atkId = attackingUnitId;
                setTimeout(() => setSelectedUnitId(atkId), 50);
            }
        } else if (attackingUnitId && !isAttackTarget(hex)) {
            addAlert?.('No hay enemigos en esa posición', 'warning');
        } else if (pendingAbility) {
            if (pendingAbility.abilityId === 'patada_acrobatica') {
                if (!pendingPatadaTargetId) {
                    // Step 1: seleccionar enemigo adyacente
                    if (isAbilityTarget(hex)) {
                        const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                        if (target && target.owner !== myPlayerId) {
                            setPendingPatadaTargetId(target.id);
                        }
                    } else {
                        addAlert?.('Selecciona un enemigo adyacente', 'warning');
                    }
                } else {
                    // Step 2: seleccionar casilla de escape
                    if (patadaDestHexes.some(h => h.q === hex.q && h.r === hex.r)) {
                        onInfoSelect?.(null);
                        const pUnitId = pendingAbility.unitId;
                        sendAction({
                            type: 'USE_ABILITY',
                            playerId: myPlayerId,
                            unitId: pendingAbility.unitId,
                            abilityId: 'patada_acrobatica',
                            targetId: pendingPatadaTargetId,
                            to: hex,
                        });
                        setPendingAbility(null);
                        setPendingPatadaTargetId(null);
                        setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: pUnitId }), 150);
                    } else {
                        addAlert?.('Selecciona una casilla de escape válida', 'warning');
                    }
                }
            } else if (isAbilityMoveTarget(hex) && pendingAbility.abilityId !== 'cabalgar_2') {
                onInfoSelect?.(null);
                if (pendingAbility.abilityId === 'cabalgar') {
                    const u = state.units[pendingAbility.unitId];
                    if (u) {
                        const dq = hex.q - u.position.q;
                        const dr = hex.r - u.position.r;
                        const mid = { q: u.position.q + dq / 2, r: u.position.r + dr / 2 };
                        const path = [mid, hex];
                        sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: 'cabalgar', to: hex });
                        setAnimPath(path);
                        setAnimStartPos(u.position);
                        setAnimUnitId(pendingAbility.unitId);
                        setAnimStep(0);
                    }
                } else {
                    const abUid = pendingAbility.unitId;
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, to: hex });
                    setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: abUid }), 150);
                }
                setPendingAbility(null);
                setPendingPatadaTargetId(null);
            } else if (isAbilityTarget(hex)) {
                const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                if (target && target.owner !== myPlayerId) {
                    const aUid = pendingAbility.unitId;
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, targetId: target.id });
                    setPendingAbility(null);
                    setPendingPatadaTargetId(null);
                    setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: aUid }), 150);
                }
            } else if (isAllyTarget(hex)) {
                const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                if (target && target.owner === myPlayerId) {
                    const aUid = pendingAbility.unitId;
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, targetId: target.id });
                    setPendingAbility(null);
                    setPendingPatadaTargetId(null);
                    setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: aUid }), 150);
                }
            } else if (pendingAbility?.abilityId === 'cabalgar_2') {
                const unit = state.units[pendingAbility.unitId];
                if (!unit) return;
                const maxSteps = cabalgarIsLaCarga ? 3 : 2;
                if (cabalgarPath.length === 0 && hexDistance(unit.position, hex) === 1 && !Object.values(state.units).some(u => u.position.q === hex.q && u.position.r === hex.r)) {
                    setCabalgarPath([hex]);
                } else if (cabalgarPath.length > 0 && cabalgarPath.length < maxSteps) {
                    const last = cabalgarPath[cabalgarPath.length - 1];
                    if (hexDistance(last, hex) === 1 && !cabalgarPath.some(h => h.q === hex.q && h.r === hex.r) && !Object.values(state.units).some(u => u.position.q === hex.q && u.position.r === hex.r)) {
                        setCabalgarPath([...cabalgarPath, hex]);
                    } else {
                        addAlert?.('Selecciona una casilla adyacente libre', 'warning');
                    }
                } else if (cabalgarPath.length >= maxSteps) {
                    addAlert?.('Ya seleccionaste la ruta completa. Confirma o cancela.', 'warning');
                } else {
                    addAlert?.('Selecciona una casilla adyacente a la unidad', 'warning');
                }
            } else {
                addAlert?.('Posición no válida para esa habilidad', 'warning');
            }
        } else if (isCardTargetMode && isCardTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && (isCardTargetAlly ? target.owner === myPlayerId : target.owner !== myPlayerId)) {
                const cardId = selectedInfo?.cardId ?? '';
                sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId, targetId: target.id });
                onInfoSelect?.({ type: 'unit', unitId: target.id });
                setSelectedUnitId(target.id);
            }
        } else if (isCardTargetMode && !isCardTarget(hex)) {
            addAlert?.(isCardTargetAlly ? 'Selecciona una unidad aliada' : 'Selecciona una unidad enemiga', 'warning');
        } else if (pendingCounterEspejoCard) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && target.owner !== myPlayerId) {
                sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId: pendingCounterEspejoCard, targetId: target.id });
                setPendingCounterEspejoCard(null);
            }
        } else if (isIdentityTargetMode && !isIdentityTarget(hex)) {
            addAlert?.('Selecciona un enemigo que no sea el general', 'warning');
        } else {
            // Click on empty hex with no action → deselect
            clearAllSelections();
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
                                mode === 'DEPLOYMENT' && isMyDeployTurn ? isDeployable(hex)
                                : mode === 'GAME' && pendingAbility?.abilityId === 'cabalgar_2' ? cabalgarNextHexes.some(h => h.q === hex.q && h.r === hex.r)
                                : mode === 'GAME' && pendingAbility?.abilityId === 'patada_acrobatica' && pendingPatadaTargetId ? patadaDestHexes.some(h => h.q === hex.q && h.r === hex.r)
                                : mode === 'GAME' && angelGuardianHexes.length > 0 ? angelGuardianHexes.some(h => h.q === hex.q && h.r === hex.r)
                                : mode === 'GAME' && occupationHex ? occupationHex.q === hex.q && occupationHex.r === hex.r
                                : mode === 'GAME' && pendingAbility ? isAbilityMoveTarget(hex)
                                : isReachable(hex)
                            }
                            attackable={
                                mode === 'GAME'
                                ? (attackingUnitId !== null && isAttackTarget(hex)) ||
                                  (pendingAbility !== null && pendingAbility.abilityId !== 'patada_acrobatica' && isAbilityTarget(hex)) ||
                                  (pendingAbility !== null && pendingAbility.abilityId === 'patada_acrobatica' && !pendingPatadaTargetId && isAbilityTarget(hex)) ||
                                  (pendingAbility !== null && pendingAbility.abilityId === 'torbellino' && torbellinoTargets.some(h => h.q === hex.q && h.r === hex.r))
                                : false
                            }
                            identityTarget={mode === 'GAME' && (isIdentityTarget(hex) || cardTargets.some(h => h.q === hex.q && h.r === hex.r) || counterTargets.some(h => h.q === hex.q && h.r === hex.r))}
                            allyTarget={mode === 'GAME' && pendingAbility !== null && isAllyTarget(hex)}
                            inRange={
                                mode === 'GAME' && !isReachable(hex) && !(attackingUnitId !== null && isAttackTarget(hex)) && !(pendingAbility !== null && isAbilityTarget(hex)) && !(pendingAbility !== null && isAllyTarget(hex)) && !(pendingAbility?.abilityId === 'patada_acrobatica' && pendingPatadaTargetId)
                                ? isInRange(hex)
                                : false
                            }
                            enemyDeployable={mode === 'DEPLOYMENT' && !isMyDeployTurn && isDeployable(hex)}
                            highlighted={highlightedHexes.some(h => h.q === hex.q && h.r === hex.r)}
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
                        identityTargetMode={isIdentityTargetMode}
                        onIdentityTargetSelect={id => setPendingIdentityTargetId(id)}
                        onPatadaTargetSelect={id => {
                            if (pendingAbility?.abilityId === 'patada_acrobatica' && !pendingPatadaTargetId) {
                                setPendingPatadaTargetId(id);
                            }
                        }}
                        animPositions={animPositions}
                        movingUnitId={movingUnitId}
                        onInfoSelect={onInfoSelect}
                        sendAction={sendAction}
                        onSelectUnit={unitId => {
                            if (isCardTargetMode) {
                                const unit = state.units[unitId];
                                if (unit && (isCardTargetAlly ? unit.owner === myPlayerId : unit.owner !== myPlayerId)) {
                                    const cardId = selectedInfo?.cardId ?? '';
                                    sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId, targetId: unit.id });
                                    setSelectedUnitId(unitId);
                                }
                                return;
                            }
                            if (mode === 'DEPLOYMENT') {
                                if (selectedUnitId === unitId) {
                                    setSelectedUnitId(null);
                                    onInfoSelect?.(null);
                                } else {
                                    setSelectedUnitId(unitId);
                                    onInfoSelect?.({ type: 'unit', unitId });
                                }
                                return;
                            }
                            if (!isMyTurn) return;
                            const blkUnit = state.units[unitId];
                            if (blkUnit && blkUnit.owner === myPlayerId && state.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === unitId && m.remainingTurns >= 0 && (m.remainingUses === undefined || m.remainingUses > 0))) {
                                addAlert?.('Unidad bloqueada: 1 turno', 'warning');
                                return;
                            }
                            if (selectedUnitId === unitId) {
                                clearAllSelections();
                            } else {
                                setSelectedUnitId(unitId);
                                setMovingUnitId(null);
                                setAttackingUnitId(null);
                                setPendingAbility(null);
                                setPendingPatadaTargetId(null);
                                setCabalgarIsLaCarga(false);
                                setCabalgarPath([]);
                            }
                        }}
                        onRequestMove={unitId => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            if (state.activeModifiers.some(m => m.stat === 'inmovil' && m.targetId === unitId && m.remainingTurns >= 0 && (m.remainingUses === undefined || m.remainingUses > 0))) {
                                addAlert?.('Unidad inmovilizada: 1 turno', 'warning');
                                return;
                            }
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
                            setPendingPatadaTargetId(null);
                            setMovingUnitId(null);
                            setAttackingUnitId(null);
                        }}
                        onUseAbilityOnUnit={(abilityId, unitId, targetId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, targetId });
                            setPendingAbility(null);
                            setPendingPatadaTargetId(null);
                        }}
                    />
                </g>
            </svg>
            <HistoryPanel
                gameHistory={state.gameHistory ?? []}
                selectedInfo={selectedInfo}
                onSelectEntry={entry => {
                    clearAllSelections();
                    if (!entry) return;
                    setTimeout(() => {
                        if (entry.type === 'attack') onInfoSelect?.({ type: 'historyAttack', entry: entry as any });
                        else if (entry.type === 'move') onInfoSelect?.({ type: 'historyMove', entry: entry as any });
                        else if (entry.type === 'card') onInfoSelect?.({ type: 'historyCard', entry: entry as any });
                    }, 0);
                }}
            />
            <PendingOccupationPanel pendingOccupation={state.pendingOccupation} playerId={myPlayerId} sendAction={sendAction} state={state} />
            <ActionPanel
                state={state}
                unitId={selectedUnitId}
                playerId={myPlayerId}
                canAct={mode === 'GAME' && isMyTurn}
                onAngelGuardian={unitId => {
                    setPendingAbility({ abilityId: 'angel_guardian', unitId });
                    setPendingAngelGuardian(true);
                }}
                onRequestMove={unitId => {
                    if (!isMyTurn || mode === 'DEPLOYMENT') return;
                    setSelectedUnitId(unitId);
                    setMovingUnitId(unitId);
                    setAttackingUnitId(null);
                    setPendingAbility(null);
                    setCabalgarPath([]);
                }}
                onRequestAttack={unitId => {
                    if (!isMyTurn || mode === 'DEPLOYMENT') return;
                    setSelectedUnitId(unitId);
                    setAttackingUnitId(unitId);
                    setMovingUnitId(null);
                    setPendingAbility(null);
                    setCabalgarPath([]);
                }}
                        onRequestAbilityTarget={(abilityId, unitId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            setSelectedUnitId(unitId);
                            setPendingAbility({ abilityId, unitId });
                            setMovingUnitId(null);
                            setAttackingUnitId(null);
                            if (abilityId === 'torbellino') setPendingTorbellino(true);
                        }}
                        onALaCarga={unitId => {
                    if (!isMyTurn || mode === 'DEPLOYMENT') return;
                    setSelectedUnitId(unitId);
                    setPendingAbility({ abilityId: 'cabalgar_2', unitId });
                    setCabalgarIsLaCarga(true);
                    setCabalgarPath([]);
                    setMovingUnitId(null);
                    setAttackingUnitId(null);
                }}
                sendAction={sendAction}
                addAlert={addAlert}
            />

            {isIdentityTargetMode && !pendingIdentityTargetId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 border border-purple-500 rounded-lg px-5 py-2.5 text-sm text-purple-100 font-semibold shadow-lg shadow-purple-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🎯</span>
                    <span>Robin Hood — En la mira: selecciona un enemigo (excepto general)</span>
                </div>
            )}

            {isCardTargetMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-violet-900/90 border border-violet-500 rounded-lg px-5 py-2.5 text-sm text-violet-100 font-semibold shadow-lg shadow-violet-900/50 flex items-center gap-2">
                    <span>🎯</span>
                    <span>{isCardTargetAlly ? 'Selecciona un aliado objetivo para la carta' : 'Selecciona un enemigo objetivo para la carta'}</span>
                    <button
                        className="ml-2 bg-zinc-700 hover:bg-zinc-600 transition text-white px-2 py-0.5 rounded text-xs cursor-pointer"
                        onClick={() => onInfoSelect?.(null)}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {pendingAbility?.abilityId === 'cabalgar_2' && cabalgarPath.length === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 border border-purple-500 rounded-lg px-5 py-2.5 text-sm text-purple-100 font-semibold shadow-lg shadow-purple-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🐴</span>
                    <span>Cabalgar: selecciona el recorrido</span>
                </div>
            )}

            {pendingAbility?.abilityId === 'patada_acrobatica' && !pendingPatadaTargetId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-900/90 border border-blue-500 rounded-lg px-5 py-2.5 text-sm text-blue-100 font-semibold shadow-lg shadow-blue-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🦶</span>
                    <span>Patada acrobática: selecciona un enemigo adyacente</span>
                </div>
            )}

            {pendingAbility?.abilityId === 'patada_acrobatica' && pendingPatadaTargetId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 border border-emerald-500 rounded-lg px-5 py-2.5 text-sm text-emerald-100 font-semibold shadow-lg shadow-emerald-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🦶</span>
                    <span>Patada acrobática: selecciona una casilla de escape</span>
                    <button
                        className="ml-2 bg-zinc-700 hover:bg-zinc-600 transition text-white px-2 py-0.5 rounded text-xs cursor-pointer"
                        onClick={() => setPendingPatadaTargetId(null)}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {pendingIdentityTargetId && (() => {
                const target = state.units[pendingIdentityTargetId];
                if (!target) return null;
                const CLASS_DISPLAY: Record<string, string> = { archer: 'Arquero', infantry: 'Infantería', cavalry: 'Caballería', lancer: 'Lancero', general: 'General' };
                return (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-zinc-900/95 border border-purple-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-500">En la mira — Robin Hood</div>
                                <div className="text-sm font-semibold text-purple-300">{CLASS_DISPLAY[target.class] ?? target.class}</div>
                                <div className="text-xs text-zinc-400">HP: {target.hp}</div>
                            </div>
                            <div className="text-sm text-zinc-300">
                                ¿Infligir 1 de daño a esta unidad?
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    className="bg-purple-700 hover:bg-purple-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer"
                                    onClick={() => {
                                        sendAction({ type: 'IDENTITY_ABILITY', playerId: myPlayerId, targetId: pendingIdentityTargetId });
                                        setPendingIdentityTargetId(null);
                                    }}
                                >
                                    Atacar
                                </button>
                                <button
                                    className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer"
                                    onClick={() => setPendingIdentityTargetId(null)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {pendingAbility?.abilityId === 'cabalgar_2' && cabalgarPath.length >= cabalgarMaxSteps && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">
                            ¿Confirmar ruta de {cabalgarPath.length} casillas?
                        </div>
                        <div className="flex gap-3 justify-center">
                                                            <button
                                                                className="bg-amber-700 hover:bg-amber-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer"
                                                                onClick={() => {
                                                                    onInfoSelect?.(null);
                                                                    sendAction({
                                                                        type: 'USE_ABILITY',
                                                                        playerId: myPlayerId,
                                                                        unitId: pendingAbility!.unitId,
                                                                        abilityId: 'cabalgar_2',
                                                                        path: cabalgarPath,
                                                                    });
                                    const startPos = state.units[pendingAbility!.unitId]?.position;
                                    setAnimPath(cabalgarPath);
                                    setAnimStartPos(startPos ?? null);
                                    setAnimUnitId(pendingAbility!.unitId);
                                    setAnimStep(0);
                                    setPendingAbility(null);
                                    setCabalgarPath([]);
                                    setCabalgarIsLaCarga(false);
                                }}
                            >
                                Confirmar
                            </button>
                            <button
                                className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-1.5 rounded-md text-sm cursor-pointer"
                                onClick={() => { setCabalgarPath([]); setCabalgarIsLaCarga(false); }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingTorbellino && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-red-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">Torbellino — esta habilidad daña a todas las unidades adyacentes</div>
                        <div className="text-xs text-red-400">Dificultad 7: acierto → 2 daño a enemigos. Fallo → 1 daño a todos (excluye general).</div>
                        <div className="flex gap-3 justify-center mt-2">
                            <button
                                className="bg-red-700 hover:bg-red-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => {
                                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility!.unitId, abilityId: 'torbellino' });
                                    setPendingAbility(null);
                                    setPendingTorbellino(false);
                                }}
                            >
                                Confirmar
                            </button>
                            <button
                                className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => setPendingTorbellino(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingAngelGuardian && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-500 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">🛡 Ángel Guardián — ¿aplicar escudo de +2 HP a todos los aliados?</div>
                        <div className="text-xs text-amber-400">Coste: 2 PA</div>
                        <div className="flex gap-3 justify-center mt-2">
                            <button
                                className="bg-amber-700 hover:bg-amber-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => {
                                    const gen = Object.values(state.units).find(u => u.owner === myPlayerId && u.class === 'general');
                                    if (gen) {
                                        sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: gen.id, abilityId: 'angel_guardian' });
                                    }
                                    setPendingAngelGuardian(false);
                                }}
                            >
                                Confirmar
                            </button>
                            <button
                                className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => setPendingAngelGuardian(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COUNTER: waiting prompt (active player waiting for opponent) */}
            {isWaitingForCounter && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-lg">⏳</div>
                        <div className="text-sm text-zinc-300 font-semibold">Esperando la respuesta del oponente...</div>
                        {pendingCard && (
                            <div className="text-xs text-zinc-500">
                                Jugaste: <span className="text-zinc-200">{getCardName(pendingCard.cardId)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* COUNTER: prompt for opponent */}
            {isCounterPrompt && !pendingCounterEspejoCard && (() => {
                if (!pendingCard) return null;
                const pendingType = getCardType(pendingCard.cardId);
                const counterCards = (state.players[myPlayerId]?.cardsInHand ?? [])
                    .filter(cid => {
                        if (getCardType(cid) !== 'COUNTER') return false;
                        if (pendingType === 'BUFF') return cid.startsWith('ladron');
                        return true;
                    });
                const pendingName = getCardName(pendingCard.cardId);
                return (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-zinc-900/95 border border-violet-600 rounded-lg px-6 py-5 shadow-2xl min-w-80 text-center space-y-4">
                            <div className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">🃏 Carta del oponente</div>
                            <div className="text-sm font-semibold text-violet-300">{pendingName}</div>
                            <div className="text-xs text-zinc-400">¿Quieres contrarrestar?</div>
                            {counterCards.length > 0 && (
                                <div className="space-y-2">
                                    {counterCards.map(cid => {
                                        const cname = getCardName(cid);
                                        const isConfusionPending = pendingCard && pendingCard.cardId.startsWith('confusion');
                                        return (
                                            <button
                                                key={cid}
                                                className="w-full bg-violet-800 hover:bg-violet-700 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                                onClick={() => {
                                                    if (cid.startsWith('espejo') && isConfusionPending) {
                                                        setPendingCounterEspejoCard(cid);
                                                    } else {
                                                        sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId: cid });
                                                    }
                                                }}
                                            >
                                                {cname}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {counterCards.length === 0 && (
                                <div className="text-xs text-zinc-500">No tienes cartas para contrarrestar</div>
                            )}
                            <button
                                className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => sendAction({ type: 'PASS_COUNTER', playerId: myPlayerId })}
                            >
                                Pasar
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* COUNTER: espejo + confusion target selection */}
            {pendingCounterEspejoCard && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-violet-900/90 border border-violet-500 rounded-lg px-5 py-2.5 text-sm text-violet-100 font-semibold shadow-lg shadow-violet-900/50 flex items-center gap-2 whitespace-nowrap">
                    <span>🎯</span>
                    <span>Selecciona un objetivo para reflejar la Confusión</span>
                </div>
            )}

            {state.players[myPlayerId]?.pendingEspartanoChoice && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-blue-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">Lanza y escudo — elige un efecto</div>
                        <div className="flex gap-3 justify-center">
                            <button
                                className="bg-blue-700 hover:bg-blue-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => sendAction({ type: 'ESPARTANO_CHOICE', playerId: myPlayerId, choice: 'range' })}
                            >
                                +1 Rango
                            </button>
                            <button
                                className="bg-emerald-700 hover:bg-emerald-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => sendAction({ type: 'ESPARTANO_CHOICE', playerId: myPlayerId, choice: 'defense' })}
                            >
                                Escudo (-1 daño)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {state.players[myPlayerId]?.pendingPlanBatalla && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-zinc-900/95 border border-amber-600 rounded-lg px-6 py-5 shadow-2xl min-w-72 text-center space-y-4">
                        <div className="text-sm text-zinc-300">Plan de batalla — elige una formación</div>
                        <div className="text-xs text-zinc-500 mb-2">Todas las unidades aliadas reciben el bono.</div>
                        <div className="flex gap-3 justify-center">
                            <button
                                className="bg-red-700 hover:bg-red-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => sendAction({ type: 'COMANDANTE_CHOICE', playerId: myPlayerId, choice: 'attack' })}
                            >
                                Avanzar (+1 daño)
                            </button>
                            <button
                                className="bg-blue-700 hover:bg-blue-600 transition text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                onClick={() => sendAction({ type: 'COMANDANTE_CHOICE', playerId: myPlayerId, choice: 'defense' })}
                            >
                                Reagruparse (-1 daño)
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

function getBasicAttackRange(unit: Unit, state: GameState): number {
    const identity = state.players[unit.owner]?.selectedIdentity ?? '';
    const bonus = unit.espartanoRangeBonus ? 1 : 0;
    const isArcher = unit.class === 'archer' || unit.class === 'general';
    return (identity.startsWith('francotirador') && isArcher ? unit.range + 1 : unit.range) + bonus;
}

function getAllyAbilityTargets(state: GameState, unitId: UnitId, abilityId: string, playerId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    if (abilityId === 'rayo_celestial') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && hexDistance(unit.position, u.position) <= 2)
            .map(u => u.position);
    }

    if (abilityId === 'sacrificar') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && hexDistance(unit.position, u.position) <= 1)
            .map(u => u.position);
    }

    if (abilityId === 'en_nombre_del_rey') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && hexDistance(unit.position, u.position) <= 2)
            .map(u => u.position);
    }

    if (abilityId === 'angel_guardian') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && u.class !== 'general')
            .map(u => u.position);
    }

    if (abilityId === 'proteger') {
        return Object.values(state.units)
            .filter(u => u.owner === playerId && u.id !== unitId && hexDistance(unit.position, u.position) <= 3)
            .map(u => u.position);
    }

    return [];
}

function getAbilityRange(unit: Unit, state: GameState): number {
    const identity = state.players[unit.owner]?.selectedIdentity ?? '';
    if (identity.startsWith('francotirador') && unit.class === 'general') return unit.range + 1;
    return unit.range;
}

function getAttackTargets(state: GameState, unitId: UnitId, playerId: string): HexCoord[] {
    const unit = state.units[unitId];
    if (!unit) return [];

    const range = getBasicAttackRange(unit, state);

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
        case 'patada_acrobatica': range = 1; break;
        case 'doble_ataque': {
            const rangeBonus = unit.espartanoRangeBonus ? 1 : 0;
            range = unit.range + rangeBonus; break;
        }
        case 'avance': range = unit.range; break;
        case 'fuego_cobertura': range = getAbilityRange(unit, state); break;
        case 'carga': {
            if (!unit.cabalgarDir) return [];
            const projQ = unit.position.q + unit.cabalgarDir.dq;
            const projR = unit.position.r + unit.cabalgarDir.dr;
            return Object.values(state.units)
                .filter(u => u.owner !== playerId && u.position.q === projQ && u.position.r === projR)
                .map(u => u.position);
        }
        case 'ventaja_alcance': range = unit.range + 1; break;
        case 'desenvainado_veloz': range = unit.range; break;
        default: return [];
    }

    return Object.values(state.units)
        .filter(u => u.owner !== playerId)
        .filter(u => hexDistance(unit.position, u.position) <= range)
        .map(u => u.position);
}

function getAbilityMoveTargets(state: GameState, unitId: UnitId, abilityId: string, targetId?: UnitId): HexCoord[] {
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
            if (dq !== 0 && dr !== 0 && dq !== -dr) return false;
            const mid = { q: unit.position.q + dq / 2, r: unit.position.r + dr / 2 };
            if (isHexOccupied(state, mid)) return false;
            return true;
        });
    }

    if (abilityId === 'cabalgar_2') {
        return hexes.filter(h => hexDistance(unit.position, h) === 1 && !isHexOccupied(state, h));
    }

    if (abilityId === 'patada_acrobatica' && targetId) {
        const target = state.units[targetId];
        if (!target) return [];
        return hexes.filter(h => {
            if (isHexOccupied(state, h)) return false;
            if (hexDistance(unit.position, h) !== 1) return false;
            if (hexDistance(h, target.position) <= 1) return false;
            return true;
        });
    }

    if (abilityId === 'posicion_estrategica') {
        return hexes.filter(h => {
            if (hexDistance(unit.position, h) !== 1) return false;
            if (isHexOccupied(state, h)) return false;
            const hasAdjacentAlly = Object.values(state.units)
                .some(u => u.owner === unit.owner && u.id !== unit.id && hexDistance(h, u.position) === 1);
            return hasAdjacentAlly;
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
        range = getBasicAttackRange(unit, state);
    } else {
        const abilityId = pendingAbility!.abilityId;
        switch (abilityId) {
            case 'patada_acrobatica': range = 1; break;
        case 'cabalgar': {
            const steps = [
                { dq: 1, dr: 0 }, { dq: 2, dr: 0 },
                { dq: 0, dr: 1 }, { dq: 0, dr: 2 },
                { dq: -1, dr: 1 }, { dq: -2, dr: 2 },
                { dq: -1, dr: 0 }, { dq: -2, dr: 0 },
                { dq: 0, dr: -1 }, { dq: 0, dr: -2 },
                { dq: 1, dr: -1 }, { dq: 2, dr: -2 },
            ];
            const hexes = generateHexMap(state.map);
            return hexes.filter(h => {
                const dq = h.q - unit.position.q;
                const dr = h.r - unit.position.r;
                return steps.some(s => s.dq === dq && s.dr === dr);
            });
        }
        case 'carga': {
            if (!unit.cabalgarDir) return [];
            const projQ = unit.position.q + unit.cabalgarDir.dq;
            const projR = unit.position.r + unit.cabalgarDir.dr;
            return isWithinBounds({ q: projQ, r: projR }, state.map.radius) ? [{ q: projQ, r: projR }] : [];
        }
            case 'doble_ataque': {
                const rangeBonus = unit.espartanoRangeBonus ? 1 : 0;
                range = unit.range + rangeBonus; break;
            }
            case 'avance': range = unit.range; break;
            case 'fuego_cobertura': range = getAbilityRange(unit, state); break;
            case 'ventaja_alcance': range = unit.range + 1; break;
            case 'rayo_celestial': range = 2; break;
            case 'en_nombre_del_rey': range = 2; break;
            case 'sacrificar': range = 1; break;
            case 'proteger': range = 3; break;
            case 'angel_guardian': range = 0; break;
            case 'cabalgar_2': range = 1; break;
            case 'desenvainado_veloz': range = unit.range; break;
            default: return [];
        }
    }

    const hexes = generateHexMap(state.map);
    return hexes.filter(h =>
        isWithinBounds(h, state.map.radius) &&
        hexDistance(unit.position, h) <= range
    );
}
