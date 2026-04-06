import { useState } from 'react';
import type { HexCoord, UnitId } from '@shared';

export function useBoardInteraction() {
    const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
    const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<UnitId | null>(null);

    return {
        hoveredHex,
        selectedHex,
        selectedUnitId,
        setHoveredHex,
        setSelectedHex,
        setSelectedUnitId,
    };
}