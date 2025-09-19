import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { env } from "process";

import baseConfig from "./vite.config.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createSandcastleConfig } from "./scripts/buildStatic.js";
import { cesiumPathReplace, insertImportMap } from "./vite-plugins.js";

const config = defineConfig(() => {
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
    insertImportMap({
      Sandcastle: "/templates/Sandcastle.js",
      cesium: "/js/Cesium.js",
      "@cesium/engine": "/js/engine/index.js",
      "@cesium/widgets": "/js/widgets/index.js",
    }),
  ];

  return config;
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const cesiumSource = "../../Build/CesiumUnminified";
const cesiumBaseUrl = "Build/CesiumUnminified";
const newConfig = createSandcastleConfig({
  outDir: join(__dirname, "../../Build/Sandcastle2"),
  viteBase: "",
  cesiumBaseUrl: "/Build/CesiumUnminified",
  imports: {
    cesium: {
      path: "/js/Cesium.js",
      typesPath: "/js/Cesium.d.ts",
    },
    "@cesium/engine": {
      path: "/js/engine/index.js",
      typesPath: "/js/engine/index.d.ts",
    },
    "@cesium/widgets": {
      path: "/js/widgets/index.js",
      typesPath: "/js/widgets/index.d.ts",
    },
  },
  copyExtraFiles: [
    { src: join(__dirname, `${cesiumSource}/ThirdParty`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Workers`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Assets`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Widgets`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/*.(js|cjs)`), dest: cesiumBaseUrl },
    { src: join(__dirname, "../../Apps/SampleData"), dest: "Apps" },
    { src: join(__dirname, "../../Apps/SampleData"), dest: "" },
    { src: join(__dirname, `../../Source/Cesium.(d.ts|js)`), dest: "js" },
    { src: join(__dirname, `../engine/index.d.ts`), dest: "js/engine" },
    {
      src: join(__dirname, `../engine/Build/Unminified/index.js`),
      dest: "js/engine",
    },
    { src: join(__dirname, `../widgets/index.d.ts`), dest: "js/widgets" },
    {
      src: join(__dirname, `../widgets/Build/Unminified/index.js`),
      dest: "js/widgets",
    },
  ],
});

console.log(config);
console.log(newConfig);

// export default config;
// copyFilesForProd();
export default defineConfig(newConfig);
