import type { GameState } from '@shared';
import { l } from '@shared/i18n';
import { IDENTITY_INFO, getIdentityKey } from '../../../../../prep/identityData';
import { identityImgUrl, IDENTITY_CARD_FALLBACK, CARD_BACK_URL } from '../../../../helpers/cards';
import { useLightbox } from '../../../../helpers/Lightbox';

const CLASS_COLORS: Record<string, string> = {
    archer: 'text-class-archer', infantry: 'text-class-infantry', cavalry: 'text-class-cavalry', lancer: 'text-class-lancer', general: 'text-class-general',
};

export default function IdentityDetail({ state, targetPlayerId, myPlayerId }: { state: GameState; targetPlayerId: string; myPlayerId: string }) {
    const { setLightbox, lightboxEl } = useLightbox();
    const identityCardId = state.players[targetPlayerId]?.selectedIdentity;
    if (!identityCardId) return <div className="text-xs text-zinc-500">{l('identity.noIdentity')}</div>;

    const key = getIdentityKey(identityCardId);
    const info = IDENTITY_INFO[key];
    if (!info) return <div className="text-xs text-zinc-500">{l('identity.unknown')}</div>;

    const isMine = targetPlayerId === myPlayerId;
    const unitCount = Object.values(state.units).filter(u => u.owner === targetPlayerId).length;
    const iName = l(`identity.${key}.name`) || info.name;
    const iClass = l(`identity.${key}.className`) || info.className;

    return (
        <div className="space-y-3">
            <div className="flex items-start gap-3">
                <img src={CARD_BACK_URL} alt="" className="w-8 h-[44px] rounded object-cover shrink-0" />
                <div>
                    <div className="text-lg font-bold">{iName}</div>
                    <div className={`text-sm font-semibold ${CLASS_COLORS[identityCardId.includes('robin') || identityCardId.includes('franco') ? 'archer' : 'infantry']}`}>
                        {iClass}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${isMine ? 'text-player1' : 'text-player2'}`}>
                        {isMine ? l('identity.allied') : l('identity.enemy')}
                    </div>
                </div>
            </div>

            <div className="text-xs text-zinc-400">
                {l('identity.units', { count: unitCount })}
            </div>

            <div
                className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden cursor-pointer w-[70%]"
                onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setLightbox(identityImgUrl(key), 'panel', rect);
                }}
            >
                <img src={identityImgUrl(key)} alt="" className="w-full h-auto rounded" onError={e => { if ((e.target as HTMLImageElement).src !== IDENTITY_CARD_FALLBACK) (e.target as HTMLImageElement).src = IDENTITY_CARD_FALLBACK; }} />
            </div>

            {lightboxEl}
        </div>
    );
}
