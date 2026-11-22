// Dyno's snapshots of other commits (bench/snapshot.mjs, CS-919): a
// `dyno lab --commit <rev>` or a `ref` engine serves that commit's own
// workspace packages, never the worktree's, and nothing it does writes
// outside the snapshot. The fixture is a throwaway git repository shaped
// like this one: a workspace root whose `@cesium/core` package differs
// between a commit and the working tree.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { defaultClientConditions } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  linkSnapshotPackages,
  snapshot,
  thirdPartyDifferences,
  workspacePackages,
} from "../bench/snapshot.mjs";
import { checkoutFrozen } from "../bench/suite/frozen.mjs";
// @ts-expect-error -- a plain .mjs module, no declarations
import { dependents, isOwnSource } from "../scripts/slangBuild.mjs";

let dir: string;
const git = (...args: string[]) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();

const write = (path: string, text: string) => {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
};

/** A lockfile with one third-party package at `version`. */
const lock = (version: string, extra: Record<string, unknown> = {}) =>
  `${JSON.stringify(
    {
      name: "fixture",
      lockfileVersion: 3,
      packages: {
        "": { name: "fixture", workspaces: ["packages/*"] },
        "node_modules/@cesium/core": { resolved: "packages/core", link: true },
        "node_modules/left-pad": {
          version,
          resolved: `https://registry.example.invalid/left-pad-${version}.tgz`,
          integrity: `sha512-${version}`,
        },
        "packages/core": { name: "@cesium/core", version: "0.0.0" },
        ...extra,
      },
    },
    null,
    2,
  )}\n`;

/** The planted difference: what `@cesium/core` exports. */
const core = (planted: string) =>
  `export const planted = ${JSON.stringify(planted)};\n`;

/**
 * Everything under `root`, without following links: each path with its
 * kind and a file's text or a link's target. `git status` can't see an
 * ignored folder such as node_modules; this can.
 */
const listing = (root: string): string[] => {
  if (!existsSync(root)) {
    return [];
  }
  const out: string[] = [];
  const walk = (folder: string, prefix: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const path = join(folder, entry.name);
      const name = `${prefix}${entry.name}`;
      if (entry.isSymbolicLink()) {
        out.push(`${name} -> ${readlinkSync(path)}`);
      } else if (entry.isDirectory()) {
        out.push(`${name}/`);
        walk(path, `${name}/`);
      } else {
        out.push(`${name}: ${readFileSync(path, "utf8")}`);
      }
    }
  };
  walk(root, "");
  return out;
};

/**
 * A worktree-like folder (a lockfile at `version`, a third-party package
 * nested under packages/core) and a snapshot at <it>/.bench/x whose
 * lockfile agrees, both made fresh.
 */
const pair = (version = "1.0.0") => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "bench-pair-")));
  const put = (path: string, text: string) => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  };
  const manifest = `${JSON.stringify({ name: "fixture", workspaces: ["packages/*"] })}\n`;
  put("package.json", manifest);
  put("package-lock.json", lock(version));
  put(
    "packages/core/node_modules/right-pad/package.json",
    `${JSON.stringify({ name: "right-pad", version: "2.0.0" })}\n`,
  );
  put(".bench/x/package.json", manifest);
  put(".bench/x/package-lock.json", lock(version));
  put(
    ".bench/x/packages/core/package.json",
    `${JSON.stringify({ name: "@cesium/core" })}\n`,
  );
  return { repo, at: join(repo, ".bench", "x") };
};

/** A stand-in for `npm ci` in `at`: clears the root node_modules only, then reifies packages/core's own. */
const fakeCi = (at: string, calls: string[]) => () => {
  calls.push(at);
  rmSync(join(at, "node_modules"), { recursive: true, force: true });
  const nested = join(at, "packages", "core", "node_modules");
  mkdirSync(join(nested, "right-pad"), { recursive: true });
  writeFileSync(
    join(nested, "right-pad", "package.json"),
    `${JSON.stringify({ name: "right-pad", version: "3.0.0" })}\n`,
  );
};

let base: string;
let worktreeModules: string[];

beforeAll(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), "bench-snapshot-")));
  git("init", "-q", "-b", "main");
  write(".gitignore", "/node_modules\n/.bench/\n");
  write(
    "package.json",
    `${JSON.stringify({ name: "fixture", private: true, type: "module", workspaces: ["packages/*"] })}\n`,
  );
  write("package-lock.json", lock("1.0.0"));
  write(
    "packages/core/package.json",
    `${JSON.stringify({
      name: "@cesium/core",
      version: "0.0.0",
      type: "module",
      exports: {
        ".": { "@cesium/source": "./src/index.ts", default: "./src/index.js" },
      },
    })}\n`,
  );
  write("packages/core/src/index.ts", core("commit"));
  write("packages/core/src/index.js", core("commit"));
  // An entry shader: the dev server's Slang plugin sees edits to it.
  write(
    "packages/core/src/shaders/planted.slang",
    '[shader("compute")]\n[numthreads(1, 1, 1)]\nvoid main() {}\n',
  );
  write("vite.config.ts", "export default {};\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  base = git("rev-parse", "HEAD");
  // The working tree moves on, and npm's workspace link points at it, as
  // in every real checkout.
  write("packages/core/src/index.ts", core("worktree"));
  write("packages/core/src/index.js", core("worktree"));
  git("commit", "-q", "-am", "worktree");
  mkdirSync(join(dir, "node_modules", "@cesium"), { recursive: true });
  symlinkSync(
    join(dir, "packages", "core"),
    join(dir, "node_modules", "@cesium", "core"),
    "junction",
  );
  write(
    "node_modules/left-pad/package.json",
    `${JSON.stringify({ name: "left-pad", version: "1.0.0" })}\n`,
  );
  worktreeModules = listing(join(dir, "node_modules"));
});

afterAll(() => {
  // The fixture's snapshot worktrees go with the fixture.
  rmSync(dir, { recursive: true, force: true });
});

describe("a --commit snapshot", () => {
  it("resolves @cesium/core to the commit's own package, not the worktree's", () => {
    const snap = snapshot(base, dir);
    const from = createRequire(join(snap.root, "vite.config.ts"));
    const resolved = realpathSync(from.resolve("@cesium/core"));
    // index.ts or index.js, by the conditions the test runner sets: either
    // way, the snapshot's own.
    expect(resolved.startsWith(join(snap.root, "packages", "core") + sep)).toBe(
      true,
    );
    expect(readFileSync(resolved, "utf8")).toBe(core("commit"));
    // Third-party packages still come from the worktree's node_modules.
    expect(realpathSync(dirname(from.resolve("left-pad/package.json")))).toBe(
      join(dir, "node_modules", "left-pad"),
    );
  });

  it("resolves it inside the snapshot under Vite's source condition too", async () => {
    const snap = snapshot(base, dir);
    const { createServer } = await import("vite");
    const server = await createServer({
      root: snap.root,
      configFile: false,
      logLevel: "silent",
      server: { middlewareMode: true, hmr: false, watch: null },
      resolve: { conditions: ["@cesium/source", ...defaultClientConditions] },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    try {
      const resolved = await server.pluginContainer.resolveId(
        "@cesium/core",
        join(snap.root, "index.html"),
      );
      expect(resolved?.id).toBe(
        join(snap.root, "packages", "core", "src", "index.ts"),
      );
      const module = await server.ssrLoadModule("@cesium/core");
      expect(module.planted).toBe("commit");
    } finally {
      await server.close();
    }
  });

  it("writes nothing outside the snapshot", () => {
    snapshot(base, dir);
    expect(git("status", "--porcelain", "--ignored=no")).toBe("");
    // Nor in the worktree's node_modules, which git status can't see.
    expect(worktreeModules.length).toBeGreaterThan(0);
    expect(listing(join(dir, "node_modules"))).toEqual(worktreeModules);
    // The worktree's own link is untouched.
    expect(realpathSync(join(dir, "node_modules", "@cesium", "core"))).toBe(
      join(dir, "packages", "core"),
    );
  });

  it("the frozen tree (dyno suite's working tree) links its own packages too", () => {
    const root = checkoutFrozen(dir, base);
    expect(root).toBe(join(dir, ".bench", "tree"));
    const from = createRequire(join(root, "vite.config.ts"));
    expect(readFileSync(from.resolve("@cesium/core"), "utf8")).toBe(
      core("commit"),
    );
    expect(
      lstatSync(join(root, "node_modules", "@cesium", "core")).isSymbolicLink(),
    ).toBe(true);
  });
});

describe("third-party dependencies", () => {
  it("are the worktree's when the lockfiles agree on them", () => {
    expect(thirdPartyDifferences(lock("1.0.0"), lock("1.0.0"))).toEqual([]);
    // Workspace packages' own entries don't count: the snapshot links its own.
    const bumped = lock("1.0.0", {
      "packages/core": { name: "@cesium/core", version: "0.1.0" },
    });
    expect(bumped).not.toBe(lock("1.0.0"));
    expect(thirdPartyDifferences(bumped, lock("1.0.0"))).toEqual([]);
  });

  it("differ when a version moved, was added or was removed", () => {
    expect(thirdPartyDifferences(lock("1.0.0"), lock("1.1.0"))).toEqual([
      "node_modules/left-pad",
    ]);
    const added = lock("1.0.0", {
      "node_modules/right-pad": { version: "2.0.0" },
    });
    expect(thirdPartyDifferences(added, lock("1.0.0"))).toEqual([
      "node_modules/right-pad",
    ]);
    expect(thirdPartyDifferences(lock("1.0.0"), added)).toEqual([
      "node_modules/right-pad",
    ]);
  });

  it("nested under a workspace package count like the others, but nested links always", () => {
    const nested = (version: string) =>
      lock("1.0.0", {
        "packages/core/node_modules/left-pad": { version },
      });
    expect(thirdPartyDifferences(nested("0.9.0"), nested("0.9.0"))).toEqual([]);
    expect(thirdPartyDifferences(nested("0.9.0"), nested("0.8.0"))).toEqual([
      "packages/core/node_modules/left-pad",
    ]);
    const linked = lock("1.0.0", {
      "packages/core/node_modules/@cesium/time": {
        resolved: "packages/time",
        link: true,
      },
    });
    expect(thirdPartyDifferences(linked, linked)).toEqual([
      "packages/core/node_modules/@cesium/time",
    ]);
  });

  it("nested under a workspace package are the worktree's folder, linked", () => {
    write(
      "packages/core/node_modules/right-pad/package.json",
      `${JSON.stringify({ name: "right-pad", version: "2.0.0" })}\n`,
    );
    const at = mkdtempSync(join(dir, ".bench", "nested-"));
    mkdirSync(join(at, "packages", "core"), { recursive: true });
    writeFileSync(
      join(at, "package.json"),
      `${JSON.stringify({ name: "fixture", workspaces: ["packages/*"] })}\n`,
    );
    writeFileSync(
      join(at, "packages", "core", "package.json"),
      `${JSON.stringify({ name: "@cesium/core" })}\n`,
    );
    writeFileSync(join(at, "package-lock.json"), lock("1.0.0"));
    const result = linkSnapshotPackages(at, dir, {
      install: () => {
        throw new Error("no install expected");
      },
    });
    expect(result.mode).toBe("links");
    const from = createRequire(join(at, "packages", "core", "index.js"));
    expect(realpathSync(dirname(from.resolve("right-pad/package.json")))).toBe(
      join(dir, "packages", "core", "node_modules", "right-pad"),
    );
    rmSync(join(dir, "packages", "core", "node_modules"), {
      recursive: true,
    });
  });

  it("a snapshot whose lockfile differs installs its own, in the snapshot", () => {
    const at = mkdtempSync(join(dir, ".bench", "lockfile-"));
    writeFileSync(
      join(at, "package.json"),
      `${JSON.stringify({ name: "fixture", workspaces: ["packages/*"] })}\n`,
    );
    writeFileSync(join(at, "package-lock.json"), lock("1.1.0"));
    const calls: { command: string; args: string[]; cwd: string }[] = [];
    const result = linkSnapshotPackages(at, dir, {
      install: (command, args, cwd) => calls.push({ command, args, cwd }),
    });
    expect(result.mode).toBe("installed");
    expect(result.differences).toEqual(["node_modules/left-pad"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.cwd).toBe(at);
    expect(calls[0]?.args.slice(0, 1)).toEqual(["ci"]);
    expect(calls[0]?.args).toContain("--ignore-scripts");
    // Once installed, it isn't installed again for the same lockfile.
    linkSnapshotPackages(at, dir, {
      install: (command, args, cwd) => calls.push({ command, args, cwd }),
    });
    expect(calls).toHaveLength(1);
    expect(git("status", "--porcelain", "--ignored=no")).toBe("");
  });

  it("an install that fails stops the run, saying why", () => {
    const at = mkdtempSync(join(dir, ".bench", "lockfile-"));
    writeFileSync(
      join(at, "package.json"),
      `${JSON.stringify({ name: "fixture", workspaces: ["packages/*"] })}\n`,
    );
    writeFileSync(join(at, "package-lock.json"), lock("1.1.0"));
    expect(() =>
      linkSnapshotPackages(at, dir, {
        install: () => {
          throw new Error("offline");
        },
      }),
    ).toThrow(/lockfile differs from the worktree's.*left-pad.*offline/s);
    expect(existsSync(join(at, "node_modules", ".bench-deps.json"))).toBe(
      false,
    );
  });

  it("switching from links to an install removes the links first, and writes nothing into the worktree's nested folder", () => {
    const { repo, at } = pair();
    const nested = join(repo, "packages", "core", "node_modules");
    const noInstall = () => {
      throw new Error("no install expected");
    };
    expect(linkSnapshotPackages(at, repo, { install: noInstall }).mode).toBe(
      "links",
    );
    const own = join(at, "packages", "core", "node_modules");
    expect(lstatSync(own).isSymbolicLink()).toBe(true);
    expect(
      JSON.parse(
        readFileSync(join(at, "node_modules", ".bench-deps.json"), "utf8"),
      ).links,
    ).toContain(join("packages", "core", "node_modules"));
    const before = listing(nested);
    // The snapshot's lockfile moves on (the frozen tree's does).
    writeFileSync(join(at, "package-lock.json"), lock("1.1.0"));
    const calls: string[] = [];
    const result = linkSnapshotPackages(at, repo, {
      install: fakeCi(at, calls),
    });
    expect(result.mode).toBe("installed");
    expect(calls).toEqual([at]);
    expect(listing(nested)).toEqual(before);
    // The install's folder is the snapshot's own.
    expect(lstatSync(own).isDirectory()).toBe(true);
    rmSync(repo, { recursive: true, force: true });
  });

  it("refuses to install while a node_modules under the snapshot links out of it", () => {
    const { repo, at } = pair();
    // A link this module didn't make (someone's, by hand).
    mkdirSync(join(at, "tools", "x"), { recursive: true });
    symlinkSync(
      join(repo, "packages", "core", "node_modules"),
      join(at, "tools", "x", "node_modules"),
      "junction",
    );
    writeFileSync(join(at, "package-lock.json"), lock("1.1.0"));
    const calls: string[] = [];
    expect(() =>
      linkSnapshotPackages(at, repo, { install: fakeCi(at, calls) }),
    ).toThrow(
      /tools.x.node_modules is a link out of the snapshot.*not installing/,
    );
    expect(calls).toEqual([]);
    rmSync(repo, { recursive: true, force: true });
  });

  it("stays installed, without a throw, once the worktree's lockfile agrees", () => {
    const { repo, at } = pair();
    writeFileSync(join(at, "package-lock.json"), lock("1.1.0"));
    const calls: string[] = [];
    expect(
      linkSnapshotPackages(at, repo, { install: fakeCi(at, calls) }).mode,
    ).toBe("installed");
    // npm's real nested folder is in place, and now the lockfiles agree.
    writeFileSync(join(repo, "package-lock.json"), lock("1.1.0"));
    const result = linkSnapshotPackages(at, repo, {
      install: fakeCi(at, calls),
    });
    expect(result).toEqual({ mode: "installed", differences: [] });
    expect(calls).toHaveLength(1);
    rmSync(repo, { recursive: true, force: true });
  });

  it("refuses a snapshot whose own node_modules is a link", () => {
    const { repo, at } = pair();
    const elsewhere = join(repo, "elsewhere");
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, join(at, "node_modules"), "junction");
    expect(() => linkSnapshotPackages(at, repo)).toThrow(
      /its node_modules is a link/,
    );
    expect(readdirSync(elsewhere)).toEqual([]);
    rmSync(repo, { recursive: true, force: true });
  });
});

describe("workspace patterns", () => {
  it("reads paths and a trailing /*, and throws on any other pattern, naming it", () => {
    const { repo, at } = pair();
    expect([...workspacePackages(at).keys()]).toEqual(["@cesium/core"]);
    for (const pattern of [
      "packages/**",
      "packages/{a,b}",
      "pack?ges/*",
      "!packages/x",
      "../elsewhere/*",
    ]) {
      writeFileSync(
        join(at, "package.json"),
        `${JSON.stringify({ name: "fixture", workspaces: [pattern] })}\n`,
      );
      expect(() => workspacePackages(at)).toThrow(JSON.stringify(pattern));
    }
    rmSync(repo, { recursive: true, force: true });
  });
});

describe("the Slang build", () => {
  it("compiles nothing for a .slang file outside this checkout's sources", () => {
    const snap = snapshot(base, dir);
    const inSnapshot = join(
      snap.root,
      "packages",
      "core",
      "src",
      "shaders",
      "planted.slang",
    );
    expect(existsSync(inSnapshot)).toBe(true);
    // The dev server's watcher sees edits under .bench/ (a frozen tree's
    // checkout, a snapshot's): none of them is this checkout's shader.
    expect(dependents(inSnapshot)).toEqual([]);
  });

  it("counts only the engine's src/ and examples/ as this checkout's", () => {
    const repo = join(import.meta.dirname, "..");
    const own = join(repo, "packages", "core", "src", "shaders", "x.slang");
    expect(isOwnSource(own)).toBe(true);
    expect(isOwnSource(join(repo, "examples", "a", "x.slang"))).toBe(true);
    for (const copy of [".bench/0123456789ab", ".bench/tree"]) {
      expect(
        isOwnSource(
          join(repo, copy, "packages", "core", "src", "shaders", "x.slang"),
        ),
      ).toBe(false);
    }
  });
});
