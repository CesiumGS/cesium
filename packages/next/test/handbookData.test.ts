// The handbook reads its figures from sources that stay current
// (handbook/DESIGN.md). These fail when one of them changes shape, so the
// reader is updated rather than the page quietly going wrong.
import { expect, it } from "vitest";
import {
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
    "neutral",
    "proj",
    "time",
    "widgets",
  ]);
  expect(allowed.core).toEqual(["core", "neutral"]);
  // The rule the layer diagram draws: nothing leaves the core but to neutral.
  expect(edges.filter((e) => e.from === "core" && e.to !== "neutral")).toEqual(
    [],
  );
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
  }
});
