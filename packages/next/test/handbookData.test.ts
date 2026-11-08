// The handbook reads its figures from sources that stay current
// (handbook/DESIGN.md). These fail when one of them changes shape, so the
// reader is updated rather than the page quietly going wrong.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  readSurface,
} from "../scripts/handbookData.mjs";

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
