// @ts-check

import { globSync } from "node:fs";
import path from "node:path";

import { mkdirp } from "mkdirp";

import {
  createIndexJs,
  bundleIndexJs,
  createSpecListForWorkspace,
  bundleSpecs,
} from "../../../scripts/build-utilities.js";

/** @import {CesiumBundles} from "../../../scripts/build-utilities.js"; */

// Edit renders into an engine Scene, so its specs rely on engine's runtime
// assets (Workers/Assets/ThirdParty/CSS) at test time.
export { runtimeTestAssetFiles } from "../../engine/scripts/build.js";

export const sourceGlobs = { patterns: ["Source/**/*.js"] };
export const specGlobs = { patterns: ["Specs/**/*Spec.js"] };

/**
 * Builds the edit workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<CesiumBundles>}
 */
export const buildEdit = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  // Create Build folder to place build artifacts.
  mkdirp.sync("packages/edit/Build");

  // Create index.js
  await createIndexJs("edit", sourceGlobs);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      `packages/edit/Build`,
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: `packages/edit/index.js`,
  });

  // Create SpecList.js
  const specFiles = globSync(specGlobs.patterns, { cwd: "packages/edit" });
  const specListFile = path.join("packages/edit/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/edit/Specs",
    outdir: "packages/edit/Build/Specs",
    specListFile: specListFile,
    specMain: "packages/edit/Specs/spec-main.js",
    karmaMain: "packages/edit/Specs/karma-main.js",
    write: write,
  });

  return contexts;
};
