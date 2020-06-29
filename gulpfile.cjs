/*eslint-env node*/
"use strict";

var fs = require("fs");
var path = require("path");
var os = require("os");
var child_process = require("child_process");
var crypto = require("crypto");
var zlib = require("zlib");
var readline = require("readline");
var request = require("request");

var globby = require("globby");
var gulpTap = require("gulp-tap");
var gulpUglify = require("gulp-uglify");
var open = require("open");
var rimraf = require("rimraf");
var glslStripComments = require("glsl-strip-comments");
var mkdirp = require("mkdirp");
var mergeStream = require("merge-stream");
var streamToPromise = require("stream-to-promise");
var gulp = require("gulp");
var gulpInsert = require("gulp-insert");
var gulpZip = require("gulp-zip");
var gulpRename = require("gulp-rename");
var gulpReplace = require("gulp-replace");
var Promise = require("bluebird");
var Karma = require("karma");
var yargs = require("yargs");
var AWS = require("aws-sdk");
var mime = require("mime");
var rollup = require("rollup");
var rollupPluginStripPragma = require("rollup-plugin-strip-pragma");
var rollupPluginExternalGlobals = require("rollup-plugin-external-globals");
var rollupPluginUglify = require("rollup-plugin-uglify");
var cleanCSS = require("gulp-clean-css");
var typescript = require("typescript");

var packageJson = require("./package.json");
var version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}

var karmaConfigFile = path.join(__dirname, "Specs/karma.conf.js");
var travisDeployUrl =
  "http://cesium-dev.s3-website-us-east-1.amazonaws.com/cesium/";

//Gulp doesn't seem to have a way to get the currently running tasks for setting
//per-task variables.  We use the command line argument here to detect which task is being run.
var taskName = process.argv[2];
var noDevelopmentGallery = taskName === "release" || taskName === "makeZipFile";
var minifyShaders =
  taskName === "minify" ||
  taskName === "minifyRelease" ||
  taskName === "release" ||
  taskName === "makeZipFile" ||
  taskName === "buildApps";

var verbose = yargs.argv.verbose;

var concurrency = yargs.argv.concurrency;
if (!concurrency) {
  concurrency = os.cpus().length;
}

var sourceFiles = [
  "Source/**/*.js",
  "!Source/*.js",
  "!Source/Workers/**",
  "!Source/WorkersES6/**",
  "Source/WorkersES6/createTaskProcessorWorker.js",
  "!Source/ThirdParty/Workers/**",
  "!Source/ThirdParty/google-earth-dbroot-parser.js",
  "!Source/ThirdParty/pako_inflate.js",
  "!Source/ThirdParty/crunch.js",
];

