// The dependency rule between 2.0's packages, read from their package.json
// files (docs/design/package-map.md, "The rule that replaces layerOf";
// CS-835), and, below, the tiers inside the core, which stay path patterns
// rooted at packages/core/src. Type-only imports count too, because
// published declarations carry them; under `verbatimModuleSyntax` only a
// declaration-level `import type` / `export type` is type-only.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import {
  listTs as listRepoTs,
  namedPackage,
  packageInfo,
  packageOf,
  packages,
  repo,
  resolveSpecifier,
  type PackageInfo,
} from "./packageGraph.ts";

/** The capability packages, in their order (a seventh is a deliberate change). */
const CAPABILITIES = [
  "@cesium/core",
  "@cesium/time",
  "@cesium/frames",
  "@cesium/crs",
  "@cesium/measure",
  "@cesium/ui",
] as const;

/** The umbrella: it depends on the standard set and re-exports it. */
const UMBRELLA = "@cesium/next";

/**
 * Where a package other than the umbrella re-exports another package's
 * names, each with why (the package map's rule 5). A stale entry fails.
 */
const REEXPORTS: Readonly<Record<string, string>> = {
  "packages/measure/src/constants.ts → @cesium/core/internal":
    "measure's C and the constants it measures with, from the math utilities",
  "packages/measure/src/motion.ts → @cesium/frames/internal":
    "the motion helpers measure states its rates with",
  "packages/crs/src/engineering/crs.ts → @cesium/frames":
    "types: the coordinate service's CRS reference, units and area of interest",
  "packages/crs/src/engineering/factors.ts → @cesium/frames":
    "type: the coordinate service's grid factors",
};

/**
 * The names a sibling may import from an internal entry (CS-883): outside
 * the stable API, for lockstep siblings only. A name not here fails, and so
 * does one here that the entry doesn't export.
 */
const INTERNAL_NAMES: Readonly<Record<string, readonly string[]>> = {
  "@cesium/core/internal": [
    ...["C", "EARTH_ROTATION_RATE", "GM_EARTH", "GM_MOON", "GM_SUN", "L_C"],
    ...["CurvilinearFrameSpec", "CurvilinearMap", "CurvilinearScale"],
    ...["CurvilinearSpec", "CurvilinearTerm", "CurvilinearTerms"],
    ...["Edge", "EdgeAccuracy", "Mat4", "NonAffineRouteError", "PlainEdge"],
    ...["Route", "RouteStep", "SlicePool", "TermWeight", "TileVolume"],
    ...["TilesetBodyError"],
    ...["TransformGraph", "TransformNode", "Vec3", "ViewId", "affine"],
    ...["congruence", "copy", "curvilinear", "curvilinearForward"],
    ...["curvilinearInverse", "curvilinearScaleOf", "curvilinearValuesOf"],
    ...["eastNorthUpToFixedFrame", "identity", "invertAffine", "isCentered"],
    ...["isOnPolarAxis", "mat4", "multiply", "obbDistanceSquaredTo"],
    ...["projectThrough", "projectToPixel", "rigidMatrixError"],
    ...["routeForward", "routeInverse", "routeIsAffine", "routeMap"],
    ...["sha256Hex", "sphereDistance", "switchEdge", "tilesetBody"],
    ...["transformPoint", "vec3", "volumeObb"],
  ],
  "@cesium/frames/internal": [
    ...["DE440_EARTH_MOON_METERS", "Frames", "Sampler", "derivative"],
    ...["framesDataFormatProblem", "positionIn", "velocityIn"],
  ],
  "@cesium/crs/internal": ["projResolution"],
};

/** One import or re-export in a package's file, from the root. */
interface PackageEdge {
  readonly from: string;
  readonly line: number;
  readonly specifier: string;
  /** The file it loads, from the root; undefined for an outside package. */
  readonly to: string | undefined;
  readonly typeOnly: boolean;
  /** An `export … from`: the file republishes what it takes. */
  readonly reexport: boolean;
  /** The names it takes (`*` for a namespace or `export *`). */
  readonly names: readonly string[];
  /** A dynamic `import("…")`: loaded when called, not with the importer. */
  readonly dynamic: boolean;
}

