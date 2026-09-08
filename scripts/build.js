// @ts-check

import { readFile, writeFile } from "node:fs/promises";
import { EOL } from "node:os";
import path from "node:path";
import { finished } from "node:stream/promises";

import esbuild from "esbuild";
import { globby } from "globby";
// @ts-expect-error Types unavailable for gulp v5.
import gulp from "gulp";
import { mkdirp } from "mkdirp";
import { rimraf } from "rimraf";

import {
  bundleWorkers,
  defaultESBuildOptions,
  filePathToModuleId,
  getCopyrightHeader,
  getVersion,
  handleBuildWarnings,
  inlineWorkerPath,
  stripPragmaPlugin,
} from "./build-utilities.js";

/** @import { CesiumBundles, Workspace } from "./build-utilities.js"; */

// Determines the scope of the workspace packages. If the scope is set to cesium, the workspaces should be @cesium/engine.
// This should match the scope of the dependencies of the root level package.json.
const scope = "cesium";

/**
 * Returns the workspace directory names (e.g. "engine", "widgets") that are declared as
 * root package.json dependencies, meaning they are bundled into the combined CesiumJS build.
 * @returns {Promise<string[]>}
 */
async function getCombinedWorkspaceDirectories() {
  const rootPackageJson = JSON.parse(await readFile("package.json", "utf8"));
  const dependencies = Object.keys(rootPackageJson.dependencies);
  return rootPackageJson.workspaces
    .filter((/** @type {string} */ workspace) =>
      dependencies.includes(workspace.replace("packages", `@${scope}`)),
    )
    .map((/** @type {string} */ workspace) =>
      workspace.replace("packages/", ""),
    );
}

/**
 * Source and spec file globs for each workspace bundled into the combined CesiumJS build.
 * @returns {Promise<{sourceFiles: Partial<Record<Workspace, string[]>>, specFiles: Partial<Record<Workspace, string[]>>}>}
 */
async function getCombinedWorkspaceFiles() {
  const directories = await getCombinedWorkspaceDirectories();

  /** @type {Partial<Record<Workspace, string[]>>} */
  const sourceFiles = {};
  /** @type {Partial<Record<Workspace, string[]>>} */
  const specFiles = {};
  for (const directory of directories) {
    const { sourceGlobs, specGlobs } = await import(
      `../packages/${directory}/scripts/build.js`
    );
    sourceFiles[/** @type {Workspace} */ (directory)] = sourceGlobs;
    specFiles[/** @type {Workspace} */ (directory)] = specGlobs;
  }

  return { sourceFiles, specFiles };
}

/**
 * @typedef {CesiumBundles & {
 *   specs: esbuild.BuildResult|esbuild.BuildContext,
 *   workers: esbuild.BuildResult|esbuild.BuildContext|void,
 *   testWorkers: esbuild.BuildResult|esbuild.BuildContext,
 * }} FullCesiumBundles Bundles for the full combined CesiumJS build, including Specs and Workers.
 */

/**
 * Bundles all individual modules, optionally minifying and stripping out debug pragmas.
 * @param {object} options
 * @param {string} options.path Directory where build artifacts are output
 * @param {boolean} [options.minify=false] true if the output should be minified
 * @param {boolean} [options.removePragmas=false] true if the output should have debug pragmas stripped out
 * @param {boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {boolean} [options.iife=false] true if an IIFE style module should be built
 * @param {boolean} [options.node=false] true if a CJS style node module should be built
 * @param {boolean} [options.incremental=false] true if build output should be cached for repeated builds
 * @param {boolean} [options.write=true] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<CesiumBundles>}
 */
