// Cycles among value imports in `src/` and `widgets/`. A module on a cycle can
// run before what it imports has been evaluated, so `class Globe extends
// Tileset3D` could meet an undefined base class if a helper imported back from
// `Tileset3D.ts` or `World.ts`. Type-only imports are erased and can't do that.
// Under `verbatimModuleSyntax` only a declaration-level `import type` or
// `export type` is erased: `import { type A } from "./a.ts"` still loads `a.ts`.
// A dynamic `import("…")` loads when called, after evaluation, so it isn't an
// edge here.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = normalize(join(import.meta.dirname, ".."));

/** The relative value imports of `text`, read as the file `file`. */
export function valueImports(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
  const out: string[] = [];
  const add = (specifier: string) => {
    if (specifier.startsWith(".")) {
      const path = specifier.replace(/\?.*$/, "");
      out.push(normalize(join(dirname(file), path)).replaceAll("\\", "/"));
    }
  };
  ts.forEachChild(source, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.importClause?.isTypeOnly !== true
    ) {
      add(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !node.isTypeOnly
    ) {
      add(node.moduleSpecifier.text);
    }
  });
  return out;
}

/**
 * Tarjan's strongly connected components with more than one module, or one
 * module importing itself. Each is sorted, and so is the list.
 */
export function importCycles(
  graph: ReadonlyMap<string, readonly string[]>,
): string[][] {
  let next = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const cycles: string[][] = [];
  const visit = (v: string) => {
    index.set(v, next);
    low.set(v, next);
    next++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) {
        continue;
      }
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      if (component.length > 1 || graph.get(v)?.includes(v)) {
        cycles.push(component.sort());
      }
    }
  };
  for (const v of graph.keys()) {
    if (!index.has(v)) {
      visit(v);
    }
  }
  return cycles.sort((a, b) => a[0]!.localeCompare(b[0]!));
}

function listTs(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        return listTs(path);
      }
      return entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")
        ? [path]
        : [];
    },
  );
}

/** The cycles that exist, each with its reason. Shrink this; don't grow it. */
const KNOWN_CYCLES: readonly (readonly string[])[] = [
  // RenderContext makes a ShaderCache; ShaderCache takes constants from it.
  ["src/scene/RenderContext.ts", "src/scene/ShaderCache.ts"],
  // sun.ts turns the sun with icrfToFixed; celestial.ts takes sun.ts's times.
  ["src/time/celestial.ts", "src/time/sun.ts"],
];

describe("the import-cycle check", () => {
  it("flags cycles, and only cycles", () => {
    const graph = (edges: Record<string, string[]>) =>
      new Map(Object.entries(edges));
    expect(importCycles(graph({ a: ["b"], b: ["c"], c: [] }))).toEqual([]);
    expect(importCycles(graph({ a: ["b"], b: ["a"] }))).toEqual([["a", "b"]]);
    expect(importCycles(graph({ a: ["a"] }))).toEqual([["a"]]);
    // Two separate cycles, reached through a module on neither.
    expect(
      importCycles(
        graph({
          entry: ["a", "x"],
          a: ["b"],
          b: ["c"],
          c: ["a"],
          x: ["y"],
          y: ["x"],
        }),
      ),
    ).toEqual([
      ["a", "b", "c"],
      ["x", "y"],
    ]);
    // An import of something outside the graph isn't an edge.
    expect(importCycles(graph({ a: ["outside"] }))).toEqual([]);
  });

  it("flags the case it exists for: a helper importing back from its base class", () => {
    const sources: Record<string, string> = {
      "src/globe/Globe.ts": `import { Tileset3D } from "../streaming/Tileset3D.ts";
        export class Globe extends Tileset3D {}`,
      "src/streaming/Tileset3D.ts": `import { helper } from "./helper.ts";
        export class Tileset3D { x = helper(); }`,
      "src/streaming/helper.ts": `import { Tileset3D } from "./Tileset3D.ts";
        export const helper = () => Tileset3D;`,
    };
    const graph = new Map(
      Object.entries(sources).map(([file, text]) => [
        file,
        valueImports(file, text),
      ]),
    );
    expect(importCycles(graph)).toEqual([
      ["src/streaming/Tileset3D.ts", "src/streaming/helper.ts"],
    ]);
  });

  it("reads what loads a module: not `import type`, but an inline `type` does", () => {
    const file = "src/a/b.ts";
    expect(valueImports(file, `import type { A } from "./a.ts";`)).toEqual([]);
    expect(valueImports(file, `export type { A } from "./a.ts";`)).toEqual([]);
    expect(valueImports(file, `import { A } from "./a.ts";`)).toEqual([
      "src/a/a.ts",
    ]);
    expect(valueImports(file, `import { type A } from "./a.ts";`)).toEqual([
      "src/a/a.ts",
    ]);
    expect(valueImports(file, `import "../c.ts";`)).toEqual(["src/c.ts"]);
    expect(valueImports(file, `export * from "./a.ts";`)).toEqual([
      "src/a/a.ts",
    ]);
    expect(valueImports(file, `export { A } from "./a.ts";`)).toEqual([
      "src/a/a.ts",
    ]);
    expect(valueImports(file, `import("./a.ts");`)).toEqual([]);
    expect(valueImports(file, `import x from "lib";`)).toEqual([]);
    expect(valueImports(file, `import s from "./a.slang?raw";`)).toEqual([
      "src/a/a.slang",
    ]);
  });
});

describe("value imports in src/ and widgets/", () => {
  it("have no cycles beyond the known ones", () => {
    const files = [...listTs("src"), ...listTs("widgets")];
    const graph = new Map(
      files.map((file) => [
        file,
        valueImports(file, readFileSync(join(root, file), "utf8")),
      ]),
    );
    // Every file is seen, and the graph has edges to walk.
    expect(graph.has("src/scene/Engine.ts")).toBe(true);
    expect(graph.has("widgets/Viewer.ts")).toBe(true);
    expect(graph.get("src/globe/Globe.ts")).toContain(
      "src/streaming/Tileset3D.ts",
    );
    expect(importCycles(graph)).toEqual(KNOWN_CYCLES);
  });
});
