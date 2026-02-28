import { join } from "path";
import { finished } from "stream/promises";

import gulp from "gulp";
import gulpReplace from "gulp-replace";
import yargs from "yargs";
import { buildSandcastleApp } from "./scripts/buildSandcastle.js";
import { mkdirp } from "mkdirp";
import { bundleWorkers, defaultESBuildOptions } from "./scripts/build.js";
import { build as esbuild } from "esbuild";

const isProduction = process.env.PROD === "true";

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

async function buildLegacySandcastle() {
  const streams = [];
  let appStream = gulp.src(
    [
      "Apps/Sandcastle/**",
      "!Apps/Sandcastle/load-cesium-es6.js",
      "!Apps/Sandcastle/images/**",
      "!Apps/Sandcastle/gallery/**.jpg",
    ],
    {
      encoding: false,
    },
  );

  if (isProduction) {
    // Remove swap out ESM modules for the IIFE build
    appStream = appStream
      .pipe(
        gulpReplace(
          '    <script type="module" src="../load-cesium-es6.js"></script>',
          '    <script src="../CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "../CesiumUnminified/";</script>',
        ),
      )
      .pipe(
        gulpReplace(
          '    <script type="module" src="load-cesium-es6.js"></script>',
          '    <script src="CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "CesiumUnminified/";</script>',
        ),
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
        gulpReplace("../../Build/Documentation", "/learn/cesiumjs/ref-doc/"),
      )
      .pipe(gulp.dest("Build/Sandcastle"));
  } else {
    // Remove swap out ESM modules for the IIFE build
    appStream = appStream
      .pipe(
        gulpReplace(
          '    <script type="module" src="../load-cesium-es6.js"></script>',
          '    <script src="../../../Build/CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "../../../Build/CesiumUnminified/";</script>',
        ),
      )
      .pipe(
        gulpReplace(
          '    <script type="module" src="load-cesium-es6.js"></script>',
          '    <script src="../../CesiumUnminified/Cesium.js"></script>\n' +
            '    <script>window.CESIUM_BASE_URL = "../../CesiumUnminified/";</script>',
        ),
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
      encoding: false,
    },
  );
  if (isProduction) {
    imageStream = imageStream.pipe(gulp.dest("Build/Sandcastle"));
  } else {
    imageStream = imageStream.pipe(gulp.dest("Build/Apps/Sandcastle"));
  }
  streams.push(imageStream);

  if (isProduction) {
    const fileStream = gulp
      .src(["ThirdParty/**"], { encoding: false })
      .pipe(gulp.dest("Build/Sandcastle/ThirdParty"));
    streams.push(fileStream);

    const dataStream = gulp
      .src(["Apps/SampleData/**"], { encoding: false })
      .pipe(gulp.dest("Build/Sandcastle/SampleData"));
    streams.push(dataStream);
  }

  let standaloneStream = gulp
    .src(["Apps/Sandcastle/standalone.html"])
    .pipe(gulpReplace("../../../", "."))
    .pipe(
      gulpReplace(
        '    <script type="module" src="load-cesium-es6.js"></script>',
        '    <script src="../CesiumUnminified/Cesium.js"></script>\n' +
          '    <script>window.CESIUM_BASE_URL = "../CesiumUnminified/";</script>',
      ),
    )
    .pipe(gulpReplace("../../Build", "."));
  if (isProduction) {
    standaloneStream = standaloneStream.pipe(gulp.dest("Build/Sandcastle"));
  } else {
    standaloneStream = standaloneStream.pipe(
      gulp.dest("Build/Apps/Sandcastle"),
    );
  }
  streams.push(standaloneStream);

  return Promise.all(streams.map((s) => finished(s)));
}

export async function buildCesiumViewer() {
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
    minify: true,
    removePragmas: true,
    path: cesiumViewerOutputDirectory,
  });

  const stream = gulp
    .src(
      [
        "Apps/CesiumViewer/**",
        "!Apps/CesiumViewer/Images",
        "!Apps/CesiumViewer/**/*.js",
        "!Apps/CesiumViewer/**/*.css",
      ],
      {
        encoding: false,
      },
    )
    .pipe(
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
          encoding: false,
        },
      ),
    )
    .pipe(gulp.src(["web.config"]))
    .pipe(gulp.dest(cesiumViewerOutputDirectory));

  await finished(stream);
  return stream;
}

export async function buildSandcastle() {
  const argv = await yargs(process.argv.slice(5))
    .options({
      "outer-origin": {
        type: "string",
        description:
          "The outer origin for the Sandcastle App. Defaults to localhost:8080 if not specified",
      },
      "inner-origin": {
        type: "string",
        description:
          "The inner origin for the Sandcastle viewer iframe. Defaults to the outer-origin if not specified or localhost:8081 if neither are specified",
      },
    })
    .help(false)
    .version(false)
    .strict()
    .parse();

  let outerOrigin = argv.outerOrigin ?? "http://localhost:8080";
  let innerOrigin =
    argv.innerOrigin ?? argv.outerOrigin ?? "http://localhost:8081";

  if (process.env.SANDCASTLE_ORIGIN) {
    outerOrigin = process.env.SANDCASTLE_ORIGIN;
    innerOrigin = outerOrigin;
  }

  return buildSandcastleApp({
    outputToBuildDir: isProduction,
    includeDevelopment: !isProduction,
    outerOrigin,
    innerOrigin,
  });
}

export const buildApps = gulp.parallel(
  buildCesiumViewer,
  buildLegacySandcastle,
  buildSandcastle,
);
