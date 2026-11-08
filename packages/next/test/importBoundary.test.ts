// The dependency rule between the entry points (spec section 7.7), checked
// over the import graph of `src/` and `widgets/`. Layers are assigned here,
// not by folder (plan 5a's call 2): the ERFA series and the EOP parser stay
// in `src/time/` but count as frames. Type-only imports count too (call 4),
// because published declarations carry them; under `verbatimModuleSyntax`
// only a declaration-level `import type` / `export type` is type-only.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = normalize(join(import.meta.dirname, ".."));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};

type Layer =
  "utilities" | "time" | "frames" | "proj" | "measure" | "widgets" | "core";

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
    return "utilities";
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
  utilities: ["utilities"],
  core: ["core", "utilities"],
  time: ["time", "utilities"],
  frames: ["frames", "time", "utilities"],
  proj: ["proj", "frames", "time", "core", "utilities"],
  measure: ["measure", "proj", "frames", "time", "core", "utilities"],
};

interface Edge {
  readonly to: string;
  readonly typeOnly: boolean;
  /** A dynamic `import("…")`: loaded when called, so not bundled with the importer. */
  readonly dynamic?: true;
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

/** Each relative import of a file (from the package, as `src/a/b.ts`). */
function edgesOf(file: string): Edge[] {
  const cached = edgeCache.get(file);
  if (cached) {
    return cached;
  }
  const edges = edgesOfText(file, readFileSync(join(root, file), "utf8"));
  edgeCache.set(file, edges);
  return edges;
}

/**
 * Each relative import in `text`, read as the file `file`: static imports
 * and re-exports, dynamic `import("…")`, and `import("…").T` type nodes.
 */
function edgesOfText(file: string, text: string): Edge[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
  const edges: Edge[] = [];
  const add = (specifier: string, typeOnly: boolean, dynamic = false) => {
    if (!specifier.startsWith(".")) {
      return; // packages are outside the rule
    }
    const path = specifier.replace(/\?.*$/, "");
    const to = relative(root, join(root, dirname(file), path)).replaceAll(
      "\\",
      "/",
    );
    edges.push(dynamic ? { to, typeOnly, dynamic } : { to, typeOnly });
  };
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      add(node.moduleSpecifier.text, node.importClause?.isTypeOnly === true);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      add(node.moduleSpecifier.text, node.isTypeOnly);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      add(node.arguments[0].text, false, true);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      add(node.argument.literal.text, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
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

/**
 * Every file a file reaches through its imports, itself included. With
 * `bundled`, only what a bundler puts beside it: value imports, not type
 * imports (erased) or dynamic ones (where loading stops, in a chunk of
 * their own).
 */
function closure(start: string, { bundled = false } = {}): string[] {
  const seen = new Set([start]);
  const queue = [start];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    for (const { to, typeOnly, dynamic } of edgesOf(file)) {
      if (bundled && (typeOnly || dynamic)) {
        continue;
      }
      if (to.endsWith(".ts") && !seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  return [...seen].sort();
}

interface Published {
  readonly entry: string;
  readonly name: string;
  /** Where the name is declared, resolved by the checker. */
  readonly file: string;
}

let published: Published[] | undefined;

/**
 * Each name each entry publishes, with the file that declares it. The
 * checker follows every hop to the declaration: `export … from` chains, a
 * module that imports a name and exports it again (`import { X }; export
 * { X }`), and `export *`.
 */
function publishedNames(): Published[] {
  if (published) {
    return published;
  }
  const entries = Object.values(pkg.exports).map((path) =>
    path.replace(/^\.\//, ""),
  );
  const program = ts.createProgram(
    entries.map((entry) => join(root, entry)),
    {
      noEmit: true,
      skipLibCheck: true,
      types: [],
      allowImportingTsExtensions: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  );
  const checker = program.getTypeChecker();
  const out: Published[] = [];
  for (const entry of entries) {
    const index = program.getSourceFile(join(root, entry));
    const moduleSymbol = index && checker.getSymbolAtLocation(index);
    if (!moduleSymbol) {
      throw new Error(`${entry}: not in the program`);
    }
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      for (const declaration of target.declarations ?? []) {
        const file = relative(root, declaration.getSourceFile().fileName)
          .split(sep)
          .join("/");
        out.push({ entry, name: symbol.name, file });
      }
    }
  }
  return (published = out);
}

/**
 * Each name an entry publishes that is declared outside its layer and the
 * utilities, as "<entry> → <declaring file> (<name>)".
 */
function entryLeaks(): string[] {
  const out = new Set<string>();
  for (const { entry, name, file } of publishedNames()) {
    const to = layerOf(file);
    if (!file.startsWith("..") && to !== layerOf(entry) && to !== "utilities") {
      out.add(`${entry} → ${file} (${name})`);
    }
  }
  return [...out];
}

it("the core imports nothing from time, frames, proj or measure", () => {
  expect(violations("core")).toEqual([]);
});
it("the utilities import only each other", () =>
  expect(violations("utilities")).toEqual([]));
it("time imports only time and utilities", () =>
  expect(violations("time")).toEqual([]));
it("frames imports time, utilities, core types, Body and the resolver", () =>
  expect(violations("frames")).toEqual([]));
it("proj and measure follow their rules", () => {
  expect(violations("proj")).toEqual([]);
  expect(violations("measure")).toEqual([]);
});
it("the time controls reach time without frames", () =>
  expect(
    closure("widgets/timeControls.ts").filter((f) => layerOf(f) === "frames"),
  ).toEqual([]));
it("the Viewer bundles no X, Y or s series, Earth orientation, EOP parser or ephemeris (plan 5a's call 32)", () => {
  const bundled = closure("widgets/Viewer.ts", { bundled: true });
  // The analytic catalog and the sky are bundled; the precise providers load
  // by dynamic import().
  expect(bundled).toContain("src/frames/catalog.ts");
  expect(bundled).toContain("src/frames/attachSky.ts");
  expect(
    bundled.filter(
      (f) =>
        f === "src/time/erfa/xy06Table.ts" ||
        f === "src/time/erfa/s06Table.ts" ||
        f === "src/time/earthOrientation.ts" ||
        f === "src/time/eop.ts" ||
        f.startsWith("src/ephemeris/"),
    ),
  ).toEqual([]);
  // Reached, but only by import(): the providers.
  expect(closure("widgets/Viewer.ts")).toContain("src/time/eop.ts");
});
it(
  "each entry publishes only names declared in its own layer",
  () =>
    // Resolved through the checker, so a name re-exported by way of another
    // module (an `export … from` chain, or `import { X }; export { X }`)
    // counts where it is declared.
    expect(entryLeaks()).toEqual([]),
  30_000,
);
it("resolves each published name to the file that declares it", () => {
  const where = (entry: string, name: string) =>
    publishedNames()
      .filter((p) => p.entry === entry && p.name === name)
      .map((p) => p.file);
  // Through measure/constants.ts's re-export, to the math module.
  expect(where("src/measure/index.ts", "C")).toEqual(["src/math/constants.ts"]);
  expect(where("src/frames/index.ts", "earthOrientationSigma")).toEqual([
    "src/frames/orientationSigma.ts",
  ]);
  expect(where("src/index.ts", "Engine")).toEqual(["src/scene/Engine.ts"]);
}, 30_000);
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
  expect(layerOf("src/io/readWithProgress.ts")).toBe("utilities");
  expect(layerOf("src/io/ion.ts")).toBe("core");
  expect(edgesOf("src/time/Instant.ts")).toContainEqual({
    to: "src/time/leapSeconds.ts",
    typeOnly: true,
  });
  const edges = edgesOfText(
    "src/frames/sample.ts",
    [
      'const later = import("../scene/World.ts");',
      'let pose: import("../scene/Camera.ts").CameraPose;',
      'import { type Tile } from "../streaming/Tile.ts";',
      'import type { View } from "../scene/View.ts";',
      'export type { Body } from "../scene/Body.ts";',
      'export { Frame } from "./Frame.ts";',
      'import { Ellipsoid } from "@cesium/elsewhere";',
      'import sky from "../shaders/generated/sky.wgsl?raw";',
    ].join("\n"),
  );
  expect(edges).toEqual([
    // Dynamic import: a value, loaded when called.
    { to: "src/scene/World.ts", typeOnly: false, dynamic: true },
    // An import type node: type-only.
    { to: "src/scene/Camera.ts", typeOnly: true },
    // An inline `{ type X }` still loads the module (verbatimModuleSyntax).
    { to: "src/streaming/Tile.ts", typeOnly: false },
    { to: "src/scene/View.ts", typeOnly: true },
    // `export type … from`: type-only.
    { to: "src/scene/Body.ts", typeOnly: true },
    { to: "src/frames/Frame.ts", typeOnly: false },
    // Packages are skipped; a query suffix is dropped.
    { to: "src/shaders/generated/sky.wgsl", typeOnly: false },
  ]);
});
