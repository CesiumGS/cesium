// Benchmarks against a commit instead of the working tree, so development
// can continue while they run (a minimal CI).
//
//   BENCH_COMMIT=HEAD node bench/run.mjs lod
//
// The commit is checked out once into a git worktree at <repo>/.bench/<sha>
// (gitignored). Its workspace packages (`@cesium/core` and the rest) must be
// the commit's own: Node's resolution walks up from the snapshot, and the
// first node_modules it would find is the worktree's, whose workspace links
// point at the worktree's packages/*, so a comparison would run the
// worktree's code on both sides (CS-919). So the snapshot gets a
// node_modules of its own holding only links (junctions on Windows) to its
// own workspace packages; third-party packages still come from the
// worktree's node_modules (where the pinned 1.x, cesium-1x, is) when the
// two lockfiles agree on them. When they don't, the snapshot installs its
// own (`npm ci --ignore-scripts`, inside the snapshot), or the run stops;
// it first removes its own links, so the install can't write through one
// into the worktree. Under pnpm (CS-1091), on either side, the snapshot
// always installs its own: pnpm links each workspace package's siblings
// into that package's own node_modules, so the worktree's would bring the
// worktree's code back, and a warm pnpm install takes seconds. The local secrets file is copied as a plain file.
// Commits from before CS-611 read their 1.x build from CESIUM_BUILD_DIR,
// which the Lab sets to the pinned one (suite/commands/lab.mjs). This
// module deletes nothing but the links it made; remove old worktrees by
// hand with `git worktree remove .bench/<sha>` (no --force).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/**
 * Where 2.0's harness is in a checkout: `packages/next` before CS-835's
 * move (its vite.config.ts is there), the checkout's root after it.
 */
export function harnessRoot(dir) {
  return existsSync(join(dir, "packages", "next", "vite.config.ts"))
    ? join(dir, "packages", "next")
    : dir;
}

const readJson = (path) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;

/**
 * A checkout's workspace packages: name → directory, from its root
 * package.json's `workspaces` (paths, or one trailing `*` per pattern, as
 * this repository writes them). Any other pattern throws, naming it: a
 * package it missed would resolve to the worktree's copy.
 */
export function workspacePackages(dir) {
  const manifest = readJson(join(dir, "package.json"));
  const patterns = Array.isArray(manifest?.workspaces)
    ? manifest.workspaces
    : (manifest?.workspaces?.packages ?? []);
  const found = new Map();
  for (const pattern of patterns) {
    const literal =
      typeof pattern === "string" && pattern.endsWith("/*")
        ? pattern.slice(0, -2)
        : pattern;
    if (
      typeof literal !== "string" ||
      /[*?[\]{}!]|[+@]\(/.test(literal) ||
      literal.startsWith("/") ||
      literal.split(/[\\/]/).includes("..")
    ) {
      throw new Error(
        `${dir}: the workspace pattern ${JSON.stringify(pattern)} isn't one Dyno's snapshots can read (a path, or a path ending in "/*"): its packages would resolve to the worktree's copies`,
      );
    }
    const folders = pattern.endsWith("/*")
      ? (existsSync(join(dir, literal))
          ? readdirSync(join(dir, literal), { withFileTypes: true })
          : []
        )
          .filter((entry) => entry.isDirectory())
          .map((entry) => join(dir, literal, entry.name))
      : [join(dir, pattern)];
    for (const folder of folders) {
      const name = readJson(join(folder, "package.json"))?.name;
      if (name) {
        found.set(name, folder);
      }
    }
  }
  return found;
}

/**
 * The third-party entries of two package-lock.json texts that differ (an
 * entry in one and not the other, or another version, source or
 * integrity), by lockfile key. Workspace packages and npm's links to them
 * at the top level don't count: the snapshot links its own. A link nested
 * under a workspace package (`apps/x/node_modules/y`, `link: true`) counts
 * even when both agree: the worktree's would point into the worktree.
 */
export function thirdPartyDifferences(snapshotLock, worktreeLock) {
  const entries = (text) => {
    const packages = JSON.parse(text).packages ?? {};
    const out = new Map();
    for (const [key, entry] of Object.entries(packages)) {
      if (!key.includes("node_modules/")) {
        continue;
      }
      if (entry.link) {
        if (!key.startsWith("node_modules/")) {
          out.set(key, "a nested link");
        }
        continue;
      }
      out.set(
        key,
        JSON.stringify([entry.version, entry.resolved, entry.integrity]),
      );
    }
    return out;
  };
  const a = entries(snapshotLock);
  const b = entries(worktreeLock);
  const keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys]
    .filter((key) => a.get(key) !== b.get(key) || a.get(key) === "a nested link")
    .sort();
}

