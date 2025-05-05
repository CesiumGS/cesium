import { fileURLToPath } from "url";
import { defineConfig, PluginOption, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import baseConfig from "./vite.config.ts";

export default defineConfig(() => {
  const config: UserConfig = baseConfig;

  const cesiumSource = "../../Build/CesiumUnminified";
  const cesiumBaseUrl = "Build/CesiumUnminified";

  config.define = {
    __base_url__: JSON.stringify(`/${cesiumBaseUrl}`),
  };

  config.build = {
    ...config.build,
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
      { src: "../../Apps/SampleData", dest: "" },
    ],
  });

  const htmlPlugin = (): PluginOption => {
    return {
      name: "custom-cesium-path-plugin",
      transformIndexHtml(html) {
        return html.replaceAll("__base_url__", `${cesiumBaseUrl}`);
      },
    };
  };

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, htmlPlugin()];

  return config;
});
