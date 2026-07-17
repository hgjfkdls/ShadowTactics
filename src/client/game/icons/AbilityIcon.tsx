import { ReactNode } from 'react';
import { ABILITIES } from '@shared/game/data/abilities';

const CLASS_COLORS: Record<string, string> = {
  archer: 'var(--color-class-archer)',
  infantry: 'var(--color-class-infantry)',
  cavalry: 'var(--color-class-cavalry)',
  lancer: 'var(--color-class-lancer)',
  general: 'var(--color-class-general)',
};

function silouette(abilityId: string): ReactNode {
  switch (abilityId) {
    case 'fuego_cobertura':
      return (
        <g fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <path d="M12 3 C10 6 9 9 9 12 C9 15 10 18 12 21" />
          <line x1="9" y1="12" x2="4" y2="8" />
          <line x1="9" y1="13" x2="4" y2="15" />
          <line x1="10" y1="12" x2="20" y2="6" />
          <line x1="10" y1="12" x2="20" y2="10" />
          <line x1="10" y1="12" x2="20" y2="14" />
        </g>
      );
    case 'patada_acrobatica':
      return (
        <g fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <circle cx="12" cy="8" r="3" fill="white" />
          <path d="M10 11 C8 14 6 16 5 19" />
          <path d="M14 11 C16 13 18 14 19 17" />
          <path d="M12 11 C12 15 14 18 16 20" />
          <path d="M6 14 C8 10 10 9 11 11" />
          <path d="M18 14 C16 10 14 9 13 11" />
        </g>
      );
    default:
      return <circle cx="12" cy="12" r="5" fill="white" opacity="0.3" />;
  }
}

function abilityIconUrl(abilityId: string): string | undefined {
  return `/icons/habilidades/${abilityId}.webp`;
}

export function preloadAbilityIcons(): void {
  for (const id of Object.keys(ABILITIES)) {
    const url = abilityIconUrl(id);
    if (url) {
      const img = new Image();
      img.src = url;
    }
  }
}

export default function AbilityIcon({ abilityId, size = 24, cls }: { abilityId: string; size?: number; cls?: string }) {
  const url = abilityIconUrl(abilityId);
  const bg = cls ? (CLASS_COLORS[cls] ?? '#1a1a2e') : '#1a1a2e';

  if (url) {
    return <img src={url} alt={abilityId} width={size} height={size} className="rounded" />;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={bg} stroke="var(--color-gold)" strokeWidth="1.5" />
      {silouette(abilityId)}
    </svg>
  );
}
