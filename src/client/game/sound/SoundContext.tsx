import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import type { SoundEvent, SoundOptions, SoundLayer } from './types';
import type { SoundEngine } from './SoundEngine';

type SoundContextValue = {
  play: (event: SoundEvent, options?: SoundOptions) => void;
  setMasterVolume: (v: number) => void;
  setLayerVolume: (layer: SoundLayer, v: number) => void;
  toggleMute: () => void;
  isMuted: boolean;
  preloadAll: (events: SoundEvent[]) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children, engine }: { children: ReactNode; engine: SoundEngine }) {
  const play = useCallback((event: SoundEvent, options?: SoundOptions) => {
    engine.play(event, options);
  }, [engine]);

  const value = useMemo(() => ({
    play,
    setMasterVolume: engine.setMasterVolume.bind(engine),
    setLayerVolume: engine.setLayerVolume.bind(engine),
    toggleMute: engine.toggleMute.bind(engine),
    isMuted: engine.isMuted,
    preloadAll: engine.preloadAll.bind(engine),
  }), [engine, play]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within a SoundProvider');
  return ctx;
}
