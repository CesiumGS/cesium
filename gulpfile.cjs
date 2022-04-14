/*eslint-env node*/
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
const crypto = require("crypto");
const zlib = require("zlib");
const readline = require("readline");
const request = require("request");

const globby = require("globby");
const gulpTap = require("gulp-tap");
const gulpTerser = require("gulp-terser");
const open = require("open");
const rimraf = require("rimraf");
const glslStripComments = require("glsl-strip-comments");
const mkdirp = require("mkdirp");
const mergeStream = require("merge-stream");
const streamToPromise = require("stream-to-promise");
const gulp = require("gulp");
const gulpInsert = require("gulp-insert");
const gulpZip = require("gulp-zip");
const gulpRename = require("gulp-rename");
const gulpReplace = require("gulp-replace");
const Promise = require("bluebird");
const Karma = require("karma");
const yargs = require("yargs");
const AWS = require("aws-sdk");
const mime = require("mime");
const rollup = require("rollup");
const rollupPluginStripPragma = require("rollup-plugin-strip-pragma");
const rollupPluginExternalGlobals = require("rollup-plugin-external-globals");
const rollupPluginTerser = require("rollup-plugin-terser");
const rollupCommonjs = require("@rollup/plugin-commonjs");
const rollupResolve = require("@rollup/plugin-node-resolve").default;
const cleanCSS = require("gulp-clean-css");
const typescript = require("typescript");

const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}

const karmaConfigFile = path.join(__dirname, "Specs/karma.conf.cjs");
const travisDeployUrl =
  "http://cesium-dev.s3-website-us-east-1.amazonaws.com/cesium/";

//Gulp doesn't seem to have a way to get the currently running tasks for setting
//per-task variables.  We use the command line argument here to detect which task is being run.
const taskName = process.argv[2];
const noDevelopmentGallery =
  taskName === "release" || taskName === "makeZipFile";
const minifyShaders =
  taskName === "minify" ||
  taskName === "minifyRelease" ||
  taskName === "release" ||
  taskName === "makeZipFile" ||
  taskName === "buildApps";

const verbose = yargs.argv.verbose;

let concurrency = yargs.argv.concurrency;
if (!concurrency) {
  concurrency = os.cpus().length;
}

// Work-around until all third party libraries use npm
const filesToLeaveInThirdParty = [
  "!Source/ThirdParty/Workers/basis_transcoder.js",
  "!Source/ThirdParty/basis_transcoder.wasm",
  "!Source/ThirdParty/google-earth-dbroot-parser.js",
  "!Source/ThirdParty/knockout*.js",
];

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

const watchedFiles = [
  "Source/**/*.js",
  "!Source/Cesium.js",
  "!Source/Build/**",
  "!Source/Shaders/**/*.js",
  "Source/Shaders/**/*.glsl",
  "!Source/ThirdParty/Shaders/*.js",
  "Source/ThirdParty/Shaders/*.glsl",
  "!Source/Workers/**",
  "Source/Workers/cesiumWorkerBootstrapper.js",
  "Source/Workers/transferTypedArrayTest.js",
  "!Specs/SpecList.js",
];

const filesToClean = [
  "Source/Cesium.js",
  "Source/Shaders/**/*.js",
  "Source/Workers/**",
  "!Source/Workers/cesiumWorkerBootstrapper.js",
  "!Source/Workers/transferTypedArrayTest.js",
  "Source/ThirdParty/Shaders/*.js",
  "Specs/SpecList.js",
  "Apps/Sandcastle/jsHintOptions.js",
  "Apps/Sandcastle/gallery/gallery-index.js",
  "Apps/Sandcastle/templates/bucket.css",
  "Cesium-*.zip",
  "cesium-*.tgz",
];

const filesToConvertES6 = [
  "Source/**/*.js",
  "Specs/**/*.js",
  "!Source/ThirdParty/**",
  "!Source/Cesium.js",
  "!Source/copyrightHeader.js",
  "!Source/Shaders/**",
  "!Source/Workers/cesiumWorkerBootstrapper.js",
  "!Source/Workers/transferTypedArrayTest.js",
  "!Specs/karma-main.js",
  "!Specs/karma.conf.cjs",
  "!Specs/SpecList.js",
  "!Specs/TestWorkers/**",
];

function rollupWarning(message) {
  // Ignore eval warnings in third-party code we don't have control over
  if (message.code === "EVAL" && /protobufjs/.test(message.loc.file)) {
    return;
  }

  console.log(message);
}

const copyrightHeader = fs.readFileSync(
  path.join("Source", "copyrightHeader.js"),
  "utf8"
);

