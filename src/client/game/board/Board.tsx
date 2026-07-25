import { useState, useEffect, useRef } from 'react';
import { generateHexMap, hexDistance } from '@shared';
import { HexTile } from './HexTile';
import { UnitsLayer } from './UnitsLayer';
import { useSelection } from './useSelection';
import { isAbilityDisabled } from '../abilityUI';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { useViewport } from './useViewport';
import { computeAngle } from '@shared/hex/directions';
import { getAbilityHighlights } from '@shared/game/board/selection';
import { HistoryPanel } from '../layout/panel/history/HistoryPanel';
import { GameModals } from '../layout/modals/GameModals';
import { useHexClick } from './handlers/useHexClick';
import { useAnimation } from '../animation/AnimationContext';
import { PendingOccupationPanel } from '../layout/PendingOccupationPanel';
import { BottomPanel } from '../layout/BottomPanel';
import { useGameEvents } from './hooks/useGameEvents';
import { SpeechBubble } from './SpeechBubble';
import { FlipCardOverlay } from '../animation/FlipCardOverlay';
import type { GameAction, GameState, HexCoord, UnitId } from '@shared';
import { isHexOccupied, isWithinBounds, countPlayerClasses } from '@shared/game/utils';
import { ABILITIES } from '@shared/game/data/abilities';
import { BASE_STATS } from '@shared/game/units';
import { getPlayerAP } from '@shared/game/actions';
import { getCardName, getCardType } from '@shared/game/actions/card';
import { useKeyBindings } from '../KeyBindingsContext';
import { l } from '@shared/i18n';
import { axialToPixel } from './hexMath';

