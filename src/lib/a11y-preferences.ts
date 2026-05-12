import {
  A11Y_DEFAULTS,
  A11Y_HTML_CLASS_PREFIX,
  A11Y_STORAGE_KEY,
  type A11yPreferences,
  type A11yToggleKey,
} from "./a11y-toggles-meta";

function parseStored(raw: string | null): Partial<A11yPreferences> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null) return null;
    return v as Partial<A11yPreferences>;
  } catch {
    return null;
  }
}

export function loadPreferences(): A11yPreferences {
  if (typeof window === "undefined") return { ...A11Y_DEFAULTS };
  const parsed = parseStored(window.localStorage.getItem(A11Y_STORAGE_KEY));
  return { ...A11Y_DEFAULTS, ...parsed };
}

export function savePreferences(next: A11yPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

const CLASS_MAP: Record<A11yToggleKey, string> = {
  highContrast: `${A11Y_HTML_CLASS_PREFIX}high-contrast`,
  largeText: `${A11Y_HTML_CLASS_PREFIX}large-text`,
  reduceMotion: `${A11Y_HTML_CLASS_PREFIX}reduce-motion`,
  enhancedFocus: `${A11Y_HTML_CLASS_PREFIX}enhanced-focus`,
  underlineLinks: `${A11Y_HTML_CLASS_PREFIX}underline-links`,
};

/** Applies preference classes on `<html>` (no storage). */
export function applyPreferencesToDocument(p: A11yPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(CLASS_MAP) as A11yToggleKey[]).forEach((key) => {
    const cls = CLASS_MAP[key];
    if (p[key]) {
      root.classList.add(cls);
    } else {
      root.classList.remove(cls);
    }
  });
}

export function setPreference<K extends A11yToggleKey>(key: K, value: A11yPreferences[K]): A11yPreferences {
  const next = { ...loadPreferences(), [key]: value };
  savePreferences(next);
  applyPreferencesToDocument(next);
  return next;
}

/** Load from storage and apply to the document (call on app init). */
export function initA11yFromStorage(): void {
  applyPreferencesToDocument(loadPreferences());
}
