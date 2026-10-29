import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

// CesiumJS 1.x core math, used only as a test oracle for parity checks.
const oracle = fileURLToPath(new URL("../core/Source", import.meta.url));
// Built CesiumJS 1.x (`npm run build` at the repo root), for the parity harness.
const cesium1x = fileURLToPath(
  new URL("../../Build/CesiumUnminified", import.meta.url),
);

const contentTypes: Record<string, string> = {
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
};

/** Serves the 1.x build at /cesium1x/ without copying it into the package. */
function serveCesium1x(): Plugin {
  return {
    name: "serve-cesium-1x",
    configureServer(server) {
      server.middlewares.use("/cesium1x", (req, res, next) => {
        const path = normalize(
          join(cesium1x, decodeURIComponent((req.url ?? "/").split("?")[0]!)),
        );
        if (
          !path.startsWith(cesium1x) ||
          !existsSync(path) ||
          statSync(path).isDirectory()
        ) {
          next();
          return;
        }
        res.setHeader(
          "Content-Type",
          contentTypes[extname(path)] ?? "application/octet-stream",
        );
        createReadStream(path).pipe(res);
      });
    },
  };
}

export default defineConfig({
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
  plugins: [serveCesium1x()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: {
      input: {
        demo: "demo/index.html",
        parity: "parity/index.html",
        precision: "spikes/precision.html",
        worker: "spikes/worker.html",
        indirect: "spikes/indirect.html",
      },
    },
  },
  resolve: { alias: { "cesium-oracle": oracle } },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
