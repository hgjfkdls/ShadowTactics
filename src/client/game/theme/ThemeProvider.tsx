import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';
import { loadThemeId, saveThemeId, getTheme, THEMES } from './themes';
import type { Theme } from './themes';

function applyThemeToHtml(id: string): void {
  const html = document.documentElement;
  html.classList.remove(...THEMES.map(t => `theme-${t.id}`));
  if (id !== 'default') {
    html.classList.add(`theme-${id}`);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const id = loadThemeId();
    applyThemeToHtml(id);
    return getTheme(id);
  });

  useEffect(() => {
    const id = loadThemeId();
    const t = getTheme(id);
    applyThemeToHtml(id);
    setThemeState(t);
  }, []);

  const setTheme = useCallback((id: string) => {
    saveThemeId(id);
    applyThemeToHtml(id);
    setThemeState(getTheme(id));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
