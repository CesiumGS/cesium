// @ts-check

import path from "node:path";

import { mkdirp } from "mkdirp";
import { globby } from "globby";

import {
  createIndexJs,
  bundleIndexJs,
  createSpecListForWorkspace,
  bundleSpecs,
} from "../../../scripts/build-utilities.js";

/** @import {CesiumBundles} from "../../../scripts/build-utilities.js"; */

export const sourceGlobs = ["packages/core/Source/*.js"];
export const specGlobs = ["packages/core/Specs/*Spec.js"];

/**
 * Builds the core workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<CesiumBundles>}
 */
export const buildCore = async (options) => {
  // TODO: clean up options access and defaults
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  // Create Build folder to place build artifacts.
  mkdirp.sync("packages/core/Build");

  // Create index.js
  await createIndexJs("core", sourceGlobs);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      `packages/core/Build`,
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: `packages/core/index.js`,
  });

  // Create SpecList.js
  const specFiles = await globby(specGlobs);
  const specListFile = path.join("packages/core/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, "core", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/core/Specs",
    outdir: "packages/core/Build/Specs",
    specListFile: specListFile,
    specMain: "packages/core/Specs/spec-main.js",
    karmaMain: "packages/core/Specs/karma-main.js",
    write: write,
  });

  return contexts;
};
