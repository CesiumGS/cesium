// Files that name other files by literal paths, checked to name files that
// exist. The scripts under scripts/ do so by relative imports, JSDoc type
// imports and paths joined to the repository root, and Dyno's catalog by its
// areas' paths. A move that leaves one behind fails only when someone runs
// that script, or quietly selects no scenes, which can be months later
// (CS-835 left several).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { expect, it } from "vitest";

const repo = join(import.meta.dirname, "..");
const scripts = join(repo, "scripts");

function listMjs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listMjs(path);
    }
    return path.endsWith(".mjs") ? [path] : [];
  });
}

/** A list of string literals and nothing else, as their values. */
const LITERALS = String.raw`(?:"[^"\n$]*"|'[^'\n$]*')(?:\s*,\s*(?:"[^"\n$]*"|'[^'\n$]*'))*`;
const valuesOf = (list: string) =>
  [...list.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2] ?? "");
/** The script's own folder, as scripts spell it. */
const HERE = String.raw`dirname\(fileURLToPath\(import\.meta\.url\)\)`;

/**
 * Every literal path in `text` (the script at `file`) that this can resolve,
 * as [line, what the script wrote, the absolute path].
 */
export function literalPaths(
  file: string,
  text: string,
): [number, string, string][] {
  const dir = dirname(file);
  const lineOf = (index: number) => text.slice(0, index).split("\n").length;
  const found: [number, string, string][] = [];
  // Relative specifiers: static imports and exports, import() and JSDoc's
  // import("…") types.
  for (const m of text.matchAll(
    /(?:\bfrom\s*|\bimport\s*\(\s*|^import\s+)["'](\.\.?\/[^"'$]+)["']/gm,
  )) {
    const [, spec = ""] = m;
    found.push([lineOf(m.index), spec, resolve(dir, spec)]);
  }
  // The folders the script names by variable: its own (`here`) and any
  // `const x = join(here, "…")` built from it, such as the repository root.
  const folders = new Map<string, string>();
  for (const m of text.matchAll(
    new RegExp(String.raw`\bconst (\w+) = ${HERE};`, "g"),
  )) {
    folders.set(m[1] ?? "", dir);
  }
  for (const m of text.matchAll(
    new RegExp(
      String.raw`\bconst (\w+) = (?:join|resolve)\(\s*(${HERE}|\w+)\s*,\s*(${LITERALS})\s*,?\s*\);`,
      "g",
    ),
  )) {
    const [, name = "", from = "", list = ""] = m;
    const base = from.startsWith("dirname(") ? dir : folders.get(from);
    if (base !== undefined) {
      folders.set(name, resolve(base, ...valuesOf(list)));
    }
  }
  // join(folder, "…", …) with literals only, where the folder is the
  // repository root or the script's own.
  for (const m of text.matchAll(
    new RegExp(
      String.raw`\b(?:join|resolve)\(\s*(${HERE}|\w+)\s*,\s*(${LITERALS})\s*,?\s*\)`,
      "g",
    ),
  )) {
    const [, from = "", list = ""] = m;
    const base = from.startsWith("dirname(") ? dir : folders.get(from);
    if (base === undefined || (base !== repo && base !== dir)) {
      continue;
    }
    const path = resolve(base, ...valuesOf(list));
    found.push([lineOf(m.index), relative(repo, path), path]);
  }
  return found;
}

it("finds the paths a script names, and only those it can resolve", () => {
  const file = join(scripts, "example.mjs");
  const text = [
    'import { a } from "../packages/time/src/Instant.ts";',
    '/** @param {import("../src/frames/frames.ts").Frames} f */',
    "const here = dirname(fileURLToPath(import.meta.url));",
    'const root = join(here, "..");',
    'const out = join(root, "src", "time", "leapTable.ts");',
    'const store = join(homedir(), ".cesium-bench");',
    'const data = join(store, "proj");',
    'const later = join(root, "packages", name, "src");',
  ].join("\n");
  expect(
    literalPaths(file, text).map(([line, , path]) => [
      line,
      relative(repo, path),
    ]),
  ).toEqual([
    [1, "packages/time/src/Instant.ts"],
    [2, "src/frames/frames.ts"],
    [4, ""],
    [5, "src/time/leapTable.ts"],
  ]);
});

it("every path a script names from the repository root exists", () => {
  const missing = listMjs(scripts).flatMap((file) =>
    literalPaths(file, readFileSync(file, "utf8"))
      .filter(([, , path]) => !existsSync(path))
      .map(([line, wrote]) => `${relative(repo, file)}:${line}: ${wrote}`),
  );
  expect(missing).toEqual([]);
});

it("every path an area of Dyno's catalog names exists", () => {
  const catalog = JSON.parse(
    readFileSync(join(repo, "bench/suite/catalog/public.json"), "utf8"),
  ) as { areas: { id: string; paths: string[] }[] };
  const missing = catalog.areas.flatMap((area) =>
    area.paths
      .filter((p) => !existsSync(join(repo, p.replace(/\/\*\*$/, ""))))
      .map((p) => `${area.id}: ${p}`),
  );
  expect(catalog.areas.length).toBeGreaterThan(0);
  expect(missing).toEqual([]);
});