function createWorkers() {
  rimraf.sync("Build/createWorkers");

  globby
    .sync([
      "Source/Workers/**",
      "!Source/Workers/cesiumWorkerBootstrapper.js",
      "!Source/Workers/transferTypedArrayTest.js",
    ])
    .forEach(function (file) {
      rimraf.sync(file);
    });

  const workers = globby.sync(["Source/WorkersES6/**"]);

  return rollup
    .rollup({
      input: workers,
      onwarn: rollupWarning,
    })
    .then(function (bundle) {
      return bundle.write({
        dir: "Build/createWorkers",
        banner:
          "/* This file is automatically rebuilt by the Cesium build process. */",
        format: "amd",
      });
    })
    .then(function () {
      return streamToPromise(
        gulp.src("Build/createWorkers/**").pipe(gulp.dest("Source/Workers"))
      );
    })
    .then(function () {
      rimraf.sync("Build/createWorkers");
    });
}

async function buildThirdParty() {
  rimraf.sync("Build/createWorkers");
  globby.sync(filesToLeaveInThirdParty).forEach(function (file) {
    rimraf.sync(file);
  });

  const workers = globby.sync(["ThirdParty/npm/**"]);

  return rollup
    .rollup({
      input: workers,
      plugins: [rollupResolve(), rollupCommonjs()],
      onwarn: rollupWarning,
    })
    .then(function (bundle) {
      return bundle.write({
        dir: "Build/createThirdPartyNpm",
        banner:
          "/* This file is automatically rebuilt by the Cesium build process. */",
        format: "es",
      });
    })
    .then(function () {
      return streamToPromise(
        gulp
          .src("Build/createThirdPartyNpm/**")
          .pipe(gulp.dest("Source/ThirdParty"))
      );
    })
    .then(function () {
      rimraf.sync("Build/createThirdPartyNpm");
    });
}

gulp.task("build", async function () {
  mkdirp.sync("Build");

  fs.writeFileSync(
    "Build/package.json",
    JSON.stringify({
      type: "commonjs",
    }),
    "utf8"
  );

  await buildThirdParty();
  glslToJavaScript(minifyShaders, "Build/minifyShaders.state");
  createCesiumJs();
  createSpecList();
  createJsHintOptions();
  return Promise.join(
    createWorkers(),
    createGalleryList(),
    generateThirdParty()
  );
});

gulp.task("build-watch", function () {
  return gulp.watch(watchedFiles, gulp.series("build"));
});

gulp.task("build-ts", function () {
  createTypeScriptDefinitions();
  return Promise.resolve();
});

gulp.task("buildApps", function () {
  return Promise.join(buildCesiumViewer(), buildSandcastle());
});

