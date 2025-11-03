import { writeFileSync, copyFileSync, readFileSync, existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, basename, resolve, dirname } from "path";
import { exec, execSync } from "child_process";
import fetch from "node-fetch";
import { createRequire } from "module";
import { finished } from "stream/promises";

import gulp from "gulp";
import { globby } from "globby";
import open from "open";
import { rimraf } from "rimraf";
import karma from "karma";
import yargs from "yargs";
import typeScript from "typescript";
import { build as esbuild } from "esbuild";
import { createInstrumenter } from "istanbul-lib-instrument";

import {
  buildCesium,
  buildEngine,
  buildWidgets,
  bundleWorkers,
  glslToJavaScript,
  createCombinedSpecList,
  createJsHintOptions,
} from "./scripts/build.js";

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
function getWorkspaces(onlyDependencies = false) {
  const dependencies = Object.keys(packageJson.dependencies);
  return onlyDependencies
    ? packageJson.workspaces.filter((workspace) => {
        return dependencies.includes(
          workspace.replace("packages", `@${scope}`),
        );
      })
    : packageJson.workspaces;
}

const devDeployUrl = process.env.DEPLOYED_URL;

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
  "!packages/engine/Source/ThirdParty/Workers/**",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];

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

export async function build() {
  // Configure build options from command line arguments.
  const minify = argv.minify ?? false;
  const removePragmas = argv.removePragmas ?? false;
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

export const buildWatch = gulp.series(build, async function buildWatch() {
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

      await bundleWorkers({
        minify: minify,
        path: outputDirectory,
        removePragmas: removePragmas,
        sourcemap: sourcemap,
      });
    },
  );

  gulp.watch(
    watchedSpecFiles,
    {
      events: ["add", "unlink"],
    },
    async () => {
      createCombinedSpecList();
      await specs.rebuild();
    },
  );

  gulp.watch(
    watchedSpecFiles,
    {
      events: ["change"],
    },
    async () => {
      await specs.rebuild();
    },
  );

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
    workspaces = getWorkspaces(true);
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
      importModules,
    );
    importModules[directory] = workspaceModules;
  }

  if (argv.workspace) {
    return;
  }

  // Generate types for CesiumJS.
  await createTypeScriptDefinitions();
}

const filesToClean = [
  "Source/Cesium.js",
  "Source/Shaders/**/*.js",
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
      " Specs/ packages/engine/Specs packages/widget/Specs --exclude-dir=Data --not-match-f=SpecList.js --not-match-f=eslint.config.js";
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
    "node_modules/draco3d/draco_decoder.wasm",
    "packages/engine/Source/ThirdParty/draco_decoder.wasm",
  );
  // Copy Gaussian Splatting utilities into Source
  copyFileSync(
    "node_modules/@cesium/wasm-splats/wasm_splats_bg.wasm",
    "packages/engine/Source/ThirdParty/wasm_splats_bg.wasm",
  );
  // Copy zip.js worker and wasm files to Source/ThirdParty
  copyFileSync(
    "node_modules/@zip.js/zip.js/dist/zip-web-worker.js",
    "packages/engine/Source/ThirdParty/Workers/zip-web-worker.js",
  );
  copyFileSync(
    "node_modules/@zip.js/zip.js/dist/zip-module.wasm",
    "packages/engine/Source/ThirdParty/zip-module.wasm",
  );

  // Copy prism.js and prism.css files into Tools
  copyFileSync(
    "node_modules/prismjs/prism.js",
    "Tools/jsdoc/cesium_template/static/javascript/prism.js",
  );
  copyFileSync(
    "node_modules/prismjs/themes/prism.min.css",
    "Tools/jsdoc/cesium_template/static/styles/prism.css",
  );

  // Copy jasmine runner files into Specs
  const files = await globby([
    "node_modules/jasmine-core/lib/jasmine-core",
    "!node_modules/jasmine-core/lib/jasmine-core/example",
  ]);

  const stream = gulp.src(files).pipe(gulp.dest("Specs/jasmine"));
  await finished(stream);
  return stream;
}

export const cloc = gulp.series(clean, clocSource);

//Builds the documentation
export async function buildDocs() {
  const generatePrivateDocumentation = argv.private ? "--private" : "";

  execSync(
    `npx jsdoc --configure Tools/jsdoc/conf.json --pedantic ${generatePrivateDocumentation}`,
    {
      stdio: "inherit",
      env: Object.assign({}, process.env, {
        CESIUM_VERSION: version,
        CESIUM_PACKAGES: getWorkspaces(true),
      }),
    },
  );

  const stream = gulp
    .src(["Documentation/Images/**"], { encoding: false })
    .pipe(gulp.dest("Build/Documentation/Images"));

  await finished(stream);
  return stream;
}

export async function buildDocsWatch() {
  await buildDocs();
  console.log("Listening for changes in documentation...");
  return gulp.watch(sourceFiles, buildDocs);
}

