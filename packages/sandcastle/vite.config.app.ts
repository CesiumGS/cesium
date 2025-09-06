import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  const cesiumBaseUrl = "/Build/CesiumUnminified";

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = "/Apps/Sandcastle2";

  config.build = {
    ...config.build,
    outDir: join(__dirname, "../../Apps/Sandcastle2"),
  };

  config.define = {
    ...config.define,
    __PAGE_BASE_URL__: JSON.stringify("/"),
  };

  const copyPlugin = viteStaticCopy({
    targets: [{ src: "templates/Sandcastle.(d.ts|js)", dest: "templates" }],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, cesiumPathReplace(cesiumBaseUrl)];

  return config;
});
