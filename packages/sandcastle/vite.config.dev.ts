import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

import baseConfig from "./vite.config.js";
import { cesiumPathReplace, insertImportMap } from "./vite-plugins.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createSandcastleConfig } from "./scripts/buildStatic.js";

const config = defineConfig(({ command }) => {
  if (command === "build") {
    throw Error("This config should not be used to build!");
  }

  const config: UserConfig = baseConfig;

  const cesiumSource = "../../Build/CesiumUnminified";
  const cesiumBaseUrl = "Build/CesiumUnminified";

  config.define = {
    ...config.define,
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
      { src: `../../Source/Cesium.d.ts`, dest: "Source" },
      { src: `../../Source/Cesium.js`, dest: "Source" },
      {
        src: `../engine/Build/Unminified/index.js`,
        dest: "packages/engine/Build/Unminified",
      },
      { src: `../engine/index.d.ts`, dest: "packages/engine" },
      {
        src: `../widgets/Build/Unminified/index.js`,
        dest: "packages/widgets/Build/Unminified",
      },
      { src: `../widgets/index.d.ts`, dest: "packages/widgets" },
      { src: "templates/Sandcastle.d.ts", dest: "templates" },
    ],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [
    ...plugins,
    copyPlugin[0],
    cesiumPathReplace(`/${cesiumBaseUrl}`),
    insertImportMap({
      Sandcastle: "./Sandcastle.js",
      cesium: "/Source/Cesium.js",
      "@cesium/engine": "/packages/engine/Build/Unminified/index.js",
      "@cesium/widgets": "/packages/widgets/Build/Unminified/index.js",
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
      path: "/Source/Cesium.js",
      typesPath: "/Source/Cesium.d.ts",
    },
    "@cesium/engine": {
      path: "/packages/engine/Build/Unminified/index.js",
      typesPath: "/packages/engine/index.d.ts",
    },
    "@cesium/widgets": {
      path: "/packages/widgets/Build/Unminified/index.js",
      typesPath: "/packages/widgets/index.d.ts",
    },
  },
  // IN DEV THIS DOES NOT COPY FILES it simply sets up in-memory server routes
  // to the correct locations on disk in the parent directories
  // This config should not be used for the actual build, only development of Sandcastle itself
  copyExtraFiles: [
    { src: join(__dirname, `${cesiumSource}/ThirdParty`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Workers`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Assets`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Widgets`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/*.(js|cjs)`), dest: cesiumBaseUrl },
    { src: join(__dirname, "../../Apps/SampleData"), dest: "Apps" },
    { src: join(__dirname, "../../Apps/SampleData"), dest: "" },
    { src: join(__dirname, `../../Source/Cesium.(d.ts|js)`), dest: "Source" },
    { src: join(__dirname, `../engine/index.d.ts`), dest: "packages/engine" },
    {
      src: join(__dirname, `../engine/Build/Unminified/index.js`),
      dest: "packages/engine/Build/Unminified",
    },
    { src: join(__dirname, `../widgets/index.d.ts`), dest: "packages/widgets" },
    {
      src: join(__dirname, `../widgets/Build/Unminified/index.js`),
      dest: "packages/widgets/Build/Unminified",
    },
  ],
});

console.log(config);
console.log(newConfig);

// export default config;
// copyFilesForProd();
export default defineConfig(({ command }) => {
  if (command === "build") {
    throw Error("This config should not be used to build!");
  }
  return newConfig;
});
