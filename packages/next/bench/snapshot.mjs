// Benchmarks against a commit instead of the working tree, so development
// can continue while they run (a minimal CI).
//
//   BENCH_COMMIT=HEAD node packages/next/bench/run.mjs lod
//
// The commit is checked out once into a git worktree at <repo>/.bench/<sha>
// (gitignored). It contains no links of any kind: Node's resolution walks up
// from there to the repo's own node_modules, the 1.x build is passed to the
// Vite config through CESIUM_BUILD_DIR, and the local secrets file is
// copied as a plain file. This module never deletes anything; remove old
// worktrees by hand with `git worktree remove .bench/<sha>` (no --force).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/**
 * The `packages/next` directory to serve for `commit` (created on first
 * use), the repo root, and the resolved SHA.
 */
export function snapshot(commit, cwd) {
  const repo = git(["rev-parse", "--show-toplevel"], cwd);
  const sha = git(["rev-parse", "--verify", `${commit}^{commit}`], repo);
  const dir = join(repo, ".bench", sha.slice(0, 12));
  if (!existsSync(dir)) {
    git(["worktree", "add", "--detach", dir, sha], repo);
  }
  const env = join("packages", "next", ".env.local");
  if (existsSync(join(repo, env)) && !existsSync(join(dir, env))) {
    copyFileSync(join(repo, env), join(dir, env));
  }
  return { root: join(dir, "packages", "next"), repo, sha };
}
