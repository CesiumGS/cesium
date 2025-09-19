import { build, defineConfig } from "vite";
import baseConfig from "../vite.config.js";
import { fileURLToPath } from "url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { dirname, join } from "path";
import { cesiumPathReplace, insertImportMap } from "../vite-plugins.js";

/** @import { UserConfig } from 'vite' */

/**
 * @typedef {Object} ImportObject
 * @property {string} path The path to use for the import map. ie the path the app can expect to find this at
 * @property {string} typesPath The path to use for intellisense types in monaco
 */

/**
 * @typedef {Object<string, ImportObject>} ImportList
 */

/**
 * Check if the given key is in the imports list and throw an error if not
 * @param {ImportList} imports
 * @param {string} name
 */
function checkForImport(imports, name) {
  if (!imports[name]) {
    throw new Error(`Missing import for ${name}`);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Create the Vite configuration for building Sandcastle.
 * Set where it should build to and the base path for vite and CesiumJS files.
 *
 * Most importantly specify the paths the app can find the library imports
 *
 * @param {object} options
 * @param {string} options.outDir Path to build files into
 * @param {string} options.viteBase Base path for files/routes
 * @param {string} options.cesiumBaseUrl Base path for CesiumJS. This should include the CesiumJS assets and workers etc.
 * @param {string} [options.commitSha] Optional commit hash to display in the top right of the application
 * @param {ImportList} options.imports Set of imports to add to the import map for the iframe and standalone html pages. These paths should match the URL where it can be accessed within the current environment.
 * @param {{src: string, dest: string}[]} [options.copyExtraFiles] Extra paths passed to viteStaticCopy. Use this to consolidate files for a singular static deployment (ie during production). Source paths should be absolute, dest paths should be relative to the page root
 */
export function createSandcastleConfig({
  outDir,
  viteBase,
  cesiumBaseUrl,
  commitSha,
  imports,
  copyExtraFiles = [],
}) {
  /** @type {UserConfig} */
  const config = { ...baseConfig };

  config.base = viteBase;

  config.build = {
    ...config.build,
    outDir: outDir,
  };

  const copyPlugin = viteStaticCopy({
    targets: [
      { src: "templates/Sandcastle.(d.ts|js)", dest: "templates" },
      ...copyExtraFiles,
    ],
  });

  checkForImport(imports, "cesium");
  checkForImport(imports, "@cesium/engine");
  checkForImport(imports, "@cesium/widgets");
  if (imports["Sandcastle"]) {
    throw new Error(
      "Don't specify the Sandcastle import this is taken care of internally",
    );
  }

  /** @type {Object<string, string>} */
  const importMap = {
    Sandcastle: `${viteBase}/templates/Sandcastle.js`,
  };
  /** @type {Object<string, string>} */
  const typePaths = {
    Sandcastle: "templates/Sandcastle.d.ts",
  };
  for (const [key, value] of Object.entries(imports)) {
    importMap[key] = value.path;
    typePaths[key] = value.typesPath;
  }

  config.define = {
    ...config.define,
    __VITE_TYPE_IMPORT_PATHS__: JSON.stringify(typePaths),
    __COMMIT_SHA__: JSON.stringify(commitSha ?? undefined),
  };

  const plugins = config.plugins ?? [];
  config.plugins = [
    ...plugins,
    copyPlugin,
    cesiumPathReplace(cesiumBaseUrl),
    insertImportMap(importMap, ["bucket.html", "standalone.html"]),
  ];

  return defineConfig(config);
}

/**
 * @param {UserConfig} config
 */
export async function buildStatic(config) {
  await build({
    ...config,
    root: join(__dirname, "../"),
  });
}
