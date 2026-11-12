// The dependency rule between the entry points (spec section 7.7), checked
// over the import graph of `src/` and `widgets/`. The widgets sit on the
// public API only: they import the entry points by the package's name
// (`@cesium/next/time`), as an application would, so they could move to a
// package of their own. Layers are assigned here,
// not by folder (plan 5a's call 2): the ERFA series and the EOP parser stay
// in `src/time/` but count as frames. Type-only imports count too (call 4),
// because published declarations carry them; under `verbatimModuleSyntax`
// only a declaration-level `import type` / `export type` is type-only.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = normalize(join(import.meta.dirname, ".."));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};

/** The package's name: the entry points' specifiers, and how the widgets import them. */
const SELF = "@cesium/next";

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
    "format",
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
  // Routes and warps (plan §13.26): the resolver's contract, like frameResolver.ts.
  "src/camera/route.ts",
  // The bulk shape (5b): neutral, it imports nothing.
  "src/core/bulk.ts",
  // The transform graph's nodes (plan section 13.37): geo-free, it imports nothing.
  "src/transform/graph.ts",
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
  /** Imported by the package's name: `to` is the entry point's file. */
  readonly entry?: true;
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
    if (specifier === SELF || specifier.startsWith(`${SELF}/`)) {
      // The package's own entry point, by name: the file its `exports` names.
      const key = specifier === SELF ? "." : `.${specifier.slice(SELF.length)}`;
      const target = pkg.exports[key];
      if (target === undefined) {
        throw new Error(`${file}: ${specifier} is not an entry point`);
      }
      edges.push({
        to: target.replace(/^\.\//, ""),
        typeOnly,
        ...(dynamic ? { dynamic: true as const } : {}),
        entry: true,
      });
      return;
    }
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
    // Another widgets file, or an entry point by the package's name: never
    // a module under `src/` (even an entry's file, by its path).
    return to === "widgets" || edge.entry === true;
  }
  if (ALLOWED[from].includes(to)) {
    return true;
  }
  return (
    from === "frames" &&
    to === "core" &&
    (edge.typeOnly ||
      FRAMES_CORE_VALUES.has(edge.to) ||
      // The old height-warp helpers delegate to the built-in smooth
      // transforms (plan section 13.37, task 4b) until task 6 moves them
      // into georeference; the built-ins import only the transform core.
      edge.to.startsWith("src/transforms/") ||
      edge.to.startsWith("src/georeference/"))
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
// The built-in transforms (plan section 13.37) are core modules with no geo
// or engine knowledge beyond the transform graph and the spike's closed forms
// (`scene/warpForms.ts`, which imports nothing): they stay loadable on a
// worker and by the compiler, which imports them.
it("the built-in transforms import only the transform core, math and the closed forms", () => {
  const ownFiles = files.filter(
    (f) => f.startsWith("src/transforms/") || f.startsWith("src/georeference/"),
  );
  expect(ownFiles.length).toBeGreaterThan(10);
  const found = ownFiles.flatMap((file) =>
    edgesOf(file)
      .filter(
        (edge) =>
          !(
            edge.to.startsWith("src/transform/") ||
            edge.to.startsWith("src/transforms/") ||
            edge.to.startsWith("src/georeference/") ||
            edge.to.startsWith("src/math/") ||
            edge.to === "src/scene/warpForms.ts"
          ),
      )
      .map((edge) => `${file} → ${edge.to}`),
  );
  expect(found).toEqual([]);
  expect(edgesOf("src/scene/warpForms.ts")).toEqual([]);
});
it("the transform core imports none of the built-ins", () => {
  const found = files
    .filter((f) => f.startsWith("src/transform/"))
    .flatMap((file) =>
      edgesOf(file)
        .filter(
          (edge) =>
            edge.to.startsWith("src/transforms/") ||
            edge.to.startsWith("src/georeference/"),
        )
        .map((edge) => `${file} → ${edge.to}`),
    );
  expect(found).toEqual([]);
});
it("the time controls reach time without frames", () =>
  expect(
    closure("widgets/timeControls.ts").filter((f) => layerOf(f) === "frames"),
  ).toEqual([]));
it("the widgets import only each other and the entry points, by the package's name", () =>
  expect(violations("widgets")).toEqual([]));
it("refuses an internal import from the widgets", () => {
  const edges = edgesOfText(
    "widgets/sample.ts",
    [
      'import { Emitter } from "../src/core/Emitter.ts";',
      'import type { Frame } from "../src/frames/Frame.ts";',
      'import { Engine } from "../src/index.ts";',
      'import { Clock } from "@cesium/next/time";',
      'import { Viewer } from "./Viewer.ts";',
      'const frames = import("@cesium/next/frames");',
    ].join("\n"),
  );
  expect(
    edges.filter((edge) => !allowed("widgets", edge)).map((edge) => edge.to),
  ).toEqual(["src/core/Emitter.ts", "src/frames/Frame.ts", "src/index.ts"]);
  expect(edges.filter((edge) => edge.entry).map((edge) => edge.to)).toEqual([
    "src/time/index.ts",
    "src/frames/index.ts",
  ]);
  expect(() =>
    edgesOfText("widgets/sample.ts", 'import "@cesium/next/nowhere";'),
  ).toThrow(/not an entry point/);
});
// The file graph can't say what a bundler keeps from an entry point that
// imports every precise provider: tree shaking decides (the package's
// `sideEffects`, and no top-level code that a bundler can't prove pure).
// So this builds a page that only creates a Viewer, as an application does.
it("a globe-only Viewer bundles no X, Y or s series, Earth orientation, EOP parser or ephemeris (plan 5a's call 32)", () => {
  const report = execFileSync(
    process.execPath,
    [join(root, "scripts/checkBundle.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  expect(report).toContain("no X, Y or s series and no DAF reader");
}, 120_000);
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

// Layers inside the core (plan section 13.17): content, scene, renderer and
// GPU. Assigned by file, like the rest. Content must not reach the renderer,
// the GPU layer or the classes that hold them; the renderer may not reach
// content's internals.
type CoreTier = "gpu" | "renderer" | "scene" | "content";

/** Whole classes that give access to both sides. Content uses `DrawSink`. */
const WHOLES = new Set([
  "src/scene/World.ts",
  "src/scene/Engine.ts",
  "src/scene/RenderContext.ts",
]);

function tierOf(file: string): CoreTier | undefined {
  if (file.startsWith("src/gpu/")) {
    return "gpu";
  }
  if (
    file.startsWith("src/render/") ||
    file.startsWith("src/shaders/") ||
    /^src\/atmosphere\/(RealtimeAtmosphere|Sky|AtmosphereReference)\.ts$/.test(
      file,
    ) ||
    file.startsWith("src/lighting/")
  ) {
    return "renderer";
  }
  if (
    file.startsWith("src/streaming/") ||
    file.startsWith("src/globe/") ||
    file.startsWith("src/tiles/") ||
    (file.startsWith("src/io/") && layerOf(file) === "core")
  ) {
    return "content";
  }
  return layerOf(file) === "core" ? "scene" : undefined;
}

/**
 * Edges the layers don't allow yet, each with why. A stale entry fails too.
 */
const TIER_EXCEPTIONS: Readonly<Record<string, string>> = {
  // A plain function with no GPU types: a kernel is computed once, off the main thread.
  "src/io/worker.ts → src/render/post/glareKernel.ts":
    "the worker computes a glare kernel",
  // Public signatures, for the API review (5i): `Tileset3D.world`,
  // `Tileset3D.load`, `Globe.create`.
  "src/streaming/Tileset3D.ts → src/scene/World.ts": "public signature",
  "src/streaming/Tileset3D.ts → src/scene/Engine.ts": "public signature",
  "src/globe/Globe.ts → src/scene/World.ts": "public signature",
  "src/globe/Globe.ts → src/scene/Engine.ts": "public signature",
  // Imagery composites on the GPU: rasterizer code that lives with content.
  "src/globe/GlobeImagery.ts → src/scene/RenderContext.ts":
    "composites on the GPU",
  "src/globe/GlobeImagery.ts → src/shaders/generated/imagery.wgsl":
    "composites on the GPU",
};

/** The renderer's imports from content (plan section 13.17 wants none). */
const RENDERER_READS_CONTENT = [
  "src/render/view/engineRaster.ts → src/globe/ImageryProvider.ts",
  "src/render/view/engineRaster.ts → src/globe/cityLight.ts",
  "src/render/view/picks.ts → src/globe/Globe.ts",
  "src/render/view/viewBlocks.ts → src/globe/cityLight.ts",
];

/** Each edge from a tier that its rule refuses, as "<from> → <to>". */
function tierViolations(
  tier: CoreTier,
  refuses: (to: string, edge: Edge) => boolean,
): string[] {
  const out = new Set<string>();
  for (const file of files.filter((f) => tierOf(f) === tier)) {
    for (const edge of edgesOf(file)) {
      if (refuses(edge.to, edge)) {
        out.add(`${file} → ${edge.to}`);
      }
    }
  }
  return [...out];
}

const contentRefuses = (to: string) =>
  WHOLES.has(to) || tierOf(to) === "renderer" || tierOf(to) === "gpu";

it("content imports no renderer, GPU types or the classes holding them, but for its named exceptions", () => {
  const found = tierViolations("content", contentRefuses);
  expect(found.filter((edge) => !(edge in TIER_EXCEPTIONS))).toEqual([]);
  // An exception that no longer happens is one to delete.
  expect(
    Object.keys(TIER_EXCEPTIONS).filter((edge) => !found.includes(edge)),
  ).toEqual([]);
});
it("refuses a content file that imports the renderer or a whole class", () => {
  const edges = edgesOfText(
    "src/streaming/sample.ts",
    [
      'import { RECORD_SIZE } from "../render/layout.ts";',
      'import type { World } from "../scene/World.ts";',
      'import type { GpuDevice } from "../gpu/GpuDevice.ts";',
      'import type { DrawHandle } from "../scene/world/types.ts";',
      'import { Tile } from "./Tile.ts";',
    ].join("\n"),
  );
  expect(
    edges.filter((edge) => contentRefuses(edge.to)).map((edge) => edge.to),
  ).toEqual([
    "src/render/layout.ts",
    "src/scene/World.ts",
    "src/gpu/GpuDevice.ts",
  ]);
  expect(tierOf("src/streaming/sample.ts")).toBe("content");
});
/**
 * The rasterizer-side members `text` reads off something: `x.raster`,
 * `x["raster"]`, and `raster` taken out by destructuring (a declaration, a
 * parameter or an assignment), for each name in `names`. Syntax alone: it
 * can't tell a World's from another class's, so a name that content uses
 * for its own must stay off `names`.
 */
function readsMembers(text: string, names: readonly string[]): string[] {
  const source = ts.createSourceFile(
    "sample.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Set<string>();
  const note = (name: string | undefined) => {
    if (name !== undefined && names.includes(name)) {
      found.add(name);
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node)) {
      note(node.name.text);
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      note(node.argumentExpression.text);
    } else if (ts.isBindingElement(node)) {
      const key = node.propertyName ?? node.name;
      if (
        ts.isObjectBindingPattern(node.parent) &&
        (ts.isIdentifier(key) || ts.isStringLiteralLike(key))
      ) {
        note(key.text);
      }
    } else if (
      (ts.isShorthandPropertyAssignment(node) ||
        ts.isPropertyAssignment(node)) &&
      ts.isObjectLiteralExpression(node.parent) &&
      ts.isBinaryExpression(node.parent.parent) &&
      node.parent.parent.left === node.parent &&
      (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name))
    ) {
      note(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...found];
}

/** What content may not read off a World or an Engine: their rasterizer data and GPU context. */
const ENGINE_ONLY = ["raster", "ctx"];

it("content never reads a world's rasterizer data or an engine's GPU context", () => {
  const reads = files
    .filter((f) => tierOf(f) === "content")
    .flatMap((f) => {
      // `GlobeImagery` holds a `RenderContext` of its own (a named
      // exception above) and reads its `ctx`; its `raster` stays refused.
      const own = edgesOf(f).some((e) => e.to === "src/scene/RenderContext.ts");
      return readsMembers(
        readFileSync(join(root, f), "utf8"),
        own ? ["raster"] : ENGINE_ONLY,
      ).map((name) => `${f}: ${name}`);
    });
  expect(reads).toEqual([]);
});
it("refuses a read of a member through a destructure, an index or a path", () => {
  const plants = [
    "const { raster } = t.world;",
    "const { raster: r } = t.world;",
    "function f({ raster }: World) {}",
    "let raster; ({ raster } = t.world);",
    "const r = t.world['raster'];",
    "const r = t.world.raster.drawCount;",
    "t.world.ctx.device.createBuffer(d);",
  ];
  for (const plant of plants) {
    expect(readsMembers(plant, ENGINE_ONLY), plant).not.toEqual([]);
  }
  expect(readsMembers("const raster = 1; f({ raster });", ["raster"])).toEqual(
    [],
  );
});
it("only the renderer and World import the draw bundles", () => {
  // `World` rebuilds and culls its bundle; no other scene or content file may.
  const importers = files
    .filter((f) => tierOf(f) !== "renderer" && f !== "src/scene/World.ts")
    .filter((f) =>
      edgesOf(f).some((e) => e.to === "src/render/world/bundles.ts"),
    );
  expect(importers).toEqual([]);
});
it("the GPU layer imports nothing above it, but for the environment kernel", () =>
  expect(
    tierViolations("gpu", (to) => {
      const tier = tierOf(to);
      return tier !== undefined && tier !== "gpu";
    }),
  ).toEqual(["src/gpu/Environment.ts → src/shaders/generated/ibl.wgsl"]));
it("the renderer reaches content only where named", () =>
  // `picks.ts` asks a Globe for its rays; the rest is the city lights' data.
  expect(
    tierViolations("renderer", (to) => tierOf(to) === "content").sort(),
  ).toEqual(RENDERER_READS_CONTENT));
it("scene data doesn't import rasterizer data", () => {
  // Every file of the scene side's state: what its tick keeps of a world, an
  // engine and a view, apart from what the renderer keeps.
  const scenes = [
    "src/scene/world/worldScene.ts",
    "src/scene/engineScene.ts",
    "src/scene/viewAnchorState.ts",
  ];
  const rasters = new Set([
    "src/render/world/worldRaster.ts",
    "src/render/view/engineRaster.ts",
    "src/render/view/viewFrameData.ts",
    "src/render/world/bundles.ts",
  ]);
  for (const file of scenes) {
    expect(tierOf(file), file).toBe("scene");
    expect(
      edgesOf(file)
        .map((edge) => edge.to)
        .filter((to) => rasters.has(to)),
      file,
    ).toEqual([]);
  }
});
it("the observer's settings, a stage's definition and the sky pack's format hold no GPU types", () => {
  for (const file of [
    "src/scene/observer.ts",
    "src/scene/postStage.ts",
    "src/atmosphere/skyPack.ts",
    "src/scene/lightList.ts",
    "src/render/post/veilWeights.ts",
    "src/render/post/glareKernel.ts",
  ]) {
    const code = readFileSync(join(root, file), "utf8");
    expect(code.match(/\bGPU[A-Z]\w*/g) ?? [], file).toEqual([]);
    expect(
      edgesOf(file)
        .map((edge) => edge.to)
        .filter(
          (to) =>
            /^src\/(gpu|render)\//.test(to) &&
            !/^src\/render\/post\/(veilWeights|glareKernel)/.test(to),
        ),
      file,
    ).toEqual([]);
  }
});
it("package.json exports the entry points", () =>
  expect(Object.keys(pkg.exports)).toEqual([
    ".",
    "./time",
    "./frames",
    "./proj",
    "./measure",
    "./widgets",
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
