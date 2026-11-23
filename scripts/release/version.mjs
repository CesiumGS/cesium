// `npm run release:version` (CS-613) writes a release record: the change
// that the release workflow publishes once it merges.
//
// 0. The plan, before anything in the tree changes: `changeset version`
//    runs in a scratch copy of the manifests and changesets, and the
//    version it gives the stable group must differ from today's and pair
//    with a 0.x number (a minor below 100). Otherwise it stops, with the
//    tree as it was: a changeset that names only an experimental package
//    would leave the stable version where it is, and its entry would be
//    swallowed.
// 1. `changeset version`: consumes the pending changesets, sets the stable
//    group's one version in every stable package (and in the root's exact
//    dev dependency on the umbrella), and writes each package's
//    CHANGELOG.md section.
// 2. The experimental line's paired version (scripts/release/lines.mjs),
//    then the check of both lines, the root's dependency included.
// 3. `pnpm install --lockfile-only --ignore-scripts` (CS-1091; npm's
//    `install --package-lock-only` in a tree that still has
//    package-lock.json): the lockfile's workspace versions follow, so a
//    frozen install still agrees with it.
//
// It changes files only; review them, run `npm run release:notes`, and
// commit the result as its own change. Nothing here publishes.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyPaired, lineProblems, pairedVersion, repositoryPackages } from "./lines.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The stable group's version in a tree (the first stable package's). */
function stableVersion(root) {
  const { packages } = repositoryPackages(root);
  return packages.find((p) => p.line === "stable")?.manifest.version;
}

/** Each workspace folder the root's `workspaces` names (`dir/*` patterns and plain folders). */
function workspaceFolders(root, manifest) {
  const folders = [];
  for (const pattern of manifest.workspaces ?? []) {
    if (pattern.endsWith("/*")) {
      const parent = pattern.slice(0, -2);
      if (!existsSync(join(root, parent))) {
        continue;
      }
      for (const entry of readdirSync(join(root, parent), { withFileTypes: true })) {
        if (entry.isDirectory() && existsSync(join(root, parent, entry.name, "package.json"))) {
          folders.push(join(parent, entry.name));
        }
      }
    } else if (existsSync(join(root, pattern, "package.json"))) {
      folders.push(pattern);
    }
  }
  return folders;
}

/**
 * The version `changeset version` would give the stable group, found by
 * running it in a scratch copy of the root's manifests, lockfile and
 * `.changeset/` (the tree itself is left alone).
 * @returns {{ before: string, after: string }}
 */
export function planRelease(root, changeset) {
  const scratch = mkdtempSync(join(tmpdir(), "cesium-release-plan-"));
  try {
    const rootManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "package-lock.json"]) {
      if (existsSync(join(root, file))) {
        cpSync(join(root, file), join(scratch, file));
      }
    }
    cpSync(join(root, ".changeset"), join(scratch, ".changeset"), { recursive: true });
    for (const folder of workspaceFolders(root, rootManifest)) {
      mkdirSync(join(scratch, folder), { recursive: true });
      cpSync(join(root, folder, "package.json"), join(scratch, folder, "package.json"));
    }
    // Changesets loads its changelog writer from the config, by name.
    symlinkSync(join(root, "node_modules"), join(scratch, "node_modules"), "dir");
    execFileSync(changeset, ["version"], { cwd: scratch, stdio: ["ignore", "pipe", "pipe"] });
    return { before: stableVersion(root), after: stableVersion(scratch) };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Why a planned release is refused, or undefined when it can go ahead. */
export function planProblem({ before, after }) {
  if (after === before) {
    return `the stable packages would stay at ${before}: no pending changeset names a stable package, so an experimental package's entry would be swallowed. Add a changeset that names a stable package`;
  }
  try {
    pairedVersion(after);
  } catch (error) {
    return `the stable packages would go to ${after}, which can't pair with the experimental line: ${error.message}`;
  }
  return undefined;
}

/**
 * Writes a release record in `root`. Throws, with the tree untouched, when
 * the plan is refused.
 * @param {string} root
 * @param {{ lockfile?: boolean, log?: (line: string) => void }} [options]
 */
export function writeReleaseRecord(root, options = {}) {
  const { lockfile = true, log = console.log } = options;
  const changeset = join(root, "node_modules", ".bin", "changeset");
  const plan = planRelease(root, changeset);
  const refused = planProblem(plan);
  if (refused) {
    throw new Error(refused);
  }
  log(`release:version: the stable packages go from ${plan.before} to ${plan.after}`);
  execFileSync(changeset, ["version"], { cwd: root, stdio: "inherit" });
  const { stable, packages, rootManifest } = repositoryPackages(root);
  const changed = applyPaired(packages, { dir: root, manifest: rootManifest });
  log(
    changed.length > 0
      ? `release:version: the experimental line set on ${changed.join(", ")}`
      : "release:version: no experimental packages",
  );
  const problems = lineProblems(packages, stable, rootManifest);
  if (problems.length > 0) {
    throw new Error(`the version lines after versioning:\n  ${problems.join("\n  ")}`);
  }
  if (lockfile && existsSync(join(root, "pnpm-lock.yaml"))) {
    execFileSync("pnpm", ["install", "--lockfile-only", "--ignore-scripts"], {
      cwd: root,
      stdio: "inherit",
    });
  } else if (lockfile) {
    execFileSync(
      "npm",
      ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"],
      { cwd: root, stdio: "inherit" },
    );
  }
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    writeReleaseRecord(repo);
  } catch (error) {
    console.error(`release:version: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
