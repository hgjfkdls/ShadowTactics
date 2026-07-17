import { useTheme } from '../theme/ThemeContext';
import { getUnitBustUrl } from '../theme/resolveAsset';

const CLASS_FILL: Record<string, string> = {
  archer: 'var(--color-class-archer)',
  infantry: 'var(--color-class-infantry)',
  cavalry: 'var(--color-class-cavalry)',
  lancer: 'var(--color-class-lancer)',
  general: 'var(--color-class-general)',
};

export default function BustIcon({ cls, size }: { cls: string; size: number }) {
  const { theme } = useTheme();
  const imgUrl = getUnitBustUrl(theme.id, cls);

  if (imgUrl) {
    return <img src={imgUrl} alt={cls} width={size} height={size} className="rounded-full" />;
  }

  const fill = CLASS_FILL[cls] ?? 'var(--color-effect-other)';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="4.5" fill={fill} stroke="black" strokeWidth="1.2" />
      <path d="M4 22 C4 14 8 11 12 11 C16 11 20 14 20 22" fill={fill} stroke="black" strokeWidth="1" />
    </svg>
  );
}
