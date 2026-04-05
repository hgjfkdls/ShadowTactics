import type { GameState } from '@shared';
import { axialToPixel } from './hexMath';

type Props = {
    state: GameState;
};

export function UnitsLayer({ state }: Props) {
    return (
        <>
            {Object.values(state.units).map(unit => {
                const { x, y } = axialToPixel(unit.position);

                return (
                    <g key={unit.id} transform={`translate(${x}, ${y})`}>
                        <circle
                            r={14}
                            fill={unit.owner === 'p1' ? '#22c55e' : '#ef4444'}
                            stroke="#020617"
                            strokeWidth={3}
                        />
                        <text
                            y={4}
                            textAnchor="middle"
                            fontSize={10}
                            fill="black"
                            pointerEvents="none"
                        >
                            {unit.id}
                        </text>
                    </g>
                );
            })}
        </>
    );
}