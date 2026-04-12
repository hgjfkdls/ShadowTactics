import { useGame } from '../GameStateContext';
import { UnitPanel } from './UnitPanel';

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

export function GamePanel() {
    return (
        <>
            <PanelActions />
            <UnitPanel />
        </>
    );
}