/*eslint-env node*/
"use strict";

const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const request = require("request");
const { URL } = require("url");

const chokidar = require("chokidar");
const compression = require("compression");
const express = require("express");
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const yargs = require("yargs").options({
  port: {
    default: 8080,
    description: "Port to listen on.",
  },
  public: {
    type: "boolean",
    description: "Run a public server that listens on all interfaces.",
  },
  "upstream-proxy": {
    description:
      'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".',
  },
  "bypass-upstream-proxy-hosts": {
    description:
      'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"',
  },
  help: {
    alias: "h",
    type: "boolean",
    description: "Show this help.",
  },
});

const {
  buildCesiumJs,
  buildSpecs,
  buildWorkers,
  copyAssets,
  createCesiumJs,
  createGalleryList,
  createJsHintOptions,
  createSpecList,
  glslToJavaScript,
} = require("./build.cjs");

const sourceFiles = [
  "Source/**/*.js",
  "!Source/*.js",
  "!Source/Shaders/**",
  "!Source/Workers/**",
  "!Source/WorkersES6/**",
  "Source/WorkersES6/createTaskProcessorWorker.js",
  "!Source/ThirdParty/Workers/**",
  "!Source/ThirdParty/google-earth-dbroot-parser.js",
  "!Source/ThirdParty/_*",
];
const specFiles = [
  "Specs/**/*Spec.js",
  "Specs/*.js",
  "!Specs/SpecList.js",
  "Specs/TestWorkers/*.js",
];
const shaderFiles = ["Source/Shaders/**/*.glsl"];
const workerSourceFiles = ["Source/WorkersES6/*.js"];

const outputDirectory = path.join("Build", "CesiumUnminified");

function formatTimeSinceInSeconds(start) {
  return Math.ceil((performance.now() - start) / 100) / 10;
}

async function buildDev() {
  console.log("Building Cesium...");
  const start = performance.now();

  mkdirp.sync("Build");
  rimraf.sync(outputDirectory);

  fs.writeFileSync(
    "Build/package.json",
    JSON.stringify({
      type: "commonjs",
    }),
    "utf8"
  );

  glslToJavaScript(false, "Build/minifyShaders.state");
  createCesiumJs();
  createSpecList();
  createJsHintOptions();

  const [esmResult, iifeResult] = await buildCesiumJs({
    iife: true,
    sourcemap: true,
    path: outputDirectory,
    incremental: true,
    write: false,
  });

  await buildWorkers({
    sourcemap: true,
    path: outputDirectory,
    incremental: true,
  });

  await createGalleryList();

  const specResult = await buildSpecs({
    incremental: true,
    write: false,
  });

  console.log(`Cesium built in ${formatTimeSinceInSeconds(start)} seconds.`);

  await copyAssets(outputDirectory);

  return {
    esmResult,
    iifeResult,
    specResult,
  };
}

const serveResult = (result, fileName, res, next) => {
  let bundle;
  for (const out of result.outputFiles) {
    if (path.basename(out.path) === fileName) {
      bundle = out.text;
    }
  }

  if (!bundle) {
    next(new Error("Failed to generate bundle"));
    return;
  }

  res.append("Cache-Control", "max-age=0");
  res.append("Content-Type", "application/javascript");
  res.send(bundle);
};

