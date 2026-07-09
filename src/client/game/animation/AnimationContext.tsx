import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Animation } from './types';
import { AnimationEngine } from './AnimationEngine';
import { SvgRenderer } from './render/SvgRenderer';
import { ThreeRenderer } from './render/ThreeRenderer';
import type { ThreeRendererEvent } from './render/ThreeRenderer';

type AnimationContextType = {
  enqueue: (anim: Animation) => void;
  enqueueMultiple: (anims: Animation[]) => void;
  isAnimating: boolean;
  skipAll: () => void;
  setDamageOverlay: (cb: (targetId: string, amount: number, isHeal?: boolean) => void) => void;
  animPositions: Record<string, { q: number; r: number }>;
  renderMode: 'svg' | 'three';
  onThreeEvent: (cb: (evt: ThreeRendererEvent) => void) => () => void;
};

const AnimationCtx = createContext<AnimationContextType | null>(null);

type Props = {
  children: React.ReactNode;
  renderMode?: 'svg' | 'three';
};

export function AnimationProvider({ children, renderMode = 'svg' }: Props) {
  const [animPositions, setAnimPositions] = useState<Record<string, { q: number; r: number }>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const engineRef = useRef<AnimationEngine | null>(null);
  const svgRendererRef = useRef<SvgRenderer | null>(null);
  const threeRendererRef = useRef<ThreeRenderer | null>(null);
  const [threeEventListeners, setThreeEventListeners] = useState<Array<(evt: ThreeRendererEvent) => void>>([]);

  useEffect(() => {
    const engine = new AnimationEngine();
    engineRef.current = engine;

    if (renderMode === 'three') {
      const renderer = new ThreeRenderer();
      threeRendererRef.current = renderer;
      renderer.onPositionsChange((pos) => setAnimPositions(pos));
      engine.setRenderer(renderer);
    } else {
      const renderer = new SvgRenderer(() => {});
      svgRendererRef.current = renderer;
      renderer.onPositionsChange((pos) => setAnimPositions(pos));
      engine.setRenderer(renderer);
    }

    engine.onQueueEmpty = () => setIsAnimating(false);
    engine.onStart = () => setIsAnimating(true);

    return () => {
      engine.clear();
    };
  }, [renderMode]);

  useEffect(() => {
    if (!threeRendererRef.current) return;
    const unsubs = threeEventListeners.map(cb => threeRendererRef.current!.onEvent(cb));
    return () => unsubs.forEach(u => u());
  }, [threeEventListeners]);

  const setDamageOverlay = useCallback((cb: (targetId: string, amount: number, isHeal?: boolean) => void) => {
    svgRendererRef.current = new SvgRenderer(cb);
    if (engineRef.current) engineRef.current.setRenderer(svgRendererRef.current);
    svgRendererRef.current.onPositionsChange((pos) => setAnimPositions(pos));
  }, []);

  const onThreeEvent = useCallback((cb: (evt: ThreeRendererEvent) => void): () => void => {
    setThreeEventListeners(prev => [...prev, cb]);
    return () => {
      setThreeEventListeners(prev => prev.filter(l => l !== cb));
    };
  }, []);

  const ctx: AnimationContextType = {
    enqueue: (anim) => engineRef.current?.enqueue(anim),
    enqueueMultiple: (anims) => engineRef.current?.enqueueMultiple(anims),
    isAnimating,
    skipAll: () => engineRef.current?.skipAll(),
    setDamageOverlay,
    animPositions,
    renderMode,
    onThreeEvent,
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
