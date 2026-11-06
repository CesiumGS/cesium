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
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import references from "../../examples/frames-explorer/references.json";
import {
  STRESS_CASES,
  STRESS_GROUPS,
  boundCrsChecks,
  groupResults,
  orionFromOem,
  ORION_OEM,
  runStress,
  type Fingerprint,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
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

describe("the frames explorer's stress tests, headless", () => {
  let results: StressResult[] = [];

  it("pass, every one", { timeout: 120_000 }, async () => {
    const recorded = UPDATE
      ? undefined
      : (JSON.parse(readFileSync(fingerprintsFile, "utf8")) as FingerprintFile)
          .fingerprints;
    const start = performance.now();
    results = await runStress(context, {
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

  it("gives structured-clone plain data (R13)", () => {
    for (const r of results) {
      expect(plainPath(r, r.id)).toBeUndefined();
      expect(structuredClone(r)).toEqual(r);
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

describe("every verdict is judged", () => {
  const holds = (r: StressResult) =>
    !r.pass ||
    r.tolerance === undefined ||
    (r.value !== undefined && Math.abs(r.value) <= r.tolerance);

  it("has no passing result beyond its tolerance, in the catalog or boundCrsChecks", async () => {
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
  });
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
