import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Animation } from './types';
import { AnimationEngine } from './AnimationEngine';
import { SvgRenderer } from './render/SvgRenderer';

type AnimationContextType = {
  enqueue: (anim: Animation) => void;
  enqueueMultiple: (anims: Animation[]) => void;
  isAnimating: boolean;
  skipAll: () => void;
  setDamageOverlay: (cb: (targetId: string, amount: number, isHeal?: boolean) => void) => void;
  animPositions: Record<string, { q: number; r: number }>;
};

const AnimationCtx = createContext<AnimationContextType | null>(null);

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [animPositions, setAnimPositions] = useState<Record<string, { q: number; r: number }>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const engineRef = useRef<AnimationEngine | null>(null);
  const rendererRef = useRef<SvgRenderer | null>(null);

  useEffect(() => {
    const engine = new AnimationEngine();
    const renderer = new SvgRenderer(() => {});

    renderer.onPositionsChange((pos) => {
      setAnimPositions(pos);
    });

    engine.setRenderer(renderer);
    engine.onQueueEmpty = () => setIsAnimating(false);
    engine.onStart = () => setIsAnimating(true);

    engineRef.current = engine;
    rendererRef.current = renderer;

    return () => {
      engine.clear();
    };
  }, []);

  const setDamageOverlay = useCallback((cb: (targetId: string, amount: number, isHeal?: boolean) => void) => {
    rendererRef.current = new SvgRenderer(cb);
    if (engineRef.current) engineRef.current.setRenderer(rendererRef.current);
    rendererRef.current.onPositionsChange((pos) => setAnimPositions(pos));
  }, []);

  const ctx: AnimationContextType = {
    enqueue: (anim) => engineRef.current?.enqueue(anim),
    enqueueMultiple: (anims) => engineRef.current?.enqueueMultiple(anims),
    isAnimating,
    skipAll: () => engineRef.current?.skipAll(),
    setDamageOverlay,
    animPositions,
  };

  return (
    <AnimationCtx.Provider value={ctx}>
      {children}
    </AnimationCtx.Provider>
  );
}

export function useAnimation(): AnimationContextType {
  const ctx = useContext(AnimationCtx);
  if (!ctx) throw new Error('useAnimation must be inside AnimationProvider');
  return ctx;
}
