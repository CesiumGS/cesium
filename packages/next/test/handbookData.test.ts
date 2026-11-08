// The handbook reads its figures from sources that stay current
// (handbook/DESIGN.md). These fail when one of them changes shape, so the
// reader is updated rather than the page quietly going wrong.
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  findSecrets,
  pipelineDrift,
  readFrameGraph,
  readPipelineFigures,
  parseCheckBundle,
  readBenchResults,
  readLayers,
  readHistory,
  readOneX,
  readSurface,
} from "../scripts/handbookData.mjs";
import ts from "typescript";
import { API_ROWS } from "../handbook/src/apiMap.ts";
import { highlight } from "../handbook/src/highlight.ts";

it("reads the API map per entry point", () => {
  const surface = readSurface();
  const entries = surface.entries.map((e) => e.entry);
  expect(entries).toEqual(
    expect.arrayContaining([
      ".",
      "time",
      "frames",
      "proj",
      "measure",
      "widgets",
    ]),
  );
  expect(surface.total).toBe(surface.entries.reduce((n, e) => n + e.total, 0));
  expect(surface.entries[0]!.names[0]).toEqual(
    expect.objectContaining({
      name: expect.any(String),
      kind: expect.any(String),
    }),
  );
});

it("runs the boundary test's table over the import graph", () => {
  const { layers, allowed, edges, dynamicImports } = readLayers();
  expect(layers.map((l) => l.id).sort()).toEqual([
    "core",
    "frames",
    "measure",
    "proj",
    "time",
    "utilities",
    "widgets",
  ]);
  expect(allowed.core).toEqual(["core", "utilities"]);
  // The rule the layer diagram draws: nothing leaves the core but to utilities.
  expect(
    edges.filter((e) => e.from === "core" && e.to !== "utilities"),
  ).toEqual([]);
  expect(dynamicImports.length).toBeGreaterThan(0);
});

it("parses the bundle check's report", () => {
  const report = parseCheckBundle(
    [
      "main chunk assets/globeOnlyViewer-Cahs37T8.js: 878.3 KB (250.5 KB gzipped)",
      "  imported with it: assets/shared-AAAAAAAA.js: 10.0 KB",
      "  lazy chunk assets/ephemeris-pyjVgMdF.js: 6.0 KB",
      "checkBundle: no X, Y or s series and no DAF reader in the main chunk or its static imports",
    ].join("\n"),
  );
  expect(report).toEqual({
    main: { kb: 878.3, gzipKb: 250.5 },
    eager: [{ name: "shared", kb: 10 }],
    lazy: [{ name: "ephemeris", kb: 6 }],
    clean: true,
  });
  expect(() => parseCheckBundle("something else")).toThrow(/main chunk/);
});

it("summarizes bench results per adapter, with no run errors in them", () => {
  const bench = readBenchResults();
  expect(bench.adapters.length).toBeGreaterThan(0);
  for (const adapter of bench.adapters) {
    expect(adapter.adapter).toEqual(expect.any(String));
    expect(adapter.runs).toBeGreaterThan(0);
    // Run errors can quote local paths, so they never reach the page.
    expect(adapter).not.toHaveProperty("errors");
    const parity = adapter.selection as
      { comparisons: number; exact: number; worst: number } | undefined;
    if (parity) {
      expect(parity.exact).toBeLessThanOrEqual(parity.comparisons);
      expect(parity.worst).toBeLessThanOrEqual(1);
    }
  }
});

