/*eslint-env node*/
import {
  writeFileSync,
  copyFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, basename, relative, extname, resolve } from "path";
import { cpus, EOL } from "os";
import { exec, execSync } from "child_process";
import { createHash } from "crypto";
import { gzipSync } from "zlib";
import { createInterface } from "readline";
import fetch from "node-fetch";
import { createRequire } from "module";

import gulp from "gulp";
import gulpTap from "gulp-tap";
import gulpZip from "gulp-zip";
import gulpRename from "gulp-rename";
import gulpReplace from "gulp-replace";
import { globby, globbyStream, globbySync } from "globby";
import open from "open";
import rimraf from "rimraf";
import mkdirp from "mkdirp";
import mergeStream from "merge-stream";
import streamToPromise from "stream-to-promise";
import karma from "karma";
import yargs from "yargs";
import aws from "aws-sdk";
import mime from "mime";
import typeScript from "typescript";
import { build as esbuild } from "esbuild";
import { createInstrumenter } from "istanbul-lib-instrument";
import pLimit from "p-limit";

import {
  createCesiumJs,
  copyAssets,
  buildCesiumJs,
  buildWorkers,
  glslToJavaScript,
  createSpecList,
  buildSpecs,
  createGalleryList,
  createJsHintOptions,
  esbuildBaseConfig,
} from "./build.js";
import { cwd } from "process";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}

const karmaConfigFile = resolve("./Specs/karma.conf.cjs");

const travisDeployUrl =
  "http://cesium-dev.s3-website-us-east-1.amazonaws.com/cesium/";

//Gulp doesn't seem to have a way to get the currently running tasks for setting
//per-task variables.  We use the command line argument here to detect which task is being run.
const taskName = process.argv[2];
const noDevelopmentGallery = taskName === "release" || taskName === "makeZip";
const argv = yargs(process.argv).argv;
const verbose = argv.verbose;

let concurrency = argv.concurrency;
if (!concurrency) {
  concurrency = cpus().length;
}
const sourceFiles = [
  "Source/**/*.js",
  "!Source/*.js",
  "!Source/Workers/**",
  "!Source/WorkersES6/**",
  "Source/WorkersES6/createTaskProcessorWorker.js",
  "!Source/ThirdParty/Workers/**",
  "!Source/ThirdParty/google-earth-dbroot-parser.js",
  "!Source/ThirdParty/_*",
];

// Files and globs are relative to root of each workspace.

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

const workspaceShaderFiles = {
  "@cesium/engine": [
    "Source/Shaders/**/*.glsl",
    "Source/ThirdParty/Shaders/*.glsl",
  ],
  "@cesium/widgets": [],
};

const workspaceCssFiles = {
  "@cesium/engine": [
    "Source/**/*.css",
    "Source/ThirdParty/google-earth-dbroot-parser.js", // This file is bundled as is during the CSS bundling.
  ],
  "@cesium/widgets": ["Source/**/*.css"],
};

const workspaceWorkerFiles = {
  "@cesium/engine": ["Build/Workers/*.js", "Build/ThirdParty/Workers/*.js"],
  "@cesium/widgets": [""],
};

const workerSourceFiles = ["packages/engine/Source/WorkersES6/**"];
const watchedSpecFiles = [
  "Specs/**/*Spec.js",
  "Specs/*.js",
  "!Specs/SpecList.js",
  "Specs/TestWorkers/*.js",
];
const shaderFiles = [
  "packages/engine/Source/Shaders/**/*.glsl",
  "packages/engine/Source/ThirdParty/Shaders/*.glsl",
];

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

function getVersionFromPackageJson(json) {
  let version = json.version;
  if (/\.0$/.test(version)) {
    version = version.substring(0, version.length - 2);
  }
  return version;
}

const workspaceSpecFiles = {
  "@cesium/engine": [
    "Specs/Core/*Spec.js",
    "!Specs/Core/TaskProcessorSpec.js", // TODO: Fix
  ],
  "@cesium/widgets": ["Specs/**/*.js"],
};

/**
 * Creates a single entry point file by importing all individual spec files.
 * @param {Array.<String>} files The individual spec files.
 * @param {String} outputPath The path the file is written to.
 */
async function createSpecListJs(files, outputPath) {
  let contents = "";
  files.forEach(function (file) {
    contents += `import './${filePathToModuleId(file).replace(
      "Specs/",
      ""
    )}.js';\n`;
  });

  await writeFile(outputPath, contents, {
    encoding: "utf-8",
  });

  return contents;
}

async function createIndexJs(workspace) {
  // Read package.json from current working directory.

  let workspacePackageJson;
  try {
    const workspacePackageJsonData = await readFile(`package.json`);
    workspacePackageJson = JSON.parse(workspacePackageJsonData);
  } catch (e) {
    console.error(`Unable to read package.json from ${process.cwd()}: ${e}`);
    process.exit(-1);
  }

  // Extract version from package.json and write it at the top of the index.js file.

  const version = getVersionFromPackageJson(workspacePackageJson);
  let contents = `export const VERSION = '${version}';\n`;

  // Iterate over all provided source files for the workspace and export the assignment based on file name.

  const workspaceSources = workspaceSourceFiles[workspace];
  if (!workspaceSources) {
    console.error(`Unable to find source files for workspace: ${workspace}`);
    process.exit(-1);
  }

  const files = await globby(workspaceSources);
  files.forEach(function (file) {
    let moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    // Rename shader files, such that ViewportQuadFS.glsl is exported as _shadersViewportQuadFS in JS.

    let assignmentName = basename(file, extname(file));
    if (moduleId.indexOf("Source/Shaders/") === 0) {
      assignmentName = `_shaders${assignmentName}`;
    }
    assignmentName = assignmentName.replace(/(\.|-)/g, "_");
    contents += `export { default as ${assignmentName} } from './${moduleId}.js';${EOL}`;
  });

  await writeFile("index.js", contents, { encoding: "utf-8" });

  return contents;
}

async function buildWorkspace(options) {
  // Extract the workspace name and path, and change working directory to root of workspace.

  const workspace = options.workspace;

  if (!workspace) {
    console.error(`Workspace is undefined.`);
    process.exit(-1);
  }

  const workspacePath = `packages/${workspace.replace(`@cesium/`, ``)}`;

  options = {
    ...options,
    path: join(workspacePath, `Build`),
  };

  try {
    process.chdir(workspacePath);
    console.log(`Changed working directory to: ${workspacePath}`);
  } catch (e) {
    console.error(`Unable to change directory to workspace: ${e}`);
    process.exit(-1);
  }

  //const outputDirectory = join(process.cwd(), `Build`);
  // TODO: Fix the minifyShaders.state hack
  mkdirp.sync("Build");
  //rimraf.sync(outputDirectory);

  // Build shaders, if needed.

  if (workspace === "@cesium/engine") {
    // TODO: Use workspaceShaderFiles to make this more generic.
    await glslToJavaScript(options.minify, "Build/minifyShaders.state");
  }

  // Create index.js for workspace.

  await createIndexJs(workspace);

  // Bundle ESM

  await esBuildWorkspace(workspace, options);
}

const defaultESBuildOptions = () => {
  return {
    bundle: true,
    color: true,
    entryPoints: [`index.js`],
    external: [`http`, `https`, `url`, `zlib`],
    legalComments: `inline`,
    logLevel: `info`,
    logLimit: 0,
    target: `es2020`,
  };
};

/**
 * Builds the @cesium/engine workspace.
 */
