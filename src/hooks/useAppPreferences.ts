import { useEffect, useState } from 'react';
import { readAnimePalette, type AnimePalette } from '../design-system/animeTheme';
import type { Theme } from '../types';

function readPreference(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Penyimpanan preferensi bersifat opsional.
  }
}

export function useAppPreferences() {
  const [username, setUsername] = useState(() => readPreference('dc-username', 'waifujahat'));

  const [theme, setTheme] = useState<Theme>(() =>
    readPreference('dc-theme', 'dark') === 'light' ? 'light' : 'dark',
  );

  const [palette, setPalette] = useState<AnimePalette>(() =>
    readAnimePalette(readPreference('wd-palette', 'classic')),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    savePreference('dc-theme', theme);
  }, [theme]);

  useEffect(() => {
    savePreference('dc-username', username);
  }, [username]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    savePreference('wd-palette', palette);
  }, [palette]);

  return {
    username,
    setUsername,
    theme,
    setTheme,
    palette,
    setPalette,
  };
}
