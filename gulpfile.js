/*eslint-env node*/
import { writeFileSync, copyFileSync, readFileSync, existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, basename, resolve, posix, dirname } from "path";
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
import { globby } from "globby";
import open from "open";
import { rimraf } from "rimraf";
import { mkdirp } from "mkdirp";
import mergeStream from "merge-stream";
import streamToPromise from "stream-to-promise";
import karma from "karma";
import yargs from "yargs";
import {
  S3Client,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import mime from "mime";
import typeScript from "typescript";
import { build as esbuild } from "esbuild";
import { createInstrumenter } from "istanbul-lib-instrument";
import pLimit from "p-limit";
import download from "download";
import decompress from "decompress";

import {
  buildCesium,
  buildEngine,
  buildWidgets,
  bundleWorkers,
  glslToJavaScript,
  createCombinedSpecList,
  createJsHintOptions,
  defaultESBuildOptions,
  bundleCombinedWorkers,
} from "./build.js";

// Determines the scope of the workspace packages. If the scope is set to cesium, the workspaces should be @cesium/engine.
// This should match the scope of the dependencies of the root level package.json.
const scope = "cesium";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}
const karmaConfigFile = resolve("./Specs/karma.conf.cjs");

const travisDeployUrl =
  "http://cesium-dev.s3-website-us-east-1.amazonaws.com/cesium/";
const isProduction = process.env.TRAVIS_BRANCH === "cesium.com";

//Gulp doesn't seem to have a way to get the currently running tasks for setting
//per-task variables.  We use the command line argument here to detect which task is being run.
const taskName = process.argv[2];
const noDevelopmentGallery =
  taskName === "release" ||
  taskName === "makeZip" ||
  taskName === "websiteRelease";
const argv = yargs(process.argv).argv;
const verbose = argv.verbose;

const sourceFiles = [
  "packages/engine/Source/**/*.js",
  "!packages/engine/Source/*.js",
  "packages/widgets/Source/**/*.js",
  "!packages/widgets/Source/*.js",
  "!packages/engine/Source/Shaders/**",
  "!packages/engine/Source/Workers/**",
  "!packages/engine/Source/WorkersES6/**",
  "packages/engine/Source/WorkersES6/createTaskProcessorWorker.js",
  "!packages/engine/Source/ThirdParty/Workers/**",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];

