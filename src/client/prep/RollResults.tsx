import { useState } from 'react';
import { IDENTITY_INFO, getIdentityKey } from './identityData';
import { l } from '@shared/i18n';

type Props = {
    state: import('@shared').GameState;
    playerId: string;
    onContinue: () => void;
};

export function RollResults({ state, playerId, onContinue }: Props) {
    const [dismissSent, setDismissSent] = useState(false);
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const myRoll = state.diceRolls[playerId]!;
    const opponentRoll = state.diceRolls[opponentId]!;
    const iAmActive = state.activePlayer === playerId;
    const iDeployFirst = state.currentDeployingPlayer === playerId;

    const myCardId = state.players[playerId]?.selectedIdentity;
    const oppCardId = state.players[opponentId]?.selectedIdentity;
    const myKey = myCardId ? getIdentityKey(myCardId) : null;
    const oppKey = oppCardId ? getIdentityKey(oppCardId) : null;
    const myName = myKey ? (l(`identity.${myKey}.name`) || IDENTITY_INFO[myKey]?.name) : '?';
    const oppName = oppKey ? (l(`identity.${oppKey}.name`) || IDENTITY_INFO[oppKey]?.name) : '?';

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <h2 className="text-2xl font-bold">{l('deploy.roll.title')}</h2>

            <div className="flex gap-8 items-center">
                <DiceBox label={`${l('preparation.you')} (${myName})`} value={myRoll} color="blue" />
                <div className="text-2xl text-zinc-500">VS</div>
                <DiceBox label={`${l('preparation.opponent')} (${oppName})`} value={opponentRoll} color="red" />
            </div>

            <div className="bg-zinc-800 border border-zinc-600 rounded-lg px-8 py-5 text-center space-y-2">
                <div className={iAmActive ? 'text-green-400 font-bold text-lg' : 'text-zinc-300 text-lg'}>
                    {iAmActive ? `✅ ${l('deploy.roll.youAreActive')}` : `🔴 ${l('deploy.roll.opponentIsActive')}`}
                </div>
                <div className={iDeployFirst ? 'text-green-400 font-bold text-lg' : 'text-zinc-300 text-lg'}>
                    {iDeployFirst ? `✅ ${l('deploy.roll.youDeployFirst')}` : `🔴 ${l('deploy.roll.opponentDeployFirst')}`}
                </div>
            </div>

            <div className="flex gap-6 mt-2">
                <MiniIdentity id={myCardId} label={l('deploy.roll.yourIdentity')} color="blue" />
                <MiniIdentity id={oppCardId} label={l('deploy.roll.opponent')} color="red" />
            </div>

            {dismissSent ? (
                <div className="text-zinc-400 text-lg">{l('ui.waitingOpponent')}</div>
            ) : (
                <button
                    onClick={() => { setDismissSent(true); onContinue(); }}
                    className="bg-blue-600 hover:bg-blue-500 transition text-white px-8 py-3 rounded-lg text-lg font-semibold cursor-pointer"
                >
                    {l('preparation.continueToDeploy')}
                </button>
            )}
        </div>
    );
}

function DiceBox({ label, value, color }: { label: string; value: number; color: string }) {
    const borderColor = color === 'blue' ? 'border-blue-600' : 'border-red-600';
    return (
        <div className={`bg-zinc-800 border-2 ${borderColor} rounded-xl w-48 px-6 h-44 flex flex-col items-center justify-center`}>
            <div className="text-sm text-zinc-400 mb-2 text-center leading-tight">{label}</div>
            <div className="text-5xl font-bold">{value}</div>
        </div>
    );
}

function MiniIdentity({ id, label, color }: { id: string | undefined; label: string; color: string }) {
    const info = id ? getIdentityInfo(id) : null;
    const key = id ? getIdentityKey(id) : null;
    const borderColor = color === 'blue' ? 'border-blue-600' : 'border-red-600';
    const iName = key ? (l(`identity.${key}.name`) || info?.name) : (info?.name ?? '?');
    const iClass = key ? (l(`identity.${key}.className`) || info?.className) : (info?.className ?? '');
    return (
        <div className={`bg-zinc-800 border ${borderColor} rounded-lg px-5 py-3 flex flex-col items-center gap-1 w-36`}>
            <div className="text-2xl">🛡️</div>
            <div className="text-center">
                <div className="text-xs text-zinc-400">{label}</div>
                <div className="text-sm font-bold">{iName}</div>
                <div className="text-xs text-zinc-500">{iClass}</div>
            </div>
        </div>
    );
}

function getIdentityInfo(cardId: string | undefined) {
    if (!cardId) return null;
    const key = getIdentityKey(cardId);
    return IDENTITY_INFO[key] ?? null;
}
