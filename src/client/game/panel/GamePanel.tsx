import type { Unit } from '@shared';
import { useEffect, useState } from 'react';
import { useGame } from '../GameStateContext';
import { useBoard } from '../board/BoadrInteractionContext';

export function PanelActions() {
    const { state } = useGame();

    return (<>
        {state
            ? <div className='absolute top-4 right-4 border bg-zinc-800 rounded-md p-2'>
                P1: {state.players.p1.actionPoints}+{state.players.p1.carryOver}<br />
                P2: {state.players.p2.actionPoints}+{state.players.p2.carryOver}
            </div>
            : <>Loading...</>
        }
    </>);
}

export function UnitPanel() {

    const [unit, setUnit] = useState<Unit | null>(null);
    const { selectedUnitId } = useBoard();
    const { state } = useGame();

    useEffect(() => {
        if (!selectedUnitId || !state) return;
        const unit = state.units[selectedUnitId];
        if (!unit) return;
        setUnit(unit);
    }, [selectedUnitId, state]);

    return (<>
        <div className='absolute bottom-10 left-10'>
            <div className='border mx-auto p-2 bg-zinc-800 rounded-md'>
                {unit ? <>
                    <div className='flex flex-col gap-1 p-1 text-xs min-w-36'>
                        <div className='text-base'>{unit.class} [{unit.id} / {unit.owner}]</div>
                        <hr />
                        <div className='inline-grid grid-cols-[1fr_max-content_20px] gap-y-1 gap-x-2 [&>:nth-child(3n)]:text-center'>
                            <div>HP</div><div>:</div><div>{unit.hp}</div>
                            <div>Attack</div><div>:</div><div>{unit.attack}</div>
                            <div>Range</div><div>:</div><div>{unit.range}</div>
                            <div>Movement Cost</div><div>:</div><div>{unit.movementCost}</div>
                            <div>Difficulty</div><div>:</div><div>{unit.difficulty}</div>
                        </div>
                    </div>
                </> : 'No unit selected'}
            </div>
        </div>
    </>);
}

export function GamePanel() {
    return (
        <>
            <PanelActions />
            <UnitPanel />
        </>
    );
}