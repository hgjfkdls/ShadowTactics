export type Theme = {
  id: string;
  labelKey: string;
  assetBase: string;
};

export const THEMES: Theme[] = [
  { id: 'default',       labelKey: 'theme.default',       assetBase: 'default' },
  { id: 'bosque-oscuro', labelKey: 'theme.bosqueOscuro',  assetBase: 'bosque-oscuro' },
  { id: 'dark-water',    labelKey: 'theme.darkWater',     assetBase: 'dark-water' },
];

const STORAGE_KEY = 'shadowtactics_theme';

export function loadThemeId(): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || 'default';
  }
  return 'default';
}

export function saveThemeId(id: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
}

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
