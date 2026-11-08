// The dependency rule between the entry points (spec section 7.7), checked
// over the import graph of `src/` and `widgets/`. Layers are assigned here,
// not by folder (plan 5a's call 2): the ERFA series and the EOP parser stay
// in `src/time/` but count as frames. Type-only imports count too (call 4),
// because published declarations carry them; under `verbatimModuleSyntax`
// only a declaration-level `import type` / `export type` is type-only.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = normalize(join(import.meta.dirname, ".."));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};

type Layer =
  "neutral" | "time" | "frames" | "proj" | "measure" | "widgets" | "core";

const TIME_FILES = new Set(
  [
    "Instant",
    "leapSeconds",
    "leapTable",
    "Clock",
    "sun",
    "moon",
    "celestial",
    "index",
  ]
    .map((name) => `src/time/${name}.ts`)
    .concat(["src/time/erfa/dtdb.ts", "src/time/erfa/dtdbTable.ts"]),
);

/** The layer of a repository path (forward slashes, from the package). */
function layerOf(file: string): Layer {
  if (
    file.startsWith("src/math/") ||
    file.startsWith("src/core/") ||
    file === "src/io/readWithProgress.ts"
  ) {
    return "neutral";
  }
  if (TIME_FILES.has(file)) {
    return "time";
  }
  if (
    file.startsWith("src/frames/") ||
    file.startsWith("src/time/") ||
    file.startsWith("src/ephemeris/") ||
    file.startsWith("src/trajectory/")
  ) {
    return "frames";
  }
  if (file.startsWith("src/engineering/") || file.startsWith("src/proj/")) {
    return "proj";
  }
  if (file.startsWith("src/measure/")) {
    return "measure";
  }
  if (file.startsWith("widgets/")) {
    return "widgets";
  }
  return "core";
}

/** Core modules the frames layer may import values from. */
const FRAMES_CORE_VALUES = new Set([
  "src/scene/Body.ts",
  "src/camera/frameResolver.ts",
]);

/** The layers each layer may import (values and types). */
const ALLOWED: Record<Exclude<Layer, "widgets">, readonly Layer[]> = {
  neutral: ["neutral"],
  core: ["core", "neutral"],
  time: ["time", "neutral"],
  frames: ["frames", "time", "neutral"],
  proj: ["proj", "frames", "time", "core", "neutral"],
  measure: ["measure", "proj", "frames", "time", "core", "neutral"],
};

interface Edge {
  readonly to: string;
  readonly typeOnly: boolean;
  /** A re-export (`export … from`), which an entry index publishes. */
  readonly reexport: boolean;
}

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...listTs(path));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

const files = [...listTs("src"), ...listTs("widgets")];
const edgeCache = new Map<string, Edge[]>();

/** Each relative import of a file: static, re-export, dynamic, type. */
function edgesOf(file: string): Edge[] {
  const cached = edgeCache.get(file);
  if (cached) {
    return cached;
  }
  const text = readFileSync(join(root, file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
  const edges: Edge[] = [];
  const add = (specifier: string, typeOnly: boolean, reexport: boolean) => {
    if (!specifier.startsWith(".")) {
      return; // packages are outside the rule
    }
    const path = specifier.replace(/\?.*$/, "");
    const to = relative(root, join(root, dirname(file), path)).replaceAll(
      "\\",
      "/",
    );
    edges.push({ to, typeOnly, reexport });
  };
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      add(
        node.moduleSpecifier.text,
        node.importClause?.isTypeOnly === true,
        false,
      );
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      add(node.moduleSpecifier.text, node.isTypeOnly, true);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      add(node.arguments[0].text, false, false);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      add(node.argument.literal.text, true, false);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  edgeCache.set(file, edges);
  return edges;
}

function allowed(from: Layer, edge: Edge): boolean {
  const to = layerOf(edge.to);
  if (from === "widgets") {
    return true;
  }
  if (ALLOWED[from].includes(to)) {
    return true;
  }
  return (
    from === "frames" &&
    to === "core" &&
    (edge.typeOnly || FRAMES_CORE_VALUES.has(edge.to))
  );
}

/** Each broken rule from a layer's files, as "<from> → <to>". */
function violations(layer: Layer): string[] {
  const out: string[] = [];
  for (const file of files.filter((f) => layerOf(f) === layer)) {
    for (const edge of edgesOf(file)) {
      if (!allowed(layer, edge)) {
        out.push(`${file} → ${edge.to}`);
      }
    }
  }
  return out;
}

/** Every file a file reaches through its imports, itself included. */
function closure(start: string): string[] {
  const seen = new Set([start]);
  const queue = [start];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    for (const { to } of edgesOf(file)) {
      if (to.endsWith(".ts") && !seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  return [...seen].sort();
}

/** Each entry's re-export of a module outside its layer and the neutral ones. */
function entryLeaks(): string[] {
  const out: string[] = [];
  for (const path of Object.values(pkg.exports)) {
    const entry = path.replace(/^\.\//, "");
    const layer = layerOf(entry);
    for (const edge of edgesOf(entry)) {
      const to = layerOf(edge.to);
      if (edge.reexport && to !== layer && to !== "neutral") {
        out.push(`${entry} → ${edge.to}`);
      }
    }
  }
  return out;
}

it("the core imports nothing from time, frames, proj or measure", () => {
  expect(violations("core")).toEqual([]);
});
it("the neutral modules import only each other", () =>
  expect(violations("neutral")).toEqual([]));
it("time imports only time and neutral modules", () =>
  expect(violations("time")).toEqual([]));
it("frames imports time, neutral modules, core types, Body and the resolver", () =>
  expect(violations("frames")).toEqual([]));
it("proj and measure follow their rules", () => {
  expect(violations("proj")).toEqual([]);
  expect(violations("measure")).toEqual([]);
});
it("the time controls reach time without frames", () =>
  expect(
    closure("widgets/timeControls.ts").filter((f) => layerOf(f) === "frames"),
  ).toEqual([]));
it("each entry re-exports only its own layer", () =>
  expect(entryLeaks()).toEqual([]));
it("package.json exports the five entry points", () =>
  expect(Object.keys(pkg.exports)).toEqual([
    ".",
    "./time",
    "./frames",
    "./proj",
    "./measure",
  ]));
it("finds imports of every kind and classifies them", () => {
  // The checker is only as good as its parser: a sample of known edges.
  expect(layerOf("src/time/erfa/xy06.ts")).toBe("frames");
  expect(layerOf("src/time/erfa/dtdb.ts")).toBe("time");
  expect(layerOf("src/io/readWithProgress.ts")).toBe("neutral");
  expect(layerOf("src/io/ion.ts")).toBe("core");
  expect(edgesOf("src/time/Instant.ts")).toContainEqual({
    to: "src/time/leapSeconds.ts",
    typeOnly: true,
    reexport: false,
  });
  expect(edgesOf("src/index.ts")).toContainEqual({
    to: "src/scene/Engine.ts",
    typeOnly: false,
    reexport: true,
  });
});