/** Each import, re-export, `import()` and `import("…").T` of `text`, as `file`. */
function packageEdgesOf(
  file: string,
  text: string,
  all: readonly PackageInfo[] = packages,
): PackageEdge[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out: PackageEdge[] = [];
  const add = (
    node: ts.Node,
    specifier: string,
    typeOnly: boolean,
    reexport: boolean,
    names: readonly string[],
    dynamic = false,
  ) =>
    out.push({
      dynamic,
      from: file,
      line:
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      specifier,
      to: resolveSpecifier(file, specifier, all),
      typeOnly,
      reexport,
      names,
    });
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const names =
        bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map((e) => (e.propertyName ?? e.name).text)
          : bindings
            ? ["*"]
            : clause?.name
              ? ["default"]
              : [];
      add(
        node,
        node.moduleSpecifier.text,
        clause?.isTypeOnly === true,
        false,
        names,
      );
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.exportClause;
      const names =
        clause && ts.isNamedExports(clause)
          ? clause.elements.map((e) => (e.propertyName ?? e.name).text)
          : ["*"];
      add(node, node.moduleSpecifier.text, node.isTypeOnly, true, names);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      add(node, node.arguments[0].text, false, false, ["*"], true);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      let q = node.qualifier;
      while (q && ts.isQualifiedName(q)) {
        q = q.left;
      }
      add(node, node.argument.literal.text, true, false, [q ? q.text : "*"]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** The outside package a bare specifier names: `vite/client` → `vite`. */
const outsidePackage = (specifier: string) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0]!;

/** Each sibling a package depends on, of ours. */
const siblingsOf = (pkg: PackageInfo, all: readonly PackageInfo[]) =>
  pkg.dependencies.filter((name) => all.some((p) => p.name === name));

const isCapability = (name: string) =>
  (CAPABILITIES as readonly string[]).includes(name);

/**
 * Every break of the package rule, as text, for packages `all` and the
 * source files `sources` (path from the root → text): the planted graphs
 * below and the repository's own go through the same check.
 */
function packageViolations(
  all: readonly PackageInfo[],
  sources: ReadonlyMap<string, string>,
): string[] {
  const out: string[] = [];
  const byName = new Map(all.map((p) => [p.name, p]));
  // The dependencies: each capability only on those before it (ui on any
  // capability), none on an adapter or the umbrella; no adapter on the
  // umbrella; no cycle.
  for (const pkg of all) {
    const deps = siblingsOf(pkg, all);
    for (const dep of deps) {
      if (dep === UMBRELLA) {
        out.push(`${pkg.name} depends on the umbrella`);
      } else if (isCapability(pkg.name) && !isCapability(dep)) {
        out.push(`${pkg.name} (a capability) depends on ${dep} (an adapter)`);
      } else if (
        isCapability(pkg.name) &&
        pkg.name !== "@cesium/ui" &&
        CAPABILITIES.indexOf(dep as (typeof CAPABILITIES)[number]) >=
          CAPABILITIES.indexOf(pkg.name as (typeof CAPABILITIES)[number])
      ) {
        out.push(`${pkg.name} depends on ${dep}, which comes after it`);
      }
    }
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  const walk = (name: string, path: string[]) => {
    if (visiting.has(name)) {
      out.push(
        `a cycle: ${[...path.slice(path.indexOf(name)), name].join(" → ")}`,
      );
      return;
    }
    if (done.has(name)) {
      return;
    }
    visiting.add(name);
    const pkg = byName.get(name);
    for (const dep of pkg ? siblingsOf(pkg, all) : []) {
      walk(dep, [...path, name]);
    }
    visiting.delete(name);
    done.add(name);
  };
  for (const pkg of all) {
    walk(pkg.name, []);
  }
  // The imports.
  const reexports = new Set<string>();
  for (const [file, text] of sources) {
    const pkg = packageOf(file, all);
    if (!pkg) {
      continue;
    }
    for (const edge of packageEdgesOf(file, text, all)) {
      const where = `${file}:${edge.line}`;
      if (edge.specifier.startsWith(".")) {
        if (edge.to && !edge.to.startsWith(`${pkg.dir}/`)) {
          out.push(`${where} reaches ${edge.to} outside ${pkg.name} by path`);
        }
        continue;
      }
      if (edge.specifier.startsWith("node:")) {
        continue;
      }
      const named = namedPackage(edge.specifier, all);
      const name = named?.pkg.name ?? outsidePackage(edge.specifier);
      if (name !== pkg.name && !pkg.dependencies.includes(name)) {
        out.push(
          `${where} imports ${edge.specifier}, not in ${pkg.name}'s dependencies`,
        );
      }
      if (!named || named.pkg === pkg) {
        continue;
      }
      if (edge.reexport && pkg.name !== UMBRELLA) {
        const key = `${file} → ${edge.specifier}`;
        reexports.add(key);
        if (!(key in REEXPORTS)) {
          out.push(
            `${where} re-exports ${edge.specifier}'s names outside the umbrella`,
          );
        }
      }
      const allowed = INTERNAL_NAMES[edge.specifier];
      if (named.entry === "./internal") {
        for (const n of edge.names) {
          if (!allowed?.includes(n)) {
            out.push(
              `${where} takes ${n} from ${edge.specifier}, which doesn't list it`,
            );
          }
        }
      }
    }
  }
  if (all === packages) {
    for (const key of Object.keys(REEXPORTS)) {
      if (!reexports.has(key)) {
        out.push(`stale re-export exception: ${key}`);
      }
    }
  }
  return out;
}

/** The repository's own package sources. */
const packageSources = new Map(
  packages
    .flatMap((p) => listRepoTs(`${p.dir}/src`))
    .map((file) => [file, readFileSync(join(repo, file), "utf8")] as const),
);

it("the packages follow the rule their package.json files state", () =>
  expect(packageViolations(packages, packageSources)).toEqual([]));

it("the capability packages are the six, the umbrella depends on each, and nothing depends on it", () => {
  const names = packages.map((p) => p.name);
  for (const name of [...CAPABILITIES, UMBRELLA]) {
    expect(names).toContain(name);
  }
  const umbrella = packages.find((p) => p.name === UMBRELLA)!;
  expect([...siblingsOf(umbrella, packages)].sort()).toEqual(
    [...CAPABILITIES].sort(),
  );
});

it("each internal entry exports exactly the names its siblings may take", () => {
  for (const [entry, names] of Object.entries(INTERNAL_NAMES)) {
    const named = namedPackage(entry)!;
    const text = readFileSync(
      join(repo, named.pkg.entries["./internal"]!),
      "utf8",
    );
    const exported = [...text.matchAll(/^export (?:type )?\{([^}]*)\} from/gm)]
      .flatMap((m) => m[1]!.split(","))
      .map((n) => n.trim())
      .filter(Boolean);
    expect([...new Set(exported)].sort(), entry).toEqual([...names].sort());
  }
});

/** Packages and sources for a planted graph: `name` → [dependencies, files]. */
function planted(
  spec: Record<string, [string[], Record<string, string>]>,
): [PackageInfo[], Map<string, string>] {
  const all: PackageInfo[] = [];
  const sources = new Map<string, string>();
  for (const [name, [deps, files]] of Object.entries(spec)) {
    const dir = `packages/${name.replace(/^@cesium\//, "")}`;
    all.push(
      packageInfo(dir, {
        name,
        dependencies: Object.fromEntries(deps.map((d) => [d, "*"])),
        exports: {
          ".": { "@cesium/source": "./src/index.ts" },
          "./internal": { "@cesium/source": "./src/internal.ts" },
        },
      }),
    );
    for (const [file, text] of Object.entries(files)) {
      sources.set(`${dir}/src/${file}`, text);
    }
  }
  return [all, sources];
}

it("refuses a planted bad edge of each kind", () => {
  const good: [string[], Record<string, string>] = [[], {}];
  const cases: [
    string,
    Record<string, [string[], Record<string, string>]>,
    RegExp,
  ][] = [
    [
      "a capability on an adapter, type-only",
      {
        "@cesium/core": good,
        "@cesium/frames": [
          ["@cesium/core", "@cesium/source-x"],
          { "a.ts": 'import type { T } from "@cesium/source-x";' },
        ],
        "@cesium/source-x": [["@cesium/core"], {}],
      },
      /@cesium\/frames \(a capability\) depends on @cesium\/source-x \(an adapter\)/,
    ],
    [
      "a capability before its dependency",
      {
        "@cesium/time": [["@cesium/frames"], {}],
        "@cesium/frames": [["@cesium/time"], {}],
      },
      /@cesium\/time depends on @cesium\/frames, which comes after it/,
    ],
    [
      "a cycle",
      {
        "@cesium/source-a": [["@cesium/source-b"], {}],
        "@cesium/source-b": [["@cesium/source-a"], {}],
      },
      /a cycle: @cesium\/source-a → @cesium\/source-b → @cesium\/source-a/,
    ],
    [
      "an adapter on the umbrella",
      { "@cesium/next": good, "@cesium/source-x": [["@cesium/next"], {}] },
      /@cesium\/source-x depends on the umbrella/,
    ],
    [
      "a relative import out of its package",
      {
        "@cesium/core": good,
        "@cesium/time": [
          ["@cesium/core"],
          {
            "a.ts": 'import { Emitter } from "../../core/src/core/Emitter.ts";',
          },
        ],
      },
      /packages\/time\/src\/a\.ts:1 reaches packages\/core\/src\/core\/Emitter\.ts outside @cesium\/time by path/,
    ],
    [
      "a sibling it doesn't declare",
      {
        "@cesium/core": good,
        "@cesium/time": [[], { "a.ts": 'const c = import("@cesium/core");' }],
      },
      /imports @cesium\/core, not in @cesium\/time's dependencies/,
    ],
    [
      "an outside package it doesn't declare",
      { "@cesium/core": [[], { "a.ts": 'import { read } from "ktx-parse";' }] },
      /imports ktx-parse, not in @cesium\/core's dependencies/,
    ],
    [
      "a re-export outside the umbrella",
      {
        "@cesium/core": good,
        "@cesium/time": [
          ["@cesium/core"],
          { "a.ts": 'export { Emitter } from "@cesium/core";' },
        ],
      },
      /re-exports @cesium\/core's names outside the umbrella/,
    ],
    [
      "an internal name not on the list",
      {
        "@cesium/core": good,
        "@cesium/time": [
          ["@cesium/core"],
          { "a.ts": 'import { secret } from "@cesium/core/internal";' },
        ],
      },
      /takes secret from @cesium\/core\/internal, which doesn't list it/,
    ],
  ];
  for (const [what, spec, expected] of cases) {
    const [all, sources] = planted(spec);
    const found = packageViolations(all, sources);
    expect(
      found.some((v) => expected.test(v)),
      `${what}: ${found.join("; ")}`,
    ).toBe(true);
  }
  // The umbrella may re-export, and a declared sibling is fine.
  const [all, sources] = planted({
    "@cesium/core": good,
    "@cesium/next": [
      ["@cesium/core"],
      { "index.ts": 'export * from "@cesium/core";' },
    ],
  });
  expect(packageViolations(all, sources)).toEqual([]);
});

/**
 * Every file a file reaches through its imports, by path and by package
 * name, itself included (paths from the root). With `bundled`, only what a
 * bundler puts beside it: value imports, not type imports or dynamic ones.
 */
function packageClosure(start: string, { bundled = false } = {}): string[] {
  const seen = new Set([start]);
  const queue = [start];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    const text =
      packageSources.get(file) ?? readFileSync(join(repo, file), "utf8");
    for (const edge of packageEdgesOf(file, text)) {
      if (bundled && (edge.typeOnly || edge.dynamic)) {
        continue;
      }
      if (edge.to?.endsWith(".ts") && !seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return [...seen].sort();
}

it("the time controls reach time without frames", () =>
  expect(
    packageClosure("packages/ui/src/timeControls.ts").filter((f) =>
      f.startsWith("packages/frames/"),
    ),
  ).toEqual([]));

interface Published {
  readonly entry: string;
  readonly name: string;
  /** Where the name is declared, from the root, resolved by the checker. */
  readonly file: string;
}

let published: Published[] | undefined;

/**
 * Each name each package's entry points publish, with the file that
 * declares it, through every `export … from` hop, `import { X }; export
 * { X }` and `export *`.
 */
function publishedNames(): Published[] {
  if (published) {
    return published;
  }
  const entries = packages.flatMap((p) => Object.values(p.entries));
  const program = ts.createProgram(
    entries.map((entry) => join(repo, entry)),
    {
      noEmit: true,
      skipLibCheck: true,
      types: [],
      allowImportingTsExtensions: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      customConditions: ["@cesium/source"],
    },
  );
  const checker = program.getTypeChecker();
  const out: Published[] = [];
  for (const entry of entries) {
    const index = program.getSourceFile(join(repo, entry));
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
        const file = relative(repo, declaration.getSourceFile().fileName)
          .split(sep)
          .join("/");
        out.push({ entry, name: symbol.name, file });
      }
    }
  }
  return (published = out);
}

/**
 * Names a package's entries publish that another package declares, by the
 * exceptions above: measure's shared constants and motion helpers, and the
 * coordinate service's types crs carries.
 */
const PUBLISHED_ELSEWHERE = new Set(
  Object.keys(REEXPORTS).map((k) => k.split(" → ")[1]!),
);

it("each package publishes only names it declares, but for the named exceptions; the umbrella re-exports", () => {
  const leaks = new Set<string>();
  for (const { entry, name, file } of publishedNames()) {
    const from = packageOf(entry)!;
    const to = packageOf(file);
    if (!to || to === from || from.name === UMBRELLA) {
      continue;
    }
    const through = [...PUBLISHED_ELSEWHERE].some(
      (spec) => namedPackage(spec)?.pkg === to,
    );
    if (!through) {
      leaks.add(`${entry} → ${file} (${name})`);
    }
  }
  expect([...leaks]).toEqual([]);
}, 30_000);

it("resolves each published name to the file that declares it", () => {
  const where = (entry: string, name: string) =>
    publishedNames()
      .filter((p) => p.entry === entry && p.name === name)
      .map((p) => p.file);
  // Through measure/constants.ts's re-export, to the math module.
  expect(where("packages/measure/src/index.ts", "C")).toEqual([
    "packages/core/src/math/constants.ts",
  ]);
  expect(
    where("packages/frames/src/index.ts", "earthOrientationSigma"),
  ).toEqual(["packages/frames/src/orientationSigma.ts"]);
  expect(where("packages/core/src/index.ts", "Engine")).toEqual([
    "packages/core/src/scene/Engine.ts",
  ]);
  // Through the umbrella's re-export.
  expect(where("packages/cesium/src/index.ts", "Engine")).toEqual([
    "packages/core/src/scene/Engine.ts",
  ]);
}, 30_000);

it("the umbrella exports the entry points", () =>
  expect(
    Object.keys(packages.find((p) => p.name === UMBRELLA)!.entries),
  ).toEqual([".", "./time", "./frames", "./crs", "./measure", "./ui"]));

// Inside the core: its files by path from packages/core (`src/scene/World.ts`).
const root = join(repo, "packages", "core");

/** The core's shared utilities (math, `core`, reading with progress) and the rest. */
function layerOf(file: string): "utilities" | "core" {
  return file.startsWith("src/math/") ||
    file.startsWith("src/core/") ||
    file === "src/io/readWithProgress.ts"
    ? "utilities"
    : "core";
}

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

const files = listTs("src");
const edgeCache = new Map<string, Edge[]>();

/** Each relative import of a core file (from the package, as `src/a/b.ts`). */
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
 * Imports by name (packages) are outside the core's tiers. `lines`, when
 * given, gets each edge's line.
 */
function edgesOfText(file: string, text: string, lines?: number[]): Edge[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
  const edges: Edge[] = [];
  // The node being visited: `lines` gets the line (from 1) of each edge.
  let at: ts.Node = source;
  const push = (edge: Edge) => {
    edges.push(edge);
    lines?.push(
      source.getLineAndCharacterOfPosition(at.getStart(source)).line + 1,
    );
  };
  const add = (specifier: string, typeOnly: boolean, dynamic = false) => {
    if (!specifier.startsWith(".")) {
      return; // packages are outside the rule
    }
    const path = specifier.replace(/\?.*$/, "");
    const to = relative(root, join(root, dirname(file), path)).replaceAll(
      "\\",
      "/",
    );
    push(dynamic ? { to, typeOnly, dynamic } : { to, typeOnly });
  };
  const visit = (node: ts.Node) => {
    at = node;
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

it("the core's shared utilities import only each other", () =>
  expect(
    files
      .filter((f) => layerOf(f) === "utilities")
      .flatMap((f) =>
        edgesOf(f)
          .filter((e) => layerOf(e.to) !== "utilities")
          .map((e) => `${f} → ${e.to}`),
      ),
  ).toEqual([]));

// The built-in transforms (docs/design/transform-graph.md) are core modules with no geo
// or engine knowledge beyond the transform graph, the route and curvilinear map
// contract (`camera/route.ts`, which the live helpers implement), the
// exaggeration's height profile (`camera/heightProfile.ts`, a leaf) and the
// spike's closed forms (`scene/curvilinearForms.ts`, which imports nothing): they
// stay loadable on a worker and by the compiler, which imports them.
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
            edge.to === "src/camera/route.ts" ||
            edge.to === "src/camera/heightProfile.ts" ||
            edge.to === "src/scene/curvilinearForms.ts"
          ),
      )
      .map((edge) => `${file} → ${edge.to}`),
  );
  expect(found).toEqual([]);
  expect(edgesOf("src/scene/curvilinearForms.ts")).toEqual([]);
  // The exaggeration's height profile is a leaf both sides share.
  expect(edgesOf("src/camera/heightProfile.ts")).toEqual([]);
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

