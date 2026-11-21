// The dyno bin (CS-774): `npx --no-install dyno` works because the bin lives in a private
// workspace package, tools/dyno. This checks the package stays private, has no
// dependencies, never ships with @cesium/next, and that its bin runs
// bench/dyno.mjs. Every `npx dyno` the docs, help and recorded runs show says
// --no-install: a missing link must fail, not download the unrelated public
// `dyno` package (npx installs without asking when there is no terminal).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const next = fileURLToPath(new URL("..", import.meta.url));
const root = resolve(next, "../..");
const pkgDir = resolve(next, "tools/dyno");

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

describe("the dyno bin package", () => {
  const pkg = readJson(resolve(pkgDir, "package.json"));

  it("is private and has no dependencies of its own", () => {
    expect(pkg.name).toBe("dyno");
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
    expect(imports).toContain(resolve(next, "bench/dyno.mjs"));
    expect(readFileSync(bin, "utf8").startsWith("#!/usr/bin/env node")).toBe(
      true,
    );
  });

  it("is in the root workspaces list", () => {
    const workspaces = readJson(resolve(root, "package.json"))
      .workspaces as string[];
    expect(workspaces).toContain("packages/next/tools/dyno");
  });

  it("stays out of @cesium/next's tarball", () => {
    // @cesium/next has no `files` list, so a nested .npmignore keeps this
    // package (and itself) out of `npm pack`.
    const ignore = readFileSync(resolve(pkgDir, ".npmignore"), "utf8");
    expect(ignore.split("\n").map((l) => l.trim())).toContain("*");
    expect(readJson(resolve(next, "package.json")).files).toBeUndefined();
  });
});

describe("npx dyno always says --no-install", () => {
  /** Where `npx dyno` is written without --no-install, as `file:line`. */
  function bare(file: string, text: string): string[] {
    return text
      .split("\n")
      .flatMap((line, i) =>
        [...line.matchAll(/\bnpx((?:\s+-{1,2}[\w-]+)*)\s+dyno\b/g)]
          .filter((m) => !(m[1] ?? "").includes("--no-install"))
          .map(() => `${file}:${i + 1}: ${line.trim().slice(0, 100)}`),
      );
  }

  const files = [
    ".claude/skills/dyno/SKILL.md",
    "AGENTS.md",
    "README.md",
    "bench/suite/commands/dispatch.mjs",
    "bench/suite/commands/suite.mjs",
    "tools/dyno/package.json",
  ];

  it("in the docs, the skill, the help source and the package", () => {
    const found = files.flatMap((f) =>
      bare(f, readFileSync(resolve(next, f), "utf8")),
    );
    expect(found).toEqual([]);
  });

  it("in the --help text dyno prints", () => {
    const out = spawnSync(
      process.execPath,
      [resolve(next, "bench/dyno.mjs"), "--help"],
      { encoding: "utf8", timeout: 60000 },
    );
    expect(out.status).toBe(0);
    expect(bare("--help", out.stdout)).toEqual([]);
    expect(out.stdout).toContain("npx --no-install dyno");
  });

  it("in the command a suite run records", () => {
    const source = readFileSync(
      resolve(next, "bench/suite/commands/suite.mjs"),
      "utf8",
    );
    expect(source).toContain('as = ["npx", "--no-install", "dyno", "suite"]');
  });

  it("and the checker names a line that doesn't", () => {
    expect(
      bare("x.md", "ok `npx --no-install dyno`\nbad `npx dyno status`"),
    ).toEqual(["x.md:2: bad `npx dyno status`"]);
    expect(bare("x.md", "bad `npx -y dyno`")).toHaveLength(1);
  });
});
