import type { Command } from "../types/app";
import { mergeDefaultParams } from "../data/commands";
import { normalizeText } from "./utils";

const IMAGE_MAP: Record<string, string> = {
  happy: "HAPPY",
  sad: "SAD",
  heart: "HEART",
  yes: "YES",
  no: "NO",
};

/**
 * Fills param values from a voice utterance, then merges with command defaults.
 */
export function extractParamsFromUtterance(raw: string, command: Command): Record<string, string | number> {
  const t = normalizeText(raw);
  const o: Record<string, string | number> = {};

  const portM = t.match(/\b(?:port|motor)\s*([a-f])\b/) ?? t.match(/\bmotor\s+([a-f])\b/);
  if (portM) o.port = portM[1]!.toUpperCase();

  for (const color of ["red", "blue", "green", "yellow", "black", "white"]) {
    if (new RegExp(`\\b${color}\\b`, "i").test(t) && command.params.some((p) => p.name === "color")) {
      o.color = color;
      break;
    }
  }
  for (const [word, up] of Object.entries(IMAGE_MAP)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(t) && command.params.some((p) => p.name === "name")) o.name = up;
  }

  const nums = t.match(/\d+/g)?.map((x) => parseInt(x, 10)) ?? [];
  let ni = 0;
  for (const p of command.params) {
    if (o[p.name] !== undefined) continue;
    if (p.type === "port") {
      if (o.port !== undefined) o[p.name] = o.port;
      else if (portM) o[p.name] = portM[1]!.toUpperCase();
    } else if (p.type === "int" && nums[ni] !== undefined) {
      o[p.name] = nums[ni]!;
      ni += 1;
    }
  }
  return mergeDefaultParams(command, o);
}
