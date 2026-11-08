// The frame catalog over the frames store `npm run setup` fills, served by a
// stubbed `fetch` from the store's directory. `npm run test:data` runs it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { ANALYTIC_ACCURACY } from "../../src/frames/analytic.ts";
import {
  createFrameCatalog,
  type CatalogFrameName,
  type FrameCatalog,
} from "../../src/frames/catalog.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { createFrames, type Frames } from "../../src/frames/frames.ts";
import {
  loadFrameData,
  type FrameData,
} from "../../src/ephemeris/loadFrameData.ts";
import { icrfToFixed } from "../../src/time/celestial.ts";
import { celestialToTerrestrial } from "../../src/time/earthOrientation.ts";
import type { EopSample } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";

const BASE = "/frames-data/";
const dir = framesDataDirectory();

let data: FrameData;
let reference: Frames;
let catalog: FrameCatalog;
let precise: Frames;

beforeAll(async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const b = readFileSync(
        join(dir, decodeURIComponent(input.slice(BASE.length))),
      );
      return new Response(b);
    }),
  );
  data = await loadFrameData(BASE);
  reference = createFrames(data);
  catalog = createFrameCatalog({ data: BASE });
  precise = await catalog.tree();
});
afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const KEYS: Record<CatalogFrameName, keyof Frames> = {
  ICRF: "icrf",
  HCRS: "hcrs",
  GCRF: "gcrf",
  EARTH_ICRF: "earthIcrf",
  EME2000: "eme2000",
  MOON_ICRF: "moonIcrf",
  ITRF: "itrf",
  MOON_ME: "moonMe",
  MOON_PA: "moonPa",
};

/** The rotation angle between two Mat4s' linear parts (column-major), radians. */
function angleBetween(a: ArrayLike<number>, b: ArrayLike<number>): number {
  // trace(Aᵀ B) over the 3 × 3 parts (column-major, stride 4).
  let trace = 0;
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      trace += a[col * 4 + row]! * b[col * 4 + row]!;
    }
  }
  return Math.acos(Math.min(1, Math.max(-1, (trace - 1) / 2)));
}

const DAY_MS = 86_400_000;

/** The rotation angle between two row-major 3 × 3 rotations, radians. */
function rowAngle(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let trace = 0;
  for (let i = 0; i < 9; i++) {
    trace += a[i]! * b[i]!;
  }
  return Math.acos(Math.min(1, Math.max(-1, (trace - 1) / 2)));
}

const NO_EOP: EopSample = {
  ut1MinusUtc: 0,
  ut1MinusTai: 0,
  xp: 0,
  yp: 0,
  dX: 0,
  dY: 0,
  predicted: false,
  degraded: false,
};
const fixed = new Float64Array(9);
const model = new Float64Array(9);

