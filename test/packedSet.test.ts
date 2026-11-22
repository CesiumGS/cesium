// The packed pre-release set (scripts/packSet.mjs, CS-938): a set packed at
// the checked-out commit, installed by `file:` path into a temporary project
// outside the checkout, and every entry point of every package imported in
// Node.
//
// The project's `.npmrc` points the @cesium scope at an address nothing
// listens on, so an @cesium package fetched from a registry (where
// `@cesium/core` is 1.x's package) fails the install instead of passing. The
// install runs with `--offline`: third-party dependencies come from the npm
// cache, and one that isn't cached fails with a message saying so, never by
// reaching out.
//
// It packs whatever each package's dist/ holds (a build when one is
// missing), from any tree, clean or not; the command itself refuses a dirty
// one, which the git tests here cover.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { packageDirs } from "../scripts/build/declarations.mjs";
import {
  HOST_FOLDER,
  dirtyPaths,
  headCommit,
  installFragment,
  integrityOf,
  packSet,
  requireCleanTree,
  verifySet,
  type SetManifest,
} from "../scripts/packSet.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temps: string[] = [];

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** The environment for a child npm or node: npm's own `npm_*` variables out, its cache kept. */
function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("npm_") || key === "npm_config_cache") {
      env[key] = value;
    }
  }
  return env;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
}

interface Manifest {
  name: string;
  version: string;
  exports: Record<string, unknown>;
}

const packages = packageDirs().map((dir) => ({
  dir,
  manifest: JSON.parse(
    readFileSync(join(dir, "package.json"), "utf8"),
  ) as Manifest,
}));

