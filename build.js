/*eslint-env node*/
import child_process from "child_process";
import { readFileSync, existsSync, statSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { EOL } from "os";
import path from "path";
import { createRequire } from "module";

import esbuild from "esbuild";
import { globby } from "globby";
import glslStripComments from "glsl-strip-comments";
import gulp from "gulp";
import rimraf from "rimraf";
import { rollup } from "rollup";
import rollupPluginStripPragma from "rollup-plugin-strip-pragma";
import { terser } from "rollup-plugin-terser";
import rollupCommonjs from "@rollup/plugin-commonjs";
import rollupResolve from "@rollup/plugin-node-resolve";
import streamToPromise from "stream-to-promise";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}

let copyrightHeader = "";

function escapeCharacters(token) {
  return token.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

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

const pragmas = {
  debug: false,
};
const stripPragmaPlugin = {
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
          errors: {
            text: e.message,
          },
        };
      }
    });
  },
};

// Print an esbuild warning
function printBuildWarning({ location, text }) {
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

// Ignore `eval` warnings in third-party code we don't have control over
function handleBuildWarnings(result) {
  for (const warning of result.warnings) {
    if (
      !warning.location.file.includes("protobufjs.js") &&
      !warning.location.file.includes("Build/Cesium")
    ) {
      printBuildWarning(warning);
    }
  }
}

const cssFiles = "Source/**/*.css";
export function esbuildBaseConfig() {
  return {
    target: "es2020",
    legalComments: "inline",
    banner: {
      js: copyrightHeader,
    },
  };
}

const workspaceWorkerFiles = {
  "@cesium/engine": ["Build/Workers/*.js", "Build/ThirdParty/Workers/*.js"],
  "@cesium/widgets": [""],
};

export async function getFilesFromWorkspaceGlobs(workspaceGlobs) {
  let files = [];
  // Iterate over each workspace and generate declarations for each file.
  for (const workspace of Object.keys(workspaceGlobs)) {
    // Since workspace source files are provided relative to the workspace,
    // the workspace path needs to be prepended.
    const workspacePath = `packages/${workspace.replace(`@cesium/`, ``)}`;
    const filesPaths = workspaceGlobs[workspace].map((glob) => {
      if (glob.indexOf(`!`) === 0) {
        return `!`.concat(workspacePath, `/`, glob.replace(`!`, ``));
      }
      return workspacePath.concat("/", glob);
    });

    files = files.concat(await globby(filesPaths));
  }
  return files;
}

/**
 * Bundles all individual modules, optionally minifying and stripping out debug pragmas.
 * @param {Object} options
 * @param {String} options.path Directory where build artifacts are output
 * @param {Boolean} [options.minify=false] true if the output should be minified
 * @param {Boolean} [options.removePragmas=false] true if the output should have debug pragmas stripped out
 * @param {Boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {Boolean} [options.iife=false] true if an IIFE style module should be built
 * @param {Boolean} [options.node=false] true if a CJS style node module should be built
 * @param {Boolean} [options.incremental=false] true if build output should be cached for repeated builds
 * @param {Boolean} [options.write=true] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise.<Array>}
 */
export async function buildCesiumJs(options) {
  const css = await globby(cssFiles);

  const buildConfig = esbuildBaseConfig();
  buildConfig.entryPoints = ["Source/Cesium.js"];
  buildConfig.bundle = true;
  buildConfig.minify = options.minify;
  buildConfig.sourcemap = options.sourcemap;
  buildConfig.external = ["https", "http", "url", "zlib"];
  buildConfig.plugins = options.removePragmas ? [stripPragmaPlugin] : undefined;
  buildConfig.incremental = options.incremental;
  buildConfig.write = options.write;
  // print errors immediately, and collect warnings so we can filter out known ones
  buildConfig.logLevel = "error";

  // Build ESM
  const result = await esbuild.build({
    ...buildConfig,
    format: "esm",
    outfile: path.join(options.path, "index.js"),
  });

  handleBuildWarnings(result);

  const results = [result];

  // Copy and minify non-bundled CSS and JS
  const cssAndThirdPartyConfig = esbuildBaseConfig();
  cssAndThirdPartyConfig.entryPoints = [
    "packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
    ...css, // Load and optionally minify css
  ];
  cssAndThirdPartyConfig.bundle = true;
  cssAndThirdPartyConfig.minify = options.minify;
  cssAndThirdPartyConfig.loader = {
    ".gif": "text",
    ".png": "text",
  };
  cssAndThirdPartyConfig.sourcemap = options.sourcemap;
  cssAndThirdPartyConfig.outdir = options.path;
  await esbuild.build(cssAndThirdPartyConfig);

  // Build IIFE
  if (options.iife) {
    const result = await esbuild.build({
      ...buildConfig,
      format: "iife",
      globalName: "Cesium",
      outfile: path.join(options.path, "Cesium.js"),
    });

    handleBuildWarnings(result);

    results.push(result);
  }

  if (options.node) {
    const result = await esbuild.build({
      ...buildConfig,
      format: "cjs",
      platform: "node",
      sourcemap: false,
      define: {
        // TransformStream is a browser-only implementation depended on by zip.js
        TransformStream: "null",
      },
      outfile: path.join(options.path, "index.cjs"),
    });

    handleBuildWarnings(result);
    results.push(result);
  }

  return results;
}

function filePathToModuleId(moduleId) {
  return moduleId.substring(0, moduleId.lastIndexOf(".")).replace(/\\/g, "/");
}

const sourceFiles = [
  "packages/engine/Source/**/*.js",
  "!packages/engine/Source/*.js",
  "!packages/engine/Source/Workers/**",
  "!packages/engine/Source/WorkersES6/**",
  "packages/engine/Source/WorkersES6/createTaskProcessorWorker.js",
  "!packages/engine/Source/ThirdParty/Workers/**",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];

const workspaceSourceFiles = {
  "@cesium/engine": [
    "Source/**/*.js",
    "!Source/*.js",
    "!Source/Workers/**",
    "!Source/WorkersES6/**",
    "Source/WorkersES6/createTaskProcessorWorker.js",
    "!Source/ThirdParty/Workers/**",
    "!Source/ThirdParty/google-earth-dbroot-parser.js",
    "!Source/ThirdParty/_*",
  ],
  "@cesium/widgets": ["Source/**/*.js"],
};

/**
 * Generates export declaration from a file from a workspace.
 *
 * @param {String} workspace The workspace the file belongs to.
 * @param {String} file The file.
 * @returns {String} The export declaration.
 */
function generateDeclaration(workspace, file) {
  let assignmentName = path.basename(file, path.extname(file));

  let moduleId = file;
  moduleId = filePathToModuleId(moduleId);

  if (moduleId.indexOf("Source/Shaders") > -1) {
    assignmentName = `_shaders${assignmentName}`;
  }
  assignmentName = assignmentName.replace(/(\.|-)/g, "_");
  return `export { ${assignmentName} } from '${workspace}';`;
}

/**
 * Creates a single entry point file, Cesium.js, which imports all individual modules exported from the Cesium API.
 * @returns {Buffer} contents
 */
export async function createCesiumJs() {
  let contents = `export const VERSION = '${version}';\n`;

  // Iterate over each workspace and generate declarations for each file.
  for (const workspace of Object.keys(workspaceSourceFiles)) {
    // Since workspace source files are provided relative to the workspace,
    // the workspace path needs to be prepended.
    const workspacePath = `packages/${workspace.replace(`@cesium/`, ``)}`;
    const filesPaths = workspaceSourceFiles[workspace].map((glob) => {
      if (glob.indexOf(`!`) === 0) {
        return `!`.concat(workspacePath, `/`, glob.replace(`!`, ``));
      }
      return workspacePath.concat("/", glob);
    });

    const files = await globby(filesPaths);
    const declarations = files.map((file) =>
      generateDeclaration(workspace, file)
    );
    contents += declarations.join(`${EOL}`);
    contents += "\n";
  }
  await writeFile("Source/Cesium.js", contents, { encoding: "utf-8" });

  return contents;
}

const workspaceSpecFiles = {
  "@cesium/engine": [
    "Specs/Core/*Spec.js",
    "!Specs/Core/TaskProcessorSpec.js", // TODO: Fix
  ],
  "@cesium/widgets": ["Specs/**/*Spec.js"],
};

export async function createCombinedSpecList() {
  let contents = `export const VERSION = '${version}';\n`;

  // Iterate over each workspace and generate declarations for each file.
  for (const workspace of Object.keys(workspaceSpecFiles)) {
    // Since workspace source files are provided relative to the workspace,
    // the workspace path needs to be prepended.
    const workspacePath = `packages/${workspace.replace(`@cesium/`, ``)}`;
    const filesPaths = workspaceSpecFiles[workspace].map((glob) => {
      if (glob.indexOf(`!`) === 0) {
        return `!`.concat(workspacePath, `/`, glob.replace(`!`, ``));
      }
      return workspacePath.concat("/", glob);
    });

    const files = await globby(filesPaths);

    for (const file of files) {
      contents += `import '../${file}';\n`;
    }
  }

  await writeFile(path.join("Specs", "SpecList.js"), contents, {
    encoding: "utf-8",
  });

  return contents;
}

/**
 * Creates a single entry point file, SpecList.js, which imports all individual spec files.
 * @returns {Buffer} contents
 */
export async function createSpecList() {
  const files = await globby(["Specs/**/*Spec.js"]);

  let contents = "";
  files.forEach(function (file) {
    contents += `import './${filePathToModuleId(file).replace(
      "Specs/",
      ""
    )}.js';\n`;
  });

  await writeFile(path.join("Specs", "SpecList.js"), contents, {
    encoding: "utf-8",
  });

  return contents;
}

function rollupWarning(message) {
  // Ignore eval warnings in third-party code we don't have control over
  if (message.code === "EVAL" && /protobufjs/.test(message.loc.file)) {
    return;
  }

  console.log(message);
}

/**
 * Bundles the workers and outputs the result to the specified directory
 * @param {Object} options
 * @param {boolean} [options.minify=false] true if the worker output should be minified
 * @param {boolean} [options.removePragmas=false] true if debug pragma should be removed
 * @param {boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {String} options.path output directory
 * @returns {Promise.<*>}
 */
export async function buildWorkers(options) {

  const prefixPath = options.prefixPath ? options.prefixPath : '';

  // Copy existing workers
  const workers = await globby([
    `${prefixPath}/Source/Workers/**`,
    `${prefixPath}/Source/ThirdParty/Workers/**`
  ]);

  const workerConfig = esbuildBaseConfig();
  workerConfig.entryPoints = workers;
  workerConfig.outdir = options.path;
  workerConfig.outbase = `${prefixPath}/Source`; // Maintain existing file paths
  workerConfig.minify = options.minify;
  await esbuild.build(workerConfig);

  // Use rollup to build the workers:
  // 1) They can be built as AMD style modules
  // 2) They can be built using code-splitting, resulting in smaller modules
  const files = await globby([`${prefixPath}/SourceWorkersES6/*.js`]);
  const plugins = [rollupResolve({ preferBuiltins: true }), rollupCommonjs()];

  if (options.removePragmas) {
    plugins.push(
      rollupPluginStripPragma({
        pragmas: ["debug"],
      })
    );
  }

  if (options.minify) {
    plugins.push(terser());
  }

  const bundle = await rollup({
    input: files,
    plugins: plugins,
    onwarn: rollupWarning,
  });

  return bundle.write({
    dir: path.join(options.path, "Workers"),
    format: "amd",
    // Rollup cannot generate a sourcemap when pragmas are removed
    sourcemap: options.sourcemap && !options.removePragmas,
    banner: copyrightHeader,
  });
}

const shaderFiles = [
  "Source/Shaders/**/*.glsl",
  "Source/ThirdParty/Shaders/*.glsl",
];
export async function glslToJavaScript(minify, minifyStateFilePath) {
  await writeFile(minifyStateFilePath, minify.toString());
  const minifyStateFileLastModified = existsSync(minifyStateFilePath)
    ? statSync(minifyStateFilePath).mtime.getTime()
    : 0;

  // collect all currently existing JS files into a set, later we will remove the ones
  // we still are using from the set, then delete any files remaining in the set.
  const leftOverJsFiles = {};

  const files = await globby([
    "Source/Shaders/**/*.js",
    "Source/ThirdParty/Shaders/*.js",
  ]);
  files.forEach(function (file) {
    leftOverJsFiles[path.normalize(file)] = true;
  });

  const builtinFunctions = [];
  const builtinConstants = [];
  const builtinStructs = [];

  const glslFiles = await globby(shaderFiles);
  await Promise.all(
    glslFiles.map(async function (glslFile) {
      glslFile = path.normalize(glslFile);
      const baseName = path.basename(glslFile, ".glsl");
      const jsFile = `${path.join(path.dirname(glslFile), baseName)}.js`;

      // identify built in functions, structs, and constants
      const baseDir = path.join("Source", "Shaders", "Builtin");
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
        /\/\*\*(?:[^*\/]|\*(?!\/)|\n)*?@license(?:.|\n)*?\*\//gm
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
    })
  );

  // delete any left over JS files from old shaders
  Object.keys(leftOverJsFiles).forEach(function (filepath) {
    rimraf.sync(filepath);
  });

  const generateBuiltinContents = function (contents, builtins, path) {
    for (let i = 0; i < builtins.length; i++) {
      const builtin = builtins[i];
      contents.imports.push(
        `import czm_${builtin} from './${path}/${builtin}.js'`
      );
      contents.builtinLookup.push(`czm_${builtin} : ` + `czm_${builtin}`);
    }
  };

  //generate the JS file for Built-in GLSL Functions, Structs, and Constants
  const contents = {
    imports: [],
    builtinLookup: [],
  };
  generateBuiltinContents(contents, builtinConstants, "Constants");
  generateBuiltinContents(contents, builtinStructs, "Structs");
  generateBuiltinContents(contents, builtinFunctions, "Functions");

  const fileContents = `//This file is automatically rebuilt by the Cesium build process.\n${contents.imports.join(
    "\n"
  )}\n\nexport default {\n    ${contents.builtinLookup.join(",\n    ")}\n};\n`;

  return writeFile(
    path.join("Source", "Shaders", "Builtin", "CzmBuiltins.js"),
    fileContents
  );
}

const externalResolvePlugin = {
  name: "external-cesium",
  setup: (build) => {
    build.onResolve({ filter: new RegExp(`Cesium\.js$`) }, () => {
      return {
        path: "Cesium",
        namespace: "external-cesium",
      };
    });

    build.onLoad(
      {
        filter: new RegExp(`^Cesium$`),
        namespace: "external-cesium",
      },
      () => {
        const contents = `module.exports = Cesium`;
        return {
          contents,
        };
      }
    );
  },
};

/**
 * Creates a template html file in the Sandcastle app listing the gallery of demos
 * @param {Boolean} [noDevelopmentGallery=false] true if the development gallery should not be included in the list
 * @returns {Promise.<*>}
 */
export async function createGalleryList(noDevelopmentGallery) {
  const demoObjects = [];
  const demoJSONs = [];
  const output = path.join("Apps", "Sandcastle", "gallery", "gallery-index.js");

  const fileList = ["Apps/Sandcastle/gallery/**/*.html"];
  if (noDevelopmentGallery) {
    fileList.push("!Apps/Sandcastle/gallery/development/**/*.html");
  }

  // On travis, the version is set to something like '1.43.0-branch-name-travisBuildNumber'
  // We need to extract just the Major.Minor version
  const majorMinor = packageJson.version.match(/^(.*)\.(.*)\./);
  const major = majorMinor[1];
  const minor = Number(majorMinor[2]) - 1; // We want the last release, not current release
  const tagVersion = `${major}.${minor}`;

  // Get an array of demos that were added since the last release.
  // This includes newly staged local demos as well.
  let newDemos = [];
  try {
    newDemos = child_process
      .execSync(
        `git diff --name-only --diff-filter=A ${tagVersion} Apps/Sandcastle/gallery/*.html`,
        { stdio: ["pipe", "pipe", "ignore"] }
      )
      .toString()
      .trim()
      .split("\n");
  } catch (e) {
    // On a Cesium fork, tags don't exist so we can't generate the list.
  }

  let helloWorld;
  const files = await globby(fileList);
  files.forEach(function (file) {
    const demo = filePathToModuleId(
      path.relative("Apps/Sandcastle/gallery", file)
    );

    const demoObject = {
      name: demo,
      isNew: newDemos.includes(file),
    };

    if (existsSync(`${file.replace(".html", "")}.jpg`)) {
      demoObject.img = `${demo}.jpg`;
    }

    demoObjects.push(demoObject);

    if (demo === "Hello World") {
      helloWorld = demoObject;
    }
  });

  demoObjects.sort(function (a, b) {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    }
    return 0;
  });

  const helloWorldIndex = Math.max(demoObjects.indexOf(helloWorld), 0);

  for (let i = 0; i < demoObjects.length; ++i) {
    demoJSONs[i] = JSON.stringify(demoObjects[i], null, 2);
  }

  const contents = `\
// This file is automatically rebuilt by the Cesium build process.\n\
const hello_world_index = ${helloWorldIndex};\n\
const VERSION = '${version}';\n\
const gallery_demos = [${demoJSONs.join(", ")}];\n\
const has_new_gallery_demos = ${newDemos.length > 0 ? "true;" : "false;"}\n`;

  await writeFile(output, contents);

  // Compile CSS for Sandcastle
  return esbuild.build({
    entryPoints: [
      path.join("Apps", "Sandcastle", "templates", "bucketRaw.css"),
    ],
    minify: true,
    banner: {
      css:
        "/* This file is automatically rebuilt by the Cesium build process. */\n",
    },
    outfile: path.join("Apps", "Sandcastle", "templates", "bucket.css"),
  });
}

