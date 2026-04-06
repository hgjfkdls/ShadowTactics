import type { GameState, UnitId } from '@shared';
import { axialToPixel } from './hexMath';

type Props = {
    state: GameState;
    selectedUnitId: UnitId | null;
    onSelectUnit: (unitId: UnitId) => void;
};

export function UnitsLayer({
    state,
    selectedUnitId,
    onSelectUnit,
}: Props) {
    return (
        <>
            {Object.values(state.units).map(unit => {
                const { x, y } = axialToPixel(unit.position);
                const selected = unit.id === selectedUnitId;
                return (
                    <g
                        key={unit.id}
                        transform={`translate(${x}, ${y})`}
                        onClick={e => {
                            e.stopPropagation(); // 🔑 no seleccionar hex debajo
                            onSelectUnit(unit.id);
                        }}
                        className="cursor-pointer"
                    >
                        <circle
                            r={14}
                            fill={unit.owner === 'p1' ? '#22c55e' : '#ef4444'}
                            stroke={selected ? '#fde047' : '#020617'}
                            strokeWidth={selected ? 4 : 3}
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