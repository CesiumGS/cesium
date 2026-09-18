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

export const sourceGlobs = ["packages/gltf/Source/*.js"];
export const specGlobs = ["packages/gltf/Specs/*Spec.js"];

/**
 * Builds the gltf workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<CesiumBundles>}
 */
export const buildGltf = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  // Create Build folder to place build artifacts.
  mkdirp.sync("packages/gltf/Build");

  // Create index.js
  await createIndexJs("gltf", sourceGlobs);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      `packages/gltf/Build`,
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: `packages/gltf/index.js`,
  });

  // Create SpecList.js
  const specFiles = await globby(specGlobs);
  const specListFile = path.join("packages/gltf/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, "gltf", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/gltf/Specs",
    outdir: "packages/gltf/Build/Specs",
    specListFile: specListFile,
    specMain: "packages/gltf/Specs/spec-main.js",
    karmaMain: "packages/gltf/Specs/karma-main.js",
    write: write,
  });

  return contexts;
};
