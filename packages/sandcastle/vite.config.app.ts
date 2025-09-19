import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import baseConfig from "./vite.config.js";
import { createSandcastleConfig } from "./scripts/buildStatic.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { cesiumPathReplace, insertImportMap } from "./vite-plugins.js";

const config = defineConfig(() => {
  const cesiumBaseUrl = "/Build/CesiumUnminified";

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // for the normal local server.js to work correctly
  config.base = "/Apps/Sandcastle2";

  config.build = {
    ...config.build,
    outDir: "../../Apps/Sandcastle2",
  };

  config.define = {
    ...config.define,
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
      Sandcastle: "./Sandcastle.js",
      cesium: "/Source/Cesium.js",
      "@cesium/engine": "/packages/engine/Build/Unminified/index.js",
      "@cesium/widgets": "/packages/widgets/Build/Unminified/index.js",
    }),
  ];

  return config;
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const newConfig = createSandcastleConfig({
  outDir: join(__dirname, "../../Apps/Sandcastle2"),
  viteBase: "/Apps/Sandcastle2",
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
});

console.log(config);
console.log(newConfig);

// export default config;
export default defineConfig(newConfig);