/**
 * Copies non-js assets to the output directory
 *
 * @param {String} outputDirectory
 * @returns {Promise.<*>}
 */
export function copyAssets(files, outputDirectory) {
  const stream = gulp
    .src(files, { nodir: false })
    .pipe(gulp.dest(outputDirectory));

  return streamToPromise(stream);
}

/**
 * Creates .jshintrc for use in Sandcastle
 * @returns {Buffer} contents
 */
export async function createJsHintOptions() {
  const jshintrc = JSON.parse(
    await readFile(path.join("Apps", "Sandcastle", ".jshintrc"), {
      encoding: "utf8",
    })
  );

  const contents = `\
  // This file is automatically rebuilt by the Cesium build process.\n\
  const sandcastleJsHintOptions = ${JSON.stringify(jshintrc, null, 4)};\n`;

  await writeFile(
    path.join("Apps", "Sandcastle", "jsHintOptions.js"),
    contents
  );

  return contents;
}

/**
 * Bundles spec files for testing in the browser and on the command line with karma.
 * @param {Object} options
 * @param {Boolean} [options.incremental=false] true if the build should be cached for repeated rebuilds
 * @param {Boolean} [options.write=false] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise.<*>}
 */
export function buildSpecs(options) {
  options = options || {};

  return esbuild.build({
    entryPoints: [
      "Specs/spec-main.js",
      "Specs/SpecList.js",
      "Specs/karma-main.js",
    ],
    bundle: true,
    format: "esm",
    sourcemap: true,
    target: "es2020",
    outdir: path.join("Build", "Specs"),
    external: ["https", "http", "url", "zlib"],
    plugins: [externalResolvePlugin],
    incremental: options.incremental,
    write: options.write,
  });
}