export const buildEngine = async () => {
  const iife = true;
  const node = true;

  // Create Build folder to place build artifacts.
  mkdirp.sync("Build");

  // Convert GLSL files to JavaScript modules.
  await glslToJavaScript(false, "Build/minifyShaders.state");

  // Create index.js
  await createIndexJs("@cesium/engine");

  // Create SpecList.js
  const specFiles = await globby(workspaceSpecFiles["@cesium/engine"]);
  const specListFile = join("Specs", "SpecList.js");
  await createSpecListJs(specFiles, specListFile);

  // Generate bundle using esbuild.
  const esBuildOptions = defaultESBuildOptions();
  await esbuild({
    ...esBuildOptions,
    format: `esm`,
    outfile: join(`Build`, "index.js"),
  });

  // Generate bundle for CSS and ThirdParty using esbuild.
  const css = await globby(workspaceCssFiles[`@cesium/engine`]);
  const cssESBuildOptions = defaultESBuildOptions();
  cssESBuildOptions.entryPoints = [
    "Source/ThirdParty/google-earth-dbroot-parser.js",
    ...css,
  ];
  cssESBuildOptions.loader = {
    ".gif": "text",
    ".png": "text",
  };
  await esbuild({
    ...cssESBuildOptions,
    outdir: "Build",
  });

  // Build workers.
  await buildWorkers({
    path: "Build",
  });

  if (iife) {
    await esbuild({
      ...esBuildOptions,
      format: "iife",
      globalName: "CesiumEngine",
      outfile: join(`Build`, `CesiumEngine.js`),
    });
  }

  if (node) {
    await esbuild({
      ...esBuildOptions,
      format: "cjs",
      define: {
        TransformStream: "null",
      },
      outfile: join(`Build`, `index.cjs`),
    });
  }

  await bundleSpecs(specListFile, join("Build", "Specs"));

  return copyAssets(`Build`);
};

function prepareWorkspacePaths(workspacePath, paths) {
  return paths.map((glob) => {
    if (glob.indexOf(`!`) === 0) {
      return `!`.concat(workspacePath, `/`, glob.replace(`!`, ``));
    }
    return workspacePath.concat("/", glob);
  });
}

/**
 * Bundles CSS files.
 *
 * @param {Object} options
 * @param {Array.<String>} options.filePaths The file paths to bundle.
 * @param {String} options.outdir The output directory.
 * @param {String} options.outbase The
 */
async function bundleCSS(options) {
  options = options || {};

  // Configure options for esbuild.
  const esBuildOptions = defaultESBuildOptions();
  esBuildOptions.entryPoints = await globby(options.filePaths);
  esBuildOptions.loader = {
    ".gif": "text",
    ".png": "text",
  };
  esBuildOptions.outdir = options.outdir;
  esBuildOptions.outbase = options.outbase;

  await esbuild(esBuildOptions);
}


const widgetsResolvePlugin = {
  name: "external-cesium-engine",
  setup: (build) => {
    build.onResolve({
      filter: new RegExp(`engine\/index\.js$`)
    }, () => {

    })
  },
};

const externalResolvePlugin = {
  name: "external-cesium",
  setup: (build) => {
    build.onResolve({ filter: new RegExp(`Cesium\.js$`) }, () => {
      return {
        path: "CesiumEngine",
        namespace: "external-cesium",
      };
    });

    build.onLoad(
      {
        filter: new RegExp(`^CesiumEngine$`),
        namespace: "external-cesium",
      },
      () => {
        const contents = `module.exports = CesiumEngine`;
        return {
          contents,
        };
      }
    );
  },
};

/**
 * Bundles spec files for testing in the browser.
 */
async function bundleSpecs(specListFile, outputPath) {
  return esbuild({
    entryPoints: [
      "../../Specs/spec-main.js",
      "../../Specs/karma-main.js",
      specListFile,
    ],
    bundle: true,
    format: "esm",
    sourcemap: true,
    target: "es2020",
    outdir: outputPath,
    //plugins: [externalResolvePlugin],
    external: ["https", "http", "url", "zlib"],
    incremental: false,
    write: true,
  });
}

export const buildWidgets = async () => {
  // Generate Build folder to place build artifacts.
  mkdirp.sync("Build");

  // Create index.js
  await createIndexJs("@cesium/widgets");

  // Create SpecList.js
  const specFiles = await globby(workspaceSpecFiles["@cesium/widgets"]);
  const specListFile = join("Specs", "SpecList.js");
  await createSpecListJs(specFiles, specListFile);

  await bundleSpecs(specListFile, join("Build", "Specs"));
};

function copyFiles(from, to, base) {
  const stream = gulp
    .src(from, { nodir: true, allowEmpty: true, base: base })
    .pipe(gulp.dest(to));
  return streamToPromise(stream);
}

const buildCesium = async (options) => {
  const iife = true;
  const node = true;

  // Generate Build folder to place build artifacts.
  mkdirp.sync("Build");

  // Create Cesium.js
  await createCesiumJs();

  // Generate bundle using esbuild.
  const esBuildOptions = defaultESBuildOptions();
  esBuildOptions.entryPoints = [`Source/Cesium.js`];
  await esbuild({
    ...esBuildOptions,
    format: `esm`,
    outfile: join(`Build`, "index.js"),
  });

  // Bundle CSS files.
  for (const workspace of Object.keys(workspaceCssFiles)) {
    // Since workspace source files are provided relative to the workspace,
    // the workspace path needs to be prepended.
    const workspacePath = `packages/${workspace.replace(`@cesium/`, ``)}`;
    const filesPaths = prepareWorkspacePaths(
      workspacePath,
      workspaceCssFiles[workspace]
    );

    await bundleCSS({
      filePaths: filesPaths,
      outbase: `${workspacePath}/Source`,
      outdir: `Build/${workspace === "@cesium/widgets" ? `Widgets` : ``}`, // To ensure that we conform to how Cesium.js has previously been built.
    });

    // Copy worker files.
    const workerPaths = prepareWorkspacePaths(
      workspacePath,
      workspaceWorkerFiles[workspace]
    );
    await copyFiles(workerPaths, "Build", `${workspacePath}/Build`);
  }
  if (iife) {
    await esbuild({
      ...esBuildOptions,
      format: "iife",
      globalName: "Cesium",
      outfile: join(`Build`, `Cesium.js`),
    });
  }

  if (node) {
    await esbuild({
      ...esBuildOptions,
      format: "cjs",
      define: {
        TransformStream: "null",
      },
      outfile: join(`Build`, `index.cjs`),
    });
  }

  return copyAssets(`Build`);
};

export async function esBuildWorkspace(workspace, options) {
  if (!workspace) {
    console.error(`Workspace is undefined.`);
    process.exit(-1);
  }

  // TODO: Try analyze option
  // TODO: Add banner

  const buildConfig = {
    bundle: true,
    color: true,
    entryPoints: [join(process.cwd(), `index.js`)],
    external: [`https`, `http`, `url`, `zlib`, `@cesium/engine`],
    legalComments: `inline`,
    logLevel: `info`,
    logLimit: 0, // TODO: Remove extra logging
    metafile: true,
    minify: options.minify,
    sourcemap: options.sourcemap,
    target: `es2020`,
    write: options.write,
  };

  // ESM Build

  const result = await esbuild({
    ...buildConfig,
    format: `esm`,
    outfile: join(options.path, `index.js`),
  });

  return result;
}

// TODO: This needs to be redone to avoid duplicating tasks.
// async function buildCesium(options) {
//   options = options || {};
//   mkdirp.sync("Build");

//   const outputDirectory = join(
//     "Build",
//     `Cesium${!options.minify ? "Unminified" : ""}`
//   );
//   rimraf.sync(outputDirectory);

//   writeFileSync(
//     "Build/package.json",
//     JSON.stringify({
//       type: "commonjs",
//     }),
//     "utf8"
//   );

//   await glslToJavaScript(options.minify, "Build/minifyShaders.state");
//   await createCesiumJs();
//   await createSpecList();
//   await Promise.all([
//     createJsHintOptions(),
//     buildCesiumJs({
//       minify: options.minify,
//       iife: true,
//       sourcemap: options.sourcemap,
//       removePragmas: options.removePragmas,
//       path: outputDirectory,
//       node: options.node,
//     }),
//     buildWorkers({
//       minify: options.minify,
//       sourcemap: options.sourcemap,
//       path: outputDirectory,
//       removePragmas: options.removePragmas,
//     }),
//     createGalleryList(noDevelopmentGallery),
//     buildSpecs(),
//   ]);

//   return copyAssets(outputDirectory);
// }

export function build() {
  const minify = argv.minify ? argv.minify : false;
  const removePragmas = argv.pragmas ? argv.pragmas : false;
  const sourcemap = argv.sourcemap ? argv.sourcemap : true;
  const node = argv.node ? argv.node : true;
  const workspace = argv.workspace ? argv.workspace : undefined;

  return buildCesium({
    minify: minify,
    removePragmas: removePragmas,
    sourcemap: sourcemap,
    node: node,
  });
}
export default build;

