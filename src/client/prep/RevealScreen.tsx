import { l } from '@shared/i18n';
import { getIdentityKey } from './identityData';

type IdentityCard = {
    name: string;
    className: string;
    desc: string;
};

type Props = {
    myIdentity: IdentityCard;
    opponentIdentity: IdentityCard;
    myCardId?: string;
    opponentCardId?: string;
    onContinue: () => void;
};

export function RevealScreen({ myIdentity, opponentIdentity, myCardId, opponentCardId, onContinue }: Props) {
    const myKey = myCardId ? getIdentityKey(myCardId) : null;
    const oppKey = opponentCardId ? getIdentityKey(opponentCardId) : null;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-2xl font-bold">{l('preparation.identitySelection')}</h2>
            <p className="text-zinc-400 text-sm">{l('preparation.bothSelected')}</p>

            <div className="flex gap-8">
                <IdentityCardView label={l('preparation.you')} identity={myIdentity} identityKey={myKey} color="blue" />
                <IdentityCardView label={l('preparation.opponent')} identity={opponentIdentity} identityKey={oppKey} color="red" />
            </div>

            <button
                onClick={onContinue}
                className="bg-blue-600 hover:bg-blue-500 transition text-white px-8 py-3 rounded-lg text-lg font-semibold cursor-pointer"
            >
                {l('preparation.continueToRoll')}
            </button>
        </div>
    );
}

function IdentityCardView({ label, identity, identityKey, color }: { label: string; identity: IdentityCard; identityKey: string | null; color: string }) {
    const borderColor = color === 'blue' ? 'border-blue-600' : 'border-red-600';
    const bgGlow = color === 'blue' ? 'bg-blue-600/10' : 'bg-red-600/10';
    const iName = identityKey ? (l(`identity.${identityKey}.name`) || identity.name) : identity.name;
    const iClass = identityKey ? (l(`identity.${identityKey}.className`) || identity.className) : identity.className;
    const iDesc = identityKey ? (l(`identity.${identityKey}.desc`) || identity.desc) : identity.desc;

    return (
        <div className={`w-64 ${bgGlow} border-2 ${borderColor} rounded-xl p-5 flex flex-col gap-3`}>
            <div className={`text-xs font-bold uppercase tracking-wide ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                {label}
            </div>
            <div className="text-5xl text-center">🛡️</div>
            <div className="text-center">
                <div className="text-lg font-bold">{iName}</div>
                <div className="text-sm text-zinc-400">{iClass}</div>
            </div>
            <div className="text-sm text-zinc-300 leading-relaxed">
                {iDesc}
            </div>
        </div>
    );
}
