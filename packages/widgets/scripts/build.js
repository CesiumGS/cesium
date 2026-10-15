// @ts-check

import path from "node:path";

import { mkdirp } from "mkdirp";
import { globby } from "globby";

import {
  createIndexJs,
  bundleIndexJs,
  copyFiles,
  createSpecListForWorkspace,
  bundleSpecs,
} from "../../../scripts/build-utilities.js";

/** @import {CesiumBundles} from "../../../scripts/build-utilities.js"; */

// Widgets depends on engine's runtime assets (Workers/Assets/ThirdParty/CSS) at runtime.
export { runtimeTestAssetFiles } from "../../engine/scripts/build.js";

export const sourceGlobs = ["packages/widgets/Source/**/*.js"];
export const specGlobs = ["packages/widgets/Specs/**/*Spec.js"];

/**
 * Copies widgets' static assets to a destination.
 *
 * @param {string} destination The path to copy files to.
 * @returns {Promise<void>} A promise that completes when all assets are copied to the destination.
 */
export async function copyWidgetsAssets(destination) {
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
 * Builds the widgets workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<CesiumBundles>}
 */
export const buildWidgets = async (options) => {
  // TODO: clean up options access and defaults
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  // Generate Build folder to place build artifacts.
  mkdirp.sync("packages/widgets/Build");

  // Create index.js
  await createIndexJs("widgets", sourceGlobs);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      `packages/widgets/Build`,
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: `packages/widgets/index.js`,
  });

  // Create SpecList.js
  const specFiles = await globby(specGlobs);
  const specListFile = path.join("packages/widgets/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, "widgets", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/widgets/Specs",
    outdir: "packages/widgets/Build/Specs",
    specListFile: specListFile,
    specMain: "packages/widgets/Specs/spec-main.js",
    karmaMain: "packages/widgets/Specs/karma-main.js",
    write: write,
  });

  return contexts;
};
