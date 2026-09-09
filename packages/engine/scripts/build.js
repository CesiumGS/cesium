// @ts-check

import path from "node:path";

import { mkdirp } from "mkdirp";
import { globby } from "globby";

import {
  glslToJavaScript,
  createIndexJs,
  bundleIndexJs,
  bundleWorkers,
  createSpecListForWorkspace,
  bundleSpecs,
} from "../../../scripts/build-utilities.js";

/** @import {CesiumBundles} from "../../../scripts/build-utilities.js"; */

export const sourceGlobs = [
  "packages/engine/Source/**/*.js",
  "!packages/engine/Source/*.js",
  "!packages/engine/Source/Core/globalTypes.js",
  "!packages/engine/Source/Workers/**",
  "packages/engine/Source/Workers/createTaskProcessorWorker.js",
  "!packages/engine/Source/ThirdParty/Workers/**.js",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];
export const specGlobs = ["packages/engine/Specs/**/*Spec.js"];

/** Karma file patterns for runtime assets (workers, static assets, ThirdParty files, widget CSS). */
export const runtimeTestAssetFiles = [
  { pattern: "packages/engine/Build/Workers/**", included: false },
  { pattern: "packages/engine/Source/Assets/**", included: false },
  { pattern: "packages/engine/Source/ThirdParty/**", included: false },
  { pattern: "packages/engine/Source/Widget/*.css", included: false },
];

/** Karma proxies from the combined CesiumJS build layout to these runtime assets. */
export const runtimeTestAssetProxies = {
  "/base/Build/CesiumUnminified/Assets/":
    "/base/packages/engine/Source/Assets/",
  "/base/Build/CesiumUnminified/ThirdParty/":
    "/base/packages/engine/Source/ThirdParty/",
  "/base/Build/CesiumUnminified/Widgets/CesiumWidget/":
    "/base/packages/engine/Source/Widget/",
  "/base/Build/CesiumUnminified/Workers/":
    "/base/packages/engine/Build/Workers/",
};

/**
 * Builds the engine workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<CesiumBundles>}
 */
export const buildEngine = async (options) => {
  // TODO: clean up options access and defaults
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  // Create Build folder to place build artifacts.
  mkdirp.sync("packages/engine/Build");

  // Convert GLSL files to JavaScript modules.
  await glslToJavaScript(
    minify,
    "packages/engine/Build/minifyShaders.state",
    "engine",
  );

  // Create index.js
  await createIndexJs("engine", sourceGlobs);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      `packages/engine/Build`,
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: `packages/engine/index.js`,
  });

  // Build workers.
  await bundleWorkers({
    ...options,
    iife: false,
    path: "packages/engine/Build",
  });

  // Create SpecList.js
  const specFiles = await globby(specGlobs);
  const specListFile = path.join("packages/engine/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, "engine", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/engine/Specs",
    outdir: "packages/engine/Build/Specs",
    specListFile: specListFile,
    write: write,
  });

  return contexts;
};
