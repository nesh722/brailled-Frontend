import type { Command } from "../types/app";

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Picks the best matching block command using whole-word, longest-phrase-wins
 * (avoids the short alias "left" outranking "spin around" when the transcript is wrong).
 */
export function findBestCommandIndex(normalized: string, commands: readonly Command[]): number {
  const t = normalizeText(normalized);
  let bestIdx = -1;
  let bestLen = 0;
  for (let i = 0; i < commands.length; i++) {
    const phrases = [commands[i].phrase, ...commands[i].aliases].map((p) => normalizeText(p));
    for (const p of phrases) {
      if (!p.length) continue;
      const escaped = p.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      if (!escaped.length) continue;
      const re = new RegExp(`\\b${escaped.join("\\s+")}\\b`, "i");
      if (re.test(t) && p.length > bestLen) {
        bestLen = p.length;
        bestIdx = i;
      }
    }
  }
  return bestIdx;
}
