// The packed result's checks (scripts/build/pack.mjs) and each package's
// `sideEffects` (CS-612). The bundle check (scripts/checkBundle.mjs) proves
// the side-effect modules survive an application's build; this proves every
// side-effect-only import in a package's sources is listed, so a new one
// can't be dropped unnoticed.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { missingFiles } from "../scripts/build/pack.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packages = join(repo, "packages");

describe("missingFiles", () => {
  const packed = [
    "package.json",
    "dist/index.js",
    "dist/types/index.d.ts",
    "README.md",
  ];
  it("finds a listed file the tarball lacks, and none it holds", () => {
    expect(missingFiles(["dist", "LICENSE.md", "README.md"], packed)).toEqual([
      "LICENSE.md",
    ]);
  });
  it("matches a folder by its files, with or without ./ and a trailing slash", () => {
    expect(missingFiles(["./dist/", "dist/types", "docs"], packed)).toEqual([
      "docs",
    ]);
  });
  it("leaves a glob to npm", () => {
    expect(missingFiles(["*.md", "dist/**/*.css"], packed)).toEqual([]);
  });
});

/** Every non-test TypeScript file under `dir`, recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(path);
    }
    return /\.ts$/.test(entry.name) && !/\.(test|d)\.ts$/.test(entry.name)
      ? [path]
      : [];
  });
}

/** A side-effect-only import: `import "./x.ts";`, with no bindings. */
const BARE_IMPORT = /^\s*import\s+["'](\.{1,2}\/[^"']+)["']/gm;

describe("each package's sideEffects", () => {
  for (const folder of readdirSync(packages)) {
    const manifest = JSON.parse(
      readFileSync(join(packages, folder, "package.json"), "utf8"),
    ) as { name: string; sideEffects?: boolean | string[] };
    it(`${manifest.name} lists every module its sources import only for its effects`, () => {
      const dir = join(packages, folder);
      const wanted = new Set<string>();
      for (const file of sources(join(dir, "src"))) {
        for (const [, specifier] of readFileSync(file, "utf8").matchAll(
          BARE_IMPORT,
        )) {
          if (/\.css$/.test(specifier!)) {
            continue; // covered by a "*.css" pattern where a package has CSS
          }
          const target = relative(dir, resolve(dirname(file), specifier!))
            .split("\\")
            .join("/");
          wanted.add(`./${target}`);
          wanted.add(
            `./${target.replace(/^src\//, "dist/").replace(/\.ts$/, ".js")}`,
          );
        }
      }
      const listed = Array.isArray(manifest.sideEffects)
        ? manifest.sideEffects
        : [];
      expect([...wanted].filter((path) => !listed.includes(path))).toEqual([]);
    });
  }

  it("core's list names its dispose polyfill and the IR passes, in dist/ and src/", () => {
    const { sideEffects } = JSON.parse(
      readFileSync(join(packages, "core", "package.json"), "utf8"),
    ) as { sideEffects: string[] };
    expect(sideEffects).toEqual(
      expect.arrayContaining([
        "./dist/core/disposeShim.js",
        "./dist/transform/irPasses.js",
        "./src/core/disposeShim.ts",
        "./src/transform/irPasses.ts",
      ]),
    );
  });
});