export const websiteRelease = gulp.series(
  buildEngine,
  buildWidgets,
  function websiteReleaseBuild() {
    return buildCesium({
      development: false,
      minify: false,
      removePragmas: false,
      node: false,
    });
  },
  function websiteReleaseBuildMinified() {
    return buildCesium({
      minify: true,
      removePragmas: true,
      node: false,
    });
  },
  function combineForSandcastle() {
    const outputDirectory = join("Build", "Sandcastle", "CesiumUnminified");
    return buildCesium({
      development: false,
      minify: false,
      removePragmas: false,
      node: false,
      outputDirectory: outputDirectory,
    });
  },
  buildDocs,
);

export const buildRelease = gulp.series(
  buildEngine,
  buildWidgets,
  // Generate Build/CesiumUnminified
  function buildCesiumForNode() {
    return buildCesium({
      minify: false,
      removePragmas: false,
      node: true,
      sourcemap: false,
    });
  },
  // Generate Build/Cesium
  function buildMinifiedCesiumForNode() {
    return buildCesium({
      development: false,
      minify: true,
      removePragmas: true,
      node: true,
      sourcemap: false,
    });
  },
);

export const release = gulp.series(
  buildRelease,
  gulp.parallel(buildTs, buildDocs),
);

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
        `Skipping update for ${workspace} as it is not a dependency.`,
      );
      return;
    }
    // Update the version for the updated workspace.
    packageJson.dependencies[workspace] = `^${version}`;
    await writeFile(packageJsonPath, JSON.stringify(packageJson, undefined, 2));
  });
  return Promise.all(promises);
};

export async function deploySetVersion() {
  const buildVersion = argv.buildVersion;
  if (buildVersion) {
    // NPM versions can only contain alphanumeric and hyphen characters
    packageJson.version += `-${buildVersion.replace(/[^[0-9A-Za-z-]/g, "")}`;
    return writeFile("package.json", JSON.stringify(packageJson, undefined, 2));
  }
}

export async function deployStatus() {
  const status = argv.status;
  const message = argv.message;
  const deployUrl = `${devDeployUrl}`;
  const zipUrl = `${deployUrl}Cesium-${version}.zip`;
  const npmUrl = `${deployUrl}cesium-${version}.tgz`;
  const coverageUrl = `${deployUrl}Build/Coverage/index.html`;

  return Promise.all([
    setStatus(status, deployUrl, message, "deploy / artifact: deployment"),
    setStatus(status, zipUrl, message, "deploy / artifact: zip file"),
    setStatus(status, npmUrl, message, "deploy / artifact: npm package"),
    setStatus(
      status,
      coverageUrl,
      message,
      "deploy / artifact: coverage results",
    ),
  ]);
}

