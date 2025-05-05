import { defineConfig, UserConfig } from "vite";

import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

export default defineConfig(() => {
  const cesiumBaseUrl = "/Build/CesiumUnminified";

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = "/Apps/Sandcastle2";

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
  };

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, cesiumPathReplace(cesiumBaseUrl)];

  return config;
});