describe("a packed set, installed by file: path", () => {
  const root = temp("cesium-packed-set-");
  const setDir = join(root, "set");
  const project = join(root, "host");
  let manifest: SetManifest;

  beforeAll(() => {
    if (packages.some(({ dir }) => !existsSync(join(dir, "dist")))) {
      execFileSync("npm", ["run", "build"], { cwd: repo, stdio: "ignore" });
    }
    manifest = packSet({
      out: setDir,
      build: false,
      requireClean: false,
      log: () => {},
    });

    // The host: its own folder, the set copied into it, the fragment merged in.
    mkdirSync(join(project, HOST_FOLDER), { recursive: true });
    for (const { tarball } of manifest.packages) {
      copyFileSync(join(setDir, tarball), join(project, HOST_FOLDER, tarball));
    }
    writeFileSync(
      join(project, "package.json"),
      JSON.stringify(
        {
          name: "host",
          private: true,
          version: "1.0.0",
          type: "module",
          ...manifest.install,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(project, ".npmrc"),
      "@cesium:registry=http://127.0.0.1:9/\n",
    );
    try {
      execFileSync(
        "npm",
        ["install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts"],
        { cwd: project, encoding: "utf8", stdio: "pipe", env: childEnv() },
      );
    } catch (error) {
      const output = `${(error as { stderr?: string }).stderr ?? ""}`;
      if (output.includes("127.0.0.1:9")) {
        throw new Error(
          `npm asked a registry for an @cesium package, so the overrides didn't cover it:\n${output}`,
          { cause: error },
        );
      }
      if (output.includes("ENOTCACHED")) {
        throw new Error(
          `a third-party dependency isn't in the npm cache, and this test doesn't reach out for it. Run npm ci in the checkout to fill the cache:\n${output}`,
          { cause: error },
        );
      }
      throw error;
    }
  }, 300_000);

  it("records the commit, the tools and every package, with its integrity", () => {
    expect(manifest.commit).toBe(headCommit(repo));
    expect(Number.isNaN(Date.parse(manifest.date))).toBe(false);
    expect(manifest.node).toBe(process.version);
    expect(manifest.npm).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.packages.map((p) => p.name).sort()).toEqual(
      packages.map((p) => p.manifest.name).sort(),
    );
    for (const p of manifest.packages) {
      const source = packages.find((s) => s.manifest.name === p.name)!;
      expect(p.version).toBe(source.manifest.version);
      // The commit is in the name, so a new set is a new file to npm.
      expect(p.tarball).toBe(
        `${p.name.replace("@", "").replace("/", "-")}-${p.version}-${manifest.commit.slice(0, 10)}.tgz`,
      );
      expect(p.integrity).toMatch(/^sha512-[A-Za-z0-9+/]+=*$/);
      expect(p.integrity).toBe(integrityOf(join(setDir, p.tarball)));
      expect(p.size).toBeGreaterThan(0);
    }
    expect(
      JSON.parse(readFileSync(join(setDir, "manifest.json"), "utf8")),
    ).toEqual(manifest);
    expect(manifest.install).toEqual(installFragment(manifest.packages));
  });

  it("names every package in the fragment's dependencies and its overrides, by file: path", () => {
    for (const p of manifest.packages) {
      const spec = `file:./${HOST_FOLDER}/${p.tarball}`;
      expect(manifest.install.dependencies[p.name]).toBe(spec);
      expect(manifest.install.overrides[p.name]).toBe(spec);
    }
  });

  it("ships each package as a release would: no source condition, the commit as gitHead", () => {
    for (const p of manifest.packages) {
      const text = execFileSync(
        "tar",
        ["-xOzf", join(setDir, p.tarball), "package/package.json"],
        { encoding: "utf8" },
      );
      expect(text).not.toContain("@cesium/source");
      expect(JSON.parse(text).gitHead).toBe(manifest.commit);
    }
  });

  it("verifies as whole", () => {
    expect(verifySet(setDir)).toEqual([]);
  });

  it("locks every @cesium package to its tarball in the set, with the manifest's integrity", () => {
    const lock = JSON.parse(
      readFileSync(join(project, "package-lock.json"), "utf8"),
    ) as {
      packages: Record<string, { resolved?: string; integrity?: string }>;
    };
    const cesium = Object.entries(lock.packages).filter(([path]) =>
      /node_modules\/@cesium\//.test(path),
    );
    // One entry per package, at the top: no sibling nested under another, and
    // none from anywhere but the set.
    expect(cesium.map(([path]) => path).sort()).toEqual(
      manifest.packages.map((p) => `node_modules/${p.name}`).sort(),
    );
    for (const p of manifest.packages) {
      const entry = lock.packages[`node_modules/${p.name}`]!;
      expect(entry.resolved).toBe(`file:${HOST_FOLDER}/${p.tarball}`);
      expect(entry.integrity).toBe(p.integrity);
    }
  });

  it("imports every entry point of every package in Node", () => {
    const specifiers: string[] = [];
    for (const { manifest: m } of packages) {
      for (const subpath of Object.keys(m.exports)) {
        if (subpath !== "./package.json") {
          specifiers.push(
            subpath === "." ? m.name : `${m.name}/${subpath.slice(2)}`,
          );
        }
      }
    }
    expect(specifiers.length).toBeGreaterThanOrEqual(packages.length);
    const script = `
      const results = {};
      for (const specifier of JSON.parse(process.argv[1])) {
        try {
          const module = await import(specifier);
          results[specifier] = Object.keys(module).length;
        } catch (error) {
          results[specifier] = String(error && error.message || error).split("\\n")[0];
        }
      }
      console.log(JSON.stringify(results));
    `;
    const out = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script, JSON.stringify(specifiers)],
      { cwd: project, encoding: "utf8", env: childEnv() },
    );
    const results = JSON.parse(out) as Record<string, number | string>;
    const failed = Object.entries(results).filter(
      ([, result]) => typeof result !== "number" || result === 0,
    );
    expect(failed).toEqual([]);
    expect(Object.keys(results).sort()).toEqual([...specifiers].sort());
  });

  it("refuses a set that exists unless told to, and replaces it when told", () => {
    expect(() =>
      packSet({
        out: setDir,
        build: false,
        requireClean: false,
        log: () => {},
      }),
    ).toThrow(/already exists.*--force/);
    // The refused run left the set as it was.
    expect(verifySet(setDir)).toEqual([]);
    const again = packSet({
      out: setDir,
      force: true,
      build: false,
      requireClean: false,
      log: () => {},
    });
    expect(again.packages.map((p) => p.integrity)).toEqual(
      manifest.packages.map((p) => p.integrity),
    );
    expect(verifySet(setDir)).toEqual([]);
    expect(readdirSync(setDir).sort()).toEqual(
      [...manifest.packages.map((p) => p.tarball), "manifest.json"].sort(),
    );
  }, 120_000);

  it("refuses an output folder inside the checkout, or one that holds other files", () => {
    expect(() =>
      packSet({
        out: join(repo, "packs-here"),
        build: false,
        requireClean: false,
      }),
    ).toThrow(/inside the checkout/);
    const other = temp("cesium-packed-other-");
    writeFileSync(join(other, "notes.txt"), "not a set");
    expect(() =>
      packSet({ out: other, build: false, requireClean: false }),
    ).toThrow(/no manifest\.json/);
    expect(existsSync(join(other, "notes.txt"))).toBe(true);
  });

  it("refuses a manifest that names a tarball outside its folder", () => {
    const bad = temp("cesium-packed-bad-");
    const evil = JSON.parse(
      readFileSync(join(setDir, "manifest.json"), "utf8"),
    ) as SetManifest;
    evil.packages[0]!.tarball = "../elsewhere.tgz";
    writeFileSync(join(bad, "manifest.json"), JSON.stringify(evil));
    expect(() => verifySet(bad)).toThrow(/plain file name/);
    expect(() =>
      packSet({ out: bad, force: true, build: false, requireClean: false }),
    ).toThrow(/plain file name/);
  });

  describe("a mixed set", () => {
    it("is found when a tarball isn't the one the manifest records", () => {
      const mixed = temp("cesium-packed-mixed-");
      for (const name of readdirSync(setDir)) {
        copyFileSync(join(setDir, name), join(mixed, name));
      }
      truncateSync(join(mixed, manifest.packages[0]!.tarball), 100);
      const problems = verifySet(mixed);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(manifest.packages[0]!.name);
      expect(problems[0]).toContain("may mix commits");
    });

    it("is found when the tarballs were packed at another commit than the manifest's", () => {
      const mixed = temp("cesium-packed-mixed-");
      for (const name of readdirSync(setDir)) {
        copyFileSync(join(setDir, name), join(mixed, name));
      }
      const other = JSON.parse(
        readFileSync(join(mixed, "manifest.json"), "utf8"),
      ) as SetManifest;
      other.commit = "0".repeat(40);
      writeFileSync(join(mixed, "manifest.json"), JSON.stringify(other));
      const problems = verifySet(mixed);
      expect(problems).toHaveLength(manifest.packages.length);
      expect(problems.every((p) => p.includes("was packed at"))).toBe(true);
    });

    it("is found when a tarball the manifest doesn't list sits beside it", () => {
      const mixed = temp("cesium-packed-mixed-");
      for (const name of readdirSync(setDir)) {
        copyFileSync(join(setDir, name), join(mixed, name));
      }
      copyFileSync(
        join(setDir, manifest.packages[0]!.tarball),
        join(mixed, "cesium-extra-2.0.0-poc.0-0000000000.tgz"),
      );
      expect(verifySet(mixed)).toEqual([
        expect.stringContaining(
          "cesium-extra-2.0.0-poc.0-0000000000.tgz isn't in the manifest",
        ),
      ]);
    });

    it("is found when a tarball is missing", () => {
      const mixed = temp("cesium-packed-mixed-");
      for (const name of readdirSync(setDir)) {
        copyFileSync(join(setDir, name), join(mixed, name));
      }
      rmSync(join(mixed, manifest.packages[1]!.tarball));
      expect(verifySet(mixed)).toEqual([
        expect.stringContaining(`${manifest.packages[1]!.name}: `),
      ]);
    });
  });
});

