import { fileURLToPath } from "url";
import { defineConfig, PluginOption, UserConfig } from "vite";
import baseConfig from "./vite.config.ts";

// const cesiumSource = "../../Build/CesiumUnminified";
const cesiumBaseUrl = `${process.env.BASE_URL}Build/CesiumUnminified`;

export default defineConfig(() => {
  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = `${process.env.BASE_URL}Apps/Sandcastle2`;

  config.define = {
    __base_url__: JSON.stringify(cesiumBaseUrl),
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

  const htmlPlugin = (): PluginOption => {
    return {
      name: "custom-cesium-path-plugin",
      transformIndexHtml(html) {
        return html.replaceAll("__base_url__", `${cesiumBaseUrl}`);
      },
    };
  };

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, htmlPlugin()];

  return config;
});
