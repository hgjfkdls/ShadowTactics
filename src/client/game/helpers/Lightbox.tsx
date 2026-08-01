import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type LightboxSourceType = 'flipcard' | 'panel';

export type LightboxAction = { label: string; onClick: () => void };

export type LightboxState = {
  src: string;
  fromType: LightboxSourceType;
  fromRect: DOMRect;
  toRect?: DOMRect;
  action?: LightboxAction;
} | null;

type Phase = 'entering' | 'showing' | 'exiting' | null;

export function useLightbox() {
  const [state, setState] = useState<LightboxState>(null);
  const [phase, setPhase] = useState<Phase>(null);
  const actionRef = useRef<LightboxAction | null>(null);

  const open = useCallback((src: string, fromType: LightboxSourceType, fromRect: DOMRect, toRect?: DOMRect, action?: LightboxAction) => {
    actionRef.current = action ?? null;
    setState({ src, fromType, fromRect, toRect, action });
    setPhase('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('showing'));
    });
  }, []);

  const close = useCallback(() => {
    actionRef.current = null;
    if (state?.fromType === 'flipcard') {
      setState(null);
      setPhase(null);
      return;
    }
    setPhase('exiting');
    const timer = setTimeout(() => {
      setState(null);
      setPhase(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [state?.fromType]);

  useEffect(() => {
    if (phase === 'exiting' || state === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, state, close]);

  const exitRect = phase === 'exiting' ? (state?.toRect ?? state?.fromRect) : state?.fromRect;

  const lightboxEl = state && phase ? createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: phase === 'entering' ? 'none' : 'auto',
      }}
    >
      {/* Overlay background */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          opacity: phase === 'exiting' ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
        onClick={close}
      />

      {/* Card container */}
      <div
        style={{
          position: 'fixed',
          width: phase === 'showing' ? 'min(56vw, 448px)' : (exitRect?.width ?? 80),
          height: phase === 'showing' ? 'min(78.4vw, 627px)' : (exitRect?.height ?? 112),
          left: phase === 'showing'
            ? '50%'
            : (exitRect?.left ?? 0) + (exitRect?.width ?? 80) / 2,
          top: phase === 'showing'
            ? '50%'
            : (exitRect?.top ?? 0) + (exitRect?.height ?? 112) / 2,
          transform: 'translate(-50%, -50%)',
          transition: phase === 'entering'
            ? 'none'
            : 'all 0.35s ease-out',
        }}
      >
        {/* Card image */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundImage: `url(${state.src})`,
          }}
        />

        {/* Action button */}
        {phase === 'showing' && state.action && (
          <button
            onClick={(e) => { e.stopPropagation(); state.action!.onClick(); close(); }}
            style={{
              position: 'absolute', bottom: -48, left: '50%', transform: 'translateX(-50%)',
              padding: '8px 24px',
              background: '#2563eb', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              color: 'white', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            className="hover:bg-blue-500 transition"
          >
            {state.action.label}
          </button>
        )}

        {/* Close button inside card */}
        {phase === 'showing' && (
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 24, height: 24, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
              color: 'white', fontSize: 14, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return {
    lightbox: state?.src ?? null,
    setLightbox: open,
    closeLightbox: close,
    lightboxEl,
  };
}
