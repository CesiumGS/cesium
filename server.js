import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { URL } from "url";

import chokidar from "chokidar";
import compression from "compression";
import express from "express";
import yargs from "yargs";

import ContextCache from "./scripts/ContextCache.js";
import createRoute from "./scripts/createRoute.js";

import {
  createCesiumJs,
  createJsHintOptions,
  createCombinedSpecList,
  glslToJavaScript,
  createIndexJs,
  buildCesium,
} from "./scripts/build.js";

const argv = yargs(process.argv)
  .options({
    port: {
      default: 8080,
      description: "Port to listen on.",
    },
    public: {
      type: "boolean",
      description: "Run a public server that listens on all interfaces.",
    },
    production: {
      type: "boolean",
      description: "If true, skip build step and serve existing built files.",
    },
  })
  .help().argv;

const outputDirectory = path.join("Build", "CesiumDev");

function formatTimeSinceInSeconds(start) {
  return Math.ceil((performance.now() - start) / 100) / 10;
}

/**
 * Returns CesiumJS bundles configured for development.
 *
 * @returns {Bundles} The bundles.
 */
async function generateDevelopmentBuild() {
  const startTime = performance.now();

  // Build @cesium/engine index.js
  console.log("[1/3] Building @cesium/engine...");
  await createIndexJs("engine");

  // Build @cesium/widgets index.js
  console.log("[2/3] Building @cesium/widgets...");
  await createIndexJs("widgets");

  // Build CesiumJS and save returned contexts for rebuilding upon request
  console.log("[3/3] Building CesiumJS...");
  const contexts = await buildCesium({
    development: true,
    iife: true,
    incremental: true,
    minify: false,
    node: false,
    outputDirectory: outputDirectory,
    removePragmas: false,
    sourcemap: true,
    write: false,
  });

  console.log(
    `Cesium built in ${formatTimeSinceInSeconds(startTime)} seconds.`,
  );

  return contexts;
}

