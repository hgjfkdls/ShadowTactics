type IdentityCard = {
    name: string;
    className: string;
    desc: string;
};

type Props = {
    myIdentity: IdentityCard;
    opponentIdentity: IdentityCard;
    onContinue: () => void;
};

export function RevealScreen({ myIdentity, opponentIdentity, onContinue }: Props) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-2xl font-bold">Identidades reveladas</h2>
            <p className="text-zinc-400 text-sm">Ambos jugadores han seleccionado su identidad</p>

            <div className="flex gap-8">
                <IdentityCardView label="Tú" identity={myIdentity} color="blue" />
                <IdentityCardView label="Oponente" identity={opponentIdentity} color="red" />
            </div>

            <button
                onClick={onContinue}
                className="bg-blue-600 hover:bg-blue-500 transition text-white px-8 py-3 rounded-lg text-lg font-semibold cursor-pointer"
            >
                Continuar a la tirada
            </button>
        </div>
    );
}

function IdentityCardView({ label, identity, color }: { label: string; identity: IdentityCard; color: string }) {
    const borderColor = color === 'blue' ? 'border-blue-600' : 'border-red-600';
    const bgGlow = color === 'blue' ? 'bg-blue-600/10' : 'bg-red-600/10';
    return (
        <div className={`w-64 ${bgGlow} border-2 ${borderColor} rounded-xl p-5 flex flex-col gap-3`}>
            <div className={`text-xs font-bold uppercase tracking-wide ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                {label}
            </div>
            <div className="text-5xl text-center">🛡️</div>
            <div className="text-center">
                <div className="text-lg font-bold">{identity.name}</div>
                <div className="text-sm text-zinc-400">{identity.className}</div>
            </div>
            <div className="text-sm text-zinc-300 leading-relaxed">
                {identity.desc}
            </div>
        </div>
    );
}
