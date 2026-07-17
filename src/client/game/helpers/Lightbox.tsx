import { useState } from 'react';
import { createPortal } from 'react-dom';

export function useLightbox() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const lightboxEl = lightbox ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      onClick={() => setLightbox(null)}
    >
      <img src={lightbox} alt="" className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg" />
    </div>,
    document.body
  ) : null;

  return { lightbox, setLightbox, lightboxEl };
}
