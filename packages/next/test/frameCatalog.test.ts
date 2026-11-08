// The frame catalog (plan 5a Task 6) over a stubbed store: synthetic packs
// (TDB -200 s to 200 s around J2000) and a short EOP table, served by a
// stubbed `fetch`.
import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FrameUnavailableError } from "../src/camera/frameResolver.ts";
import { ANALYTIC_ACCURACY, analyticUtcMs } from "../src/frames/analytic.ts";
import {
  createFrameCatalog,
  type FrameCatalog,
} from "../src/frames/catalog.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { createSkyState, skyState } from "../src/frames/sky.ts";
import type { FrameDataWarning } from "../src/ephemeris/loadFrameData.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { icrfToFixed } from "../src/time/celestial.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { sunDirection, sunPosition } from "../src/time/sun.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { pack } from "./syntheticPacks.ts";

const BASE = "/frames-data/";
const MJD_UNIX_EPOCH = 40587;

/** Daily EOP rows from `startMjd`, `days` of them (as test/loadFrameData.test.ts). */
function eopText(startMjd: number, days: number): string {
  const rows = ["DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE"];
  for (let i = 0; i < days; i++) {
    const mjd = startMjd + i;
    const date = new Date((mjd - MJD_UNIX_EPOCH) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows.push(`${date},${mjd},0.1,0.3,0.6,0.5,0,0,0.0001,-0.0002,32,O`);
  }
  return `${rows.join("\n")}\n`;
}

/** A leap-second excerpt from 1999 on, expiring after the built-in table. */
const LEAP_TEXT = `#  File expires on 28 December 2030
#    MJD        Date        TAI-UTC (s)
 51179.0    1  1 1999       32
 53736.0    1  1 2006       33
 54832.0    1  1 2009       34
 56109.0    1  7 2012       35
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`;

const bytesOf = (data: string | Uint8Array): ArrayBuffer => {
  const u8 =
    typeof data === "string" ? new TextEncoder().encode(data) : data.slice();
  return u8.buffer as ArrayBuffer;
};

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const ROLES: Record<string, string> = {
  "planets.pack": "planets",
  "moon.pack": "moon",
  "EOP-All.csv": "eop",
  "Leap_Second.dat": "leapSeconds",
};
const FILES: Record<string, ArrayBuffer> = {
  "planets.pack": bytesOf(
    pack("SPK", ["sun", "emb", "moon"], "ICRF", "position"),
  ),
  "moon.pack": bytesOf(pack("PCK", ["moonPa"], "MOON_PA", "euler")),
  // 1999-12-22 to 2000-01-11, around the synthetic packs' span.
  "EOP-All.csv": bytesOf(eopText(51534, 21)),
  // Expires after the built-in table, so the catalog adopts it.
  "Leap_Second.dat": bytesOf(LEAP_TEXT),
};

let requested: string[] = [];
let missing = new Set<string>();
const fetchCalls = () => requested.map((url) => url.slice(BASE.length));

beforeEach(async () => {
  requested = [];
  missing = new Set();
  const manifest = {
    files: await Promise.all(
      Object.entries(FILES).map(async ([file, bytes]) => ({
        file,
        role: ROLES[file]!,
        sha256: await sha256(bytes),
      })),
    ),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requested.push(input);
      const name = input.slice(BASE.length);
      if (name === "manifest.json") {
        return new Response(JSON.stringify(manifest));
      }
      const bytes = missing.has(name) ? undefined : FILES[name];
      return bytes
        ? new Response(bytes.slice(0))
        : new Response("not found", { status: 404 });
    }),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Inside the synthetic packs' span and the EOP table. */
const at = Instant.fromTt(0);

/** Row-major 3 × 3 of a column-major Mat4's linear part. */
const rotationOf = (m: ArrayLike<number>): number[] => {
  const r: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      r.push(m[col * 4 + row]!);
    }
  }
  return r;
};
const translationOf = (m: ArrayLike<number>): number[] => [
  m[12]!,
  m[13]!,
  m[14]!,
];
const norm = (v: ArrayLike<number>) => Math.hypot(v[0]!, v[1]!, v[2]!);
const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};

