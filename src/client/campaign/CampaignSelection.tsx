import { useState } from 'react';
import { useLightbox } from '../game/helpers/Lightbox';
import { identityImgUrl, IDENTITY_CARD_FALLBACK } from '../game/helpers/cards';
import { IDENTITY_INFO } from '../prep/identityData';
import { l } from '@shared/i18n';
import {
  CampaignProgress,
  loadCampaignProgress,
  getCampaignStage,
  startCampaign,
  saveCampaignProgress,
} from './campaignConfig';

const IDENTITY_KEYS = Object.keys(IDENTITY_INFO);

type Props = {
  onSelectIdentity: (identityKey: string) => void;
  onBack: () => void;
};

export function CampaignSelection({ onSelectIdentity, onBack }: Props) {
  const [progress, setProgress] = useState<CampaignProgress>(loadCampaignProgress);
  const { setLightbox, lightboxEl } = useLightbox();

  function handleContinue(key: string) {
    const updated = startCampaign(progress, key);
    setProgress(updated);
    saveCampaignProgress(updated);
    onSelectIdentity(key);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-700">
        <button
          onClick={onBack}
          className="bg-zinc-700 hover:bg-zinc-600 transition text-white px-3 py-1.5 rounded-md text-sm cursor-pointer"
        >
          ← {l('campaign.back')}
        </button>
        <h1 className="text-2xl font-bold">{l('campaign.title') || 'Campañas'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-zinc-400 text-sm mb-6 text-center">
          {l('campaign.selectCharacter') || 'Selecciona un personaje para ver su historia y jugar su campaña'}
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {IDENTITY_KEYS.map(key => {
            const info = IDENTITY_INFO[key];
            const name = l(`identity.${key}.name`) || info.name;
            const className = l(`identity.${key}.className`) || info.className;
            const stage = getCampaignStage(progress, key);
            const started = stage > 0;

            return (
              <button
                key={key}
                onClick={() => handleContinue(key)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-zinc-700 bg-zinc-800 hover:border-yellow-500 hover:bg-zinc-700 transition cursor-pointer relative"
              >
                <img
                  src={identityImgUrl(key)}
                  alt={name}
                  className="w-full aspect-[3/4] object-contain"
                  onError={e => {
                    if ((e.target as HTMLImageElement).src !== IDENTITY_CARD_FALLBACK)
                      (e.target as HTMLImageElement).src = IDENTITY_CARD_FALLBACK;
                  }}
                />
                <div className="text-sm font-bold text-center leading-tight">{name}</div>
                <div className="text-xs text-zinc-400">{className}</div>
                {started && (
                  <div className="absolute top-1 right-1 bg-yellow-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {stage}/5
                  </div>
                )}
                {!started && (
                  <div className="text-xs text-zinc-500 mt-1">{l('campaign.notStarted') || 'No iniciada'}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {lightboxEl}
    </div>
  );
}
