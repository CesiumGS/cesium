// The pinned CesiumJS 1.x (CS-611; docs/design/repository-build-and-release.md,
// "Parity and Dyno without 1.x's source"): `cesium-1x`, an npm alias of a
// published `cesium` release at an exact version, a dev dependency of the
// workspace root. The parity harness's 1.x build (/cesium1x/), the math and
// scene oracles (`cesium-oracle`, `cesium-engine-oracle`) and Dyno's default 1.x
// engine all come from it; nothing reads 1.x from this repository's tree.
//
// Resolution walks up from this file, so a snapshot worktree under
// <repo>/.bench/<sha> finds the repository's own node_modules. The oracles
// are resolved from cesium-1x's own folder, so its dependencies (the
// @cesium/core 0.1.x and @cesium/engine 26.x it was published with) are found
// wherever npm placed them, nested or hoisted.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** The installed version of a package folder's `package.json`. */
const versionOf = (manifest) =>
  JSON.parse(readFileSync(manifest, "utf8")).version;

/**
 * The pinned 1.x: its version, its folder, its unminified build and the
 * `Source/` folders of the packages it was published with.
 */
export function pinned1x() {
  let manifest;
  try {
    manifest = require.resolve("cesium-1x/package.json");
  } catch {
    throw new Error(
      "cesium-1x isn't installed: run `npm ci` at the repository root (the pinned CesiumJS 1.x is a dev dependency there)",
    );
  }
  const dir = dirname(manifest);
  const from = createRequire(manifest);
  const sourceOf = (name) => {
    const own = from.resolve(`${name}/package.json`);
    return { dir: join(dirname(own), "Source"), version: versionOf(own) };
  };
  return {
    version: versionOf(manifest),
    dir,
    build: join(dir, "Build", "CesiumUnminified"),
    core: sourceOf("@cesium/core"),
    engine: sourceOf("@cesium/engine"),
    widgets: sourceOf("@cesium/widgets"),
  };
}
