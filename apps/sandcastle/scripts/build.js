// Builds Sandcastle as static files against the pinned CesiumJS 1.x: the
// workspace root's `cesium-1x` dev dependency, an npm alias of a published
// `cesium` release (CS-611; docs/design/repository-build-and-release.md,
// "Sandcastle"). Nothing comes from a 1.x source tree.
//
//   npm run build --workspace @cesium/sandcastle -- [--out-dir dist]
//     [--outer-origin <url>] [--inner-origin <url>] [--production] [--no-embeddings]
//
// The published @cesium/core, @cesium/gltf, @cesium/engine and
// @cesium/widgets carry their `Source/` modules but no bundle, so this builds
// each one's `index.js` into one unminified module, with the other @cesium
// packages left to the import map, as 1.x's own build did. The output is the
// layout 1.x's deployments used: the app, `Build/CesiumUnminified/` (CesiumJS's
// assets, workers and widgets' CSS), `js/` (the modules the import map names)
// and the sample data.
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { buildStatic, createSandcastleConfig } from "./buildStatic.js";
import { buildGalleryList } from "./buildGallery.js";
import sandcastleConfig from "../sandcastle.config.js";

const here = dirname(fileURLToPath(import.meta.url));
const sandcastleRoot = join(here, "..");
const repositoryRoot = join(sandcastleRoot, "..", "..");

/** The packages the import map names, besides `cesium` itself. */
const PACKAGES = ["core", "gltf", "engine", "widgets"];

/**
 * The pinned 1.x: its version and folder, and the folders of the packages it
 * was published with (resolved from its own folder, wherever npm put them).
 */
function pinned1x() {
  const require = createRequire(import.meta.url);
  let manifest;
  try {
    manifest = require.resolve("cesium-1x/package.json");
  } catch {
    throw new Error(
      "cesium-1x isn't installed: run `npm ci` at the repository root",
    );
  }
  const from = createRequire(manifest);
  const packages = Object.fromEntries(
    PACKAGES.map((name) => [
      name,
      dirname(from.resolve(`@cesium/${name}/package.json`)),
    ]),
  );
  const { version } = JSON.parse(readFileSync(manifest, "utf8"));
  return { version, dir: dirname(manifest), packages };
}

/** One published package's `index.js` as a single unminified module. */
async function bundlePackage(name, packageDir, outDir) {
  await build({
    configFile: false,
    logLevel: "warn",
    root: packageDir,
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      sourcemap: false,
      target: "es2020",
      lib: {
        entry: join(packageDir, "index.js"),
        formats: ["es"],
        fileName: () => "index.js",
      },
      rolldownOptions: {
        // The other 1.x packages load through the import map, one copy each.
        external: (id) => /^@cesium\//.test(id),
      },
    },
  });
  const out = join(outDir, "index.js");
  if (!existsSync(out)) {
    throw new Error(`@cesium/${name}: no bundle at ${out}`);
  }
}

const argv = await yargs(hideBin(process.argv))
  .options({
    "out-dir": {
      type: "string",
      default: "dist",
      description: "Where to write the site, relative to packages/sandcastle",
    },
    "outer-origin": {
      type: "string",
      description:
        "The origin of the Sandcastle app. Defaults to http://localhost:8080",
    },
    "inner-origin": {
      type: "string",
      description:
        "The origin of the viewer iframe. Defaults to the outer origin, or http://localhost:8081",
    },
    production: {
      type: "boolean",
      default: false,
      description: "Leave out gallery entries flagged as development",
    },
    embeddings: {
      type: "boolean",
      default: true,
      description:
        "Generate semantic search embeddings. Pass --no-embeddings to skip (or set SANDCASTLE_NO_EMBEDDINGS=1)",
    },
  })
  .strict()
  .parse();

const outDir = resolve(sandcastleRoot, argv.outDir);
const outerOrigin = argv.outerOrigin ?? "http://localhost:8080";
const innerOrigin =
  argv.innerOrigin ?? argv.outerOrigin ?? "http://localhost:8081";
const pinned = pinned1x();
console.log(`Sandcastle against CesiumJS ${pinned.version} (cesium-1x)`);

// The bundles first, outside the output (the app's build empties it).
const bundles = join(
  sandcastleRoot,
  "node_modules",
  ".cesium-1x-bundles",
  pinned.version,
);
for (const name of PACKAGES) {
  console.log(`Bundling @cesium/${name}…`);
  await bundlePackage(name, pinned.packages[name], join(bundles, name));
}

const imports = Object.fromEntries([
  ["cesium", { path: "/js/Cesium.js", typesPath: "/js/Cesium.d.ts" }],
  ...PACKAGES.map((name) => [
    `@cesium/${name}`,
    { path: `/js/${name}/index.js`, typesPath: `/js/${name}/index.d.ts` },
  ]),
]);

const config = createSandcastleConfig({
  outDir,
  basePath: "./",
  cesiumBaseUrl: "/Build/CesiumUnminified",
  cesiumVersion: pinned.version,
  commitSha: process.env.GITHUB_SHA,
  showCommitInHeader: false,
  branchName:
    process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || undefined,
  outerOrigin,
  innerOrigin,
  imports,
});
await buildStatic(config);

// CesiumJS's static files and the modules the import map names.
const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
};
const cesiumBuild = join(pinned.dir, "Build", "CesiumUnminified");
for (const folder of ["ThirdParty", "Workers", "Assets", "Widgets"]) {
  copy(
    join(cesiumBuild, folder),
    join(outDir, "Build", "CesiumUnminified", folder),
  );
}
for (const file of ["Cesium.js", "index.js", "index.cjs"]) {
  if (existsSync(join(cesiumBuild, file))) {
    copy(
      join(cesiumBuild, file),
      join(outDir, "Build", "CesiumUnminified", file),
    );
  }
}
for (const file of ["Cesium.js", "Cesium.d.ts"]) {
  copy(join(pinned.dir, "Source", file), join(outDir, "js", file));
}
for (const name of PACKAGES) {
  copy(join(bundles, name, "index.js"), join(outDir, "js", name, "index.js"));
  copy(
    join(pinned.packages[name], "index.d.ts"),
    join(outDir, "js", name, "index.d.ts"),
  );
}
// The sample data at both paths 1.x's deployments served it from.
const sampleData = join(repositoryRoot, "Apps", "SampleData");
copy(sampleData, join(outDir, "SampleData"));
copy(sampleData, join(outDir, "Apps", "SampleData"));

// The gallery last: the app's build would clear it. Its paths are relative
// to the gallery's root.
const { root, gallery, sourceUrl } = sandcastleConfig;
const galleryRoot = join(sandcastleRoot, root);
const output = await buildGalleryList({
  rootDirectory: galleryRoot,
  publicDirectory: relative(galleryRoot, outDir),
  galleryFiles: gallery.files,
  sourceUrl,
  defaultThumbnail: gallery.defaultThumbnail,
  searchOptions: gallery.searchOptions,
  defaultFilters: gallery.defaultFilters,
  metadata: gallery.metadata,
  includeDevelopment: !argv.production,
  generateEmbeddings:
    !argv.embeddings || process.env.SANDCASTLE_NO_EMBEDDINGS
      ? false
      : gallery.generateEmbeddings,
});
console.log(
  `Sandcastle built to ${outDir} (${output?.entries.length ?? 0} gallery examples)`,
);
