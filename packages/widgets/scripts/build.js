// @ts-check
import path from "node:path";
import { globby } from "globby";
import { mkdirp } from "mkdirp";
import {
  createIndexJs,
  bundleIndexJs,
  bundleSpecs,
  createSpecListForWorkspace,
} from "../../../scripts/buildUtils.js";

const specFiles = ["packages/widgets/Specs/**/*Spec.js"];

export const sourceGlobs = ["packages/widgets/Source/**/*.js"];

/**
 * Builds the widgets workspace. All paths are relative to the repo root.
 * @param {object} [options]
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles are written to disk.
 */
export const buildWidgets = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  mkdirp.sync("packages/widgets/Build");

  await createIndexJs("widgets", sourceGlobs);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      "packages/widgets/Build",
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: "packages/widgets/index.js",
  });

  const files = await globby(specFiles);
  const specListFile = path.join("packages/widgets/Specs", "SpecList.js");
  await createSpecListForWorkspace(files, "widgets", specListFile);

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
