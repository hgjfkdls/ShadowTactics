import type { GameState, GameAction, HexCoord, UnitId } from '@shared';
import { hexDistance } from '@shared';
import { countPlayerClasses, isHexOccupied } from '@shared/game/utils';
import { getPlayerAP } from '@shared/game/actions';
import { getCardName, getCardType } from '@shared/game/actions/card';
import { l } from '@shared/i18n';
import type { PendingAbility } from '../useSelection';

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
};

export function useHexClick(deps: ClickDeps, setters: ClickSetters): (hex: HexCoord) => void {
    const {
        state, myPlayerId, mode, isMyTurn, isMyDeployTurn,
        selectedDeployUnitId, selectedInfo,
        movingUnitId, attackingUnitId, pendingAbility,
        pendingPatadaTargetId, pendingCounterEspejoCard,
        isCardTargetMode, isCardTargetAlly, isIdentityTargetMode,
        cabalgarPath, cabalgarIsLaCarga,
        patadaDestHexes,
        isReachable, isAttackTarget, isDeployable,
        isAbilityTarget, isAbilityMoveTarget, isAllyTarget,
        isCardTarget, isIdentityTarget,
        sendAction, addAlert, onInfoSelect, enqueue,
    } = deps;

    const {
        setSelectedHex, setSelectedUnitId, setMovingUnitId, setAttackingUnitId,
        setPendingAbility, setPendingPatadaTargetId, setPendingCounterEspejoCard,
        setCabalgarPath,
        clearAll,
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

    function handleMove(hex: HexCoord) {
        if (!movingUnitId) return;
        if (isReachable(hex)) {
            sendAction({ type: 'MOVE_UNIT', playerId: myPlayerId, unitId: movingUnitId, to: hex });
            const movedId = movingUnitId;
            setMovingUnitId(null);
            setTimeout(() => setSelectedUnitId(movedId), 50);
        } else {
            addAlert?.(l('alert.noMoveHex'), 'warning');
        }
    }

    function handleAttack(hex: HexCoord) {
        if (!attackingUnitId) return;
        if (isAttackTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && target.owner !== myPlayerId) {
                sendAction({ type: 'ATTACK_UNIT', playerId: myPlayerId, unitId: attackingUnitId, targetId: target.id });
                setAttackingUnitId(null);
                const atkId = attackingUnitId;
                setTimeout(() => setSelectedUnitId(atkId), 50);
            }
        } else {
            addAlert?.(l('alert.noEnemyHex'), 'warning');
        }
    }

    function handleAbility(hex: HexCoord) {
        if (!pendingAbility) return;

        if (pendingAbility.abilityId === 'patada_acrobatica') {
            if (!pendingPatadaTargetId) {
                if (isAbilityTarget(hex)) {
                    const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
                    if (target && target.owner !== myPlayerId) setPendingPatadaTargetId(target.id);
                } else {
                    addAlert?.(l('alert.selectEnemy'), 'warning');
                }
            } else {
                if (patadaDestHexes.some(h => h.q === hex.q && h.r === hex.r)) {
                    onInfoSelect?.(null);
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: 'patada_acrobatica', targetId: pendingPatadaTargetId, to: hex });
                    const pUid = pendingAbility.unitId;
                    setPendingAbility(null);
                    setPendingPatadaTargetId(null);
                    setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: pUid }), 150);
                } else {
                    addAlert?.(l('alert.selectEscape'), 'warning');
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
                    const animPath = [u.position, mid, hex];
                    sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: 'cabalgar', to: hex });
                    enqueue({ id: `cabalgar_${pendingAbility.unitId}_${Date.now()}`, type: 'move', unitId: pendingAbility.unitId, path: animPath, duration: 700 * 2 });
                }
            } else {
                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, to: hex });
                setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: pendingAbility.unitId }), 150);
            }
            setPendingAbility(null);
            setPendingPatadaTargetId(null);
        } else if (isAbilityTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && target.owner !== myPlayerId) {
                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, targetId: target.id });
                const aUid = pendingAbility.unitId;
                setPendingAbility(null);
                setPendingPatadaTargetId(null);
                setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: aUid }), 150);
            }
        } else if (isAllyTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && target.owner === myPlayerId) {
                sendAction({ type: 'USE_ABILITY', playerId: myPlayerId, unitId: pendingAbility.unitId, abilityId: pendingAbility.abilityId, targetId: target.id });
                const aUid = pendingAbility.unitId;
                setPendingAbility(null);
                setPendingPatadaTargetId(null);
                setTimeout(() => onInfoSelect?.({ type: 'unit', unitId: aUid }), 150);
            }
        } else if (pendingAbility.abilityId === 'cabalgar_2') {
            const unit = state.units[pendingAbility.unitId];
            if (!unit) return;
            const maxSteps = cabalgarIsLaCarga ? 3 : 2;
            const isAdjacentFree = (h: HexCoord) => hexDistance(unit.position, h) === 1 && !Object.values(state.units).some(u => u.position.q === h.q && u.position.r === h.r);
            const isContiguousFree = (last: HexCoord, h: HexCoord) => hexDistance(last, h) === 1 && !cabalgarPath.some(p => p.q === h.q && p.r === h.r) && !Object.values(state.units).some(u => u.position.q === h.q && u.position.r === h.r);

            if (cabalgarPath.length === 0 && isAdjacentFree(hex)) {
                setCabalgarPath([hex]);
            } else if (cabalgarPath.length > 0 && cabalgarPath.length < maxSteps && isContiguousFree(cabalgarPath[cabalgarPath.length - 1], hex)) {
                setCabalgarPath([...cabalgarPath, hex]);
            } else if (cabalgarPath.length >= maxSteps) {
                addAlert?.('Ya seleccionaste la ruta completa. Confirma o cancela.', 'warning');
            } else {
                addAlert?.('Selecciona una casilla adyacente a la unidad', 'warning');
            }
        } else {
            addAlert?.(l('alert.noValidPosition'), 'warning');
        }
    }

    function handleCard(hex: HexCoord) {
        if (!isCardTargetMode) return;
        if (isCardTarget(hex)) {
            const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
            if (target && (isCardTargetAlly ? target.owner === myPlayerId : target.owner !== myPlayerId)) {
                const cardId = selectedInfo?.cardId ?? '';
                sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId, targetId: target.id });
                onInfoSelect?.({ type: 'unit', unitId: target.id });
                setSelectedUnitId(target.id);
            }
        } else {
            addAlert?.(isCardTargetAlly ? l('alert.selectAlly') : l('alert.selectEnemyTarget'), 'warning');
        }
    }

    function handleCounterEspejo(hex: HexCoord) {
        if (!pendingCounterEspejoCard) return;
        const target = Object.values(state.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
        if (target && target.owner !== myPlayerId) {
            sendAction({ type: 'USE_CARD', playerId: myPlayerId, cardId: pendingCounterEspejoCard, targetId: target.id });
            setPendingCounterEspejoCard(null);
        }
    }

    return function onHexClick(hex: HexCoord) {
        if (!isMyTurn) return;

        if (mode === 'DEPLOYMENT') {
            handleDeploy(hex);
            return;
        }

        setSelectedHex(hex);

        if (movingUnitId) {
            handleMove(hex);
        } else if (attackingUnitId) {
            handleAttack(hex);
        } else if (pendingAbility) {
            handleAbility(hex);
        } else if (isCardTargetMode) {
            handleCard(hex);
        } else if (pendingCounterEspejoCard) {
            handleCounterEspejo(hex);
        } else if (isIdentityTargetMode && !isIdentityTarget(hex)) {
            addAlert?.('Selecciona un enemigo que no sea el general', 'warning');
        } else {
            clearAll();
        }
    };
}