const lstat = (path) => {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
};

/** Whether `path` is `root` or lies under it (both already real paths). */
const inside = (path, root) => {
  const rel = relative(root, path);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

/** Links `path` to the directory `target`, replacing a link that points elsewhere. */
function link(target, path) {
  const stat = lstat(path);
  if (stat?.isSymbolicLink()) {
    if (existsSync(path) && realpathSync(path) === realpathSync(target)) {
      return;
    }
    // A link (not what it points at) is all this removes.
    unlinkSync(path);
  } else if (stat) {
    throw new Error(`${path} is not a link: leaving it as it is`);
  }
  mkdirSync(dirname(path), { recursive: true });
  // Absolute, as Windows junctions must be; the type is ignored elsewhere.
  symlinkSync(resolve(target), path, "junction");
}

const STATE = ".bench-deps.json";
const PNPM_LOCK = "pnpm-lock.yaml";

/**
 * Removes the links this module made in `dir`: those its state file
 * records, and any link where it puts one (an older state file recorded
 * none). Only a link inside `dir`, under no other link, is removed, and
 * only the link itself.
 */
function removeOwnLinks(dir, state) {
  const real = realpathSync(dir);
  const places = new Set(
    (Array.isArray(state?.links) ? state.links : []).map((path) =>
      join(dir, String(path)),
    ),
  );
  for (const [name, folder] of workspacePackages(dir)) {
    places.add(join(dir, "node_modules", ...name.split("/")));
    places.add(join(folder, "node_modules"));
  }
  for (const path of places) {
    if (
      lstat(path)?.isSymbolicLink() &&
      inside(resolve(path), resolve(dir)) &&
      existsSync(dirname(path)) &&
      inside(realpathSync(dirname(path)), real)
    ) {
      unlinkSync(path);
    }
  }
}

/**
 * Every `node_modules` under `dir` that is a link to a place outside it:
 * an install would write through it. Doesn't look inside a real
 * `node_modules` (npm's own) or `.git`.
 */
function outsideLinks(dir) {
  const real = realpathSync(dir);
  const found = [];
  const walk = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.name === "node_modules" && entry.isSymbolicLink()) {
        const target = existsSync(path)
          ? realpathSync(path)
          : resolve(folder, readlinkSync(path));
        if (!inside(target, real)) {
          found.push(relative(dir, path));
        }
      } else if (
        entry.isDirectory() &&
        entry.name !== "node_modules" &&
        entry.name !== ".git"
      ) {
        walk(path);
      }
    }
  };
  walk(dir);
  return found.sort();
}

/**
 * Gives the checkout at `dir` (a snapshot or the frozen tree, under
 * <repo>/.bench/) its own workspace packages: links in <dir>/node_modules
 * to its packages/*, so `@cesium/*` resolves inside it. Third-party
 * packages come from the worktree at `repo` when the two lockfiles agree
 * on them (those nested under a workspace package through a link to the
 * worktree's folder); otherwise the snapshot installs its own with `install`
 * (`npm ci --ignore-scripts` by default, run in `dir`), once per lockfile,
 * and a failed install stops the run. Before an install it removes the
 * links it made (recorded in node_modules/.bench-deps.json), and it
 * refuses to install while any node_modules under `dir` is still a link
 * out of it, or to work at all when `dir`'s own node_modules is a link:
 * either would let it write into the worktree. Writes nothing outside
 * `dir`. Returns the mode and the differing lockfile entries.
 */
