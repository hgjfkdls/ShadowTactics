import { useState } from 'react';
import type { HexCoord, UnitId } from '@shared';

export type PendingAbility = { abilityId: string; unitId: UnitId } | null;

export type SelectionState = {
    hoveredHex: HexCoord | null;
    selectedHex: HexCoord | null;
    selectedUnitId: UnitId | null;
    movingUnitId: UnitId | null;
    attackingUnitId: UnitId | null;
    pendingAbility: PendingAbility;
    pendingIdentityTargetId: UnitId | null;
    pendingPatadaTargetId: UnitId | null;
    cabalgarPath: HexCoord[];
    cabalgarIsLaCarga: boolean;
    pendingTorbellino: boolean;
    pendingAngelGuardian: boolean;
    pendingCounterEspejoCard: string | null;
};

export type SelectionActions = {
    setHoveredHex: (hex: HexCoord | null) => void;
    setSelectedHex: (hex: HexCoord | null) => void;
    setSelectedUnitId: (id: UnitId | null) => void;
    setMovingUnitId: (id: UnitId | null) => void;
    setAttackingUnitId: (id: UnitId | null) => void;
    setPendingAbility: (pa: PendingAbility) => void;
    setPendingIdentityTargetId: (id: UnitId | null) => void;
    setPendingPatadaTargetId: (id: UnitId | null) => void;
    setCabalgarPath: (path: HexCoord[]) => void;
    setCabalgarIsLaCarga: (v: boolean) => void;
    setPendingTorbellino: (v: boolean) => void;
    setPendingAngelGuardian: (v: boolean) => void;
    setPendingCounterEspejoCard: (id: string | null) => void;
    clearAll: () => void;
};

export function useSelection(): SelectionState & SelectionActions {
    const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
    const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<UnitId | null>(null);
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

    function clearAll() {
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
    }

    return {
        hoveredHex, selectedHex, selectedUnitId,
        movingUnitId, attackingUnitId, pendingAbility,
        pendingIdentityTargetId, pendingPatadaTargetId,
        cabalgarPath, cabalgarIsLaCarga,
        pendingTorbellino, pendingAngelGuardian, pendingCounterEspejoCard,
        setHoveredHex, setSelectedHex, setSelectedUnitId,
        setMovingUnitId, setAttackingUnitId, setPendingAbility,
        setPendingIdentityTargetId, setPendingPatadaTargetId,
        setCabalgarPath, setCabalgarIsLaCarga,
        setPendingTorbellino, setPendingAngelGuardian, setPendingCounterEspejoCard,
        clearAll,
    };
}
