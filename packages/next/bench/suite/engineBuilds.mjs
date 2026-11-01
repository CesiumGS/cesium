// Resolving engine specs (engines.mjs) into runnable configurations: the
// catalog setup's settings, the build each needs and where the suite page
// loads it from.
//
//   release  CesiumJS from npm, fetched once into the store (release.mjs);
//            the page loads /cesium-release/<version>/.
//   tree     the working tree: 2.0 from this dev server, 1.x from its
//            build (/cesium1x/, `npm run build` at the repository root).
//            Named by the current branch.
//   ref      a git ref, checked out once into a snapshot worktree
//            (snapshot.mjs, <repo>/.bench/<sha>). 1.x is built there on
//            first use (`npm run build`, minutes) and loaded from
//            /cesium-ref/<sha>/; 2.0 is served by a dev server of its own
//            rooted in the worktree.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { engineId, parseEngine, setupOf } from "./engines.mjs";
import { ensureRelease, resolveVersion } from "./release.mjs";
import { snapshot } from "../snapshot.mjs";

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/** The working tree's name: its branch, or a short commit when detached. */
export function treeRef(cwd) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  return branch === "HEAD"
    ? git(["rev-parse", "--short=12", "HEAD"], cwd)
    : branch;
}

/** Sets a dotted path ("render.pixelRatio") on a configuration. */
function setPath(target, path, value) {
  const keys = path.split(".");
  let at = target;
  for (const key of keys.slice(0, -1)) {
    at = at[key] ??= {};
  }
  at[keys.at(-1)] = Number.isFinite(Number(value)) ? Number(value) : value;
}

/**
 * Resolves one spec into a configuration: the setup's settings with any
 * key=value variants applied, the canonical id (releases exact, the
 * working tree named by its branch), the source and how the page loads
 * the engine (`page`: { cesium?, server? }). `serve(root)` returns the
 * origin of a dev server for a snapshot's packages/next (2.0 at a ref).
 */
export async function resolveEngine(spec, catalog, { cwd, serve, log }) {
  const parsed = parseEngine(spec);
  const setupId = setupOf(spec);
  const setup = catalog.setups.find((s) => s.id === setupId);
  if (!setup) {
    throw new Error(
      `engine "${spec}": no setup "${setupId}" in the catalog (setups: ${catalog.setups.map((s) => s.id).join(", ")})`,
    );
  }
  const config = structuredClone(setup);
  delete config.$comment;
  for (const v of parsed.variants.filter((x) => x.includes("="))) {
    const [key, value] = v.split("=");
    setPath(config, key === "sse" ? "maximumScreenSpaceError" : key, value);
  }
  const page = {};
  let source;
  if (parsed.source.kind === "release") {
    const version = resolveVersion(parsed.source.version);
    const release = ensureRelease(version);
    source = { kind: "release", version, integrity: release.integrity };
    page.cesium = version;
  } else if (parsed.source.kind === "tree") {
    source = { kind: "tree", ref: treeRef(cwd) };
  } else {
    const snap = snapshot(parsed.source.ref, cwd);
    const short = snap.sha.slice(0, 12);
    source = { kind: "ref", ref: parsed.source.ref, sha: snap.sha };
    const tree = join(snap.repo, ".bench", short);
    if (parsed.engine === "1.x") {
      const build = join(tree, "Build", "CesiumUnminified", "Cesium.js");
      if (!existsSync(build)) {
        log?.(`building CesiumJS at ${parsed.source.ref} (${short}), once…`);
        execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
          cwd: tree,
          stdio: "inherit",
          shell: process.platform === "win32",
        });
      }
      page.cesium = `ref:${short}`;
    } else {
      if (!existsSync(join(snap.root, "bench", "suite", "suite.html"))) {
        throw new Error(
          `engine "${spec}": ${parsed.source.ref} has no 2.0 benchmark suite (packages/next/bench/suite)`,
        );
      }
      page.server = await serve(snap.root, snap.repo);
    }
  }
  const id = engineId({
    engine: parsed.engine,
    source:
      source.kind === "tree"
        ? { kind: "ref", ref: source.ref }
        : source.kind === "ref"
          ? { kind: "ref", ref: source.ref }
          : source,
    variants: parsed.variants,
  });
  return { ...config, id, setup: setupId, engine: parsed.engine, source, page };
}

/** A one-line description of a configuration's build, for results. */
export function describeBuild(config) {
  const s = config.source;
  if (s.kind === "release") {
    return `CesiumJS ${s.version} (npm release, ${s.integrity})`;
  }
  const where =
    s.kind === "tree" ? `working tree of ${s.ref}` : `${s.ref} at ${s.sha.slice(0, 12)}`;
  return config.engine === "1.x"
    ? `CesiumJS 1.x built from the ${where}`
    : `2.0 from the ${where}, ${config.policy ?? "budgeted"} selection`;
}
