import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

export default defineConfig(({ command }) => {
  if (command === "build") {
    throw Error("This config should not be used to build!");
  }

  const config: UserConfig = baseConfig;

  const cesiumSource = "../../Build/CesiumUnminified";
  const cesiumBaseUrl = "Build/CesiumUnminified";

  config.define = {
    ...config.define,
    __PAGE_BASE_URL__: JSON.stringify("/"),
    __GALLERY_BASE_URL__: JSON.stringify("/gallery"),
  };

  // When running the local dev server these are just server routes.
  // When building the project this actually copies files.
  // This config should NOT be used to build the project to avoid this.
  const copyPlugin = viteStaticCopy({
    targets: [
      { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/*.(js|cjs)`, dest: cesiumBaseUrl },
      { src: "../../Apps/SampleData", dest: "Apps" },
      { src: "../../Apps/SampleData", dest: "" },
      { src: "gallery", dest: "" },
    ],
  });
  // If any of the src files are missing the plugin fails to load others
  // these 2 files are potentially very common to be missing so try loading them
  // separately to avoid breaking other stuff like the gallery
  const typesCopyPlugin = viteStaticCopy({
    targets: [
      { src: `../../Source/Cesium.d.ts`, dest: "Source" },
      { src: "templates/Sandcastle.d.ts", dest: "templates" },
    ],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [
    ...plugins,
    copyPlugin,
    typesCopyPlugin,
    cesiumPathReplace(`/${cesiumBaseUrl}`),
  ];

  return config;
});