type Props = {
    state: GameState;
    role: PlayerRole | null;
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
    const sel = useSelection();
    const { animPositions, animAngles, enqueue, enqueueMultiple, bubble, activeEffects, setUnitPosition, setUnitAngle } = useAnimation();
    const [actionHighlightHexes, setActionHighlightHexes] = useState<HexCoord[]>([]);
    const [pendingCardId, setPendingCardId] = useState<string | null>(null);
    const [viewBoxWH, setViewBoxWH] = useState({ w: 800, h: 800 });

    useEffect(() => {
        function update() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const base = 800;
            const aspect = w / h;
            if (aspect > 1) {
                setViewBoxWH({ w: base * aspect, h: base });
            } else {
                setViewBoxWH({ w: base, h: base / aspect });
            }
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useGameEvents(state, setActionHighlightHexes, sendAction);
    const {
        hoveredHex, selectedHex, selectedUnitId,
        movingUnitId, attackingUnitId, pendingAbility,
        pendingMultiStep,
        pendingIdentityTargetId, pendingPatadaTargetId,
        cabalgarPath, cabalgarIsLaCarga,
        pendingTorbellino, pendingAngelGuardian, pendingCounterEspejoCard,
        setHoveredHex, setSelectedHex, setSelectedUnitId,
        setMovingUnitId, setAttackingUnitId, setPendingAbility,
        setPendingIdentityTargetId, setPendingPatadaTargetId,
        setCabalgarPath, setCabalgarIsLaCarga,
        setPendingTorbellino, setPendingAngelGuardian, setPendingCounterEspejoCard,
        clearAll, dispatch,
    } = sel;


    const { scale, x, y, zoom, pan, setBounds } = useViewport();

    useEffect(() => {
        const limit = Math.max(0, viewBoxWH.w * (scale * 0.65 - 0.5) - 50 / scale);
        const limitY = Math.max(0, viewBoxWH.h * (scale * 1 - 0.5) - 110 / scale);
        setBounds(-limit, limit, -limitY, limitY);
    }, [scale, viewBoxWH.w, viewBoxWH.h]);

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

    // Inicializar animAngles para unidades que aun no tienen ángulo visual
    useEffect(() => {
        for (const [id, unit] of Object.entries(state.units)) {
            if (animAngles[id] === undefined) {
                setUnitAngle(id, computeAngle(unit.position, unit.direction ?? { q: 0, r: 0 }));
            }
        }
        for (const [id, unit] of Object.entries(state.graveyard)) {
            if (animAngles[id] === undefined) {
                setUnitAngle(id, computeAngle(unit.position, unit.direction ?? { q: 0, r: 0 }));
            }
        }
    }, [state.units, state.graveyard]);

    function clearAllSelections() {
        clearAll();
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
            if (isPromptBlocked) {
                if (isIdentityTargetMode) {
                    addAlert?.(l('alert.selectEnemyNotGeneral'), 'warning');
                } else {
                    addAlert?.(l('alert.abilityNotAvailable'), 'warning');
                }
                e.preventDefault();
                return;
            }
            if (!unit || unit.owner !== myPlayerId) return;
            if (state.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === unit.id && m.remainingTurns >= 0 && (m.remainingUses === undefined || m.remainingUses > 0))) {
                addAlert?.(l('ui.blockedTurn', { n: 1 }), 'warning');
                e.preventDefault();
                return;
            }

            if (key === bindings.BASIC_ATTACK) {
                const extraCharges = unit.ataqueExtraCharges ?? 0;
                const atkSet = state.activeModifiers.find(m =>
                    m.stat === 'attackCost' && m.operator === 'SET' && m.targetId === unit.id && (m.remainingUses ?? 1) > 0 && (m.consumedBy === undefined || m.consumedBy === 'ataque_basico')
                );
                const atkCost = atkSet !== undefined ? Math.max(0, atkSet.value) : (extraCharges > 0 ? 0 : 1);
                if (extraCharges > 0) {
                    dispatch({ type: 'START_ATTACK', unitId: unit.id });
                } else if (isAbilityDisabled(state, 'ataque_basico', unit, myPlayerId, ap)) {
                    addAlert?.(l('alert.alreadyAttacked'), 'warning');
                } else if (ap < atkCost) {
                    addAlert?.(l('alert.noPA'), 'warning');
                } else {
                    dispatch({ type: 'START_ATTACK', unitId: unit.id });
                }
                e.preventDefault();
                return;
            }
            if (key === bindings.MOVE) {
                let effectiveMoveCost = unit.movementCost;
                effectiveMoveCost += state.activeModifiers
                    .filter(m => m.stat === 'actionCost' && m.targetId === unit.id && m.remainingTurns >= 0 && (m.remainingUses ?? 1) > 0)
                    .reduce((s, m) => s + m.value, 0);
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
                    addAlert?.(l('alert.noPA'), 'warning');
                } else {
                    dispatch({ type: 'START_MOVE', unitId: unit.id });
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
                    const disabledReason = isAbilityDisabled(state, ab.id, unit, myPlayerId, ap);
                    const extraBlock =
                        (ab.id === 'a_la_carga' && ((unit.flags ?? []).includes('a_la_carga') || (unit.flags ?? []).includes('carga') || (unit.flags ?? []).includes('basic_attack') || ap < 1)) ||
                        (ab.id === 'sacrificar' && (unit.hp >= BASE_STATS[unit.class].hp || !Object.values(state.units).some(u => u.owner === myPlayerId && u.id !== unit.id && hexDistance(unit.position, u.position) === 1))) ||
                        (ab.id === 'ejecutar' && !Object.values(state.units).some(u => u.owner !== myPlayerId && hexDistance(unit.position, u.position) === 1 && u.hp <= 2)) ||
                        (ab.id === 'proteger' && !Object.values(state.units).some(u => u.owner === myPlayerId && u.id !== unit.id && hexDistance(unit.position, u.position) <= 3));
                    const disabled = !!disabledReason || extraBlock;
                    const cost = ab.id === 'a_la_carga' ? 1 : (ab.def?.cost ?? 0);
                    if (disabled) {
                        addAlert?.(l('alert.abilityNotAvailable'), 'warning');
                    } else if (ap < cost) {
                        addAlert?.(l('alert.noPA'), 'warning');
                    } else {
                        if (ab.id === 'a_la_carga') {
                            dispatch({ type: 'ACTIVATE_ABILITY', abilityId: 'a_la_carga', unitId: unit.id });
                        } else if (ab.id === 'angel_guardian') {
                            dispatch({ type: 'ACTIVATE_ABILITY', abilityId: 'angel_guardian', unitId: unit.id });
                            setPendingAngelGuardian(true);
                        } else if (!ab.def?.requiresTarget && !['torbellino', 'cabalgar', 'cabalgar_2', 'posicion_estrategica'].includes(ab.id)) {
                            sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: unit.id, abilityId: ab.id });
                        } else {
                            dispatch({ type: 'ACTIVATE_ABILITY', abilityId: ab.id, unitId: unit.id });
                            if (ab.id === 'torbellino') setPendingTorbellino(true);
                        }
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
        ? getAbilityHighlights(state, movingUnitId, 'movimiento').filter(h => h.highlight === 'move').map(h => h.hex)
        : [];

    const isIdentityTargetMode = !!(mode === 'GAME' && state.players[myPlayerId]?.pendingIdentityTarget);
    const isEspartanoChoice = !!(mode === 'GAME' && state.players[myPlayerId]?.pendingEspartanoChoice);
    const isPlanBatalla = !!(mode === 'GAME' && state.players[myPlayerId]?.pendingPlanBatalla);
    const isPromptBlocked = isIdentityTargetMode || isEspartanoChoice || isPlanBatalla;

    // Clear selection when prompt mode activates (en_la_mira, espartano, comandante_supremo)
    useEffect(() => {
        if (isPromptBlocked) {
            clearAll();
            onInfoSelect?.(null);
        }
    }, [isPromptBlocked]);

    // Auto-activar card target mode cuando hay una carta pendiente que necesita target
    useEffect(() => {
        if (state.players[myPlayerId]?.pendingCardNeedsTarget && state.lastCardAction && selectedInfo?.type !== 'cardTarget') {
            onInfoSelect?.({ type: 'cardTarget', cardId: state.lastCardAction.cardId });
        }
    }, [state.players[myPlayerId]?.pendingCardNeedsTarget, state.lastCardAction?.cardId]);

    useEffect(() => {
        const clear = () => setHoveredHex(null);
        window.addEventListener('blur', clear);
        document.addEventListener('visibilitychange', clear);
        return () => {
            window.removeEventListener('blur', clear);
            document.removeEventListener('visibilitychange', clear);
        };
    }, [setHoveredHex]);

    const noAtaqueTargetAlerted = useRef(false);
    const pendingCardTarget = state.players[myPlayerId]?.pendingCardNeedsTarget && state.lastCardAction;
    const cardTargetInfo = (() => {
        const isMyTurn = state.activePlayer === myPlayerId && state.turnPhase !== 'COUNTER';
        const isCounterMode = state.turnPhase === 'COUNTER' && state.activePlayer !== myPlayerId;
        const isPendingTarget = !!pendingCardTarget && selectedInfo?.type === 'cardTarget';
        const isMode = mode === 'GAME' && selectedInfo?.type === 'cardTarget' && (isMyTurn || isCounterMode || isPendingTarget);
        if (!isMode) {
            noAtaqueTargetAlerted.current = false;
            return { isCardTargetMode: false, isCardTargetAlly: false, isCardTargetEnemy: false, cardTargets: [] as HexCoord[], hasNoAtaqueExtraTargets: false };
        }
        const cardId = selectedInfo?.cardId ?? '';
        const cardType = getCardType(cardId);
        const isReflect = isCounterMode && cardId.startsWith('espejo') && state.lastCardAction;
        const isAlly = isReflect ? false : cardType === 'BUFF';
        const raw = isAlly
            ? Object.values(state.units).filter(u => {
                if (u.owner !== myPlayerId) return false;
                if (cardId.startsWith('ataque_extra') && !(u.flags ?? []).includes('basic_attack')) return false;
                return true;
            }).map(u => u.position)
            : Object.values(state.units).filter(u => u.owner !== myPlayerId).map(u => u.position);
        const noTargets = cardId.startsWith('ataque_extra') && raw.length === 0;
        if (noTargets && !noAtaqueTargetAlerted.current) {
            noAtaqueTargetAlerted.current = true;
            setTimeout(() => {
                addAlert?.(l('alert.noUnitsAttacked'), 'warning');
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
    const isCardTargetMode = !!cardTargetInfo.isCardTargetMode;
    const isCardTargetAlly = !!cardTargetInfo.isCardTargetAlly;
    const isCardTargetEnemy = !!cardTargetInfo.isCardTargetEnemy;
    const cardTargets = cardTargetInfo.cardTargets;

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

    const multiStepTargets = mode === 'GAME' && pendingMultiStep
        ? (() => {
            const { abilityId, unitId, step, selections } = pendingMultiStep;
            const nextStep = step + 1;
            if (selections.length === 0) return [];
            const cfg = ABILITY_CONFIG[abilityId];
            if (!cfg || !Array.isArray(cfg.target)) return [];
            const targets = cfg.target as any[];
            if (nextStep >= targets.length) return [];
            const nextTargetCfg = targets[nextStep];
            const lastPos = selections[selections.length - 1];
            const prevTargetPos = selections.length >= 2 ? selections[selections.length - 2] : undefined;
            const center = (nextTargetCfg.stepCenter ?? 'target') === 'self'
                ? (state.units[unitId]?.position ?? lastPos)
                : lastPos;
            const avoidPos = nextTargetCfg.avoidAdjacentToTarget ? selections[0] : prevTargetPos;
            const highlights = getAbilityHighlights(state, unitId, abilityId, nextStep, center, avoidPos);
            return highlights.filter(h => h.highlight !== 'range').map(h => h.hex);
        })()
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

    const multiStepMoveTargets = mode === 'GAME' && pendingMultiStep?.abilityId
        ? multiStepTargets
        : [];

    const moveRangeRaw = mode === 'GAME' && movingUnitId
        ? getAbilityHighlights(state, movingUnitId, 'movimiento').filter(h => h.highlight === 'range').map(h => h.hex)
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

    const highlightedHexes = (() => {
        if (selectedInfo?.type === 'historyAttack') {
            const e = selectedInfo.entry;
            const ids = [e.attackerId, e.targetId];
            if (e.configId === 'torbellino') {
                if (e.alliesHit) ids.push(...e.alliesHit);
                if (e.enemiesHit) ids.push(...e.enemiesHit);
            }
            return [...Object.values(state.units)
                .filter(u => ids.includes(u.id))
                .map(u => u.position), ...actionHighlightHexes];
        }
        if (selectedInfo?.type === 'historyMove') {
            const e = selectedInfo.entry;
            const u = Object.values(state.units).find(u => u.id === e.unitId);
            const fromHistory = u ? [u.position, e.from, e.to] : [e.from, e.to];
            return [...fromHistory, ...actionHighlightHexes];
        }
        if (selectedInfo?.type === 'historyCard') {
            const e = selectedInfo.entry;
            const cardHexes: HexCoord[] = [];
            if (e.targetId) {
                const t = Object.values(state.units).find(u => u.id === e.targetId);
                if (t) cardHexes.push(t.position);
            }
            return [...cardHexes, ...actionHighlightHexes];
        }
        if (selectedInfo?.type === 'historyDeploy') {
            const e = selectedInfo.entry;
            if (e.unitId) {
                const u = Object.values(state.units).find(u => u.id === e.unitId);
                if (u) return [u.position, ...actionHighlightHexes];
            }
            return [...actionHighlightHexes];
        }
        return [...actionHighlightHexes];
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

    const occUnit = state.pendingOccupation ? state.units[state.pendingOccupation.unitId] : undefined;
    const occupationHex = (occUnit && occUnit.owner === myPlayerId) ? state.pendingOccupation!.position : undefined;

    function isBlocked(uid: string) {
        return state.activeModifiers.some(m => m.stat === 'bloqueo' && m.targetId === uid && m.remainingTurns >= 0 && (m.remainingUses === undefined || m.remainingUses > 0));
    }

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
        if (pendingMultiStep) return false;  // Multi-step uses multiStepMoveTargets / multiStepTargets directly
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

    const onHexClick = useHexClick(
        {
            state, myPlayerId, mode, isMyTurn, isMyDeployTurn,
            selectedDeployUnitId, selectedInfo,
            movingUnitId, attackingUnitId, pendingAbility, pendingMultiStep,
            pendingPatadaTargetId, pendingCounterEspejoCard,
            isCardTargetMode, isCardTargetAlly, isIdentityTargetMode,
            cabalgarPath, cabalgarIsLaCarga,
            multiStepMoveTargets,
            isReachable, isAttackTarget, isDeployable,
            isAbilityTarget, isAbilityMoveTarget, isAllyTarget,
            isCardTarget, isIdentityTarget,
            sendAction, addAlert, onInfoSelect, enqueue,
            isPromptBlocked,
            onIdentityTargetSelect: (id) => setPendingIdentityTargetId(id),
        },
        {
            setSelectedHex, setSelectedUnitId, setMovingUnitId, setAttackingUnitId,
            setPendingAbility, setPendingPatadaTargetId, setPendingCounterEspejoCard,
            setCabalgarPath,
            clearAll, dispatch,
        },
    );

    const handleHexClick = (hex: HexCoord) => {
      setActionHighlightHexes([]);
      onHexClick(hex);
    };

    return (
        <>
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`-${viewBoxWH.w/2} -${viewBoxWH.h/2} ${viewBoxWH.w} ${viewBoxWH.h}`}
                onWheel={e => zoom(-e.deltaY * 0.001)}
                onMouseMove={e => e.buttons === 1 && pan(e.movementX, e.movementY)}
                onPointerLeave={() => setHoveredHex(null)}
            >
                <style>{`
                    @keyframes deathFade {
                        0% { opacity: 1; transform: translateY(0px); }
                        100% { opacity: 0; transform: translateY(-60px); }
                    }
                `}</style>
                <g transform={`translate(${x} ${y}) scale(${scale})`}>
                    <rect x={-viewBoxWH.w * 0.65} y={-viewBoxWH.h * 3} width={viewBoxWH.w * 1.3} height={viewBoxWH.h * 6} fill="#111" />
                    <image href="/board.webp" x={-viewBoxWH.w * 0.65} y={-viewBoxWH.h * 3} width={viewBoxWH.w * 1.3} height={viewBoxWH.h * 6} preserveAspectRatio="xMidYMid meet" />
                    {hexes.map(hex => (
                        <HexTile
                            key={`${hex.q},${hex.r}`}
                            hex={hex}
                            hovered={
                                hoveredHex?.q === hex.q &&
                                hoveredHex?.r === hex.r
                            }
                            selected={selectedUnitId !== null && Object.values(state.units).some(u => u.id === selectedUnitId && u.position.q === hex.q && u.position.r === hex.r)}
                            reachable={
                                mode === 'DEPLOYMENT' && isMyDeployTurn ? isDeployable(hex)
                                : mode === 'GAME' && pendingMultiStep ? multiStepMoveTargets.some(h => h.q === hex.q && h.r === hex.r)
                                : mode === 'GAME' && angelGuardianHexes.length > 0 ? angelGuardianHexes.some(h => h.q === hex.q && h.r === hex.r)
                                : mode === 'GAME' && occupationHex ? occupationHex.q === hex.q && occupationHex.r === hex.r
                                : mode === 'GAME' && pendingAbility ? isAbilityMoveTarget(hex)
                                : isReachable(hex)
                            }
                            attackable={
                                mode === 'GAME'
                                ? (attackingUnitId !== null && isAttackTarget(hex)) ||
                                  (pendingMultiStep === null && pendingAbility !== null && isAbilityTarget(hex) && !isAllyTarget(hex)) ||
                                  (pendingAbility !== null && pendingAbility.abilityId === 'torbellino' && torbellinoTargets.some(h => h.q === hex.q && h.r === hex.r))
                                : false
                            }
                            identityTarget={mode === 'GAME' && (isIdentityTarget(hex) || cardTargets.some(h => h.q === hex.q && h.r === hex.r) || counterTargets.some(h => h.q === hex.q && h.r === hex.r))}
                            allyTarget={mode === 'GAME' && ((pendingAbility !== null && isAllyTarget(hex)) || (pendingMultiStep !== null && isAllyTarget(hex)))}
                            inRange={
                                mode === 'GAME' && !isReachable(hex) && !pendingMultiStep
                                ? isInRange(hex)
                                : false
                            }
                            enemyDeployable={mode === 'DEPLOYMENT' && !isMyDeployTurn && isDeployable(hex)}
                            highlighted={highlightedHexes.some(h => h.q === hex.q && h.r === hex.r)}
                            onHover={setHoveredHex}
                            onClick={handleHexClick}
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
                        cardTargetMode={isCardTargetMode}
                        isCardTargetAlly={isCardTargetAlly}
                        isCardTargetEnemy={isCardTargetEnemy}
                        cardTargetCardId={selectedInfo?.cardId ?? ''}
                        onCardTargetSelect={(cardId, targetId) => {
                            sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId, targetId });
                            onInfoSelect?.({ type: 'unit', unitId: targetId });
                            dispatch({ type: 'SELECT_UNIT', unitId: targetId });
                        }}
                        pendingCounterEspejoCard={pendingCounterEspejoCard}
                        setPendingCounterEspejoCard={setPendingCounterEspejoCard}
                        onPatadaTargetSelect={id => {
                            if (pendingAbility?.abilityId === 'patada_acrobatica' && !pendingPatadaTargetId) {
                                setPendingPatadaTargetId(id);
                            }
                        }}
                        animPositions={animPositions}
                        animAngles={animAngles}
                        movingUnitId={movingUnitId}
                        onInfoSelect={onInfoSelect}
                        sendAction={sendAction}
                        onHexClick={onHexClick}
                        onSelectUnit={unitId => {
                            setActionHighlightHexes([]);
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
                            // Permitir selección incluso si está bloqueada
                            if (selectedUnitId === unitId) {
                                clearAllSelections();
                            } else {
                                dispatch({ type: 'SELECT_UNIT', unitId });
                            }
                        }}
                        onRequestMove={unitId => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            if (isBlocked(unitId)) { addAlert?.(l('ui.blockedTurn', { n: 1 }), 'warning'); return; }
                            if (state.activeModifiers.some(m => m.stat === 'inmovil' && m.targetId === unitId && m.remainingTurns >= 0 && (m.remainingUses === undefined || m.remainingUses > 0))) {
                                addAlert?.(l('alert.inmovilized'), 'warning');
                                return;
                            }
                            dispatch({ type: 'START_MOVE', unitId });
                        }}
                        onRequestAttack={unitId => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            if (isBlocked(unitId)) { addAlert?.(l('ui.blockedTurn', { n: 1 }), 'warning'); return; }
                            dispatch({ type: 'START_ATTACK', unitId });
                        }}
                        onAttackUnit={(attackerId, targetId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            if (isBlocked(attackerId)) { addAlert?.(l('ui.blockedTurn', { n: 1 }), 'warning'); return; }
                            sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: attackerId, abilityId: 'ataque_basico', targetId });
                            dispatch({ type: 'EXECUTE_AND_KEEP_UNIT', unitId: attackerId });
                            setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: attackerId }), 150);
                        }}
                        onRequestAbilityTarget={(abilityId, unitId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            if (isBlocked(unitId)) { addAlert?.(l('ui.blockedTurn', { n: 1 }), 'warning'); return; }
                            dispatch({ type: 'ACTIVATE_ABILITY', abilityId, unitId });
                            if (abilityId === 'torbellino') setPendingTorbellino(true);
                        }}
                        onUseAbilityOnUnit={(abilityId, unitId, targetId) => {
                            if (!isMyTurn || mode === 'DEPLOYMENT') return;
                            sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, targetId });
                            dispatch({ type: 'EXECUTE_AND_KEEP_UNIT', unitId });
                            setPendingPatadaTargetId(null);
                        }}
                    />
                    {Object.entries(activeEffects).map(([id, ef]) =>
                      ef.name === 'slash' ? <SlashCut key={id} from={ef.from} to={ef.to} />
                        : ef.name === 'arrows' ? <ArrowVolley key={id} from={ef.from} to={ef.to} />
                        : ef.name === 'stab' ? <SpearStab key={id} from={ef.from} to={ef.to} />
                        : ef.name === 'stars' ? <StarsEffect key={id} from={ef.from} to={ef.to} />
                        : ef.name === 'shield' ? <ShieldEffect key={id} position={ef.from} />
                        : null
                    )}
                    {Object.entries(bubble).map(([id, b]) => {
                      const animPos = b.unitId ? animPositions[b.unitId] : undefined;
                      const pos = animPos ?? b.position;
                      return <SpeechBubble key={id} message={b.message} visible generalPosition={pos} />;
                    })}
                </g>
            </svg>
            <FlipCardOverlay myPlayerId={myPlayerId} onUseAction={pendingCardId ? {
                label: l('button.useCard'),
                onClick: () => {
                    if (pendingCardId) {
                        sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId: pendingCardId });
                        setPendingCardId(null);
                    }
                },
            } : undefined} />
            <HistoryPanel
                gameHistory={state.gameHistory ?? []}
                selectedInfo={selectedInfo}
                    onSelectEntry={entry => {
                        setActionHighlightHexes([]);
                        if (!entry) { clearAllSelections(); return; }
                    // Deploy entries: highlight without changing selection in right panel
                    if (entry.type === 'move' && entry.turn === 0 && entry.unitId && !entry.attackName) {
                        onInfoSelect?.({ type: 'historyDeploy', entry: entry as any });
                        return;
                    }
                    clearAllSelections();
                    setTimeout(() => {
                        if (entry.type === 'attack') onInfoSelect?.({ type: 'historyAttack', entry: entry as any });
                        else if (entry.type === 'move') onInfoSelect?.({ type: 'historyMove', entry: entry as any });
                        else if (entry.type === 'card' || entry.type === 'support') onInfoSelect?.({ type: 'historyCard', entry: entry as any });
                    }, 0);
                }}
            />
            <PendingOccupationPanel pendingOccupation={state.pendingOccupation} playerId={myPlayerId} sendAction={sendAction} state={state} />
            <BottomPanel
                state={state}
                playerId={myPlayerId}
                selectedUnitId={selectedUnitId}
                canAct={mode === 'GAME' && isMyTurn}
                onAngelGuardian={_unitId => {
                    setPendingAngelGuardian(true);
                }}
                onRequestMove={unitId => {
                    if (!isMyTurn || mode === 'DEPLOYMENT') return;
                    dispatch({ type: 'START_MOVE', unitId });
                }}
                onRequestAttack={unitId => {
                    if (!isMyTurn || mode === 'DEPLOYMENT') return;
                    dispatch({ type: 'START_ATTACK', unitId });
                }}
                onRequestAbilityTarget={(abilityId, unitId) => {
                    if (!isMyTurn || mode === 'DEPLOYMENT') return;
                    dispatch({ type: 'ACTIVATE_ABILITY', abilityId, unitId });
                    if (abilityId === 'torbellino') setPendingTorbellino(true);
                }}
                sendAction={sendAction}
                addAlert={addAlert}
                onInfoSelect={onInfoSelect}
                selectedInfo={selectedInfo}
                onCardSelect={cardId => {
                    const isDiscard = state.turnPhase === 'DRAW' && state.activePlayer === myPlayerId && (state.players[myPlayerId]?.cardsInHand?.length ?? 0) > 3;
                    onInfoSelect?.({ type: 'card', cardId, fromRect: undefined, _ck: Date.now(), discardMode: isDiscard });
                }}
            />

            <GameModals
                state={state}
                myPlayerId={myPlayerId}
                isIdentityTargetMode={isIdentityTargetMode}
                isCardTargetMode={isCardTargetMode}
                isCardTargetAlly={isCardTargetAlly}
                isWaitingForCounter={isWaitingForCounter}
                isCounterPrompt={isCounterPrompt}
                pendingCard={pendingCard}
                pendingAbility={pendingAbility}
                pendingIdentityTargetId={pendingIdentityTargetId}
                pendingPatadaTargetId={pendingPatadaTargetId}
                pendingCounterEspejoCard={pendingCounterEspejoCard}
                pendingTorbellino={pendingTorbellino}
                pendingAngelGuardian={pendingAngelGuardian}
                cabalgarPath={cabalgarPath}
                cabalgarMaxSteps={cabalgarMaxSteps}
                enqueue={enqueue}
                onInfoSelect={onInfoSelect}
                sendAction={sendAction}
                setPendingIdentityTargetId={setPendingIdentityTargetId}
                setPendingPatadaTargetId={setPendingPatadaTargetId}
                setPendingCounterEspejoCard={setPendingCounterEspejoCard}
                setPendingAbility={setPendingAbility}
                setCabalgarPath={setCabalgarPath}
                setCabalgarIsLaCarga={setCabalgarIsLaCarga}
                setPendingTorbellino={setPendingTorbellino}
                setPendingAngelGuardian={setPendingAngelGuardian}
            />

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

