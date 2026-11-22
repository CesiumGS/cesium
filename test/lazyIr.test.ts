// Cesium IR loads on demand (CS-794). Since CS-53 the transform passes sit on
// `src/ir`, and importing them statically put nine more modules (about 47 ms of
// cold start) in front of the first frame of a view with no curvilinear map. The
// seam is `src/transform/lazyIr.ts`: the queries, the world's routes and the
// function maps ask it, and `irPasses.ts` (everything that needs `src/ir`) loads
// by dynamic `import()` when the first curvilinear route or function map needs it.
//
// The first block reads the import graph: from each entry point of the package,
// following static value imports only (a `import type` is erased, a dynamic
// `import()` loads when it runs), no module of `src/ir` may be reached. It names
// every file and line on the chain, so a new eager import is found where it was
// written. The second block runs the seam.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { curvilinear } from "../packages/core/src/transform/graph.ts";
import { packages, repo, resolveSpecifier } from "./packageGraph.ts";

// Files by path from the root; imports by package name follow its entry
// points (test/packageGraph.ts).
const root = repo;
const umbrella = packages.find((p) => p.name === "@cesium/next")!;

interface Import {
  /** The imported file, from the root (`packages/core/src/ir/ad.ts`). */
  readonly to: string;
  /** 1-based line of the import in its file. */
  readonly line: number;
  readonly dynamic: boolean;
}

type Read = (file: string) => string;

const readFromDisk: Read = (file) => readFileSync(join(root, file), "utf8");

/**
 * The imports of `text` as the file `file`, by path and by package name: static ones that load
 * the module (`import { type A } from` does too, under `verbatimModuleSyntax`;
 * only a declaration-level `import type` or `export type` is erased) and
 * dynamic `import("…")`.
 */
