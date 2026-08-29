// @ts-check
import path from "node:path";
import { globby } from "globby";
import { mkdirp } from "mkdirp";
import {
  createIndexJs,
  bundleIndexJs,
  bundleWorkers,
  bundleSpecs,
  createSpecListForWorkspace,
  glslToJavaScript,
} from "../../../scripts/buildUtils.js";

const specFiles = ["packages/engine/Specs/**/*Spec.js"];

export const sourceGlobs = [
  "packages/engine/Source/**/*.js",
  "!packages/engine/Source/*.js",
  "!packages/engine/Source/Core/globalTypes.js",
  // Excluded so the proxy (TransformsPublicApi) can be exported as Transforms instead
  "!packages/engine/Source/Core/Transforms.js",
  "!packages/engine/Source/Core/TransformsPublicApi.js",
  "!packages/engine/Source/Workers/**",
  "packages/engine/Source/Workers/createTaskProcessorWorker.js",
  "!packages/engine/Source/ThirdParty/Workers/**.js",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];

// TransformsPublicApi.js is exported as Transforms; the filename cannot be used directly.
export const namedExports = {
  Transforms: "Source/Core/TransformsPublicApi.js",
};

/**
 * Builds the engine workspace. All paths are relative to the repo root.
 * @param {object} [options]
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles are written to disk.
 */
export const buildEngine = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  mkdirp.sync("packages/engine/Build");

  await glslToJavaScript(
    minify,
    "packages/engine/Build/minifyShaders.state",
    "engine",
  );

  await createIndexJs("engine", sourceGlobs, namedExports);

  const contexts = await bundleIndexJs({
    minify: minify,
    incremental: incremental,
    sourcemap: true,
    removePragmas: false,
    outputDirectory: path.join(
      "packages/engine/Build",
      `${!minify ? "Unminified" : "Minified"}`,
    ),
    write: write,
    entryPoint: "packages/engine/index.js",
  });

  await bundleWorkers({
    ...options,
    iife: false,
    path: "packages/engine/Build",
  });

  const files = await globby(specFiles);
  const specListFile = path.join("packages/engine/Specs", "SpecList.js");
  await createSpecListForWorkspace(files, "engine", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/engine/Specs",
    outdir: "packages/engine/Build/Specs",
    specListFile: specListFile,
    specMain: "packages/engine/Specs/spec-main.js",
    karmaMain: "packages/engine/Specs/karma-main.js",
    write: write,
  });

  return contexts;
};
