import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// CesiumJS 1.x core math, used only as a test oracle for parity checks.
const oracle = fileURLToPath(new URL("../core/Source", import.meta.url));

export default defineConfig({
  root: "demo",
  server: { port: 5190, strictPort: true },
  build: { outDir: "../dist", emptyOutDir: true, target: "es2023" },
  resolve: { alias: { "cesium-oracle": oracle } },
  test: {
    root: ".",
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