it("finds what must not be in a page that gets passed around", () => {
  const dir = mkdtempSync(join(tmpdir(), "handbook-secrets-"));
  try {
    const file = join(dir, ".env.local");
    writeFileSync(
      file,
      '# a comment\nVITE_SOME_KEY="not-a-real-value-123"\nSHORT=abc\n',
    );
    const options = { files: [file], home: "/home/someone" };
    expect(findSecrets("<p>a clean page, abc</p>", options)).toEqual([]);
    const found = findSecrets("x not-a-real-value-123 y", options);
    expect(found).toEqual(["the value of VITE_SOME_KEY from .env.local"]);
    // A reason never repeats the value.
    expect(found.join()).not.toContain("not-a-real-value-123");
    const jwtShape = ["eyJhbGciOiJIUzI1", "eyJzdWIiOiIxMjM0", "c2lnbmF0dXJl"];
    expect(findSecrets(jwtShape.join("."), options)).toEqual([
      "a string shaped like an access token (a JWT)",
    ]);
    expect(findSecrets("file:///home/someone/x", options)).toEqual([
      "this machine's home directory",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("reads the frame graph's passes and targets from the source", () => {
  const { passes, textures } = readFrameGraph();
  const names = passes.map((p) => p.name);
  // In order, as they run.
  expect(names.indexOf("cull")).toBeLessThan(names.indexOf("opaque"));
  expect(names.indexOf("opaque")).toBeLessThan(names.indexOf("present"));
  const opaque = passes.find((p) => p.name === "opaque")!;
  expect(opaque.writes).toContain("depth.msaa");
  expect(textures.find((t) => t.name === "color.msaa")).toMatchObject({
    format: "rgba16float",
    multisampled: true,
  });
  expect(readPipelineFigures()).toMatchObject({
    drawRecordBytes: expect.any(Number),
    shadowCascades: expect.any(Number),
  });
});

it("reports where the pipeline's notes no longer match the code", () => {
  const graph = { passes: [{ name: "cull" }, { name: "new-pass" }] };
  const drift = pipelineDrift(graph, {
    PASSES: { cull: {}, "gone-pass": {} },
    SEAMS: [
      {
        id: "S1",
        guards: [{ file: "test/seams.test.ts", title: "no such test" }],
        code: [{ name: "NoSuchName", file: "src/render/layout.ts" }],
        passes: ["gone-pass"],
      },
    ],
    DECISIONS: [{ id: "D1", passes: ["gone-pass"] }],
  });
  expect(drift).toHaveLength(6);
  expect(drift.join()).toContain('"new-pass" has no note');
  expect(drift.join()).toContain('no test "no such test"');
});

it("highlights code without changing a character", () => {
  const ts = `// A comment
import { Engine } from "@cesium/next";
const engine: Engine = await Engine.create({ count: 3 });
const name = \`a \${engine} b\`;
class A<T> extends B { private x?: number = 1; }`;
  const shell = `# A comment
node bench/run.mjs baseline --tier full --note "RTX"`;
  const json = `{ "a": [1, true, null], "b": "c" }`;
  for (const [code, language] of [
    [ts, "ts"],
    [ts, "js"],
    [shell, "shell"],
    [json, "json"],
    ["plain × text", "text"],
  ] as const) {
    const tokens = highlight(code, language);
    expect(tokens.map((t) => t.text).join("")).toBe(code);
  }
  const kinds = new Set(highlight(ts, "ts").map((t) => t.kind));
  expect(kinds).toEqual(
    new Set([
      undefined,
      "comment",
      "keyword",
      "string",
      "number",
      "type",
      "property",
    ]),
  );
});

/** The comparison's names, as api/surface.txt writes them. */
const surfaceNames = () =>
  readSurface().entries.flatMap((e) =>
    e.names.map((n) => (e.entry === "." ? n.name : `${e.entry}:${n.name}`)),
  );

const rowNext = (row: (typeof API_ROWS)[number]) => [
  ...(row.next ?? []),
  ...(row.supporting ?? []),
];

it("reads 1.x's public names from its source", () => {
  const { names, total, version } = readOneX();
  expect(version).toMatch(/^1\.\d+\.\d+$/);
  expect(total).toBe(names.length);
  // Moved to packages/core, public, private and a widget.
  expect(names).toEqual(
    expect.arrayContaining(["Cartesian3", "Viewer", "Cesium3DTileset", "Math"]),
  );
  expect(names).not.toContain("ShaderProgram");
});

it("maps only 2.0 names that exist", () => {
  const known = new Set(surfaceNames());
  const stale = API_ROWS.flatMap(rowNext).filter((n) => !known.has(n));
  expect(stale).toEqual([]);
});

it("gives every exported 2.0 name a row", () => {
  const mapped = new Set(API_ROWS.flatMap(rowNext));
  const missing = surfaceNames().filter((n) => !mapped.has(n));
  expect(missing).toEqual([]);
});

it("maps only 1.x names and members that exist", () => {
  const { names, files } = readOneX();
  const known = new Set(names);
  const wrong = API_ROWS.flatMap((row) => row.old ?? []).filter((old) => {
    const [name, member] = old.split(".");
    if (!known.has(name!)) {
      return true;
    }
    return (
      member !== undefined &&
      !new RegExp(`\\b${member}\\b`).test(readFileSync(files[name!]!, "utf8"))
    );
  });
  expect(wrong).toEqual([]);
  for (const row of API_ROWS) {
    if (row.family) {
      const pattern = new RegExp(row.family);
      expect(names.some((n) => pattern.test(n))).toBe(true);
    }
  }
});

it("says why a 1.x feature is missing", () => {
  for (const row of API_ROWS) {
    if (row.status === "absent") {
      expect(row.gap, row.note).toBeDefined();
    }
    if (row.gap === "design" || row.gap === "later") {
      expect(row.source, row.note).toBeDefined();
    }
  }
});

const SNIPPETS = join(import.meta.dirname, "../handbook/snippets");

it("compiles the 2.0 snippets against the real types", () => {
  const configPath = join(import.meta.dirname, "../handbook/tsconfig.json");
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, ts.sys.readFile).config,
    ts.sys,
    join(import.meta.dirname, "../handbook"),
  );
  const files = readdirSync(SNIPPETS)
    .filter((f) => f.endsWith(".next.ts"))
    .map((f) => join(SNIPPETS, f));
  expect(files.length).toBeGreaterThan(10);
  const program = ts.createProgram(files, config.options);
  const errors = files.flatMap((f) =>
    [
      ...program.getSyntacticDiagnostics(program.getSourceFile(f)),
      ...program.getSemanticDiagnostics(program.getSourceFile(f)),
    ].map(
      (d) =>
        `${f.split("/").pop()}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
    ),
  );
  expect(errors).toEqual([]);
}, 120_000);

it("checks the 1.x snippets' names against 1.x's source", () => {
  const { names, files } = readOneX();
  const known = new Set(names);
  const wrong: string[] = [];
  for (const file of readdirSync(SNIPPETS).filter((f) =>
    f.endsWith(".1x.txt"),
  )) {
    const text = readFileSync(join(SNIPPETS, file), "utf8");
    for (const [, name, member] of text.matchAll(
      /Cesium\.(\w+)(?:\.(\w+))?/g,
    )) {
      if (!known.has(name!)) {
        wrong.push(`${file}: ${name}`);
      } else if (
        member &&
        !new RegExp(`\\b${member}\\b`).test(readFileSync(files[name!]!, "utf8"))
      ) {
        wrong.push(`${file}: ${name}.${member}`);
      }
    }
  }
  expect(wrong).toEqual([]);
});

it("keeps ion tokens out of the snippets, and links rows to tasks", () => {
  for (const file of readdirSync(SNIPPETS)) {
    const text = readFileSync(join(SNIPPETS, file), "utf8");
    expect(text).not.toMatch(/eyJ[\w-]{10,}/);
  }
  const ids = readdirSync(SNIPPETS).map((f) => f.split(".")[0]);
  for (const row of API_ROWS) {
    if (row.snippet) {
      expect(ids, row.snippet).toContain(row.snippet);
    }
  }
});

it("reads this package's history from git", () => {
  const history = readHistory();
  expect(history.commits).toBeGreaterThan(0);
  expect(history.withAgent).toBeLessThanOrEqual(history.commits);
  expect(history.firstDate <= history.lastDate).toBe(true);
});
