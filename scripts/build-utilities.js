import assert from "node:assert";
import { existsSync, readFileSync, statSync } from "node:fs";
import { EOL } from "node:os";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { finished } from "node:stream/promises";

import esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { globby } from "globby";
// @ts-expect-error Types unavailable.
import glslStripComments from "glsl-strip-comments";
import gulp from "gulp";
import { rimraf } from "rimraf";

// Determines the scope of the workspace packages. If the scope is set to cesium, the workspaces should be @cesium/engine.
// This should match the scope of the dependencies of the root level package.json.
const scope = "cesium";

/**
 * Returns the workspace directory names declared in the root package.json (e.g. "engine").
 * @param {boolean} [onlyPublished=false] True to only return workspaces that are dependencies of
 * the root package.json, meaning they are published packages bundled into the combined CesiumJS build.
 * @returns {string[]}
 */
export function getWorkspaces(onlyPublished = false) {
  const rootPackageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const dependencies = Object.keys(rootPackageJson.dependencies);
  const workspaces = onlyPublished
    ? rootPackageJson.workspaces.filter((/** @type {string} */ workspace) =>
        dependencies.includes(workspace.replace("packages", `@${scope}`)),
      )
    : rootPackageJson.workspaces;
  return workspaces.map((/** @type {string} */ workspace) =>
    workspace.replace("packages/", ""),
  );
}

/**
 * Copies files matching the given globs to a destination.
 *
 * @param {string[]} globs The file globs to be copied.
 * @param {string} destination The path to copy the files to.
 * @param {string} [base] The base path to omit from the globs when files are copied. Defaults to "".
 * @returns {Promise<NodeJS.ReadWriteStream>} A promise resolving to the stream.
 */
export async function copyFiles(globs, destination, base) {
  const stream = gulp
    .src(globs, { base: base ?? "", encoding: false })
    .pipe(gulp.dest(destination));

  await finished(stream);
  return stream;
}

export const shaderFiles = [
  "packages/engine/Source/Shaders/**/*.glsl",
  "packages/engine/Source/ThirdParty/Shaders/*.glsl",
];

/**
 * @param {boolean} minify
 * @param {string} minifyStateFilePath
 * @param {Workspace} workspace
 */
