import { fileURLToPath } from "url";
import { defineConfig, PluginOption, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

import baseConfig from "./vite.config.ts";

const cesiumSource = "../../Build/CesiumUnminified";
const cesiumBaseUrl = "Build/CesiumUnminified";

export default defineConfig(() => {
  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = "/Apps/Sandcastle2";

  config.define = {
    __base_url__: JSON.stringify(`/${cesiumBaseUrl}`),
  };

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
    // "the outDir is not inside project root and will not be emptied" without this setting
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        bucket: fileURLToPath(new URL("./bucket.html", import.meta.url)),
      },
    },
  };

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

  const htmlPlugin = (): PluginOption => {
    return {
      name: "custom-cesium-path-plugin",
      transformIndexHtml(html) {
        return html.replace("__base_url__", `/${cesiumBaseUrl}`);
      },
    };
  };

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, htmlPlugin()];

  return config;
});
