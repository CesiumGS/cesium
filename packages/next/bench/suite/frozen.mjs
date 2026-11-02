// What the suite runs: a frozen production build, not the live tree.
//
// The working tree is committed as it stands (untracked files included,
// ignored ones not) into a commit object through a temporary index, so the
// branch, its index and the files are untouched; that commit is checked
// out into one reused worktree (<repo>/.bench/tree) and built with Vite for
// production (the suite and FLIP pages only), once per commit. Edits made
// while a run is going don't reach it, and pages load as shipped code (the
// dev server's per-module loading and HMR client added 5.6 MB of JS heap
// and 19 MB of buffers to NYC, r39). Snapshots at git refs build the same
// way. Like snapshot.mjs, nothing here deletes anything.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";

const git = (args, cwd, env) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: env ? { ...process.env, ...env } : process.env,
    // Line-ending notes and checkout progress: not for the run's log.
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

/**
 * The working tree as a commit (parent HEAD), and whether it differs from
 * HEAD. Untracked files count; ignored files (results, .env.local) don't.
 */
export function freezeTree(cwd) {
  const repo = git(["rev-parse", "--show-toplevel"], cwd);
  const head = git(["rev-parse", "HEAD"], repo);
  const index = join(mkdtempSync(join(tmpdir(), "bench-index-")), "index");
  const env = { GIT_INDEX_FILE: index };
  git(["read-tree", "HEAD"], repo, env);
  git(["add", "-A"], repo, env);
  const tree = git(["write-tree"], repo, env);
  if (tree === git(["rev-parse", "HEAD^{tree}"], repo)) {
    return { repo, sha: head, dirty: false };
  }
  // The same tree on the same HEAD freezes to the same commit (a fixed
  // author and date), so its build and stored runs are found again.
  const date = git(["log", "-1", "--format=%cI", "HEAD"], repo);
  const sha = git(
    ["commit-tree", tree, "-p", head, "-m", "bench: working tree"],
    repo,
    {
      GIT_AUTHOR_NAME: "bench",
      GIT_AUTHOR_EMAIL: "bench@localhost",
      GIT_COMMITTER_NAME: "bench",
      GIT_COMMITTER_EMAIL: "bench@localhost",
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    },
  );
  return { repo, sha, dirty: true };
}

/**
 * `sha` checked out in the reused worktree <repo>/.bench/tree (created on
 * first use); returns its packages/next.
 */
export function checkoutFrozen(repo, sha) {
  const dir = join(repo, ".bench", "tree");
  if (!existsSync(dir)) {
    git(["worktree", "add", "--detach", dir, sha], repo);
  } else {
    git(["checkout", "--detach", "--force", sha], dir);
    // Files the previous commit had and this one doesn't stay behind as
    // untracked files; harmless to a build of the pages' imports.
  }
  const env = join("packages", "next", ".env.local");
  if (existsSync(join(repo, env))) {
    copyFileSync(join(repo, env), join(dir, env));
  }
  return join(dir, "packages", "next");
}

/** The bench pages a build includes. */
const PAGES = {
  suite: "bench/suite/suite.html",
  flip: "bench/suite/flip.html",
};

/**
 * Vite's config for `root` with the build cut to the bench pages, built
 * into <root>/dist-bench unless that build is already of `sha`.
 */
async function buildBench(vite, root, sha, log) {
  const loaded = await vite.loadConfigFromFile(
    { command: "build", mode: "production" },
    join(root, "vite.config.ts"),
    root,
    "error",
  );
  const outDir = join(root, "dist-bench");
  const config = {
    ...loaded.config,
    configFile: false,
    root,
    logLevel: "error",
    build: {
      ...loaded.config.build,
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        ...loaded.config.build?.rollupOptions,
        input: Object.fromEntries(
          Object.entries(PAGES)
            .filter(([, page]) => existsSync(join(root, page)))
            .map(([name, page]) => [name, join(root, page)]),
        ),
      },
    },
  };
  const stamp = join(outDir, ".sha");
  if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== sha) {
    log?.(`building ${sha.slice(0, 12)} for production…`);
    const started = Date.now();
    await vite.build(config);
    writeFileSync(stamp, sha);
    log?.(`built in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
  return config;
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
  ".gltf": "model/gltf+json",
  ".glb": "model/gltf-binary",
};

/**
 * The directories the pages load from outside the build (1.x builds,
 * sample data), on the preview server; the repo's own config serves them
 * only in development, and older snapshots' configs not at all.
 */
function staticDirectories(directories) {
  return {
    name: "bench-static-directories",
    configurePreviewServer(server) {
      for (const [prefix, dir] of Object.entries(directories)) {
        const base = normalize(dir);
        server.middlewares.use(prefix, (req, res, next) => {
          const path = normalize(
            join(base, decodeURIComponent((req.url ?? "/").split("?")[0])),
          );
          if (
            !path.startsWith(base) ||
            !existsSync(path) ||
            statSync(path).isDirectory()
          ) {
            next();
            return;
          }
          res.setHeader(
            "Content-Type",
            contentTypes[extname(path)] ?? "application/octet-stream",
          );
          createReadStream(path).pipe(res);
        });
      }
    },
  };
}

/**
 * An empty 1.x build (a directory to serve as /cesium1x/), for 2.0 pages
 * from before r39, which load the repository's 1.x build on every run.
 */
export function emptyCesium() {
  const dir = mkdtempSync(join(tmpdir(), "bench-no-1x-"));
  mkdirSync(join(dir, "Widgets"));
  writeFileSync(join(dir, "Cesium.js"), "");
  writeFileSync(join(dir, "Widgets", "widgets.css"), "");
  return dir;
}

/**
 * Builds `root` (a frozen tree or a snapshot of commit `sha`) for
 * production and serves it; returns the server. `directories` maps URL
 * prefixes to local directories served beside the build.
 */
export async function serveBuild(root, sha, { directories, port, log }) {
  const vite = await import("vite");
  const config = await buildBench(vite, root, sha, log);
  return vite.preview({
    ...config,
    plugins: [...(config.plugins ?? []), staticDirectories(directories)],
    preview: { host: "127.0.0.1", port, strictPort: false },
  });
}
