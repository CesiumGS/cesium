import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { createHtmlPlugin } from "vite-plugin-html";

import baseConfig from "./vite.config.ts";

export default defineConfig(() => {
  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = "/Apps/Sandcastle2";

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
    // "the outDir is not inside project root and will not be emptied" without this setting
    emptyOutDir: true,
  };

  const cesiumSource = "../../Build/CesiumUnminified";
  const cesiumBaseUrl = "Build/CesiumUnminified";

  const copyPlugin = viteStaticCopy({
    targets: [
      { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Cesium.js`, dest: cesiumBaseUrl },
      { src: `../../Source/Cesium.d.ts`, dest: "Source" },
      { src: "../../Apps/SampleData", dest: "Apps" },
    ],
  });

  const htmlPlugin = createHtmlPlugin({
    minify: false,
    pages: [
      {
        entry: "src/main.tsx",
        template: "index.html",
        filename: "index.html",
      },
      {
        entry: undefined,
        template: "bucket2.html",
        filename: "bucket2.html",
        injectOptions: {
          data: {
            scriptPath: `${cesiumSource}/Cesium.js`,
            cesiumBase: `/${cesiumBaseUrl}`,
          },
        },
      },
    ],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, htmlPlugin];

  return config;
});
