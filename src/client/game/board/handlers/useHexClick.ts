import type { GameState, GameAction, HexCoord, UnitId } from '@shared';
import { hexDistance } from '@shared';
import { countPlayerClasses } from '@shared/game/utils';
import { getCardType } from '@shared/game/actions/card';
import { getAbilityHighlights } from '@shared/game/board/selection';
import { ABILITY_CONFIG } from '@shared/game/data/ability-config';
import { l } from '@shared/i18n';
import type { PendingAbility, MultiStepState } from '../useSelection';

type ClickDeps = {
    state: GameState;
    myPlayerId: string;
    mode: 'GAME' | 'DEPLOYMENT';
    isMyTurn: boolean;
    isMyDeployTurn: boolean;
    selectedDeployUnitId: string | null | undefined;
    selectedInfo: any;
    movingUnitId: UnitId | null;
    attackingUnitId: UnitId | null;
    pendingAbility: PendingAbility;
    pendingMultiStep: MultiStepState;
    pendingPatadaTargetId: UnitId | null;
    pendingCounterEspejoCard: string | null;
    isCardTargetMode: boolean;
    isCardTargetAlly: boolean;
    isIdentityTargetMode: boolean;
    cabalgarPath: HexCoord[];
    cabalgarIsLaCarga: boolean;
    patadaDestHexes: HexCoord[];
    isReachable: (hex: HexCoord) => boolean;
    isAttackTarget: (hex: HexCoord) => boolean;
    isDeployable: (hex: HexCoord) => boolean;
    isAbilityTarget: (hex: HexCoord) => boolean;
    isAbilityMoveTarget: (hex: HexCoord) => boolean;
    isAllyTarget: (hex: HexCoord) => boolean;
    isCardTarget: (hex: HexCoord) => boolean;
    isIdentityTarget: (hex: HexCoord) => boolean;
    isIdentityTargetMode: boolean;
    isPromptBlocked: boolean;
    onIdentityTargetSelect?: (unitId: UnitId) => void;
    sendAction: (action: any) => void;
    addAlert?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    onInfoSelect?: (info: any) => void;
    enqueue: (anim: any) => void;
};

type ClickSetters = {
    setSelectedHex: (hex: HexCoord | null) => void;
    setSelectedUnitId: (id: UnitId | null) => void;
    setMovingUnitId: (id: UnitId | null) => void;
    setAttackingUnitId: (id: UnitId | null) => void;
    setPendingAbility: (pa: PendingAbility) => void;
    setPendingPatadaTargetId: (id: UnitId | null) => void;
    setPendingCounterEspejoCard: (id: string | null) => void;
    setCabalgarPath: (path: HexCoord[]) => void;
    clearAll: () => void;
    dispatch: (action: any) => void;
};

