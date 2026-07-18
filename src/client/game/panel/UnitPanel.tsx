import { Unit } from "@shared";
import { useState, useEffect } from "react";
import { useBoard } from "../board/BoadrInteractionContext";
import { useGame } from "../GameStateContext";

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
            <div className='border mx-auto px-3 py-2 bg-zinc-800 rounded-md'>
                {unit ? <>
                    <div className="grid grid-cols-[auto_auto] grid-rows-[auto_auto] flex-row gap-x-2 gap-y-1">
                        <div className='text-base'>{unit.class} [{unit.id} / {unit.owner}]</div>
                        <div className='text-base'>Actions</div>
                        <hr></hr>
                        <hr></hr>
                        <div className='inline-grid grid-cols-[1fr_max-content_20px] gap-y-1 gap-x-2 [&>:nth-child(3n)]:text-center'>
                            <div>HP</div><div>:</div><div>{unit.hp}</div>
                            <div>Attack</div><div>:</div><div>{unit.attack}</div>
                            <div>Range</div><div>:</div><div>{unit.range}</div>
                            <div>Movement Cost</div><div>:</div><div>{unit.movementCost}</div>
                            <div>Difficulty</div><div>:</div><div>{unit.difficulty}</div>
                        </div>
                        <div className="min-w-48 max-w-72">
                            <div className="flex flex-wrap gap-2">
                                <button className="rounded px-2 bg-sky-700 cursor-pointer hover:bg-sky-400 focus:ring">Move</button>
                            </div>
                        </div>
                    </div>
                </> : 'No unit selected'}
            </div>
        </div>
    </>);
}