export const buildWatch = gulp.series(build, async function () {
  const minify = argv.minify ? argv.minify : false;
  const removePragmas = argv.pragmas ? argv.pragmas : false;
  const sourcemap = argv.sourcemap ? argv.sourcemap : true;

  const outputDirectory = join("Build", `Cesium${!minify ? "Unminified" : ""}`);

  let [esmResult, iifeResult, cjsResult] = await buildCesiumJs({
    minify: minify,
    path: outputDirectory,
    removePragmas: removePragmas,
    sourcemap: sourcemap,
    incremental: true,
  });

  let specResult = await buildSpecs({
    incremental: true,
  });

  await buildWorkers({
    minify: minify,
    path: outputDirectory,
    removePragmas: removePragmas,
    sourcemap: sourcemap,
  });

  gulp.watch(shaderFiles, async () => {
    glslToJavaScript(minify, "Build/minifyShaders.state");
    esmResult = await esmResult.rebuild();

    if (iifeResult) {
      iifeResult = await iifeResult.rebuild();
    }

    if (cjsResult) {
      cjsResult = await cjsResult.rebuild();
    }
  });

  gulp.watch(
    [
      ...sourceFiles,
      // Shader results are generated in the previous watch task; no need to rebuild twice
      "!Source/Shaders/**",
    ],
    async () => {
      createJsHintOptions();
      esmResult = await esmResult.rebuild();

      if (iifeResult) {
        iifeResult = await iifeResult.rebuild();
      }

      if (cjsResult) {
        cjsResult = await cjsResult.rebuild();
      }
    }
  );

  gulp.watch(
    watchedSpecFiles,
    {
      events: ["add", "unlink"],
    },
    async () => {
      createSpecList();
      specResult = await specResult.rebuild();
    }
  );

  gulp.watch(
    watchedSpecFiles,
    {
      events: ["change"],
    },
    async () => {
      specResult = await specResult.rebuild();
    }
  );

  gulp.watch(workerSourceFiles, () => {
    return buildWorkers({
      minify: minify,
      path: outputDirectory,
      removePragmas: removePragmas,
      sourcemap: sourcemap,
    });
  });

  process.on("SIGINT", () => {
    // Free up resources
    esmResult.rebuild.dispose();

    if (iifeResult) {
      iifeResult.rebuild.dispose();
    }

    if (cjsResult) {
      cjsResult.rebuild.dispose();
    }

    specResult.rebuild.dispose();
    process.exit(0);
  });
});

export function buildTs() {
  return Promise.all([
    generateTypeScriptDefinitions(
      "engine",
      "packages/engine/engine.d.ts",
      "packages/engine/tsd-conf.json",
      processEngineSource,
      processEngineModules
    ),
    generateTypeScriptDefinitions(
      "widgets",
      "packages/widgets/widgets.d.ts",
      "packages/widgets/tsd-conf.json"
    ),
  ]);
}

export function buildApps() {
  return Promise.all([buildCesiumViewer(), buildSandcastle()]);
}

const filesToClean = [
  "Source/Cesium.js",
  "Source/Shaders/**/*.js",
  "Source/Workers/**",
  "!Source/Workers/cesiumWorkerBootstrapper.js",
  "!Source/Workers/transferTypedArrayTest.js",
  "!Source/Workers/package.json",
  "Source/ThirdParty/Shaders/*.js",
  "Source/**/*.d.ts",
  "Specs/SpecList.js",
  "Specs/jasmine/**",
  "Apps/Sandcastle/jsHintOptions.js",
  "Apps/Sandcastle/gallery/gallery-index.js",
  "Apps/Sandcastle/templates/bucket.css",
  "Cesium-*.zip",
  "cesium-*.tgz",
];

export async function clean() {
  const rimrafAsync = (file) => new Promise((resolve) => rimraf(file, resolve));
  await rimrafAsync("Build");
  const files = await globby(filesToClean);
  return Promise.all(files.map(rimrafAsync));
}

async function clocSource() {
  let cmdLine;

  //Run cloc on primary Source files only
  const source = new Promise(function (resolve, reject) {
    cmdLine =
      "npx cloc" +
      " --quiet --progress-rate=0" +
      " Source/ --exclude-dir=Assets,ThirdParty,Workers --not-match-f=copyrightHeader.js";

    exec(cmdLine, function (error, stdout, stderr) {
      if (error) {
        console.log(stderr);
        return reject(error);
      }
      console.log("Source:");
      console.log(stdout);
      resolve();
    });
  });

  //If running cloc on source succeeded, also run it on the tests.
  await source;
  return new Promise(function (resolve, reject) {
    cmdLine =
      "npx cloc" + " --quiet --progress-rate=0" + " Specs/ --exclude-dir=Data";
    exec(cmdLine, function (error, stdout, stderr) {
      if (error) {
        console.log(stderr);
        return reject(error);
      }
      console.log("Specs:");
      console.log(stdout);
      resolve();
    });
  });
}

export async function prepare() {
  // Copy Draco3D files from node_modules into Source
  copyFileSync(
    "node_modules/draco3d/draco_decoder_nodejs.js",
    "packages/engine/Source/ThirdParty/Workers/draco_decoder_nodejs.js"
  );
  copyFileSync(
    "node_modules/draco3d/draco_decoder.wasm",
    "packages/engine/Source/ThirdParty/draco_decoder.wasm"
  );

  // Copy pako and zip.js worker files to Source/ThirdParty
  copyFileSync(
    "node_modules/pako/dist/pako_inflate.min.js",
    "packages/engine/Source/ThirdParty/Workers/pako_inflate.min.js"
  );
  copyFileSync(
    "node_modules/pako/dist/pako_deflate.min.js",
    "packages/engine/Source/ThirdParty/Workers/pako_deflate.min.js"
  );
  copyFileSync(
    "node_modules/@zip.js/zip.js/dist/z-worker-pako.js",
    "packages/engine/Source/ThirdParty/Workers/z-worker-pako.js"
  );

  // Copy prism.js and prism.css files into Tools
  copyFileSync(
    "node_modules/prismjs/prism.js",
    "Tools/jsdoc/cesium_template/static/javascript/prism.js"
  );
  copyFileSync(
    "node_modules/prismjs/themes/prism.min.css",
    "Tools/jsdoc/cesium_template/static/styles/prism.css"
  );

  // Copy jasmine runner files into Specs
  const files = await globby([
    "node_modules/jasmine-core/lib/jasmine-core",
    "!node_modules/jasmine-core/lib/jasmine-core/example",
  ]);

  const stream = gulp.src(files).pipe(gulp.dest("Specs/jasmine"));
  return streamToPromise(stream);
}

export const cloc = gulp.series(clean, clocSource);

//Builds the documentation
export function buildDocs() {
  const generatePrivateDocumentation = argv.private ? "--private" : "";

  execSync(
    `npx jsdoc --configure Tools/jsdoc/conf.json --pedantic ${generatePrivateDocumentation}`,
    {
      stdio: "inherit",
      env: Object.assign({}, process.env, { CESIUM_VERSION: version }),
    }
  );

  const stream = gulp
    .src("Documentation/Images/**")
    .pipe(gulp.dest("Build/Documentation/Images"));

  return streamToPromise(stream);
}

export async function buildDocsWatch() {
  await buildDocs();

  console.log("Listening for changes in documentation...");
  return gulp.watch(sourceFiles, buildDocs);
}

export const release = gulp.series(
  function () {
    return buildCesium({
      minify: false,
      removePragmas: false,
      node: true,
    });
  },
  function () {
    return buildCesium({
      minify: true,
      removePragmas: true,
      node: true,
    });
  },
  buildTs,
  buildDocs
);

