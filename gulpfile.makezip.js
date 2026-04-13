import { dirname, join } from "path";
import gulp from "gulp";
import gulpTap from "gulp-tap";
import gulpZip from "gulp-zip";
import gulpRename from "gulp-rename";
import { glslToJavaScript } from "./scripts/build.js";
import { release } from "./gulpfile.js";
import { readFile, writeFile } from "fs/promises";
import { rimraf } from "rimraf";
import { finished } from "stream/promises";
import { createRequire } from "module";
import { buildSandcastleApp } from "./scripts/buildSandcastle.js";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");
let version = packageJson.version;
if (/\.0$/.test(version)) {
  version = version.substring(0, version.length - 2);
}

/**
 * Removes scripts from package.json files to ensure that
 * they still work when run from within the ZIP file.
 *
 * @param {string} packageJsonPath The path to the package.json.
 * @returns {Promise<NodeJS.ReadWriteStream>} A stream that writes to the updated package.json file.
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
  delete scripts["build-sandcastle"];
  delete scripts.clean;
  delete scripts.cloc;
  delete scripts["build-docs"];
  delete scripts["build-docs-watch"];
  delete scripts["make-zip"];
  delete scripts.release;
  delete scripts.prettier;

  // Remove deploy tasks
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
    "package.noprepare.json",
  );
  await writeFile(noPreparePackageJson, JSON.stringify(contentsJson, null, 2));

  return gulp.src(noPreparePackageJson, {
    base: ".",
  });
}

export const makeZip = gulp.series(
  release,
  async function buildSandcastleStep() {
    return buildSandcastleApp({
      outputToBuildDir: false,
      includeDevelopment: false,
      outerOrigin: "http://localhost:8080",
      innerOrigin: "http://localhost:8081",
    });
  },
  async function createZipFile() {
    //For now we regenerate the JS glsl to force it to be unminified in the release zip
    //See https://github.com/CesiumGS/cesium/pull/3106#discussion_r42793558 for discussion.
    await glslToJavaScript(false, "Build/minifyShaders.state", "engine");

    const packageJsonSrc = await pruneScriptsForZip("package.json");
    const enginePackageJsonSrc = await pruneScriptsForZip(
      "packages/engine/package.json",
    );
    const widgetsPackageJsonSrc = await pruneScriptsForZip(
      "packages/widgets/package.json",
    );

    const src = gulp
      .src("index.release.html")
      .pipe(
        gulpRename((file) => {
          if (file.basename === "index.release") {
            file.basename = "index";
          }
        }),
      )
      .pipe(enginePackageJsonSrc)
      .pipe(widgetsPackageJsonSrc)
      .pipe(packageJsonSrc)
      .pipe(
        gulpRename((file) => {
          if (file.basename === "package.noprepare") {
            file.basename = "package";
          }
        }),
      )
      .pipe(
        gulp.src(
          [
            "Build/Cesium/**",
            "Build/CesiumUnminified/**",
            "Build/Documentation/**",
            "Build/Specs/**",
            "Build/package.json",
            "packages/engine/Build/**",
            "packages/widgets/Build/**",
            "!Build/Specs/e2e/**",
            "!Build/InlineWorkers.js",
            "!packages/engine/Build/Specs/**",
            "!packages/widgets/Build/Specs/**",
            "!packages/engine/Build/minifyShaders.state",
          ],
          {
            encoding: false,
            base: ".",
          },
        ),
      )
      .pipe(
        gulp.src(
          [
            "Apps/**",
            "packages/engine/index.js",
            "packages/engine/index.d.ts",
            "packages/engine/LICENSE.md",
            "packages/engine/README.md",
            "packages/engine/Source/**",
            "packages/widgets/index.js",
            "packages/widgets/index.d.ts",
            "packages/widgets/LICENSE.md",
            "packages/widgets/README.md",
            "packages/widgets/Source/**",
            "Source/**",
            "Specs/**",
            "ThirdParty/**",
            "scripts/**",
            "favicon.ico",
            ".prettierignore",
            "eslint.config.js",
            "gulpfile.js",
            "server.js",
            "index.cjs",
            "LICENSE.md",
            "CHANGES.md",
            "README.md",
            "web.config",
            "!Apps/Sandcastle/**",
            "!scripts/buildSandcastle.js",
            "!**/*.gitignore",
            "!Specs/e2e/*-snapshots/**",
            "!Apps/Sandcastle/gallery/development/**",
          ],
          {
            encoding: false,
            base: ".",
          },
        ),
      )
      .pipe(
        gulpTap(function (file) {
          // Work around an issue with gulp-zip where archives generated on Windows do
          // not properly have their directory executable mode set.
          // see https://github.com/sindresorhus/gulp-zip/issues/64#issuecomment-205324031
          if (file.isDirectory()) {
            file.stat.mode = parseInt("40777", 8);
          }
        }),
      )
      .pipe(gulpZip(`Cesium-${version}.zip`))
      .pipe(gulp.dest("."));

    await finished(src);

    rimraf.sync("./package.noprepare.json");
    rimraf.sync("./packages/engine/package.noprepare.json");
    rimraf.sync("./packages/widgets/package.noprepare.json");

    return src;
  },
);
