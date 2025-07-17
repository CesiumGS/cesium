import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

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

  config.define = {
    ...config.define,
    __PAGE_BASE_URL__: JSON.stringify("/"),
    __GALLERY_BASE_URL__: JSON.stringify("/packages/sandcastle/gallery"),
  };

  const copyPlugin = viteStaticCopy({
    targets: [
      { src: "templates/Sandcastle.(d.ts|js)", dest: "templates" },
      { src: "pagefind", dest: "" },
    ],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, cesiumPathReplace(cesiumBaseUrl)];

  return config;
});