const workerSourceFiles = ["packages/engine/Source/WorkersES6/**"];
const watchedSpecFiles = [
  "packages/engine/Specs/**/*Spec.js",
  "!packages/engine/Specs/SpecList.js",
  "packages/widgets/Specs/**/*Spec.js",
  "!packages/widgets/Specs/SpecList.js",
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

export async function build() {
  // Configure build options from command line arguments.
  const minify = argv.minify ?? false;
  const removePragmas = argv.pragmas ?? false;
  const sourcemap = argv.sourcemap ?? true;
  const node = argv.node ?? true;

  const buildOptions = {
    development: !noDevelopmentGallery,
    iife: true,
    minify: minify,
    removePragmas: removePragmas,
    sourcemap: sourcemap,
    node: node,
  };

  // Configure build target.
  const workspace = argv.workspace ? argv.workspace : undefined;

  if (workspace === `@${scope}/engine`) {
    return buildEngine(buildOptions);
  } else if (workspace === `@${scope}/widgets`) {
    return buildWidgets(buildOptions);
  }

  await buildEngine(buildOptions);
  await buildWidgets(buildOptions);
  await buildCesium(buildOptions);
}
export default build;

export const buildWatch = gulp.series(build, async function () {
  const minify = argv.minify ? argv.minify : false;
  const removePragmas = argv.pragmas ? argv.pragmas : false;
  const sourcemap = argv.sourcemap ? argv.sourcemap : true;

  const outputDirectory = join("Build", `Cesium${!minify ? "Unminified" : ""}`);

  const bundles = await buildCesium({
    minify: minify,
    path: outputDirectory,
    removePragmas: removePragmas,
    sourcemap: sourcemap,
    incremental: true,
  });

  const esm = bundles.esm;
  const cjs = bundles.node;
  const iife = bundles.iife;
  const specs = bundles.specs;

  gulp.watch(shaderFiles, async () => {
    glslToJavaScript(minify, "Build/minifyShaders.state", "engine");
    await esm.rebuild();

    if (iife) {
      await iife.rebuild();
    }

    if (cjs) {
      await cjs.rebuild();
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
      await esm.rebuild();

      if (iife) {
        await iife.rebuild();
      }

      if (cjs) {
        await cjs.rebuild();
      }
    }
  );

  gulp.watch(
    watchedSpecFiles,
    {
      events: ["add", "unlink"],
    },
    async () => {
      createCombinedSpecList();
      await specs.rebuild();
    }
  );

  gulp.watch(
    watchedSpecFiles,
    {
      events: ["change"],
    },
    async () => {
      await specs.rebuild();
    }
  );

  gulp.watch(workerSourceFiles, () => {
    return bundleCombinedWorkers({
      minify: minify,
      path: outputDirectory,
      removePragmas: removePragmas,
      sourcemap: sourcemap,
    });
  });

  process.on("SIGINT", () => {
    // Free up resources
    esm.dispose();

    if (iife) {
      iife.dispose();
    }

    if (cjs) {
      cjs.dispose();
    }

    specs.dispose();
    process.exit(0);
  });
});

export async function buildTs() {
  let workspaces;
  if (argv.workspace && !Array.isArray(argv.workspace)) {
    workspaces = [argv.workspace];
  } else if (argv.workspace) {
    workspaces = argv.workspace;
  } else {
    workspaces = packageJson.workspaces;
  }

  // Generate types for passed packages in order.
  const importModules = {};
  for (const workspace of workspaces) {
    const directory = workspace
      .replace(`@${scope}/`, "")
      .replace(`packages/`, "");
    const workspaceModules = await generateTypeScriptDefinitions(
      directory,
      `packages/${directory}/index.d.ts`,
      `packages/${directory}/tsd-conf.json`,
      // The engine package needs additional processing for its enum strings
      directory === "engine" ? processEngineSource : undefined,
      // Handle engine's module naming exceptions
      directory === "engine" ? processEngineModules : undefined,
      importModules
    );
    importModules[directory] = workspaceModules;
  }

  if (argv.workspace) {
    return;
  }

  // Generate types for CesiumJS.
  await createTypeScriptDefinitions();
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
  "packages/**/*.tgz",
];

export async function clean() {
  await rimraf("Build");
  const files = await globby(filesToClean);
  return Promise.all(files.map((file) => rimraf(file)));
}

async function clocSource() {
  let cmdLine;

  //Run cloc on primary Source files only
  const source = new Promise(function (resolve, reject) {
    cmdLine =
      "npx cloc" +
      " --quiet --progress-rate=0" +
      " packages/engine/Source/ packages/widgets/Source --exclude-dir=Assets,ThirdParty,Workers";

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
      "npx cloc" +
      " --quiet --progress-rate=0" +
      " Specs/ packages/engine/Specs packages/widget/Specs --exclude-dir=Data --not-match-f=SpecList.js --not-match-f=.eslintrc.json";
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
      env: Object.assign({}, process.env, {
        CESIUM_VERSION: version,
        CESIUM_PACKAGES: packageJson.workspaces,
      }),
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

function combineForSandcastle() {
  const outputDirectory = join("Build", "Sandcastle", "CesiumUnminified");
  return buildCesium({
    development: false,
    minify: false,
    removePragmas: false,
    node: false,
    outputDirectory: outputDirectory,
  });
}

export const websiteRelease = gulp.series(
  function () {
    return buildCesium({
      development: false,
      minify: false,
      removePragmas: false,
      node: false,
    });
  },
  combineForSandcastle,
  buildDocs
);

export const buildRelease = gulp.series(
  buildEngine,
  buildWidgets,
  // Generate Build/CesiumUnminified
  function () {
    return buildCesium({
      minify: false,
      removePragmas: false,
      node: true,
      sourcemap: false,
    });
  },
  // Generate Build/Cesium
  function () {
    return buildCesium({
      development: false,
      minify: true,
      removePragmas: true,
      node: true,
      sourcemap: false,
    });
  }
);

export const release = gulp.series(
  buildRelease,
  gulp.parallel(buildTs, buildDocs)
);

/**
 * Removes scripts from package.json files to ensure that
 * they still work when run from within the ZIP file.
 *
 * @param {string} packageJsonPath The path to the package.json.
 * @returns {WritableStream} A stream that writes to the updated package.json file.
 */
async function pruneScriptsForZip(packageJsonPath) {
  // Read the contents of the file.
  const contents = await readFile(packageJsonPath);
  const contentsJson = JSON.parse(contents);

  const scripts = contentsJson.scripts;

  // Remove prepare step from package.json to avoid running "prepare" an extra time.
  delete scripts.prepare;

  // Remove build and transform tasks since they do not function as intended from within the release zip
  delete scripts.build;
  delete scripts["build-release"];
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
  delete scripts["website-release"];

  // Set server tasks to use production flag
  scripts["start"] = "node server.js --production";
  scripts["start-public"] = "node server.js --public --production";
  scripts["start-public"] = "node server.js --public --production";
  scripts["test"] = "gulp test --production";
  scripts["test-all"] = "gulp test --all --production";
  scripts["test-webgl"] = "gulp test --include WebGL --production";
  scripts["test-non-webgl"] = "gulp test --exclude WebGL --production";
  scripts["test-webgl-validation"] = "gulp test --webglValidation --production";
  scripts["test-webgl-stub"] = "gulp test --webglStub --production";
  scripts["test-release"] = "gulp test --release --production";

  // Write to a temporary package.json file.
  const noPreparePackageJson = join(
    dirname(packageJsonPath),
    "Build/package.noprepare.json"
  );
  await writeFile(noPreparePackageJson, JSON.stringify(contentsJson, null, 2));

  return gulp.src(noPreparePackageJson).pipe(gulpRename(packageJsonPath));
}

export const postversion = async function () {
  const workspace = argv.workspace;
  if (!workspace) {
    return;
  }
  const directory = workspace.replaceAll(`@${scope}/`, ``);
  const workspacePackageJson = require(`./packages/${directory}/package.json`);
  const version = workspacePackageJson.version;

  // Iterate through all package JSONs that may depend on the updated package and
  // update the version of the updated workspace.
  const packageJsons = await globby([
    "./package.json",
    "./packages/*/package.json",
  ]);
  const promises = packageJsons.map(async (packageJsonPath) => {
    // Ensure that we don't check the updated workspace itself.
    if (basename(dirname(packageJsonPath)) === directory) {
      return;
    }
    // Ensure that we only update workspaces where the dependency to the updated workspace already exists.
    const packageJson = require(packageJsonPath);
    if (!Object.hasOwn(packageJson.dependencies, workspace)) {
      console.log(
        `Skipping update for ${workspace} as it is not a dependency.`
      );
      return;
    }
    // Update the version for the updated workspace.
    packageJson.dependencies[workspace] = version;
    await writeFile(packageJsonPath, JSON.stringify(packageJson, undefined, 2));
  });
  return Promise.all(promises);
};

export const makeZip = gulp.series(release, async function () {
  //For now we regenerate the JS glsl to force it to be unminified in the release zip
  //See https://github.com/CesiumGS/cesium/pull/3106#discussion_r42793558 for discussion.
  await glslToJavaScript(false, "Build/minifyShaders.state", "engine");

  const packageJsonSrc = await pruneScriptsForZip("package.json");
  const enginePackageJsonSrc = await pruneScriptsForZip(
    "packages/engine/package.json"
  );
  const widgetsPackageJsonSrc = await pruneScriptsForZip(
    "packages/widgets/package.json"
  );

  const builtSrc = gulp.src(
    [
      "Build/Cesium/**",
      "Build/CesiumUnminified/**",
      "Build/Documentation/**",
      "Build/Specs/**",
      "Build/package.json",
      "packages/engine/Build/**",
      "packages/widgets/Build/**",
      "!packages/engine/Build/Specs/**",
      "!packages/widgets/Build/Specs/**",
      "!packages/engine/Build/minifyShaders.state",
      "!packages/engine/Build/package.noprepare.json",
      "!packages/widgets/Build/package.noprepare.json",
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
      "packages/engine/index.js",
      "packages/engine/index.d.ts",
      "packages/engine/LICENSE.md",
      "packages/engine/README.md",
      "packages/engine/Source/**",
      "!packages/engine/.gitignore",
      "packages/widgets/index.js",
      "packages/widgets/index.d.ts",
      "packages/widgets/LICENSE.md",
      "packages/widgets/README.md",
      "packages/widgets/Source/**",
      "!packages/widgets/.gitignore",
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
    mergeStream(
      packageJsonSrc,
      enginePackageJsonSrc,
      widgetsPackageJsonSrc,
      builtSrc,
      staticSrc,
      indexSrc
    )
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
        rimraf.sync("./packages/engine/Build/package.noprepare.json");
        rimraf.sync("./packages/widgets/Build/package.noprepare.json");
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
        description: "Skip confirmation step, useful for CI.",
        type: "boolean",
        default: false,
      },
    }).argv;

  const uploadDirectory = argv.directory;
  const bucketName = argv.bucket;
  const dryRun = argv.dryRun;
  const cacheControl = argv.cacheControl ? argv.cacheControl : "max-age=3600";

  if (argv.confirm) {
    return deployCesium(bucketName, uploadDirectory, cacheControl, dryRun);
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

  const refDocPrefix = "cesiumjs/ref-doc/";
  const sandcastlePrefix = "sandcastle/";
  const cesiumViewerPrefix = "cesiumjs/cesium-viewer/";

  const s3Client = new S3Client({
    region: "us-east-1",
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

  if (!isProduction) {
    await listAll(s3Client, bucketName, `${uploadDirectory}/`, existingBlobs);
  }

  async function getContents(file, blobName) {
    const mimeLookup = getMimeType(blobName);
    const contentType = mimeLookup.type;
    const compress = mimeLookup.compress;
    const contentEncoding = compress ? "gzip" : undefined;

    totalFiles++;

    let content = await readFile(file);

    if (compress) {
      const alreadyCompressed = content[0] === 0x1f && content[1] === 0x8b;
      if (alreadyCompressed) {
        if (verbose) {
          console.log(`Skipping compressing already compressed file: ${file}`);
        }
      } else {
        content = gzipSync(content);
      }
    }

    const computeEtag = (content) => {
      return createHash("md5").update(content).digest("base64");
    };

    const index = existingBlobs.indexOf(blobName);
    if (index <= -1) {
      return {
        content,
        etag: computeEtag(content),
        contentType,
        contentEncoding,
      };
    }

    // remove files from the list to clean later
    // as we find them on disk
    existingBlobs.splice(index, 1);

    // get file info
    const headObjectCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: blobName,
    });
    const data = await s3Client.send(headObjectCommand);
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

  async function readAndUpload(prefix, existingPrefix, file) {
    const blobName = `${prefix}${file.replace(existingPrefix, "")}`;

    let fileContents;
    try {
      fileContents = await getContents(file, blobName);
    } catch (e) {
      errors.push(e);
    }

    if (!fileContents) {
      return;
    }

    const content = fileContents.content;
    const etag = fileContents.etag;
    const contentType = fileContents.contentType;
    const contentEncoding = fileContents.contentEncoding;

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

    const putObjectCommand = new PutObjectCommand(params);

    if (dryRun) {
      uploaded++;
      return;
    }

    try {
      await s3Client.send(putObjectCommand);
      uploaded++;
    } catch (e) {
      errors.push(e);
    }
  }

  let uploads;
  if (isProduction) {
    const uploadSandcastle = async () => {
      const files = await globby(["Build/Sandcastle/**"]);
      return Promise.all(
        files.map((file) => {
          return limit(() =>
            readAndUpload(sandcastlePrefix, "Build/Sandcastle/", file)
          );
        })
      );
    };

    const uploadRefDoc = async () => {
      const files = await globby(["Build/Documentation/**"]);
      return Promise.all(
        files.map((file) => {
          return limit(() =>
            readAndUpload(refDocPrefix, "Build/Documentation/", file)
          );
        })
      );
    };

    const uploadCesiumViewer = async () => {
      const files = await globby(["Build/CesiumViewer/**"]);
      return Promise.all(
        files.map((file) => {
          return limit(() =>
            readAndUpload(cesiumViewerPrefix, "Build/CesiumViewer/", file)
          );
        })
      );
    };

    uploads = [
      uploadSandcastle(),
      uploadRefDoc(),
      uploadCesiumViewer(),
      deployCesiumRelease(bucketName, s3Client, errors),
    ];
  } else {
    const files = await globby(
      [
        "Apps/**",
        "Build/**",
        "!Build/CesiumDev/**",
        "packages/**",
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

    uploads = files.map((file) => {
      return limit(() => readAndUpload(`${uploadDirectory}/`, "", file));
    });
  }

  await Promise.all(uploads);

  console.log(
    `Skipped ${skipped} files and successfully uploaded ${uploaded} files of ${
      totalFiles - skipped
    } files.`
  );

  if (!isProduction && existingBlobs.length >= 0) {
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
        const deleteObjectsCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects,
          },
        });

        try {
          if (!dryRun) {
            await s3Client.send(deleteObjectsCommand);
          }
        } catch (e) {
          errors.push(e);
        }

        if (verbose) {
          console.log(`Cleaned ${objects.length} files.`);
        }
      };

      await Promise.all(batches.map(deleteObjects));
    }
  }

  if (errors.length === 0) {
    return;
  }

  console.log("Errors: ");
  errors.map(console.log);
  return Promise.reject("There was an error while deploying Cesium");
}

async function deployCesiumRelease(bucketName, s3Client, errors) {
  const releaseDir = "cesiumjs/releases";
  const quiet = process.env.TRAVIS;

  let release;
  try {
    // Deploy any new releases
    const response = await fetch(
      "https://api.github.com/repos/CesiumGS/cesium/releases/latest",
      {
        method: "GET",
        headers: {
          Authorization: process.env.TOKEN
            ? `token ${process.env.TOKEN}`
            : undefined,
          "User-Agent": "cesium.com-build",
        },
      }
    );

    const body = await response.json();

    release = {
      tag: body.tag_name,
      name: body.name,
      url: body.assets[0].browser_download_url,
    };

    const headObjectCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: posix.join(releaseDir, release.tag, "cesium.zip"),
    });
    await s3Client.send(headObjectCommand);
    console.log(
      `Cesium version ${release.tag} up to date. Skipping release deployment.`
    );
  } catch (error) {
    if (error.$metadata) {
      const { httpStatusCode } = error.$metadata;
      // The current version is not uploaded
      if (httpStatusCode === 404) {
        console.log("Updating cesium version...");
        const data = await download(release.url);
        // upload and unzip contents
        const key = posix.join(releaseDir, release.tag, "cesium.zip");
        await uploadObject(bucketName, s3Client, key, data, quiet);
        const files = await decompress(data);
        const limit = pLimit(5);
        return Promise.all(
          files.map((file) => {
            return limit(async () => {
              if (file.path.startsWith("Apps")) {
                // skip uploading apps and sandcastle
                return;
              }

              // Upload to release directory
              const key = posix.join(releaseDir, release.tag, file.path);
              return uploadObject(bucketName, s3Client, key, file.data, quiet);
            });
          })
        );
      }
    }

    // else, unexpected error
    errors.push(error);
  }
}

async function uploadObject(bucketName, s3Client, key, contents, quiet) {
  if (!quiet) {
    console.log(`Uploading ${key}...`);
  }

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: contents,
      ContentType: mime.getType(key) || undefined,
      CacheControl: "public, max-age=1800",
    },
  });
  return upload.done();
}

