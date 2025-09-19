import { defineConfig } from "vite";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createSandcastleConfig } from "./scripts/buildStatic.js";

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

export default defineConfig(newConfig);
