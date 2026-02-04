import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "path";

/** @import {UserConfig} from 'vite' */

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    __CESIUM_VERSION__: JSON.stringify(undefined),
    __VITE_TYPE_IMPORT_PATHS__: JSON.stringify(undefined),
  },
  build: {
    // "the outDir may not be inside project root and will not be emptied without this setting
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "./index.html"),
        bucket: resolve(__dirname, "./templates/bucket.html"),
        standalone: resolve(__dirname, "./standalone.html"),
        standalone2: resolve(__dirname, "./standalone-old.html"),
      },
    },
    assetsInlineLimit: (filePath) => {
      if (filePath.includes("@stratakit") && filePath.endsWith(".svg")) {
        return false;
      }
      return undefined;
    },
  },
  experimental: {
    renderBuiltUrl(filename, { hostId }) {
      // the standalone.html file needs to stay at the root path
      // for legacy reasons however the <base> tag makes it behave
      // as if it's nested inside the `/templates/` directory.
      // we need to adjust the vite built asset paths to "un-nest" this change
      // TODO: remove with the old version
      if (hostId.endsWith("standalone-old.html")) {
        return `../${filename}`;
      }
    },
  },
};
export default baseConfig;