export function linkSnapshotPackages(
  dir,
  repo,
  {
    install = (command, args, cwd) =>
      execFileSync(command, args, { cwd, stdio: "inherit" }),
  } = {},
) {
  const modules = join(dir, "node_modules");
  if (lstat(modules)?.isSymbolicLink()) {
    throw new Error(
      `${dir}: its node_modules is a link (to ${readlinkSync(modules)}): leaving it as it is, since links and ${STATE} would be written through it. Remove the link and run again.`,
    );
  }
  const stateFile = join(modules, STATE);
  const pnpm = existsSync(join(dir, PNPM_LOCK));
  const worktreePnpm = existsSync(join(repo, PNPM_LOCK));
  const ownLock = join(dir, pnpm ? PNPM_LOCK : "package-lock.json");
  const lockText = existsSync(ownLock) ? readFileSync(ownLock, "utf8") : "";
  const lockHash = createHash("sha256").update(lockText).digest("hex");
  const state = readJson(stateFile);
  const worktreeLock = join(repo, "package-lock.json");
  const differences =
    !pnpm && !worktreePnpm && lockText && existsSync(worktreeLock)
      ? thirdPartyDifferences(lockText, readFileSync(worktreeLock, "utf8"))
      : [];
  // pnpm, on either side: the worktree's tree can't be shared (above).
  const why = pnpm
    ? "it installs with pnpm"
    : worktreePnpm
      ? "the worktree installs with pnpm"
      : "";
  // Installed for this very lockfile: npm's folders are the snapshot's
  // own, whatever the worktree's lockfile says now.
  if (state?.mode === "installed" && state.lock === lockHash) {
    return { mode: "installed", differences };
  }
  if (why || differences.length > 0 || state?.mode === "installed") {
    const shown = differences.slice(0, 5).join(", ");
    const more =
      differences.length > 5 ? ` and ${differences.length - 5} more` : "";
    const cause = why || "its lockfile differs from the worktree's";
    const detail = why ? "" : ` (${shown || "an earlier install"}${more})`;
    // npm clears only the root node_modules: a nested link left in place
    // would have it write into the worktree's folder.
    removeOwnLinks(dir, state);
    const outside = outsideLinks(dir);
    if (outside.length > 0) {
      throw new Error(
        `${dir}: ${cause}, but ${outside.join(", ")} ${outside.length === 1 ? "is a link" : "are links"} out of the snapshot, so an install there would write through ${outside.length === 1 ? "it" : "them"}: not installing. Remove ${outside.length === 1 ? "it" : "them"} and run again.`,
      );
    }
    console.log(
      `${dir}: ${cause}${detail}: installing its own dependencies there`,
    );
    try {
      const windows = process.platform === "win32";
      if (pnpm) {
        install(
          windows ? "pnpm.cmd" : "pnpm",
          ["install", "--frozen-lockfile", "--ignore-scripts", "--prefer-offline"],
          dir,
        );
      } else {
        install(
          windows ? "npm.cmd" : "npm",
          ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
          dir,
        );
      }
    } catch (error) {
      throw new Error(
        `${dir}: ${cause}${detail}, and installing its own dependencies failed: ${error instanceof Error ? error.message : String(error)}. Compare with a separate checkout and its own server (--url) instead.`,
        { cause: error },
      );
    }
    mkdirSync(modules, { recursive: true });
    writeFileSync(
      stateFile,
      `${JSON.stringify({ mode: "installed", lock: lockHash, links: [] })}\n`,
    );
    // npm ci and pnpm install link the workspace packages themselves.
    return { mode: "installed", differences };
  }
  const links = [];
  for (const [name, folder] of workspacePackages(dir)) {
    const at = join(modules, ...name.split("/"));
    link(folder, at);
    links.push(relative(dir, at));
    // Third-party packages npm placed under a workspace package (Sandcastle
    // has its own Vite): the worktree's, which the lockfiles agree on.
    const nested = join(repo, relative(dir, folder), "node_modules");
    if (existsSync(nested)) {
      link(nested, join(folder, "node_modules"));
      links.push(relative(dir, join(folder, "node_modules")));
    }
  }
  writeFileSync(
    stateFile,
    `${JSON.stringify({ mode: "links", lock: lockHash, links })}\n`,
  );
  return { mode: "links", differences };
}

/**
 * The 2.0 harness to serve for `commit` (created on first use), the repo
 * root, and the resolved SHA. Its workspace packages are its own
 * (`linkSnapshotPackages`).
 */
export function snapshot(commit, cwd) {
  const repo = git(["rev-parse", "--show-toplevel"], cwd);
  const sha = git(["rev-parse", "--verify", `${commit}^{commit}`], repo);
  const dir = join(repo, ".bench", sha.slice(0, 12));
  if (!existsSync(dir)) {
    git(["worktree", "add", "--detach", dir, sha], repo);
  }
  linkSnapshotPackages(dir, repo);
  const root = harnessRoot(dir);
  const env = join(repo, ".env.local");
  if (existsSync(env) && !existsSync(join(root, ".env.local"))) {
    copyFileSync(env, join(root, ".env.local"));
  }
  return { root, repo, sha };
}
