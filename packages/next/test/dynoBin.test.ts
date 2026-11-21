// The dyno bin (CS-774): `npx dyno` works because the bin lives in a private
// workspace package, tools/dyno. This checks the package stays private, has no
// dependencies, never ships with @cesium/next, and that its bin runs
// bench/dyno.mjs.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
