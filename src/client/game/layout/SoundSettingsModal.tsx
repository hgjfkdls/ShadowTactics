import { useState, useEffect } from 'react';
import { l } from '@shared/i18n';
import { useSound } from '../sound/SoundContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SoundSettingsModal({ open, onClose }: Props) {
  const { isMuted, toggleMute, setLayerVolume, getLayerVolume } = useSound();
  const [voiceVol, setVoiceVol] = useState(() => getLayerVolume('voice'));
  const [sfxVol, setSfxVol] = useState(() => getLayerVolume('sfx'));

  useEffect(() => {
    if (open) {
      setVoiceVol(getLayerVolume('voice'));
      setSfxVol(getLayerVolume('sfx'));
    }
  }, [open]);

  function handleVoiceVol(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVoiceVol(v);
    setLayerVolume('voice', v);
  }

  function handleSfxVol(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setSfxVol(v);
    setLayerVolume('sfx', v);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl px-8 py-6 shadow-2xl min-w-72 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-base text-zinc-200 font-semibold">{l('soundSettings.title')}</div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-300">{l('soundSettings.mute')}</span>
          <button
            onClick={toggleMute}
            className={`px-4 py-1 rounded-md text-sm font-semibold cursor-pointer transition ${isMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-green-700 hover:bg-green-600'}`}
          >
            {isMuted ? l('soundSettings.muted') : l('soundSettings.unmuted')}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-300">{l('soundSettings.voiceVol')}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={voiceVol}
            onChange={handleVoiceVol}
            className="w-28 cursor-pointer"
          />
          <span className="text-xs text-zinc-400 w-8 text-right">{Math.round(voiceVol * 100)}%</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-300">{l('soundSettings.sfxVol')}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfxVol}
            onChange={handleSfxVol}
            className="w-28 cursor-pointer"
          />
          <span className="text-xs text-zinc-400 w-8 text-right">{Math.round(sfxVol * 100)}%</span>
        </div>

        <div className="text-xs text-zinc-500 pt-2 text-center">
          {l('soundSettings.musicSoon')}
        </div>
      </div>
    </div>
  );
}
