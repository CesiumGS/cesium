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
import {
  STRESS_CASES,
  orionFromOem,
  ORION_OEM,
  runStress,
  type Fingerprint,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { loadProj } from "../../src/engineering/proj.ts";
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
