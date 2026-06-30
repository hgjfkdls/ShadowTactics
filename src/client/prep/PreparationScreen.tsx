import { useEffect, useRef, useState } from 'react';
import type { GameState, GameAction } from '@shared';
import type { TimerInfo } from '@shared/game/timer';
import type { PlayerRole } from '@server/GameRoom';
import { l } from '@shared/i18n';
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
    timerInfo: TimerInfo | null;
    sendRevealDismiss: () => void;
    sendRollResultDismiss: () => void;
};

function getIdentityInfo(cardId: string | undefined) {
    if (!cardId) return null;
    const key = getIdentityKey(cardId);
    return IDENTITY_INFO[key] ?? null;
}

export function PreparationScreen({ state, sendAction, role, bothPlayersReady, onDone, timerInfo, sendRevealDismiss, sendRollResultDismiss }: Props) {
    const [revealDismissed, setRevealDismissed] = useState(false);
    const [rollResultDismissed, setRollResultDismissed] = useState(false);

    const playerId = role.role === 'player' ? role.playerId : 'p1';
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';

    const bothIdentitiesRevealed = state.players['p1']?.revealedIdentity && state.players['p2']?.revealedIdentity;
    const bothRolled = state.diceRolls['p1'] !== undefined && state.diceRolls['p2'] !== undefined;
    const noTieResolved = bothRolled && state.diceRolls['p1'] !== state.diceRolls['p2'];
    const rollResolved = noTieResolved && state.activePlayer !== undefined;

    const prevGamePhase = useRef(state.gamePhase);
    useEffect(() => {
        if (prevGamePhase.current !== state.gamePhase && state.gamePhase === 'PREPARATION') {
            setRevealDismissed(false);
            setRollResultDismissed(false);
        }
        prevGamePhase.current = state.gamePhase;
    }, [state.gamePhase]);

    // Auto-dismiss roll results when phase moves to DEPLOYMENT
    useEffect(() => {
        if (rollResolved && state.preparationPhase === 'DEPLOYMENT' && !rollResultDismissed) {
            setRollResultDismissed(true);
            onDone();
        }
    }, [state.preparationPhase]);

    // Auto-dismiss reveal screen when timer moves past REVEAL
    useEffect(() => {
        if (bothIdentitiesRevealed && !revealDismissed && timerInfo && timerInfo.phase !== 'REVEAL' && timerInfo.phase !== 'IDENTITY_SELECTION') {
            setRevealDismissed(true);
        }
    }, [timerInfo?.phase]);

    if (role.role !== 'player') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-xl font-bold">{l('ui.preparation')}</div>
                <div className="text-zinc-400">{l('ui.waitingPlayers')}</div>
            </div>
        );
    }

    const myIdentityInfo = getIdentityInfo(state.players[playerId]?.selectedIdentity);
    const opponentIdentityInfo = getIdentityInfo(state.players[opponentId]?.selectedIdentity);

    // Roll results overlay (highest priority)
    if (rollResolved && !rollResultDismissed) {
        return (
            <RollResults
                state={state}
                playerId={playerId}
                onContinue={() => sendRollResultDismiss()}
            />
        );
    }

    // Waiting for opponent after dismissing reveal but before timer expires
    if (bothIdentitiesRevealed && revealDismissed && timerInfo?.phase === 'REVEAL') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-2xl font-bold">{l('ui.identitiesRevealed')}</div>
                <div className="text-zinc-400">{l('ui.waitingOpponent')}</div>
            </div>
        );
    }

    // Identity reveal overlay (after both selected, before roll)
    if (bothIdentitiesRevealed && !revealDismissed && (state.preparationPhase === 'ROLL' || state.preparationPhase === 'ROLL_RESULT' || state.preparationPhase === 'DEPLOYMENT')) {
        if (myIdentityInfo && opponentIdentityInfo) {
            return (
                    <RevealScreen
                        myIdentity={myIdentityInfo}
                        opponentIdentity={opponentIdentityInfo}
                        myCardId={state.players[playerId]?.selectedIdentity}
                        opponentCardId={state.players[opponentId]?.selectedIdentity}
                        onContinue={() => {
                            sendRevealDismiss();
                            setRevealDismissed(true);
                        }}
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
                </div>
            );
        case 'ROLL':
        case 'ROLL_RESULT':
            return (
                <>
                    <DiceRoll
                        state={state}
                        sendAction={sendAction}
                        playerId={playerId}
                        role={role}
                        myIdentity={myIdentityInfo ? { name: myIdentityInfo.name, className: myIdentityInfo.className } : null}
                        opponentIdentity={opponentIdentityInfo ? { name: opponentIdentityInfo.name, className: opponentIdentityInfo.className } : null}
                    />
                    <div className="flex justify-center pb-4">
                        <button
                            onClick={() => sendAction({ type: 'SIMULATE_PREPARATION', playerId })}
                            className="bg-amber-700 hover:bg-amber-600 transition text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                        >
                            {l('ui.simulatePrep')}
                        </button>
                    </div>
                </>
            );
        default:
            return null;
    }
}
