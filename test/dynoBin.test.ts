// The dyno bin (CS-774, CS-784): `npx @cesium/dyno` works because the bin lives in a private
// workspace package, tools/dyno. This checks the package is named @cesium/dyno, stays
// private, has no dependencies, never ships with @cesium/next, and that its bin runs
// bench/dyno.mjs. The command is always written with the scope: a bare name that
// npx can't find locally is downloaded from the registry (without asking when there
// is no terminal), and an unrelated public package is named `dyno`. Only Cesium can
// publish under @cesium, so the scoped name can't reach an outside package.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const next = resolve(root, "packages/cesium");
// An address nothing listens on: npx that has to fetch anything fails at once.
const unreachableRegistry = "http://127.0.0.1:9";
const pkgDir = resolve(root, "tools/dyno");

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

describe("the dyno bin package", () => {
  const pkg = readJson(resolve(pkgDir, "package.json"));

  it("is private and has no dependencies of its own", () => {
    expect(pkg.name).toBe("@cesium/dyno");
    expect(pkg.private).toBe(true);
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
      "scripts",
    ]) {
      expect(pkg[field], field).toBeUndefined();
    }
  });

  it("has a dyno bin that resolves to a file running bench/dyno.mjs", () => {
    expect(pkg.bin).toEqual({ dyno: expect.any(String) });
    const bin = resolve(pkgDir, (pkg.bin as { dyno: string }).dyno);
    expect(existsSync(bin)).toBe(true);
    // npm links only a bin inside its package, so the bin imports the command.
    const imports = [
      ...readFileSync(bin, "utf8").matchAll(/^import\s+"([^"]+)";$/gm),
    ].map((m) => resolve(dirname(bin), m[1] ?? ""));
    expect(imports).toContain(resolve(root, "bench/dyno.mjs"));
    expect(readFileSync(bin, "utf8").startsWith("#!/usr/bin/env node")).toBe(
      true,
    );
  });

  it("is in the root workspaces list", () => {
    const workspaces = readJson(resolve(root, "package.json"))
      .workspaces as string[];
    expect(workspaces).toContain("tools/*");
  });

  it("stays out of @cesium/next's tarball", () => {
    // Its own .npmignore keeps it out of any `npm pack`, and @cesium/next's
    // `files` list (CS-612, CS-613) publishes only the build and its docs.
    const ignore = readFileSync(resolve(pkgDir, ".npmignore"), "utf8");
    expect(ignore.split("\n").map((l) => l.trim())).toContain("*");
    expect(readJson(resolve(next, "package.json")).files).toEqual([
      "dist",
      "LICENSE.md",
      "README.md",
      "CHANGELOG.md",
    ]);
  });
});

describe("npx @cesium/dyno is the only form", () => {
  /** Where npx is given the bare name `dyno` (with or without flags), as `file:line`. */
  function unscoped(file: string, text: string): string[] {
    return text
      .split("\n")
      .flatMap((line, i) =>
        [...line.matchAll(/\bnpx(?:\s+-{1,2}[\w=-]+)*\s+dyno\b/g)].map(
          () => `${file}:${i + 1}: ${line.trim().slice(0, 100)}`,
        ),
      );
  }

  const files = [
    "AGENTS.md",
    "docs/design/benchmark-devices-and-sharing.md",
    ".claude/skills/dyno/SKILL.md",
    "packages/cesium/README.md",
    "bench/dyno.mjs",
    "bench/suite/commands/dispatch.mjs",
    "bench/suite/commands/suite.mjs",
    "tools/dyno/bin.mjs",
    "tools/dyno/package.json",
  ];

  it("in the docs, the skill, the help source and the package", () => {
    const found = files.flatMap((f) =>
      unscoped(f, readFileSync(resolve(root, f), "utf8")),
    );
    expect(found).toEqual([]);
  });

  it("in the --help text dyno prints", () => {
    const out = spawnSync(
      process.execPath,
      [resolve(root, "bench/dyno.mjs"), "--help"],
      { encoding: "utf8", timeout: 60000 },
    );
    expect(out.status).toBe(0);
    expect(unscoped("--help", out.stdout)).toEqual([]);
    expect(out.stdout).toContain("npx @cesium/dyno");
  });

  it("in the command a suite run records", () => {
    const source = readFileSync(
      resolve(root, "bench/suite/commands/suite.mjs"),
      "utf8",
    );
    expect(source).toContain('as = ["npx", "@cesium/dyno", "suite"]');
  });

  it("and the checker names a line that doesn't", () => {
    expect(
      unscoped("x.md", "ok `npx @cesium/dyno`\nbad `npx dyno status`"),
    ).toEqual(["x.md:2: bad `npx dyno status`"]);
    expect(unscoped("x.md", "bad `npx -y dyno`")).toHaveLength(1);
    expect(unscoped("x.md", "bad `npx --no-install dyno`")).toHaveLength(1);
    expect(unscoped("x.md", "bad `npx --yes --quiet dyno suite`")).toHaveLength(
      1,
    );
    expect(unscoped("x.md", "ok `npx @cesium/dyno suite`")).toEqual([]);
  });
});

describe("npx @cesium/dyno resolves the workspace link and never downloads", () => {
  /** npx with an unreachable registry and empty config, so nothing can be fetched. */
  function npx(cwd: string, args: string[], scratch: string) {
    const userconfig = join(scratch, "empty.npmrc");
    writeFileSync(userconfig, "");
    return spawnSync("npx", args, {
      cwd,
      encoding: "utf8",
      timeout: 60000,
      env: {
        ...process.env,
        npm_config_registry: unreachableRegistry,
        npm_config_userconfig: userconfig,
        npm_config_cache: join(scratch, "cache"),
        npm_config_fetch_retries: "0",
      },
    });
  }

  for (const [label, cwd] of [
    ["the repository root", root],
    ["packages/cesium", next],
  ] as const) {
    it(`runs from ${label} after npm install`, () => {
      const scratch = mkdtempSync(join(tmpdir(), "dyno-npx-"));
      try {
        const out = npx(cwd, ["@cesium/dyno", "--help"], scratch);
        // A failure here means the workspace link is missing: run `npm install` at the root.
        expect(out.stderr).not.toContain("ECONNREFUSED");
        expect(out.status).toBe(0);
        expect(out.stdout).toContain("Dyno's command line");
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    });
  }

  it("fails without the link, asking the registry and nothing else", () => {
    // A directory outside the repository has no workspace link. npx has to ask
    // the registry for @cesium/dyno, which here is an address nothing listens on.
    const scratch = mkdtempSync(join(tmpdir(), "dyno-npx-"));
    try {
      const out = npx(scratch, ["@cesium/dyno", "--help"], scratch);
      expect(out.status).not.toBe(0);
      expect(out.stderr).toContain("127.0.0.1:9");
      expect(out.stderr).toContain("@cesium%2fdyno");
      expect(out.stdout).not.toContain("Dyno's command line");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
