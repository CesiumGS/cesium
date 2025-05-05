import { defineConfig, UserConfig } from "vite";

import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

export default defineConfig(() => {
  const cesiumBaseUrl = `${process.env.BASE_URL}Build/CesiumUnminified`;

  console.log("Building Sandcastle with base url:", cesiumBaseUrl);

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // based on the ci branch path
  config.base = `${process.env.BASE_URL}Apps/Sandcastle2`;

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
  };

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, cesiumPathReplace(cesiumBaseUrl)];

  return config;
});