export async function bundleCesiumJs(options) {
  const buildConfig = defaultESBuildOptions();
  buildConfig.entryPoints = ["Source/Cesium.js"];
  buildConfig.minify = options.minify;
  buildConfig.sourcemap = options.sourcemap;
  buildConfig.plugins = options.removePragmas ? [stripPragmaPlugin] : undefined;
  buildConfig.write = options.write;
  buildConfig.banner = {
    js: await getCopyrightHeader(),
  };
  // print errors immediately, and collect warnings so we can filter out known ones
  buildConfig.logLevel = "info";

  /** @type {esbuild.BuildResult|esbuild.BuildContext|undefined} */
  let iife;
  /** @type {esbuild.BuildResult|esbuild.BuildContext|undefined} */
  let iifeWorkers;
  /** @type {esbuild.BuildResult|esbuild.BuildContext|undefined} */
  let node;

  const incremental = options.incremental;
  const build = incremental ? esbuild.context : esbuild.build;

  // Build ESM
  const esm = await build({
    ...buildConfig,
    format: "esm",
    outfile: path.join(options.path, "index.js"),
  });

  if (!incremental) {
    handleBuildWarnings(/** @type {esbuild.BuildResult} */ (esm));
  }

  // Build IIFE
  if (options.iife) {
    const iifeWorkersResult = await bundleWorkers({
      iife: true,
      minify: options.minify,
      sourcemap: false,
      path: options.path,
      removePragmas: options.removePragmas,
      incremental: incremental,
      write: options.write,
    });

    const iifeResult = await build({
      ...buildConfig,
      format: "iife",
      inject: [inlineWorkerPath],
      globalName: "Cesium",
      outfile: path.join(options.path, "Cesium.js"),
      logOverride: {
        "empty-import-meta": "silent",
      },
    });

    if (incremental) {
      iife = iifeResult;
      iifeWorkers = /** @type {esbuild.BuildContext} */ (iifeWorkersResult);
    } else {
      handleBuildWarnings(/** @type {esbuild.BuildResult} */ (iifeResult));
      rimraf.sync(inlineWorkerPath);
    }
  }

  if (options.node) {
    const nodeResult = await build({
      ...buildConfig,
      format: "cjs",
      platform: "node",
      logOverride: {
        "empty-import-meta": "silent",
      },
      define: {
        // TransformStream is a browser-only implementation depended on by zip.js
        TransformStream: "null",
      },
      outfile: path.join(options.path, "index.cjs"),
    });

    if (incremental) {
      node = nodeResult;
    } else {
      handleBuildWarnings(/** @type {esbuild.BuildResult} */ (nodeResult));
    }
  }

  return {
    esm: incremental ? esm : undefined,
    iife,
    iifeWorkers,
    node,
  };
}

// TODO: this is duplicated in build-utilities.js, and only used for the workspace file dictionaries, which we want to get rid of.

/**
 * Generates export declaration from a file from a workspace.
 *
 * @param {string} workspace The workspace the file belongs to.
 * @param {string} file The file.
 * @returns {string} The export declaration.
 */
function generateDeclaration(workspace, file) {
  let assignmentName = path.basename(file, path.extname(file));

  let moduleId = file;
  moduleId = filePathToModuleId(moduleId);

  if (moduleId.indexOf("Source/Shaders") > -1) {
    assignmentName = `_shaders${assignmentName}`;
  }
  assignmentName = assignmentName.replace(/(\.|-)/g, "_");
  return `export { ${assignmentName} } from '@${scope}/${workspace}';`;
}

/**
 * Creates a single entry point file, Cesium.js, which imports all individual modules exported from the Cesium API.
 * @returns {Promise<string>} contents
 */
export async function createCesiumJs() {
  const version = await getVersion();
  let contents = `export const VERSION = '${version}';\n`;

  // Iterate over each workspace and generate declarations for each file.
  const { sourceFiles } = await getCombinedWorkspaceFiles();
  for (const workspace of Object.keys(sourceFiles)) {
    const sources = sourceFiles[/** @type {Workspace} */ (workspace)];
    if (!sources) {
      continue;
    }
    const files = await globby(sources);
    const declarations = files.map((file) =>
      generateDeclaration(workspace, file),
    );
    contents += declarations.join(`${EOL}`);
    contents += "\n";
  }
  await writeFile("Source/Cesium.js", contents, { encoding: "utf-8" });

  return contents;
}

/**
 * Creates a single entry point file, Specs/SpecList.js, which imports all individual spec files.
 * @returns {Promise<string>} contents
 */
export async function createCombinedSpecList() {
  const version = await getVersion();
  let contents = `export const VERSION = '${version}';\n`;

  const { specFiles } = await getCombinedWorkspaceFiles();
  for (const workspace of Object.keys(specFiles)) {
    const sources = specFiles[/** @type {Workspace} */ (workspace)];
    if (!sources) {
      continue;
    }
    const files = await globby(sources);
    for (const file of files) {
      contents += `import '../${file}';\n`;
    }
  }

  await writeFile(path.join("Specs", "SpecList.js"), contents, {
    encoding: "utf-8",
  });

  return contents;
}

/** @type {esbuild.Plugin} */
const externalResolvePlugin = {
  name: "external-cesium",
  setup: (build) => {
    // In Specs, when we import files from the source files, we import
    // them from the index.js files. This plugin replaces those imports
    // with the IIFE Cesium.js bundle that's loaded in the browser
    // in SpecRunner.html.
    build.onResolve({ filter: new RegExp(`index\.js$`) }, () => {
      return {
        path: "Cesium",
        namespace: "external-cesium",
      };
    });

    build.onResolve({ filter: /@cesium/ }, () => {
      return {
        path: "Cesium",
        namespace: "external-cesium",
      };
    });

    build.onLoad(
      {
        filter: new RegExp(`^Cesium$`),
        namespace: "external-cesium",
      },
      () => {
        const contents = `module.exports = Cesium`;
        return {
          contents,
        };
      },
    );
  },
};

