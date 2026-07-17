import { useReducer, useCallback } from 'react';
import type { HexCoord, UnitId } from '@shared';

export type PendingAbility = { abilityId: string; unitId: UnitId } | null;

export type MultiStepState = {
    abilityId: string;
    unitId: UnitId;
    step: number;
    selections: HexCoord[];  // hexes seleccionados hasta ahora
} | null;

export type SelectionKind = 'unit' | 'move' | 'attack' | 'ability' | 'card' | 'history' | 'identity' | 'deploy' | null;

export type SelectionState = {
    kind: SelectionKind;
    selectedUnitId: UnitId | null;
    movingUnitId: UnitId | null;
    attackingUnitId: UnitId | null;
    pendingAbility: PendingAbility;
    pendingMultiStep: MultiStepState;
    hoveredHex: HexCoord | null;
    selectedHex: HexCoord | null;
    pendingIdentityTargetId: UnitId | null;
    pendingPatadaTargetId: UnitId | null;
    cabalgarPath: HexCoord[];
    cabalgarIsLaCarga: boolean;
    pendingTorbellino: boolean;
    pendingAngelGuardian: boolean;
    pendingCounterEspejoCard: string | null;
};

export type SelectionAction =
    | { type: 'SELECT_UNIT'; unitId: UnitId }
    | { type: 'START_MOVE'; unitId: UnitId }
    | { type: 'START_ATTACK'; unitId: UnitId }
    | { type: 'ACTIVATE_ABILITY'; abilityId: string; unitId: UnitId }
    | { type: 'START_MULTI_STEP'; abilityId: string; unitId: UnitId; hex: HexCoord }
    | { type: 'ADVANCE_MULTI_STEP'; hex: HexCoord }
    | { type: 'CLEAR_MODE' }
    | { type: 'SET_HOVERED_HEX'; hex: HexCoord | null }
    | { type: 'SET_SELECTED_HEX'; hex: HexCoord | null }
    | { type: 'SET_PATADA_TARGET'; targetId: UnitId | null }
    | { type: 'SET_IDENTITY_TARGET'; targetId: UnitId | null }
    | { type: 'SET_CABALGAR_PATH'; path: HexCoord[]; isLaCarga?: boolean }
    | { type: 'SET_TORBELLINO'; active: boolean }
    | { type: 'SET_ANGEL_GUARDIAN'; active: boolean }
    | { type: 'SET_COUNTER_ESPEJO'; cardId: string | null }
    | { type: 'EXECUTE_AND_KEEP_UNIT'; unitId: UnitId }
    | { type: 'DESELECT_ALL' };

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
    const clear = {
        selectedUnitId: null as UnitId | null,
        movingUnitId: null as UnitId | null,
        attackingUnitId: null as UnitId | null,
        pendingAbility: null as PendingAbility,
        pendingMultiStep: null as MultiStepState,
        pendingIdentityTargetId: null as UnitId | null,
        pendingPatadaTargetId: null as UnitId | null,
        cabalgarPath: [] as HexCoord[],
        cabalgarIsLaCarga: false,
        pendingTorbellino: false,
        pendingAngelGuardian: false,
        pendingCounterEspejoCard: null as string | null,
        hoveredHex: null as HexCoord | null,
    };

    switch (action.type) {
        case 'SELECT_UNIT':
            return { ...state, ...clear, kind: 'unit', selectedUnitId: action.unitId };

        case 'START_MOVE':
            return { ...state, ...clear, kind: 'move', movingUnitId: action.unitId, selectedUnitId: action.unitId };

        case 'START_ATTACK':
            return { ...state, ...clear, kind: 'attack', attackingUnitId: action.unitId, selectedUnitId: action.unitId };

        case 'ACTIVATE_ABILITY':
            return { ...state, ...clear, kind: 'ability', pendingAbility: { abilityId: action.abilityId, unitId: action.unitId }, selectedUnitId: action.unitId };

        case 'START_MULTI_STEP':
            return { ...state, ...clear, kind: 'ability', pendingAbility: { abilityId: action.abilityId, unitId: action.unitId }, pendingMultiStep: { abilityId: action.abilityId, unitId: action.unitId, step: 0, selections: [action.hex] }, selectedUnitId: action.unitId };

        case 'ADVANCE_MULTI_STEP':
            if (!state.pendingMultiStep) return state;
            return {
                ...state,
                pendingMultiStep: {
                    ...state.pendingMultiStep,
                    step: state.pendingMultiStep.step + 1,
                    selections: [...state.pendingMultiStep.selections, action.hex],
                },
            };

        case 'EXECUTE_AND_KEEP_UNIT':
            return { ...state, ...clear, kind: 'unit', selectedUnitId: action.unitId };

        case 'DESELECT_ALL':
            return { ...state, ...clear, kind: null };

        case 'CLEAR_MODE':
            return { ...state, kind: null, movingUnitId: null, attackingUnitId: null, pendingAbility: null, pendingMultiStep: null };

        case 'SET_HOVERED_HEX':
            return { ...state, hoveredHex: action.hex };

        case 'SET_SELECTED_HEX':
            return { ...state, selectedHex: action.hex };

        case 'SET_PATADA_TARGET':
            return { ...state, pendingPatadaTargetId: action.targetId };

        case 'SET_IDENTITY_TARGET':
            return { ...state, pendingIdentityTargetId: action.targetId };

        case 'SET_CABALGAR_PATH':
            return { ...state, cabalgarPath: action.path, cabalgarIsLaCarga: action.isLaCarga ?? state.cabalgarIsLaCarga };

        case 'SET_TORBELLINO':
            return { ...state, pendingTorbellino: action.active };

        case 'SET_ANGEL_GUARDIAN':
            return { ...state, pendingAngelGuardian: action.active };

        case 'SET_COUNTER_ESPEJO':
            return { ...state, pendingCounterEspejoCard: action.cardId };

        default:
            return state;
    }
}

