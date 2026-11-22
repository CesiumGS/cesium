// Resolving engine specs (engines.mjs) into runnable configurations: the
// catalog setup's settings, the build each needs and where the suite page
// loads it from.
//
//   release  CesiumJS 1.x from npm, fetched once into the store (release.mjs);
//            the page loads /cesium-release/<version>/. 1.x is always a
//            release: its source left this repository (CS-611).
//   tree     2.0 from the working tree: the suite's own server (the tree
//            frozen and built, frozen.mjs, or live with --dev). Named by the
//            current branch.
//   ref      2.0 at a git ref, checked out once into a snapshot worktree
//            (snapshot.mjs, <repo>/.bench/<sha>), built there and served by
//            a server of its own.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { engineId, parseEngine, setupOf } from "./engines.mjs";
import { checkVariants, configPath } from "./settings.mjs";
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

/**
 * Sets a dotted path ("render.pixelRatio", "view.lodExponent") on a
 * configuration, to a value the settings registry has typed.
 */
function setPath(target, path, value) {
  const keys = path.split(".");
  let at = target;
  for (const key of keys.slice(0, -1)) {
    at = at[key] ??= {};
  }
  at[keys.at(-1)] = value;
}

/**
 * Resolves one spec into a configuration: the setup's settings with any
 * key=value variants applied (each checked against the settings registry,
 * settings.mjs, for the run's `kind`: an unknown one stops here, with the
 * list), the canonical id (releases exact, the working tree named by its
 * branch), the source and how the page loads the engine (`page`:
 * { cesium?, server? }). `serve(root)` returns the
 * origin of a dev server for a snapshot's packages/next (2.0 at a ref).
 */
export async function resolveEngine(
  spec,
  catalog,
  { cwd, serve, frozen, kind = "bench" },
) {
  const parsed = parseEngine(spec);
  const variants = checkVariants(parsed, kind);
  const setupId = setupOf(spec);
  const setup = catalog.setups.find((s) => s.id === setupId);
  if (!setup) {
    throw new Error(
      `engine "${spec}": no setup "${setupId}" in the catalog (setups: ${catalog.setups.map((s) => s.id).join(", ")})`,
    );
  }
  const config = structuredClone(setup);
  delete config.$comment;
  for (const { setting, value } of variants) {
    setPath(config, configPath(setting), value);
  }
  const page = {};
  let source;
  if (parsed.source.kind === "release") {
    const version = resolveVersion(parsed.source.version);
    const release = ensureRelease(version);
    source = { kind: "release", version, integrity: release.integrity };
    page.cesium = version;
  } else if (parsed.source.kind === "tree") {
    source = {
      kind: "tree",
      ref: treeRef(cwd),
      ...(frozen ? { sha: frozen.sha } : {}),
    };
  } else {
    const snap = snapshot(parsed.source.ref, cwd);
    source = { kind: "ref", ref: parsed.source.ref, sha: snap.sha };
    if (!existsSync(join(snap.root, "bench", "suite", "suite.html"))) {
      throw new Error(
        `engine "${spec}": ${parsed.source.ref} has no 2.0 benchmark suite (bench/suite)`,
      );
    }
    page.server = await serve(snap.root, snap.repo);
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
    s.kind === "tree"
      ? `working tree of ${s.ref}${s.sha ? ` (frozen at ${s.sha.slice(0, 12)})` : ""}`
      : `${s.ref} at ${s.sha.slice(0, 12)}`;
  return `2.0 from the ${where}, ${config.policy ?? "budgeted"} selection`;
}
