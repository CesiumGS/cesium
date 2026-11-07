// The frames explorer's stress-test catalog (examples/frames-explorer/tests.ts),
// run headless against the frames data store: every case the page shows must
// pass here too (plan R2). `npm run test:data` runs it.
//
// FRAMES_EXPLORER_VERBOSE=1 prints every result, not only the failures.
// FRAMES_EXPLORER_UPDATE=1 rewrites examples/frames-explorer/fingerprints.json
// from this run (R12); otherwise every fingerprinted result is compared
// against it, and a mismatch fails its case.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { comparedFor } from "../../examples/frames-explorer/content.ts";
import { takeCitations } from "../../examples/frames-explorer/stress/references.ts";
import references from "../../examples/frames-explorer/references.json";
import {
  STRESS_CASES,
  STRESS_GROUPS,
  boundCrsChecks,
  collectCitations,
  groupResults,
  orionFromOem,
  ORION_OEM,
  runStress,
  type Fingerprint,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import { loadProj, type ProjApi } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const dir = framesDataDirectory();
const base = `${join(dir, "proj")}/`;
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const frames = createFrames({
  leapSeconds: LeapSeconds.builtIn(),
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);

const example = new URL("../../examples/frames-explorer/", import.meta.url);
const fingerprintsFile = new URL("fingerprints.json", example);
const referencesFile = new URL("references.json", example);
const UPDATE = process.env.FRAMES_EXPLORER_UPDATE === "1";
const VERBOSE = process.env.FRAMES_EXPLORER_VERBOSE === "1";

interface FingerprintFile {
  readonly fingerprints: Readonly<Record<string, Fingerprint>>;
}

const context: StressContext = {
  frames,
  // Node's PROJ finds the grids beside proj.db, so GEOID18 needs no loading.
  loadProj: () => loadProj({ base }),
  loadOrion: () =>
    Promise.resolve(
      orionFromOem(readFileSync(join(dir, ORION_OEM), "utf8"), frames),
    ),
  manifest: JSON.parse(
    readFileSync(join(dir, "manifest.json"), "utf8"),
  ) as StoreManifest,
};

/** Every value is a primitive, a plain object or an array (R13: results cross to a worker). */
function plainPath(value: unknown, path: string): string | undefined {
  if (typeof value === "function" || typeof value === "symbol") {
    return path;
  }
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype) {
    return `${path} (${proto?.constructor?.name})`;
  }
  for (const [key, child] of Object.entries(value)) {
    const bad = plainPath(child, `${path}.${key}`);
    if (bad !== undefined) {
      return bad;
    }
  }
  return undefined;
}

// Vitest hides a passing test's console output; the run line is wanted always.
const print = (line: string) => process.stdout.write(`${line}\n`);

const describeResult = (r: StressResult): string =>
  [
    `${r.id}: ${r.title}`,
    r.value !== undefined ? `value ${r.value} ${r.unit ?? ""}` : "",
    r.tolerance !== undefined ? `tolerance ${r.tolerance}` : "",
    r.expectedError !== undefined ? `expected /${r.expectedError}/` : "",
    r.error !== undefined ? `error "${r.error}"` : "",
    r.detail ?? "",
    r.fingerprintCheck?.difference ?? "",
  ]
    .filter((s) => s !== "")
    .join(" | ");

/**
 * The source each result of a case that cites more than one value compares
 * against (F28, R10), checked one by one: a case's first citation is no
 * stand-in for another result's (the time-dependent Helmert is not the
 * position-vector example). Reviewed against each case's code.
 */
const SOURCES: Readonly<Record<string, string>> = {
  "distortion.low-distortion.test-points": "ocrs-handbook",
  "distortion.low-distortion.portland": "ocrs-handbook",
  "distortion.low-distortion.state-plane": "epsg-oregon-north",
  "coordinate-epoch.nad83-itrf2014.helmert-iogp-position-vector":
    "iogp-helmert-position-vector",
  "coordinate-epoch.nad83-itrf2014.helmert-iogp-time-dependent":
    "iogp-helmert-time-dependent",
  "coordinate-epoch.nad83-itrf2014.epoch-2010": "epsg-8970",
  "coordinate-epoch.nad83-itrf2014.epoch-2026": "epsg-8970",
  "coordinate-epoch.nad83-itrf2014.difference": "epsg-8970",
  "coordinate-epoch.nad83-itrf2014.no-epoch": "epsg-8970",
  "space.dss43-orion.light-time": "dsn-dss43",
  "space.dss43-orion.doppler": "dsn-dss43",
  "space.line-of-sight.behind-moon": "naif-moon-radius",
  "space.line-of-sight.clear": "naif-moon-radius",
  "space.effects.frame-bias": "iers-frame-bias",
  "space.effects.gcrf-scale": "iers-numerical-standards",
  "space.effects.moon-me-pa": "naif-moon-me-de440",
  "space.effects.earth-orientation": "dsn-dss43",
  "space.effects.earth-orientation-angle": "dsn-dss43",
  "operation-candidates.ed50-north-sea.candidates": "epsg-1311",
  "operation-candidates.ed50-north-sea.recorded": "epsg-1311",
  "operation-candidates.ed50-north-sea.epsg-1311": "epsg-1311",
  "operation-candidates.ed50-north-sea.epsg-1133": "epsg-1133",
  "operation-candidates.ed50-north-sea.epsg-1134": "epsg-1134",
  "operation-candidates.ed50-north-sea.spread": "epsg-1311",
  "ifc-map-conversion.ifc43-utm.origin": "ifc43-geographic-referencing-utm",
  "ifc-map-conversion.ifc43-utm.elevation": "ifc43-geographic-referencing-utm",
  "ifc-map-conversion.ifc43-utm.x-axis": "ifc43-geographic-referencing-utm",
  "ifc-map-conversion.ifc43-utm.round-trip": "ifc43-geographic-referencing-utm",
  "ifc-map-conversion.ifc43-utm.gauss-kruger":
    "ifc43-geographic-referencing-gk",
  "heights-and-wgs84.nad83-itrf2014": "epsg-8970",
  "bound-crss.ed50-utm31n.source-crs": "input-wkt2-ed50-utm31n",
  "bound-crss.ed50-utm31n.recorded-operation": "input-wkt2-ed50-utm31n",
  "bound-crss.ed50-utm31n.helmert": "input-wkt2-ed50-utm31n",
  "bound-crss.ed50-utm31n.round-trip": "input-wkt2-ed50-utm31n",
  "bound-crss.ed50-utm31n.registry": "epsg-1311",
  "bound-crss.ed50-utm31n.accuracy": "input-wkt2-ed50-utm31n",
  "bound-crss.tokyo-jprcs-ix.source-crs": "input-wkt2-tokyo-jprcs-ix",
  "bound-crss.tokyo-jprcs-ix.recorded-operation": "input-wkt2-tokyo-jprcs-ix",
  "bound-crss.tokyo-jprcs-ix.helmert": "input-wkt2-tokyo-jprcs-ix",
  "bound-crss.tokyo-jprcs-ix.round-trip": "input-wkt2-tokyo-jprcs-ix",
  "bound-crss.tokyo-jprcs-ix.registry": "epsg-15484",
  "bound-crss.tokyo-jprcs-ix.accuracy": "input-wkt2-tokyo-jprcs-ix",
  "bound-crss.osgb36-bng.source-crs": "input-wkt2-osgb36-bng",
  "bound-crss.osgb36-bng.recorded-operation": "input-wkt2-osgb36-bng",
  "bound-crss.osgb36-bng.helmert": "input-wkt2-osgb36-bng",
  "bound-crss.osgb36-bng.round-trip": "input-wkt2-osgb36-bng",
  "bound-crss.osgb36-bng.registry": "epsg-1314",
  "bound-crss.osgb36-bng.accuracy": "input-wkt2-osgb36-bng",
  "time-scales.offsets.tt-tai": "iers-tt-tai",
  "time-scales.offsets.gps-zero": "iers-leap-second-1980",
  "time-scales.gps-utc-leap.step": "iers-bulletin-c-52",
  "time-scales.gps-utc-leap.continuous": "iers-bulletin-c-52",
  "lunar-time.moon-vs-earth.synodic": "ashby-patla-2024",
  "lunar-time.moon-vs-earth.sidereal": "ashby-patla-2024",
};

describe("the frames explorer's stress tests, headless", () => {
  let results: StressResult[] = [];
  /** The references.json entries each case cited while it ran, collected here independently of the runner. */
  const ranCites = new Map<string, string[]>();
  const watched = STRESS_CASES.map((c) => ({
    ...c,
    run: async (ctx: StressContext) => {
      const { value, ids } = await collectCitations(() => c.run(ctx));
      ranCites.set(c.id, ids);
      return value;
    },
  }));

  it("pass, every one", { timeout: 120_000 }, async () => {
    const recorded = UPDATE
      ? undefined
      : (JSON.parse(readFileSync(fingerprintsFile, "utf8")) as FingerprintFile)
          .fingerprints;
    const start = performance.now();
    results = await runStress(context, {
      cases: watched,
      ...(recorded && { fingerprints: recorded }),
    });
    const seconds = (performance.now() - start) / 1000;
    print(
      `frames explorer: ${results.length} results from ${STRESS_CASES.length} cases in ${seconds.toFixed(2)} s`,
    );
    if (UPDATE) {
      const fingerprints: Record<string, Fingerprint> = {};
      for (const r of results) {
        if (r.fingerprint) {
          fingerprints[r.id] = r.fingerprint;
        }
      }
      // Formatted by the repository's prettier (the root's dev dependency,
      // which the format check runs), so a rewrite is clean.
      // eslint-disable-next-line n/no-extraneous-import
      const prettier = await import("prettier");
      writeFileSync(
        fingerprintsFile,
        await prettier.format(JSON.stringify({ fingerprints }), {
          parser: "json",
        }),
      );
      print(
        `frames explorer: wrote ${Object.keys(fingerprints).length} fingerprints`,
      );
    }
    if (VERBOSE) {
      for (const r of results) {
        print(`${r.pass ? "pass" : "FAIL"} ${describeResult(r)}`);
      }
    }
    const failures = results.filter((r) => !r.pass);
    for (const r of failures) {
      print(`FAIL ${describeResult(r)}`);
    }
    expect(failures.map(describeResult)).toEqual([]);
    expect(results.length).toBeGreaterThan(0);
  });

  it("gives every case at least one result, each with a unique id", () => {
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of STRESS_CASES) {
      expect(
        results.some((r) => r.id === c.id || r.id.startsWith(`${c.id}.`)),
        c.id,
      ).toBe(true);
    }
  });

  it("has every scenario's proof among its results, each judged and passing (ruling S1: non-empty lists)", () => {
    const byId = new Map(results.map((r) => [r.id, r]));
    const proof = SCENARIOS.flatMap((s) => s.proof);
    expect(proof.length).toBeGreaterThan(0);
    for (const id of proof) {
      const r = byId.get(id);
      expect(r?.pass, id).toBe(true);
      // A display-only result is shown, not judged: it proves nothing.
      expect(r?.displayOnly, id).not.toBe(true);
    }
  });

  it("gives structured-clone plain data (R13)", () => {
    for (const r of results) {
      expect(plainPath(r, r.id)).toBeUndefined();
      expect(structuredClone(r)).toEqual(r);
    }
  });

  it("states an accuracy for every result: a position statement or an accuracy note, never a blank (F27, R8)", () => {
    for (const r of results) {
      const note = r.accuracyNote?.trim() ?? "";
      expect(r.accuracy !== undefined || note !== "", r.id).toBe(true);
    }
  });

  it("cites its source on every result of a case that reads references.json (F28, R10)", () => {
    const entries = references.entries as unknown as Record<string, unknown>;
    let cited = 0;
    for (const c of STRESS_CASES) {
      const cites = new Set([
        ...(c.cites ?? []),
        ...(ranCites.get(c.id) ?? []),
      ]);
      const own = results.filter(
        (r) => r.id === c.id || r.id.startsWith(`${c.id}.`),
      );
      for (const r of own) {
        if (cites.size === 0) {
          expect(r.source, r.id).toBeUndefined();
          continue;
        }
        cited++;
        expect(r.source, r.id).toBeDefined();
        expect(cites.has(r.source!.reference), r.id).toBe(true);
        expect(entries[r.source!.reference], r.id).toBeDefined();
        expect(r.source!.document, r.id).not.toBe("");
        expect(r.source!.retrieved, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    expect(cited).toBeGreaterThan(50);
  });

  it("names, for each result of a case citing several values, the one it compares against (F28)", () => {
    const value = (id: string) => !id.startsWith("epsg-ellipsoid-");
    let checked = 0;
    for (const c of STRESS_CASES) {
      const cites = new Set([
        ...(c.cites ?? []),
        ...(ranCites.get(c.id) ?? []),
      ]);
      if ([...cites].filter(value).length < 2) {
        continue;
      }
      for (const r of results.filter(
        (x) => x.id === c.id || x.id.startsWith(`${c.id}.`),
      )) {
        expect(SOURCES[r.id], `${r.id} is in SOURCES`).toBeDefined();
        expect(r.source?.reference, r.id).toBe(SOURCES[r.id]);
        checked++;
      }
    }
    expect(checked).toBe(Object.keys(SOURCES).length);
  });

  it("says what each result with its own comparison is compared against, as its case does (R10, R16)", () => {
    const group = { kind: "formula" as const, text: "the group's" };
    // Each override's text and the case's own title share what is compared.
    const BY_CHECK: Record<string, RegExp> = {
      "measurement.clothoid": /station and offset/,
      "measurement.design-vs-itrf": /design point fixed in ITRF/,
      "rigid-placement-budget.site-gap.drop": /d²\/2R/,
      "rigid-placement-budget.site-gap.along": /d\(s\/k̄ − 1\) \+ d³\/3R²/,
      "trajectory.moon-me.distance": /distance from the Moon's centre/,
      "trajectory.moon-me.round-trip": /MOON_ME/,
      "space.moon-from-sacramento.direction": /R\.A\. and DEC/,
      "space.moon-from-sacramento.range": /Horizons' delta/,
      "space.moon-from-sacramento.horizon": /azimuth and elevation/,
      frame: /engineering frame/,
      "source-crs": /axis unit/,
      "recorded-operation": /TOWGS84|registry prints/,
      helmert: /coded by hand from the EPSG record|EPSG record/,
      "round-trip": /body-fixed/,
      registry: /registry operation/,
      accuracy: /the measurement states/,
    };
    let checked = 0;
    for (const r of results) {
      const c = comparedFor(r.id, group);
      if (c === group || r.group === "reproducibility") {
        continue;
      }
      const key =
        BY_CHECK[r.id] ?? BY_CHECK[r.id.slice(r.id.lastIndexOf(".") + 1)];
      expect(key, `${r.id}: no phrase to check it by`).toBeDefined();
      expect(r.title, r.id).toMatch(key!);
      expect(c.text, r.id).toMatch(key!);
      checked++;
    }
    // The measurement and Orion results, and every bound CRS's checks.
    expect(checked).toBeGreaterThanOrEqual(4 + 4 * 5);
  });

  it("traces every result from its input to its output (F28, R16)", () => {
    for (const r of results) {
      expect(r.trace?.[0]?.kind, r.id).toBe("input");
      for (const step of r.trace!) {
        expect(step.value, `${r.id}: ${step.label}`).not.toBe("");
      }
    }
  });

  it("matches every recorded fingerprint, and records no stale ones (R12)", () => {
    if (UPDATE) {
      return;
    }
    const recorded = (
      JSON.parse(readFileSync(fingerprintsFile, "utf8")) as FingerprintFile
    ).fingerprints;
    const fingerprinted = results.filter((r) => r.fingerprint !== undefined);
    expect(fingerprinted.length).toBeGreaterThan(0);
    for (const r of fingerprinted) {
      expect(r.fingerprintCheck, r.id).toEqual({ match: true });
    }
    expect(Object.keys(recorded).sort()).toEqual(
      fingerprinted.map((r) => r.id).sort(),
    );
  });
});

describe('boundCrsChecks, R18\'s "Try your own"', () => {
  const wkt = (key: string) =>
    (references.entries as unknown as Record<string, { wkt2: string }>)[
      `input-wkt2-${key}`
    ]!.wkt2;

  it("runs the bound-CRS checks on pasted WKT, marked as the user's input, unfingerprinted and uncounted", async () => {
    const user = await boundCrsChecks(
      context,
      wkt("ed50-utm31n"),
      "My ED50 model",
    );
    const ids = user.map((r) => r.id);
    expect(ids).toContain("bound-crss.user.my-ed50-model.helmert");
    for (const r of user) {
      expect(r.userInput, r.id).toBe(true);
      expect(r.fingerprint, r.id).toBeUndefined();
      expect(r.group).toBe("bound-crss");
      expect(structuredClone(r)).toEqual(r);
    }
    // The judged checks pass for the catalog's own input; the registry
    // effect is shown, not judged, with no EPSG record to check it by.
    const judged = user.filter((r) => r.displayOnly !== true);
    expect(judged.map((r) => r.id).sort()).toEqual(
      [
        "bound-crss.user.my-ed50-model.helmert",
        "bound-crss.user.my-ed50-model.recorded-operation",
        "bound-crss.user.my-ed50-model.round-trip",
        "bound-crss.user.my-ed50-model.source-crs",
      ].sort(),
    );
    for (const r of judged) {
      expect(r.pass, r.id).toBe(true);
      expect(Math.abs(r.value!)).toBeLessThanOrEqual(r.tolerance!);
    }
    // The card's count leaves the user's input out.
    const card = STRESS_GROUPS.find((g) => g.id === "bound-crss")!;
    const headline = card.headline(user);
    expect(headline).toMatch(/^0 of 0 pass/);
    expect(groupResults(card, user)).toHaveLength(user.length);
  });

  it("leaves no citation behind outside a run, however often it runs (the module's pending list stays empty)", async () => {
    takeCitations();
    for (let i = 0; i < 3; i++) {
      await boundCrsChecks(context, wkt("tokyo-jprcs-ix"), `Run ${i}`);
    }
    expect(takeCitations()).toEqual([]);
  });

  it("says why it skips the Helmert when the WKT carries no TOWGS84", async () => {
    const user = await boundCrsChecks(context, wkt("wgs84-utm31n"), "UTM");
    const helmert = user.find((r) => r.id.endsWith(".helmert"))!;
    expect(helmert.displayOnly).toBe(true);
    expect(helmert.detail).toMatch(/no TOWGS84/);
  });

  it("gives one failed result, not a throw, for text that is not a CRS", async () => {
    const user = await boundCrsChecks(context, "PROJCRS[oops", "Broken");
    expect(user).toHaveLength(1);
    expect(user[0]!.pass).toBe(false);
    expect(user[0]!.userInput).toBe(true);
    expect(user[0]!.error).toMatch(/WKT/);
  });

  // A PROJ whose created operations use a Helmert 10 m off in X: what the
  // WKT says is unchanged, so the hand Helmert disagrees with the frame.
  const tampered = async (): Promise<ProjApi> => {
    const P = await loadProj({ base });
    return new Proxy(P, {
      get(target, key, receiver) {
        if (key === "proj_create") {
          return (definition: string) =>
            target.proj_create(definition.replace("+x=-87 ", "+x=-77 "));
        }
        const value: unknown = Reflect.get(target, key, receiver);
        return typeof value === "function"
          ? (value as (...a: unknown[]) => unknown).bind(target)
          : value;
      },
    });
  };

  it("judges its results: a frame 10 m off the WKT's Helmert fails", async () => {
    const user = await boundCrsChecks(
      { ...context, proj: await tampered() },
      wkt("ed50-utm31n"),
      "Tampered",
    );
    const helmert = user.find((r) => r.id.endsWith(".helmert"))!;
    // At the projection's origin (0°, 3°E) 10 m in X is mostly up, which
    // the geog2D Helmert drops: 0.52 m of it is horizontal.
    expect(helmert.value).toBeGreaterThan(0.5);
    expect(helmert.pass).toBe(false);
    expect(helmert.detail).toMatch(/beyond its tolerance/);
  });

  it("names a non-Helmert bound transformation once, and says why it skips the hand comparison", async () => {
    // A BOUNDCRS whose transformation is EPSG 9619 (Geographic2D offsets).
    const offsets = wkt("ed50-utm31n").replace(
      /ABRIDGEDTRANSFORMATION\[[\s\S]*\]\]\s*$/,
      'ABRIDGEDTRANSFORMATION["offsets",METHOD["Geographic2D offsets",ID["EPSG",9619]],PARAMETER["Latitude offset",-3.5,ANGLEUNIT["arc-second",4.84813681109536E-06],ID["EPSG",8601]],PARAMETER["Longitude offset",-4.5,ANGLEUNIT["arc-second",4.84813681109536E-06],ID["EPSG",8602]]]]',
    );
    const user = await boundCrsChecks(context, offsets, "Offsets");
    const ids = user.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const recorded = user.filter((r) => r.id.endsWith(".recorded-operation"));
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.pass).toBe(false);
    expect(recorded[0]!.error).toMatch(/Geographic2D offsets/);
    const helmert = user.find((r) => r.id.endsWith(".helmert"))!;
    expect(helmert.detail).toMatch(
      /the bound transformation isn't a Helmert \(Geographic2D offsets\)/,
    );
    expect(helmert.detail).not.toMatch(/no TOWGS84/);
  });

  it("reads WKT1's TOWGS84 and checks it by hand", async () => {
    const P = await loadProj({ base });
    for (const definition of [
      "+proj=utm +zone=31 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs",
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs +type=crs",
    ]) {
      const wkt1 = P.proj_as_wkt(
        P.proj_create(definition),
        (P as unknown as { PJ_WKT1_GDAL: ProjApi["PJ_WKT2_2019"] })
          .PJ_WKT1_GDAL,
      );
      expect(wkt1).toMatch(/^PROJCS\[/);
      const user = await boundCrsChecks(context, wkt1, "WKT1");
      const helmert = user.find((r) => r.id.endsWith(".helmert"))!;
      expect(helmert.displayOnly, helmert.detail).toBeUndefined();
      expect(helmert.pass, helmert.detail).toBe(true);
      expect(helmert.value!).toBeLessThan(1e-3);
      const recorded = user.find((r) => r.id.endsWith(".recorded-operation"))!;
      expect(recorded.pass, recorded.detail).toBe(true);
    }
  });
});

describe("without the frame data (R5, F44)", () => {
  it(
    "runs every case that needs no frame data, and skips only the ones that do",
    { timeout: 120_000 },
    async () => {
      const recorded = (
        JSON.parse(readFileSync(fingerprintsFile, "utf8")) as FingerprintFile
      ).fingerprints;
      const loadOrion = vi.fn(() =>
        Promise.reject(new Error("Orion is placed in the frames")),
      );
      const all = await runStress(
        {
          loadFrames: () => Promise.reject(new Error("no frame data here")),
          loadProj: () => loadProj({ base }),
          loadOrion,
          manifest: context.manifest,
        },
        { fingerprints: recorded },
      );
      const caseOf = (id: string) =>
        STRESS_CASES.filter(
          (c) => id === c.id || id.startsWith(`${c.id}.`),
        ).sort((a, b) => b.id.length - a.id.length)[0]!;
      let ran = 0;
      for (const r of all) {
        const c = caseOf(r.id);
        const needsFrames =
          c.needs.includes("frames") || c.needs.includes("orion");
        if (needsFrames) {
          expect(r.missing, r.id).toContain("frames");
          expect(r.detail, r.id).toMatch(/frame data/);
        } else if (r.missing !== undefined) {
          // Only an optional use of the frames may go missing.
          expect(c.optionalNeeds, r.id).toContain("frames");
          expect(r.missing, r.id).toEqual(["frames"]);
        } else {
          // Expected throws (R7) carry their error and pass.
          if (r.expectedError === undefined) {
            expect(r.error, r.id).toBeUndefined();
          }
          expect(r.pass, describeResult(r)).toBe(true);
          ran++;
        }
      }
      expect(loadOrion).not.toHaveBeenCalled();
      // The PROJ-only groups, units, site grids, vertical profiles and the rest.
      expect(ran).toBeGreaterThan(150);
      print(`without frame data: ${ran} of ${all.length} results ran`);
    },
  );
});

describe("every verdict is judged", () => {
  const holds = (r: StressResult) =>
    !r.pass ||
    r.tolerance === undefined ||
    (r.value !== undefined && Math.abs(r.value) <= r.tolerance);

  // Reruns the whole catalog (about 5 s, 8 s on a loaded machine): the
  // same timeout as the first run, so load can't fail it.
  it(
    "has no passing result beyond its tolerance, in the catalog or boundCrsChecks",
    {
      timeout: 120_000,
    },
    async () => {
      const all = await runStress(context);
      for (const r of all) {
        expect(holds(r), r.id).toBe(true);
      }
      const entries = references.entries as unknown as Record<
        string,
        { kind?: string; wkt2?: string }
      >;
      for (const [id, entry] of Object.entries(entries)) {
        if (entry.kind !== "input" || entry.wkt2 === undefined) {
          continue;
        }
        for (const r of await boundCrsChecks(context, entry.wkt2, id)) {
          expect(holds(r), r.id).toBe(true);
        }
      }
    },
  );
});

describe("references.json (R10, Review Focus 6)", () => {
  interface Entry {
    readonly kind?: string;
    readonly source?: { readonly retrieved?: string } & Record<string, unknown>;
  }
  const file = JSON.parse(readFileSync(referencesFile, "utf8")) as {
    entries: Record<string, Entry>;
  };

  it("cites a source with a retrieval date for every entry", () => {
    expect(typeof file.entries).toBe("object");
    for (const [id, entry] of Object.entries(file.entries)) {
      expect(entry.source, id).toBeDefined();
      expect(entry.source!.retrieved, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("takes no expected value from PROJ, pyproj or this library", () => {
    for (const [id, entry] of Object.entries(file.entries)) {
      // Inputs (ruling F6's bound-CRS WKT) are not expected values.
      if (entry.kind === "input") {
        continue;
      }
      expect(JSON.stringify(entry.source), id).not.toMatch(
        /\bproj\b|pyproj|proj\.js|proj\.db|cesium/i,
      );
    }
  });
});
