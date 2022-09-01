/*eslint-env node*/
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
const decompress = require("decompress");
const download = require("download");
const crypto = require("crypto");
const zlib = require("zlib");
const readline = require("readline");
const request = require("request");

const globby = require("globby");
const gulpTap = require("gulp-tap");
const open = require("open");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const mergeStream = require("merge-stream");
const streamToPromise = require("stream-to-promise");
const gulp = require("gulp");
const gulpZip = require("gulp-zip");
const gulpRename = require("gulp-rename");
const gulpReplace = require("gulp-replace");
const Promise = require("bluebird");
const Karma = require("karma");
const yargs = require("yargs");
const AWS = require("aws-sdk");
const mime = require("mime");
const typescript = require("typescript");
const esbuild = require("esbuild");
const istanbul = require("istanbul-lib-instrument");

const {
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
} = require("./build.cjs");
const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}
const bucketName = "cesium.com-next";
const karmaConfigFile = path.join(__dirname, "Specs/karma.conf.cjs");
const travisDeployUrl =
  "http://cesium-dev.s3-website-us-east-1.amazonaws.com/cesium/";

//Gulp doesn't seem to have a way to get the currently running tasks for setting
//per-task variables.  We use the command line argument here to detect which task is being run.
const taskName = process.argv[2];
const noDevelopmentGallery =
  taskName === "release" ||
  taskName === "make-zip" ||
  taskName === "website-release";
const verbose = yargs.argv.verbose;

