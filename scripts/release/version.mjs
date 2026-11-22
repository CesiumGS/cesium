// `npm run release:version` (CS-613) writes a release record: the change
// that the release workflow publishes once it merges.
//
// 1. `changeset version`: consumes the pending changesets, sets the stable
//    group's one version in every stable package (and in the root's
//    reference to the umbrella), and writes each package's CHANGELOG.md
//    section.
// 2. scripts/release/lines.mjs --apply: the experimental line's paired
//    version, then the check of both lines.
// 3. `npm install --package-lock-only --ignore-scripts`: the lockfile's
//    workspace versions follow, so `npm ci` still agrees with it.
//
// It changes files only; review them, run `npm run release:notes`, and
// commit the result as its own change. Nothing here publishes.
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const run = (command, args) =>
  execFileSync(command, args, { cwd: repo, stdio: "inherit" });

try {
  run(join(repo, "node_modules", ".bin", "changeset"), ["version"]);
  run(process.execPath, [join(repo, "scripts", "release", "lines.mjs"), "--apply"]);
  run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"]);
} catch (error) {
  console.error(`release:version: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
