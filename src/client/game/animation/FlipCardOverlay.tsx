import { useEffect, useState, useRef } from 'react';
import { useAnimation } from './AnimationContext';
import { getLocale } from '@shared/i18n';
import { useLightbox } from '../helpers/Lightbox';

const TYPE_COLORS: Record<string, string> = {
  BUFF: '#059669',
  DEBUFF: '#dc2626',
  COUNTER: '#7c3aed',
};

function getCardKey(cardId: string): string {
  return cardId.replace(/_\d+$/, '');
}

function cardImgUrl(cardId: string, locale?: string): string {
  const loc = locale ?? getLocale() ?? 'es';
  return `/cards/${loc}/${getCardKey(cardId)}.png`;
}

export function FlipCardOverlay() {
  const { flipCard } = useAnimation();
  const [animating, setAnimating] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [frontImg, setFrontImg] = useState<string | null>(null);
  const [backImg, setBackImg] = useState<string | null>(null);
  const { setLightbox, lightboxEl, lightbox } = useLightbox();
  const visibleRef = useRef(false);
  const consumedRef = useRef(false);

  useEffect(() => {
    if (flipCard.visible && !visibleRef.current) {
      consumedRef.current = false;
      visibleRef.current = true;
      setAnimating(false);
      setFlipped(false);
      setFrontImg(null);
      setBackImg(null);

      const locale = getLocale() || 'es';

      // Preload back image
      const backLocaleUrl = `/cards/${locale}/reverso.webp`;
      const backEsUrl = '/cards/es/reverso.webp';
      const backImgEl = new Image();
      backImgEl.onload = () => setBackImg(backLocaleUrl);
      backImgEl.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => setBackImg(backEsUrl);
        fallback.src = backEsUrl;
      };
      backImgEl.src = backLocaleUrl;

      // Preload front image
      const key = getCardKey(flipCard.cardId);
      const frontLocaleUrl = `/cards/${locale}/${key}.webp`;
      const frontEsUrl = `/cards/es/${key}.webp`;
      const frontImgEl = new Image();
      frontImgEl.onload = () => setFrontImg(frontLocaleUrl);
      frontImgEl.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => setFrontImg(frontEsUrl);
        fallback.src = frontEsUrl;
      };
      frontImgEl.src = frontLocaleUrl;

      const frame = requestAnimationFrame(() => {
        setAnimating(true);
        const flipTimer = setTimeout(() => setFlipped(true), 80);
        return () => clearTimeout(flipTimer);
      });

      return () => {
        cancelAnimationFrame(frame);
        backImgEl.onload = null; backImgEl.onerror = null;
        frontImgEl.onload = null; frontImgEl.onerror = null;
      };
    }
    if (!flipCard.visible) {
      visibleRef.current = false;
    }
  }, [flipCard.visible, flipCard.cardId]);

  if (!flipCard.visible && !lightbox && !consumedRef.current) return null;

  const startX = 240;
  const startY = flipCard.playerId === 'p1' ? window.innerHeight * 0.15 : window.innerHeight * 0.65;
  const endX = flipCard.targetX;
  const endY = flipCard.targetY;

  return (
    <>
      {flipCard.visible && !lightbox && !consumedRef.current && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
          <div
            style={{
              position: 'fixed',
              left: animating ? endX : startX,
              top: animating ? endY : startY,
              width: 80,
              height: 112,
              transition: animating ? 'left 0.7s ease-out, top 0.7s ease-out, transform 0.6s ease-out' : 'none',
              transform: `scale(${animating ? 3.5 : 0.8}) ${flipped ? 'rotateY(180deg)' : ''}`,
              transformStyle: 'preserve-3d',
              perspective: 600,
              pointerEvents: flipped ? 'auto' : 'none',
              cursor: flipped ? 'pointer' : undefined,
            }}
            onClick={(e) => { if (flipped && frontImg) { consumedRef.current = true; setLightbox(frontImg, 'flipcard', (e.currentTarget as HTMLElement).getBoundingClientRect()); } }}
          >
            {/* Back face */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                borderRadius: 8,
                background: '#374151',
                backgroundImage: backImg ? `url(${backImg})` : undefined,
                backgroundSize: 'cover',
                border: '2px solid #6b7280',
              }}
            />

            {/* Front face */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                borderRadius: 8,
                transform: 'rotateY(180deg)',
                background: TYPE_COLORS[flipCard.type] ?? '#4b5563',
                backgroundImage: frontImg ? `url(${frontImg})` : undefined,
                backgroundSize: 'cover',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            />
          </div>
        </div>
      )}

      {lightboxEl}
    </>
  );
}