function getMimeType(filename) {
  //Remove page anchors from documentation, as mime does not properly handle them
  filename = filename.split("#")[0];

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
async function listAll(s3Client, bucketName, prefix, files, marker) {
  const listObjectsCommand = new ListObjectsCommand({
    Bucket: bucketName,
    MaxKeys: 1000,
    Prefix: prefix,
    Marker: marker,
  });
  const data = await s3Client.send(listObjectsCommand);
  const items = data.Contents;
  if (!items) {
    return;
  }

  for (let i = 0; i < items.length; i++) {
    files.push(items[i].Key);
  }

  if (data.IsTruncated) {
    // get next page of results
    return listAll(
      s3Client,
      bucketName,
      prefix,
      files,
      files[files.length - 1]
    );
  }
}

export async function deploySetVersion() {
  const buildVersion = argv.buildVersion;
  if (buildVersion) {
    // NPM versions can only contain alphanumeric and hyphen characters
    packageJson.version += `-${buildVersion.replace(/[^[0-9A-Za-z-]/g, "")}`;
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

/**
 * Generates coverage report.
 *
 * @param {object} options An object with the following properties:
 * @param {string} options.outputDirectory The output directory for the generated build artifacts.
 * @param {string} options.coverageDirectory The path where the coverage reports should be saved to.
 * @param {string} options.specList The path to the spec list for the package.
 * @param {RegExp} options.filter The filter for finding which files should be instrumented.
 * @param {boolean} [options.webglStub=false] True if WebGL stub should be used when running tests.
 * @param {boolean} [options.suppressPassed=false] True if output should be suppressed for tests that pass.
 * @param {boolean} [options.failTaskOnError=false] True if the gulp task should fail on errors in the tests.
 * @param {string} options.workspace The name of the workspace, if any.
 */
export async function runCoverage(options) {
  const webglStub = options.webglStub ?? false;
  const suppressPassed = options.suppressPassed ?? false;
  const failTaskOnError = options.failTaskOnError ?? false;
  const workspace = options.workspace;

  const folders = [];
  let browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  const instrumenter = createInstrumenter({
    esModules: true,
  });

  // Setup plugin to use instrumenter on source files.

  const instrumentPlugin = {
    name: "instrument",
    setup: (build) => {
      build.onLoad(
        {
          filter: options.filter,
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

  const karmaBundle = join(options.outputDirectory, "karma-main.js");
  await esbuild({
    entryPoints: ["Specs/karma-main.js"],
    bundle: true,
    sourcemap: true,
    format: "esm",
    target: "es2020",
    external: ["https", "http", "url", "zlib"],
    outfile: karmaBundle,
    logLevel: "error", // print errors immediately, and collect warnings so we can filter out known ones
  });

  // Generate instrumented bundle for Specs.

  const specListBundle = join(options.outputDirectory, "SpecList.js");
  await esbuild({
    entryPoints: [options.specList],
    bundle: true,
    sourcemap: true,
    format: "esm",
    target: "es2020",
    external: ["https", "http", "url", "zlib"],
    outfile: specListBundle,
    plugins: [instrumentPlugin],
    logLevel: "error", // print errors immediately, and collect warnings so we can filter out known ones
  });

  let files = [
    {
      pattern: karmaBundle,
      included: true,
      type: "module",
    },
    {
      pattern: specListBundle,
      included: true,
      type: "module",
    },
    // Static assets are always served from the shared/combined folders.
    { pattern: "Build/CesiumUnminified/**", included: false },
    { pattern: "Specs/Data/**", included: false },
    { pattern: "Specs/TestWorkers/**", included: false },
    { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
  ];

  let proxies;
  if (workspace) {
    // Setup files and proxies for the engine package first, since it is the lowest level dependency.
    files = [
      {
        pattern: karmaBundle,
        included: true,
        type: "module",
      },
      {
        pattern: specListBundle,
        included: true,
        type: "module",
      },
      { pattern: "Specs/Data/**", included: false },
      { pattern: "packages/engine/Build/Workers/**", included: false },
      { pattern: "packages/engine/Source/Assets/**", included: false },
      { pattern: "packages/engine/Source/ThirdParty/**", included: false },
      { pattern: "packages/engine/Source/Widget/*.css", included: false },
      { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
      { pattern: "Specs/TestWorkers/**", included: false },
    ];

    proxies = {
      "/base/Build/CesiumUnminified/Assets/":
        "/base/packages/engine/Source/Assets/",
      "/base/Build/CesiumUnminified/ThirdParty/":
        "/base/packages/engine/Source/ThirdParty/",
      "/base/Build/CesiumUnminified/Widgets/CesiumWidget/":
        "/base/packages/engine/Source/Widget/",
      "/base/Build/CesiumUnminified/Workers/":
        "/base/packages/engine/Build/Workers/",
    };
  }

  // Setup Karma config.

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
      files: files,
      proxies: proxies,
      reporters: ["spec", "coverage"],
      coverageReporter: {
        dir: options.coverageDirectory,
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
      writeFileSync(join(options.coverageDirectory, "index.html"), html);

      if (!process.env.TRAVIS) {
        folders.forEach(function (dir) {
          open(join(options.coverageDirectory, `${dir}/index.html`));
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

export async function coverage() {
  let workspace = argv.workspace;
  if (workspace) {
    workspace = workspace.replaceAll(`@${scope}/`, ``);
  }

  if (workspace === "engine") {
    return runCoverage({
      outputDirectory: "packages/engine/Build/Instrumented",
      coverageDirectory: "packages/engine/Build/Coverage",
      specList: "packages/engine/Specs/SpecList.js",
      filter: /packages(\\|\/)engine(\\|\/)Source((\\|\/)\w+)+\.js$/,
      webglStub: argv.webglStub,
      suppressPassed: argv.suppressPassed,
      failTaskOnError: argv.failTaskOnError,
      workspace: workspace,
    });
  } else if (workspace === "widgets") {
    return runCoverage({
      outputDirectory: "packages/widgets/Build/Instrumented",
      coverageDirectory: "packages/widgets/Build/Coverage",
      specList: "packages/widgets/Specs/SpecList.js",
      filter: /packages(\\|\/)widgets(\\|\/)Source((\\|\/)\w+)+\.js$/,
      webglStub: argv.webglStub,
      suppressPassed: argv.suppressPassed,
      failTaskOnError: argv.failTaskOnError,
      workspace: workspace,
    });
  }

  return runCoverage({
    outputDirectory: "Build/Instrumented",
    coverageDirectory: "Build/Coverage",
    specList: "Specs/SpecList.js",
    filter: /packages(\\|\/)(engine|widgets)(\\|\/)Source((\\|\/)\w+)+\.js$/,
    webglStub: argv.webglStub,
    suppressPassed: argv.suppressPassed,
    failTaskOnError: argv.failTaskOnError,
  });
}

// Cache contexts for successive calls to test
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
  const isProduction = argv.production;

  let workspace = argv.workspace;
  if (workspace) {
    workspace = workspace.replaceAll(`@${scope}/`, ``);
  }

  if (!isProduction) {
    console.log("Building specs...");
    await buildCesium({
      iife: true,
    });
  }

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

  let proxies;
  if (workspace) {
    // Setup files and proxies for the engine package first, since it is the lowest level dependency.

    files = [
      {
        pattern: `packages/${workspace}/Build/Specs/karma-main.js`,
        included: true,
        type: "module",
      },
      {
        pattern: `packages/${workspace}/Build/Specs/SpecList.js`,
        included: true,
        type: "module",
      },
      { pattern: "Specs/Data/**", included: false },
      { pattern: "packages/engine/Build/Workers/**", included: false },
      { pattern: "packages/engine/Source/Assets/**", included: false },
      { pattern: "packages/engine/Source/ThirdParty/**", included: false },
      { pattern: "packages/engine/Source/Widget/*.css", included: false },
      { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
      { pattern: "Specs/TestWorkers/**", included: false },
    ];

    proxies = {
      "/base/Build/CesiumUnminified/Assets/":
        "/base/packages/engine/Source/Assets/",
      "/base/Build/CesiumUnminified/ThirdParty/":
        "/base/packages/engine/Source/ThirdParty/",
      "/base/Build/CesiumUnminified/Widgets/CesiumWidget/":
        "/base/packages/engine/Source/Widget/",
      "/base/Build/CesiumUnminified/Workers/":
        "/base/packages/engine/Build/Workers/",
    };
  }

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
      proxies: proxies,
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

  return new Promise((resolve, reject) => {
    const server = new karma.Server(config, function doneCallback(exitCode) {
      if (failTaskOnError && exitCode) {
        reject(exitCode);
        return;
      }

      resolve();
    });
    server.start();
  });
}
/**
 * Generates TypeScript definition file (.d.ts) for a package.
 *
 * @param {*} workspaceName
 * @param {string} definitionsPath The path of the .d.ts file to generate.
 * @param {*} configurationPath
 * @param {*} processSourceFunc
 * @param {*} processModulesFunc
 * @param {*} importModules
 * @returns
 */
function generateTypeScriptDefinitions(
  workspaceName,
  definitionsPath,
  configurationPath,
  processSourceFunc,
  processModulesFunc,
  importModules
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

  const regex = /^declare[ const ]*(function|class|namespace|enum) (.+)/gm;
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
  source = `declare module "@${scope}/${workspaceName}" {
${source}
}
`;

  if (importModules) {
    let imports = "";
    Object.keys(importModules).forEach((workspace) => {
      const workspaceModules = Array.from(importModules[workspace]).filter(
        (importModule) => source.indexOf(importModule) !== -1
      );
      imports += `import { ${workspaceModules.join(
        ",\n"
      )} } from "@${scope}/${workspace}";\n`;
    });
    source = imports + source;
  }

  // Write the final source file back out
  writeFileSync(definitionsPath, source);

  return Promise.resolve(publicModules);
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

  // Manually add a type definition from Viewer to avoid circular dependency
  // with the widgets package. This will no longer be needed past Cesium 1.100.
  newSource += `
  /**
   * @property scene - The scene in the widget.
   */
  export type Viewer = {
      scene: Scene;
  };
  `;

  return newSource;
}

function createTypeScriptDefinitions() {
  // Run jsdoc with tsd-jsdoc to generate an initial Cesium.d.ts file.
  execSync("npx jsdoc --configure Tools/jsdoc/ts-conf.json", {
    stdio: "inherit",
  });

  let source = readFileSync("Source/Cesium.d.ts").toString();

  // All of our enum assignments that alias to WebGLConstants, such as PixelDatatype.js
  // end up as enum strings instead of actually mapping values to WebGLConstants.
  // We fix this with a simple regex replace later on, but it means the
  // WebGLConstants constants enum needs to be defined in the file before it can
  // be used.  This block of code reads in the TS file, finds the WebGLConstants
  // declaration, and then writes the file back out (in memory to source) with
  // WebGLConstants being the first module.
  const node = typeScript.createSourceFile(
    "Source/Cesium.d.ts",
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
  source = `declare module "cesium" {
${source}
}

`;

  // Write the final source file back out
  writeFileSync("Source/Cesium.d.ts", source);

  // Use tsc to compile it and make sure it is valid
  execSync("npx tsc -p Tools/jsdoc/tsconfig.json", {
    stdio: "inherit",
  });

  // Also compile our smokescreen to make sure interfaces work as expected.
  execSync("npx tsc -p Specs/TypeScript/tsconfig.json", {
    stdio: "inherit",
  });

  return Promise.resolve();
}

/**
 * Reads `ThirdParty.extra.json` file
 * @param {string} path Path to `ThirdParty.extra.json`
 * @param {string[]} discoveredDependencies  List of previously discovered modules
 * @returns {Promise<object[]>} A promise to an array of objects with 'name`, `license`, and `url` strings
 */
async function getLicenseDataFromThirdPartyExtra(path, discoveredDependencies) {
  if (!existsSync(path)) {
    return Promise.reject(`${path} does not exist`);
  }

  const contents = await readFile(path);
  const thirdPartyExtra = JSON.parse(contents);
  return Promise.all(
    thirdPartyExtra.map(async function (module) {
      if (!discoveredDependencies.includes(module.name)) {
        let result = await getLicenseDataFromPackage(
          packageJson,
          module.name,
          discoveredDependencies,
          module.license,
          module.notes
        );

        if (result) {
          return result;
        }

        // Resursively check the workspaces
        for (const workspace of packageJson.workspaces) {
          const workspacePackageJson = require(`./${workspace}/package.json`);
          result = await getLicenseDataFromPackage(
            workspacePackageJson,
            module.name,
            discoveredDependencies,
            module.license,
            module.notes
          );

          if (result) {
            return result;
          }
        }

        // If this is not a npm module, return existing info
        discoveredDependencies.push(module.name);
        return module;
      }
    })
  );
}

/**
 * Extracts name, license, and url from `package.json` file.
 *
 * @param {string} packageName Name of package
 * @param {string[]} discoveredDependencies List of previously discovered modules
 * @param {string[]} licenseOverride If specified, override info fetched from package.json. Useful in the case where there are multiple licenses and we might chose a single one.
 * @returns {Promise<object>} A promise to an object with 'name`, `license`, and `url` strings
 */
async function getLicenseDataFromPackage(
  packageJson,
  packageName,
  discoveredDependencies,
  licenseOverride,
  notes
) {
  if (
    !packageJson.dependencies[packageName] &&
    (!packageJson.devDependencies || !packageJson.devDependencies[packageName])
  ) {
    return;
  }

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
  const streams = [];
  let appStream = gulp.src([
    "Apps/Sandcastle/**",
    "!Apps/Sandcastle/load-cesium-es6.js",
    "!Apps/Sandcastle/images/**",
    "!Apps/Sandcastle/gallery/**.jpg",
  ]);

  if (isProduction) {
    // Remove swap out ESM modules for the IIFE build
    appStream = appStream
      .pipe(
        gulpReplace(
          '    <script type="module" src="../load-cesium-es6.js"></script>',
          '    <script src="../CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "../CesiumUnminified/";</script>'
        )
      )
      .pipe(
        gulpReplace(
          '    <script type="module" src="load-cesium-es6.js"></script>',
          '    <script src="CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "CesiumUnminified/";</script>'
        )
      )
      // Fix relative paths for new location
      .pipe(gulpReplace("../../../Build", ".."))
      .pipe(gulpReplace("../../../Source", "../CesiumUnminified"))
      .pipe(gulpReplace("../../Source", "."))
      .pipe(gulpReplace("../../../ThirdParty", "./ThirdParty"))
      .pipe(gulpReplace("../../ThirdParty", "./ThirdParty"))
      .pipe(gulpReplace("../ThirdParty", "./ThirdParty"))
      .pipe(gulpReplace("../Apps/Sandcastle", "."))
      .pipe(gulpReplace("../../SampleData", "../SampleData"))
      .pipe(
        gulpReplace("../../Build/Documentation", "/learn/cesiumjs/ref-doc/")
      )
      .pipe(gulp.dest("Build/Sandcastle"));
  } else {
    // Remove swap out ESM modules for the IIFE build
    appStream = appStream
      .pipe(
        gulpReplace(
          '    <script type="module" src="../load-cesium-es6.js"></script>',
          '    <script src="../../../Build/CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "../../../Build/CesiumUnminified/";</script>'
        )
      )
      .pipe(
        gulpReplace(
          '    <script type="module" src="load-cesium-es6.js"></script>',
          '    <script src="../../CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "../../CesiumUnminified/";</script>'
        )
      )
      // Fix relative paths for new location
      .pipe(gulpReplace("../../../Build", "../../.."))
      .pipe(gulpReplace("../../Source", "../../../Source"))
      .pipe(gulpReplace("../../ThirdParty", "../../../ThirdParty"))
      .pipe(gulpReplace("../../SampleData", "../../../../Apps/SampleData"))
      .pipe(gulpReplace("Build/Documentation", "Documentation"))
      .pipe(gulp.dest("Build/Apps/Sandcastle"));
  }
  streams.push(appStream);

  let imageStream = gulp.src(
    ["Apps/Sandcastle/gallery/**.jpg", "Apps/Sandcastle/images/**"],
    {
      base: "Apps/Sandcastle",
      buffer: false,
    }
  );
  if (isProduction) {
    imageStream = imageStream.pipe(gulp.dest("Build/Sandcastle"));
  } else {
    imageStream = imageStream.pipe(gulp.dest("Build/Apps/Sandcastle"));
  }
  streams.push(imageStream);

  if (isProduction) {
    const fileStream = gulp
      .src(["ThirdParty/**"])
      .pipe(gulp.dest("Build/Sandcastle/ThirdParty"));
    streams.push(fileStream);

    const dataStream = gulp
      .src(["Apps/SampleData/**"])
      .pipe(gulp.dest("Build/Sandcastle/SampleData"));
    streams.push(dataStream);
  }

  const standaloneStream = gulp
    .src(["Apps/Sandcastle/standalone.html"])
    .pipe(gulpReplace("../../../", "."))
    .pipe(
      gulpReplace(
        '    <script type="module" src="load-cesium-es6.js"></script>',
        '    <script src="../CesiumUnminified/Cesium.js"></script>\n' +
          '    <script>window.CESIUM_BASE_URL = "../CesiumUnminified/";</script>'
      )
    )
    .pipe(gulpReplace("../../Build", "."))
    .pipe(gulp.dest("Build/Sandcastle"));
  streams.push(standaloneStream);

  return streamToPromise(mergeStream(...streams));
}

async function buildCesiumViewer() {
  const cesiumViewerOutputDirectory = isProduction
    ? "Build/CesiumViewer"
    : "Build/Apps/CesiumViewer";
  mkdirp.sync(cesiumViewerOutputDirectory);

  const config = defaultESBuildOptions();
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
  // Configure Cesium base path to use built
  config.define = { CESIUM_BASE_URL: `"."` };
  config.external = ["https", "http", "url", "zlib"];
  config.outdir = cesiumViewerOutputDirectory;
  config.outbase = "Apps/CesiumViewer";
  config.logLevel = "error"; // print errors immediately, and collect warnings so we can filter out known ones
  const result = await esbuild(config);

  handleBuildWarnings(result);

  await esbuild({
    entryPoints: ["packages/widgets/Source/InfoBox/InfoBoxDescription.css"],
    minify: true,
    bundle: true,
    loader: {
      ".gif": "text",
      ".png": "text",
    },
    outdir: join(cesiumViewerOutputDirectory, "Widgets"),
    outbase: "packages/widgets/Source/",
  });

  await bundleWorkers({
    input: [
      "packages/engine/Source/Workers/**",
      "packages/engine/Source/ThirdParty/Workers/**",
    ],
    inputES6: ["packages/engine/Source/WorkersES6/*.js"],
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