function getAllyAbilityTargets(state: GameState, unitId: UnitId, abilityId: string, _playerId: string): HexCoord[] {
    const highlights = getAbilityHighlights(state, unitId, abilityId);
    return highlights.filter(h => h.highlight === 'support').map(h => h.hex);
}

function getAttackTargets(state: GameState, unitId: UnitId, _playerId: string): HexCoord[] {
    const highlights = getAbilityHighlights(state, unitId, 'ataque_basico');
    return highlights.filter(h => h.highlight === 'attack').map(h => h.hex);
}

function getAbilityTargets(state: GameState, unitId: UnitId, abilityId: string, _playerId: string): HexCoord[] {
    const highlights = getAbilityHighlights(state, unitId, abilityId);
    return highlights.filter(h => h.highlight === 'attack' || h.highlight === 'support').map(h => h.hex);
}

function getAbilityMoveTargets(state: GameState, unitId: UnitId, abilityId: string, _targetId?: UnitId): HexCoord[] {
    const highlights = getAbilityHighlights(state, unitId, abilityId);
    return highlights.filter(h => h.highlight === 'move').map(h => h.hex);
}

function getRangeHexes(state: GameState, attackingUnitId: UnitId | null, pendingAbility: { abilityId: string; unitId: UnitId } | null): HexCoord[] {
    if (!attackingUnitId && !pendingAbility) return [];

    // Basic attack (use ataque_basico config)
    if (attackingUnitId) {
        const highlights = getAbilityHighlights(state, attackingUnitId, 'ataque_basico');
        return highlights.filter(h => h.highlight === 'range').map(h => h.hex);
    }

    // Ability range from config-driven system
    const highlights = getAbilityHighlights(state, pendingAbility!.unitId, pendingAbility!.abilityId);
    return highlights.filter(h => h.highlight === 'range').map(h => h.hex);
}

