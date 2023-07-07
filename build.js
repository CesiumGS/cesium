/*eslint-env node*/
import child_process from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { EOL } from "os";
import path from "path";
import { createRequire } from "module";

import esbuild from "esbuild";
import { globby } from "globby";
import glslStripComments from "glsl-strip-comments";
import gulp from "gulp";
import { rimraf } from "rimraf";
import streamToPromise from "stream-to-promise";

import { mkdirp } from "mkdirp";

// Determines the scope of the workspace packages. If the scope is set to cesium, the workspaces should be @cesium/engine.
// This should match the scope of the dependencies of the root level package.json.
const scope = "cesium";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}

const copyrightHeaderTemplate = readFileSync(
  path.join("Source", "copyrightHeader.js"),
  "utf8"
);
const combinedCopyrightHeader = copyrightHeaderTemplate.replace(
  "${version}",
  version
);

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
    if (!warning.location.file.includes("protobufjs.js")) {
      printBuildWarning(warning);
    }
  }
}

export const defaultESBuildOptions = () => {
  return {
    bundle: true,
    color: true,
    legalComments: `inline`,
    logLimit: 0,
    target: `es2020`,
  };
};

export async function getFilesFromWorkspaceGlobs(workspaceGlobs) {
  let files = [];
  // Iterate over each workspace and generate declarations for each file.
  for (const workspace of Object.keys(workspaceGlobs)) {
    // Since workspace source files are provided relative to the workspace,
    // the workspace path needs to be prepended.
    const workspacePath = `packages/${workspace.replace(`${scope}/`, ``)}`;
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
 * @typedef {object} CesiumBundles
 * @property {object} esm The ESM bundle.
 * @property {object} iife The IIFE bundle, for use in browsers.
 * @property {object} node The CommonJS bundle, for use in NodeJS.
 */

/**
 * Bundles all individual modules, optionally minifying and stripping out debug pragmas.
 * @param {object} options
 * @param {string} options.path Directory where build artifacts are output
 * @param {boolean} [options.minify=false] true if the output should be minified
 * @param {boolean} [options.removePragmas=false] true if the output should have debug pragmas stripped out
 * @param {boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {boolean} [options.iife=false] true if an IIFE style module should be built
 * @param {boolean} [options.node=false] true if a CJS style node module should be built
 * @param {boolean} [options.incremental=false] true if build output should be cached for repeated builds
 * @param {boolean} [options.write=true] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<CesiumBundles>}
 */
export async function bundleCesiumJs(options) {
  const buildConfig = defaultESBuildOptions();
  buildConfig.entryPoints = ["Source/Cesium.js"];
  buildConfig.minify = options.minify;
  buildConfig.sourcemap = options.sourcemap;
  buildConfig.external = ["https", "http", "url", "zlib"];
  buildConfig.plugins = options.removePragmas ? [stripPragmaPlugin] : undefined;
  buildConfig.write = options.write;
  buildConfig.banner = {
    js: combinedCopyrightHeader,
  };
  // print errors immediately, and collect warnings so we can filter out known ones
  buildConfig.logLevel = "info";

  const contexts = {};
  const incremental = options.incremental;
  let build = esbuild.build;
  if (incremental) {
    build = esbuild.context;
  }

  // Build ESM
  const esm = await build({
    ...buildConfig,
    format: "esm",
    outfile: path.join(options.path, "index.js"),
  });

  if (incremental) {
    contexts.esm = esm;
  } else {
    handleBuildWarnings(esm);
  }

  // Build IIFE
  if (options.iife) {
    const iife = await build({
      ...buildConfig,
      format: "iife",
      globalName: "Cesium",
      outfile: path.join(options.path, "Cesium.js"),
      logOverride: {
        "empty-import-meta": "silent",
      },
    });

    if (incremental) {
      contexts.iife = iife;
    } else {
      handleBuildWarnings(iife);
    }
  }

  if (options.node) {
    const node = await build({
      ...buildConfig,
      format: "cjs",
      platform: "node",
      logOverride: {
        "empty-import-meta": "silent",
      },
      define: {
        // TransformStream is a browser-only implementation depended on by zip.js
        TransformStream: "null",
      },
      outfile: path.join(options.path, "index.cjs"),
    });

    if (incremental) {
      contexts.node = node;
    } else {
      handleBuildWarnings(node);
    }
  }

  return contexts;
}

function filePathToModuleId(moduleId) {
  return moduleId.substring(0, moduleId.lastIndexOf(".")).replace(/\\/g, "/");
}

const workspaceSourceFiles = {
  engine: [
    "packages/engine/Source/**/*.js",
    "!packages/engine/Source/*.js",
    "!packages/engine/Source/Workers/**",
    "packages/engine/Source/Workers/createTaskProcessorWorker.js",
    "!packages/engine/Source/ThirdParty/Workers/**.js",
    "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
    "!packages/engine/Source/ThirdParty/_*",
  ],
  widgets: ["packages/widgets/Source/**/*.js"],
};

/**
 * Generates export declaration from a file from a workspace.
 *
 * @param {string} workspace The workspace the file belongs to.
 * @param {string} file The file.
 * @returns {string} The export declaration.
 */
function generateDeclaration(workspace, file) {
  let assignmentName = path.basename(file, path.extname(file));

  let moduleId = file;
  moduleId = filePathToModuleId(moduleId);

  if (moduleId.indexOf("Source/Shaders") > -1) {
    assignmentName = `_shaders${assignmentName}`;
  }
  assignmentName = assignmentName.replace(/(\.|-)/g, "_");
  return `export { ${assignmentName} } from '@${scope}/${workspace}';`;
}

/**
 * Creates a single entry point file, Cesium.js, which imports all individual modules exported from the Cesium API.
 * @returns {Buffer} contents
 */
export async function createCesiumJs() {
  let contents = `export const VERSION = '${version}';\n`;

  // Iterate over each workspace and generate declarations for each file.
  for (const workspace of Object.keys(workspaceSourceFiles)) {
    const files = await globby(workspaceSourceFiles[workspace]);
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
  engine: ["packages/engine/Specs/**/*Spec.js"],
  widgets: ["packages/widgets/Specs/**/*Spec.js"],
};

/**
 * Creates a single entry point file, Specs/SpecList.js, which imports all individual spec files.
 * @returns {Buffer} contents
 */
export async function createCombinedSpecList() {
  let contents = `export const VERSION = '${version}';\n`;

  for (const workspace of Object.keys(workspaceSpecFiles)) {
    const files = await globby(workspaceSpecFiles[workspace]);
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
 * @param {object} options
 * @param {string} options.path output directory
 * @param {boolean} [options.minify=false] true if the worker output should be minified
 * @param {boolean} [options.removePragmas=false] true if debug pragma should be removed
 * @param {boolean} [options.sourcemap=false] true if an external sourcemap should be generated
 * @param {boolean} [options.incremental=false] true if build output should be cached for repeated builds
 * @param {boolean} [options.write=true] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
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
  workerConfig.format = "esm";
  workerConfig.splitting = true;
  workerConfig.banner = {
    js: combinedCopyrightHeader,
  };
  workerConfig.entryPoints = workers;
  workerConfig.outdir = path.join(options.path, "Workers");
  workerConfig.minify = options.minify;
  workerConfig.external = ["http", "https", "url", "zlib", "fs", "path"];
  workerConfig.write = options.write;

  const incremental = options.incremental;
  let build = esbuild.build;
  if (incremental) {
    build = esbuild.context;
  }

  return build(workerConfig);
}

const shaderFiles = [
  "packages/engine/Source/Shaders/**/*.glsl",
  "packages/engine/Source/ThirdParty/Shaders/*.glsl",
];
export async function glslToJavaScript(minify, minifyStateFilePath, workspace) {
  await writeFile(minifyStateFilePath, minify.toString());
  const minifyStateFileLastModified = existsSync(minifyStateFilePath)
    ? statSync(minifyStateFilePath).mtime.getTime()
    : 0;

  // collect all currently existing JS files into a set, later we will remove the ones
  // we still are using from the set, then delete any files remaining in the set.
  const leftOverJsFiles = {};

  const files = await globby([
    `packages/${workspace}/Source/Shaders/**/*.js`,
    `packages/${workspace}/Source/ThirdParty/Shaders/*.js`,
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
      const baseDir = path.join(
        `packages/${workspace}/`,
        "Source",
        "Shaders",
        "Builtin"
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
    path.join(
      `packages/${workspace}/`,
      "Source",
      "Shaders",
      "Builtin",
      "CzmBuiltins.js"
    ),
    fileContents
  );
}

const externalResolvePlugin = {
  name: "external-cesium",
  setup: (build) => {
    // In Specs, when we import files from the source files, we import
    // them from the index.js files. This plugin replaces those imports
    // with the IIFE Cesium.js bundle that's loaded in the browser
    // in SpecRunner.html.
    build.onResolve({ filter: new RegExp(`index\.js$`) }, () => {
      return {
        path: "Cesium",
        namespace: "external-cesium",
      };
    });

    build.onResolve({ filter: /@cesium/ }, () => {
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
 * @param {boolean} [noDevelopmentGallery=false] true if the development gallery should not be included in the list
 * @returns {Promise<any>}
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
 * Helper function to copy files.
 *
 * @param {string[]} globs The file globs to be copied.
 * @param {string} destination The path to copy the files to.
 * @param {string} base The base path to omit from the globs when files are copied. Defaults to "".
 * @returns {Promise<Buffer>} A promise containing the stream output as a buffer.
 */
export async function copyFiles(globs, destination, base) {
  const stream = gulp
    .src(globs, { nodir: true, base: base ?? "" })
    .pipe(gulp.dest(destination));

  return streamToPromise(stream);
}

/**
 * Copy assets from engine.
 *
 * @param {string} destination The path to copy files to.
 * @returns {Promise<void>} A promise that completes when all assets are copied to the destination.
 */
export async function copyEngineAssets(destination) {
  const engineStaticAssets = [
    "packages/engine/Source/**",
    "!packages/engine/Source/**/*.js",
    "!packages/engine/Source/**/*.glsl",
    "!packages/engine/Source/**/*.css",
    "!packages/engine/Source/**/*.md",
  ];

  await copyFiles(engineStaticAssets, destination, "packages/engine/Source");

  // Since the CesiumWidget was part of the Widgets folder, the files must be manually
  // copied over to the right directory.

  await copyFiles(
    ["packages/engine/Source/Widget/**", "!packages/engine/Source/Widget/*.js"],
    path.join(destination, "Widgets/CesiumWidget"),
    "packages/engine/Source/Widget"
  );
}

/**
 * Copy assets from widgets.
 *
 * @param {string} destination The path to copy files to.
 * @returns {Promise<void>} A promise that completes when all assets are copied to the destination.
 */
export async function copyWidgetsAssets(destination) {
  const widgetsStaticAssets = [
    "packages/widgets/Source/**",
    "!packages/widgets/Source/**/*.js",
    "!packages/widgets/Source/**/*.css",
    "!packages/widgets/Source/**/*.glsl",
    "!packages/widgets/Source/**/*.md",
  ];

  await copyFiles(widgetsStaticAssets, destination, "packages/widgets/Source");
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
 * @param {object} options
 * @param {boolean} [options.incremental=false] true if the build should be cached for repeated rebuilds
 * @param {boolean} [options.write=false] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<any>}
 */
export async function bundleCombinedSpecs(options) {
  options = options || {};

  let build = esbuild.build;
  if (options.incremental) {
    build = esbuild.context;
  }

  return build({
    entryPoints: [
      "Specs/spec-main.js",
      "Specs/SpecList.js",
      "Specs/karma-main.js",
    ],
    bundle: true,
    format: "esm",
    sourcemap: true,
    outdir: path.join("Build", "Specs"),
    plugins: [externalResolvePlugin],
    external: [`http`, `https`, `url`, `zlib`],
    write: options.write,
  });
}

/**
 * Bundles test worker in used specs.
 * @param {object} options
 * @param {boolean} [options.incremental=false] true if the build should be cached for repeated rebuilds
 * @param {boolean} [options.write=false] true if build output should be written to disk. If false, the files that would have been written as in-memory buffers
 * @returns {Promise<any>}
 */
export async function bundleTestWorkers(options) {
  options = options || {};

  let build = esbuild.build;
  if (options.incremental) {
    build = esbuild.context;
  }

  const workers = await globby(["Specs/TestWorkers/**.js"]);
  return build({
    entryPoints: workers,
    bundle: true,
    format: "esm",
    sourcemap: true,
    outdir: path.join("Build", "Specs", "TestWorkers"),
    external: ["http", "https", "url", "zlib", "fs", "path"],
    write: options.write,
  });
}

/**
 * Creates the index.js for a package.
 *
 * @param {string} workspace The workspace to create the index.js for.
 * @returns
 */
export async function createIndexJs(workspace) {
  let contents = `globalThis.CESIUM_VERSION = "${version}";\n`;

  // Iterate over all provided source files for the workspace and export the assignment based on file name.
  const workspaceSources = workspaceSourceFiles[workspace];
  if (!workspaceSources) {
    console.error(`Unable to find source files for workspace: ${workspace}`);
    process.exit(-1);
  }

  const files = await globby(workspaceSources);
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

/**
 * Creates a single entry point file by importing all individual spec files.
 * @param {string[]} files The individual spec files.
 * @param {string} workspace The workspace.
 * @param {string} outputPath The path the file is written to.
 */
async function createSpecListForWorkspace(files, workspace, outputPath) {
  let contents = "";
  files.forEach(function (file) {
    contents += `import './${filePathToModuleId(file).replace(
      `packages/${workspace}/Specs/`,
      ""
    )}.js';\n`;
  });

  await writeFile(outputPath, contents, {
    encoding: "utf-8",
  });

  return contents;
}

/**
 * Bundles CSS files.
 *
 * @param {object} options
 * @param {string[]} options.filePaths The file paths to bundle.
 * @param {boolean} options.sourcemap
 * @param {boolean} options.minify
 * @param {string} options.outdir The output directory.
 * @param {string} options.outbase The
 */
async function bundleCSS(options) {
  // Configure options for esbuild.
  const esBuildOptions = defaultESBuildOptions();
  esBuildOptions.entryPoints = await globby(options.filePaths);
  esBuildOptions.loader = {
    ".gif": "text",
    ".png": "text",
  };
  esBuildOptions.sourcemap = options.sourcemap;
  esBuildOptions.minify = options.minify;
  esBuildOptions.outdir = options.outdir;
  esBuildOptions.outbase = options.outbase;

  await esbuild.build(esBuildOptions);
}

const workspaceCssFiles = {
  engine: ["packages/engine/Source/**/*.css"],
  widgets: ["packages/widgets/Source/**/*.css"],
};

/**
 * Bundles spec files for testing in the browser.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {string} options.outbase The base path the output files are relative to.
 * @param {string} options.outdir The directory to place the output in.
 * @param {string} options.specListFile The path to the SpecList.js file
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 * @returns {object} The bundle generated from Specs.
 */
async function bundleSpecs(options) {
  const incremental = options.incremental ?? true;
  const write = options.write ?? true;

  const buildOptions = {
    bundle: true,
    format: "esm",
    outdir: options.outdir,
    sourcemap: true,
    external: ["https", "http", "zlib", "url"],
    target: "es2020",
    write: write,
  };

  let build = esbuild.build;
  if (incremental) {
    build = esbuild.context;
  }

  // When bundling specs for a workspace, the spec-main.js and karma-main.js
  // are bundled separately since they use a different outbase than the workspace's SpecList.js.
  await build({
    ...buildOptions,
    entryPoints: ["Specs/spec-main.js", "Specs/karma-main.js"],
  });

  return build({
    ...buildOptions,
    entryPoints: [options.specListFile],
    outbase: options.outbase,
  });
}

/**
 * Builds the engine workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 */
export const buildEngine = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const write = options.write ?? true;

  // Create Build folder to place build artifacts.
  mkdirp.sync("packages/engine/Build");

  // Convert GLSL files to JavaScript modules.
  await glslToJavaScript(
    minify,
    "packages/engine/Build/minifyShaders.state",
    "engine"
  );

  // Create index.js
  await createIndexJs("engine");

  // Build workers.
  await bundleWorkers({
    ...options,
    path: "packages/engine/Build",
  });

  // Create SpecList.js
  const specFiles = await globby(workspaceSpecFiles["engine"]);
  const specListFile = path.join("packages/engine/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, "engine", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/engine/Specs",
    outdir: "packages/engine/Build/Specs",
    specListFile: specListFile,
    write: write,
  });
};

/**
 * Builds the widgets workspace.
 *
 * @param {object} options
 * @param {boolean} [options.incremental=false] True if builds should be generated incrementally.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 */
export const buildWidgets = async (options) => {
  options = options || {};

  const incremental = options.incremental ?? false;
  const write = options.write ?? true;

  // Generate Build folder to place build artifacts.
  mkdirp.sync("packages/widgets/Build");

  // Create index.js
  await createIndexJs("widgets");

  // Create SpecList.js
  const specFiles = await globby(workspaceSpecFiles["widgets"]);
  const specListFile = path.join("packages/widgets/Specs", "SpecList.js");
  await createSpecListForWorkspace(specFiles, "widgets", specListFile);

  await bundleSpecs({
    incremental: incremental,
    outbase: "packages/widgets/Specs",
    outdir: "packages/widgets/Build/Specs",
    specListFile: specListFile,
    write: write,
  });
};

/**
 * Build CesiumJS.
 *
 * @param {object} options
 * @param {boolean} [options.development=true] True if build is targeted for development.
 * @param {boolean} [options.iife=true] True if IIFE bundle should be generated.
 * @param {boolean} [options.incremental=true] True if builds should be generated incrementally.
 * @param {boolean} [options.minify=false] True if bundles should be minified.
 * @param {boolean} [options.node=true] True if CommonJS bundle should be generated.
 * @param {boolean} options.outputDirectory The directory where the output should go.
 * @param {boolean} [options.removePragmas=false] True if debug pragmas should be removed.
 * @param {boolean} [options.sourcemap=true] True if sourcemap should be included in the generated bundles.
 * @param {boolean} [options.write=true] True if bundles generated are written to files instead of in-memory buffers.
 */
export async function buildCesium(options) {
  const development = options.development ?? true;
  const iife = options.iife ?? true;
  const incremental = options.incremental ?? false;
  const minify = options.minify ?? false;
  const node = options.node ?? true;
  const removePragmas = options.removePragmas ?? false;
  const sourcemap = options.sourcemap ?? true;
  const write = options.write ?? true;

  // Generate Build folder to place build artifacts.
  mkdirp.sync("Build");
  const outputDirectory =
    options.outputDirectory ??
    path.join("Build", `Cesium${!minify ? "Unminified" : ""}`);
  rimraf.sync(outputDirectory);

  await writeFile(
    "Build/package.json",
    JSON.stringify({
      type: "commonjs",
    }),
    "utf8"
  );

  // Create Cesium.js
  await createCesiumJs();

  // Create SpecList.js
  await createCombinedSpecList();

  // Bundle ThirdParty files.
  await bundleCSS({
    filePaths: [
      "packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
    ],
    minify: minify,
    sourcemap: sourcemap,
    outdir: outputDirectory,
    outbase: "packages/engine/Source",
  });

  // Bundle CSS files.
  await bundleCSS({
    filePaths: workspaceCssFiles[`engine`],
    outdir: path.join(outputDirectory, "Widgets/CesiumWidget"),
    outbase: "packages/engine/Source/Widget",
  });
  await bundleCSS({
    filePaths: workspaceCssFiles[`widgets`],
    outdir: path.join(outputDirectory, "Widgets"),
    outbase: "packages/widgets/Source",
  });

  // Generate bundles.
  const contexts = await bundleCesiumJs({
    minify: minify,
    iife: iife,
    incremental: incremental,
    sourcemap: sourcemap,
    removePragmas: removePragmas,
    path: outputDirectory,
    node: node,
    write: write,
  });

  await Promise.all([createJsHintOptions(), createGalleryList(!development)]);

  const workersContext = await bundleWorkers({
    minify: minify,
    sourcemap: sourcemap,
    path: outputDirectory,
    removePragmas: removePragmas,
    incremental: incremental,
    write: write,
  });

  // Generate Specs bundle.
  const specsContext = await bundleCombinedSpecs({
    incremental: incremental,
    write: write,
  });

  const testWorkersContext = await bundleTestWorkers({
    incremental: incremental,
    write: write,
  });

  // Copy static assets to the Build folder.

  await copyEngineAssets(outputDirectory);
  await copyWidgetsAssets(path.join(outputDirectory, "Widgets"));

  // Copy static assets to Source folder.

  await copyEngineAssets("Source");
  await copyFiles(
    ["packages/engine/Source/ThirdParty/**/*.js"],
    "Source/ThirdParty",
    "packages/engine/Source/ThirdParty"
  );

  await copyWidgetsAssets("Source/Widgets");
  await copyFiles(
    ["packages/widgets/Source/**/*.css"],
    "Source/Widgets",
    "packages/widgets/Source"
  );

  // WORKAROUND:
  // Since CesiumWidget was originally part of the Widgets folder, we need to fix up any
  // references to it when we put it back in the Widgets folder, as expected by the
  // combined CesiumJS structure.
  const widgetsCssBuffer = await readFile("Source/Widgets/widgets.css");
  const widgetsCssContents = widgetsCssBuffer
    .toString()
    .replace("../../engine/Source/Widget", "./CesiumWidget");
  await writeFile("Source/Widgets/widgets.css", widgetsCssContents);

  const lighterCssBuffer = await readFile("Source/Widgets/lighter.css");
  const lighterCssContents = lighterCssBuffer
    .toString()
    .replace("../../engine/Source/Widget", "./CesiumWidget");
  await writeFile("Source/Widgets/lighter.css", lighterCssContents);

  return {
    esm: contexts.esm,
    iife: contexts.iife,
    node: contexts.node,
    specs: specsContext,
    workers: workersContext,
    testWorkers: testWorkersContext,
  };
}
