import type { HexCoord } from '@shared';
import { axialToPixel, hexPolygonPoints } from './hexMath';

type Props = {
    hex: HexCoord;
    hovered: boolean;
    selected: boolean;
    reachable: boolean;
    attackable: boolean;
    identityTarget: boolean;
    allyTarget: boolean;
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
    identityTarget,
    allyTarget,
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
            : identityTarget
                ? '#5b1280'
                : allyTarget
                    ? '#0f766e'
                    : reachable
                        ? '#065f46'
                        : hovered
                            ? '#374151'
                            : '#1f2937';

    const stroke = identityTarget ? '#a855f7' : allyTarget ? '#14b8a6' : attackable ? '#ef4444' : '#4b5563';
    const strokeW = identityTarget || allyTarget || attackable ? 2.5 : 2;


    return (
        <>
            <polygon
                points={points}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeW}
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
                    fill="rgba(59, 130, 246, 0.12)"
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

            {identityTarget && (
                <polygon
                    points={points}
                    fill="rgba(168, 85, 247, 0.25)"
                    pointerEvents="none"
                />
            )}

            {allyTarget && (
                <polygon
                    points={points}
                    fill="rgba(20, 184, 166, 0.25)"
                    pointerEvents="none"
                />
            )}

        </>
    );
}