describe("sunPosition", () => {
  it("turns onto sunDirection by icrfToFixed, about 1 au away", () => {
    for (let k = 0; k < 50; k++) {
      const ms = Date.UTC(2000, 0, 1) + k * 31.7 * 86_400_000;
      const p = sunPosition(ms, new Float64Array(3));
      const m = icrfToFixed(ms);
      const fixed = [0, 1, 2].map(
        (i) =>
          m[3 * i]! * p[0]! + m[3 * i + 1]! * p[1]! + m[3 * i + 2]! * p[2]!,
      );
      const d = norm(p);
      const direction = sunDirection(ms, new Float64Array(3));
      expect(
        maxDiff(
          fixed.map((x) => x / d),
          direction,
        ),
      ).toBeLessThan(1e-15);
      expect(d / 149_597_870_700).toBeGreaterThan(0.983);
      expect(d / 149_597_870_700).toBeLessThan(1.017);
    }
  });
});

describe("the frame catalog", () => {
  it("names every built-in reference frame without loading anything", () => {
    const catalog = createFrameCatalog({ data: BASE });
    expect(catalog.names).toContain("MOON_ME");
    expect([...catalog.names].sort()).toEqual(
      [
        "ICRF",
        "HCRS",
        "GCRF",
        "EARTH_ICRF",
        "EME2000",
        "MOON_ICRF",
        "ITRF",
        "MOON_ME",
        "MOON_PA",
      ].sort(),
    );
    expect(catalog.treeInUse()).toEqual([]);
    expect(fetchCalls()).toEqual([]);
  });

  it("an analytic ask loads nothing and reproduces today's analytic sky", () => {
    const catalog = createFrameCatalog({ data: BASE });
    const icrf = catalog.get("ICRF");
    const itrf = catalog.get("ITRF", { user: "sky" });
    const hcrs = catalog.get("HCRS", { user: "sky" });
    const moonIcrf = catalog.get("MOON_ICRF", { user: "sky" });
    const moonMe = catalog.get("MOON_ME", { user: "sky" });
    const sky = createSkyState();
    const m = new Float64Array(16);
    const start = Date.UTC(2000, 0, 1);
    const end = Date.UTC(2050, 0, 1);
    let worst = 0;
    for (let k = 0; k < 100; k++) {
      const ms = Math.round(start + ((end - start) * (k + 0.37)) / 100);
      const instant = Instant.fromUtc(ms, catalog.leapSeconds);
      skyState(ms, undefined, sky);
      // ITRF to ICRF is icrfToFixedᵀ.
      const r = rotationOf(frameTransform(itrf, icrf, instant, m));
      const fixed = sky.icrfToFixed;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          worst = Math.max(worst, Math.abs(r[3 * i + j]! - fixed[3 * j + i]!));
        }
      }
      // The Sun's direction from the Earth, in ITRF.
      const sun = translationOf(frameTransform(hcrs, itrf, instant, m));
      const d = norm(sun);
      worst = Math.max(
        worst,
        maxDiff(
          sun.map((x) => x / d),
          sky.sunDirection,
        ),
      );
      // The Moon's centre in ITRF.
      const moon = translationOf(frameTransform(moonIcrf, itrf, instant, m));
      worst = Math.max(
        worst,
        maxDiff(moon, sky.moonPosition) / norm(sky.moonPosition),
      );
      // The Moon's axes in ITRF: MOON_ME's x and z columns.
      const axes = rotationOf(frameTransform(moonMe, itrf, instant, m));
      for (let i = 0; i < 3; i++) {
        worst = Math.max(
          worst,
          Math.abs(axes[3 * i]! - sky.moonAxes[i]!),
          Math.abs(axes[3 * i + 2]! - sky.moonAxes[3 + i]!),
        );
      }
    }
    expect(worst).toBeLessThan(1e-12);
    expect(catalog.precisionOf("ITRF")).toBe("analytic");
    expect(fetchCalls()).toEqual([]);
  });

  it("a precise ask runs on the stand-in while loading, then bumps the revision", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    const itrf = catalog.get("ITRF", { precision: "precise" });
    expect(catalog.precisionOf("ITRF")).toBe("analytic");
    expect(itrf.accuracy(at)).toBe(ANALYTIC_ACCURACY.ITRF);
    // 18″ (0.005°): icrfToFixed's bound against IAU 2006/2000A and the EOP.
    expect(itrf.accuracy(at).radians).toBeCloseTo(
      (18 / 3600) * (Math.PI / 180),
      12,
    );
    const standIn = frameTransform(itrf, catalog.get("GCRF"), at);
    const before = itrf.revision;
    await catalog.ready("ITRF", "precise");
    expect(itrf.revision).toBeGreaterThan(before);
    expect(catalog.precisionOf("ITRF")).toBe("precise");
    // Now the IAU 2006/2000A edge, with the EOP's stated accuracy.
    expect(itrf.accuracy(at).note).toContain("measured Earth orientation");
    const precise = frameTransform(itrf, catalog.get("GCRF"), at);
    expect(precise).not.toEqual(standIn);
    expect(maxDiff(precise, standIn)).toBeLessThan(1e-3);
  });

  it("a reference frame with no stand-in throws FrameUnavailableError until its data loads", async () => {
    // An added trajectory's reference frame: its states arrive later.
    const catalog = createFrameCatalog({ data: BASE });
    const data: { states?: Float64Array } = {};
    const orion = new Frame(
      "ORION",
      catalog.get("EARTH_ICRF"),
      (_instant, out) => {
        if (!data.states) {
          throw new FrameUnavailableError("ORION", "loading");
        }
        out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...data.states, 1]);
      },
    );
    catalog.add(orion, "rig");
    const icrf = catalog.get("ICRF");
    const error = (() => {
      try {
        frameTransform(orion, icrf, at);
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(FrameUnavailableError);
    expect((error as FrameUnavailableError).frame).toBe("ORION");
    expect((error as FrameUnavailableError).reason).toBe("loading");
    const row = catalog.treeInUse().find((r) => r.frame === orion)!;
    expect(row).toEqual({
      frame: orion,
      users: ["rig"],
      precision: "precise",
      standIn: false,
    });
    data.states = new Float64Array([7e6, 0, 0]);
    orion.invalidate();
    const placed = frameTransform(orion, catalog.get("EARTH_ICRF"), at);
    expect(translationOf(placed)).toEqual([7e6, 0, 0]);
  });

  it("a precise edge outside its data throws FrameUnavailableError (outsideData)", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    const moon = catalog.get("MOON_ICRF", { precision: "precise" });
    await catalog.ready("MOON_ICRF", "precise");
    const later = Instant.fromTt(86_400);
    const error = (() => {
      try {
        moon.toParent(later);
      } catch (e) {
        return e;
      }
    })() as FrameUnavailableError;
    expect(error).toBeInstanceOf(FrameUnavailableError);
    expect(error.reason).toBe("outsideData");
    expect(error.frame).toBe("MOON_ICRF");
    expect(error.message).toContain("outside the loaded span");
  });

  it("runs at the highest precision anyone asked for", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    catalog.get("ITRF", { precision: "analytic", user: "sky" });
    catalog.get("ITRF", { precision: "precise", user: "measurement" });
    await catalog.ready("ITRF", "precise");
    const itrf = catalog.get("ITRF", { precision: "analytic", user: "sky" });
    expect(catalog.precisionOf("ITRF")).toBe("precise");
    expect(itrf.accuracy(at).note).toContain("measured Earth orientation");
    // Its ancestor GCRF was asked for nothing more than analytic: no
    // ephemeris was fetched.
    expect(catalog.precisionOf("GCRF")).toBe("analytic");
    expect(fetchCalls()).not.toContain("planets.pack");
    // A frame whose provider has loaded switches as soon as it is asked.
    catalog.get("MOON_ICRF", { precision: "precise" });
    await catalog.ready("MOON_ICRF", "precise");
    const before = catalog.get("GCRF").revision;
    catalog.get("GCRF", { precision: "precise" });
    expect(catalog.precisionOf("GCRF")).toBe("precise");
    expect(catalog.get("GCRF").revision).toBeGreaterThan(before);
  });

  it("lists the tree in use with its users and ancestors", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    const itrf = catalog.get("ITRF", { user: "sky" });
    catalog.get("MOON_ME", { user: "rig", precision: "precise" });
    catalog.use(itrf, "measurement");
    const site = Frame.constant(
      "SITE",
      itrf,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6378137, 0, 0, 1],
    );
    catalog.add(site);
    const rows = catalog.treeInUse().map((r) => ({
      name: r.frame.name,
      users: r.users,
      precision: r.precision,
      standIn: r.standIn,
    }));
    expect(rows).toEqual([
      { name: "ICRF", users: [], precision: "precise", standIn: false },
      { name: "GCRF", users: [], precision: "analytic", standIn: false },
      {
        name: "ITRF",
        users: ["sky", "measurement"],
        precision: "analytic",
        standIn: false,
      },
      {
        name: "SITE",
        users: ["application"],
        precision: "precise",
        standIn: false,
      },
      { name: "MOON_ICRF", users: [], precision: "analytic", standIn: false },
      // Asked for "precise", running on its stand-in while its data loads.
      { name: "MOON_ME", users: ["rig"], precision: "analytic", standIn: true },
    ]);
    await catalog.ready("MOON_ME", "precise");
    const moonMe = catalog.treeInUse().find((r) => r.frame.name === "MOON_ME");
    expect(moonMe).toMatchObject({ precision: "precise", standIn: false });
    // The root stays ICRF: a frame from another tree is refused.
    expect(() => catalog.add(Frame.root("ELSEWHERE"))).toThrow(/ICRF/);
    expect(() =>
      catalog.add(Frame.constant("ITRF", itrf, new Float64Array(16))),
    ).toThrow(/ITRF/);
  });

  it("a failed load keeps the stand-in and warns once, naming the reference frame", async () => {
    missing.add("planets.pack");
    const catalog = createFrameCatalog({ data: BASE });
    const warned: FrameDataWarning[] = [];
    const changes: FrameCatalog[] = [];
    catalog.events.on("warning", (w) => warned.push(w));
    catalog.events.on("change", (c) => changes.push(c));
    const moon = catalog.get("MOON_ICRF", { precision: "precise" });
    const error = await catalog
      .ready("MOON_ICRF", "precise")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FrameUnavailableError);
    expect((error as FrameUnavailableError).reason).toBe("failed");
    expect((error as FrameUnavailableError).frame).toBe("MOON_ICRF");
    expect(catalog.precisionOf("MOON_ICRF")).toBe("analytic");
    expect(moon.accuracy(at)).toBe(ANALYTIC_ACCURACY.MOON_ICRF);
    expect(() => moon.toParent(at)).not.toThrow();
    expect(warned).toHaveLength(1);
    expect(warned[0]!.kind).toBe("loadFailed");
    expect(warned[0]!.frames).toEqual(["MOON_ICRF"]);
    expect(warned[0]!.message).toContain("MOON_ICRF");
    expect(warned[0]!.message).toContain("planets.pack");
    expect(catalog.warnings).toEqual(warned);
    expect(changes.length).toBeGreaterThan(0);
    // Asking again neither retries nor warns again.
    const calls = requested.length;
    catalog.get("HCRS", { precision: "precise" });
    await expect(catalog.ready("HCRS", "precise")).rejects.toBeInstanceOf(
      FrameUnavailableError,
    );
    expect(requested.length).toBe(calls);
    expect(warned).toHaveLength(1);
    // With nobody listening, the warning goes to the console.
    missing.add("EOP-All.csv");
    const quiet = createFrameCatalog({ data: BASE });
    await quiet.ready("ITRF", "precise").catch(() => {});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("ITRF"));
  });

  it("without a progress listener no onProgress reaches the loader: loads don't stream", async () => {
    const whole = vi.spyOn(Response.prototype, "arrayBuffer");
    await createFrameCatalog({ data: BASE }).tree();
    // Whole-body reads: the non-streaming path.
    expect(whole).toHaveBeenCalled();
  });

  it("with a progress listener (or onProgress) the loads stream and report", async () => {
    const whole = vi.spyOn(Response.prototype, "arrayBuffer");
    const catalog = createFrameCatalog({ data: BASE });
    const items = new Set<string>();
    catalog.events.on("progress", (p) => items.add(p.item));
    await catalog.tree();
    // Streamed: no whole-body read, one report stream per file.
    expect(whole).not.toHaveBeenCalled();
    expect(items.size).toBe(4);
    const viaOption: string[] = [];
    await createFrameCatalog({
      data: BASE,
      onProgress: (item) => viaOption.push(item),
    }).tree();
    expect(viaOption.length).toBeGreaterThan(0);
  });

  it("emits each data file's bytes as progress events, and still calls onProgress", async () => {
    const calls: string[] = [];
    const catalog = createFrameCatalog({
      data: BASE,
      onProgress: (item) => calls.push(item),
    });
    const events: string[] = [];
    let most = 0;
    catalog.events.on("progress", (p) => {
      events.push(p.item);
      most = Math.max(most, p.received);
    });
    await catalog.tree();
    expect(new Set(events)).toEqual(
      new Set(["EOP-All.csv", "Leap_Second.dat", "planets.pack", "moon.pack"]),
    );
    expect(most).toBeGreaterThan(0);
    expect(calls).toEqual(events);
  });

  it("the Earth orientation provider fetches only the EOP and leap-second files", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    await catalog.ready("ITRF", "precise");
    expect(fetchCalls()).toEqual([
      "manifest.json",
      "EOP-All.csv",
      "Leap_Second.dat",
    ]);
    expect(catalog.precisionOf("ITRF")).toBe("precise");
  });

  it("adopts the store's newer leap-second table, redoing the stand-ins", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    expect(catalog.leapSeconds).toBe(LeapSeconds.builtIn());
    const gcrf = catalog.get("GCRF");
    const moonMe = catalog.get("MOON_ME");
    const before = [gcrf.revision, moonMe.revision];
    await catalog.ready("ITRF", "precise");
    expect(catalog.leapSeconds).not.toBe(LeapSeconds.builtIn());
    expect(catalog.leapSeconds.expires).toBe(Date.UTC(2030, 11, 28));
    // The stand-ins read UTC through the table, so they are redone.
    expect(gcrf.revision).toBeGreaterThan(before[0]!);
    expect(moonMe.revision).toBeGreaterThan(before[1]!);
    // An instant from whole milliseconds reads back through the new table.
    const ms = Date.UTC(2020, 5, 1);
    const instant = Instant.fromUtc(ms, catalog.leapSeconds);
    expect(analyticUtcMs(instant, catalog.leapSeconds)).toBe(ms);
  });

  it("an error other than outside-the-data passes through unchanged", async () => {
    const loading = new FrameUnavailableError("EOP", "loading");
    const data = syntheticFrameData();
    const eop = Object.create(data.eop) as typeof data.eop;
    eop.atInstant = () => {
      throw loading;
    };
    const catalog = createFrameCatalog({ data: { ...data, eop } });
    const itrf = catalog.get("ITRF", { precision: "precise" });
    await catalog.ready("ITRF", "precise");
    expect(() => itrf.toParent(at)).toThrow(loading);
  });

  it("ITRF at precise past the EOP table throws outsideData, saying so", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    const itrf = catalog.get("ITRF", { precision: "precise" });
    await catalog.ready("ITRF", "precise");
    const later = Instant.fromTt(60 * 86_400);
    const error = (() => {
      try {
        itrf.toParent(later);
      } catch (e) {
        return e;
      }
    })() as FrameUnavailableError;
    expect(error).toBeInstanceOf(FrameUnavailableError);
    expect(error.reason).toBe("outsideData");
    expect(error.message).toContain("EOP table");
  });

  it("ready waits for the asked precision and can be cancelled", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    await expect(catalog.ready("GCRF", "analytic")).resolves.toBeUndefined();
    await expect(catalog.ready("EME2000", "precise")).resolves.toBeUndefined();
    expect(fetchCalls()).toEqual([]);
    const abort = new AbortController();
    abort.abort(new Error("not now"));
    await expect(
      catalog.ready("GCRF", "precise", { signal: abort.signal }),
    ).rejects.toThrow("not now");
    await catalog.ready("GCRF", "precise");
    expect(catalog.precisionOf("GCRF")).toBe("precise");
  });

  it("tree() is every built-in reference frame at precise, as createFrames builds it", async () => {
    const data = syntheticFrameData();
    const catalog = createFrameCatalog({ data });
    const tree = await catalog.tree();
    const reference = createFrames(data);
    expect(tree.data).toBe(data);
    expect(tree.itrf).toBe(catalog.get("ITRF"));
    for (const name of catalog.names) {
      expect(catalog.precisionOf(name)).toBe("precise");
    }
    const keys = [
      "hcrs",
      "gcrf",
      "earthIcrf",
      "eme2000",
      "moonIcrf",
      "itrf",
      "moonMe",
      "moonPa",
    ] as const;
    for (const key of keys) {
      expect(frameTransform(tree[key], tree.icrf, at)).toEqual(
        frameTransform(reference[key], reference.icrf, at),
      );
      expect(tree[key].accuracy(at)).toEqual(reference[key].accuracy(at));
    }
    expect(tree.bodyFixed(EARTH)).toBe(tree.itrf);
    expect(tree.bodyFixed(MOON)).toBe(tree.moonMe);
    expect(tree.bodyOf(tree.moonPa)).toBe(MOON);
    expect(tree.bodyOf(tree.gcrf)).toBeUndefined();
    expect(() =>
      tree.bodyFixed({ ...EARTH, name: "Mars", naifId: 499 }),
    ).toThrow(/Mars/);
    expect(fetchCalls()).toEqual([]);
  });

  it("emits change when data arrives and takes the store's warnings", async () => {
    const catalog = createFrameCatalog({ data: BASE });
    const changes: FrameCatalog[] = [];
    catalog.events.on("change", (c) => changes.push(c));
    catalog.get("ITRF", { precision: "precise" });
    await catalog.ready("ITRF", "precise");
    expect(changes).toContain(catalog);
    // The EOP table ends in 2000, before now.
    expect(catalog.warnings.map((w) => w.kind)).toContain("eopEnded");
  });
});

