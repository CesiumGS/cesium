import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { env } from "process";

import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

export default defineConfig(() => {
  const cesiumSource = "../../Build/CesiumUnminified";
  const cesiumBaseUrl = "Build/CesiumUnminified";

  console.log("Building Sandcastle with base url:", cesiumBaseUrl);

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // based on the ci branch path
  config.base = ``;

  config.build = {
    ...config.build,
    outDir: "../../Build/Sandcastle2",
  };

  config.define = {
    ...config.define,
    __PAGE_BASE_URL__: JSON.stringify(""),
    __COMMIT_SHA__: JSON.stringify(env.GITHUB_SHA),
  };

  const copyPlugin = viteStaticCopy({
    targets: [
      { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      { src: `${cesiumSource}/*.(js|cjs)`, dest: cesiumBaseUrl },
      { src: "../../Apps/SampleData", dest: "Apps" },
      { src: "../../Apps/SampleData", dest: "" },
      { src: `../../Source/Cesium.d.ts`, dest: "Source" },
      { src: "templates/Sandcastle.(d.ts|js)", dest: "templates" },
    ],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [
    ...plugins,
    copyPlugin,
    cesiumPathReplace(`/${cesiumBaseUrl}`),
  ];

  return config;
});
