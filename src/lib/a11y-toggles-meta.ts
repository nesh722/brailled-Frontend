/** Labels and descriptions for accessibility toggles (landing + playground). */

export type A11yToggleKey = "highContrast" | "largeText" | "reduceMotion" | "enhancedFocus" | "underlineLinks";

export type A11yPreferences = Record<A11yToggleKey, boolean>;

export const A11Y_STORAGE_KEY = "brailleed-a11y-preferences";

export const A11Y_DEFAULTS: A11yPreferences = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  enhancedFocus: false,
  underlineLinks: false,
};

export const A11Y_TOGGLE_DEFS: readonly {
  key: A11yToggleKey;
  label: string;
  description: string;
}[] = [
  {
    key: "highContrast",
    label: "High contrast",
    description: "Stronger text and borders; higher contrast for body copy and UI edges.",
  },
  {
    key: "largeText",
    label: "Larger text",
    description: "Scales base font size for easier reading (about 18% larger).",
  },
  {
    key: "reduceMotion",
    label: "Reduce motion",
    description: "Minimizes animations and transitions. Matches a calmer interface.",
  },
  {
    key: "enhancedFocus",
    label: "Enhanced focus indicators",
    description: "Thicker, high-visibility outlines on keyboard focus.",
  },
  {
    key: "underlineLinks",
    label: "Underline links",
    description: "Always shows links with an underline so they are easy to spot.",
  },
];

export const A11Y_HTML_CLASS_PREFIX = "bra-a11y--";
