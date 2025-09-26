import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
function getCesiumVersion() {
  const data = readFileSync(join(__dirname, "../../package.json"), "utf-8");
  const { version } = JSON.parse(data);
  return version;
}

/** @import {UserConfig} from 'vite' */

// https://vite.dev/config/
/** @type {UserConfig} */
const baseConfig = {
  plugins: [react()],
  server: {
    // Given the nature of loading and constructing a CesiumJS Viewer on startup HMR can get memory intensive
    // The state of the editor could also be lost when developing if the page refreshes unexpectedly
    hmr: false,
  },
  define: {
    __COMMIT_SHA__: JSON.stringify(undefined),
    __CESIUM_VERSION__: JSON.stringify(`Cesium ${getCesiumVersion()}`),
    __VITE_TYPE_IMPORT_PATHS__: JSON.stringify(undefined),
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
