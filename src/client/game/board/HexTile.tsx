import type { HexCoord } from '@shared';
import { axialToPixel, hexPolygonPoints } from './hexMath';

type Props = {
    hex: HexCoord;
    hovered: boolean;
    selected: boolean;
    reachable: boolean;
    onHover: (hex: HexCoord | null) => void;
    onClick: (hex: HexCoord) => void;
};

export function HexTile({
    hex,
    hovered,
    selected,
    reachable,
    onHover,
    onClick,
}: Props) {
    const { x, y } = axialToPixel(hex);
    const points = hexPolygonPoints(x, y);


    const fill = selected
        ? '#2563eb'
        : reachable
            ? '#065f46'
            : hovered
                ? '#374151'
                : '#1f2937';


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

            {reachable && !selected && (
                <polygon
                    points={points}
                    fill="rgba(16, 185, 129, 0.35)"
                    pointerEvents="none"
                />
            )}

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
