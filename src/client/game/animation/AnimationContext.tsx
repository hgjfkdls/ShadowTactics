import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Animation } from './types';
import { AnimationEngine } from './AnimationEngine';
import { SvgRenderer } from './render/SvgRenderer';
import { useSound } from '../sound/SoundContext';
import type { HexCoord } from '@shared';

export type BubbleState = Record<string, { message: string; position?: { q: number; r: number } | null; unitId?: string }>;

export type EffectState = {
  name: string;
  from: HexCoord;
  to: HexCoord;
};

export type FlipCardState = {
  visible: boolean;
  img?: string;
  name: string;
  cardId: string;
  type: 'BUFF' | 'DEBUFF' | 'COUNTER';
  playerId: string;
  targetX: number;
  targetY: number;
};

type AnimationContextType = {
  enqueue: (anim: Animation, layer?: string, replace?: boolean) => void;
  enqueueMultiple: (anims: Animation[], layer?: string, replace?: boolean) => void;
  isAnimating: boolean;
  skipAll: () => void;
  setDamageOverlay: (cb: (targetId: string, amount: number, isHeal?: boolean) => void) => void;
  animPositions: Record<string, { q: number; r: number }>;
  bubble: BubbleState;
  activeEffects: Record<string, EffectState>;
  flipCard: FlipCardState;
};

const AnimationCtx = createContext<AnimationContextType | null>(null);

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const { playKey, playSfx } = useSound();
  const [animPositions, setAnimPositions] = useState<Record<string, { q: number; r: number }>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [bubble, setBubble] = useState<BubbleState>({});
  const [activeEffects, setActiveEffects] = useState<Record<string, EffectState>>({});
  const [flipCard, setFlipCard] = useState<FlipCardState>({ visible: false, name: '', cardId: '', type: 'BUFF', playerId: '', targetX: 0, targetY: 0 });
  const engineRef = useRef<AnimationEngine | null>(null);
  const rendererRef = useRef<SvgRenderer | null>(null);
  const playKeyRef = useRef(playKey);
  const playSfxRef = useRef(playSfx);
  playKeyRef.current = playKey;
  playSfxRef.current = playSfx;

  useEffect(() => {
    const engine = new AnimationEngine();
    const renderer = new SvgRenderer(() => {});

    renderer.onPositionsChange((pos) => {
      setAnimPositions(pos);
    });

    engine.setRenderer(renderer);

    engine.setHandler('fx', {
      onStart: (anim) => {
        if (anim.soundKey && anim.soundLayer !== 'voice') {
          playSfxRef.current(anim.soundKey, { layer: anim.soundLayer ?? 'sfx' });
        }
        if (anim.effect && anim.fromPosition && anim.position) {
          setActiveEffects(prev => ({
            ...prev,
            [anim.id]: { name: anim.effect, from: anim.fromPosition, to: anim.position },
          }));
        }
        if (anim.type === 'flipCard') {
          setFlipCard({
            visible: true,
            img: anim.cardImg,
            name: anim.cardName ?? '',
            cardId: anim.cardId ?? '',
            type: anim.cardType ?? 'BUFF',
            playerId: anim.playerId ?? '',
            targetX: anim.targetX ?? 260,
            targetY: anim.targetY ?? Math.round(window.innerHeight * 0.45),
          });
        }
      },
      onComplete: (anim) => {
        if (anim.effect) {
          setActiveEffects(prev => {
            const next = { ...prev };
            delete next[anim.id];
            return next;
          });
        }
        if (anim.type === 'flipCard') {
          setFlipCard(prev => ({ ...prev, visible: false }));
        }
      },
      onQueueEmpty: () => checkIdle(),
    });

    engine.setHandler('ui', {
      onStart: (anim) => {
        if (anim.soundKey && anim.soundLayer === 'voice') {
          playKeyRef.current(anim.soundKey, { layer: 'voice' });
        }
        if (anim.type === 'speech') {
          setBubble(prev => ({
            ...prev,
            [anim.id]: { message: anim.message ?? '', position: anim.generalPosition ?? null, unitId: anim.unitId },
          }));
        }
      },
      onComplete: (anim) => {
        if (anim.type === 'speech') {
          setBubble(prev => {
            const next = { ...prev };
            delete next[anim.id];
            return next;
          });
        }
      },
      onQueueEmpty: () => checkIdle(),
    });

    engine.setHandler('sfx', {
      onQueueEmpty: () => checkIdle(),
    });

    function checkIdle() {
      if (!engine.isAnimating) setIsAnimating(false);
    }

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
    enqueue: (anim, layer, replace) => engineRef.current?.enqueue(anim, layer, replace),
    enqueueMultiple: (anims, layer, replace) => engineRef.current?.enqueueMultiple(anims, layer, replace),
    isAnimating,
    skipAll: () => engineRef.current?.skipAll(),
    setDamageOverlay,
    animPositions,
    bubble,
    activeEffects,
    flipCard,
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
