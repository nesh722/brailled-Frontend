/**
 * Request body for /api/guide. The Vite proxy forwards it to the Gradio Space `/generate` API.
 * Response is normalized to { candidates: [{ content: { parts: [{ text }] } }] } for parsing here.
 */
export type GuideApiBody = {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
  generationConfig?: { temperature?: number; maxOutputTokens?: number };
};

export async function requestGuide(body: GuideApiBody, signal?: AbortSignal): Promise<string> {
  const r = await fetch("/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const raw = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(raw || `Guide request failed (${r.status})`);
  }
  if (!r.ok) {
    const err = (data as { error?: string | { message?: string } }).error;
    const msg =
      typeof err === "string"
        ? err
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : raw || r.statusText;
    throw new Error(msg);
  }
  const candidates = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text).filter(Boolean).join("\n").trim();
  if (!text) throw new Error("The guide did not return any text. Try again.");
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}
