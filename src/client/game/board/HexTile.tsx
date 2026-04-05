import type { HexCoord } from '@shared';
import { axialToPixel, hexPolygonPoints } from './hexMath';

type Props = {
    hex: HexCoord;
    hovered: boolean;
    selected: boolean;
    onHover: (hex: HexCoord | null) => void;
    onClick: (hex: HexCoord) => void;
};

export function HexTile({
    hex,
    hovered,
    selected,
    onHover,
    onClick,
}: Props) {
    const { x, y } = axialToPixel(hex);
    const points = hexPolygonPoints(x, y);

    const fill = selected
        ? '#2563eb'    // blue
        : hovered
            ? '#374151'    // gray hover
            : '#1f2937';   // base

    return (
        <>
            <polygon
                points={points}
                fill={fill}
                stroke="#4b5563"
                strokeWidth={2}
                onMouseEnter={() => onHover(hex)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onClick(hex)}
            />
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="#9ca3af"
                pointerEvents="none"
            >
                {hex.q},{hex.r}
            </text>
        </>
    );
}