describe("the frame catalog over the store", () => {
  it("runs every reference frame at precise, the catalog's own frames", () => {
    for (const name of catalog.names) {
      expect(catalog.precisionOf(name)).toBe("precise");
      expect(precise[KEYS[name]]).toBe(catalog.get(name));
    }
    expect(precise.data.leapSeconds.expires).toBe(data.leapSeconds.expires);
  });

  it("agrees with createFrames to the bit at 20 instants inside the span", () => {
    const first = Math.max(Date.UTC(2000, 0, 2), data.eop.first);
    const last = Math.min(Date.UTC(2049, 11, 30), data.eop.last);
    for (let k = 0; k < 20; k++) {
      const ms = Math.round(first + ((last - first) * (k + 0.5)) / 20);
      const instant = Instant.fromUtc(ms, data.leapSeconds);
      for (const name of catalog.names) {
        const key = KEYS[name];
        const ours = frameTransform(
          precise[key] as Frames["icrf"],
          precise.icrf,
          instant,
        );
        const theirs = frameTransform(
          reference[key] as Frames["icrf"],
          reference.icrf,
          instant,
        );
        expect(ours, `${name} at ${new Date(ms).toISOString()}`).toEqual(
          theirs,
        );
      }
      expect(precise.itrf.accuracy(instant)).toEqual(
        reference.itrf.accuracy(instant),
      );
    }
  });

  it("states each analytic stand-in's accuracy truly over 2000 to 2050 (daily)", () => {
    // The stand-ins, in a catalog of their own, against the precise tree.
    const analytic = createFrameCatalog({ data: BASE });
    const frame = (name: CatalogFrameName) => analytic.get(name);
    const worst: Record<string, number> = {};
    const note = (name: string, value: number) => {
      worst[name] = Math.max(worst[name] ?? 0, value);
    };
    const origin = (m: ArrayLike<number>) => [m[12]!, m[13]!, m[14]!];
    const apart = (a: number[], b: number[]) =>
      Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    const start = Date.UTC(2000, 0, 2);
    const end = Date.UTC(2049, 11, 30);
    const loaded = catalog;
    let instant = Instant.fromTt(0);
    const toIcrf = (name: CatalogFrameName, tree: "a" | "p") =>
      frameTransform(
        tree === "a" ? frame(name) : loaded.get(name),
        tree === "a" ? frame("ICRF") : loaded.get("ICRF"),
        instant,
      );
    for (let ms = start; ms <= end; ms += DAY_MS) {
      instant = Instant.fromUtc(ms, data.leapSeconds);
      for (const name of ["HCRS", "GCRF", "EARTH_ICRF"] as const) {
        note(name, apart(origin(toIcrf(name, "a")), origin(toIcrf(name, "p"))));
      }
      // The Moon from the Earth: Simon's series against DE440.
      const moonFromEarth = (tree: "a" | "p") => {
        const m = origin(toIcrf("MOON_ICRF", tree));
        const e = origin(toIcrf("EARTH_ICRF", tree));
        return [m[0]! - e[0]!, m[1]! - e[1]!, m[2]! - e[2]!];
      };
      note("moonFromEarth", apart(moonFromEarth("a"), moonFromEarth("p")));
      note(
        "MOON_ICRF",
        apart(
          origin(toIcrf("MOON_ICRF", "a")),
          origin(toIcrf("MOON_ICRF", "p")),
        ),
      );
      // The Sun from the Earth: Meeus against DE440.
      const sunFromEarth = (tree: "a" | "p") => {
        const s = origin(toIcrf("HCRS", tree));
        const e = origin(toIcrf("EARTH_ICRF", tree));
        return [s[0]! - e[0]!, s[1]! - e[1]!, s[2]! - e[2]!];
      };
      note("sunFromEarth", apart(sunFromEarth("a"), sunFromEarth("p")));
      note(
        "MOON_ME",
        angleBetween(
          frameTransform(frame("MOON_ME"), frame("MOON_ICRF"), instant),
          frameTransform(
            catalog.get("MOON_ME"),
            catalog.get("MOON_ICRF"),
            instant,
          ),
        ),
      );
      // The analytic model alone against IAU 2006/2000A: UT1 = UTC, no
      // polar motion, no celestial pole offsets.
      const dat = data.leapSeconds.taiMinusUtc(ms);
      note(
        "itrfModel",
        rowAngle(
          icrfToFixed(ms, fixed),
          celestialToTerrestrial(
            instant,
            { ...NO_EOP, ut1MinusTai: -dat },
            model,
          ),
        ),
      );
      if (ms >= data.eop.first && ms <= data.eop.lastObserved) {
        note(
          "ut1MinusUtc",
          Math.abs(data.eop.atInstant(instant, data.leapSeconds).ut1MinusUtc),
        );
        note(
          "ITRF",
          angleBetween(
            frameTransform(frame("ITRF"), frame("GCRF"), instant),
            frameTransform(loaded.get("ITRF"), loaded.get("GCRF"), instant),
          ),
        );
      }
    }
    const arcsec = (rad: number) => `${((rad * 648000) / Math.PI).toFixed(2)}″`;
    const km = (m: number) => `${(m / 1000).toFixed(0)} km`;
    const within = (
      name: string,
      measured: number,
      stated: number,
      show: (v: number) => string,
    ) =>
      expect(
        measured,
        `${name}: measured ${show(measured)}, stated ${show(stated)}`,
      ).toBeLessThanOrEqual(stated);
    within(
      "MOON_ME",
      worst.MOON_ME!,
      ANALYTIC_ACCURACY.MOON_ME.radians,
      arcsec,
    );
    // Rounded up from the measured figure, not padded past the next arcsecond.
    expect(
      worst.MOON_ME!,
      `MOON_ME: measured ${arcsec(worst.MOON_ME!)}`,
    ).toBeGreaterThan(ANALYTIC_ACCURACY.MOON_ME.radians - Math.PI / 648000);
    // ITRF's bound is derived from its parts; check each part and the whole.
    within("ITRF", worst.ITRF!, ANALYTIC_ACCURACY.ITRF.radians, arcsec);
    within(
      "ITRF's model part",
      worst.itrfModel!,
      (10 * Math.PI) / 648000,
      arcsec,
    );
    expect(
      worst.ut1MinusUtc!,
      "|UT1 - UTC| over the EOP table, s",
    ).toBeLessThan(0.9);
    within("HCRS", worst.HCRS!, ANALYTIC_ACCURACY.HCRS.meters, km);
    within("GCRF", worst.GCRF!, ANALYTIC_ACCURACY.GCRF.meters, km);
    within(
      "EARTH_ICRF",
      worst.EARTH_ICRF!,
      ANALYTIC_ACCURACY.EARTH_ICRF.meters,
      km,
    );
    within(
      "MOON_ICRF",
      worst.MOON_ICRF!,
      ANALYTIC_ACCURACY.MOON_ICRF.meters,
      km,
    );
    // The parts the notes state: the Sun's offset from the barycentre (about
    // 1.5 million km), Meeus's Sun (33,000 km) and Simon's Moon (2,100 km)
    // from the Earth.
    within("the barycentre's offset", worst.HCRS!, 1.5e9, km);
    within("Meeus's Sun", worst.sunFromEarth!, 3.3e7, km);
    within("Simon's Moon", worst.moonFromEarth!, 2.1e6, km);
    expect(analytic.precisionOf("MOON_ME")).toBe("analytic");
  }, 60_000);
});