(async function () {
  const gzipHeader = Buffer.from("1F8B08", "hex");
  const argv = yargs.argv;

  if (argv.help) {
    return yargs.showHelp();
  }

  let { esmResult, iifeResult, specResult } = await buildDev();

  // eventually this mime type configuration will need to change
  // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
  // *NOTE* Any changes you make here must be mirrored in web.config.
  const mime = express.static.mime;
  mime.define(
    {
      "application/json": ["czml", "json", "geojson", "topojson"],
      "application/wasm": ["wasm"],
      "image/ktx2": ["ktx2"],
      "model/gltf+json": ["gltf"],
      "model/gltf-binary": ["bgltf", "glb"],
      "application/octet-stream": [
        "b3dm",
        "pnts",
        "i3dm",
        "cmpt",
        "geom",
        "vctr",
      ],
      "text/plain": ["glsl"],
    },
    true
  );

  const app = express();
  app.use(compression());
  //eslint-disable-next-line no-unused-vars
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
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

  // Set up file watcher for more expensive operations which would block during
  // "just in time" compilation
  const workerWatcher = chokidar.watch(workerSourceFiles, {
    ignoreInitial: true,
  });
  workerWatcher.on("all", async () => {
    const start = performance.now();
    await buildWorkers({
      path: outputDirectory,
      sourcemap: true,
    });
    console.log(
      `Rebuilt Workers/* in ${formatTimeSinceInSeconds(start)} seconds.`
    );
  });

  //eslint-disable-next-line no-unused-vars
  app.get("/Build/CesiumUnminified/Cesium.js", async function (req, res, next) {
    if (!iifeResult?.outputFiles || iifeResult.outputFiles.length === 0) {
      try {
        const start = performance.now();
        createCesiumJs();
        iifeResult = await iifeResult.rebuild();
        console.log(
          `Rebuilt Cesium.js in ${formatTimeSinceInSeconds(start)} seconds.`
        );
      } catch (e) {
        next(e);
      }
    }

    return serveResult(iifeResult, "Cesium.js", res, next);
  });

  app.get("/Build/CesiumUnminified/Cesium.js.map", async function (
    //eslint-disable-next-line no-unused-vars
    req,
    res,
    next
  ) {
    if (!iifeResult?.outputFiles || iifeResult.outputFiles.length === 0) {
      try {
        const start = performance.now();
        createCesiumJs();
        iifeResult = await iifeResult.rebuild();
        console.log(
          `Rebuilt Cesium.js in ${formatTimeSinceInSeconds(start)} seconds.`
        );
      } catch (e) {
        next(e);
      }
    }

    return serveResult(iifeResult, "Cesium.js.map", res, next);
  });

  //eslint-disable-next-line no-unused-vars
  app.get("/Build/CesiumUnminified/index.js", async function (req, res, next) {
    if (!esmResult?.outputFiles || esmResult.outputFiles.length === 0) {
      try {
        const start = performance.now();
        createCesiumJs();
        esmResult = await esmResult.rebuild();
        console.log(
          `Rebuilt index.js in ${formatTimeSinceInSeconds(start)} seconds.`
        );
      } catch (e) {
        next(e);
      }
    }

    return serveResult(esmResult, "index.js", res, next);
  });
  app.get("/Build/CesiumUnminified/index.js.map", async function (
    //eslint-disable-next-line no-unused-vars
    req,
    res,
    next
  ) {
    if (!esmResult?.outputFiles || esmResult.outputFiles.length === 0) {
      try {
        const start = performance.now();
        createCesiumJs();
        esmResult = await esmResult.rebuild();
        console.log(
          `Rebuilt index.js in ${formatTimeSinceInSeconds(start)} seconds.`
        );
      } catch (e) {
        next(e);
      }
    }

    return serveResult(esmResult, "index.js.map", res, next);
  });

  const glslWatcher = chokidar.watch(shaderFiles, { ignoreInitial: true });
  glslWatcher.on("all", async () => {
    glslToJavaScript(false, "Build/minifyShaders.state");
    esmResult.outputFiles = [];
    iifeResult.outputFiles = [];
  });

  let jsHintOptionsCache;
  const sourceCodeWatcher = chokidar.watch(sourceFiles, {
    ignoreInitial: true,
  });
  sourceCodeWatcher.on("all", () => {
    esmResult.outputFiles = [];
    iifeResult.outputFiles = [];
    jsHintOptionsCache = undefined;
  });

  //eslint-disable-next-line no-unused-vars
  app.get("/Apps/Sandcastle/jsHintOptions.js", async function (req, res, next) {
    if (!jsHintOptionsCache) {
      jsHintOptionsCache = createJsHintOptions();
    }

    res.append("Cache-Control", "max-age=0");
    res.append("Content-Type", "application/javascript");
    res.send(jsHintOptionsCache);
  });

  let specRebuildPromise = Promise.resolve();
  //eslint-disable-next-line no-unused-vars
  app.get("/Build/Specs/*", async function (req, res, next) {
    // Multiple files may be requested at this path, calling this function in quick succession.
    // Await the previous build before re-building again.
    await specRebuildPromise;

    if (!specResult?.outputFiles || specResult.outputFiles.length === 0) {
      try {
        const start = performance.now();
        specRebuildPromise = specResult.rebuild();
        specResult = await specRebuildPromise;
        console.log(
          `Rebuilt Specs/* in ${formatTimeSinceInSeconds(start)} seconds.`
        );
      } catch (e) {
        next(e);
      }
    }

    return serveResult(specResult, path.basename(req.originalUrl), res, next);
  });

  const specWatcher = chokidar.watch(specFiles, { ignoreInitial: true });
  specWatcher.on("all", async (event) => {
    if (event === "add" || event === "unlink") {
      createSpecList();
    }

    specResult.outputFiles = [];
  });

  app.use(express.static(__dirname));

  function getRemoteUrlFromParam(req) {
    let remoteUrl = req.params[0];
    if (remoteUrl) {
      // add http:// to the URL if no protocol is present
      if (!/^https?:\/\//.test(remoteUrl)) {
        remoteUrl = `http://${remoteUrl}`;
      }
      remoteUrl = new URL(remoteUrl);
      // copy query string
      const baseURL = `${req.protocol}://${req.headers.host}/`;
      remoteUrl.search = new URL(req.url, baseURL).search;
    }
    return remoteUrl;
  }

  const dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

  //eslint-disable-next-line no-unused-vars
  function filterHeaders(req, headers) {
    const result = {};
    // filter out headers that are listed in the regex above
    Object.keys(headers).forEach(function (name) {
      if (!dontProxyHeaderRegex.test(name)) {
        result[name] = headers[name];
      }
    });
    return result;
  }

  const upstreamProxy = argv["upstream-proxy"];
  const bypassUpstreamProxyHosts = {};
  if (argv["bypass-upstream-proxy-hosts"]) {
    argv["bypass-upstream-proxy-hosts"].split(",").forEach(function (host) {
      bypassUpstreamProxyHosts[host.toLowerCase()] = true;
    });
  }

  //eslint-disable-next-line no-unused-vars
  app.get("/proxy/*", function (req, res, next) {
    // look for request like http://localhost:8080/proxy/http://example.com/file?query=1
    let remoteUrl = getRemoteUrlFromParam(req);
    if (!remoteUrl) {
      // look for request like http://localhost:8080/proxy/?http%3A%2F%2Fexample.com%2Ffile%3Fquery%3D1
      remoteUrl = Object.keys(req.query)[0];
      if (remoteUrl) {
        const baseURL = `${req.protocol}://${req.headers.host}/`;
        remoteUrl = new URL(remoteUrl, baseURL);
      }
    }

    if (!remoteUrl) {
      return res.status(400).send("No url specified.");
    }

    if (!remoteUrl.protocol) {
      remoteUrl.protocol = "http:";
    }

    let proxy;
    if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
      proxy = upstreamProxy;
    }

    // encoding : null means "body" passed to the callback will be raw bytes

    request.get(
      {
        url: remoteUrl.toString(),
        headers: filterHeaders(req, req.headers),
        encoding: null,
        proxy: proxy,
      },
      //eslint-disable-next-line no-unused-vars
      function (error, response, body) {
        let code = 500;

        if (response) {
          code = response.statusCode;
          res.header(filterHeaders(req, response.headers));
        }

        res.status(code).send(body);
      }
    );
  });

  const server = app.listen(
    argv.port,
    argv.public ? undefined : "localhost",
    function () {
      if (argv.public) {
        console.log(
          "Cesium development server running publicly.  Connect to http://localhost:%d/",
          server.address().port
        );
      } else {
        console.log(
          "Cesium development server running locally.  Connect to http://localhost:%d/",
          server.address().port
        );
      }
    }
  );

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      console.log(
        "Error: Port %d is already in use, select a different port.",
        argv.port
      );
      console.log("Example: node server.cjs --port %d", argv.port + 1);
    } else if (e.code === "EACCES") {
      console.log(
        "Error: This process does not have permission to listen on port %d.",
        argv.port
      );
      if (argv.port < 1024) {
        console.log("Try a port number higher than 1024.");
      }
    }
    console.log(e);
    process.exit(1);
  });

  server.on("close", function () {
    console.log("Cesium development server stopped.");
  });

  let isFirstSig = true;
  process.on("SIGINT", function () {
    if (isFirstSig) {
      console.log("Cesium development server shutting down.");
      server.close(function () {
        process.exit(0);
      });
      esmResult.rebuild.dispose();
      iifeResult.rebuild.dispose();
      specResult.rebuild.dispose();
      isFirstSig = false;
    } else {
      console.log("Cesium development server force kill.");
      process.exit(1);
    }
  });
})();
