import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    outDir: "Build",
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "Source/index.ts"),
      name: "CesiumUtils",
      formats: ["es", "cjs", "iife"],
      fileName: (format) => `utils.${format}.js`,
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
});
