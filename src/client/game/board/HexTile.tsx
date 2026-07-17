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
    enemyDeployable: boolean;
    highlighted: boolean;
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
    enemyDeployable,
    highlighted,
    onHover,
    onClick,
}: Props) {
    const { x, y } = axialToPixel(hex);
    const points = hexPolygonPoints(x, y);


    const fill = selected
        ? 'var(--color-default-bg)'
        : attackable
            ? 'var(--color-attack-bg)'
            : identityTarget
                ? 'var(--color-identity-target-bg)'
                : allyTarget
                    ? 'var(--color-move-bg)'
                    : reachable
                        ? 'var(--color-move-bg)'
                        : hovered
                            ? 'var(--color-hover-bg)'
                            : 'var(--color-default-bg)';

    const stroke = identityTarget ? 'var(--color-identity-target)' : allyTarget ? 'var(--color-available)' : attackable ? 'var(--color-attack)' : 'var(--color-default-stroke)';
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

            {selected && (
                <polygon
                    points={hexPolygonPoints(x, y, 37)}
                    fill="none"
                    stroke="#fde047"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    pointerEvents="none"
                />
            )}

            {reachable && !selected && (
                <polygon
                    points={points}
                    fill="var(--color-available-overlay)"
                    pointerEvents="none"
                />
            )}

            {enemyDeployable && (
                <polygon
                    points={points}
                    fill="var(--color-range-overlay)"
                    pointerEvents="none"
                />
            )}

            {inRange && !reachable && (
                <polygon
                    points={points}
                    fill="var(--color-range-overlay)"
                    pointerEvents="none"
                />
            )}

            {attackable && (
                <polygon
                    points={points}
                    fill="var(--color-attack-overlay)"
                    pointerEvents="none"
                />
            )}

            {identityTarget && (
                <polygon
                    points={points}
                    fill="var(--color-identity-target-overlay)"
                    pointerEvents="none"
                />
            )}

            {allyTarget && (
                <polygon
                    points={points}
                    fill="var(--color-available-overlay)"
                    pointerEvents="none"
                />
            )}

            {highlighted && (
                <polygon points={points} fill="var(--color-history-overlay)" pointerEvents="none" />
            )}

        </>
    );
}
