import { l } from '@shared/i18n';
import { useTheme } from '../theme/ThemeContext';
import { THEMES } from '../theme/themes';

type Props = {
  open: boolean;
  onClose: () => void;
};

const THEME_PREVIEW_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  default:       { bg: '#12122a', accent: '#a78bfa', label: 'bg-purple-400' },
  'bosque-oscuro': { bg: '#0d0a05', accent: '#5a8a4a', label: 'bg-green-600' },
  'dark-water':  { bg: '#0a0e1a', accent: '#3a8aba', label: 'bg-blue-500' },
};

export function ThemeSettingsModal({ open, onClose }: Props) {
  const { theme, setTheme } = useTheme();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl px-8 py-6 shadow-2xl min-w-72 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-base text-zinc-200 font-semibold">{l('themeSettings.title')}</div>

        <div className="flex flex-col gap-2">
          {THEMES.map(t => {
            const preview = THEME_PREVIEW_COLORS[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-left transition cursor-pointer ${
                  theme.id === t.id
                    ? 'bg-zinc-700 ring-2 ring-blue-500'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-md border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: preview.bg }}
                >
                  <div className={`w-full h-1 rounded-t-md ${preview.label}`} />
                </div>
                <span>{l(t.labelKey)}</span>
                {theme.id === t.id && (
                  <span className="ml-auto text-blue-400 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-zinc-500 pt-2 text-center">
          {l('themeSettings.moreSoon')}
        </div>
      </div>
    </div>
  );
}
