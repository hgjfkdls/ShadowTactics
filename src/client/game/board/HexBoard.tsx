import { generateHexMap } from '@shared';
import { HexTile } from './HexTile';
import { UnitsLayer } from './UnitsLayer';
import { useBoardInteraction } from './useBoardInteraction';
import { useViewport } from '../useViewport';

type Props = {
    radius: number;
    state: any;
};

export function HexBoard({ radius, state }: Props) {
    const hexes = generateHexMap({ radius });
    const {
        hoveredHex,
        selectedHex,
        setHoveredHex,
        setSelectedHex,
    } = useBoardInteraction();

    const { scale, x, y, zoom, pan } = useViewport();

    return (
        <svg
            className="absolute inset-0 w-full h-full bg-zinc-950"
            viewBox="-400 -400 800 800"
            onWheel={e => zoom(-e.deltaY * 0.001)}
            onMouseMove={e => {
                if (e.buttons === 1) pan(e.movementX, e.movementY);
            }}
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
                        selected={
                            selectedHex?.q === hex.q &&
                            selectedHex?.r === hex.r
                        }
                        onHover={setHoveredHex}
                        onClick={setSelectedHex}
                    />
                ))}

                {state && <UnitsLayer state={state} />}
            </g>
        </svg>
    );
}