function SlashCut({ from, to }: { from: HexCoord; to: HexCoord }) {
  const p1 = axialToPixel(from);
  const p2 = axialToPixel(to);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const cx = p1.x + dx * 0.5;
  const cy = p1.y + dy * 0.5;
  const baseAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bladeLen = Math.min(dist * 0.5, 36);
  const sweepDeg = 65;
  const r = bladeLen;
  const sa = (-sweepDeg / 2) * Math.PI / 180;
  const ea = (sweepDeg / 2) * Math.PI / 180;
  const ax1 = r * Math.cos(sa);
  const ay1 = r * Math.sin(sa);
  const ax2 = r * Math.cos(ea);
  const ay2 = r * Math.sin(ea);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  const arcLen = bladeLen * sweepDeg * Math.PI / 180;
  const starS = 3.5;
  const nineOffsets = [
    [-2, -3, 14], [3, -1, 18], [-1, 2, 12],
    [4, 2, 16], [-3, -2, 10], [1, -3, 20],
    [-4, 1, 15], [2, 3, 13], [0, -1, 17],
  ];
  return (
    <g style={{ pointerEvents: 'none' }}>
      <style>{`
        @keyframes swing {
          0% { transform: rotate(${-sweepDeg / 2}deg); }
          100% { transform: rotate(${sweepDeg / 2}deg); }
        }
        @keyframes trailReveal {
          0% { stroke-dashoffset: ${-arcLen}; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes starBurst {
          0% { opacity: 0; transform: scale(0); }
          20% { opacity: 1; transform: scale(1.2); }
          50% { opacity: 0.8; }
          100% { opacity: 0; transform: scale(0.3); }
        }
      `}</style>
      <g transform={`translate(${cx}, ${cy}) rotate(${baseAngle})`}>
        <polygon
          points={`0,0 ${ax1},${ay1} ${ax2},${ay2}`}
          fill="white"
          fillOpacity={0.25}
        />
        <path
          d={`M ${ax1} ${ay1} A ${r} ${r} 0 ${largeArc} 1 ${ax2} ${ay2}`}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.4}
          strokeDasharray={arcLen}
          style={{ animation: 'trailReveal 0.3s ease-out forwards' }}
        />
        <g style={{ animation: 'swing 0.3s ease-out forwards', transformOrigin: '0px 0px' }}>
          <line x1={0} y1={0} x2={bladeLen} y2={0} stroke="white" strokeWidth={3} strokeLinecap="round" />
        </g>
      </g>
      {nineOffsets.map(([ox, oy, r2], i) => {
        const tx = p2.x + ox * 3.5;
        const ty = p2.y + oy * 3.5 + r2 * 0.2;
        const pts = [0, -starS, starS * 0.224, -starS * 0.309, starS, -starS * 0.309,
          starS * 0.363, starS * 0.118, starS * 0.588, starS * 0.809,
          0, starS * 0.382, -starS * 0.588, starS * 0.809,
          -starS * 0.363, starS * 0.118, -starS, -starS * 0.309,
          -starS * 0.224, -starS * 0.309].join(' ');
        return (
          <g key={i} transform={`translate(${tx}, ${ty})`}>
            <polygon
              points={pts}
              fill="#fbbf24"
              style={{
                transformOrigin: '0 0',
                animation: `starBurst 0.3s ease-out ${0.06 + i * 0.025}s forwards`,
                opacity: 0,
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

function ArrowVolley({ from, to }: { from: HexCoord; to: HexCoord }) {
  const p1 = axialToPixel(from);
  const p2 = axialToPixel(to);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const starS = 3.5;
  const nineOffsets = [
    [-2, -3, 14], [3, -1, 18], [-1, 2, 12],
    [4, 2, 16], [-3, -2, 10], [1, -3, 20],
    [-4, 1, 15], [2, 3, 13], [0, -1, 17],
  ];
  return (
    <g style={{ pointerEvents: 'none' }}>
      <style>{`
        @keyframes arrowShot {
          0% { stroke-dashoffset: ${dist}; }
          70% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes starBurst {
          0% { opacity: 0; transform: scale(0); }
          20% { opacity: 1; transform: scale(1.2); }
          50% { opacity: 0.8; }
          100% { opacity: 0; transform: scale(0.3); }
        }
      `}</style>
      {Array.from({ length: 3 }, (_, i) => {
        const offX = (i - 1) * 5;
        const offY = (i - 1) * 5;
        return (
          <line
            key={i}
            x1={p1.x + offX} y1={p1.y + offY}
            x2={p2.x + offX} y2={p2.y + offY}
            stroke="#fbbf24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={dist}
            style={{ animation: `arrowShot 0.55s ease-out ${i * 0.1}s forwards` }}
          />
        );
      })}
      {nineOffsets.map(([ox, oy, r2], i) => {
        const tx = p2.x + ox * 3.5;
        const ty = p2.y + oy * 3.5 + r2 * 0.2;
        const pts = [0, -starS, starS * 0.224, -starS * 0.309, starS, -starS * 0.309,
          starS * 0.363, starS * 0.118, starS * 0.588, starS * 0.809,
          0, starS * 0.382, -starS * 0.588, starS * 0.809,
          -starS * 0.363, starS * 0.118, -starS, -starS * 0.309,
          -starS * 0.224, -starS * 0.309].join(' ');
        return (
          <g key={i} transform={`translate(${tx}, ${ty})`}>
            <polygon
              points={pts}
              fill="#fbbf24"
              style={{
                transformOrigin: '0 0',
                animation: `starBurst 0.3s ease-out ${0.45 + i * 0.025}s forwards`,
                opacity: 0,
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

function SpearStab({ from, to }: { from: HexCoord; to: HexCoord }) {
  const p1 = axialToPixel(from);
  const p2 = axialToPixel(to);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const baseAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  const spearLen = 40;
  const starS = 3.5;
  const nineOffsets = [
    [-2, -3, 14], [3, -1, 18], [-1, 2, 12],
    [4, 2, 16], [-3, -2, 10], [1, -3, 20],
    [-4, 1, 15], [2, 3, 13], [0, -1, 17],
  ];
  return (
    <g style={{ pointerEvents: 'none' }}>
      <style>{`
        @keyframes spearThrust {
          0% { stroke-dashoffset: ${spearLen}; }
          18% { stroke-dashoffset: 0; }
          24% { stroke-dashoffset: ${spearLen * 0.5}; }
          30% { stroke-dashoffset: 0; }
          34% { stroke-dashoffset: ${spearLen * 0.5}; }
          40% { stroke-dashoffset: 0; }
          44% { stroke-dashoffset: ${spearLen * 0.5}; }
          50% { stroke-dashoffset: 0; }
          54% { stroke-dashoffset: ${spearLen * 0.5}; }
          60% { stroke-dashoffset: 0; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes spearAngle {
          0% { transform: rotate(0deg); }
          24% { transform: rotate(0deg); }
          30% { transform: rotate(0deg); }
          34% { transform: rotate(-4deg); }
          40% { transform: rotate(0deg); }
          44% { transform: rotate(4deg); }
          50% { transform: rotate(0deg); }
          54% { transform: rotate(-3deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes starBurst {
          0% { opacity: 0; transform: scale(0); }
          20% { opacity: 1; transform: scale(1.2); }
          50% { opacity: 0.8; }
          100% { opacity: 0; transform: scale(0.3); }
        }
      `}</style>
      <g transform={`translate(${p1.x}, ${p1.y}) rotate(${baseAngle})`}>
        <g style={{ animation: 'spearAngle 0.9s ease-in-out forwards', transformOrigin: '0px 0px' }}>
          <line
            x1={0} y1={0} x2={spearLen} y2={0}
            stroke="#e2e8f0"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={spearLen}
            style={{ animation: 'spearThrust 0.9s ease-in-out forwards' }}
          />
        </g>
      </g>
      {nineOffsets.map(([ox, oy, r2], i) => {
        const tx = p2.x + ox * 3.5;
        const ty = p2.y + oy * 3.5 + r2 * 0.2;
        const pts = [0, -starS, starS * 0.224, -starS * 0.309, starS, -starS * 0.309,
          starS * 0.363, starS * 0.118, starS * 0.588, starS * 0.809,
          0, starS * 0.382, -starS * 0.588, starS * 0.809,
          -starS * 0.363, starS * 0.118, -starS, -starS * 0.309,
          -starS * 0.224, -starS * 0.309].join(' ');
        return (
          <g key={i} transform={`translate(${tx}, ${ty})`}>
            <polygon
              points={pts}
              fill="#fbbf24"
              style={{
                transformOrigin: '0 0',
                animation: `starBurst 0.3s ease-out ${0.36 + i * 0.025}s forwards`,
                opacity: 0,
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

function StarIcon({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const s = size;
  const points = [
    [0, -s], [s * 0.224, -s * 0.309], [s, -s * 0.309],
    [s * 0.363, s * 0.118], [s * 0.588, s * 0.809],
    [0, s * 0.382], [-s * 0.588, s * 0.809],
    [-s * 0.363, s * 0.118], [-s, -s * 0.309],
    [-s * 0.224, -s * 0.309],
  ].map(([px, py]) => `${x + px},${y + py}`).join(' ');
  return (
    <polygon
      points={points}
      fill="#fbbf24"
      style={{
        animation: `starFall 1.2s ease-out ${delay}s both`,
        transformOrigin: `${x}px ${y}px`,
      }}
    />
  );
}

function StarsEffect({ from, to }: { from: HexCoord; to: HexCoord }) {
  const p1 = axialToPixel(from);
  const p2 = axialToPixel(to);
  const stars1 = Array.from({ length: 3 }, (_, i) => ({
    x: p1.x + (i - 1) * 14,
    y: p1.y,
    delay: i * 0.15,
  }));
  const stars2 = p1.x === p2.x && p1.y === p2.y ? [] : Array.from({ length: 3 }, (_, i) => ({
    x: p2.x + (i - 1) * 14,
    y: p2.y,
    delay: i * 0.15 + 0.3,
  }));
  const all = [...stars1, ...stars2];
  return (
    <g style={{ pointerEvents: 'none' }}>
      <style>{`
        @keyframes starFall {
          0% { opacity: 0; transform: translateY(-80px) scale(0.2); }
          20% { opacity: 1; transform: translateY(-24px) scale(1.2); }
          60% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(8px) scale(0.3); }
        }
      `}</style>
      {all.map((s, i) => (
        <StarIcon key={i} x={s.x} y={s.y} size={7} delay={s.delay} />
      ))}
    </g>
  );
}

function ShieldEffect({ position }: { position: HexCoord }) {
  const p = axialToPixel(position);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <style>{`
        @keyframes shieldFall {
          0% { opacity: 0; transform: translateY(-60px) scale(0.2); }
          20% { opacity: 1; transform: translateY(-30px) scale(1.1); }
          40% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(4px) scale(0.4); }
        }
      `}</style>
      <g transform={`translate(${p.x}, ${p.y})`}>
        <g style={{ animation: 'shieldFall 1s ease-out forwards' }}>
          <path
            d="M-12,-8 L12,-8 L12,2 Q12,10 0,16 Q-12,10 -12,2 Z"
            fill="none"
            stroke="#60a5fa"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <path
            d="M-8,-5 L8,-5 L8,1 Q8,7 0,12 Q-8,7 -8,1 Z"
            fill="#60a5fa"
            fillOpacity={0.3}
            stroke="none"
          />
        </g>
      </g>
    </g>
  );
}
