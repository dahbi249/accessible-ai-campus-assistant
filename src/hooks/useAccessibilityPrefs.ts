import { useEffect, useState } from 'react';

export type FontScaleOption = 100 | 115 | 130;

export interface AccessibilityPrefs {
  fontScale: FontScaleOption;
  highContrast: boolean;
  announceResponses: boolean;
}

const STORAGE_KEY = 'campus_a11y_prefs_v1';

const DEFAULT_PREFS: AccessibilityPrefs = {
  fontScale: 100,
  highContrast: false,
  announceResponses: true,
};

function loadInitialPrefs(): AccessibilityPrefs {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>;
    const fontScale: FontScaleOption =
      parsed.fontScale === 115 || parsed.fontScale === 130 ? parsed.fontScale : 100;
    return {
      fontScale,
      highContrast: Boolean(parsed.highContrast),
      announceResponses:
        typeof parsed.announceResponses === 'boolean' ? parsed.announceResponses : true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(loadInitialPrefs);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.fontSize = `${prefs.fontScale}%`;
    document.documentElement.classList.toggle('high-contrast', prefs.highContrast);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors
    }
  }, [prefs]);

  function setFontScale(fontScale: FontScaleOption) {
    setPrefs((prev) => ({ ...prev, fontScale }));
  }

  function toggleHighContrast() {
    setPrefs((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }

  function toggleAnnounceResponses() {
    setPrefs((prev) => ({ ...prev, announceResponses: !prev.announceResponses }));
  }

  return {
    prefs,
    setFontScale,
    toggleHighContrast,
    toggleAnnounceResponses,
  };
}