export const makeZip = gulp.series(release, async function () {
  //For now we regenerate the JS glsl to force it to be unminified in the release zip
  //See https://github.com/CesiumGS/cesium/pull/3106#discussion_r42793558 for discussion.
  await glslToJavaScript(false, "Build/minifyShaders.state");

  const scripts = packageJson.scripts;
  // Remove prepare step from package.json to avoid running "prepare" an extra time.
  delete scripts.prepare;

  // Remove build and transform tasks since they do not function as intended from within the release zip
  delete scripts.build;
  delete scripts["build-watch"];
  delete scripts["build-ts"];
  delete scripts["build-third-party"];
  delete scripts["build-apps"];
  delete scripts.clean;
  delete scripts.cloc;
  delete scripts["build-docs"];
  delete scripts["build-docs-watch"];
  delete scripts["make-zip"];
  delete scripts.release;
  delete scripts.prettier;

  // Remove deploy tasks
  delete scripts["deploy-s3"];
  delete scripts["deploy-status"];
  delete scripts["deploy-set-version"];

  await writeFile(
    "./Build/package.noprepare.json",
    JSON.stringify(packageJson, null, 2)
  );

  const packageJsonSrc = gulp
    .src("Build/package.noprepare.json")
    .pipe(gulpRename("package.json"));

  const builtSrc = gulp.src(
    [
      "Build/Cesium/**",
      "Build/CesiumUnminified/**",
      "Build/Documentation/**",
      "Build/package.json",
    ],
    {
      base: ".",
    }
  );

  const staticSrc = gulp.src(
    [
      "Apps/**",
      "Apps/**/.eslintrc.json",
      "Apps/Sandcastle/.jshintrc",
      "!Apps/Sandcastle/gallery/development/**",
      "Source/**",
      "Source/**/.eslintrc.json",
      "Specs/**",
      "Specs/**/.eslintrc.json",
      "ThirdParty/**",
      "favicon.ico",
      ".eslintignore",
      ".eslintrc.json",
      ".prettierignore",
      "build.js",
      "gulpfile.js",
      "server.js",
      "index.cjs",
      "LICENSE.md",
      "CHANGES.md",
      "README.md",
      "web.config",
    ],
    {
      base: ".",
    }
  );

  const indexSrc = gulp
    .src("index.release.html")
    .pipe(gulpRename("index.html"));

  return streamToPromise(
    mergeStream(packageJsonSrc, builtSrc, staticSrc, indexSrc)
      .pipe(
        gulpTap(function (file) {
          // Work around an issue with gulp-zip where archives generated on Windows do
          // not properly have their directory executable mode set.
          // see https://github.com/sindresorhus/gulp-zip/issues/64#issuecomment-205324031
          if (file.isDirectory()) {
            file.stat.mode = parseInt("40777", 8);
          }
        })
      )
      .pipe(gulpZip(`Cesium-${version}.zip`))
      .pipe(gulp.dest("."))
      .on("finish", function () {
        rimraf.sync("./Build/package.noprepare.json");
      })
  );
});

function isTravisPullRequest() {
  return (
    process.env.TRAVIS_PULL_REQUEST !== undefined &&
    process.env.TRAVIS_PULL_REQUEST !== "false"
  );
}

export async function deployS3() {
  if (isTravisPullRequest()) {
    console.log("Skipping deployment for non-pull request.");
    return;
  }

  const argv = yargs(process.argv)
    .usage("Usage: deploy-s3 -b [Bucket Name] -d [Upload Directory]")
    .options({
      bucket: {
        alias: "b",
        description: "Bucket name.",
        type: "string",
        demandOption: true,
      },
      directory: {
        alias: "d",
        description: "Upload directory.",
        type: "string",
        demandOption: true,
      },
      "cache-control": {
        alias: "c",
        description:
          "The cache control option set on the objects uploaded to S3.",
        type: "string",
        default: "max-age=3600",
      },
      "dry-run": {
        description: "Only print file paths and S3 keys.",
        type: "boolean",
        default: false,
      },
      confirm: {
        description: "Skip confirmation step.",
        type: "boolean",
        default: false,
      },
    }).argv;

  const uploadDirectory = argv.directory;
  const bucketName = argv.bucket;
  const dryRun = argv.dryRun;
  const cacheControl = argv.cacheControl ? argv.cacheControl : "max-age=3600";

  if (argv.confirm) {
    // skip prompt for travis
    return deployCesium(bucketName, uploadDirectory, cacheControl);
  }

  const iface = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // prompt for confirmation
    iface.question(
      `Files from your computer will be published to the ${bucketName} bucket. Continue? [y/n] `,
      function (answer) {
        iface.close();
        if (answer === "y") {
          resolve(
            deployCesium(bucketName, uploadDirectory, cacheControl, dryRun)
          );
        } else {
          console.log("Deploy aborted by user.");
          resolve();
        }
      }
    );
  });
}

// Deploy cesium to s3
async function deployCesium(bucketName, uploadDirectory, cacheControl, dryRun) {
  // Limit promise concurrency since we are reading many
  // files off disk in parallel
  const limit = pLimit(2000);

  const s3 = new aws.S3({
    maxRetries: 10,
    retryDelayOptions: {
      base: 500,
    },
  });

  const existingBlobs = [];
  let totalFiles = 0;
  let uploaded = 0;
  let skipped = 0;
  const errors = [];

  const prefix = `${uploadDirectory}/`;
  await listAll(s3, bucketName, prefix, existingBlobs);
  const files = await globby(
    [
      "Apps/**",
      "Build/**",
      "Source/**",
      "Specs/**",
      "ThirdParty/**",
      "*.md",
      "favicon.ico",
      "gulpfile.js",
      "index.html",
      "package.json",
      "server.js",
      "web.config",
      "*.zip",
      "*.tgz",
    ],
    {
      dot: true, // include hidden files
    }
  );

  async function getContents(file, blobName) {
    const mimeLookup = getMimeType(blobName);
    const contentType = mimeLookup.type;
    const compress = mimeLookup.compress;
    const contentEncoding = compress ? "gzip" : undefined;

    totalFiles++;

    const computeEtag = (content) => {
      return createHash("md5").update(content).digest("base64");
    };

    let content = await readFile(file);
    if (!compress) {
      return {
        content,
        etag: computeEtag(content),
        contentType,
        contentEncoding,
      };
    }

    const alreadyCompressed = content[0] === 0x1f && content[1] === 0x8b;
    if (alreadyCompressed) {
      console.log(`Skipping compressing already compressed file: ${file}`);
      return {
        content,
        etag: computeEtag(content),
        contentType,
        contentEncoding,
      };
    }

    content = gzipSync(content);

    const index = existingBlobs.indexOf(blobName);
    if (index <= -1) {
      return {
        content,
        etag: computeEtag(content),
        contentType,
        contentEncoding,
      };
    }

    // remove files as we find them on disk
    existingBlobs.splice(index, 1);

    // get file info
    const data = await s3
      .headObject({
        Bucket: bucketName,
        Key: blobName,
      })
      .promise();

    const hash = createHash("md5").update(content).digest("hex");

    if (
      data.ETag !== `"${hash}"` ||
      data.CacheControl !== cacheControl ||
      data.ContentType !== contentType ||
      data.ContentEncoding !== contentEncoding
    ) {
      return {
        content,
        etag: computeEtag(content),
        contentType,
        contentEncoding,
      };
    }

    // We don't need to upload this file again
    skipped++;
  }

  async function readAndUpload(file) {
    const blobName = `${uploadDirectory}/${file}`;

    let content, etag, contentType, contentEncoding;
    try {
      const fileContents = await getContents(file, blobName);
      content = fileContents.content;
      etag = fileContents.etag;
      contentType = fileContents.contentType;
      contentEncoding = fileContents.encoding;
    } catch (e) {
      errors.push(e);
    }

    if (!content) {
      return;
    }

    if (verbose) {
      console.log(`Uploading ${blobName}...`);
    }

    const params = {
      Bucket: bucketName,
      Key: blobName,
      Body: content,
      ContentMD5: etag,
      ContentType: contentType,
      ContentEncoding: contentEncoding,
      CacheControl: cacheControl,
    };

    if (dryRun) {
      uploaded++;
      return;
    }

    try {
      await s3.putObject(params).promise();
      uploaded++;
    } catch (e) {
      errors.push(e);
    }
  }

  await Promise.all(
    files.map((file) => {
      return limit(() => readAndUpload(file));
    })
  );

  console.log(
    `Skipped ${skipped} files and successfully uploaded ${uploaded} files of ${
      totalFiles - skipped
    } files.`
  );

  if (existingBlobs.length === 0) {
    return;
  }

  const objectsToDelete = [];
  existingBlobs.forEach(function (file) {
    // Don't delete generated zip files
    if (!/\.(zip|tgz)$/.test(file)) {
      objectsToDelete.push({ Key: file });
    }
  });

  if (objectsToDelete.length > 0) {
    console.log(`Cleaning ${objectsToDelete.length} files...`);

    // If more than 1000 files, we must issue multiple requests
    const batches = [];
    while (objectsToDelete.length > 1000) {
      batches.push(objectsToDelete.splice(0, 1000));
    }
    batches.push(objectsToDelete);

    const deleteObjects = async (objects) => {
      try {
        if (!dryRun) {
          await s3
            .deleteObjects({
              Bucket: bucketName,
              Delete: {
                Objects: objects,
              },
            })
            .promise();
        }

        if (verbose) {
          console.log(`Cleaned ${objects.length} files.`);
        }
      } catch (e) {
        errors.push(e);
      }
    };

    await Promise.all(batches.map(deleteObjects));
  }

  if (errors.length === 0) {
    return;
  }

  console.log("Errors: ");
  errors.map(console.log);
  return Promise.reject("There was an error while deploying Cesium");
}

