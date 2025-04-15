import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    base: "/Apps/Sandcastle2",
    build: {
      outDir: "../../Apps/Sandcastle2",
      // "the outDir is not inside project root and will not be emptied" without this setting
      emptyOutDir: true,
      sourcemap: command === "serve",
    },
    server: {
      // Given the nature of loading and constructing a CesiumJS Viewer on startup HMR can get memory intensive
      // The state of the editor could also be lost when developing if the page refreshes unexpectedly
      hmr: false,
    },
  };
});
