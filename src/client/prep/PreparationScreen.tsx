import { useEffect, useRef, useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { IdentitySelection } from './IdentitySelection';
import { DiceRoll } from './DiceRoll';
import { RevealScreen } from './RevealScreen';
import { RollResults } from './RollResults';
import { IDENTITY_INFO, getIdentityKey } from './identityData';

type Props = {
    state: GameState;
    sendAction: (action: GameAction) => void;
    role: PlayerRole;
    bothPlayersReady: boolean;
    onDone: () => void;
};

function getIdentityInfo(cardId: string | undefined) {
    if (!cardId) return null;
    const key = getIdentityKey(cardId);
    return IDENTITY_INFO[key] ?? null;
}

export function PreparationScreen({ state, sendAction, role, bothPlayersReady, onDone }: Props) {
    const [revealDismissed, setRevealDismissed] = useState(false);
    const [rollResultDismissed, setRollResultDismissed] = useState(false);

    const prevGamePhase = useRef(state.gamePhase);
    useEffect(() => {
        if (prevGamePhase.current !== state.gamePhase && state.gamePhase === 'PREPARATION') {
            setRevealDismissed(false);
            setRollResultDismissed(false);
        }
        prevGamePhase.current = state.gamePhase;
    }, [state.gamePhase]);

    if (role.role !== 'player') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-xl font-bold">Preparación</div>
                <div className="text-zinc-400">Esperando a que los jugadores se preparen...</div>
            </div>
        );
    }

    const playerId = role.playerId;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';

    const bothIdentitiesRevealed = state.players['p1']?.revealedIdentity && state.players['p2']?.revealedIdentity;
    const bothRolled = state.diceRolls['p1'] !== undefined && state.diceRolls['p2'] !== undefined;
    const noTieResolved = bothRolled && state.diceRolls['p1'] !== state.diceRolls['p2'];
    const rollResolved = noTieResolved && state.activePlayer !== undefined;

    const myIdentityInfo = getIdentityInfo(state.players[playerId]?.selectedIdentity);
    const opponentIdentityInfo = getIdentityInfo(state.players[opponentId]?.selectedIdentity);

    // Roll results overlay (highest priority — shows even if phase is already DEPLOYMENT)
    if (rollResolved && !rollResultDismissed) {
        return (
            <RollResults
                state={state}
                playerId={playerId}
                onContinue={() => {
                    setRollResultDismissed(true);
                    onDone();
                }}
            />
        );
    }

    // Identity reveal overlay (after both selected, before roll)
    if (bothIdentitiesRevealed && !revealDismissed && (state.preparationPhase === 'ROLL' || state.preparationPhase === 'DEPLOYMENT')) {
        if (myIdentityInfo && opponentIdentityInfo) {
            return (
                <RevealScreen
                    myIdentity={myIdentityInfo}
                    opponentIdentity={opponentIdentityInfo}
                    onContinue={() => setRevealDismissed(true)}
                />
            );
        }
    }

    switch (state.preparationPhase) {
        case 'IDENTITY_SELECTION':
            return (
                <div className="flex flex-col h-full">
                    <IdentitySelection
                        state={state}
                        sendAction={sendAction}
                        playerId={playerId}
                        role={role}
                        bothPlayersReady={bothPlayersReady}
                    />
                    <div className="flex justify-center pb-4">
                        <button
                            onClick={() => sendAction({ type: 'SIMULATE_PREPARATION', playerId })}
                            className="bg-amber-700 hover:bg-amber-600 transition text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                        >
                            ⚡ Simular preparación y despliegue
                        </button>
                    </div>
                </div>
            );
        case 'ROLL':
            return (
                <DiceRoll
                    state={state}
                    sendAction={sendAction}
                    playerId={playerId}
                    role={role}
                    myIdentity={myIdentityInfo ? { name: myIdentityInfo.name, className: myIdentityInfo.className } : null}
                    opponentIdentity={opponentIdentityInfo ? { name: opponentIdentityInfo.name, className: opponentIdentityInfo.className } : null}
                />
            );
        default:
            return null;
    }
}