gulp.task("build-specs", function buildSpecs() {
  const externalCesium = rollupPluginExternalGlobals({
    "../Source/Cesium.js": "Cesium",
    "../../Source/Cesium.js": "Cesium",
    "../../../Source/Cesium.js": "Cesium",
    "../../../../Source/Cesium.js": "Cesium",
  });

  const removePragmas = rollupPluginStripPragma({
    pragmas: ["debug"],
  });

  const promise = Promise.join(
    rollup
      .rollup({
        input: "Specs/SpecList.js",
        plugins: [externalCesium],
        onwarn: rollupWarning,
      })
      .then(function (bundle) {
        return bundle.write({
          file: "Build/Specs/Specs.js",
          format: "iife",
        });
      })
      .then(function () {
        return rollup
          .rollup({
            input: "Specs/karma-main.js",
            plugins: [removePragmas, externalCesium],
            onwarn: rollupWarning,
          })
          .then(function (bundle) {
            return bundle.write({
              file: "Build/Specs/karma-main.js",
              name: "karmaMain",
              format: "iife",
            });
          });
      })
  );

  return promise;
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

function combine() {
  const outputDirectory = path.join("Build", "CesiumUnminified");
  return combineJavaScript({
    removePragmas: false,
    minify: false,
    outputDirectory: outputDirectory,
  });
}

gulp.task("combine", gulp.series("build", combine));
gulp.task("default", gulp.series("combine"));

function combineRelease() {
  const outputDirectory = path.join("Build", "CesiumUnminified");
  return combineJavaScript({
    removePragmas: true,
    minify: false,
    outputDirectory: outputDirectory,
  });
}

gulp.task("combineRelease", gulp.series("build", combineRelease));

gulp.task("prepare", function (done) {
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
  done();
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
gulp.task("generateDocumentation", generateDocumentation);

gulp.task("generateDocumentation-watch", function () {
  return generateDocumentation().done(function () {
    console.log("Listening for changes in documentation...");
    return gulp.watch(sourceFiles, gulp.series("generateDocumentation"));
  });
});

gulp.task(
  "release",
  gulp.series(
    "build",
    "build-ts",
    combine,
    minifyRelease,
    generateDocumentation
  )
);

gulp.task(
  "makeZipFile",
  gulp.series("release", function () {
    //For now we regenerate the JS glsl to force it to be unminified in the release zip
    //See https://github.com/CesiumGS/cesium/pull/3106#discussion_r42793558 for discussion.
    glslToJavaScript(false, "Build/minifyShaders.state");

    // Remove prepare step from package.json to avoid running "prepare" an extra time.
    delete packageJson.scripts.prepare;
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
        "!Apps/Sandcastle/gallery/development/**",
        "Source/**",
        "Specs/**",
        "ThirdParty/**",
        "favicon.ico",
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

gulp.task(
  "minify",
  gulp.series("build", function () {
    return combineJavaScript({
      removePragmas: false,
      minify: true,
      outputDirectory: path.join("Build", "Cesium"),
    });
  })
);

function minifyRelease() {
  return combineJavaScript({
    removePragmas: true,
    minify: true,
    outputDirectory: path.join("Build", "Cesium"),
  });
}

gulp.task("minifyRelease", gulp.series("build", minifyRelease));

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

  const argv = yargs
    .usage("Usage: deploy-s3 -b [Bucket Name] -d [Upload Directory]")
    .demand(["b", "d"]).argv;

  const uploadDirectory = argv.d;
  const bucketName = argv.b;
  const cacheControl = argv.c ? argv.c : "max-age=3600";

  if (argv.confirm) {
    // skip prompt for travis
    deployCesium(bucketName, uploadDirectory, cacheControl, done);
    return;
  }

  const iface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // prompt for confirmation
  iface.question(
    `Files from your computer will be published to the ${bucketName} bucket. Continue? [y/n] `,
    function (answer) {
      iface.close();
      if (answer === "y") {
        deployCesium(bucketName, uploadDirectory, cacheControl, done);
      } else {
        console.log("Deploy aborted by user.");
        done();
      }
    }
  );
});

// Deploy cesium to s3
function deployCesium(bucketName, uploadDirectory, cacheControl, done) {
  const readFile = Promise.promisify(fs.readFile);
  const gzip = Promise.promisify(zlib.gzip);
  const concurrencyLimit = 2000;

  const s3 = new AWS.S3({
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
  return listAll(s3, bucketName, prefix, existingBlobs)
    .then(function () {
      return globby(
        [
          "Apps/**",
          "Build/**",
          "Source/**",
          "Specs/**",
          "ThirdParty/**",
          "*.md",
          "favicon.ico",
          "gulpfile.cjs",
          "index.html",
          "package.json",
          "server.cjs",
          "web.config",
          "*.zip",
          "*.tgz",
        ],
        {
          dot: true, // include hidden files
        }
      );
    })
    .then(function (files) {
      return Promise.map(
        files,
        function (file) {
          const blobName = `${uploadDirectory}/${file}`;
          const mimeLookup = getMimeType(blobName);
          const contentType = mimeLookup.type;
          const compress = mimeLookup.compress;
          const contentEncoding = compress ? "gzip" : undefined;
          let etag;

          totalFiles++;

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
              // compute hash and etag
              const hash = crypto
                .createHash("md5")
                .update(content)
                .digest("hex");
              etag = crypto.createHash("md5").update(content).digest("base64");

              const index = existingBlobs.indexOf(blobName);
              if (index <= -1) {
                return content;
              }

              // remove files as we find them on disk
              existingBlobs.splice(index, 1);

              // get file info
              return s3
                .headObject({
                  Bucket: bucketName,
                  Key: blobName,
                })
                .promise()
                .then(function (data) {
                  if (
                    data.ETag !== `"${hash}"` ||
                    data.CacheControl !== cacheControl ||
                    data.ContentType !== contentType ||
                    data.ContentEncoding !== contentEncoding
                  ) {
                    return content;
                  }

                  // We don't need to upload this file again
                  skipped++;
                  return undefined;
                })
                .catch(function (error) {
                  errors.push(error);
                });
            })
            .then(function (content) {
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

              return s3
                .putObject(params)
                .promise()
                .then(function () {
                  uploaded++;
                })
                .catch(function (error) {
                  errors.push(error);
                });
            });
        },
        { concurrency: concurrencyLimit }
      );
    })
    .then(function () {
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
        //Don't delete generate zip files.
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

        return Promise.map(
          batches,
          function (objects) {
            return s3
              .deleteObjects({
                Bucket: bucketName,
                Delete: {
                  Objects: objects,
                },
              })
              .promise()
              .then(function () {
                if (verbose) {
                  console.log(`Cleaned ${objects.length} files.`);
                }
              });
          },
          { concurrency: concurrency }
        );
      }
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

// get all files currently in bucket asynchronously
function listAll(s3, bucketName, prefix, files, marker) {
  return s3
    .listObjects({
      Bucket: bucketName,
      MaxKeys: 1000,
      Prefix: prefix,
      Marker: marker,
    })
    .promise()
    .then(function (data) {
      const items = data.Contents;
      for (let i = 0; i < items.length; i++) {
        files.push(items[i].Key);
      }

      if (data.IsTruncated) {
        // get next page of results
        return listAll(s3, bucketName, prefix, files, files[files.length - 1]);
      }
    });
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

gulp.task("coverage", function (done) {
  const argv = yargs.argv;
  const webglStub = argv.webglStub ? argv.webglStub : false;
  const suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  const failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;

  const folders = [];
  let browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  const karma = new Karma.Server(
    {
      configFile: karmaConfigFile,
      browsers: browsers,
      specReporter: {
        suppressErrorSummary: false,
        suppressFailed: false,
        suppressPassed: suppressPassed,
        suppressSkipped: true,
      },
      preprocessors: {
        "Source/Core/**/*.js": ["karma-coverage-istanbul-instrumenter"],
        "Source/DataSources/**/*.js": ["karma-coverage-istanbul-instrumenter"],
        "Source/Renderer/**/*.js": ["karma-coverage-istanbul-instrumenter"],
        "Source/Scene/**/*.js": ["karma-coverage-istanbul-instrumenter"],
        "Source/Shaders/**/*.js": ["karma-coverage-istanbul-instrumenter"],
        "Source/Widgets/**/*.js": ["karma-coverage-istanbul-instrumenter"],
        "Source/Workers/**/*.js": ["karma-coverage-istanbul-instrumenter"],
      },
      coverageIstanbulInstrumenter: {
        esModules: true,
      },
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
        captureConsole: verbose,
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
    function (e) {
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
      return done(failTaskOnError ? e : undefined);
    }
  );
  karma.start();
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
  const includeName = argv.includeName ? argv.includeName : "";
  const excludeName = argv.excludeName ? argv.excludeName : "";

  let browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  let files = [
    { pattern: "Specs/karma-main.js", included: true, type: "module" },
    { pattern: "Source/**", included: false, type: "module" },
    { pattern: "Specs/*.js", included: true, type: "module" },
    { pattern: "Specs/Core/**", included: true, type: "module" },
    { pattern: "Specs/Data/**", included: false },
    { pattern: "Specs/DataSources/**", included: true, type: "module" },
    { pattern: "Specs/Renderer/**", included: true, type: "module" },
    { pattern: "Specs/Scene/**", included: true, type: "module" },
    { pattern: "Specs/ThirdParty/**", included: true, type: "module" },
    { pattern: "Specs/Widgets/**", included: true, type: "module" },
    { pattern: "Specs/TestWorkers/**", included: false },
  ];

  if (release) {
    files = [
      { pattern: "Specs/Data/**", included: false },
      { pattern: "Specs/ThirdParty/**", included: true, type: "module" },
      { pattern: "Specs/TestWorkers/**", included: false },
      { pattern: "Build/Cesium/Cesium.js", included: true },
      { pattern: "Build/Cesium/**", included: false },
      { pattern: "Build/Specs/karma-main.js", included: true },
      { pattern: "Build/Specs/Specs.js", included: true },
    ];
  }

  const karma = new Karma.Server(
    {
      configFile: karmaConfigFile,
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
          includeName,
          excludeName,
          webglValidation,
          webglStub,
          release,
        ],
      },
    },
    function (e) {
      return done(failTaskOnError ? e : undefined);
    }
  );
  karma.start();
});

gulp.task("convertToModules", function () {
  const requiresRegex = /([\s\S]*?(define|defineSuite|require)\((?:{[\s\S]*}, )?\[)([\S\s]*?)]([\s\S]*?function\s*)\(([\S\s]*?)\) {([\s\S]*)/;
  const noModulesRegex = /([\s\S]*?(define|defineSuite|require)\((?:{[\s\S]*}, )?\[?)([\S\s]*?)]?([\s\S]*?function\s*)\(([\S\s]*?)\) {([\s\S]*)/;
  const splitRegex = /,\s*/;

  const fsReadFile = Promise.promisify(fs.readFile);
  const fsWriteFile = Promise.promisify(fs.writeFile);

  const files = globby.sync(filesToConvertES6);

  return Promise.map(files, function (file) {
    return fsReadFile(file).then(function (contents) {
      contents = contents.toString();
      if (contents.startsWith("import")) {
        return;
      }

      let result = requiresRegex.exec(contents);

      if (result === null) {
        result = noModulesRegex.exec(contents);
        if (result === null) {
          return;
        }
      }

      const names = result[3].split(splitRegex);
      if (names.length === 1 && names[0].trim() === "") {
        names.length = 0;
      }

      for (let i = 0; i < names.length; ++i) {
        if (names[i].indexOf("//") >= 0 || names[i].indexOf("/*") >= 0) {
          console.log(
            `${file} contains comments in the require list.  Skipping so nothing gets broken.`
          );
          return;
        }
      }

      const identifiers = result[5].split(splitRegex);
      if (identifiers.length === 1 && identifiers[0].trim() === "") {
        identifiers.length = 0;
      }

      for (let i = 0; i < identifiers.length; ++i) {
        if (
          identifiers[i].indexOf("//") >= 0 ||
          identifiers[i].indexOf("/*") >= 0
        ) {
          console.log(
            `${file} contains comments in the require list.  Skipping so nothing gets broken.`
          );
          return;
        }
      }

      const requires = [];

      for (let i = 0; i < names.length && i < identifiers.length; ++i) {
        requires.push({
          name: names[i].trim(),
          identifier: identifiers[i].trim(),
        });
      }

      // Convert back to separate lists for the names and identifiers, and add
      // any additional names or identifiers that don't have a corresponding pair.
      const sortedNames = requires.map(function (item) {
        return `${item.name.slice(0, -1)}.js'`;
      });
      for (let i = sortedNames.length; i < names.length; ++i) {
        sortedNames.push(names[i].trim());
      }

      const sortedIdentifiers = requires.map(function (item) {
        return item.identifier;
      });
      for (let i = sortedIdentifiers.length; i < identifiers.length; ++i) {
        sortedIdentifiers.push(identifiers[i].trim());
      }

      contents = "";
      if (sortedNames.length > 0) {
        for (let q = 0; q < sortedNames.length; q++) {
          let modulePath = sortedNames[q];
          if (file.startsWith("Specs")) {
            modulePath = modulePath.substring(1, modulePath.length - 1);
            const sourceDir = path.dirname(file);

            if (modulePath.startsWith("Specs") || modulePath.startsWith(".")) {
              let importPath = modulePath;
              if (modulePath.startsWith("Specs")) {
                importPath = path.relative(sourceDir, modulePath);
                if (importPath[0] !== ".") {
                  importPath = `./${importPath}`;
                }
              }
              modulePath = `'${importPath}'`;
              contents += `import ${sortedIdentifiers[q]} from ${modulePath};${os.EOL}`;
            } else {
              modulePath =
                `'${path.relative(sourceDir, "Source")}/Cesium.js` + `'`;
              if (sortedIdentifiers[q] === "CesiumMath") {
                contents += `import { Math as CesiumMath } from ${modulePath};${os.EOL}`;
              } else {
                contents += `import { ${sortedIdentifiers[q]} } from ${modulePath};${os.EOL}`;
              }
            }
          } else {
            contents += `import ${sortedIdentifiers[q]} from ${modulePath};${os.EOL}`;
          }
        }
      }

      let code;
      const codeAndReturn = result[6];
      if (file.endsWith("Spec.js")) {
        const indi = codeAndReturn.lastIndexOf("});");
        code = codeAndReturn.slice(0, indi);
        code = code.trim().replace(`'use strict';${os.EOL}`, "");
        contents += code + os.EOL;
      } else {
        const returnIndex = codeAndReturn.lastIndexOf("return");

        code = codeAndReturn.slice(0, returnIndex);
        code = code.trim().replace(`'use strict';${os.EOL}`, "");
        contents += code + os.EOL;

        const returnStatement = codeAndReturn.slice(returnIndex);
        contents += `${returnStatement
          .split(";")[0]
          .replace("return ", "export default ")};${os.EOL}`;
      }

      return fsWriteFile(file, contents);
    });
  });
});

function combineCesium(debug, minify, combineOutput) {
  const plugins = [];

  if (!debug) {
    plugins.push(
      rollupPluginStripPragma({
        pragmas: ["debug"],
      })
    );
  }
  if (minify) {
    plugins.push(rollupPluginTerser.terser());
  }

  return rollup
    .rollup({
      input: "Source/Cesium.js",
      plugins: plugins,
      onwarn: rollupWarning,
    })
    .then(function (bundle) {
      return bundle.write({
        format: "umd",
        name: "Cesium",
        file: path.join(combineOutput, "Cesium.js"),
        sourcemap: debug,
        banner: copyrightHeader,
      });
    });
}

function combineWorkers(debug, minify, combineOutput) {
  //This is done waterfall style for concurrency reasons.
  // Copy files that are already minified
  return globby(["Source/ThirdParty/Workers/draco*.js"])
    .then(function (files) {
      const stream = gulp
        .src(files, { base: "Source" })
        .pipe(gulp.dest(combineOutput));
      return streamToPromise(stream);
    })
    .then(function () {
      return globby([
        "Source/Workers/cesiumWorkerBootstrapper.js",
        "Source/Workers/transferTypedArrayTest.js",
        "Source/ThirdParty/Workers/*.js",
        // Files are already minified, don't optimize
        "!Source/ThirdParty/Workers/draco*.js",
      ]);
    })
    .then(function (files) {
      return Promise.map(
        files,
        function (file) {
          return streamToPromise(
            gulp
              .src(file)
              .pipe(gulpTerser())
              .pipe(
                gulp.dest(
                  path.dirname(
                    path.join(combineOutput, path.relative("Source", file))
                  )
                )
              )
          );
        },
        { concurrency: concurrency }
      );
    })
    .then(function () {
      return globby(["Source/WorkersES6/*.js"]);
    })
    .then(function (files) {
      const plugins = [];

      if (!debug) {
        plugins.push(
          rollupPluginStripPragma({
            pragmas: ["debug"],
          })
        );
      }
      if (minify) {
        plugins.push(rollupPluginTerser.terser());
      }

      return rollup
        .rollup({
          input: files,
          plugins: plugins,
          onwarn: rollupWarning,
        })
        .then(function (bundle) {
          return bundle.write({
            dir: path.join(combineOutput, "Workers"),
            format: "amd",
            sourcemap: debug,
            banner: copyrightHeader,
          });
        });
    });
}

function minifyCSS(outputDirectory) {
  streamToPromise(
    gulp
      .src("Source/**/*.css")
      .pipe(cleanCSS())
      .pipe(gulp.dest(outputDirectory))
  );
}

function minifyModules(outputDirectory) {
  return streamToPromise(
    gulp
      .src("Source/ThirdParty/google-earth-dbroot-parser.js")
      .pipe(gulpTerser())
      .pipe(gulp.dest(`${outputDirectory}/ThirdParty/`))
  );
}

function combineJavaScript(options) {
  const minify = options.minify;
  const outputDirectory = options.outputDirectory;
  const removePragmas = options.removePragmas;

  const combineOutput = path.join(
    "Build",
    "combineOutput",
    minify ? "minified" : "combined"
  );

  const promise = Promise.join(
    combineCesium(!removePragmas, minify, combineOutput),
    combineWorkers(!removePragmas, minify, combineOutput),
    minifyModules(outputDirectory)
  );

  return promise.then(function () {
    const promises = [];

    //copy to build folder with copyright header added at the top
    let stream = gulp
      .src([`${combineOutput}/**`])
      .pipe(gulp.dest(outputDirectory));

    promises.push(streamToPromise(stream));

    const everythingElse = ["Source/**", "!**/*.js", "!**/*.glsl"];
    if (minify) {
      promises.push(minifyCSS(outputDirectory));
      everythingElse.push("!**/*.css");
    }

    stream = gulp
      .src(everythingElse, { nodir: true })
      .pipe(gulp.dest(outputDirectory));
    promises.push(streamToPromise(stream));

    return Promise.all(promises).then(function () {
      rimraf.sync(combineOutput);
    });
  });
}

function glslToJavaScript(minify, minifyStateFilePath) {
  fs.writeFileSync(minifyStateFilePath, minify.toString());
  const minifyStateFileLastModified = fs.existsSync(minifyStateFilePath)
    ? fs.statSync(minifyStateFilePath).mtime.getTime()
    : 0;

  // collect all currently existing JS files into a set, later we will remove the ones
  // we still are using from the set, then delete any files remaining in the set.
  const leftOverJsFiles = {};

  globby
    .sync(["Source/Shaders/**/*.js", "Source/ThirdParty/Shaders/*.js"])
    .forEach(function (file) {
      leftOverJsFiles[path.normalize(file)] = true;
    });

  const builtinFunctions = [];
  const builtinConstants = [];
  const builtinStructs = [];

  const glslFiles = globby.sync([
    "Source/Shaders/**/*.glsl",
    "Source/ThirdParty/Shaders/*.glsl",
  ]);
  glslFiles.forEach(function (glslFile) {
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

    const jsFileExists = fs.existsSync(jsFile);
    const jsFileModified = jsFileExists
      ? fs.statSync(jsFile).mtime.getTime()
      : 0;
    const glslFileModified = fs.statSync(glslFile).mtime.getTime();

    if (
      jsFileExists &&
      jsFileModified > glslFileModified &&
      jsFileModified > minifyStateFileLastModified
    ) {
      return;
    }

    let contents = fs.readFileSync(glslFile, "utf8");
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

    fs.writeFileSync(jsFile, contents);
  });

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

  fs.writeFileSync(
    path.join("Source", "Shaders", "Builtin", "CzmBuiltins.js"),
    fileContents
  );
}

function createCesiumJs() {
  let contents = `export const VERSION = '${version}';\n`;
  globby.sync(sourceFiles).forEach(function (file) {
    file = path.relative("Source", file);

    let moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    let assignmentName = path.basename(file, path.extname(file));
    if (moduleId.indexOf("Shaders/") === 0) {
      assignmentName = `_shaders${assignmentName}`;
    }
    assignmentName = assignmentName.replace(/(\.|-)/g, "_");
    contents += `export { default as ${assignmentName} } from './${moduleId}.js';${os.EOL}`;
  });

  fs.writeFileSync("Source/Cesium.js", contents);
}

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
    const moduleName = matches[2].match(/([^\s|\(]+)/);
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

/**
 * Private interfaces to support PropertyBag being a dictionary-like object.
 */
interface DictionaryLike {
    [index: string]: any;
}

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

function createSpecList() {
  const specFiles = globby.sync(["Specs/**/*Spec.js"]);

  let contents = "";
  specFiles.forEach(function (file) {
    contents += `import './${filePathToModuleId(file).replace(
      "Specs/",
      ""
    )}.js';\n`;
  });

  fs.writeFileSync(path.join("Specs", "SpecList.js"), contents);
}

/**
 * Reads `ThirdParty.extra.json` file
 * @param path {string}
 * @param discoveredDependencies {Array<string>}
 * @returns {Promise<Array<Object>>} A promise to an array of objects with 'name`, `license`, and `url` strings
 */
function getLicenseDataFromThirdPartyExtra(path, discoveredDependencies) {
  if (!fs.existsSync(path)) {
    return Promise.resolve([]);
  }

  const fsReadFile = Promise.promisify(fs.readFile);

  return fsReadFile(path).then(function (contents) {
    const thirdPartyExtra = JSON.parse(contents);
    return Promise.map(thirdPartyExtra, function (module) {
      if (!discoveredDependencies.includes(module.name)) {
        // If this is not a npm module, return existing info
        if (!packageJson.devDependencies[module.name]) {
          discoveredDependencies.push(module.name);
          return Promise.resolve(module);
        }

        return getLicenseDataFromPackage(module.name, discoveredDependencies);
      }
    });
  });
}

const licenseOverrides = {
  dompurify: "Apache-2.0", // dompurify is available as both MPL-2.0 OR Apache-2.0
  pako: "MIT", // pako is MIT, and zlib is attributed separately
};

/**
 * Extracts name, license, and url from `package.json` file
 *
 * @param packageName {string} Name of package
 * @param discoveredDependencies {Array<string>}
 * @returns {Promise<Object>} A promise to an object with 'name`, `license`, and `url` strings
 */
function getLicenseDataFromPackage(packageName, discoveredDependencies) {
  if (discoveredDependencies.includes(packageName)) {
    return Promise.resolve([]);
  }
  discoveredDependencies.push(packageName);

  let promise;
  const packagePath = path.join("node_modules", packageName, "package.json");
  const fsReadFile = Promise.promisify(fs.readFile);

  if (fs.existsSync(packagePath)) {
    //Package exists at top-level, so use it.
    promise = fsReadFile(packagePath);
  } else {
    return Promise.reject(
      new Error(`Unable to find ${packageName} license information`)
    );
  }

  return promise.then(function (contents) {
    const packageJson = JSON.parse(contents);

    // Check for license
    let licenseField = licenseOverrides[packageName];

    if (!licenseField) {
      licenseField = packageJson.license;
    }

    if (!licenseField && packageJson.licenses) {
      licenseField = packageJson.licenses[0].type;
    }

    if (!licenseField) {
      console.log(`No license found for ${packageName}`);
      licenseField = "NONE";
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
    };
  });
}

function generateThirdParty() {
  let licenseJson = [];
  const discoveredDependencies = [];
  const fsWriteFile = Promise.promisify(fs.writeFile);

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

function createGalleryList() {
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
  globby.sync(fileList).forEach(function (file) {
    const demo = filePathToModuleId(
      path.relative("Apps/Sandcastle/gallery", file)
    );

    const demoObject = {
      name: demo,
      isNew: newDemos.includes(file),
    };

    if (fs.existsSync(`${file.replace(".html", "")}.jpg`)) {
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

  fs.writeFileSync(output, contents);

  // Compile CSS for Sandcastle
  return streamToPromise(
    gulp
      .src(path.join("Apps", "Sandcastle", "templates", "bucketRaw.css"))
      .pipe(cleanCSS())
      .pipe(gulpRename("bucket.css"))
      .pipe(
        gulpInsert.prepend(
          "/* This file is automatically rebuilt by the Cesium build process. */\n"
        )
      )
      .pipe(gulp.dest(path.join("Apps", "Sandcastle", "templates")))
  );
}

function createJsHintOptions() {
  const jshintrc = JSON.parse(
    fs.readFileSync(path.join("Apps", "Sandcastle", ".jshintrc"), "utf8")
  );

  const contents = `\
// This file is automatically rebuilt by the Cesium build process.\n\
const sandcastleJsHintOptions = ${JSON.stringify(jshintrc, null, 4)};\n`;

  fs.writeFileSync(
    path.join("Apps", "Sandcastle", "jsHintOptions.js"),
    contents
  );
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
    // Remove dev-only ES6 module loading for unbuilt Cesium
    .pipe(
      gulpReplace(
        '    <script type="module" src="../load-cesium-es6.js"></script>',
        ""
      )
    )
    .pipe(gulpReplace("nomodule", ""))
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
        ""
      )
    )
    .pipe(gulpReplace("nomodule", ""))
    .pipe(gulpReplace("../../Build", "../.."))
    .pipe(gulp.dest("Build/Apps/Sandcastle"));

  return streamToPromise(mergeStream(appStream, imageStream, standaloneStream));
}

function buildCesiumViewer() {
  const cesiumViewerOutputDirectory = "Build/Apps/CesiumViewer";
  mkdirp.sync(cesiumViewerOutputDirectory);

  let promise = Promise.join(
    rollup
      .rollup({
        input: "Apps/CesiumViewer/CesiumViewer.js",
        treeshake: {
          moduleSideEffects: false,
        },
        plugins: [
          rollupPluginStripPragma({
            pragmas: ["debug"],
          }),
          rollupPluginTerser.terser(),
        ],
        onwarn: rollupWarning,
      })
      .then(function (bundle) {
        return bundle.write({
          file: "Build/Apps/CesiumViewer/CesiumViewer.js",
          format: "iife",
        });
      })
  );

  promise = promise.then(function () {
    const stream = mergeStream(
      gulp
        .src("Build/Apps/CesiumViewer/CesiumViewer.js")
        .pipe(gulpInsert.prepend(copyrightHeader))
        .pipe(gulpReplace("../../Source", "."))
        .pipe(gulp.dest(cesiumViewerOutputDirectory)),

      gulp
        .src("Apps/CesiumViewer/CesiumViewer.css")
        .pipe(cleanCSS())
        .pipe(gulpReplace("../../Source", "."))
        .pipe(gulp.dest(cesiumViewerOutputDirectory)),

      gulp
        .src("Apps/CesiumViewer/index.html")
        .pipe(gulpReplace('type="module"', ""))
        .pipe(gulp.dest(cesiumViewerOutputDirectory)),

      gulp.src([
        "Apps/CesiumViewer/**",
        "!Apps/CesiumViewer/index.html",
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

      gulp.src(["Build/Cesium/Widgets/InfoBox/InfoBoxDescription.css"], {
        base: "Build/Cesium",
      }),

      gulp.src(["web.config"])
    );

    return streamToPromise(stream.pipe(gulp.dest(cesiumViewerOutputDirectory)));
  });

  return promise;
}

function filePathToModuleId(moduleId) {
  return moduleId.substring(0, moduleId.lastIndexOf(".")).replace(/\\/g, "/");
}
