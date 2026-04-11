import { generateHexMap } from '@shared';
import { HexTile } from './HexTile';
import { UnitsLayer } from './UnitsLayer';
import { useBoardInteraction } from './useBoardInteraction';
import { useViewport } from './useViewport';
import { getMoveRange } from './movementRange';
import type { GameAction, GameState, HexCoord } from '@shared';
import { PlayerRole } from '@server/GameRoom';

type Props = {
    state: GameState;
    role: PlayerRole | null;
    sendAction: (action: any) => void;
};

export function HexBoard({ state, role, sendAction }: Props) {
    const hexes = generateHexMap(state.map);
    const {
        hoveredHex,
        selectedHex,
        selectedUnitId,
        setHoveredHex,
        setSelectedHex,
        setSelectedUnitId,
    } = useBoardInteraction();

    const { scale, x, y, zoom, pan } = useViewport();

    const myPlayerId = role ? (role.role === "player" ? role.playerId : '') : '';
    const isMyTurn = state.activePlayer === myPlayerId;

    const moveRange = selectedUnitId
        ? getMoveRange(state, selectedUnitId)
        : [];

    function isReachable(hex: HexCoord) {
        return moveRange.some(h => h.q === hex.q && h.r === hex.r);
    }

    function onHexClick(hex: HexCoord) {
        if (!isMyTurn) return;
        setSelectedHex(hex);

        if (selectedUnitId && isReachable(hex)) {
            const action: GameAction = {
                type: 'MOVE_UNIT',
                playerId: myPlayerId,
                unitId: selectedUnitId,
                to: hex,
            };
            sendAction(action);
        }
    }

    return (
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

                        reachable={isReachable(hex)}
                        onHover={setHoveredHex}
                        onClick={onHexClick}
                    />
                ))}

                <UnitsLayer
                    state={state}
                    selectedUnitId={selectedUnitId}
                    onSelectUnit={unitId => {
                        if (!isMyTurn) return;
                        setSelectedUnitId(unitId);
                    }}
                />

            </g>
        </svg>
    );
}