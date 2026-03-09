import { defineConfig } from "vite";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createSandcastleConfig } from "./scripts/buildStatic.js";
import { readFileSync } from "fs";
import { Target } from "vite-plugin-static-copy";
import { globby } from "globby";
import { exit } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
function getCesiumVersion() {
  const data = readFileSync(join(__dirname, "../../package.json"), "utf-8");
  const { version } = JSON.parse(data);
  return version;
}

async function checkForFiles(extraFilesList: Target[]) {
  for (const target of extraFilesList) {
    const files = await globby(target.src);
    if (files.length === 0) {
      // check for at least 1 file in each location. Some of the directories like Assets/
      // will have many and it's hard to offer suggestions for every file that we might need

      if (target.src.includes(".d.ts")) {
        // probably a missing types file
        console.error(
          "\nYou might be missing types files. Try running `npm run build-ts` at the repo root",
        );
      } else if (target.src.includes(".js") || target.src.includes("/Build/")) {
        // probably missing some built JS files
        console.error(
          "\nYou might be missing built JS files. Try running `npm run build` at the repo root",
        );
      }

      throw new Error(`Missing files for glob: ${target.src}`);
    }
  }
}

export default defineConfig(async ({ command }) => {
  if (command === "build") {
    throw Error("This config should not be used to build!");
  }

  const cesiumSource = "../../Build/CesiumUnminified";
  const cesiumBaseUrl = "Build/CesiumUnminified";

  const extraFiles = [
    {
      src: join(__dirname, `${cesiumSource}/ThirdParty`),
      dest: cesiumBaseUrl,
    },
    { src: join(__dirname, `${cesiumSource}/Workers`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Assets`), dest: cesiumBaseUrl },
    { src: join(__dirname, `${cesiumSource}/Widgets`), dest: cesiumBaseUrl },
    {
      src: join(__dirname, `${cesiumSource}/*.(js|cjs)`),
      dest: cesiumBaseUrl,
    },
    { src: join(__dirname, "../../Apps/SampleData"), dest: "Apps" },
    { src: join(__dirname, "../../Apps/SampleData"), dest: "" },
    { src: join(__dirname, `../../Source/Cesium.(d.ts|js)`), dest: "Source" },
    { src: join(__dirname, `../engine/index.d.ts`), dest: "packages/engine" },
    {
      src: join(__dirname, `../engine/Build/Unminified/index.js`),
      dest: "packages/engine/Build/Unminified",
    },
    {
      src: join(__dirname, `../widgets/index.d.ts`),
      dest: "packages/widgets",
    },
    {
      src: join(__dirname, `../widgets/Build/Unminified/index.js`),
      dest: "packages/widgets/Build/Unminified",
    },
  ];

  try {
    await checkForFiles(extraFiles);
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : error}\n`);
    exit(1);
  }

  const config = createSandcastleConfig({
    outDir: join(__dirname, "../../Build/Sandcastle2"),
    basePath: "",
    cesiumBaseUrl: "/Build/CesiumUnminified",
    cesiumVersion: getCesiumVersion(),
    outerOrigin: "http://localhost:5173",
    innerOrigin: "http://localhost:5173",
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
    copyExtraFiles: extraFiles,
  });

  return config;
});