describe("the catalog's imports", () => {
  const root = normalize(join(import.meta.dirname, ".."));
  /** Every file reached by static (non-type) imports from `start`. */
  const staticClosure = (start: string): string[] => {
    const seen = new Set([start]);
    const queue = [start];
    for (let file = queue.pop(); file; file = queue.pop()) {
      const text = readFileSync(join(root, file), "utf8");
      const pattern =
        /^(?:import|export)\s+(?!type\b)[^;]*?from\s+"(\.[^"]+)"/gms;
      for (const [, specifier] of text.matchAll(pattern)) {
        const to = relative(
          root,
          join(root, dirname(file), specifier!),
        ).replaceAll("\\", "/");
        if (!seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
    return [...seen].sort();
  };

  it("reach no ERFA series, ephemeris, EOP parser or provider statically", () => {
    const reached = staticClosure("src/frames/catalog.ts");
    expect(reached).toContain("src/frames/analytic.ts");
    expect(reached).toContain("src/time/celestial.ts");
    const heavy = reached.filter(
      (f) =>
        f.includes("/providers/") ||
        f === "src/frames/edges.ts" ||
        f === "src/time/erfa/xy06.ts" ||
        f === "src/time/erfa/s06.ts" ||
        f === "src/time/eop.ts" ||
        f.startsWith("src/ephemeris/"),
    );
    expect(heavy).toEqual([]);
  });
});