// The file graph can't say what a bundler keeps from an entry point that
// imports every precise provider: tree shaking decides (the package's
// `sideEffects`, and no top-level code that a bundler can't prove pure).
// So this builds a page that only creates a Viewer, as an application does.
it("a globe-only Viewer bundles no X, Y or s series, Earth orientation, EOP parser or ephemeris (plan 5a's call 32)", () => {
  const report = execFileSync(
    process.execPath,
    [join(root, "..", "..", "scripts/checkBundle.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  expect(report).toContain("no X, Y or s series and no DAF reader");
}, 120_000);

// Layers inside the core (docs/design/layers-engine-renderer-backend.md): content, scene, renderer and
// GPU, and a second renderer's tier, `webgl2` (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// "Where it sits"). Assigned by file, like the rest. Content must not reach
// the renderer, the GPU layer or the classes that hold them; the renderer may
// not reach content's internals.
type CoreTier = "gpu" | "renderer" | "scene" | "content" | "webgl2";

/** Whole classes that give access to both sides. Content uses `DrawSink`. */
const WHOLES = new Set([
  "src/scene/World.ts",
  "src/scene/Engine.ts",
  "src/scene/RenderContext.ts",
]);

function tierOf(file: string): CoreTier | undefined {
  if (file.startsWith("src/webgl2/")) {
    return "webgl2";
  }
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
    file.startsWith("src/source/") ||
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
  // Public signatures, for the API review (CS-102): `Tileset3D.world`,
  // `Tileset3D.load`, `Globe.create`.
  "src/streaming/Tileset3D.ts → src/scene/World.ts": "public signature",
  "src/streaming/Tileset3D.ts → src/scene/Engine.ts": "public signature",
  "src/globe/Globe.ts → src/scene/World.ts": "public signature",
  "src/globe/Globe.ts → src/scene/Engine.ts": "public signature",
};

/** The renderer's imports from content (docs/design/layers-engine-renderer-backend.md wants none). */
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
// The content-source seam (CS-847, docs/design/content-source-seam.md): its
// types and the engine's side of them are data only. No file under
// src/source/ imports a whole class (World, Engine, RenderContext), the
// renderer or the GPU layer, even for a type, nor the core's barrel
// (src/index.ts), whose names this edge check can't see; and none names a
// WebGPU type. test/seams.test.ts holds every source module to the same
// imports, by name through a barrel.
const seamFiles = files.filter((f) => f.startsWith("src/source/"));
const seamRefusal = (file: string, text: string): string[] => {
  const lines: number[] = [];
  const edges = edgesOfText(file, text, lines);
  return [
    ...edges
      .map((edge, i) => ({ edge, line: lines[i]! }))
      .filter(
        ({ edge }) => contentRefuses(edge.to) || edge.to === "src/index.ts",
      )
      .map(({ edge, line }) => `${file}:${line} → ${edge.to}`),
    ...webgpuTypeNames(file, text),
  ];
};
it("the content-source seam's types are data only: no GPU type, and no World, Engine or renderer import", () => {
  expect(seamFiles).toEqual(
    expect.arrayContaining(["src/source/types.ts", "src/source/editing.ts"]),
  );
  expect(seamFiles.every((f) => tierOf(f) === "content")).toBe(true);
  expect(
    seamFiles.flatMap((f) =>
      seamRefusal(f, readFileSync(join(root, f), "utf8")),
    ),
  ).toEqual([]);
});
it("refuses a seam file that imports World, Engine, the renderer or the core's barrel, or names a GPU type, naming the line", () => {
  const plant = [
    'import type { StableId } from "../scene/identity.ts";',
    'import type { World } from "../scene/World.ts";',
    'import type { Engine } from "../scene/Engine.ts";',
    'export type Pass = import("../render/view/viewFrame.ts").ViewFrame;',
    'import type { GpuDevice } from "../gpu/GpuDevice.ts";',
    "export interface Rows { readonly buffer: GPUBuffer; }",
    'import type { World as W } from "../index.ts";',
  ].join("\n");
  expect(seamRefusal("src/source/sample.ts", plant)).toEqual([
    "src/source/sample.ts:2 → src/scene/World.ts",
    "src/source/sample.ts:3 → src/scene/Engine.ts",
    "src/source/sample.ts:4 → src/render/view/viewFrame.ts",
    "src/source/sample.ts:5 → src/gpu/GpuDevice.ts",
    "src/source/sample.ts:7 → src/index.ts",
    "src/source/sample.ts:6 GPUBuffer",
  ]);
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
    .flatMap((f) =>
      readsMembers(readFileSync(join(root, f), "utf8"), ENGINE_ONLY).map(
        (name) => `${f}: ${name}`,
      ),
    );
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
/**
 * What a `webgl2` file may not import, as "<file>:<line> → <to>": anything
 * but the scene, the utilities and its own tier. So no WebGPU renderer
 * (`src/render/`, `src/shaders/`), no GPU layer (`src/gpu/`) and no
 * content internals.
 */
function webgl2Refusals(file: string, text: string): string[] {
  const lines: number[] = [];
  return edgesOfText(file, text, lines)
    .map((edge, i) => ({ edge, line: lines[i]! }))
    .filter(({ edge }) => {
      const tier = tierOf(edge.to);
      return !(
        tier === "webgl2" ||
        tier === "scene" ||
        layerOf(edge.to) === "utilities"
      );
    })
    .map(({ edge, line }) => `${file}:${line} → ${edge.to}`);
}

/** WebGPU's type names in `text` (`GPUDevice`, `GPUBuffer`, …), each with its line. */
function webgpuTypeNames(file: string, text: string): string[] {
  return [...text.matchAll(/\bGPU[A-Z]\w*/g)].map(
    (m) => `${file}:${text.slice(0, m.index).split("\n").length} ${m[0]}`,
  );
}

const webgl2Files = files.filter((f) => tierOf(f) === "webgl2");

it("the webgl2 tier imports only the scene, the utilities and itself", () =>
  expect(
    webgl2Files.flatMap((f) =>
      webgl2Refusals(f, readFileSync(join(root, f), "utf8")),
    ),
  ).toEqual([]));
it("the webgl2 tier names no WebGPU type", () =>
  expect(
    webgl2Files.flatMap((f) =>
      webgpuTypeNames(f, readFileSync(join(root, f), "utf8")),
    ),
  ).toEqual([]));
/**
 * Content files that name WebGPU types: glTF's sampler modes, which are
 * WebGPU's string names (`GPUFilterMode`, `GPUAddressMode`), not objects.
 */
const CONTENT_GPU_NAMES: Readonly<Record<string, string>> = {
  "src/io/gltfTypes.ts": "glTF's sampler modes, as WebGPU's string names",
  "src/io/gltfParse.ts": "glTF's sampler modes, as WebGPU's string names",
};
/** Scene files content resources go through: they hold no GPU object either. */
const NEUTRAL_RESOURCES = [
  "src/scene/contentResources.ts",
  "src/scene/gltfModel.ts",
];

it("content holds no WebGPU object: it names no WebGPU type, nor do gltfModel and the content resources", () => {
  const named = [
    ...files.filter((f) => tierOf(f) === "content"),
    ...NEUTRAL_RESOURCES,
  ].filter(
    (f) => webgpuTypeNames(f, readFileSync(join(root, f), "utf8")).length > 0,
  );
  expect(named.filter((f) => !(f in CONTENT_GPU_NAMES))).toEqual([]);
  // An allowance that no longer names one is one to delete.
  expect(
    Object.keys(CONTENT_GPU_NAMES).filter((f) => !named.includes(f)),
  ).toEqual([]);
});
it("no other tier imports the webgl2 tier, but the engine's device choice, dynamically", () => {
  const found = files
    .filter((f) => tierOf(f) !== "webgl2")
    .flatMap((f) =>
      edgesOf(f)
        .filter((edge) => tierOf(edge.to) === "webgl2")
        .filter(
          (edge) => !(f === "src/scene/Engine.ts" && edge.dynamic === true),
        )
        .map((edge) => `${f} → ${edge.to}`),
    );
  expect(found).toEqual([]);
});
it("refuses a webgl2 file that imports the WebGPU renderer, the GPU layer or content, naming the line", () => {
  const file = "src/webgl2/sample.ts";
  expect(tierOf(file)).toBe("webgl2");
  const text = [
    'import type { World } from "../scene/World.ts";',
    'import { RECORD_WORDS } from "../render/layout.ts";',
    'import type { GpuDevice } from "../gpu/GpuDevice.ts";',
    'import { dot } from "../math/vec3.ts";',
    'import type { Tile } from "../streaming/Tile.ts";',
    'import { WorldGl } from "./WorldGl.ts";',
    'const surface = import("../shaders/generated/surface.wgsl");',
    "let device: GPUDevice;",
  ].join("\n");
  expect(webgl2Refusals(file, text)).toEqual([
    "src/webgl2/sample.ts:2 → src/render/layout.ts",
    "src/webgl2/sample.ts:3 → src/gpu/GpuDevice.ts",
    "src/webgl2/sample.ts:5 → src/streaming/Tile.ts",
    "src/webgl2/sample.ts:7 → src/shaders/generated/surface.wgsl",
  ]);
  expect(webgpuTypeNames(file, text)).toEqual([
    "src/webgl2/sample.ts:8 GPUDevice",
  ]);
});
/**
 * What the scene's holders (`Engine`, `World`, `View`) import from the
 * WebGPU renderer and the GPU layer, each with why
 * (docs/superpowers/plans/2026-11-13-webgl2-renderer.md, "The interfaces"):
 * they reach the renderer through the seam (scene/renderSeam.ts), whose
 * WebGPU implementation is the device (`WebGpuDevice`), each world's mirror
 * and each view's renderer. "type:" edges must stay type-only. A stale entry
 * fails too.
 */
const SEAM_EDGES: Readonly<Record<string, string>> = {
  "src/scene/Engine.ts → src/render/webgpuDevice.ts":
    "the WebGPU device (RenderDevice), made by the device choice; the WebGL 2 device is its dynamic import",
  "src/scene/Engine.ts → src/render/view/engineRaster.ts":
    "type: the device's engine-wide state, read off the engine by the renderer's passes",
  "src/scene/Engine.ts → src/render/view/geometryStats.ts":
    "draw counts for FrameStats, renderer-neutral (they read World.draws)",
  "src/scene/Engine.ts → src/gpu/GpuDevice.ts":
    "type: Engine.gpu, public, and the device options",
  "src/scene/Engine.ts → src/gpu/EngineErrors.ts":
    "the engine's errors: a plain class, which a WebGL 2 engine makes itself",
  "src/scene/Engine.ts → src/gpu/GpuWork.ts": "type: FrameStats.work",
  "src/scene/World.ts → src/render/layout.ts":
    "the record, transform, instance and material layouts' constants",
  "src/scene/World.ts → src/render/drawConstants.ts":
    "the records' writer, the per-draw constants seam (WorldDraws.drawConstants)",
  "src/scene/World.ts → src/render/world/worldRaster.ts":
    "the mirror's state, read off the world by the renderer's passes",
  "src/scene/World.ts → src/render/world/worldMirror.ts": "type: World.mirror",
  "src/scene/World.ts → src/render/world/bundles.ts": "type: BundleKind",
  "src/scene/World.ts → src/gpu/RangeAllocator.ts":
    "the instance table's allocator, a CPU range allocator",
  "src/scene/View.ts → src/render/layout.ts": "type: ViewLighting",
};

it("the engine, worlds and views reach the WebGPU renderer only through the seam, and named edges", () => {
  const holders = [
    "src/scene/Engine.ts",
    "src/scene/World.ts",
    "src/scene/View.ts",
  ];
  const found = new Map<string, boolean>();
  for (const file of holders) {
    for (const edge of edgesOf(file)) {
      const tier = tierOf(edge.to);
      if (tier === "renderer" || tier === "gpu") {
        const key = `${file} → ${edge.to}`;
        found.set(key, (found.get(key) ?? true) && edge.typeOnly);
      }
    }
  }
  expect([...found.keys()].filter((key) => !(key in SEAM_EDGES))).toEqual([]);
  expect(Object.keys(SEAM_EDGES).filter((key) => !found.has(key))).toEqual([]);
  expect(
    Object.entries(SEAM_EDGES)
      .filter(([key, why]) => why.startsWith("type:") && !found.get(key))
      .map(([key]) => key),
  ).toEqual([]);
});
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

it("finds imports of every kind and classifies them", () => {
  // The checker is only as good as its parser: a sample of known edges.
  expect(layerOf("src/io/readWithProgress.ts")).toBe("utilities");
  expect(layerOf("src/io/ion.ts")).toBe("core");
  expect(edgesOf("src/scene/Engine.ts")).toContainEqual({
    to: "src/gpu/GpuDevice.ts",
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
