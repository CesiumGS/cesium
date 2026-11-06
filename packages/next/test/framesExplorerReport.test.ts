// The frames explorer's report (examples/frames-explorer/report.ts, R15): the
// QA evidence an engineer files. Every result, failures first, units on every
// value, fingerprints and the environment; the JSON parses back to the same
// results; the ion token never appears (R18).
import { describe, expect, it } from "vitest";
import {
  buildReport,
  type ReportEnvironment,
} from "../examples/frames-explorer/report.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.secret-token-value.sig";

const results: StressResult[] = [
  {
    id: "projections.epsg-32610",
    group: "projections",
    title: "UTM 10N round trip",
    pass: true,
    value: 3.4e-9,
    tolerance: 1e-4,
    unit: "m",
    accuracyNote: "exact arithmetic: a round trip",
    fingerprint: {
      pipeline: "+proj=utm +zone=10",
      grids: [{ name: "g.tif", sha256: "abc123" }],
      coordinates: [1, 2, 3],
    },
    fingerprintCheck: { match: true },
  },
  {
    id: "axes.zone-1",
    group: "axes-and-the-antimeridian",
    title: "UTM 1N at ±179.999°",
    pass: false,
    value: 2.4e-8,
    tolerance: 1e-9,
    unit: "m",
    accuracyNote: "published value ± half its last digit",
    fingerprint: {
      pipeline: "+proj=utm +zone=1",
      grids: [],
      coordinates: [4, 5, 6],
    },
    fingerprintCheck: { match: false, difference: "coordinates differ" },
  },
  {
    id: "units.ratio",
    group: "units",
    title: "Foot ratio",
    pass: true,
    value: 1e-12,
    tolerance: 1e-9,
    accuracy: {
      meters: 0.01,
      terms: [{ source: "ephemeris", meters: 0.01, note: "DE440" }],
      warnings: [],
    },
    effect: { value: 2, unit: "ppm", label: "US against international feet" },
  },
  {
    id: "lunar.skipped",
    group: "lunar-time",
    title: "Lunar clock",
    pass: false,
    missing: ["orion"],
    detail: "Needs the OEM",
    accuracy: {
      meters: undefined,
      terms: [{ source: "trajectory", meters: undefined, note: "no sigma" }],
      warnings: [],
    },
  },
  {
    id: "bound-crss.user.mine.helmert",
    group: "bound-crss",
    title: `My model ${TOKEN}`,
    pass: true,
    userInput: true,
    value: 1e-4,
    tolerance: 1e-3,
    unit: "m",
    detail: `pasted with ${TOKEN}`,
  },
];

const env: ReportEnvironment = {
  startedAt: "2026-11-06T09:14:03.000Z",
  durationMs: 4230,
  packageVersion: "@cesium/next 2.0.0-poc.0",
  userAgent: "Mozilla/5.0 Chrome/142",
  proj: "proj.js v0.9.2 (PROJ WebAssembly)",
  files: [
    { label: "proj.db", file: "proj/proj.db", sha256: "b192cb2fd7eb" },
    { label: "GEOID18", file: "proj/us_noaa_g2018u0.tif", sha256: "fa9a40" },
    {
      label: "Frame data",
      file: "planets-de440-2000-2050.pack",
      sha256: "ae8718",
    },
  ],
  frameDataSpan: "2000–2050",
  summary: {
    passed: 2,
    failed: 1,
    skipped: 1,
    shown: 0,
    ms: 4230,
    cancelled: false,
  },
};

describe("buildReport (R15)", () => {
  const report = buildReport(results, env, { secrets: [TOKEN] });

  it("holds every result id", () => {
    for (const r of results) {
      expect(report.markdown).toContain(r.id);
    }
  });

  it("lists failures first", () => {
    const md = report.markdown;
    expect(md.indexOf("axes.zone-1")).toBeLessThan(
      md.indexOf("projections.epsg-32610"),
    );
    const json = report.json as { results: StressResult[] };
    expect(json.results[0]!.id).toBe("axes.zone-1");
  });

  it("gives every value a unit, a dimensionless one as a ratio", () => {
    expect(report.markdown).toContain("3.4e-9 m");
    expect(report.markdown).toContain("1e-12 (ratio)");
    expect(report.markdown).toContain("2 ppm");
  });

  it("gives each result's accuracy: the total, not bounded with its term, or the note", () => {
    expect(report.markdown).toContain("±0.01 m (1σ)");
    expect(report.markdown).toMatch(/not bounded: no sigma/);
    expect(report.markdown).toContain("exact arithmetic: a round trip");
  });

  it("holds the fingerprints and whether they match Node's", () => {
    expect(report.markdown).toContain("browser = Node");
    expect(report.markdown).toContain("browser ≠ Node: coordinates differ");
    expect(report.markdown).toContain("+proj=utm +zone=10");
    expect(report.markdown).toContain("abc123");
  });

  it("holds every environment field", () => {
    for (const text of [
      "2026-11-06T09:14:03.000Z",
      "4.23 s",
      "@cesium/next 2.0.0-poc.0",
      "Mozilla/5.0 Chrome/142",
      "proj.js v0.9.2",
      "b192cb2fd7eb",
      "fa9a40",
      "ae8718",
      "2000–2050",
    ]) {
      expect(report.markdown).toContain(text);
      expect(JSON.stringify(report.json)).toContain(text);
    }
  });

  it("gives the counts, with the user's input apart", () => {
    expect(report.markdown).toMatch(/2 passed, 1 failed, 1 skipped/);
    expect(report.markdown).toMatch(/1 of your input/);
  });

  it("parses back to the same results", () => {
    const parsed = JSON.parse(JSON.stringify(report.json)) as {
      results: StressResult[];
    };
    const byId = (rs: readonly StressResult[]) =>
      [...rs].sort((a, b) => a.id.localeCompare(b.id));
    const redacted = byId(results).map((r) =>
      r.userInput
        ? {
            ...r,
            title: "My model [redacted]",
            detail: "pasted with [redacted]",
          }
        : r,
    );
    expect(byId(parsed.results)).toEqual(redacted);
  });

  it("never holds the token, even where the user's input carried it (R18)", () => {
    expect(report.markdown).not.toContain(TOKEN);
    expect(JSON.stringify(report.json)).not.toContain(TOKEN);
    expect(report.markdown).not.toContain("secret-token-value");
  });

  it("says when nothing has run", () => {
    const empty = buildReport([], { ...env, summary: undefined });
    expect(empty.markdown).toMatch(/No results/);
  });
});
