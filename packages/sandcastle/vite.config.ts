import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { PluginOption, UserConfig } from "vite";
import rootPackageJson from "../../package.json";

// https://vite.dev/config/
const baseConfig: UserConfig = {
  plugins: [react()],
  server: {
    // Given the nature of loading and constructing a CesiumJS Viewer on startup HMR can get memory intensive
    // The state of the editor could also be lost when developing if the page refreshes unexpectedly
    hmr: false,
  },
  define: {
    __COMMIT_SHA__: JSON.stringify(undefined),
    __CESIUM_VERSION__: JSON.stringify(`Cesium ${rootPackageJson.version}`),
  },
  build: {
    // "the outDir may not be inside project root and will not be emptied without this setting
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        bucket: fileURLToPath(
          new URL("./templates/bucket.html", import.meta.url),
        ),
        standalone: fileURLToPath(
          new URL("./standalone.html", import.meta.url),
        ),
      },
      external: ["../pagefind/pagefind.js"],
    },
    assetsInlineLimit: (filePath) => {
      if (filePath.includes("@stratakit") && filePath.endsWith(".svg")) {
        return false;
      }
      return undefined;
    },
  },
};
export default baseConfig;

/**
 * Replace path values in
 * @param cesiumBaseUrl Path to use for replacement
 */
export const cesiumPathReplace = (cesiumBaseUrl: string): PluginOption => {
  return {
    name: "custom-cesium-path-plugin",
    config(config) {
      config.define = {
        ...config.define,
        __CESIUM_BASE_URL__: JSON.stringify(cesiumBaseUrl),
      };
    },
    transformIndexHtml(html) {
      return html.replaceAll("__CESIUM_BASE_URL__", `${cesiumBaseUrl}`);
    },
  };
};