(async function () {
  const gzipHeader = Buffer.from("1F8B08", "hex");
  const production = argv.production;

  let contexts;
  if (!production) {
    contexts = await generateDevelopmentBuild();
  }

  const app = express();

  app.use(function (req, res, next) {
    // *NOTE* Any changes you make here must be mirrored in web.config.
    const extensionToMimeType = {
      ".czml": "application/json",
      ".json": "application/json",
      ".geojson": "application/json",
      ".topojson": "application/json",
      ".wasm": "application/wasm",
      ".ktx2": "image/ktx2",
      ".gltf": "model/gltf+json",
      ".bgltf": "model/gltf-binary",
      ".glb": "model/gltf-binary",
      ".b3dm": "application/octet-stream",
      ".pnts": "application/octet-stream",
      ".i3dm": "application/octet-stream",
      ".cmpt": "application/octet-stream",
      ".geom": "application/octet-stream",
      ".vctr": "application/octet-stream",
      ".glsl": "text/plain",
    };
    const extension = path.extname(req.url);
    if (extensionToMimeType[extension]) {
      res.contentType(extensionToMimeType[extension]);
    }
    next();
  });

  app.use(compression());
  //eslint-disable-next-line no-unused-vars
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    next();
  });

  function checkGzipAndNext(req, res, next) {
    const baseURL = `${req.protocol}://${req.headers.host}/`;
    const reqUrl = new URL(req.url, baseURL);
    const filePath = reqUrl.pathname.substring(1);

    const readStream = fs.createReadStream(filePath, { start: 0, end: 2 });
    //eslint-disable-next-line no-unused-vars
    readStream.on("error", function (err) {
      next();
    });

    readStream.on("data", function (chunk) {
      if (chunk.equals(gzipHeader)) {
        res.header("Content-Encoding", "gzip");
      }
      next();
    });
  }

  const knownTilesetFormats = [
    /\.b3dm/,
    /\.pnts/,
    /\.i3dm/,
    /\.cmpt/,
    /\.glb/,
    /\.geom/,
    /\.vctr/,
    /tileset.*\.json$/,
  ];
  app.get(knownTilesetFormats, checkGzipAndNext);

  if (!production) {
    const iifeWorkersCache = new ContextCache(contexts.iifeWorkers);
    const iifeCache = createRoute(
      app,
      "Cesium.js",
      "/Build/CesiumUnminified/Cesium.js{.map}",
      contexts.iife,
      [iifeWorkersCache],
    );
    const esmCache = createRoute(
      app,
      "index.js",
      "/Build/CesiumUnminified/index.js{.map}",
      contexts.esm,
    );
    const workersCache = createRoute(
      app,
      "Workers/*",
      "/Build/CesiumUnminified/Workers/*file.js",
      contexts.workers,
    );

    const glslWatcher = chokidar.watch("packages/engine/Source/Shaders", {
      ignored: (path, stats) => {
        return !!stats?.isFile() && !path.endsWith(".glsl");
      },
      ignoreInitial: true,
    });
    glslWatcher.on("all", async () => {
      await glslToJavaScript(false, "Build/minifyShaders.state", "engine");
      esmCache.clear();
      iifeCache.clear();
    });

    let jsHintOptionsCache;
    const sourceCodeWatcher = chokidar.watch(
      ["packages/engine/Source", "packages/widgets/Source"],
      {
        ignored: [
          "packages/engine/Source/Shaders",
          "packages/engine/Source/ThirdParty",
          "packages/widgets/Source/ThirdParty",
          (path, stats) => {
            return !!stats?.isFile() && !path.endsWith(".js");
          },
        ],
        ignoreInitial: true,
      },
    );

    // eslint-disable-next-line no-unused-vars
    sourceCodeWatcher.on("all", async (action, path) => {
      esmCache.clear();
      iifeCache.clear();
      workersCache.clear();
      iifeWorkersCache.clear();
      jsHintOptionsCache = undefined;

      // Get the workspace token from the path, and rebuild that workspace's index.js
      const workspaceRegex = /packages\/(.+?)\/.+\.js/;
      const result = path.match(workspaceRegex);
      if (result) {
        await createIndexJs(result[1]);
      }

      await createCesiumJs();
    });

    const testWorkersCache = createRoute(
      app,
      "TestWorkers/*",
      "/Build/Specs/TestWorkers/*file",
      contexts.testWorkers,
    );
    chokidar
      .watch(["Specs/TestWorkers/*.js"], { ignoreInitial: true })
      .on("all", testWorkersCache.clear);

    const specsCache = createRoute(
      app,
      "Specs/*",
      "/Build/Specs/*file",
      contexts.specs,
    );
    const specWatcher = chokidar.watch(
      ["packages/engine/Specs", "packages/widgets/Specs", "Specs"],
      {
        ignored: [
          "packages/engine/Specs/SpecList.js",
          "packages/widgets/Specs/SpecList.js",
          "Specs/SpecList.js",
          "Specs/e2e",
          (path, stats) => {
            return !!stats?.isFile() && !path.endsWith("Spec.js");
          },
        ],
        ignoreInitial: true,
      },
    );
    specWatcher.on("all", async (event) => {
      if (event === "add" || event === "unlink") {
        await createCombinedSpecList();
      }

      specsCache.clear();
    });

    // Rebuild jsHintOptions as needed and serve as-is
    app.get(
      "/Apps/Sandcastle/jsHintOptions.js",
      async function (
        //eslint-disable-next-line no-unused-vars
        req,
        res,
        //eslint-disable-next-line no-unused-vars
        next,
      ) {
        if (!jsHintOptionsCache) {
          jsHintOptionsCache = await createJsHintOptions();
        }

        res.append("Cache-Control", "max-age=0");
        res.append("Content-Type", "application/javascript");
        res.send(jsHintOptionsCache);
      },
    );

    // Serve any static files starting with "Build/CesiumUnminified" from the
    // development build instead. That way, previous build output is preserved
    // while the latest is being served
    app.use("/Build/CesiumUnminified", express.static("Build/CesiumDev"));
  }

  app.use(express.static(path.resolve(".")));

  const server = app.listen(
    argv.port,
    argv.public ? undefined : "localhost",
    function () {
      if (argv.public) {
        console.log(
          "Cesium development server running publicly.  Connect to http://localhost:%d/",
          server.address().port,
        );
      } else {
        console.log(
          "Cesium development server running locally.  Connect to http://localhost:%d/",
          server.address().port,
        );
      }
    },
  );

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      console.log(
        "Error: Port %d is already in use, select a different port.",
        argv.port,
      );
      console.log("Example: node server.js --port %d", argv.port + 1);
    } else if (e.code === "EACCES") {
      console.log(
        "Error: This process does not have permission to listen on port %d.",
        argv.port,
      );
      if (argv.port < 1024) {
        console.log("Try a port number higher than 1024.");
      }
    }

    throw e;
  });

  server.on("close", function () {
    console.log("Cesium development server stopped.");
    process.exit(0);
  });

  let isFirstSig = true;
  process.on("SIGINT", function () {
    if (isFirstSig) {
      console.log("\nCesium development server shutting down.");

      server.close();

      if (!production) {
        contexts.esm.dispose();
        contexts.iife.dispose();
        contexts.workers.dispose();
        contexts.specs.dispose();
        contexts.testWorkers.dispose();
      }

      isFirstSig = false;
    } else {
      throw new Error("Cesium development server force kill.");
    }
  });
})();