let concurrency = yargs.argv.concurrency;
if (!concurrency) {
  concurrency = os.cpus().length;
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

function build(options) {
  options = options || {};
  mkdirp.sync("Build");

  const outputDirectory =
    options.outputDirectory ||
    path.join("Build", `Cesium${!options.minify ? "Unminified" : ""}`);
  rimraf.sync(outputDirectory);

  fs.writeFileSync(
    "Build/package.json",
    JSON.stringify({
      type: "commonjs",
    }),
    "utf8"
  );

  glslToJavaScript(options.minify, "Build/minifyShaders.state");
  createCesiumJs();
  createSpecList();
  createJsHintOptions();
  return Promise.all(
    buildCesiumJs({
      minify: options.minify,
      iife: true,
      sourcemap: options.sourcemap,
      removePragmas: options.removePragmas,
      path: outputDirectory,
      node: options.node,
    }),
    buildWorkers({
      minify: options.minify,
      sourcemap: options.sourcemap,
      path: outputDirectory,
      removePragmas: options.removePragmas,
    }),
    createGalleryList(noDevelopmentGallery),
    buildSpecs()
  ).then(() => {
    return copyAssets(outputDirectory);
  });
}

gulp.task("build", function () {
  const argv = yargs.argv;
  const minify = argv.minify ? argv.minify : false;
  const removePragmas = argv.pragmas ? argv.pragmas : false;
  const sourcemap = argv.sourcemap ? argv.sourcemap : true;
  const node = argv.node ? argv.node : true;

  return build({
    minify: minify,
    removePragmas: removePragmas,
    sourcemap: sourcemap,
    node: node,
  });
});

gulp.task("build-ts", function () {
  createTypeScriptDefinitions();
  return Promise.resolve();
});

gulp.task("build-apps", function () {
  return Promise.join(buildCesiumViewer(), buildSandcastle());
});

gulp.task("build-third-party", function () {
  return generateThirdParty();
});

gulp.task("clean", function (done) {
  rimraf.sync("Build");
  globby.sync(filesToClean).forEach(function (file) {
    rimraf.sync(file);
  });
  done();
});

function cloc() {
  let cmdLine;

  //Run cloc on primary Source files only
  const source = new Promise(function (resolve, reject) {
    cmdLine =
      "npx cloc" +
      " --quiet --progress-rate=0" +
      " Source/ --exclude-dir=Assets,ThirdParty,Workers --not-match-f=copyrightHeader.js";

    child_process.exec(cmdLine, function (error, stdout, stderr) {
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
  return source.then(function () {
    return new Promise(function (resolve, reject) {
      cmdLine =
        "npx cloc" +
        " --quiet --progress-rate=0" +
        " Specs/ --exclude-dir=Data";
      child_process.exec(cmdLine, function (error, stdout, stderr) {
        if (error) {
          console.log(stderr);
          return reject(error);
        }
        console.log("Specs:");
        console.log(stdout);
        resolve();
      });
    });
  });
}

gulp.task("cloc", gulp.series("clean", cloc));

function combineForSandcastle() {
  const outputDirectory = path.join("Build", "Sandcastle", "CesiumUnminified");
  return build({
    minify: false,
    removePragmas: false,
    outputDirectory: outputDirectory,
  });
}
gulp.task("default", gulp.series("build"));

gulp.task("prepare", function () {
  // Copy Draco3D files from node_modules into Source
  fs.copyFileSync(
    "node_modules/draco3d/draco_decoder_nodejs.js",
    "Source/ThirdParty/Workers/draco_decoder_nodejs.js"
  );
  fs.copyFileSync(
    "node_modules/draco3d/draco_decoder.wasm",
    "Source/ThirdParty/draco_decoder.wasm"
  );

  // Copy pako and zip.js worker files to Source/ThirdParty
  fs.copyFileSync(
    "node_modules/pako/dist/pako_inflate.min.js",
    "Source/ThirdParty/Workers/pako_inflate.min.js"
  );
  fs.copyFileSync(
    "node_modules/pako/dist/pako_deflate.min.js",
    "Source/ThirdParty/Workers/pako_deflate.min.js"
  );
  fs.copyFileSync(
    "node_modules/@zip.js/zip.js/dist/z-worker-pako.js",
    "Source/ThirdParty/Workers/z-worker-pako.js"
  );

  // Copy prism.js and prism.css files into Tools
  fs.copyFileSync(
    "node_modules/prismjs/prism.js",
    "Tools/jsdoc/cesium_template/static/javascript/prism.js"
  );
  fs.copyFileSync(
    "node_modules/prismjs/themes/prism.min.css",
    "Tools/jsdoc/cesium_template/static/styles/prism.css"
  );

  // Copy jasmine runner files into Specs
  return globby([
    "node_modules/jasmine-core/lib/jasmine-core",
    "!node_modules/jasmine-core/lib/jasmine-core/example",
  ]).then(function (files) {
    const stream = gulp.src(files).pipe(gulp.dest("Specs/jasmine"));
    return streamToPromise(stream);
  });
});

//Builds the documentation
function generateDocumentation() {
  const argv = yargs.argv;
  const generatePrivateDocumentation = argv.private ? "--private" : "";

  child_process.execSync(
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
gulp.task("build-docs", generateDocumentation);

gulp.task("build-docs-watch", function () {
  return generateDocumentation().then(function () {
    console.log("Listening for changes in documentation...");
    return gulp.watch(sourceFiles, gulp.series("build-docs"));
  });
});

gulp.task(
  "website-release",
  gulp.series("build", combineForSandcastle, generateDocumentation)
);

gulp.task(
  "release",
  gulp.series(
    function () {
      return build({
        minify: false,
        removePragmas: false,
        node: true,
      });
    },
    function () {
      return build({
        minify: true,
        removePragmas: true,
        node: true,
      });
    },
    "build-ts",
    generateDocumentation
  )
);

gulp.task(
  "make-zip",
  gulp.series("release", function () {
    //For now we regenerate the JS glsl to force it to be unminified in the release zip
    //See https://github.com/CesiumGS/cesium/pull/3106#discussion_r42793558 for discussion.
    glslToJavaScript(false, "Build/minifyShaders.state");

    // Remove prepare step from package.json to avoid running "prepare" an extra time.
    delete packageJson.scripts.prepare;

    // Remove build and transform tasks since they do not function as intended from within the release zip
    delete packageJson.scripts.build;
    delete packageJson.scripts["build-watch"];
    delete packageJson.scripts["build-ts"];
    delete packageJson.scripts["build-third-party"];
    delete packageJson.scripts["build-apps"];
    delete packageJson.scripts.clean;
    delete packageJson.scripts.cloc;
    delete packageJson.scripts["build-docs"];
    delete packageJson.scripts["build-docs-watch"];
    delete packageJson.scripts["make-zip"];
    delete packageJson.scripts.release;
    delete packageJson.scripts.prettier;

    // Remove deploy tasks
    delete packageJson.scripts["deploy-s3"];
    delete packageJson.scripts["deploy-status"];
    delete packageJson.scripts["deploy-set-version"];

    fs.writeFileSync(
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
        ".gulp.json",
        ".prettierignore",
        "build.cjs",
        "gulpfile.cjs",
        "server.cjs",
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

    return mergeStream(packageJsonSrc, builtSrc, staticSrc, indexSrc)
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
      });
  })
);

function isTravisPullRequest() {
  return (
    process.env.TRAVIS_PULL_REQUEST !== undefined &&
    process.env.TRAVIS_PULL_REQUEST !== "false"
  );
}

gulp.task("deploy-s3", function (done) {
  if (isTravisPullRequest()) {
    console.log("Skipping deployment for non-pull request.");
    done();
    return;
  }

  const argv = yargs.usage("Usage: deploy-s3").argv;

  const cacheControl = argv.c ? argv.c : "max-age=3600";

  if (argv.confirm) {
    // skip prompt for travis
    deployCesium(cacheControl, done);
    return;
  }

  const iface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // prompt for confirmation
  iface.question(
    "Files from your computer will be published to the cesium.com bucket. Continue? [y/n] ",
    function (answer) {
      iface.close();
      if (answer === "y") {
        deployCesium(cacheControl, done);
      } else {
        console.log("Deploy aborted by user.");
        done();
      }
    }
  );
});

// Deploy cesium to s3
function deployCesium(cacheControl, done) {
  const refDocPrefix = "cesiumjs/ref-doc";
  const sandcastlePrefix = "sandcastle";
  const cesiumViewerPrefix = "cesiumjs/cesium-viewer";

  const readFile = Promise.promisify(fs.readFile);
  const gzip = Promise.promisify(zlib.gzip);
  const concurrencyLimit = 2000;

  const s3 = new AWS.S3({
    maxRetries: 10,
    retryDelayOptions: {
      base: 500,
    },
  });

  let uploaded = 0;
  const errors = [];

  function uploadFiles(prefix, filePrefix, files) {
    return Promise.map(
      files,
      function (file) {
        const blobName = `${prefix}/${file.replace(filePrefix, "")}`;
        const mimeLookup = getMimeType(blobName);
        const contentType = mimeLookup.type;
        const compress = mimeLookup.compress;
        const contentEncoding = compress ? "gzip" : undefined;

        return readFile(file)
          .then(function (content) {
            if (!compress) {
              return content;
            }

            const alreadyCompressed =
              content[0] === 0x1f && content[1] === 0x8b;
            if (alreadyCompressed) {
              console.log(
                `Skipping compressing already compressed file: ${file}`
              );
              return content;
            }

            return gzip(content);
          })
          .then(function (content) {
            if (verbose) {
              console.log(`Uploading ${blobName}...`);
            }
            const etag = crypto
              .createHash("md5")
              .update(content)
              .digest("base64");
            const params = {
              Bucket: bucketName,
              Key: blobName,
              Body: content,
              ContentMD5: etag,
              ContentType: contentType,
              ContentEncoding: contentEncoding,
              CacheControl: cacheControl,
            };

            return s3.putObject(params).promise();
          })
          .then(function () {
            uploaded++;
          })
          .catch(function (error) {
            errors.push(error);
          });
      },
      { concurrency: concurrencyLimit }
    );
  }

  const uploadSandcastle = globby(["Build/Sandcastle/**"]).then(function (
    files
  ) {
    return uploadFiles(sandcastlePrefix, "Build/Sandcastle/", files);
  });

  const uploadRefDoc = globby(["Build/Documentation/**"]).then(function (
    files
  ) {
    return uploadFiles(refDocPrefix, "Build/Documentation/", files);
  });

  const uploadCesiumViewer = globby(["Build/CesiumViewer/**"]).then(function (
    files
  ) {
    return uploadFiles(cesiumViewerPrefix, "Build/CesiumViewer/", files);
  });

  const uploadRelease = deployCesiumRelease(s3, errors);

  Promise.all(uploadSandcastle, uploadRefDoc, uploadCesiumViewer, uploadRelease)
    .then(function () {
      console.log(`Successfully uploaded ${uploaded} files.`);
    })
    .catch(function (error) {
      errors.push(error);
    })
    .then(function () {
      if (errors.length === 0) {
        done();
        return;
      }

      console.log("Errors: ");
      errors.map(function (e) {
        console.log(e);
      });
      done(1);
    });
}

async function deployCesiumRelease(s3, errors) {
  const releaseDir = "cesiumjs/releases";
  const quiet = process.env.TRAVIS;

  let release;
  try {
    // Deploy any new releases
    const getRequest = await Promise.promisify(request.get);
    const response = await getRequest({
      method: "GET",
      uri: "https://api.github.com/repos/CesiumGS/cesium/releases/latest",
      json: true,
      headers: {
        Authorization: process.env.TOKEN
          ? `token ${process.env.TOKEN}`
          : undefined,
        "User-Agent": "cesium.com-build",
      },
    });
    const body = response.body;

    release = {
      tag: body.tag_name,
      name: body.name,
      url: body.assets[0].browser_download_url,
    };

    await s3
      .headObject({
        Bucket: bucketName,
        Key: path.posix.join(releaseDir, release.tag, "cesium.zip"),
      })
      .promise();
    console.log(
      `Cesium version ${release.tag} up to date. Skipping release deployment.`
    );
  } catch (error) {
    // The current version is not uploaded
    if (error.code === "NotFound") {
      console.log("Updating cesium version...");
      const data = await download(release.url);
      // upload and unzip contents
      const key = path.posix.join(releaseDir, release.tag, "cesium.zip");
      await uploadObject(s3, key, data, quiet);
      const files = await decompress(data);
      await Promise.map(
        files,
        function (file) {
          if (file.path.startsWith("Apps")) {
            // skip uploading apps and sandcastle
            return;
          }
          // Upload to release directory
          const key = path.posix.join(releaseDir, release.tag, file.path);
          return uploadObject(s3, key, file.data, quiet);
        },
        { concurrency: 5 }
      );
    }

    // else, unexpected error
    errors.push(error);
  }
}

function uploadObject(s3, key, contents, quiet) {
  if (!quiet) {
    console.log(`Uploading ${key}...`);
  }

  return s3
    .upload({
      Bucket: bucketName,
      Key: key,
      Body: contents,
      ContentType: mime.getType(key) || undefined,
      CacheControl: "public, max-age=1800",
    })
    .promise();
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
  const baseName = path.basename(filename);
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

gulp.task("deploy-set-version", function (done) {
  const buildVersion = yargs.argv.buildVersion;
  if (buildVersion) {
    // NPM versions can only contain alphanumeric and hyphen characters
    packageJson.version += `-${buildVersion.replace(/[^[0-9A-Za-z-]/g, "")}`;
    fs.writeFileSync("package.json", JSON.stringify(packageJson, undefined, 2));
  }
  done();
});

gulp.task("deploy-status", function () {
  if (isTravisPullRequest()) {
    console.log("Skipping deployment status for non-pull request.");
    return Promise.resolve();
  }

  const status = yargs.argv.status;
  const message = yargs.argv.message;

  const deployUrl = `${travisDeployUrl + process.env.TRAVIS_BRANCH}/`;
  const zipUrl = `${deployUrl}Cesium-${packageJson.version}.zip`;
  const npmUrl = `${deployUrl}cesium-${packageJson.version}.tgz`;
  const coverageUrl = `${
    travisDeployUrl + process.env.TRAVIS_BRANCH
  }/Build/Coverage/index.html`;

  return Promise.join(
    setStatus(status, deployUrl, message, "deployment"),
    setStatus(status, zipUrl, message, "zip file"),
    setStatus(status, npmUrl, message, "npm package"),
    setStatus(status, coverageUrl, message, "coverage results")
  );
});

function setStatus(state, targetUrl, description, context) {
  // skip if the environment does not have the token
  if (!process.env.TOKEN) {
    return;
  }

  const requestPost = Promise.promisify(request.post);
  return requestPost({
    url: `https://api.github.com/repos/${process.env.TRAVIS_REPO_SLUG}/statuses/${process.env.TRAVIS_COMMIT}`,
    json: true,
    headers: {
      Authorization: `token ${process.env.TOKEN}`,
      "User-Agent": "Cesium",
    },
    body: {
      state: state,
      target_url: targetUrl,
      description: description,
      context: context,
    },
  });
}

gulp.task("coverage", async function () {
  const argv = yargs.argv;
  const webglStub = argv.webglStub ? argv.webglStub : false;
  const suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  const failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;

  const folders = [];
  let browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  const instrumenter = new istanbul.createInstrumenter({
    esModules: true,
  });

  const instrumentPlugin = {
    name: "instrument",
    setup: (build) => {
      const readFile = Promise.promisify(fs.readFile);
      build.onLoad(
        {
          filter: /Source\/(Core|DataSources|Renderer|Scene|Widgets)(\/\w+)+\.js$/,
        },
        async (args) => {
          const source = await readFile(args.path, "utf8");

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

  const outputDirectory = path.join("Build", "Instrumented");

  const result = await esbuild.build({
    entryPoints: ["Source/Cesium.js"],
    bundle: true,
    sourcemap: true,
    format: "iife",
    globalName: "Cesium",
    target: "es2020",
    external: ["https", "http", "url", "zlib"],
    outfile: path.join(outputDirectory, "Cesium.js"),
    plugins: [instrumentPlugin],
    logLevel: "error", // print errors immediately, and collect warnings so we can filter out known ones
  });

  handleBuildWarnings(result);

  const karmaConfig = Karma.config.parseConfig(karmaConfigFile, {
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
  });

  return new Promise((resolve, reject) => {
    const karma = new Karma.Server(karmaConfig, function doneCallback(e) {
      let html = "<!doctype html><html><body><ul>";
      folders.forEach(function (folder) {
        html += `<li><a href="${encodeURIComponent(
          folder
        )}/index.html">${folder}</a></li>`;
      });
      html += "</ul></body></html>";
      fs.writeFileSync("Build/Coverage/index.html", html);

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
    karma.start();
  });
});

gulp.task("test", function (done) {
  const argv = yargs.argv;

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

  const karmaConfig = Karma.config.parseConfig(karmaConfigFile, {
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
    logLevel: verbose ? Karma.constants.LOG_INFO : Karma.constants.LOG_ERROR,
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
  });
  const karma = new Karma.Server(karmaConfig, function doneCallback(exitCode) {
    return done(failTaskOnError ? exitCode : undefined);
  });
  karma.start();
});

function createTypeScriptDefinitions() {
  // Run jsdoc with tsd-jsdoc to generate an initial Cesium.d.ts file.
  child_process.execSync("npx jsdoc --configure Tools/jsdoc/ts-conf.json", {
    stdio: "inherit",
  });

  let source = fs.readFileSync("Source/Cesium.d.ts").toString();

  // All of our enum assignments that alias to WebGLConstants, such as PixelDatatype.js
  // end up as enum strings instead of actually mapping values to WebGLConstants.
  // We fix this with a simple regex replace later on, but it means the
  // WebGLConstants constants enum needs to be defined in the file before it can
  // be used.  This block of code reads in the TS file, finds the WebGLConstants
  // declaration, and then writes the file back out (in memory to source) with
  // WebGLConstants being the first module.
  const node = typescript.createSourceFile(
    "Source/Cesium.d.ts",
    source,
    typescript.ScriptTarget.Latest
  );
  let firstNode;
  node.forEachChild((child) => {
    if (
      typescript.SyntaxKind[child.kind] === "EnumDeclaration" &&
      child.name.escapedText === "WebGLConstants"
    ) {
      firstNode = child;
    }
  });

  const printer = typescript.createPrinter({
    removeComments: false,
    newLine: typescript.NewLineKind.LineFeed,
  });

  let newSource = "";
  newSource += printer.printNode(
    typescript.EmitHint.Unspecified,
    firstNode,
    node
  );
  newSource += "\n\n";
  node.forEachChild((child) => {
    if (
      typescript.SyntaxKind[child.kind] !== "EnumDeclaration" ||
      child.name.escapedText !== "WebGLConstants"
    ) {
      newSource += printer.printNode(
        typescript.EmitHint.Unspecified,
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

  // Map individual modules back to their source file so that TS still works
  // when importing individual files instead of the entire cesium module.
  globby.sync(sourceFiles).forEach(function (file) {
    file = path.relative("Source", file);

    let moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    const assignmentName = path.basename(file, path.extname(file));
    if (publicModules.has(assignmentName)) {
      publicModules.delete(assignmentName);
      source += `declare module "cesium/Source/${moduleId}" { import { ${assignmentName} } from 'cesium'; export default ${assignmentName}; }\n`;
    }
  });

  // Write the final source file back out
  fs.writeFileSync("Source/Cesium.d.ts", source);

  // Use tsc to compile it and make sure it is valid
  child_process.execSync("npx tsc -p Tools/jsdoc/tsconfig.json", {
    stdio: "inherit",
  });

  // Also compile our smokescreen to make sure interfaces work as expected.
  child_process.execSync("npx tsc -p Specs/TypeScript/tsconfig.json", {
    stdio: "inherit",
  });

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
}

/**
 * Reads `ThirdParty.extra.json` file
 * @param path {string} Path to `ThirdParty.extra.json`
 * @param discoveredDependencies {Array<string>} List of previously discovered modules
 * @returns {Promise<Array<Object>>} A promise to an array of objects with 'name`, `license`, and `url` strings
 */
function getLicenseDataFromThirdPartyExtra(path, discoveredDependencies) {
  if (!fs.existsSync(path)) {
    return Promise.reject(`${path} does not exist`);
  }

  const fsReadFile = Promise.promisify(fs.readFile);

  return fsReadFile(path).then(function (contents) {
    const thirdPartyExtra = JSON.parse(contents);
    return Promise.map(thirdPartyExtra, function (module) {
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
    });
  });
}

/**
 * Extracts name, license, and url from `package.json` file.
 *
 * @param packageName {string} Name of package
 * @param discoveredDependencies {Array<string>} List of previously discovered modules
 * @param licenseOverride {Array<string>} If specified, override info fetched from package.json. Useful in the case where there are multiple licenses and we might chose a single one.
 * @returns {Promise<Object>} A promise to an object with 'name`, `license`, and `url` strings
 */
function getLicenseDataFromPackage(
  packageName,
  discoveredDependencies,
  licenseOverride,
  notes
) {
  if (discoveredDependencies.includes(packageName)) {
    return Promise.resolve([]);
  }
  discoveredDependencies.push(packageName);

  let promise;
  const packagePath = path.join("node_modules", packageName, "package.json");
  const fsReadFile = Promise.promisify(fs.readFile);

  if (fs.existsSync(packagePath)) {
    // Package exists at top-level, so use it.
    promise = fsReadFile(packagePath);
  } else {
    return Promise.reject(
      new Error(`Unable to find ${packageName} license information`)
    );
  }

  return promise.then(function (contents) {
    const packageJson = JSON.parse(contents);

    // Check for license
    let licenseField = licenseOverride;

    if (!licenseField) {
      licenseField = [packageJson.license];
    }

    if (!licenseField && packageJson.licenses) {
      licenseField = packageJson.licenses;
    }

    if (!licenseField) {
      console.log(`No license found for ${packageName}`);
      licenseField = ["NONE"];
    }

    let version = packageJson.version;
    if (!packageJson.version) {
      console.log(`No version information found for ${packageName}`);
      version = "NONE";
    }

    return {
      name: packageName,
      license: licenseField,
      version: version,
      url: `https://www.npmjs.com/package/${packageName}`,
      notes: notes,
    };
  });
}

function generateThirdParty() {
  let licenseJson = [];
  const discoveredDependencies = [];
  const fsWriteFile = Promise.promisify(fs.writeFile);

  // Generate ThirdParty.json from ThirdParty.extra.json and package.json
  return getLicenseDataFromThirdPartyExtra(
    "ThirdParty.extra.json",
    discoveredDependencies
  )
    .then(function (licenseInfo) {
      licenseJson = licenseJson.concat(licenseInfo);
    })
    .then(function () {
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

      return fsWriteFile(
        "ThirdParty.json",
        JSON.stringify(licenseJson, null, 2)
      );
    });
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
        '    <script src="../CesiumUnminified/Cesium.js"></script>\n' +
          '    <script>window.CESIUM_BASE_URL = "../CesiumUnminified/";</script>";'
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
    .pipe(gulpReplace("../../Build/Documentation", "/learn/cesiumjs/ref-doc/"))
    .pipe(gulp.dest("Build/Sandcastle"));

  const imageStream = gulp
    .src(["Apps/Sandcastle/gallery/**.jpg", "Apps/Sandcastle/images/**"], {
      base: "Apps/Sandcastle",
      buffer: false,
    })
    .pipe(gulp.dest("Build/Sandcastle"));

  const fileStream = gulp
    .src(["ThirdParty/**"])
    .pipe(gulp.dest("Build/Sandcastle/ThirdParty"));

  const dataStream = gulp
    .src(["Apps/SampleData/**"])
    .pipe(gulp.dest("Build/Sandcastle/SampleData"));
  const standaloneStream = gulp
    .src(["Apps/Sandcastle/standalone.html"])
    .pipe(gulpReplace("../../../", "."))
    .pipe(
      gulpReplace(
        '    <script type="module" src="load-cesium-es6.js"></script>',
        '    <script src="../CesiumUnminified/Cesium.js"></script>\n' +
          '    <script>window.CESIUM_BASE_URL = "../CesiumUnminified/";</script>";'
      )
    )
    .pipe(gulpReplace("../../Build", "."))
    .pipe(gulp.dest("Build/Sandcastle"));

  return streamToPromise(
    mergeStream(
      appStream,
      fileStream,
      dataStream,
      imageStream,
      standaloneStream
    )
  );
}

async function buildCesiumViewer() {
  const cesiumViewerOutputDirectory = "Build/CesiumViewer";
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
  const result = await esbuild.build(config);

  handleBuildWarnings(result);

  await esbuild.build({
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