function getMimeType(filename) {
  const mimeType = mime.getType(filename);
  if (mimeType) {
    //Compress everything except zipfiles, binary images, and video
    let compress = !/^(image\/|video\/|application\/zip|application\/gzip)/i.test(
      mimeType
    );
    if (mimeType === "image/svg+xml") {
      compress = true;
    }
    return { type: mimeType, compress: compress };
  }

  //Non-standard mime types not handled by mime
  if (/\.(glsl|LICENSE|config|state)$/i.test(filename)) {
    return { type: "text/plain", compress: true };
  } else if (/\.(czml|topojson)$/i.test(filename)) {
    return { type: "application/json", compress: true };
  } else if (/\.tgz$/i.test(filename)) {
    return { type: "application/octet-stream", compress: false };
  }

  // Handle dotfiles, such as .jshintrc
  const baseName = basename(filename);
  if (baseName[0] === "." || baseName.indexOf(".") === -1) {
    return { type: "text/plain", compress: true };
  }

  // Everything else can be octet-stream compressed but print a warning
  // if we introduce a type we aren't specifically handling.
  if (!/\.(terrain|b3dm|geom|pnts|vctr|cmpt|i3dm|metadata)$/i.test(filename)) {
    console.log(`Unknown mime type for ${filename}`);
  }

  return { type: "application/octet-stream", compress: true };
}

// get all files currently in bucket asynchronously
async function listAll(s3, bucketName, prefix, files, marker) {
  const data = await s3
    .listObjects({
      Bucket: bucketName,
      MaxKeys: 1000,
      Prefix: prefix,
      Marker: marker,
    })
    .promise();
  const items = data.Contents;
  for (let i = 0; i < items.length; i++) {
    files.push(items[i].Key);
  }

  if (data.IsTruncated) {
    // get next page of results
    return listAll(s3, bucketName, prefix, files, files[files.length - 1]);
  }
}

export async function deploySetVersion() {
  const buildVersion = argv.buildVersion;
  if (buildVersion) {
    // NPM versions can only contain alphanumeric and hyphen characters
    version += `-${buildVersion.replace(/[^[0-9A-Za-z-]/g, "")}`;
    return writeFile("package.json", JSON.stringify(packageJson, undefined, 2));
  }
}

export async function deployStatus() {
  if (isTravisPullRequest()) {
    console.log("Skipping deployment status for non-pull request.");
    return;
  }

  const status = argv.status;
  const message = argv.message;

  const deployUrl = `${travisDeployUrl + process.env.TRAVIS_BRANCH}/`;
  const zipUrl = `${deployUrl}Cesium-${version}.zip`;
  const npmUrl = `${deployUrl}cesium-${version}.tgz`;
  const coverageUrl = `${
    travisDeployUrl + process.env.TRAVIS_BRANCH
  }/Build/Coverage/index.html`;

  return Promise.all([
    setStatus(status, deployUrl, message, "deployment"),
    setStatus(status, zipUrl, message, "zip file"),
    setStatus(status, npmUrl, message, "npm package"),
    setStatus(status, coverageUrl, message, "coverage results"),
  ]);
}

async function setStatus(state, targetUrl, description, context) {
  // skip if the environment does not have the token
  if (!process.env.TOKEN) {
    return;
  }

  const body = {
    state: state,
    target_url: targetUrl,
    description: description,
    context: context,
  };

  const response = await fetch(
    `https://api.github.com/repos/${process.env.TRAVIS_REPO_SLUG}/statuses/${process.env.TRAVIS_COMMIT}`,
    {
      method: "post",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${process.env.TOKEN}`,
        "User-Agent": "Cesium",
      },
    }
  );

  return response.json();
}

export async function coverage() {
  const webglStub = argv.webglStub ? argv.webglStub : false;
  const suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  const failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;

  const folders = [];
  let browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  const instrumenter = createInstrumenter({
    esModules: true,
  });

  const instrumentPlugin = {
    name: "instrument",
    setup: (build) => {
      build.onLoad(
        {
          filter: /Source\/(Core|DataSources|Renderer|Scene|Widgets)(\/\w+)+\.js$/,
        },
        async (args) => {
          const source = await readFile(args.path, { encoding: "utf8" });

          try {
            const generatedCode = instrumenter.instrumentSync(
              source,
              args.path
            );

            return { contents: generatedCode };
          } catch (e) {
            return {
              errors: {
                text: e.message,
              },
            };
          }
        }
      );
    },
  };

  const outputDirectory = join("Build", "Instrumented");

  const result = await esbuild({
    entryPoints: ["Source/Cesium.js"],
    bundle: true,
    sourcemap: true,
    format: "iife",
    globalName: "Cesium",
    target: "es2020",
    external: ["https", "http", "url", "zlib"],
    outfile: join(outputDirectory, "Cesium.js"),
    plugins: [instrumentPlugin],
    logLevel: "error", // print errors immediately, and collect warnings so we can filter out known ones
  });

  handleBuildWarnings(result);

  const config = await karma.config.parseConfig(
    karmaConfigFile,
    {
      configFile: karmaConfigFile,
      browsers: browsers,
      specReporter: {
        suppressErrorSummary: false,
        suppressFailed: false,
        suppressPassed: suppressPassed,
        suppressSkipped: true,
      },
      files: [
        { pattern: "Specs/Data/**", included: false },
        { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
        { pattern: "Build/Instrumented/Cesium.js", included: true },
        { pattern: "Build/Instrumented/Cesium.js.map", included: false },
        { pattern: "Build/CesiumUnminified/**", included: false },
        {
          pattern: "Build/Specs/karma-main.js",
          included: true,
          type: "module",
        },
        {
          pattern: "Build/Specs/SpecList.js",
          included: true,
          type: "module",
        },
        { pattern: "Specs/TestWorkers/**", included: false },
      ],
      reporters: ["spec", "coverage"],
      coverageReporter: {
        dir: "Build/Coverage",
        subdir: function (browserName) {
          folders.push(browserName);
          return browserName;
        },
        includeAllSources: true,
      },
      client: {
        captureConsole: false,
        args: [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          webglStub,
          undefined,
        ],
      },
    },
    { promiseConfig: true, throwErrors: true }
  );

  return new Promise((resolve, reject) => {
    const server = new karma.Server(config, function doneCallback(e) {
      let html = "<!doctype html><html><body><ul>";
      folders.forEach(function (folder) {
        html += `<li><a href="${encodeURIComponent(
          folder
        )}/index.html">${folder}</a></li>`;
      });
      html += "</ul></body></html>";
      writeFileSync("Build/Coverage/index.html", html);

      if (!process.env.TRAVIS) {
        folders.forEach(function (dir) {
          open(`Build/Coverage/${dir}/index.html`);
        });
      }

      if (failTaskOnError && e) {
        reject(e);
        return;
      }

      resolve();
    });
    server.start();
  });
}

