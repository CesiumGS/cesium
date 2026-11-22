// The packed result's checks (scripts/build/pack.mjs) and each package's
// `sideEffects` (CS-612). The bundle check (scripts/checkBundle.mjs) proves
// the side-effect modules survive an application's build; this proves every
// module with effects of its own in a package's sources is listed, however
// it is reached (a bare import, an `export * from`, a dynamic `import()`
// whose namespace is dropped), so a new one can't be dropped unnoticed.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { missingFiles, missingFilesVerdict } from "../scripts/build/pack.mjs";

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

describe("missingFilesVerdict", () => {
  it("says nothing when nothing listed is missing", () => {
    expect(missingFilesVerdict({ name: "@x/a", private: true }, [])).toEqual({
      verdict: "none",
    });
    expect(missingFilesVerdict({ name: "@x/a" }, [])).toEqual({
      verdict: "none",
    });
  });
  it("reports, and doesn't fail, a private package's missing files", () => {
    expect(
      missingFilesVerdict({ name: "@x/a", private: true }, ["LICENSE.md"]),
    ).toEqual({
      verdict: "report",
      line: "@x/a: `files` lists LICENSE.md, not in the package folder, so not in the tarball (private, so reported, not failed)",
    });
  });
  it("fails a public package's missing files", () => {
    for (const manifest of [
      { name: "@x/a" },
      { name: "@x/a", private: false },
    ]) {
      expect(
        missingFilesVerdict(manifest, ["LICENSE.md", "README.md"]),
      ).toEqual({
        verdict: "fail",
        line: "@x/a: `files` lists LICENSE.md, README.md, not in the package folder, so not in the tarball",
      });
    }
  });
});

/** Every non-test TypeScript file under `dir` (`.ts` and `.tsx`), recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

/** A side-effect-only import: `import "./x.ts";`, with no bindings. */
const BARE_IMPORT = /^\s*import\s+["'](\.{1,2}\/[^"']+)["']/gm;

/** A module's `./src/…` and `./dist/….js` paths, as `sideEffects` lists them. */
function listedPaths(dir: string, file: string): string[] {
  const target = relative(dir, file).split("\\").join("/");
  return [
    `./${target}`,
    `./${target.replace(/^src\//, "dist/").replace(/\.tsx?$/, ".js")}`,
  ];
}

/**
 * The top-level statements of a module that do something when it is
 * evaluated: expression statements (calls, assignments), and `if`, loops,
 * blocks and `try`. Declarations, imports and exports don't count, and
 * neither does a `const` with a call in it, which the bundlers treat as
 * pure only with an annotation, so it is no effect a package relies on.
 */
function effectLines(fileName: string, text: string): number[] {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  return source.statements
    .filter(
      (s) =>
        ts.isExpressionStatement(s) ||
        ts.isIfStatement(s) ||
        ts.isForStatement(s) ||
        ts.isForOfStatement(s) ||
        ts.isForInStatement(s) ||
        ts.isWhileStatement(s) ||
        ts.isDoStatement(s) ||
        ts.isBlock(s) ||
        ts.isTryStatement(s),
    )
    .map((s) => source.getLineAndCharacterOfPosition(s.getStart()).line + 1);
}

/** A source file's effects, as `path:line`. */
function effects(file: string): string[] {
  return effectLines(file, readFileSync(file, "utf8")).map(
    (line) => `${relative(repo, file).split("\\").join("/")}:${line}`,
  );
}

/**
 * The files a package's sources start as workers (`?worker` imports and
 * `new Worker(new URL("./x.ts", import.meta.url))`): each is an entry of
 * its own in an application's build, so `sideEffects` doesn't apply.
 */
function workerEntries(files: readonly string[]): Set<string> {
  const entries = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const [, specifier] of text.matchAll(
      /from\s+["'](\.{1,2}\/[^"'?]+)\?worker/g,
    )) {
      entries.add(resolve(dirname(file), specifier!));
    }
    for (const [, specifier] of text.matchAll(
      /new\s+URL\(\s*["'](\.{1,2}\/[^"']+)["']\s*,\s*import\.meta\.url/g,
    )) {
      entries.add(resolve(dirname(file), specifier!));
    }
  }
  return entries;
}

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
            `./${target.replace(/^src\//, "dist/").replace(/\.tsx?$/, ".js")}`,
          );
        }
      }
      const listed = Array.isArray(manifest.sideEffects)
        ? manifest.sideEffects
        : [];
      expect([...wanted].filter((path) => !listed.includes(path))).toEqual([]);
    });
  }

  for (const folder of readdirSync(packages)) {
    const dir = join(packages, folder);
    const manifest = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8"),
    ) as {
      name: string;
      sideEffects?: boolean | string[];
    };
    it(`${manifest.name} lists every module with effects of its own, however it is reached`, () => {
      const files = sources(join(dir, "src"));
      const workers = workerEntries(files);
      const listed = Array.isArray(manifest.sideEffects)
        ? manifest.sideEffects
        : [];
      const unlisted = files
        .filter((file) => !workers.has(file))
        .filter((file) => effects(file).length > 0)
        .filter(
          (file) =>
            manifest.sideEffects !== true &&
            !listedPaths(dir, file).every((p) => listed.includes(p)),
        )
        .map((file) => effects(file)[0]);
      expect(unlisted).toEqual([]);
    });
  }

  it("finds the effects a module can have, and none in declarations or re-exports", () => {
    expect(
      effectLines(
        "probe.ts",
        'import { installIrPasses } from "./lazyIr.ts";\ninstallIrPasses(passes);\nif (!globalThis.x) {\n  globalThis.x = 1;\n}\nfor (const n of ["a"]) {}\ntry {\n  f();\n} catch {}\n',
      ),
    ).toEqual([2, 3, 6, 7]);
    expect(
      effectLines(
        "probe.tsx",
        'export * from "./x.ts";\nexport const a = 1;\nconst b = () => <div />;\nfunction f() {\n  g();\n}\nexport default class C {}\n',
      ),
    ).toEqual([]);
  });

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