/** @typedef {{name: string, isNew: boolean, img?: string}} DemoObject */

/**
 * Helper function to copy files.
 *
 * @param {string[]} globs The file globs to be copied.
 * @param {string} destination The path to copy the files to.
 * @param {string} base The base path to omit from the globs when files are copied. Defaults to "".
 * @returns {Promise<NodeJS.ReadWriteStream>} A promise resolving to the stream.
 */
async function copyFiles(globs, destination, base) {
  const stream = gulp
    .src(globs, { base: base ?? "", encoding: false })
    .pipe(gulp.dest(destination));

  await finished(stream);
  return stream;
}

/**
 * Copy assets from engine.
 *
 * @param {string} destination The path to copy files to.
 * @returns {Promise<void>} A promise that completes when all assets are copied to the destination.
 */
async function copyEngineAssets(destination) {
  const engineStaticAssets = [
    "packages/engine/Source/**",
    "!packages/engine/Source/**/*.js",
    "!packages/engine/Source/**/*.ts",
    "!packages/engine/Source/**/*.glsl",
    "!packages/engine/Source/**/*.css",
    "!packages/engine/Source/**/*.md",
  ];

  await copyFiles(engineStaticAssets, destination, "packages/engine/Source");

  // Since the CesiumWidget was part of the Widgets folder, the files must be manually
  // copied over to the right directory.

  await copyFiles(
    ["packages/engine/Source/Widget/**", "!packages/engine/Source/Widget/*.js"],
    path.join(destination, "Widgets/CesiumWidget"),
    "packages/engine/Source/Widget",
  );
}

/**
 * Copy assets from widgets.
 *
 * @param {string} destination The path to copy files to.
 * @returns {Promise<void>} A promise that completes when all assets are copied to the destination.
 */
async function copyWidgetsAssets(destination) {
  const widgetsStaticAssets = [
    "packages/widgets/Source/**",
    "!packages/widgets/Source/**/*.js",
    "!packages/widgets/Source/**/*.ts",
    "!packages/widgets/Source/**/*.css",
    "!packages/widgets/Source/**/*.glsl",
    "!packages/widgets/Source/**/*.md",
  ];

  await copyFiles(widgetsStaticAssets, destination, "packages/widgets/Source");
}

/**
 * Bundles spec files for testing in the browser and on the command line with karma.
 * @param {object} options
 * @param {boolean} [options.incremental=false] true if the build should be cached for repeated rebuilds
 * @param {boolean} [options.write=false] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<esbuild.BuildResult|esbuild.BuildContext>}
 */
async function bundleCombinedSpecs(options) {
  options = options || {};

  const build = options.incremental ? esbuild.context : esbuild.build;

  return build({
    entryPoints: [
      "Specs/spec-main.js",
      "Specs/SpecList.js",
      "Specs/karma-main.js",
    ],
    bundle: true,
    format: "esm",
    sourcemap: true,
    outdir: path.join("Build", "Specs"),
    plugins: [externalResolvePlugin],
    write: options.write,
  });
}

/**
 * Bundles test worker in used specs.
 * @param {object} options
 * @param {boolean} [options.incremental=false] true if the build should be cached for repeated rebuilds
 * @param {boolean} [options.write=false] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<esbuild.BuildResult|esbuild.BuildContext>}
 */
async function bundleTestWorkers(options) {
  options = options || {};

  const build = options.incremental ? esbuild.context : esbuild.build;

  const workers = await globby(["Specs/TestWorkers/**.js"]);
  return build({
    entryPoints: workers,
    bundle: true,
    format: "esm",
    sourcemap: true,
    outdir: path.join("Build", "Specs", "TestWorkers"),
    external: ["fs", "path"],
    write: options.write,
  });
}

/**
 * Bundles CSS files.
 *
 * @param {object} options
 * @param {string[]} options.filePaths The file paths to bundle.
 * @param {boolean} [options.sourcemap]
 * @param {boolean} [options.minify]
 * @param {string} options.outdir The output directory.
 * @param {string} options.outbase The
 */
async function bundleCSS(options) {
  // Configure options for esbuild.
  const esBuildOptions = defaultESBuildOptions();
  esBuildOptions.entryPoints = await globby(options.filePaths);
  esBuildOptions.loader = {
    ".gif": "text",
    ".png": "text",
  };
  esBuildOptions.sourcemap = options.sourcemap;
  esBuildOptions.minify = options.minify;
  esBuildOptions.outdir = options.outdir;
  esBuildOptions.outbase = options.outbase;

  await esbuild.build(esBuildOptions);
}

