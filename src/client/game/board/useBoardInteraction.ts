import { useState } from 'react';
import type { HexCoord } from '@shared';

export function useBoardInteraction() {
    const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
    const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);

    return {
        hoveredHex,
        selectedHex,
        setHoveredHex,
        setSelectedHex,
    };
}