function importsOf(file: string, text: string): Import[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
  const out: Import[] = [];
  const add = (node: ts.Node, specifier: string, dynamic: boolean) => {
    const to = resolveSpecifier(file, specifier);
    if (to === undefined) {
      return;
    }
    out.push({
      to,
      line:
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      dynamic,
    });
  };
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.importClause?.isTypeOnly !== true
    ) {
      add(node, node.moduleSpecifier.text, false);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !node.isTypeOnly
    ) {
      add(node, node.moduleSpecifier.text, false);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      add(node, node.arguments[0].text, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/**
 * The chain from `entry` to the first module of `src/ir` it loads, as
 * "file:line → file:line → … → src/ir/x.ts" (each file with the line of its
 * import), or undefined when it loads none. A dynamic import counts only
 * with `throughDynamic`.
 */
function irChain(
  entry: string,
  read: Read = readFromDisk,
  { throughDynamic = false } = {},
): string | undefined {
  const via = new Map<string, string | undefined>([[entry, undefined]]);
  const queue = [entry];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    for (const { to, line, dynamic } of importsOf(file, read(file))) {
      if ((dynamic && !throughDynamic) || via.has(to) || !to.endsWith(".ts")) {
        continue;
      }
      via.set(to, `${file}:${line}`);
      if (to.startsWith("packages/core/src/ir/")) {
        const chain = [to];
        for (let at = via.get(to); at !== undefined;) {
          chain.unshift(at);
          at = via.get(at.slice(0, at.lastIndexOf(":")));
        }
        return chain.join(" → ");
      }
      queue.push(to);
    }
  }
  return undefined;
}

/** The transform modules a view with no curvilinear map starts with. */
const LEAN = [
  "packages/core/src/transform/graph.ts",
  "packages/core/src/transform/route.ts",
  "packages/core/src/transform/accuracy.ts",
  "packages/core/src/transform/queries.ts",
  "packages/core/src/transform/lazyIr.ts",
];

describe("a default view starts without Cesium IR", () => {
  it.each(Object.values(umbrella.entries))(
    "%s loads no module of src/ir",
    (entry) => {
      expect(irChain(entry)).toBeUndefined();
    },
  );

  it.each(LEAN)("%s loads no module of src/ir", (file) => {
    expect(irChain(file)).toBeUndefined();
  });

  it("is not vacuous: Cesium IR is reached through the dynamic import in lazyIr.ts", () => {
    expect(
      irChain("packages/core/src/index.ts", readFromDisk, {
        throughDynamic: true,
      }),
    ).toMatch(
      /^packages\/core\/src\/index\.ts:\d+ → .*packages\/core\/src\/transform\/lazyIr\.ts:\d+ → packages\/core\/src\/transform\/irPasses\.ts:\d+ → .*packages\/core\/src\/ir\//,
    );
  });

  it("fails, naming the line, when a transform module imports Cesium IR statically", () => {
    const planted = (file: string, line: string): Read => {
      return (name) =>
        name === file ? `${line}\n${readFromDisk(name)}` : readFromDisk(name);
    };
    // Directly, in a module the queries load.
    expect(
      irChain(
        "packages/core/src/index.ts",
        planted(
          "packages/core/src/transform/accuracy.ts",
          'import { scalarize } from "../ir/scalarize.ts";',
        ),
      ),
    ).toMatch(
      /src\/transform\/accuracy\.ts:1 → packages\/core\/src\/ir\/scalarize\.ts$/,
    );
    // Through a transform module that has it (the compiler, back as a static import of the world's routes).
    expect(
      irChain(
        "packages/core/src/index.ts",
        planted(
          "packages/core/src/scene/world/routes.ts",
          'import { compileRoute } from "../../transform/compile.ts";',
        ),
      ),
    ).toMatch(
      /src\/scene\/world\/routes\.ts:1 → packages\/core\/src\/transform\/compile\.ts:\d+ → packages\/core\/src\/ir\//,
    );
    // A type import is erased and a dynamic one loads when it runs: neither counts.
    expect(
      irChain(
        "packages/core/src/index.ts",
        planted(
          "packages/core/src/transform/accuracy.ts",
          'import type { Program } from "../ir/types.ts";',
        ),
      ),
    ).toBeUndefined();
    expect(
      irChain(
        "packages/core/src/index.ts",
        planted(
          "packages/core/src/transform/accuracy.ts",
          'const later = () => import("../ir/builder.ts");',
        ),
      ),
    ).toBeUndefined();
  });
});

describe("Cesium IR on demand", () => {
  /** A z-stretch by `k`, with its IR source. */
  const stretch = (source?: string) =>
    curvilinear({
      id: "stretch",
      params: { k: 4 },
      forward: (p, params, out) => {
        out[0] = p[0]!;
        out[1] = p[1]!;
        out[2] = p[2]! * params.k!;
      },
      ...(source !== undefined && { source }),
    }).spec;

  it("asks for it and answers without it, then answers with it", async () => {
    vi.resetModules();
    const lazy = await import("../packages/core/src/transform/lazyIr.ts");
    expect(lazy.irPasses()).toBeUndefined();
    const out = new Float64Array(9);
    const spec = stretch("(p, params) => [p[0], p[1], p[2] * params.k]");
    // Not loaded: no answer (the caller falls back on the function's own Jacobian), and the load starts.
    expect(lazy.adJacobian(spec, [1, 2, 3], { k: 4 }, out)).toBeUndefined();
    await lazy.loadIr();
    expect(lazy.irPasses()).toBeDefined();
    expect(
      Array.from(lazy.adJacobian(spec, [1, 2, 3], { k: 4 }, out)!),
    ).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 4]);
  });

  it("does not load it for a spec that has no IR source", async () => {
    vi.resetModules();
    const lazy = await import("../packages/core/src/transform/lazyIr.ts");
    expect(
      lazy.adJacobian(stretch(), [1, 2, 3], { k: 4 }, new Float64Array(9)),
    ).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(lazy.irPasses()).toBeUndefined();
  });

  it("shares one load, and a later call gets the installed passes at once", async () => {
    vi.resetModules();
    const lazy = await import("../packages/core/src/transform/lazyIr.ts");
    const [a, b] = await Promise.all([lazy.loadIr(), lazy.loadIr()]);
    expect(a).toBe(b);
    expect(await lazy.loadIr()).toBe(a);
    expect(lazy.irPasses()).toBe(a);
  });

  it("parses a function map when Cesium IR arrives, and says changed()", async () => {
    vi.resetModules();
    const { fromFunction } =
      await import("../packages/core/src/transforms/fromFunction.ts");
    const lazy = await import("../packages/core/src/transform/lazyIr.ts");
    const stretchZ = (p: ArrayLike<number>) => [p[0]!, p[1]!, p[2]! * 2];
    const map = fromFunction(stretchZ as never);
    // Until Cesium IR is here the function is not parsed: it is fitted, and says why.
    expect(lazy.irPasses()).toBeUndefined();
    expect(map.compiled).toBe(false);
    expect(map.fitReason).toBe("Cesium IR is loading");
    expect(map.curvilinear).toBeUndefined();
    const before = map.revision;
    await vi.waitFor(() => expect(map.compiled).toBe(true));
    expect(map.fitReason).toBeUndefined();
    expect(map.revision).toBeGreaterThan(before);
    expect(map.curvilinear?.source).toContain("p[2]");
    // And its Jacobian is the autodiff's, exact.
    const j = new Float64Array(9);
    map.forward([1, 2, 3], new Float64Array(3), j);
    expect(Array.from(j)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 2]);
  });

  it("a function map made after Cesium IR is here parses at once", async () => {
    vi.resetModules();
    const lazy = await import("../packages/core/src/transform/lazyIr.ts");
    await lazy.loadIr();
    const { fromFunction } =
      await import("../packages/core/src/transforms/fromFunction.ts");
    const map = fromFunction(((p: ArrayLike<number>) => [
      p[0]!,
      p[1]!,
      p[2]!,
    ]) as never);
    expect(map.compiled).toBe(true);
    expect(map.fitReason).toBeUndefined();
  });
});
