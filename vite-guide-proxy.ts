import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const MAX_BODY = 56_000;

const SOFT_CAPS = [70, 140, 280, 560, 1120] as const;

type GuideRequestBody = {
  systemInstruction?: { parts?: { text?: string }[] };
  contents?: { role?: string; parts?: { text?: string }[] }[];
  generationConfig?: { maxOutputTokens?: number; temperature?: number };
};

function pickSoftCap(preferred: number): (typeof SOFT_CAPS)[number] {
  let best = SOFT_CAPS[0];
  for (const c of SOFT_CAPS) {
    if (c <= preferred) best = c;
    else break;
  }
  return best;
}

function contentsToConversation(contents: GuideRequestBody["contents"]): string {
  if (!contents?.length) return "";
  return contents
    .map((c) => {
      const t = c.parts?.map((p) => p.text).filter(Boolean).join("\n") ?? "";
      const label = c.role === "model" ? "Guide" : "Student";
      return `${label}:\n${t}`;
    })
    .join("\n\n");
}

function extractGradioData(parsed: unknown): string {
  if (parsed == null) throw new Error("Gradio returned no output (space may be busy or need HF_TOKEN).");
  if (typeof parsed === "string") return parsed;
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      if (typeof o.text === "string") return o.text;
      if (typeof o.content === "string") return o.content;
    }
    return JSON.stringify(parsed);
  }
  if (typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.output === "string") return o.output;
  }
  return JSON.stringify(parsed);
}

function sseBlockData(block: string): string | undefined {
  const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
  if (!dataLine) return undefined;
  return dataLine.slice(6).trim();
}

function parseSseErrorDetail(body: string): string | undefined {
  const blocks = body.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!block.includes("event: error")) continue;
    const raw = sseBlockData(block);
    if (raw == null || raw === "null" || raw === "") continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed === "object" && "message" in parsed) {
        return String((parsed as { message: unknown }).message);
      }
      return JSON.stringify(parsed);
    } catch {
      return raw;
    }
  }
  return undefined;
}

function parseSseComplete(body: string): string {
  const blocks = body.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!block.includes("event: complete")) continue;
    const jsonStr = sseBlockData(block);
    if (!jsonStr) continue;
    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      return extractGradioData(parsed);
    } catch {
      return jsonStr;
    }
  }
  if (body.includes("event: error")) {
    const detail = parseSseErrorDetail(body);
    throw new Error(
      detail
        ? `Gradio Space error: ${detail}`
        : "Gradio Space returned an error (no details). The Space may be cold, overloaded, or need HF_TOKEN; try again in a moment."
    );
  }
  throw new Error("No complete event from Gradio (timeout or unexpected response).");
}

async function readSseToText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) throw new Error("No response body from Gradio.");
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let acc = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  acc += dec.decode();
  return parseSseComplete(acc);
}

async function callGradioGenerate(opts: {
  baseUrl: string;
  apiRoute: string;
  hfToken: string | undefined;
  messageText: string;
  systemPrompt: string;
  maxNewTokens: number;
  maxSoftTokens: (typeof SOFT_CAPS)[number];
  thinking: boolean;
}): Promise<string> {
  const { baseUrl, apiRoute, hfToken, messageText, systemPrompt, maxNewTokens, maxSoftTokens, thinking } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hfToken) headers.Authorization = `Bearer ${hfToken}`;

  // max_soft_tokens: Space schema lists numeric enum; Python client uses string "280" — send string for compatibility.
  const data: unknown[] = [
    { text: messageText, files: [] as unknown[] },
    thinking,
    maxNewTokens,
    String(maxSoftTokens),
    systemPrompt,
  ];

  const postUrl = `${baseUrl}/gradio_api/call/${apiRoute}`;
  const postRes = await fetch(postUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });
  const postText = await postRes.text();
  let postJson: { event_id?: string; message?: string };
  try {
    postJson = JSON.parse(postText) as { event_id?: string; message?: string };
  } catch {
    throw new Error(`Gradio POST failed (${postRes.status}): ${postText.slice(0, 400)}`);
  }
  if (!postRes.ok || !postJson.event_id) {
    throw new Error(postJson.message || postText || `Gradio queue error (${postRes.status})`);
  }

  const getUrl = `${baseUrl}/gradio_api/call/${apiRoute}/${postJson.event_id}`;
  const getRes = await fetch(getUrl, {
    headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : {},
  });
  if (!getRes.ok) {
    throw new Error(`Gradio result fetch failed (${getRes.status})`);
  }
  return readSseToText(getRes.body);
}

/** Same JSON shape the in-app client already parses (candidates[0].content.parts[].text). */
function guideClientResponse(text: string): string {
  return JSON.stringify({
    candidates: [
      {
        content: {
          parts: [{ text }],
          role: "model",
        },
        finishReason: "STOP",
        index: 0,
      },
    ],
  });
}

export function guideProxyPlugin(env: Record<string, string>): Plugin {
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api/guide")) {
      next();
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }

    const baseUrl = (env.HF_GRADIO_SPACE_URL || "https://huggingface-projects-gemma-4-31b-it.hf.space").replace(
      /\/$/,
      ""
    );
    const apiRoute = (env.HF_GRADIO_API_ROUTE || "generate").replace(/^\//, "");
    const hfToken = env.HF_TOKEN?.trim() || undefined;

    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json");
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.length > MAX_BODY) {
        res.statusCode = 413;
        res.end(JSON.stringify({ error: { message: "Request too large" } }));
        return;
      }

      let body: GuideRequestBody;
      try {
        body = JSON.parse(raw) as GuideRequestBody;
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: { message: "Invalid JSON body" } }));
        return;
      }

      const systemPrompt = body.systemInstruction?.parts?.map((p) => p.text).filter(Boolean).join("\n") ?? "";
      const messageText = contentsToConversation(body.contents);
      if (!messageText.trim()) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: { message: "Missing conversation contents" } }));
        return;
      }

      const requested = body.generationConfig?.maxOutputTokens ?? 512;
      const maxNewTokens = Math.min(4000, Math.max(100, requested));
      const softPref = parseInt(env.HF_MAX_SOFT_TOKENS || "280", 10) || 280;
      const maxSoftTokens = pickSoftCap(softPref);

      const thinking = env.HF_GRADIO_THINKING === "true";

      try {
        const text = await callGradioGenerate({
          baseUrl,
          apiRoute,
          hfToken,
          messageText,
          systemPrompt,
          maxNewTokens,
          maxSoftTokens,
          thinking,
        });
        const cleaned = text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        res.statusCode = 200;
        res.end(guideClientResponse(cleaned || text));
      } catch (e) {
        const gradioMsg = e instanceof Error ? e.message : String(e);
        res.statusCode = 502;
        res.end(
          JSON.stringify({
            error: {
              message: `${gradioMsg} If this persists, set HF_TOKEN (Hugging Face read token) or check the Space status.`,
            },
          })
        );
      }
    });
  };

  return {
    name: "guide-gradio-proxy",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