const workspaceTestFiles = {
  "@cesium/engine": [
    { pattern: "Specs/Data/**", included: false },
    { pattern: "packages/engine/Specs/TestWorkers/**/*.wasm", included: false },
    { pattern: "packages/engine/Build/CesiumEngine.js", included: true },
    { pattern: "packages/engine/Build/CesiumEngine.js.map", included: false },
    {
      pattern: "packages/engine/Build/Specs/Specs/karma-main.js",
      included: true,
      type: "module",
    },
    {
      pattern: "packages/engine/Build/Specs/packages/engine/Specs/SpecList.js",
      included: true,
      type: "module",
    }, // TODO: Fix
    { pattern: "packages/engine/Specs/TestWorkers/**", included: false },
    { pattern: "packages/engine/Build/Assets/**/*", included: false },
    { pattern: "packages/engine/Build/ThirdParty/**/*", included: false },
    { pattern: "packages/engine/Build/Workers/**/*", included: false },
  ],
  "@cesium/widgets": [
    { pattern: "Specs/Data/**", included: false },
    {
      pattern: "packages/widgets/Build/Specs/Specs/karma-main.js",
      included: true,
      type: "module",
    },
    {
      pattern:
        "packages/widgets/Build/Specs/packages/widgets/Specs/SpecList.js",
      included: true,
      type: "module",
    }, // TODO: Fix
    { pattern: "packages/engine/Build/Assets/**/*", included: false },
    { pattern: "packages/engine/Build/ThirdParty/**/*", included: false },
    { pattern: "packages/engine/Build/Workers/**/*", included: false },
  ],
};

export async function testEngine() {
  const enableAllBrowsers = argv.all ? true : false;
  const includeCategory = argv.include ? argv.include : "";
  const excludeCategory = argv.exclude ? argv.exclude : "";
  const webglValidation = argv.webglValidation ? argv.webglValidation : false;
  const webglStub = argv.webglStub ? argv.webglStub : false;
  const release = argv.release ? argv.release : false;
  const failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;
  const suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  const debug = argv.debug ? false : true;
  const debugCanvasWidth = argv.debugCanvasWidth;
  const debugCanvasHeight = argv.debugCanvasHeight;
  const includeName = argv.includeName ? argv.includeName : "";

  const config = await karma.config.parseConfig(
    karmaConfigFile,
    {
      port: 9876,
      singleRun: debug,
      browsers: ["Chrome"],
      specReporter: {
        suppressErrorSummary: false,
        suppressFailed: false,
        suppressPassed: suppressPassed,
        suppressSkipped: true,
      },
      detectBrowsers: {
        enabled: enableAllBrowsers,
      },
      logLevel: verbose ? karma.constants.LOG_INFO : karma.constants.LOG_ERROR,
      files: workspaceTestFiles["@cesium/engine"],
      client: {
        captureConsole: verbose,
        args: [
          includeCategory,
          excludeCategory,
          "--grep",
          includeName,
          webglValidation,
          webglStub,
          release,
          debugCanvasWidth,
          debugCanvasHeight,
        ],
      },
    },
    { promiseConfig: true, throwErrors: true }
  );

  return new Promise((resolve) => {
    const server = new karma.Server(config, function doneCallback(exitCode) {
      resolve(failTaskOnError ? exitCode : undefined);
    });
    server.start();
  });
}

export async function testWidgets() {
  const enableAllBrowsers = argv.all ? true : false;
  const includeCategory = argv.include ? argv.include : "";
  const excludeCategory = argv.exclude ? argv.exclude : "";
  const webglValidation = argv.webglValidation ? argv.webglValidation : false;
  const webglStub = argv.webglStub ? argv.webglStub : false;
  const release = argv.release ? argv.release : false;
  const failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;
  const suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  const debug = argv.debug ? false : true;
  const debugCanvasWidth = argv.debugCanvasWidth;
  const debugCanvasHeight = argv.debugCanvasHeight;
  const includeName = argv.includeName ? argv.includeName : "";

  const config = await karma.config.parseConfig(
    karmaConfigFile,
    {
      port: 9876,
      singleRun: debug,
      browsers: ["Chrome"],
      specReporter: {
        suppressErrorSummary: false,
        suppressFailed: false,
        suppressPassed: suppressPassed,
        suppressSkipped: true,
      },
      detectBrowsers: {
        enabled: enableAllBrowsers,
      },
      logLevel: verbose ? karma.constants.LOG_INFO : karma.constants.LOG_ERROR,
      files: workspaceTestFiles["@cesium/widgets"],
      client: {
        captureConsole: verbose,
        args: [
          includeCategory,
          excludeCategory,
          "--grep",
          includeName,
          webglValidation,
          webglStub,
          release,
          debugCanvasWidth,
          debugCanvasHeight,
        ],
      },
    },
    { promiseConfig: true, throwErrors: true }
  );

  return new Promise((resolve) => {
    const server = new karma.Server(config, function doneCallback(exitCode) {
      resolve(failTaskOnError ? exitCode : undefined);
    });
    server.start();
  });
}