export async function glslToJavaScript(minify, minifyStateFilePath, workspace) {
  await writeFile(minifyStateFilePath, minify.toString());
  const minifyStateFileLastModified = existsSync(minifyStateFilePath)
    ? statSync(minifyStateFilePath).mtime.getTime()
    : 0;

  // collect all currently existing JS files into a set, later we will remove the ones
  // we still are using from the set, then delete any files remaining in the set.
  /** @type {Record<string, boolean>} */
  const leftOverJsFiles = {};

  const files = await globby([
    `packages/${workspace}/Source/Shaders/**/*.js`,
    `packages/${workspace}/Source/ThirdParty/Shaders/*.js`,
  ]);
  files.forEach(function (file) {
    leftOverJsFiles[path.normalize(file)] = true;
  });

  /** @type {string[]} */
  const builtinFunctions = [];
  /** @type {string[]} */
  const builtinConstants = [];
  /** @type {string[]} */
  const builtinStructs = [];

  const glslFiles = await globby(shaderFiles);
  await Promise.all(
    glslFiles.map(async function (glslFile) {
      glslFile = path.normalize(glslFile);
      const baseName = path.basename(glslFile, ".glsl");
      const jsFile = `${path.join(path.dirname(glslFile), baseName)}.js`;

      // identify built in functions, structs, and constants
      const baseDir = path.join(
        `packages/${workspace}/`,
        "Source",
        "Shaders",
        "Builtin",
      );
      if (
        glslFile.indexOf(path.normalize(path.join(baseDir, "Functions"))) === 0
      ) {
        builtinFunctions.push(baseName);
      } else if (
        glslFile.indexOf(path.normalize(path.join(baseDir, "Constants"))) === 0
      ) {
        builtinConstants.push(baseName);
      } else if (
        glslFile.indexOf(path.normalize(path.join(baseDir, "Structs"))) === 0
      ) {
        builtinStructs.push(baseName);
      }

      delete leftOverJsFiles[jsFile];

      const jsFileExists = existsSync(jsFile);
      const jsFileModified = jsFileExists
        ? statSync(jsFile).mtime.getTime()
        : 0;
      const glslFileModified = statSync(glslFile).mtime.getTime();

      if (
        jsFileExists &&
        jsFileModified > glslFileModified &&
        jsFileModified > minifyStateFileLastModified
      ) {
        return;
      }

      let contents = await readFile(glslFile, { encoding: "utf8" });
      contents = contents.replace(/\r\n/gm, "\n");

      let copyrightComments = "";
      const extractedCopyrightComments = contents.match(
        /\/\*\*(?:[^*\/]|\*(?!\/)|\n)*?@license(?:.|\n)*?\*\//gm,
      );
      if (extractedCopyrightComments) {
        copyrightComments = `${extractedCopyrightComments.join("\n")}\n`;
      }

      if (minify) {
        contents = glslStripComments(contents);
        contents = contents
          .replace(/\s+$/gm, "")
          .replace(/^\s+/gm, "")
          .replace(/\n+/gm, "\n");
        contents += "\n";
      }

      contents = contents.split('"').join('\\"').replace(/\n/gm, "\\n\\\n");
      contents = `${copyrightComments}\
//This file is automatically rebuilt by the Cesium build process.\n\
export default "${contents}";\n`;

      return writeFile(jsFile, contents);
    }),
  );

  // delete any left over JS files from old shaders
  Object.keys(leftOverJsFiles).forEach(function (filepath) {
    rimraf.sync(filepath);
  });

  /**
   * @param {typeof contents} contents
   * @param {string[]} builtins
   * @param {string} path
   */
  const generateBuiltinContents = function (contents, builtins, path) {
    for (let i = 0; i < builtins.length; i++) {
      const builtin = builtins[i];
      contents.imports.push(
        `import czm_${builtin} from './${path}/${builtin}.js'`,
      );
      contents.builtinLookup.push(`czm_${builtin} : ` + `czm_${builtin}`);
    }
  };

  //generate the JS file for Built-in GLSL Functions, Structs, and Constants
  const contents = {
    imports: /** @type {string[]} */ ([]),
    builtinLookup: /** @type {string[]} */ ([]),
  };
  generateBuiltinContents(contents, builtinConstants, "Constants");
  generateBuiltinContents(contents, builtinStructs, "Structs");
  generateBuiltinContents(contents, builtinFunctions, "Functions");

  const fileContents = `//This file is automatically rebuilt by the Cesium build process.\n${contents.imports.join(
    "\n",
  )}\n\nexport default {\n    ${contents.builtinLookup.join(",\n    ")}\n};\n`;

  return writeFile(
    path.join(
      `packages/${workspace}/`,
      "Source",
      "Shaders",
      "Builtin",
      "CzmBuiltins.js",
    ),
    fileContents,
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");

export async function getVersion() {
  const data = await readFile(packageJsonPath, "utf8");
  const { version } = JSON.parse(data);
  return version;
}

/** @param {string} moduleId */
export function filePathToModuleId(moduleId) {
  return moduleId.substring(0, moduleId.lastIndexOf(".")).replace(/\\/g, "/");
}

/** @typedef {'engine'|'widgets'} Workspace */

/**
 * Creates a filter matching a workspace's Source files, for use with coverage instrumentation.
 * @param {Workspace} workspace The workspace directory name, e.g. "engine".
 * @returns {RegExp}
 */
export function createCoverageFilter(workspace) {
  return new RegExp(
    String.raw`packages(\\|\/)${workspace}(\\|\/)Source((\\|\/)\w+)+\.js$`,
  );
}

/** @returns {Partial<esbuild.BuildOptions>} */
export const defaultESBuildOptions = () => {
  return {
    bundle: true,
    color: true,
    legalComments: `inline`,
    logLimit: 0,
    target: `es2020`,
  };
};

export async function getCopyrightHeader() {
  const copyrightHeaderTemplate = await readFile(
    path.join("Source", "copyrightHeader.js"),
    "utf8",
  );
  return copyrightHeaderTemplate.replace("${version}", await getVersion());
}

/**
 * Creates the index.js for a package.
 *
 * @param {Workspace} workspace The workspace to create the index.js for.
 * @param {string[]} sourceGlobs The globs to use to find source files for the workspace.
 * @returns {Promise<string>}
 */
export async function createIndexJs(workspace, sourceGlobs) {
  const version = await getVersion();
  let contents = `globalThis.CESIUM_VERSION = "${version}";\n`;

  // Iterate over all provided source files for the workspace and export the assignment based on file name.
  const files = await globby(sourceGlobs);
  files.forEach(function (file) {
    file = path.relative(`packages/${workspace}`, file);

    let moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    // Rename shader files, such that ViewportQuadFS.glsl is exported as _shadersViewportQuadFS in JS.

    let assignmentName = path.basename(file, path.extname(file));
    if (moduleId.indexOf(`Source/Shaders/`) === 0) {
      assignmentName = `_shaders${assignmentName}`;
    }
    assignmentName = assignmentName.replace(/(\.|-)/g, "_");
    contents += `export { default as ${assignmentName} } from './${moduleId}.js';${EOL}`;
  });

  await writeFile(`packages/${workspace}/index.js`, contents, {
    encoding: "utf-8",
  });

  return contents;
}

/** @param {string} token */
function escapeCharacters(token) {
  return token.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/**
 * @param {string} pragma
 * @param {boolean} exclusive
 */
function constructRegex(pragma, exclusive) {
  const prefix = exclusive ? "exclude" : "include";
  pragma = escapeCharacters(pragma);

  const s =
    `[\\t ]*\\/\\/>>\\s?${prefix}Start\\s?\\(\\s?(["'])${pragma}\\1\\s?,\\s?pragmas\\.${pragma}\\s?\\)\\s?;?` +
    // multiline code block
    `[\\s\\S]*?` +
    // end comment
    `[\\t ]*\\/\\/>>\\s?${prefix}End\\s?\\(\\s?(["'])${pragma}\\2\\s?\\)\\s?;?\\s?[\\t ]*\\n?`;

  return new RegExp(s, "gm");
}

/** @type {Record<string, boolean>} */
const pragmas = { debug: false };

/** @type {esbuild.Plugin} */
export const stripPragmaPlugin = {
  name: "strip-pragmas",
  setup: (build) => {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      let source = await readFile(args.path, { encoding: "utf8" });

      try {
        for (const key in pragmas) {
          if (pragmas.hasOwnProperty(key)) {
            source = source.replace(constructRegex(key, pragmas[key]), "");
          }
        }

        return { contents: source };
      } catch (e) {
        return {
          errors: [{ text: /** @type {Error} */ (e).message }],
        };
      }
    });
  },
};

/**
 * Print an esbuild warning
 * @param {esbuild.Message} message
 */
function printBuildWarning({ location, text }) {
  assert(location, "Missing message.location.");
  const { column, file, line, lineText, suggestion } = location;

  let message = `\n
  > ${file}:${line}:${column}: warning: ${text}
  ${lineText}
  `;

  if (suggestion && suggestion !== "") {
    message += `\n${suggestion}`;
  }

  console.log(message);
}

/**
 * Ignore `eval` warnings in third-party code we don't have control over
 * @param {esbuild.BuildResult} result
 */
export function handleBuildWarnings(result) {
  for (const warning of result.warnings) {
    if (!warning.location?.file.includes("protobufjs.js")) {
      printBuildWarning(warning);
    }
  }
}

/**
 * @typedef {object} CesiumBundles
 * @property {esbuild.BuildResult|esbuild.BuildContext} [esm] The ESM bundle. Only present when incremental:true is passed.
 * @property {esbuild.BuildResult|esbuild.BuildContext} [iife] The IIFE bundle, for use in browsers. Only present when requested and incremental:true is passed.
 * @property {esbuild.BuildResult|esbuild.BuildContext} [iifeWorkers] The IIFE worker bundle, for use in browsers. Only present when requested and incremental:true is passed.
 * @property {esbuild.BuildResult|esbuild.BuildContext} [node] The CommonJS bundle, for use in NodeJS. Only present when requested and incremental:true is passed.
 */

/**
 * Bundles all individual modules, optionally minifying and stripping out debug pragmas.
 * @param {object} options
 * @param {string} options.outputDirectory Directory where build artifacts are output
 * @param {string} options.entryPoint script to bundle
 * @param {boolean} [options.minify=false] true if the output should be minified
 * @param {boolean} [options.removePragmas=false] true if the output should have debug pragmas stripped out
 * @param {boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {boolean} [options.incremental=false] true if build output should be cached for repeated builds
 * @param {boolean} [options.write=true] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<CesiumBundles>}
 */
export async function bundleIndexJs(options) {
  /** @type {esbuild.BuildOptions} */
  const buildConfig = {
    ...defaultESBuildOptions(),
    entryPoints: [options.entryPoint],
    minify: options.minify,
    sourcemap: options.sourcemap,
    plugins: options.removePragmas ? [stripPragmaPlugin] : undefined,
    write: options.write,
    banner: {
      js: await getCopyrightHeader(),
    },
    // print errors immediately, and collect warnings so we can filter out known ones
    logLevel: "info",
  };

  const incremental = options.incremental ?? false;
  const build = incremental ? esbuild.context : esbuild.build;

  // Build ESM
  const esm = await build({
    ...buildConfig,
    format: "esm",
    outfile: path.join(options.outputDirectory, "index.js"),
    // NOTE: doing this requires an importmap defined in the browser but avoids multiple CesiumJS instances
    external: options.entryPoint.includes("engine") ? [] : ["@cesium/engine"],
  });

  if (!incremental) {
    handleBuildWarnings(/** @type {esbuild.BuildResult} */ (esm));
    return {};
  }

  return { esm };
}

export const inlineWorkerPath = "Build/InlineWorkers.js";

/**
 * @param {object} options
 * @param {string} options.path output directory
 * @param {boolean} [options.iife=false] true if the worker output should be inlined into a top-level iife file, ie. in Cesium.js
 * @param {boolean} [options.minify=false] true if the worker output should be minified
 * @param {boolean} [options.removePragmas=false] true if debug pragma should be removed
 * @param {boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {boolean} [options.incremental=false] true if build output should be cached for repeated builds
 * @param {boolean} [options.write=true] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<esbuild.BuildResult|esbuild.BuildContext|void>} Resolves to void only when a non-incremental IIFE bundle is inlined into its own file.
 */
export async function bundleWorkers(options) {
  // Copy ThirdParty workers
  const thirdPartyWorkers = await globby([
    "packages/engine/Source/ThirdParty/Workers/**.js",
    "!packages/engine/Source/ThirdParty/Workers/basis_transcoder.js",
  ]);

  const thirdPartyWorkerConfig = defaultESBuildOptions();
  thirdPartyWorkerConfig.bundle = false;
  thirdPartyWorkerConfig.entryPoints = thirdPartyWorkers;
  thirdPartyWorkerConfig.outdir = options.path;
  thirdPartyWorkerConfig.minify = options.minify;
  thirdPartyWorkerConfig.outbase = "packages/engine/Source";
  await esbuild.build(thirdPartyWorkerConfig);

  // Bundle Cesium workers
  const workers = await globby(["packages/engine/Source/Workers/**"]);
  const workerConfig = defaultESBuildOptions();
  workerConfig.bundle = true;
  workerConfig.external = ["fs", "path"];

  if (options.iife) {
    let contents = ``;
    const files = await globby(workers);
    const declarations = files.map((file) => {
      let assignmentName = path.basename(file, path.extname(file));
      assignmentName = assignmentName.replace(/(\.|-)/g, "_");
      return `export const ${assignmentName} = () => { import('./${file}'); };`;
    });
    contents += declarations.join(`${EOL}`);
    contents += "\n";

    workerConfig.globalName = "CesiumWorkers";
    workerConfig.format = "iife";
    workerConfig.stdin = {
      contents: contents,
      resolveDir: ".",
    };
    workerConfig.minify = options.minify;
    workerConfig.write = false;
    workerConfig.logOverride = {
      "empty-import-meta": "silent",
    };
    workerConfig.plugins = options.removePragmas
      ? [stripPragmaPlugin]
      : undefined;
  } else {
    workerConfig.format = "esm";
    workerConfig.splitting = true;
    workerConfig.banner = {
      js: await getCopyrightHeader(),
    };
    workerConfig.entryPoints = workers;
    workerConfig.outdir = path.join(options.path, "Workers");
    workerConfig.minify = options.minify;
    workerConfig.write = options.write;
  }

  const incremental = options.incremental;
  const build = incremental ? esbuild.context : esbuild.build;

  if (!options.iife) {
    return build(workerConfig);
  }

  /**
   * if iife, write this output to it's own file in which the script content is exported
   * @param {esbuild.BuildResult} result
   */
  const writeInjectionCode = (result) => {
    assert(result.outputFiles, "Missing BuildResult.outputFiles");
    const bundle = result.outputFiles[0].contents;
    const base64 = Buffer.from(bundle).toString("base64");
    const contents = `globalThis.CESIUM_WORKERS = atob("${base64}");`;
    return writeFile(inlineWorkerPath, contents);
  };

  if (incremental) {
    const context = /** @type {esbuild.BuildContext} */ (
      await build(workerConfig)
    );
    const rebuild = context.rebuild;
    context.rebuild = async () => {
      const result = await rebuild();
      if (result) {
        await writeInjectionCode(result);
      }
      return result;
    };
    return context;
  }

  const result = await build(workerConfig);
  return writeInjectionCode(/** @type {esbuild.BuildResult} */ (result));
}

/**
 * Creates a single entry point file by importing all individual spec files.
 * @param {string[]} files The individual spec files.
 * @param {Workspace} workspace The workspace.
 * @param {string} outputPath The path the file is written to.
 * @returns {Promise<string>}
 */
export async function createSpecListForWorkspace(files, workspace, outputPath) {
  let contents = "";
  files.forEach(function (file) {
    contents += `import './${filePathToModuleId(file).replace(
      `packages/${workspace}/Specs/`,
      "",
    )}.js';\n`;
  });

  await writeFile(outputPath, contents, {
    encoding: "utf-8",
  });

  return contents;
}

/**
 * Bundles spec files for testing a specific workspace in the browser.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {string} options.outbase The base path the output files are relative to.
 * @param {string} options.outdir The directory to place the output in.
 * @param {string} options.specListFile The path to the SpecList.js file
 * @param {string} options.specMain The workspace's own spec-main.js entry point
 * @param {string} options.karmaMain The workspace's own karma-main.js entry point.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {Promise<esbuild.BuildResult|esbuild.BuildContext>} The bundle generated from Specs.
 */
export async function bundleSpecs(options) {
  const incremental = options.incremental ?? true;
  const write = options.write ?? true;

  /** @type {esbuild.BuildOptions} */
  const buildOptions = {
    bundle: true,
    format: "esm",
    outdir: options.outdir,
    sourcemap: true,
    target: "es2020",
    write: write,
  };

  const build = incremental ? esbuild.context : esbuild.build;

  // spec-main and karma-main are bundled separately: different outbase than SpecList.js.
  await build({
    ...buildOptions,
    entryPoints: {
      "spec-main": options.specMain,
      "karma-main": options.karmaMain,
    },
  });

  return build({
    ...buildOptions,
    entryPoints: [options.specListFile],
    outbase: options.outbase,
  });
}