var watchedFiles = [
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

var filesToClean = [
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

var filesToConvertES6 = [
  "Source/**/*.js",
  "Specs/**/*.js",
  "!Source/ThirdParty/**",
  "!Source/Cesium.js",
  "!Source/copyrightHeader.js",
  "!Source/Shaders/**",
  "!Source/Workers/cesiumWorkerBootstrapper.js",
  "!Source/Workers/transferTypedArrayTest.js",
  "!Specs/karma-main.js",
  "!Specs/karma.conf.js",
  "!Specs/spec-main.js",
  "!Specs/SpecList.js",
  "!Specs/TestWorkers/**",
];

function rollupWarning(message) {
  // Ignore eval warnings in third-party code we don't have control over
  if (
    message.code === "EVAL" &&
    /(protobuf-minimal|crunch)\.js$/.test(message.loc.file)
  ) {
    return;
  }
  console.log(message);
}

var copyrightHeader = fs.readFileSync(
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

  var workers = globby.sync(["Source/WorkersES6/**"]);

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

gulp.task("build", function () {
  mkdirp.sync("Build");
  fs.writeFileSync(
    "Build/package.json",
    JSON.stringify({
      type: "commonjs",
    }),
    "utf8"
  );
  glslToJavaScript(minifyShaders, "Build/minifyShaders.state");
  createCesiumJs();
  createSpecList();
  createJsHintOptions();
  return Promise.join(createWorkers(), createGalleryList());
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
  var externalCesium = rollupPluginExternalGlobals({
    "../Source/Cesium.js": "Cesium",
    "../../Source/Cesium.js": "Cesium",
    "../../../Source/Cesium.js": "Cesium",
    "../../../../Source/Cesium.js": "Cesium",
  });

  var removePragmas = rollupPluginStripPragma({
    pragmas: ["debug"],
  });

  var promise = Promise.join(
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
            input: "Specs/spec-main.js",
            plugins: [removePragmas, externalCesium],
          })
          .then(function (bundle) {
            return bundle.write({
              file: "Build/Specs/spec-main.js",
              format: "iife",
            });
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
  var cmdLine;

  //Run cloc on primary Source files only
  var source = new Promise(function (resolve, reject) {
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
  var outputDirectory = path.join("Build", "CesiumUnminified");
  return combineJavaScript({
    removePragmas: false,
    optimizer: "none",
    outputDirectory: outputDirectory,
  });
}

gulp.task("combine", gulp.series("build", combine));
gulp.task("default", gulp.series("combine"));

function combineRelease() {
  var outputDirectory = path.join("Build", "CesiumUnminified");
  return combineJavaScript({
    removePragmas: true,
    optimizer: "none",
    outputDirectory: outputDirectory,
  });
}

gulp.task("combineRelease", gulp.series("build", combineRelease));

//Builds the documentation
function generateDocumentation() {
  child_process.execSync("npx jsdoc --configure Tools/jsdoc/conf.json", {
    stdio: "inherit",
    env: Object.assign({}, process.env, { CESIUM_VERSION: version }),
  });

  var stream = gulp
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

    var builtSrc = gulp.src(
      [
        "Build/Cesium/**",
        "Build/CesiumUnminified/**",
        "Build/Documentation/**",
      ],
      {
        base: ".",
      }
    );

    var staticSrc = gulp.src(
      [
        "Apps/**",
        "!Apps/Sandcastle/gallery/development/**",
        "Source/**",
        "Specs/**",
        "ThirdParty/**",
        "favicon.ico",
        "gulpfile.cjs",
        "server.cjs",
        "package.json",
        "LICENSE.md",
        "CHANGES.md",
        "README.md",
        "web.config",
      ],
      {
        base: ".",
      }
    );

    var indexSrc = gulp
      .src("index.release.html")
      .pipe(gulpRename("index.html"));

    return mergeStream(builtSrc, staticSrc, indexSrc)
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
      .pipe(gulpZip("Cesium-" + version + ".zip"))
      .pipe(gulp.dest("."));
  })
);

gulp.task(
  "minify",
  gulp.series("build", function () {
    return combineJavaScript({
      removePragmas: false,
      optimizer: "uglify2",
      outputDirectory: path.join("Build", "Cesium"),
    });
  })
);

function minifyRelease() {
  return combineJavaScript({
    removePragmas: true,
    optimizer: "uglify2",
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

  var argv = yargs
    .usage("Usage: deploy-s3 -b [Bucket Name] -d [Upload Directory]")
    .demand(["b", "d"]).argv;

  var uploadDirectory = argv.d;
  var bucketName = argv.b;
  var cacheControl = argv.c ? argv.c : "max-age=3600";

  if (argv.confirm) {
    // skip prompt for travis
    deployCesium(bucketName, uploadDirectory, cacheControl, done);
    return;
  }

  var iface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // prompt for confirmation
  iface.question(
    "Files from your computer will be published to the " +
      bucketName +
      " bucket. Continue? [y/n] ",
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
  var readFile = Promise.promisify(fs.readFile);
  var gzip = Promise.promisify(zlib.gzip);
  var concurrencyLimit = 2000;

  var s3 = new AWS.S3({
    maxRetries: 10,
    retryDelayOptions: {
      base: 500,
    },
  });

  var existingBlobs = [];
  var totalFiles = 0;
  var uploaded = 0;
  var skipped = 0;
  var errors = [];

  var prefix = uploadDirectory + "/";
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
          var blobName = uploadDirectory + "/" + file;
          var mimeLookup = getMimeType(blobName);
          var contentType = mimeLookup.type;
          var compress = mimeLookup.compress;
          var contentEncoding = compress ? "gzip" : undefined;
          var etag;

          totalFiles++;

          return readFile(file)
            .then(function (content) {
              if (!compress) {
                return content;
              }

              var alreadyCompressed =
                content[0] === 0x1f && content[1] === 0x8b;
              if (alreadyCompressed) {
                console.log(
                  "Skipping compressing already compressed file: " + file
                );
                return content;
              }

              return gzip(content);
            })
            .then(function (content) {
              // compute hash and etag
              var hash = crypto.createHash("md5").update(content).digest("hex");
              etag = crypto.createHash("md5").update(content).digest("base64");

              var index = existingBlobs.indexOf(blobName);
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
                    data.ETag !== '"' + hash + '"' ||
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
                console.log("Uploading " + blobName + "...");
              }
              var params = {
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
        "Skipped " +
          skipped +
          " files and successfully uploaded " +
          uploaded +
          " files of " +
          (totalFiles - skipped) +
          " files."
      );
      if (existingBlobs.length === 0) {
        return;
      }

      var objectsToDelete = [];
      existingBlobs.forEach(function (file) {
        //Don't delete generate zip files.
        if (!/\.(zip|tgz)$/.test(file)) {
          objectsToDelete.push({ Key: file });
        }
      });

      if (objectsToDelete.length > 0) {
        console.log("Cleaning " + objectsToDelete.length + " files...");

        // If more than 1000 files, we must issue multiple requests
        var batches = [];
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
                  console.log("Cleaned " + objects.length + " files.");
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
  var mimeType = mime.getType(filename);
  if (mimeType) {
    //Compress everything except zipfiles, binary images, and video
    var compress = !/^(image\/|video\/|application\/zip|application\/gzip)/i.test(
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
  } else if (/\.(crn|tgz)$/i.test(filename)) {
    return { type: "application/octet-stream", compress: false };
  }

  // Handle dotfiles, such as .jshintrc
  var baseName = path.basename(filename);
  if (baseName[0] === "." || baseName.indexOf(".") === -1) {
    return { type: "text/plain", compress: true };
  }

  // Everything else can be octet-stream compressed but print a warning
  // if we introduce a type we aren't specifically handling.
  if (!/\.(terrain|b3dm|geom|pnts|vctr|cmpt|i3dm|metadata)$/i.test(filename)) {
    console.log("Unknown mime type for " + filename);
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
      var items = data.Contents;
      for (var i = 0; i < items.length; i++) {
        files.push(items[i].Key);
      }

      if (data.IsTruncated) {
        // get next page of results
        return listAll(s3, bucketName, prefix, files, files[files.length - 1]);
      }
    });
}

gulp.task("deploy-set-version", function (done) {
  var buildVersion = yargs.argv.buildVersion;
  if (buildVersion) {
    // NPM versions can only contain alphanumeric and hyphen characters
    packageJson.version += "-" + buildVersion.replace(/[^[0-9A-Za-z-]/g, "");
    fs.writeFileSync("package.json", JSON.stringify(packageJson, undefined, 2));
  }
  done();
});

gulp.task("deploy-status", function () {
  if (isTravisPullRequest()) {
    console.log("Skipping deployment status for non-pull request.");
    return Promise.resolve();
  }

  var status = yargs.argv.status;
  var message = yargs.argv.message;

  var deployUrl = travisDeployUrl + process.env.TRAVIS_BRANCH + "/";
  var zipUrl = deployUrl + "Cesium-" + packageJson.version + ".zip";
  var npmUrl = deployUrl + "cesium-" + packageJson.version + ".tgz";
  var coverageUrl =
    travisDeployUrl + process.env.TRAVIS_BRANCH + "/Build/Coverage/index.html";

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

  var requestPost = Promise.promisify(request.post);
  return requestPost({
    url:
      "https://api.github.com/repos/" +
      process.env.TRAVIS_REPO_SLUG +
      "/statuses/" +
      process.env.TRAVIS_COMMIT,
    json: true,
    headers: {
      Authorization: "token " + process.env.TOKEN,
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
  var argv = yargs.argv;
  var webglStub = argv.webglStub ? argv.webglStub : false;
  var suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;
  var failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;

  var folders = [];
  var browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  var karma = new Karma.Server(
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
        args: [undefined, undefined, undefined, webglStub, undefined],
      },
    },
    function (e) {
      var html = "<!doctype html><html><body><ul>";
      folders.forEach(function (folder) {
        html +=
          '<li><a href="' +
          encodeURIComponent(folder) +
          '/index.html">' +
          folder +
          "</a></li>";
      });
      html += "</ul></body></html>";
      fs.writeFileSync("Build/Coverage/index.html", html);

      if (!process.env.TRAVIS) {
        folders.forEach(function (dir) {
          open("Build/Coverage/" + dir + "/index.html");
        });
      }
      return done(failTaskOnError ? e : undefined);
    }
  );
  karma.start();
});

gulp.task("test", function (done) {
  var argv = yargs.argv;

  var enableAllBrowsers = argv.all ? true : false;
  var includeCategory = argv.include ? argv.include : "";
  var excludeCategory = argv.exclude ? argv.exclude : "";
  var webglValidation = argv.webglValidation ? argv.webglValidation : false;
  var webglStub = argv.webglStub ? argv.webglStub : false;
  var release = argv.release ? argv.release : false;
  var failTaskOnError = argv.failTaskOnError ? argv.failTaskOnError : false;
  var suppressPassed = argv.suppressPassed ? argv.suppressPassed : false;

  var browsers = ["Chrome"];
  if (argv.browsers) {
    browsers = argv.browsers.split(",");
  }

  var files = [
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

  var karma = new Karma.Server(
    {
      configFile: karmaConfigFile,
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
  var requiresRegex = /([\s\S]*?(define|defineSuite|require)\((?:{[\s\S]*}, )?\[)([\S\s]*?)]([\s\S]*?function\s*)\(([\S\s]*?)\) {([\s\S]*)/;
  var noModulesRegex = /([\s\S]*?(define|defineSuite|require)\((?:{[\s\S]*}, )?\[?)([\S\s]*?)]?([\s\S]*?function\s*)\(([\S\s]*?)\) {([\s\S]*)/;
  var splitRegex = /,\s*/;

  var fsReadFile = Promise.promisify(fs.readFile);
  var fsWriteFile = Promise.promisify(fs.writeFile);

  var files = globby.sync(filesToConvertES6);

  return Promise.map(files, function (file) {
    return fsReadFile(file).then(function (contents) {
      contents = contents.toString();
      if (contents.startsWith("import")) {
        return;
      }

      var result = requiresRegex.exec(contents);

      if (result === null) {
        result = noModulesRegex.exec(contents);
        if (result === null) {
          return;
        }
      }

      var names = result[3].split(splitRegex);
      if (names.length === 1 && names[0].trim() === "") {
        names.length = 0;
      }

      var i;
      for (i = 0; i < names.length; ++i) {
        if (names[i].indexOf("//") >= 0 || names[i].indexOf("/*") >= 0) {
          console.log(
            file +
              " contains comments in the require list.  Skipping so nothing gets broken."
          );
          return;
        }
      }

      var identifiers = result[5].split(splitRegex);
      if (identifiers.length === 1 && identifiers[0].trim() === "") {
        identifiers.length = 0;
      }

      for (i = 0; i < identifiers.length; ++i) {
        if (
          identifiers[i].indexOf("//") >= 0 ||
          identifiers[i].indexOf("/*") >= 0
        ) {
          console.log(
            file +
              " contains comments in the require list.  Skipping so nothing gets broken."
          );
          return;
        }
      }

      var requires = [];

      for (i = 0; i < names.length && i < identifiers.length; ++i) {
        requires.push({
          name: names[i].trim(),
          identifier: identifiers[i].trim(),
        });
      }

      // Convert back to separate lists for the names and identifiers, and add
      // any additional names or identifiers that don't have a corresponding pair.
      var sortedNames = requires.map(function (item) {
        return item.name.slice(0, -1) + ".js'";
      });
      for (i = sortedNames.length; i < names.length; ++i) {
        sortedNames.push(names[i].trim());
      }

      var sortedIdentifiers = requires.map(function (item) {
        return item.identifier;
      });
      for (i = sortedIdentifiers.length; i < identifiers.length; ++i) {
        sortedIdentifiers.push(identifiers[i].trim());
      }

      contents = "";
      if (sortedNames.length > 0) {
        for (var q = 0; q < sortedNames.length; q++) {
          var modulePath = sortedNames[q];
          if (file.startsWith("Specs")) {
            modulePath = modulePath.substring(1, modulePath.length - 1);
            var sourceDir = path.dirname(file);

            if (modulePath.startsWith("Specs") || modulePath.startsWith(".")) {
              var importPath = modulePath;
              if (modulePath.startsWith("Specs")) {
                importPath = path.relative(sourceDir, modulePath);
                if (importPath[0] !== ".") {
                  importPath = "./" + importPath;
                }
              }
              modulePath = "'" + importPath + "'";
              contents +=
                "import " +
                sortedIdentifiers[q] +
                " from " +
                modulePath +
                ";" +
                os.EOL;
            } else {
              modulePath =
                "'" + path.relative(sourceDir, "Source") + "/Cesium.js" + "'";
              if (sortedIdentifiers[q] === "CesiumMath") {
                contents +=
                  "import { Math as CesiumMath } from " +
                  modulePath +
                  ";" +
                  os.EOL;
              } else {
                contents +=
                  "import { " +
                  sortedIdentifiers[q] +
                  " } from " +
                  modulePath +
                  ";" +
                  os.EOL;
              }
            }
          } else {
            contents +=
              "import " +
              sortedIdentifiers[q] +
              " from " +
              modulePath +
              ";" +
              os.EOL;
          }
        }
      }

      var code;
      var codeAndReturn = result[6];
      if (file.endsWith("Spec.js")) {
        var indi = codeAndReturn.lastIndexOf("});");
        code = codeAndReturn.slice(0, indi);
        code = code.trim().replace("'use strict';" + os.EOL, "");
        contents += code + os.EOL;
      } else {
        var returnIndex = codeAndReturn.lastIndexOf("return");

        code = codeAndReturn.slice(0, returnIndex);
        code = code.trim().replace("'use strict';" + os.EOL, "");
        contents += code + os.EOL;

        var returnStatement = codeAndReturn.slice(returnIndex);
        contents +=
          returnStatement.split(";")[0].replace("return ", "export default ") +
          ";" +
          os.EOL;
      }

      return fsWriteFile(file, contents);
    });
  });
});

function combineCesium(debug, optimizer, combineOutput) {
  var plugins = [];

  if (!debug) {
    plugins.push(
      rollupPluginStripPragma({
        pragmas: ["debug"],
      })
    );
  }
  if (optimizer === "uglify2") {
    plugins.push(rollupPluginUglify.uglify());
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

function combineWorkers(debug, optimizer, combineOutput) {
  //This is done waterfall style for concurrency reasons.
  // Copy files that are already minified
  return globby(["Source/ThirdParty/Workers/draco*.js"])
    .then(function (files) {
      var stream = gulp
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
              .pipe(gulpUglify())
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
      var plugins = [];

      if (!debug) {
        plugins.push(
          rollupPluginStripPragma({
            pragmas: ["debug"],
          })
        );
      }
      if (optimizer === "uglify2") {
        plugins.push(rollupPluginUglify.uglify());
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
      .pipe(gulpUglify())
      .pipe(gulp.dest(outputDirectory + "/ThirdParty/"))
  );
}

function combineJavaScript(options) {
  var optimizer = options.optimizer;
  var outputDirectory = options.outputDirectory;
  var removePragmas = options.removePragmas;

  var combineOutput = path.join("Build", "combineOutput", optimizer);

  var promise = Promise.join(
    combineCesium(!removePragmas, optimizer, combineOutput),
    combineWorkers(!removePragmas, optimizer, combineOutput),
    minifyModules(outputDirectory)
  );

  return promise.then(function () {
    var promises = [];

    //copy to build folder with copyright header added at the top
    var stream = gulp
      .src([combineOutput + "/**"])
      .pipe(gulp.dest(outputDirectory));

    promises.push(streamToPromise(stream));

    var everythingElse = ["Source/**", "!**/*.js", "!**/*.glsl"];
    if (optimizer === "uglify2") {
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
  var minifyStateFileLastModified = fs.existsSync(minifyStateFilePath)
    ? fs.statSync(minifyStateFilePath).mtime.getTime()
    : 0;

  // collect all currently existing JS files into a set, later we will remove the ones
  // we still are using from the set, then delete any files remaining in the set.
  var leftOverJsFiles = {};

  globby
    .sync(["Source/Shaders/**/*.js", "Source/ThirdParty/Shaders/*.js"])
    .forEach(function (file) {
      leftOverJsFiles[path.normalize(file)] = true;
    });

  var builtinFunctions = [];
  var builtinConstants = [];
  var builtinStructs = [];

  var glslFiles = globby.sync([
    "Source/Shaders/**/*.glsl",
    "Source/ThirdParty/Shaders/*.glsl",
  ]);
  glslFiles.forEach(function (glslFile) {
    glslFile = path.normalize(glslFile);
    var baseName = path.basename(glslFile, ".glsl");
    var jsFile = path.join(path.dirname(glslFile), baseName) + ".js";

    // identify built in functions, structs, and constants
    var baseDir = path.join("Source", "Shaders", "Builtin");
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

    var jsFileExists = fs.existsSync(jsFile);
    var jsFileModified = jsFileExists ? fs.statSync(jsFile).mtime.getTime() : 0;
    var glslFileModified = fs.statSync(glslFile).mtime.getTime();

    if (
      jsFileExists &&
      jsFileModified > glslFileModified &&
      jsFileModified > minifyStateFileLastModified
    ) {
      return;
    }

    var contents = fs.readFileSync(glslFile, "utf8");
    contents = contents.replace(/\r\n/gm, "\n");

    var copyrightComments = "";
    var extractedCopyrightComments = contents.match(
      /\/\*\*(?:[^*\/]|\*(?!\/)|\n)*?@license(?:.|\n)*?\*\//gm
    );
    if (extractedCopyrightComments) {
      copyrightComments = extractedCopyrightComments.join("\n") + "\n";
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
    contents =
      copyrightComments +
      '\
//This file is automatically rebuilt by the Cesium build process.\n\
export default "' +
      contents +
      '";\n';

    fs.writeFileSync(jsFile, contents);
  });

  // delete any left over JS files from old shaders
  Object.keys(leftOverJsFiles).forEach(function (filepath) {
    rimraf.sync(filepath);
  });

  var generateBuiltinContents = function (contents, builtins, path) {
    for (var i = 0; i < builtins.length; i++) {
      var builtin = builtins[i];
      contents.imports.push(
        "import czm_" + builtin + " from './" + path + "/" + builtin + ".js'"
      );
      contents.builtinLookup.push("czm_" + builtin + " : " + "czm_" + builtin);
    }
  };

  //generate the JS file for Built-in GLSL Functions, Structs, and Constants
  var contents = {
    imports: [],
    builtinLookup: [],
  };
  generateBuiltinContents(contents, builtinConstants, "Constants");
  generateBuiltinContents(contents, builtinStructs, "Structs");
  generateBuiltinContents(contents, builtinFunctions, "Functions");

  var fileContents =
    "//This file is automatically rebuilt by the Cesium build process.\n" +
    contents.imports.join("\n") +
    "\n\nexport default {\n    " +
    contents.builtinLookup.join(",\n    ") +
    "\n};\n";

  fs.writeFileSync(
    path.join("Source", "Shaders", "Builtin", "CzmBuiltins.js"),
    fileContents
  );
}

function createCesiumJs() {
  var contents = `export var VERSION = '${version}';\n`;
  globby.sync(sourceFiles).forEach(function (file) {
    file = path.relative("Source", file);

    var moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    var assignmentName = path.basename(file, path.extname(file));
    if (moduleId.indexOf("Shaders/") === 0) {
      assignmentName = "_shaders" + assignmentName;
    }
    assignmentName = assignmentName.replace(/(\.|-)/g, "_");
    contents +=
      "export { default as " +
      assignmentName +
      " } from './" +
      moduleId +
      ".js';" +
      os.EOL;
  });

  fs.writeFileSync("Source/Cesium.js", contents);
}

function createTypeScriptDefinitions() {
  // Run jsdoc with tsd-jsdoc to generate an initial Cesium.d.ts file.
  child_process.execSync("npx jsdoc --configure Tools/jsdoc/ts-conf.json", {
    stdio: "inherit",
  });

  var source = fs.readFileSync("Source/Cesium.d.ts").toString();

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

  var regex = /^declare (function|class|namespace|enum) (.+)/gm;
  var matches;
  var publicModules = new Set();
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
      (match, p1) => `= WebGLConstants.${p1}`
    );

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

    var moduleId = file;
    moduleId = filePathToModuleId(moduleId);

    var assignmentName = path.basename(file, path.extname(file));
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
      "Unexpected unexposed modules: " +
        Array.from(publicModules.values()).join(", ")
    );
  }
}

function createSpecList() {
  var specFiles = globby.sync(["Specs/**/*Spec.js"]);

  var contents = "";
  specFiles.forEach(function (file) {
    contents +=
      "import './" + filePathToModuleId(file).replace("Specs/", "") + ".js';\n";
  });

  fs.writeFileSync(path.join("Specs", "SpecList.js"), contents);
}

function createGalleryList() {
  var demoObjects = [];
  var demoJSONs = [];
  var output = path.join("Apps", "Sandcastle", "gallery", "gallery-index.js");

  var fileList = ["Apps/Sandcastle/gallery/**/*.html"];
  if (noDevelopmentGallery) {
    fileList.push("!Apps/Sandcastle/gallery/development/**/*.html");
  }

  // On travis, the version is set to something like '1.43.0-branch-name-travisBuildNumber'
  // We need to extract just the Major.Minor version
  var majorMinor = packageJson.version.match(/^(.*)\.(.*)\./);
  var major = majorMinor[1];
  var minor = Number(majorMinor[2]) - 1; // We want the last release, not current release
  var tagVersion = major + "." + minor;

  // Get an array of demos that were added since the last release.
  // This includes newly staged local demos as well.
  var newDemos = [];
  try {
    newDemos = child_process
      .execSync(
        "git diff --name-only --diff-filter=A " +
          tagVersion +
          " Apps/Sandcastle/gallery/*.html",
        { stdio: ["pipe", "pipe", "ignore"] }
      )
      .toString()
      .trim()
      .split("\n");
  } catch (e) {
    // On a Cesium fork, tags don't exist so we can't generate the list.
  }

  var helloWorld;
  globby.sync(fileList).forEach(function (file) {
    var demo = filePathToModuleId(
      path.relative("Apps/Sandcastle/gallery", file)
    );

    var demoObject = {
      name: demo,
      isNew: newDemos.includes(file),
    };

    if (fs.existsSync(file.replace(".html", "") + ".jpg")) {
      demoObject.img = demo + ".jpg";
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

  var helloWorldIndex = Math.max(demoObjects.indexOf(helloWorld), 0);

  var i;
  for (i = 0; i < demoObjects.length; ++i) {
    demoJSONs[i] = JSON.stringify(demoObjects[i], null, 2);
  }

  var contents =
    "\
// This file is automatically rebuilt by the Cesium build process.\n\
var hello_world_index = " +
    helloWorldIndex +
    ";\n\
var VERSION = '" +
    version +
    "';\n\
var gallery_demos = [" +
    demoJSONs.join(", ") +
    "];\n\
var has_new_gallery_demos = " +
    (newDemos.length > 0 ? "true;" : "false;") +
    "\n";

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
  var primary = JSON.parse(
    fs.readFileSync(path.join("Apps", ".jshintrc"), "utf8")
  );
  var gallery = JSON.parse(
    fs.readFileSync(path.join("Apps", "Sandcastle", ".jshintrc"), "utf8")
  );
  primary.jasmine = false;
  primary.predef = gallery.predef;
  primary.unused = gallery.unused;
  primary.esversion = gallery.esversion;

  var contents =
    "\
// This file is automatically rebuilt by the Cesium build process.\n\
var sandcastleJsHintOptions = " +
    JSON.stringify(primary, null, 4) +
    ";\n";

  fs.writeFileSync(
    path.join("Apps", "Sandcastle", "jsHintOptions.js"),
    contents
  );
}

function buildSandcastle() {
  var appStream = gulp
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

  var imageStream = gulp
    .src(["Apps/Sandcastle/gallery/**.jpg", "Apps/Sandcastle/images/**"], {
      base: "Apps/Sandcastle",
      buffer: false,
    })
    .pipe(gulp.dest("Build/Apps/Sandcastle"));

  var standaloneStream = gulp
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
  var cesiumViewerOutputDirectory = "Build/Apps/CesiumViewer";
  mkdirp.sync(cesiumViewerOutputDirectory);

  var promise = Promise.join(
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
          rollupPluginUglify.uglify(),
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
    var stream = mergeStream(
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