describe("a dirty tree", () => {
  function repoWithCommit(): string {
    const dir = temp("cesium-packed-git-");
    git(dir, "init", "-q", "-b", "main");
    git(dir, "config", "user.email", "test@example.com");
    git(dir, "config", "user.name", "Test");
    writeFileSync(join(dir, ".gitignore"), "dist/\n");
    writeFileSync(join(dir, "a.txt"), "a\n");
    git(dir, "add", "--", ".gitignore", "a.txt");
    git(dir, "commit", "-q", "-m", "first");
    return dir;
  }

  it("is clean when nothing changed, and ignored files don't count", () => {
    const dir = repoWithCommit();
    mkdirSync(join(dir, "dist"));
    writeFileSync(join(dir, "dist", "out.js"), "built\n");
    expect(dirtyPaths(dir)).toEqual([]);
    expect(() => requireCleanTree(dir)).not.toThrow();
  });

  it("names an unstaged change, a staged one and an untracked file", () => {
    const dir = repoWithCommit();
    writeFileSync(join(dir, "a.txt"), "changed\n");
    writeFileSync(join(dir, "b.txt"), "b\n");
    git(dir, "add", "--", "b.txt");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "new.ts"), "export {};\n");
    expect(dirtyPaths(dir).sort()).toEqual(["a.txt", "b.txt", "src/new.ts"]);
    expect(() => requireCleanTree(dir)).toThrow(
      /a\.txt[\s\S]*b\.txt[\s\S]*src\/new\.ts/,
    );
  });

  it("names a renamed file once, by its new path", () => {
    const dir = repoWithCommit();
    git(dir, "mv", "a.txt", "renamed.txt");
    expect(dirtyPaths(dir)).toEqual(["renamed.txt"]);
  });

  it("says how many more when a lot changed", () => {
    const dir = repoWithCommit();
    for (let i = 0; i < 12; i++) {
      writeFileSync(join(dir, `f${i}.txt`), "x\n");
    }
    expect(() => requireCleanTree(dir)).toThrow(/and 2 more/);
  });
});
