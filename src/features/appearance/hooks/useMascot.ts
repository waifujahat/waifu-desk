import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MASCOT,
  MASCOT_STORAGE_KEY,
  normalizeMascot,
  parseMascotPreferences,
  type MascotPreferences,
} from '../domain/mascot';

function readSavedMascot(): MascotPreferences {
  try {
    return parseMascotPreferences(localStorage.getItem(MASCOT_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_MASCOT };
  }
}

/** Local, presentation-only settings. Does not read Codex or GitHub data. */
export function useMascot() {
  const [mascot, setMascot] = useState<MascotPreferences>(readSavedMascot);
  const updateMascot = useCallback((patch: Partial<MascotPreferences>) => {
    setMascot((current) => normalizeMascot({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MASCOT_STORAGE_KEY, JSON.stringify(mascot));
    } catch {
      // The preference still works within the current session.
    }
  }, [mascot]);

  return { mascot, updateMascot };
}
