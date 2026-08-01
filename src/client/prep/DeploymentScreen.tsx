import { useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { HexBoard } from '../game/board/Board';
import { RightPanel } from '../game/layout/RightPanel';
import { BottomPanel } from '../game/layout/BottomPanel';
import { AlertPanel, useAlerts } from '../game/layout/AlertPanel';

type SelectedInfo = { type: 'identity'; playerId: string } | { type: 'unit'; unitId: string } | { type: 'card'; cardId: string; fromRect?: DOMRect; _ck?: number; isReclick?: boolean } | { type: 'effect'; stat: string; label: string; description: string; source?: string; sourceName?: string; value?: number } | null;

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
        const playerId = 'p1';
        return (
            <div className="absolute inset-0">
                <main className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="text-xl font-bold">{l('deploy.title')}</div>
                        <div className="text-zinc-400">{l('ui.waitingDeploy')}</div>
                    </div>
                </main>
                <BottomPanel state={state} playerId={playerId} selectedUnitId={null} canAct={false} sendAction={sendAction} mode="DEPLOYMENT" selectedDeployUnitId={null} />
            </div>
        );
    }

    const playerId = role.playerId;

    return (
        <div className="absolute inset-0">
            <main className="absolute inset-0">
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
            <BottomPanel
                state={state}
                playerId={playerId}
                selectedUnitId={null}
                canAct={false}
                mode="DEPLOYMENT"
                sendAction={sendAction}
                onSelectDeployUnit={setSelectedUnitId}
                selectedDeployUnitId={selectedUnitId}
            />
        </div>
    );
}
