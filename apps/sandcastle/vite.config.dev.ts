import { defineConfig } from "vite";
import { dirname, join, relative } from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { createSandcastleConfig } from "./scripts/buildStatic.js";
import { readFileSync } from "fs";
import { Target } from "vite-plugin-static-copy";
import { globSync } from "node:fs";
import { exit } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// The pinned CesiumJS 1.x (the workspace root's cesium-1x dev dependency) and
// the packages it was published with, wherever npm placed them (CS-611).
const require = createRequire(import.meta.url);
const cesium1xManifest = require.resolve("cesium-1x/package.json");
const cesium1x = dirname(cesium1xManifest);
const fromCesium1x = createRequire(cesium1xManifest);
const packageDir = (name: string) =>
  dirname(fromCesium1x.resolve(`@cesium/${name}/package.json`));

function getCesiumVersion() {
  const { version } = JSON.parse(readFileSync(cesium1xManifest, "utf-8"));
  return version;
}

// The dev server serves each file at its path relative to this folder, with
// any leading `../` dropped.
const route = (path: string) =>
  `/${relative(__dirname, path)
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/)+/, "")}`;

// `npm run build` bundles each published package's index.js once per version.
const bundle = (name: string) =>
  join(
    __dirname,
    "node_modules",
    ".cesium-1x-bundles",
    getCesiumVersion(),
    name,
    "index.js",
  );

function checkForFiles(extraFilesList: Target[]) {
  for (const target of extraFilesList) {
    // glob requires forward slashes even on Windows
    const toFwd = (s: string) => s.replace(/\\/g, "/");
    const src = Array.isArray(target.src)
      ? target.src.map(toFwd)
      : toFwd(target.src);
    const files = globSync(src);
    if (files.length === 0) {
      // check for at least 1 file in each location. Some of the directories like Assets/
      // will have many and it's hard to offer suggestions for every file that we might need

      if (target.src.includes(".d.ts")) {
        // probably a missing types file
        console.error(
          "\nYou might be missing types files. Run `pnpm install` at the repository root",
        );
      } else if (target.src.includes(".js") || target.src.includes("/Build/")) {
        // probably missing some built JS files
        console.error(
          "\nYou might be missing the 1.x bundles. Run `npm run build --workspace @cesium/sandcastle` once",
        );
      }

      throw new Error(`Missing files for glob: ${target.src}`);
    }
  }
}

export default defineConfig(({ command }) => {
  if (command === "build") {
    throw Error("This config should not be used to build!");
  }

  const cesiumSource = join(cesium1x, "Build", "CesiumUnminified");
  const sampleData = join(__dirname, "public/SampleData");
  const packages = ["core", "gltf", "engine", "widgets"];

  const extraFiles = [
    { src: `${cesiumSource}/ThirdParty`, dest: "" },
    { src: `${cesiumSource}/Workers`, dest: "" },
    { src: `${cesiumSource}/Assets`, dest: "" },
    { src: `${cesiumSource}/Widgets`, dest: "" },
    { src: `${cesiumSource}/*.{js,cjs}`, dest: "" },
    // public/SampleData at both paths 1.x served it from.
    { src: sampleData, dest: "Apps", rename: { stripBase: 1 } },
    { src: sampleData, dest: "", rename: { stripBase: 1 } },
    { src: join(cesium1x, "Source/Cesium.{d.ts,js}"), dest: "" },
    ...packages.flatMap((name) => [
      { src: join(packageDir(name), "index.d.ts"), dest: "" },
      { src: bundle(name), dest: "" },
    ]),
  ];

  try {
    checkForFiles(extraFiles);
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : error}\n`);
    exit(1);
  }

  const config = createSandcastleConfig({
    outDir: join(__dirname, "dist"),
    basePath: "",
    cesiumBaseUrl: route(cesiumSource),
    cesiumVersion: getCesiumVersion(),
    outerOrigin: "http://localhost:5173",
    innerOrigin: "http://localhost:5173",
    imports: {
      cesium: {
        path: route(join(cesium1x, "Source", "Cesium.js")),
        typesPath: route(join(cesium1x, "Source", "Cesium.d.ts")),
      },
      ...Object.fromEntries(
        packages.map((name) => [
          `@cesium/${name}`,
          {
            path: route(bundle(name)),
            typesPath: route(join(packageDir(name), "index.d.ts")),
          },
        ]),
      ),
    },
    // IN DEV THIS DOES NOT COPY FILES it simply sets up in-memory server routes
    // to the correct locations on disk in the parent directories
    // This config should not be used for the actual build, only development of Sandcastle itself
    copyExtraFiles: extraFiles,
  });

  return config;
});
