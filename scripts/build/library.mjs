// One package's JavaScript build (CS-612): the shared Vite library build
// every package under packages/ goes through (docs/design/repository-build-
// and-release.md, "Build").
//
//   buildLibrary(packageDir)   writes <packageDir>/dist/**/*.js and dist/assets/
//
// It reads the entry points from the package's `exports` (each entry's
// `@cesium/source` file, built to the file its `default` names) and builds
// ES modules only, for target es2023, with:
//
// - every dependency and peer dependency external, siblings included, so
//   each package's code exists once in an application (`instanceof` holds
//   across packages), and no package's build needs another's output;
// - every module kept as its own file (`preserveModules`), so an
//   application's bundler drops by file and the package's `sideEffects`
//   decide what it pays for;
// - the generated WGSL inlined (`?raw`), and workers, WebAssembly and images
//   emitted as assets under dist/assets/, found through `import.meta.url`;
// - the sky-pack guard and the Basis glue, as in every other build.
//
// A module from node_modules that isn't a declared dependency would be
// bundled into the package; the build fails naming it instead.
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, resolve, sep } from "node:path";
import { build } from "vite";
import { basisTranscoderEsm } from "./basisTranscoderEsm.ts";
import { skyPackGuard } from "./vitePluginSkyPack.ts";

/** The package's `package.json`. */
export function readManifest(packageDir) {
  return JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
}

/**
 * The package's entry points, from its `exports`: each subpath's source
 * file (the `@cesium/source` condition), the module it builds to and its
 * declarations. Throws when an entry's published files don't follow
 * `dist/<name>.js` and `dist/types/<name>.d.ts`, the shape the build writes.
 * @returns {{ subpath: string, name: string, source: string, module: string, types: string }[]}
 */
export function entriesOf(packageDir) {
  const { name: packageName, exports = {} } = readManifest(packageDir);
  const entries = [];
  for (const [subpath, target] of Object.entries(exports)) {
    if (typeof target === "string") {
      continue; // ./package.json and the like: no build.
    }
    const source = target["@cesium/source"];
    if (typeof source !== "string" || !/^\.\/src\/.+\.ts$/.test(source)) {
      throw new Error(
        `${packageName}: export "${subpath}" has no @cesium/source file under src/`,
      );
    }
    const name = source.slice("./src/".length, -".ts".length);
    const module = `./dist/${name}.js`;
    const types = `./dist/types/${name}.d.ts`;
    const keys = Object.keys(target);
    if (
      target.default !== module ||
      target.types !== types ||
      keys.join(",") !== "@cesium/source,types,default"
    ) {
      throw new Error(
        `${packageName}: export "${subpath}" must be { "@cesium/source": "${source}", "types": "${types}", "default": "${module}" }, in that order`,
      );
    }
    entries.push({ subpath, name, source, module, types });
  }
  if (entries.length === 0) {
    throw new Error(`${packageName}: no entry points in exports`);
  }
  return entries;
}

/** Node's built-in modules, with and without `node:`. */
const BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

/**
 * Whether `id` stays an import: a dependency or peer dependency by name (or
 * a subpath of one), or a Node built-in. An import with a query (`?url`,
 * `?raw`, `?worker&url`) is an asset the build emits, so it never is.
 */
export function externalFor(manifest) {
  const names = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ];
  return (id) =>
    !id.includes("?") &&
    (BUILTINS.has(id) ||
      names.some((name) => id === name || id.startsWith(`${name}/`)));
}

/** Vite's preload helper's module and name (vite's buildImportAnalysisPlugin). */
const PRELOAD_HELPER = "\0vite/preload-helper.js";
const PRELOAD_NAME = "__vitePreload";

/**
 * A library's dynamic imports as plain `import()`. An application build
 * wraps every dynamic import in Vite's preload helper; a library built that
 * way would ship the helper, which reaches for `document` and fires Vite's
 * events, and its name: an application's Vite build then adds its own
 * import of `__vitePreload` to the same module and fails on the duplicate.
 * Here the helper only calls the import, under a name of the library's own.
 * (Vite's library mode doesn't add it, but inlines every asset as a data:
 * URL, the wasm included.)
 */