export function useHexClick(deps: ClickDeps, setters: ClickSetters): (hex: HexCoord) => void {
    const {
        state, myPlayerId, mode, isMyTurn, isMyDeployTurn,
        selectedDeployUnitId, selectedInfo,
        movingUnitId, attackingUnitId, pendingAbility, pendingMultiStep,
        pendingPatadaTargetId, pendingCounterEspejoCard,
        isCardTargetMode, isCardTargetAlly, isIdentityTargetMode, isPromptBlocked,
        cabalgarPath, cabalgarIsLaCarga,
        patadaDestHexes,
        isReachable, isAttackTarget, isDeployable,
        isAbilityTarget, isAbilityMoveTarget, isAllyTarget,
        isCardTarget, isIdentityTarget,
        sendAction, addAlert, onInfoSelect, enqueue, onIdentityTargetSelect,
    } = deps;

    const {
        setSelectedHex, setSelectedUnitId, setMovingUnitId, setAttackingUnitId,
        setPendingAbility, setPendingPatadaTargetId, setPendingCounterEspejoCard,
        setCabalgarPath,
        clearAll, dispatch,
    } = setters;

    function handleDeploy(hex: HexCoord) {
        if (selectedDeployUnitId && isDeployable(hex)) {
            const poolEntry = state.players[myPlayerId]?.unitsToDeploy?.find(u => u.unitId === selectedDeployUnitId);
            if (poolEntry) {
                const classCounts = countPlayerClasses(state, myPlayerId);
                const deployed = state.players[myPlayerId]?.deployedUnits?.length ?? 0;
                if (classCounts.general === 0 && poolEntry.unitClass !== 'general' && deployed >= 10) {
                    addAlert?.(l('alert.mustDeployGeneral'), 'warning');
                    return;
                }
            }
            sendAction({ type: 'DEPLOY_UNIT', playerId: myPlayerId, unitId: selectedDeployUnitId, position: hex });
        } else if (selectedDeployUnitId) {
            addAlert?.(l('alert.invalidPosition'), 'warning');
        }
    }

    function handleAbilityMode(hex: HexCoord, abilityId: string, unitId: UnitId) {
        const cfg = ABILITY_CONFIG[abilityId];
        const targets = Array.isArray(cfg?.target) ? cfg.target : null;

        // ── Multi-step abilities: first click starts step 0 ──
        if (targets && !pendingMultiStep) {
            const highlights = getAbilityHighlights(state, unitId, abilityId, 0);
            const targetEntry = highlights.find(h => h.highlight !== 'range' && h.hex.q === hex.q && h.hex.r === hex.r);
            if (!targetEntry) {
                const occupant = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                if (occupant) {
                    dispatch({ type: 'SELECT_UNIT', unitId: occupant.id });
                    onInfoSelect?.({ type: 'unit', unitId: occupant.id });
                } else {
                    onInfoSelect?.(null);
                    dispatch({ type: 'DESELECT_ALL' });
                }
                return;
            }
            dispatch({ type: 'START_MULTI_STEP', abilityId, unitId, hex });
            return;
        }

        // ── Multi-step abilities: subsequent steps ──
        if (targets && pendingMultiStep) {
            const { step, selections } = pendingMultiStep;
            const nextStep = step + 1;
            if (nextStep >= targets.length) {
                clearAll();
                return;
            }
            const nextTargetCfg = targets[nextStep];
            const lastPos = selections[selections.length - 1];
            const prevTargetPos = selections.length >= 2 ? selections[selections.length - 2] : undefined;
            const center = (nextTargetCfg.stepCenter ?? 'target') === 'self'
                ? (state.units[unitId]?.position ?? lastPos)
                : lastPos;
            // Avoid adjacency to the first target (retreat/positioning)
            const avoidPos = nextTargetCfg.avoidAdjacentToTarget
                ? selections[0]
                : prevTargetPos;

            const highlights = getAbilityHighlights(state, unitId, abilityId, nextStep, center, avoidPos);
            const targetEntry = highlights.find(h => h.highlight !== 'range' && h.hex.q === hex.q && h.hex.r === hex.r);

            if (!targetEntry) {
                const occupant = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                if (occupant) {
                    dispatch({ type: 'SELECT_UNIT', unitId: occupant.id });
                    onInfoSelect?.({ type: 'unit', unitId: occupant.id });
                } else {
                    onInfoSelect?.(null);
                    dispatch({ type: 'DESELECT_ALL' });
                }
                return;
            }

            const isLastStep = nextStep >= targets.length - 1;

            if (isLastStep) {
                const targetUnit = Object.values(state.units).find(u => u.position.q === selections[0].q && u.position.r === selections[0].r);
                if (targetUnit) {
                    // Attack/support with retreat (patada_acrobatica): targetId + to
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, targetId: targetUnit.id, to: hex });
                } else if (targets[0].type === 'move') {
                    // Path-based movement (cabalgar_2): send all selections as path
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, path: [...selections, hex] });
                } else {
                    // Target position (single hex)
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, to: selections[0] });
                }
                setTimeout(() => onInfoSelect?.({ type: 'unit', unitId }), 150);
                dispatch({ type: 'EXECUTE_AND_KEEP_UNIT', unitId });
            } else {
                dispatch({ type: 'ADVANCE_MULTI_STEP', hex });
            }
            return;
        }

        // ── Single-step ability: validate via highlights ──
        const highlights = getAbilityHighlights(state, unitId, abilityId);
        const targetEntry = highlights.find(h => h.highlight !== 'range' && h.hex.q === hex.q && h.hex.r === hex.r);

        if (!targetEntry) {
            // If there's a unit on this hex, select it
            const occupant = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (occupant) {
                dispatch({ type: 'SELECT_UNIT', unitId: occupant.id });
                onInfoSelect?.({ type: 'unit', unitId: occupant.id });
        } else {
            // Click on hex: select unit if present, otherwise clear
            const occupant = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (occupant) {
                dispatch({ type: 'SELECT_UNIT', unitId: occupant.id });
                onInfoSelect?.({ type: 'unit', unitId: occupant.id });
        } else {
            // Click on hex: select unit if present, otherwise clear
            const occupant = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (occupant) {
                dispatch({ type: 'SELECT_UNIT', unitId: occupant.id });
                onInfoSelect?.({ type: 'unit', unitId: occupant.id });
            } else {
                onInfoSelect?.(null);
                clearAll();
            }
        }
        }
            return;
        }

        // Valid target → execute ability
        onInfoSelect?.(null);

        if (targetEntry.highlight === 'move') {
            if (abilityId === 'cabalgar') {
                const u = state.units[unitId];
                if (u) {
                    const dq = hex.q - u.position.q;
                    const dr = hex.r - u.position.r;
                    const mid = { q: u.position.q + dq / 2, r: u.position.r + dr / 2 };
                    const animPath = [u.position, mid, hex];
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, to: hex });
                    enqueue({ id: `cabalgar_${unitId}_${Date.now()}`, type: 'move', unitId, path: animPath, duration: 700 * 2 });
                }
            } else {
                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, to: hex });
            }
        } else {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (!target) return;
            const isEnemy = target.owner !== myPlayerId;
            if ((targetEntry.highlight === 'attack' && isEnemy) || (targetEntry.highlight === 'support' && !isEnemy)) {
                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId, abilityId, targetId: target.id });
            } else {
                dispatch({ type: 'DESELECT_ALL' });
                return;
            }
        }

        dispatch({ type: 'EXECUTE_AND_KEEP_UNIT', unitId });
        setTimeout(() => onInfoSelect?.({ type: 'unit', unitId }), 150);
    }

    function handleCard(hex: HexCoord) {
        if (!isCardTargetMode) return;
        if (isCardTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && (isCardTargetAlly ? target.owner === myPlayerId : target.owner !== myPlayerId)) {
                const cardId = selectedInfo?.cardId ?? '';
                sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId, targetId: target.id });
                onInfoSelect?.({ type: 'unit', unitId: target.id });
                dispatch({ type: 'SELECT_UNIT', unitId: target.id });
            }
        } else {
            onInfoSelect?.(null);
            clearAll();
        }
    }

    function handleCounterEspejo(hex: HexCoord) {
        if (!pendingCounterEspejoCard) return;
        const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
        if (target && target.owner !== myPlayerId) {
            sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId: pendingCounterEspejoCard, targetId: target.id });
            setPendingCounterEspejoCard(null);
        } else {
            setPendingCounterEspejoCard(null);
        }
    }

    return function onHexClick(hex: HexCoord) {
        if (!isMyTurn && !isCardTargetMode) return;

        // Block hex clicks during prompt modes (espartano, comandante_supremo, en_la_mira)
        if (isPromptBlocked && !(isIdentityTargetMode && isIdentityTarget(hex))) {
            addAlert?.(l('alert.abilityNotAvailable'), 'warning');
            return;
        }

        if (mode === 'DEPLOYMENT') {
            handleDeploy(hex);
            return;
        }

        setSelectedHex(hex);

        const activeAbilityId = movingUnitId ? 'movimiento' : attackingUnitId ? 'ataque_basico' : pendingAbility?.abilityId;
        const activeUnitId = movingUnitId || attackingUnitId || pendingAbility?.unitId;

        if (activeAbilityId && activeUnitId) {
            handleAbilityMode(hex, activeAbilityId, activeUnitId);
        } else if (isCardTargetMode) {
            handleCard(hex);
        } else if (pendingCounterEspejoCard) {
            handleCounterEspejo(hex);
        } else if (isIdentityTargetMode && !isIdentityTarget(hex)) {
            addAlert?.(l('alert.selectEnemyNotGeneral'), 'warning');
        } else {
            // Click on hex: select unit if present, otherwise clear
            const hexOccupant = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (hexOccupant) {
                if (isIdentityTargetMode && onIdentityTargetSelect) {
                    onIdentityTargetSelect(hexOccupant.id);
                } else {
                    dispatch({ type: 'SELECT_UNIT', unitId: hexOccupant.id });
                    onInfoSelect?.({ type: 'unit', unitId: hexOccupant.id });
                }
            } else {
                onInfoSelect?.(null);
                setSelectedHex(hex);
                clearAll();
            }
        }
    };
}

// Debug log to verify file is updated
console.log('[useHexClick] loaded with hex occupant selection');