async function setStatus(state, targetUrl, description, context) {
  // skip if the environment does not have the token
  if (!process.env.GITHUB_TOKEN) {
    return;
  }

  const body = {
    state: state,
    target_url: targetUrl,
    description: description,
    context: context,
  };

  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO}/statuses/${process.env.GITHUB_SHA}`,
    {
      method: "post",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "Cesium",
      },
    },
  );

  const result = await response.json();
  return result;
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
              args.path,
            );

            return { contents: generatedCode };
          } catch (e) {
            return {
              errors: {
                text: e.message,
              },
            };
          }
        },
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
    { pattern: "Specs/Data/**", included: false },
    { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
    { pattern: "Build/CesiumUnminified/**", included: false },
    { pattern: "Build/Specs/TestWorkers/**.js", included: false },
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
      { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
      { pattern: "packages/engine/Build/Workers/**", included: false },
      { pattern: "packages/engine/Source/Assets/**", included: false },
      { pattern: "packages/engine/Source/ThirdParty/**", included: false },
      { pattern: "packages/engine/Source/Widget/*.css", included: false },
      { pattern: "Build/Specs/TestWorkers/**.js", included: false },
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
    { promiseConfig: true, throwErrors: true },
  );

  return new Promise((resolve, reject) => {
    const server = new karma.Server(config, function doneCallback(e) {
      let html = "<!doctype html><html><body><ul>";
      folders.forEach(function (folder) {
        html += `<li><a href="${encodeURIComponent(
          folder,
        )}/index.html">${folder}</a></li>`;
      });
      html += "</ul></body></html>";
      writeFileSync(join(options.coverageDirectory, "index.html"), html);

      if (!process.env.CI) {
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
  const debug = argv.debug ? true : false;
  const debugCanvasWidth = argv.debugCanvasWidth;
  const debugCanvasHeight = argv.debugCanvasHeight;
  const isProduction = argv.production;
  const includeName = argv.includeName
    ? argv.includeName.replace(/Spec$/, "")
    : "";

  let workspace = argv.workspace;
  if (workspace) {
    workspace = workspace.replaceAll(`@${scope}/`, ``);
  }

  if (!isProduction && !release) {
    console.log("Building specs...");
    await buildCesium({
      iife: true,
    });
  }

  let browsers = debug ? ["ChromeDebugging"] : ["Chrome"];
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
    { pattern: "Build/Specs/TestWorkers/**.js", included: false },
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
      { pattern: "Specs/TestWorkers/**/*.wasm", included: false },
      { pattern: "packages/engine/Build/Workers/**", included: false },
      { pattern: "packages/engine/Source/Assets/**", included: false },
      { pattern: "packages/engine/Source/ThirdParty/**", included: false },
      { pattern: "packages/engine/Source/Widget/*.css", included: false },
      { pattern: "Build/Specs/TestWorkers/**.js", included: false },
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
      { pattern: "Build/Specs/TestWorkers/**.js", included: false },
    ];
  }

  const config = await karma.config.parseConfig(
    karmaConfigFile,
    {
      port: 9876,
      singleRun: !debug,
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
    { promiseConfig: true, throwErrors: true },
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
  importModules,
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
      (match, p1) => `= WebGLConstants.${p1}`,
    )
    // Strip const enums which can cause errors - https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls
    .replace(/^(\s*)(export )?const enum (\S+) {(\s*)$/gm, "$1$2enum $3 {$4")
    // Replace JSDoc generation version of defined with an improved version using TS type predicates
    .replace(
      /\n?export function defined\(value: any\): boolean;/gm,
      `\n${readFileSync("./packages/engine/Source/Core/defined.d.ts")
        .toString()
        .replace(/\n*\/\*.*?\*\/\n*/gms, "")
        .replace("export default", "export")}`,
    )
    // Replace JSDoc generation version of Check with one that asserts the type of variables after called
    .replace(
      /\/\*\*[\*\s\w]*?\*\/\nexport const Check: any;/m,
      `\n${readFileSync("./packages/engine/Source/Core/Check.d.ts")
        .toString()
        .replace(/export default.*\n?/, "")
        .replace("const Check", "export const Check")}`,
    )
    // Fix https://github.com/CesiumGS/cesium/issues/10498 so we can use the rest parameter expand tuple
    .replace(
      "raiseEvent(...arguments: Parameters<Listener>[]): void;",
      "raiseEvent(...arguments: Parameters<Listener>): void;",
    );

  if (importModules) {
    let imports = "";
    Object.keys(importModules).forEach((workspace) => {
      const workspaceModules = Array.from(importModules[workspace]).filter(
        (importModule) => source.indexOf(importModule) !== -1,
      );
      imports += `import { ${workspaceModules.join(
        ",\n",
      )} } from "@${scope}/${workspace}";\n`;
    });
    source = imports + source;
  }

  // Wrap the source to actually be inside of a declared cesium module
  // and add any workaround and private utility types.
  source = `declare module "@${scope}/${workspaceName}" {
${source}
}
`;

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
    typeScript.ScriptTarget.Latest,
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
    node,
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
        node,
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
    typeScript.ScriptTarget.Latest,
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
    node,
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
        node,
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
      (match, p1) => `= WebGLConstants.${p1}`,
    )
    // Strip const enums which can cause errors - https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls
    .replace(/^(\s*)(export )?const enum (\S+) {(\s*)$/gm, "$1$2enum $3 {$4")
    // Replace JSDoc generation version of defined with an improved version using TS type predicates
    .replace(
      /\n?export function defined\(value: any\): boolean;/gm,
      `\n${readFileSync("./packages/engine/Source/Core/defined.d.ts")
        .toString()
        .replace(/\n*\/\*.*?\*\/\n*/gms, "")
        .replace("export default", "export")}`,
    )
    // Replace JSDoc generation version of Check with one that asserts the type of variables after called
    .replace(
      /\/\*\*[\*\s\w]*?\*\/\nexport const Check: any;/m,
      `\n${readFileSync("./packages/engine/Source/Core/Check.d.ts")
        .toString()
        .replace(/export default.*\n?/, "")
        .replace("const Check", "export const Check")}`,
    )
    // Fix https://github.com/CesiumGS/cesium/issues/10498 to have rest parameter expand tuple
    .replace(
      "raiseEvent(...arguments: Parameters<Listener>[]): void;",
      "raiseEvent(...arguments: Parameters<Listener>): void;",
    );

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
          module.notes,
        );

        if (result) {
          return result;
        }

        // Recursively check the workspaces
        for (const workspace of getWorkspaces(true)) {
          const workspacePackageJson = require(`./${workspace}/package.json`);
          result = await getLicenseDataFromPackage(
            workspacePackageJson,
            module.name,
            discoveredDependencies,
            module.license,
            module.notes,
          );

          if (result) {
            return result;
          }
        }

        // If this is not a npm module, return existing info
        discoveredDependencies.push(module.name);
        return module;
      }
    }),
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
  notes,
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
      new Error(`Unable to read ${packageName} license information`),
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
    discoveredDependencies,
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
