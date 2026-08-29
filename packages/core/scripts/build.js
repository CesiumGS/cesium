// @ts-check
import path from "node:path";
import { globby } from "globby";
import { mkdirp } from "mkdirp";
import {
  createIndexJs,
  bundleSpecs,
  createSpecListForWorkspace,
} from "../../../scripts/buildUtils.js";

const specFiles = ["packages/core/Specs/**/*Spec.js"];

export const sourceGlobs = ["packages/core/Source/*.js"];

/**
 * Builds the core workspace. All paths are relative to the repo root.
 * @param {object} [options]
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.write=true] True if bundles are written to disk.
 */
export const buildCore = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const write = options.write ?? true;

  mkdirp.sync("packages/core/Build");

  await createIndexJs("core", sourceGlobs);

  const files = await globby(specFiles);
  const specListFile = path.join("packages/core/Specs", "SpecList.js");
  await createSpecListForWorkspace(files, "core", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/core/Specs",
    outdir: "packages/core/Build/Specs",
    specListFile: specListFile,
    specMain: "packages/core/Specs/spec-main.js",
    karmaMain: "packages/core/Specs/karma-main.js",
    write: write,
  });
};