/**
 * @param {Workspace} workspace The workspace directory name, e.g. "engine".
 * @returns {string[]} CSS file globs for the workspace.
 */
function cssGlobsFor(workspace) {
  return [`packages/${workspace}/Source/**/*.css`];
}

/**
 * Build CesiumJS.
 *
 * @param {object} options
 * @param {boolean} [options.iife=true] True if IIFE bundle should be generated.
 * @param {boolean} [options.incremental=true] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.node=true] True if CommonJS bundle should be generated.
 * @param {string} options.outputDirectory The directory where the output should go.
 * @param {boolean} [options.removePragmas=false] True if debug pragmas should be removed.
 * @param {boolean} [options.sourcemap=true] True if sourcemap should be included in the generated bundles.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<FullCesiumBundles>}
 */
export async function buildCesium(options) {
  const iife = options.iife ?? true;
  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const node = options.node ?? true;
  const removePragmas = options.removePragmas ?? false;
  const sourcemap = options.sourcemap ?? true;
  const write = options.write ?? true;

  // Generate Build folder to place build artifacts.
  mkdirp.sync("Build");
  const outputDirectory =
    options.outputDirectory ??
    path.join("Build", `Cesium${!minify ? "Unminified" : ""}`);
  rimraf.sync(outputDirectory);

  await writeFile(
    "Build/package.json",
    JSON.stringify({
      type: "commonjs",
    }),
    "utf8",
  );

  // Create Cesium.js
  await createCesiumJs();

  // Create SpecList.js
  await createCombinedSpecList();

  // Bundle ThirdParty files.
  await bundleCSS({
    filePaths: [
      "packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
    ],
    minify: minify,
    sourcemap: sourcemap,
    outdir: outputDirectory,
    outbase: "packages/engine/Source",
  });

  // Bundle CSS files.
  await bundleCSS({
    filePaths: cssGlobsFor("engine"),
    outdir: path.join(outputDirectory, "Widgets/CesiumWidget"),
    outbase: "packages/engine/Source/Widget",
  });
  await bundleCSS({
    filePaths: cssGlobsFor("widgets"),
    outdir: path.join(outputDirectory, "Widgets"),
    outbase: "packages/widgets/Source",
  });

  const workersContext = await bundleWorkers({
    iife: false,
    minify: minify,
    sourcemap: sourcemap,
    path: outputDirectory,
    removePragmas: removePragmas,
    incremental: incremental,
    write: write,
  });

  // Generate bundles.
  const contexts = await bundleCesiumJs({
    minify: minify,
    iife: iife,
    incremental: incremental,
    sourcemap: sourcemap,
    removePragmas: removePragmas,
    path: outputDirectory,
    node: node,
    write: write,
  });

  // Generate Specs bundle.
  const specsContext = await bundleCombinedSpecs({
    incremental: incremental,
    write: write,
  });

  const testWorkersContext = await bundleTestWorkers({
    incremental: incremental,
    write: write,
  });

  // Copy static assets to the Build folder.

  await copyEngineAssets(outputDirectory);
  await copyWidgetsAssets(path.join(outputDirectory, "Widgets"));

  // Copy static assets to Source folder.

  await copyEngineAssets("Source");
  await copyFiles(
    ["packages/engine/Source/ThirdParty/**/*.js"],
    "Source/ThirdParty",
    "packages/engine/Source/ThirdParty",
  );

  await copyWidgetsAssets("Source/Widgets");
  await copyFiles(
    ["packages/widgets/Source/**/*.css"],
    "Source/Widgets",
    "packages/widgets/Source",
  );

  // WORKAROUND:
  // Since CesiumWidget was originally part of the Widgets folder, we need to fix up any
  // references to it when we put it back in the Widgets folder, as expected by the
  // combined CesiumJS structure.
  const widgetsCssBuffer = await readFile("Source/Widgets/widgets.css");
  const widgetsCssContents = widgetsCssBuffer
    .toString()
    .replace("../../engine/Source/Widget", "./CesiumWidget");
  await writeFile("Source/Widgets/widgets.css", widgetsCssContents);

  const lighterCssBuffer = await readFile("Source/Widgets/lighter.css");
  const lighterCssContents = lighterCssBuffer
    .toString()
    .replace("../../engine/Source/Widget", "./CesiumWidget");
  await writeFile("Source/Widgets/lighter.css", lighterCssContents);

  return {
    esm: contexts.esm,
    iife: contexts.iife,
    iifeWorkers: contexts.iifeWorkers,
    node: contexts.node,
    specs: specsContext,
    workers: workersContext,
    testWorkers: testWorkersContext,
  };
}
