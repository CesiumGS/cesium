// @ts-check

import { globSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

import {
  createIndexJs,
  bundleIndexJs,
  createSpecListForWorkspace,
  bundleSpecs,
  copyFiles,
} from "../../../scripts/build-utilities.js";

/** @import {CesiumBundles} from "../../../scripts/build-utilities.js"; */

// Edit renders into an engine Scene, so its build output also holds engine's
// runtime assets. Specs set CESIUM_BASE_URL to it.
export const runtimeTestAssetFiles = [
  { pattern: "packages/edit/Build/Workers/**", included: false },
  { pattern: "packages/edit/Build/Assets/**", included: false },
  { pattern: "packages/edit/Build/ThirdParty/**", included: false },
  { pattern: "packages/edit/Build/Widgets/CesiumWidget/**", included: false },
];

export const sourceGlobs = { patterns: ["Source/**/*.js"] };
export const specGlobs = { patterns: ["Specs/**/*Spec.js"] };

/**
 * Copies edit's static assets to a destination.
 *
 * @param {string} destination The path to copy files to.
 * @returns {Promise<void>} A promise that completes when all assets are copied to the destination.
 */
export async function copyEditAssets(destination) {
  const editStaticAssets = [
    "packages/edit/Source/**",
    "!packages/edit/Source/**/*.js",
    "!packages/edit/Source/**/*.ts",
    "!packages/edit/Source/**/*.css",
    "!packages/edit/Source/**/*.glsl",
    "!packages/edit/Source/**/*.md",
  ];

  await copyFiles(editStaticAssets, destination, "packages/edit/Source");
}

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
  mkdirSync("packages/edit/Build", { recursive: true });

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

  // Copy engine's built runtime assets and edit's own static assets, so
  // package-scoped tests can resolve all of them from one base URL.
  const engineBuild = "packages/engine/Build";
  if (!existsSync(path.join(engineBuild, "Workers"))) {
    throw new Error(
      "Edit's build copies engine's runtime assets. Build engine first: npx gulp build --workspace @cesium/engine",
    );
  }
  await copyFiles(
    [
      `${engineBuild}/Workers/**`,
      `${engineBuild}/Assets/**`,
      `${engineBuild}/ThirdParty/**`,
      `${engineBuild}/Widgets/**`,
    ],
    "packages/edit/Build",
    engineBuild,
  );
  await copyEditAssets("packages/edit/Build");

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
