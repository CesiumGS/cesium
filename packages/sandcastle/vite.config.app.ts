import { defineConfig } from "vite";
import { createSandcastleConfig } from "./scripts/buildStatic.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use this when the static files are hosted at a "nested" URL like in CI
const pathPrefix = (path: string) => `${process.env.BASE_URL ?? ""}${path}`;

const newConfig = createSandcastleConfig({
  outDir: join(__dirname, "../../Apps/Sandcastle2"),
  viteBase: pathPrefix("/Apps/Sandcastle2"),
  cesiumBaseUrl: pathPrefix("/Build/CesiumUnminified"),
  imports: {
    cesium: {
      path: pathPrefix("/Source/Cesium.js"),
      typesPath: pathPrefix("/Source/Cesium.d.ts"),
    },
    "@cesium/engine": {
      path: pathPrefix("/packages/engine/Build/Unminified/index.js"),
      typesPath: pathPrefix("/packages/engine/index.d.ts"),
    },
    "@cesium/widgets": {
      path: pathPrefix("/packages/widgets/Build/Unminified/index.js"),
      typesPath: pathPrefix("/packages/widgets/index.d.ts"),
    },
  },
});

export default defineConfig(newConfig);
