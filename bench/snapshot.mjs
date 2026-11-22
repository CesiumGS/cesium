// Benchmarks against a commit instead of the working tree, so development
// can continue while they run (a minimal CI).
//
//   BENCH_COMMIT=HEAD node bench/run.mjs lod
//
// The commit is checked out once into a git worktree at <repo>/.bench/<sha>
// (gitignored). It contains no links of any kind: Node's resolution walks up
// from there to the repo's own node_modules (where the pinned 1.x,
// cesium-1x, is), and the local secrets file is copied as a plain file.
// Commits from before CS-611 read their 1.x build from CESIUM_BUILD_DIR,
// which the Lab sets to the pinned one (suite/commands/lab.mjs). This module never deletes anything; remove old
// worktrees by hand with `git worktree remove .bench/<sha>` (no --force).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

/**
 * The 2.0 harness to serve for `commit` (created on first use), the repo
 * root, and the resolved SHA.
 */
export function snapshot(commit, cwd) {
  const repo = git(["rev-parse", "--show-toplevel"], cwd);
  const sha = git(["rev-parse", "--verify", `${commit}^{commit}`], repo);
  const dir = join(repo, ".bench", sha.slice(0, 12));
  if (!existsSync(dir)) {
    git(["worktree", "add", "--detach", dir, sha], repo);
  }
  const root = harnessRoot(dir);
  const env = join(repo, ".env.local");
  if (existsSync(env) && !existsSync(join(root, ".env.local"))) {
    copyFileSync(env, join(root, ".env.local"));
  }
  return { root, repo, sha };
}