export async function test() {
  const enableAllBrowsers = argv.all ? true : false;
  const includeCategory = argv.include ? argv.include : "";
  const excludeCategory = argv.exclude ? argv.exclude : "";
  const webglValidation = argv.webglValidation ? argv.webglValidation : false;
  const webglStub = argv.webglStub ? argv.webglStub : false;
  const release = argv.release ? argv.release : false;
  const failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;
  const suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  const debug = argv.debug ? false : true;
  const debugCanvasWidth = argv.debugCanvasWidth;
  const debugCanvasHeight = argv.debugCanvasHeight;
  const includeName = argv.includeName ? argv.includeName : "";

  let browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  let files = [
    { pattern: "Specs/Data/**", included: false },
    { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
    { pattern: "Build/CesiumUnminified/Cesium.js", included: true },
    { pattern: "Build/CesiumUnminified/Cesium.js.map", included: false },
    { pattern: "Build/CesiumUnminified/**", included: false },
    { pattern: "Build/Specs/karma-main.js", included: true, type: "module" },
    { pattern: "Build/Specs/SpecList.js", included: true, type: "module" },
    { pattern: "Specs/TestWorkers/**", included: false },
  ];

  if (release) {
    files = [
      { pattern: "Specs/Data/**", included: false },
      { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
      { pattern: "Specs/ThirdParty/**", included: false, type: "module" },
      { pattern: "Build/Cesium/Cesium.js", included: true },
      { pattern: "Build/Cesium/Cesium.js.map", included: false },
      { pattern: "Build/Cesium/**", included: false },
      { pattern: "Build/Specs/karma-main.js", included: true },
      { pattern: "Build/Specs/SpecList.js", included: true, type: "module" },
      { pattern: "Specs/TestWorkers/**", included: false },
    ];
  }

  const config = await karma.config.parseConfig(
    karmaConfigFile,
    {
      port: 9876,
      singleRun: debug,
      browsers: browsers,
      specReporter: {
        suppressErrorSummary: false,
        suppressFailed: false,
        suppressPassed: suppressPassed,
        suppressSkipped: true,
      },
      detectBrowsers: {
        enabled: enableAllBrowsers,
      },
      logLevel: verbose ? karma.constants.LOG_INFO : karma.constants.LOG_ERROR,
      files: files,
      client: {
        captureConsole: verbose,
        args: [
          includeCategory,
          excludeCategory,
          "--grep",
          includeName,
          webglValidation,
          webglStub,
          release,
          debugCanvasWidth,
          debugCanvasHeight,
        ],
      },
    },
    { promiseConfig: true, throwErrors: true }
  );

  return new Promise((resolve) => {
    const server = new karma.Server(config, function doneCallback(exitCode) {
      resolve(failTaskOnError ? exitCode : undefined);
    });
    server.start();
  });
}

function generateTypeScriptDefinitions(
  workspaceName,
  definitionsPath,
  configurationPath,
  processSourceFunc,
  processModulesFunc
) {
  // Run JSDoc with tsd-jsdoc to generate an initial definition file.
  execSync(`npx jsdoc --configure ${configurationPath}`, {
    stdio: `inherit`,
  });

  let source = readFileSync(definitionsPath).toString();

  if (processSourceFunc) {
    source = processSourceFunc(definitionsPath, source);
  }

  // The next step is to find the list of Cesium modules exported by the Cesium API
  // So that we can map these modules with a link back to their original source file.

  const regex = /^declare (function|class|namespace|enum) (.+)/gm;
  let matches;
  let publicModules = new Set();
  //eslint-disable-next-line no-cond-assign
  while ((matches = regex.exec(source))) {
    const moduleName = matches[2].match(/([^<\s|\(]+)/);
    publicModules.add(moduleName[1]);
  }

  if (processModulesFunc) {
    publicModules = processModulesFunc(publicModules);
  }

  // Fix up the output to match what we need
  // declare => export since we are wrapping everything in a namespace
  source = source
    .replace(/^declare /gm, "export ")
    .replace(/Number\[]/gm, "number[]") // Workaround https://github.com/englercj/tsd-jsdoc/issues/117
    .replace(/String\[]/gm, "string[]")
    .replace(/Boolean\[]/gm, "boolean[]")
    .replace(/Object\[]/gm, "object[]")
    .replace(/<Number>/gm, "<number>")
    .replace(/<String>/gm, "<string>")
    .replace(/<Boolean>/gm, "<boolean>")
    .replace(/<Object>/gm, "<object>");

  // Wrap the source to actually be inside of a declared cesium module
  // and add any workaround and private utility types.
  source = `declare module "@cesium/${workspaceName}" {
${source}
}
`;

  // Map individual modules back to their source file so that TS still works
  // when importing individual files instead of the entire cesium module.
  globbySync(sourceFiles).forEach(function (file) {
    file = relative(`packages/${workspaceName}/Source`, file);

    let moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    const assignmentName = basename(file, extname(file));
    if (publicModules.has(assignmentName)) {
      publicModules.delete(assignmentName);
      source += `declare module "@cesium/${workspaceName}/Source/${moduleId}" { import { ${assignmentName} } from '@cesium/${workspaceName}'; export default ${assignmentName}; }\n`;
    }
  });

  // Write the final source file back out
  writeFileSync(definitionsPath, source);

  return Promise.resolve();
}

function processEngineModules(modules) {
  // Math shows up as "Math" because of it's aliasing from CesiumMath and namespace collision with actual Math
  // It fails the above regex so just add it directly here.
  modules.add("Math");
  return modules;
}

function processEngineSource(definitionsPath, source) {
  // All of our enum assignments that alias to WebGLConstants, such as PixelDatatype.js
  // end up as enum strings instead of actually mapping values to WebGLConstants.
  // We fix this with a simple regex replace later on, but it means the
  // WebGLConstants constants enum needs to be defined in the file before it can
  // be used.  This block of code reads in the TS file, finds the WebGLConstants
  // declaration, and then writes the file back out (in memory to source) with
  // WebGLConstants being the first module.
  const node = typeScript.createSourceFile(
    definitionsPath,
    source,
    typeScript.ScriptTarget.Latest
  );
  let firstNode;
  node.forEachChild((child) => {
    if (
      typeScript.SyntaxKind[child.kind] === "EnumDeclaration" &&
      child.name.escapedText === "WebGLConstants"
    ) {
      firstNode = child;
    }
  });

  const printer = typeScript.createPrinter({
    removeComments: false,
    newLine: typeScript.NewLineKind.LineFeed,
  });

  let newSource = "";
  newSource += printer.printNode(
    typeScript.EmitHint.Unspecified,
    firstNode,
    node
  );
  newSource += "\n\n";
  node.forEachChild((child) => {
    if (
      typeScript.SyntaxKind[child.kind] !== "EnumDeclaration" ||
      child.name.escapedText !== "WebGLConstants"
    ) {
      newSource += printer.printNode(
        typeScript.EmitHint.Unspecified,
        child,
        node
      );
      newSource += "\n\n";
    }
  });
  source = newSource;

  // Fix up the output to match what we need
  // declare => export since we are wrapping everything in a namespace
  // CesiumMath => Math (because no CesiumJS build step would be complete without special logic for the Math class)
  // Fix up the WebGLConstants aliasing we mentioned above by simply unquoting the strings.
  source = source
    .replace(/module "Math"/gm, "namespace Math")
    .replace(/CesiumMath/gm, "Math")
    .replace(
      /= "WebGLConstants\.(.+)"/gm,
      // eslint-disable-next-line no-unused-vars
      (match, p1) => `= WebGLConstants.${p1}`
    )
    // Strip const enums which can cause errors - https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls
    .replace(/^(\s*)(export )?const enum (\S+) {(\s*)$/gm, "$1$2enum $3 {$4");

  return source;
}

function createTypeScriptDefinitions() {
  // Run jsdoc with tsd-jsdoc to generate an initial Cesium.d.ts file.
  execSync("npx jsdoc --configure packages/engine/tsd-conf.json", {
    stdio: "inherit",
  });

  let source = readFileSync("packages/engine/engine.d.ts").toString();

  // All of our enum assignments that alias to WebGLConstants, such as PixelDatatype.js
  // end up as enum strings instead of actually mapping values to WebGLConstants.
  // We fix this with a simple regex replace later on, but it means the
  // WebGLConstants constants enum needs to be defined in the file before it can
  // be used.  This block of code reads in the TS file, finds the WebGLConstants
  // declaration, and then writes the file back out (in memory to source) with
  // WebGLConstants being the first module.
  const node = typeScript.createSourceFile(
    "package/engine/Cesium.d.ts",
    source,
    typeScript.ScriptTarget.Latest
  );
  let firstNode;
  node.forEachChild((child) => {
    if (
      typeScript.SyntaxKind[child.kind] === "EnumDeclaration" &&
      child.name.escapedText === "WebGLConstants"
    ) {
      firstNode = child;
    }
  });

  const printer = typeScript.createPrinter({
    removeComments: false,
    newLine: typeScript.NewLineKind.LineFeed,
  });

  let newSource = "";
  newSource += printer.printNode(
    typeScript.EmitHint.Unspecified,
    firstNode,
    node
  );
  newSource += "\n\n";
  node.forEachChild((child) => {
    if (
      typeScript.SyntaxKind[child.kind] !== "EnumDeclaration" ||
      child.name.escapedText !== "WebGLConstants"
    ) {
      newSource += printer.printNode(
        typeScript.EmitHint.Unspecified,
        child,
        node
      );
      newSource += "\n\n";
    }
  });
  source = newSource;

  // The next step is to find the list of Cesium modules exported by the Cesium API
  // So that we can map these modules with a link back to their original source file.

  const regex = /^declare (function|class|namespace|enum) (.+)/gm;
  let matches;
  const publicModules = new Set();
  //eslint-disable-next-line no-cond-assign
  while ((matches = regex.exec(source))) {
    const moduleName = matches[2].match(/([^<\s|\(]+)/);
    publicModules.add(moduleName[1]);
  }

  // Math shows up as "Math" because of it's aliasing from CesiumMath and namespace collision with actual Math
  // It fails the above regex so just add it directly here.
  publicModules.add("Math");

  // Fix up the output to match what we need
  // declare => export since we are wrapping everything in a namespace
  // CesiumMath => Math (because no CesiumJS build step would be complete without special logic for the Math class)
  // Fix up the WebGLConstants aliasing we mentioned above by simply unquoting the strings.
  source = source
    .replace(/^declare /gm, "export ")
    .replace(/module "Math"/gm, "namespace Math")
    .replace(/CesiumMath/gm, "Math")
    .replace(/Number\[]/gm, "number[]") // Workaround https://github.com/englercj/tsd-jsdoc/issues/117
    .replace(/String\[]/gm, "string[]")
    .replace(/Boolean\[]/gm, "boolean[]")
    .replace(/Object\[]/gm, "object[]")
    .replace(/<Number>/gm, "<number>")
    .replace(/<String>/gm, "<string>")
    .replace(/<Boolean>/gm, "<boolean>")
    .replace(/<Object>/gm, "<object>")
    .replace(
      /= "WebGLConstants\.(.+)"/gm,
      // eslint-disable-next-line no-unused-vars
      (match, p1) => `= WebGLConstants.${p1}`
    )
    // Strip const enums which can cause errors - https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls
    .replace(/^(\s*)(export )?const enum (\S+) {(\s*)$/gm, "$1$2enum $3 {$4");

  // Wrap the source to actually be inside of a declared cesium module
  // and add any workaround and private utility types.
  source = `declare module "@cesium/engine" {
${source}
}

`;

  // Map individual modules back to their source file so that TS still works
  // when importing individual files instead of the entire cesium module.
  globbySync(sourceFiles).forEach(function (file) {
    file = relative("package/engine/Source", file);

    let moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    const assignmentName = basename(file, extname(file));
    if (publicModules.has(assignmentName)) {
      publicModules.delete(assignmentName);
      source += `declare module "@cesium/engine/Source/${moduleId}" { import { ${assignmentName} } from 'cesium'; export default ${assignmentName}; }\n`;
    }
  });

  // Write the final source file back out
  writeFileSync("packages/engine/engine.d.ts", source);

  // Use tsc to compile it and make sure it is valid
  // execSync("npx tsc -p Tools/jsdoc/tsconfig.json", {
  //   stdio: "inherit",
  // });

  // Also compile our smokescreen to make sure interfaces work as expected.
  // execSync("npx tsc -p Specs/TypeScript/tsconfig.json", {
  //   stdio: "inherit",
  // });

  // Below is a sanity check to make sure we didn't leave anything out that
  // we don't already know about

  // Intentionally ignored nested items
  publicModules.delete("KmlFeatureData");
  publicModules.delete("MaterialAppearance");

  if (publicModules.size !== 0) {
    throw new Error(
      `Unexpected unexposed modules: ${Array.from(publicModules.values()).join(
        ", "
      )}`
    );
  }

  return Promise.resolve();
}

/**
 * Reads `ThirdParty.extra.json` file
 * @param path {string} Path to `ThirdParty.extra.json`
 * @param discoveredDependencies {Array<string>} List of previously discovered modules
 * @returns {Promise<Array<Object>>} A promise to an array of objects with 'name`, `license`, and `url` strings
 */
async function getLicenseDataFromThirdPartyExtra(path, discoveredDependencies) {
  if (!existsSync(path)) {
    return Promise.reject(`${path} does not exist`);
  }

  const contents = await readFile(path);
  const thirdPartyExtra = JSON.parse(contents);
  return Promise.all(
    thirdPartyExtra.map(function (module) {
      if (!discoveredDependencies.includes(module.name)) {
        // If this is not a npm module, return existing info
        if (
          !packageJson.dependencies[module.name] &&
          !packageJson.devDependencies[module.name]
        ) {
          discoveredDependencies.push(module.name);
          return Promise.resolve(module);
        }

        return getLicenseDataFromPackage(
          module.name,
          discoveredDependencies,
          module.license,
          module.notes
        );
      }
    })
  );
}

/**
 * Extracts name, license, and url from `package.json` file.
 *
 * @param packageName {string} Name of package
 * @param discoveredDependencies {Array<string>} List of previously discovered modules
 * @param licenseOverride {Array<string>} If specified, override info fetched from package.json. Useful in the case where there are multiple licenses and we might chose a single one.
 * @returns {Promise<Object>} A promise to an object with 'name`, `license`, and `url` strings
 */
async function getLicenseDataFromPackage(
  packageName,
  discoveredDependencies,
  licenseOverride,
  notes
) {
  if (discoveredDependencies.includes(packageName)) {
    return [];
  }
  discoveredDependencies.push(packageName);

  const packagePath = join("node_modules", packageName, "package.json");

  let contents;
  if (existsSync(packagePath)) {
    // Package exists at top-level, so use it.
    contents = await readFile(packagePath);
  }

  if (!contents) {
    return Promise.reject(
      new Error(`Unable to read ${packageName} license information`)
    );
  }

  const packageData = JSON.parse(contents);

  // Check for license
  let licenseField = licenseOverride;

  if (!licenseField) {
    licenseField = [packageData.license];
  }

  if (!licenseField && packageData.licenses) {
    licenseField = packageData.licenses;
  }

  if (!licenseField) {
    console.log(`No license found for ${packageName}`);
    licenseField = ["NONE"];
  }

  let packageVersion = packageData.version;
  if (!packageData.version) {
    console.log(`No version information found for ${packageName}`);
    packageVersion = "NONE";
  }

  return {
    name: packageName,
    license: licenseField,
    version: packageVersion,
    url: `https://www.npmjs.com/package/${packageName}`,
    notes: notes,
  };
}

export async function buildThirdParty() {
  let licenseJson = [];
  const discoveredDependencies = [];

  // Generate ThirdParty.json from ThirdParty.extra.json and package.json
  const licenseInfo = await getLicenseDataFromThirdPartyExtra(
    "ThirdParty.extra.json",
    discoveredDependencies
  );

  licenseJson = licenseJson.concat(licenseInfo);

  licenseJson.sort(function (a, b) {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });

  return writeFile("ThirdParty.json", JSON.stringify(licenseJson, null, 2));
}

function buildSandcastle() {
  const appStream = gulp
    .src([
      "Apps/Sandcastle/**",
      "!Apps/Sandcastle/load-cesium-es6.js",
      "!Apps/Sandcastle/standalone.html",
      "!Apps/Sandcastle/images/**",
      "!Apps/Sandcastle/gallery/**.jpg",
    ])
    // Remove swap out ESM modules for the IIFE build
    .pipe(
      gulpReplace(
        '    <script type="module" src="../load-cesium-es6.js"></script>',
        '    <script src="../../../Build/CesiumUnminified/Cesium.js"></script>\n' +
          '    <script>window.CESIUM_BASE_URL = "../../../Build/CesiumUnminified/";</script>";'
      )
    )
    // Fix relative paths for new location
    .pipe(gulpReplace("../../../Build", "../../.."))
    .pipe(gulpReplace("../../Source", "../../../Source"))
    .pipe(gulpReplace("../../ThirdParty", "../../../ThirdParty"))
    .pipe(gulpReplace("../../SampleData", "../../../../Apps/SampleData"))
    .pipe(gulpReplace("Build/Documentation", "Documentation"))
    .pipe(gulp.dest("Build/Apps/Sandcastle"));

  const imageStream = gulp
    .src(["Apps/Sandcastle/gallery/**.jpg", "Apps/Sandcastle/images/**"], {
      base: "Apps/Sandcastle",
      buffer: false,
    })
    .pipe(gulp.dest("Build/Apps/Sandcastle"));

  const standaloneStream = gulp
    .src(["Apps/Sandcastle/standalone.html"])
    .pipe(
      gulpReplace(
        '    <script type="module" src="load-cesium-es6.js"></script>',
        '    <script src="../../Build/CesiumUnminified/Cesium.js"></script>\n' +
          '    <script>window.CESIUM_BASE_URL = "../../Build/CesiumUnminified/";</script>";'
      )
    )
    .pipe(gulpReplace("../../Build", "../.."))
    .pipe(gulp.dest("Build/Apps/Sandcastle"));

  return streamToPromise(mergeStream(appStream, imageStream, standaloneStream));
}

async function buildCesiumViewer() {
  const cesiumViewerOutputDirectory = "Build/Apps/CesiumViewer";
  mkdirp.sync(cesiumViewerOutputDirectory);

  const config = esbuildBaseConfig();
  config.entryPoints = [
    "Apps/CesiumViewer/CesiumViewer.js",
    "Apps/CesiumViewer/CesiumViewer.css",
  ];
  config.bundle = true; // Tree-shaking is enabled automatically
  config.minify = true;
  config.loader = {
    ".gif": "text",
    ".png": "text",
  };
  config.format = "iife";
  config.inject = ["Apps/CesiumViewer/index.js"];
  config.external = ["https", "http", "zlib"];
  config.outdir = cesiumViewerOutputDirectory;
  config.outbase = "Apps/CesiumViewer";
  config.logLevel = "error"; // print errors immediately, and collect warnings so we can filter out known ones
  const result = await esbuild(config);

  handleBuildWarnings(result);

  await esbuild({
    entryPoints: ["Source/Widgets/InfoBox/InfoBoxDescription.css"],
    minify: true,
    bundle: true,
    loader: {
      ".gif": "text",
      ".png": "text",
    },
    outdir: cesiumViewerOutputDirectory,
    outbase: "Source",
  });

  await buildWorkers({
    minify: true,
    removePragmas: true,
    path: cesiumViewerOutputDirectory,
  });

  const stream = mergeStream(
    gulp.src([
      "Apps/CesiumViewer/**",
      "!Apps/CesiumViewer/Images",
      "!Apps/CesiumViewer/**/*.js",
      "!Apps/CesiumViewer/**/*.css",
    ]),

    gulp.src(
      [
        "Build/Cesium/Assets/**",
        "Build/Cesium/Workers/**",
        "Build/Cesium/ThirdParty/**",
        "Build/Cesium/Widgets/**",
        "!Build/Cesium/Widgets/**/*.css",
      ],
      {
        base: "Build/Cesium",
        nodir: true,
      }
    ),

    gulp.src(["web.config"])
  );

  return streamToPromise(stream.pipe(gulp.dest(cesiumViewerOutputDirectory)));
}

function filePathToModuleId(moduleId) {
  return moduleId.substring(0, moduleId.lastIndexOf(".")).replace(/\\/g, "/");
}
