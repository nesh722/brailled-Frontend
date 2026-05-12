import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { guideProxyPlugin } from "./vite-guide-proxy";

/** `/playground` → `/playground/` so the directory index resolves cleanly. */
function playgroundRedirectPlugin(): Plugin {
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathOnly = (req.url ?? "").split("?")[0];
    if (pathOnly === "/playground") {
      res.statusCode = 302;
      res.setHeader("Location", "/playground/");
      res.end();
      return;
    }
    next();
  };
  return {
    name: "playground-redirect",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), playgroundRedirectPlugin(), guideProxyPlugin(env)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          playground: resolve(__dirname, "playground/index.html"),
        },
      },
    },
  };
});
