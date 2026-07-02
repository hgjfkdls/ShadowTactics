import { useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { HexBoard } from '../game/board/HexBoard';
import { PlayerSidebar } from '../game/layout/PlayerSidebar';
import { RightPanel } from '../game/layout/RightPanel';
import { AlertPanel, useAlerts } from '../game/layout/AlertPanel';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number } | null;

type Props = {
    state: GameState;
    sendAction: (action: GameAction) => void;
    role: PlayerRole;
    selectedInfo: SelectedInfo;
    onInfoSelect: (info: SelectedInfo) => void;
};

export function DeploymentScreen({ state, sendAction, role, selectedInfo, onInfoSelect }: Props) {
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const { alerts, addAlert, removeAlert } = useAlerts();

    if (role.role !== 'player') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-xl font-bold">{l('deploy.title')}</div>
                <div className="text-zinc-400">{l('ui.waitingDeploy')}</div>
            </div>
        );
    }

    const playerId = role.playerId;

    return (
        <div className="grid grid-cols-[240px_1fr_280px] overflow-hidden h-full">
            <PlayerSidebar
                state={state}
                playerId={playerId}
                mode="DEPLOYMENT"
                selectedInfo={selectedInfo}
                onSelectIdentity={pid => onInfoSelect(
                    selectedInfo?.type === 'identity' && selectedInfo.playerId === pid ? null : { type: 'identity', playerId: pid }
                )}
                selectedDeployUnitId={selectedUnitId}
                onSelectDeployUnit={setSelectedUnitId}
                onInfoSelect={onInfoSelect}
            />
            <main className="relative overflow-hidden">
                <HexBoard
                    state={state}
                    sendAction={sendAction}
                    mode="DEPLOYMENT"
                    playerId={playerId}
                    selectedDeployUnitId={selectedUnitId}
                    onInfoSelect={onInfoSelect}
                    addAlert={addAlert}
                />
                <AlertPanel alerts={alerts} removeAlert={removeAlert} />
            </main>
            <RightPanel state={state} playerId={playerId} selectedInfo={selectedInfo} />
        </div>
    );
}
