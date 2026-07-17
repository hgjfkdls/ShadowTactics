import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { SoundEvent, SoundOptions, SoundLayer } from './types';
import type { SoundEngine } from './SoundEngine';

type SoundContextValue = {
  play: (event: SoundEvent, options?: SoundOptions) => void;
  playKey: (key: string, options?: SoundOptions) => void;
  playSfx: (key: string, options?: SoundOptions) => void;
  setMasterVolume: (v: number) => void;
  getMasterVolume: () => number;
  setLayerVolume: (layer: SoundLayer, v: number) => void;
  getLayerVolume: (layer: SoundLayer) => number;
  toggleMute: () => void;
  isMuted: boolean;
  preloadAll: (events: SoundEvent[]) => void;
  preloadKeys: (keys: string[]) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children, engine }: { children: ReactNode; engine: SoundEngine }) {
  const [isMuted, setIsMuted] = useState(engine.isMuted);

  const play = useCallback((event: SoundEvent, options?: SoundOptions) => {
    engine.play(event, options);
  }, [engine]);

  const playKey = useCallback((key: string, options?: SoundOptions) => {
    engine.playKey(key, options);
  }, [engine]);

  const playSfx = useCallback((key: string, options?: SoundOptions) => {
    engine.playSfx(key, options);
  }, [engine]);

  const toggleMute = useCallback(() => {
    engine.toggleMute();
    setIsMuted(engine.isMuted);
  }, [engine]);

  const value = useMemo(() => ({
    play,
    playKey,
    playSfx,
    setMasterVolume: engine.setMasterVolume.bind(engine),
    getMasterVolume: engine.getMasterVolume.bind(engine),
    setLayerVolume: engine.setLayerVolume.bind(engine),
    getLayerVolume: engine.getLayerVolume.bind(engine),
    toggleMute,
    isMuted,
    preloadAll: engine.preloadAll.bind(engine),
    preloadKeys: async (keys: string[]) => {
      const { getVoiceUrl } = await import('./assets');
      await Promise.all(keys.map(k => engine['renderer'].load(getVoiceUrl(k))));
    },
  }), [engine, play, playKey, playSfx, toggleMute, isMuted]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within a SoundProvider');
  return ctx;
}
