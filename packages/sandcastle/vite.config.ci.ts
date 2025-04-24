import { defineConfig, UserConfig } from "vite";
import baseConfig from "./vite.config.ts";

export default defineConfig(() => {
  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = `${process.env.BASE_URL}Apps/Sandcastle2`;

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
    // "the outDir is not inside project root and will not be emptied" without this setting
    emptyOutDir: true,
  };

  return config;
});
