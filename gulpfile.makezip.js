// @ts-check

import { dirname, join } from "path";
import gulp from "gulp";
import { ZipFile } from "yazl";
import { glslToJavaScript } from "./scripts/build-utilities.js";
import { release } from "./gulpfile.js";
import { createWriteStream, rmSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { Transform, Writable } from "stream";
import { finished } from "stream/promises";
import { createRequire } from "module";
import { buildSandcastleApp } from "./scripts/buildSandcastle.js";

/** @import Vinyl from "vinyl"; */

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
  const contents = await readFile(packageJsonPath, "utf8");
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

/**
 * Creates a stream that calls a function on each file passing through it.
 *
 * @param {(file: Vinyl) => void} callback The function to call on each file. It may modify the file.
 * @returns {Transform} A stream that passes each file through after calling the callback.
 */
function gulpTap(callback) {
  return new Transform({
    objectMode: true,
    //eslint-disable-next-line no-unused-vars
    transform(file, encoding, done) {
      callback(file);
      done(null, file);
    },
  });
}

/**
 * Creates a stream that writes the files piped into it to a ZIP file, using each file's
 * relative path as its path in the ZIP file. The stream finishes once the ZIP file has been written.
 *
 * @param {string} zipPath The path of the ZIP file to write.
 * @returns {Writable} The stream to pipe files into.
 */
function gulpZip(zipPath) {
  const zipFile = new ZipFile();
  const output = zipFile.outputStream.pipe(createWriteStream(zipPath));

  return new Writable({
    objectMode: true,
    //eslint-disable-next-line no-unused-vars
    write(file, encoding, done) {
      // Paths in ZIP files always use forward slashes.
      const pathInZip = file.relative.replaceAll("\\", "/");

      if (file.isDirectory()) {
        // Directory modes are omitted because they make ZIP files created on Windows unreadable on macOS.
        zipFile.addEmptyDirectory(pathInZip, { mtime: file.stat?.mtime });
      } else if (file.isBuffer()) {
        zipFile.addBuffer(file.contents, pathInZip, {
          mtime: file.stat?.mtime,
          mode: file.stat?.mode,
        });
      }
      done();
    },
    final(done) {
      zipFile.end();
      finished(output).then(() => done(), done);
    },
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
    const corePackageJsonSrc = await pruneScriptsForZip(
      "packages/core/package.json",
    );
    const gltfPackageJsonSrc = await pruneScriptsForZip(
      "packages/gltf/package.json",
    );
    const enginePackageJsonSrc = await pruneScriptsForZip(
      "packages/engine/package.json",
    );
    const widgetsPackageJsonSrc = await pruneScriptsForZip(
      "packages/widgets/package.json",
    );

    const src = gulp
      .src("index.release.html")
      .pipe(
        gulpTap((file) => {
          if (file.stem === "index.release") {
            file.stem = "index";
          }
        }),
      )
      .pipe(corePackageJsonSrc)
      .pipe(gltfPackageJsonSrc)
      .pipe(enginePackageJsonSrc)
      .pipe(widgetsPackageJsonSrc)
      .pipe(packageJsonSrc)
      .pipe(
        gulpTap((file) => {
          if (file.stem === "package.noprepare") {
            file.stem = "package";
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
            "packages/core/Build/**",
            "packages/gltf/Build/**",
            "packages/engine/Build/**",
            "packages/widgets/Build/**",
            "!Build/Specs/e2e/**",
            "!Build/InlineWorkers.js",
            "!packages/core/Build/Specs/**",
            "!packages/gltf/Build/Specs/**",
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
            "packages/core/index.js",
            "packages/core/index.d.ts",
            "packages/core/LICENSE.md",
            "packages/core/README.md",
            "packages/core/scripts/**",
            "packages/core/Source/**",
            "packages/gltf/index.js",
            "packages/gltf/index.d.ts",
            "packages/gltf/LICENSE.md",
            "packages/gltf/README.md",
            "packages/gltf/scripts/**",
            "packages/gltf/Source/**",
            "packages/engine/index.js",
            "packages/engine/index.d.ts",
            "packages/engine/LICENSE.md",
            "packages/engine/README.md",
            "packages/engine/scripts/**",
            "packages/engine/Source/**",
            "packages/widgets/index.js",
            "packages/widgets/index.d.ts",
            "packages/widgets/LICENSE.md",
            "packages/widgets/README.md",
            "packages/widgets/scripts/**",
            "packages/widgets/Source/**",
            "Source/**",
            "Specs/**",
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
            "!scripts/buildSandcastle.js",
            "!**/*.gitignore",
            "!Specs/e2e/*-snapshots/**",
          ],
          {
            encoding: false,
            base: ".",
          },
        ),
      )
      .pipe(gulpZip(`Cesium-${version}.zip`));

    await finished(src);

    rmSync("./package.noprepare.json", { force: true });
    rmSync("./packages/core/package.noprepare.json", { force: true });
    rmSync("./packages/gltf/package.noprepare.json", { force: true });
    rmSync("./packages/engine/package.noprepare.json", { force: true });
    rmSync("./packages/widgets/package.noprepare.json", { force: true });
  },
);
