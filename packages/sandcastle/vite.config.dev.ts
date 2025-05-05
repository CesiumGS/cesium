import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

export default defineConfig(() => {
  const config: UserConfig = baseConfig;

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
      { src: "../../Apps/SampleData", dest: "" },
    ],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, cesiumPathReplace(cesiumBaseUrl)];

  return config;
});
