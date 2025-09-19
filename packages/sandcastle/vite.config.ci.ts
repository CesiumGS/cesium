import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { env } from "process";

import baseConfig from "./vite.config.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createSandcastleConfig } from "./scripts/buildStatic.js";
import { cesiumPathReplace, insertImportMap } from "./vite-plugins.js";

const config = defineConfig(() => {
  const cesiumBaseUrl = `${process.env.BASE_URL}Build/CesiumUnminified`;

  console.log("Building Sandcastle with base url:", cesiumBaseUrl);

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // based on the ci branch path
  config.base = `${process.env.BASE_URL}Apps/Sandcastle2`;

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
  };

  config.define = {
    ...config.define,
    __COMMIT_SHA__: JSON.stringify(env.GITHUB_SHA),
  };

  const copyPlugin = viteStaticCopy({
    targets: [{ src: "templates/Sandcastle.(d.ts|js)", dest: "templates" }],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [
    ...plugins,
    copyPlugin,
    cesiumPathReplace(cesiumBaseUrl),
    insertImportMap({
      Sandcastle: `${config.base}/templates/Sandcastle.js`,
      cesium: `${process.env.BASE_URL}/Source/Cesium.js`,
      "@cesium/engine": `${process.env.BASE_URL}/packages/engine/Build/Unminified/index.js`,
      "@cesium/widgets": `${process.env.BASE_URL}/packages/widgets/Build/Unminified/index.js`,
    }),
  ];

  return config;
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const newConfig = createSandcastleConfig({
  outDir: join(__dirname, "../../Apps/Sandcastle2"),
  viteBase: `${process.env.BASE_URL}Apps/Sandcastle2`,
  cesiumBaseUrl: `${process.env.BASE_URL}Build/CesiumUnminified`,
  commitSha: JSON.stringify(env.GITHUB_SHA),
  imports: {
    cesium: {
      path: `${process.env.BASE_URL}/Source/Cesium.js`,
      typesPath: `${process.env.BASE_URL}/Source/Cesium.d.ts`,
    },
    "@cesium/engine": {
      path: `${process.env.BASE_URL}/packages/engine/Build/Unminified/index.js`,
      typesPath: `${process.env.BASE_URL}/packages/engine/index.d.ts`,
    },
    "@cesium/widgets": {
      path: `${process.env.BASE_URL}/packages/widgets/Build/Unminified/index.js`,
      typesPath: `${process.env.BASE_URL}/packages/widgets/index.d.ts`,
    },
  },
});

console.log(config);
console.log(newConfig);

// export default config;
export default defineConfig(newConfig);