const INITIAL_STATE: SelectionState = {
    kind: null,
    selectedUnitId: null,
    movingUnitId: null,
    attackingUnitId: null,
    pendingAbility: null,
    pendingMultiStep: null,
    hoveredHex: null,
    selectedHex: null,
    pendingIdentityTargetId: null,
    pendingPatadaTargetId: null,
    cabalgarPath: [],
    cabalgarIsLaCarga: false,
    pendingTorbellino: false,
    pendingAngelGuardian: false,
    pendingCounterEspejoCard: null,
};

export function useSelection() {
    const [state, dispatch] = useReducer(selectionReducer, INITIAL_STATE);

    const setSelectedUnitId = useCallback((id: UnitId | null) => dispatch(id ? { type: 'SELECT_UNIT', unitId: id } : { type: 'CLEAR_MODE' }), []);
    const setMovingUnitId = useCallback((id: UnitId | null) => dispatch(id ? { type: 'START_MOVE', unitId: id } : { type: 'CLEAR_MODE' }), []);
    const setAttackingUnitId = useCallback((id: UnitId | null) => dispatch(id ? { type: 'START_ATTACK', unitId: id } : { type: 'CLEAR_MODE' }), []);
    const setPendingAbility = useCallback((pa: PendingAbility) => dispatch(pa ? { type: 'ACTIVATE_ABILITY', abilityId: pa.abilityId, unitId: pa.unitId } : { type: 'CLEAR_MODE' }), []);
    const setSelectedHex = useCallback((hex: HexCoord | null) => dispatch({ type: 'SET_SELECTED_HEX', hex }), []);
    const setHoveredHex = useCallback((hex: HexCoord | null) => dispatch({ type: 'SET_HOVERED_HEX', hex }), []);
    const setPendingPatadaTargetId = useCallback((id: UnitId | null) => dispatch({ type: 'SET_PATADA_TARGET', targetId: id }), []);
    const setPendingIdentityTargetId = useCallback((id: UnitId | null) => dispatch({ type: 'SET_IDENTITY_TARGET', targetId: id }), []);
    const setCabalgarPath = useCallback((path: HexCoord[]) => dispatch({ type: 'SET_CABALGAR_PATH', path }), []);
    const setCabalgarIsLaCarga = useCallback((v: boolean) => dispatch({ type: 'SET_CABALGAR_PATH', path: state.cabalgarPath, isLaCarga: v }), [state.cabalgarPath]);
    const setPendingTorbellino = useCallback((v: boolean) => dispatch({ type: 'SET_TORBELLINO', active: v }), []);
    const setPendingAngelGuardian = useCallback((v: boolean) => dispatch({ type: 'SET_ANGEL_GUARDIAN', active: v }), []);
    const setPendingCounterEspejoCard = useCallback((id: string | null) => dispatch({ type: 'SET_COUNTER_ESPEJO', cardId: id }), []);
    const clearAll = useCallback(() => dispatch({ type: 'DESELECT_ALL' }), []);

    return {
        ...state,
        setSelectedUnitId,
        setMovingUnitId,
        setAttackingUnitId,
        setPendingAbility,
        setSelectedHex,
        setHoveredHex,
        setPendingPatadaTargetId,
        setPendingIdentityTargetId,
        setCabalgarPath,
        setCabalgarIsLaCarga,
        setPendingTorbellino,
        setPendingAngelGuardian,
        setPendingCounterEspejoCard,
        clearAll,
        dispatch,
    };
}