function plainDynamicImports() {
  return {
    name: "cesium-library-dynamic-imports",
    enforce: "pre",
    load(id) {
      return id === PRELOAD_HELPER
        ? `export const ${PRELOAD_NAME} = (load) => load();\n`
        : null;
    },
    renderChunk(code) {
      return code.includes(PRELOAD_NAME)
        ? { code: code.replaceAll(PRELOAD_NAME, "cesiumDynamicImport"), map: null }
        : null;
    },
  };
}

/** Output names for workers' bundles and assets, beside the modules. */
const ASSETS = {
  entryFileNames: "assets/[name]-[hash].js",
  chunkFileNames: "assets/[name]-[hash].js",
  assetFileNames: "assets/[name]-[hash][extname]",
};

/**
 * Builds one package's JavaScript into `<packageDir>/dist/`, next to the
 * declarations (it never empties the folder; scripts/build.mjs does).
 * @param {string} packageDir
 * @param {{ outDir?: string, logLevel?: "info" | "warn" | "error" | "silent" }} [options]
 * @returns {Promise<{ modules: string[], assets: string[] }>} the files written, relative to the output folder
 */
export async function buildLibrary(packageDir, options = {}) {
  const dir = resolve(packageDir);
  const manifest = readManifest(dir);
  const outDir = options.outDir ?? join(dir, "dist");
  const entries = entriesOf(dir);
  const src = join(dir, "src");
  const result = await build({
    configFile: false,
    root: dir,
    base: "./",
    publicDir: false,
    mode: "production",
    logLevel: options.logLevel ?? "warn",
    plugins: [basisTranscoderEsm(), skyPackGuard(), plainDynamicImports()],
    build: {
      outDir,
      emptyOutDir: false,
      target: "es2023",
      // A library: the application's bundler minifies, and reads the code.
      minify: false,
      // Wasm and images as files, not data: URLs in a module.
      assetsInlineLimit: 0,
      // No module preload lists: an application's bundler makes its own.
      modulePreload: false,
      reportCompressedSize: false,
      rolldownOptions: {
        input: Object.fromEntries(
          entries.map((entry) => [entry.name, join(dir, entry.source)]),
        ),
        external: externalFor(manifest),
        // Keep the entries' exports (a library, not an app).
        preserveEntrySignatures: "strict",
        output: {
          format: "es",
          preserveModules: true,
          preserveModulesRoot: src,
          entryFileNames: "[name].js",
          assetFileNames: ASSETS.assetFileNames,
        },
      },
    },
    worker: {
      format: "es",
      // A worker is a file of its own that no bundler revisits: it carries
      // what it imports, dependencies included.
      plugins: () => [basisTranscoderEsm(), skyPackGuard()],
      rolldownOptions: { output: ASSETS },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (r) => r.output,
  );
  const modules = outputs
    .filter((o) => o.type === "chunk")
    .map((o) => o.fileName);
  const assets = outputs
    .filter((o) => o.type === "asset")
    .map((o) => o.fileName);
  // A module kept from node_modules is a dependency the package doesn't
  // declare: an application would get a second copy of it, or none.
  const bundled = outputs
    .filter((o) => o.type === "chunk")
    .flatMap((o) => Object.keys(o.modules ?? {}))
    .filter((id) => /[\\/]node_modules[\\/]/.test(id) && !id.includes("?"))
    .map((id) => id.split(sep).join("/").replace(/^.*\/node_modules\//, ""));
  if (bundled.length > 0) {
    throw new Error(
      `${manifest.name}: the build bundles modules from node_modules that aren't declared dependencies: ${[...new Set(bundled)].join(", ")}`,
    );
  }
  for (const entry of entries) {
    const file = entry.module.slice("./dist/".length);
    if (!modules.includes(file)) {
      throw new Error(
        `${manifest.name}: export "${entry.subpath}" built no ${entry.module}`,
      );
    }
  }
  return { modules, assets };
}
