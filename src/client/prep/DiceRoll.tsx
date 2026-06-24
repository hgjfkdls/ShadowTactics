import type { GameState, GameAction } from '@shared';
import type { PlayerRole } from '@server/GameRoom';
import { IDENTITY_INFO, getIdentityKey } from './identityData';

type IdentityCard = {
    name: string;
    className: string;
};

type Props = {
    state: GameState;
    sendAction: (action: GameAction) => void;
    playerId: string;
    role: PlayerRole;
    myIdentity: IdentityCard | null;
    opponentIdentity: IdentityCard | null;
};

export function DiceRoll({ state, sendAction, playerId, myIdentity, opponentIdentity }: Props) {
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const myRoll = state.diceRolls[playerId];
    const opponentRoll = state.diceRolls[opponentId];
    const isTie = state.lastTieRoll !== undefined;

    const noTieResolution = myRoll !== undefined && opponentRoll !== undefined && myRoll !== opponentRoll;
    const iAmActive = noTieResolution && state.activePlayer === playerId;
    const iDeployFirst = noTieResolution && state.currentDeployingPlayer === playerId;

    function handleRoll() {
        sendAction({ type: 'ROLL_DICE', playerId });
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-center py-3 border-b border-zinc-700">
                <h2 className="text-2xl font-bold">Tirada de dados</h2>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <p className="text-zinc-400 text-sm">Tira 2d6 para determinar el orden de juego</p>

                    <div className="flex gap-8 items-center">
                        <DiceBox label="Tu tirada" value={myRoll} color="blue" />
                        <div className="text-2xl text-zinc-500">VS</div>
                        <DiceBox label="Oponente" value={opponentRoll} color="red" />
                    </div>

                    {isTie && (
                        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg px-6 py-3 text-yellow-300 text-center space-y-1">
                            <div className="text-xl font-bold">¡Empate!</div>
                            <div>Ambos jugadores sacaron <span className="font-bold text-2xl">{state.lastTieRoll}</span></div>
                            <div className="text-sm text-yellow-400">Volved a tirar</div>
                        </div>
                    )}

                    {noTieResolution && (
                        <div className="bg-zinc-800 border border-zinc-600 rounded-lg px-6 py-4 text-center space-y-1">
                            <div className={iAmActive ? 'text-green-400 font-bold' : 'text-zinc-300'}>
                                {iAmActive ? '✅ Tú eres el jugador activo' : 'El oponente es el jugador activo'}
                            </div>
                            <div className={iDeployFirst ? 'text-green-400 font-bold' : 'text-zinc-300'}>
                                {iDeployFirst ? '✅ Tú despliegas primero' : 'El oponente despliega primero'}
                            </div>
                        </div>
                    )}

                    {myRoll === undefined && (
                        <button
                            onClick={handleRoll}
                            className="bg-blue-600 hover:bg-blue-500 transition text-white px-8 py-3 rounded-lg text-lg font-semibold cursor-pointer"
                        >
                            🎲 {isTie ? 'Tirar de nuevo' : 'Tirar dados'}
                        </button>
                    )}

                    {myRoll !== undefined && opponentRoll === undefined && (
                        <div className="text-zinc-400 text-sm">Esperando tirada del oponente...</div>
                    )}
                </div>

                <aside className="w-56 border-l border-zinc-700 p-4 flex flex-col gap-6">
                    <div className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Identidades</div>
                    <MiniIdentity id={state.players[playerId]?.selectedIdentity} label="Tu identidad" color="blue" />
                    <MiniIdentity id={state.players[playerId === 'p1' ? 'p2' : 'p1']?.selectedIdentity} label="Oponente" color="red" />
                </aside>
            </div>
        </div>
    );
}

function DiceBox({ label, value, color }: { label: string; value: number | undefined; color: string }) {
    const borderColor = color === 'blue' ? 'border-blue-600' : 'border-red-600';
    return (
        <div className={`bg-zinc-800 border-2 ${borderColor} rounded-xl min-w-40 px-5 h-36 flex flex-col items-center justify-center`}>
            <div className="text-sm text-zinc-400 mb-2 text-center">{label}</div>
            {value !== undefined ? (
                <div className="text-5xl font-bold">{value}</div>
            ) : (
                <div className="text-4xl text-zinc-600">?</div>
            )}
        </div>
    );
}

function MiniIdentity({ id, label, color }: { id: string | undefined; label: string; color: string }) {
    const info = id ? getIdentityInfo(id) : null;
    const borderColor = color === 'blue' ? 'border-blue-600' : 'border-red-600';
    return (
        <div className={`bg-zinc-800 border ${borderColor} rounded-lg px-4 py-3 flex flex-col items-center gap-1`}>
            <div className="text-2xl">🛡️</div>
            <div className="text-center">
                <div className="text-xs text-zinc-400">{label}</div>
                <div className="text-sm font-bold">{info?.name ?? '?'}</div>
                <div className="text-xs text-zinc-500">{info?.className ?? ''}</div>
            </div>
        </div>
    );
}

function getIdentityInfo(cardId: string | undefined) {
    if (!cardId) return null;
    const key = getIdentityKey(cardId);
    return IDENTITY_INFO[key] ?? null;
}
