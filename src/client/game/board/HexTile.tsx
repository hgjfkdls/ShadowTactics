import type { HexCoord } from '@shared';
import { axialToPixel, hexPolygonPoints } from './hexMath';

type Props = {
    hex: HexCoord;
    hovered: boolean;
    selected: boolean;
    reachable: boolean;
    attackable: boolean;
    inRange: boolean;
    onHover: (hex: HexCoord | null) => void;
    onClick: (hex: HexCoord) => void;
};

export function HexTile({
    hex,
    hovered,
    selected,
    reachable,
    attackable,
    inRange,
    onHover,
    onClick,
}: Props) {
    const { x, y } = axialToPixel(hex);
    const points = hexPolygonPoints(x, y);


    const fill = selected
        ? '#2563eb'
        : attackable
            ? '#7f1d1d'
            : reachable
                ? '#065f46'
                : inRange
                    ? '#4b5563'
                    : hovered
                        ? '#374151'
                        : '#1f2937';


    return (
        <>
            <polygon
                points={points}
                fill={fill}
                stroke={attackable ? '#ef4444' : '#4b5563'}
                strokeWidth={attackable ? 2.5 : 2}
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

            {inRange && !reachable && !attackable && (
                <polygon
                    points={points}
                    fill="rgba(156, 163, 175, 0.2)"
                    pointerEvents="none"
                />
            )}

            {attackable && (
                <polygon
                    points={points}
                    fill="rgba(239, 68, 68, 0.3)"
                    pointerEvents="none"
                />
            )}


        </>
    );
}
