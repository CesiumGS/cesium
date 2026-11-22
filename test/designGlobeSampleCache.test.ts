// The design globe's ground-sample caches (scripts/designTiles/
// sampleCache.mjs; UX review M-d, re-review N1 and N2): private to the
// user, only ever read from a private folder, and read back checked, since
// their dates go into generated source and their heights into the design.
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkedCache,
  checkedCorridorGround,
  checkedCorridorSections,
  groundHeight,
  lidarHeight,
  readSampleCache,
  sampleCacheFile,
  writeSampleCache,
} from "../scripts/designTiles/sampleCache.mjs";

/** Dates that could carry code into a generated file, or aren't dates. */
const BAD_DATES = [
  "2026-11-08\nexport const x = 1;",
  '2026-11-08"; process.exit(1); "',
  "2026-11-08 */",
  "8 Nov 2026",
  20261108,
  undefined,
];

describe("the pole line's ground cache", () => {
  const good = {
    source: "anything",
    sampled: "2026-11-08",
    cells: { "530123.45,180456.78": [79.4, 79.5], "530200.00,180500.00": [] },
  };

  it("takes a date and heights", () => {
    expect(checkedCache(good, "c.json")).toEqual({
      sampled: "2026-11-08",
      cells: good.cells,
    });
  });

  it("refuses a date that could carry code into the generated file", () => {
    for (const sampled of BAD_DATES) {
      expect(() => checkedCache({ ...good, sampled }, "c.json")).toThrow(
        /sampled date/,
      );
    }
  });

  it("refuses cells that aren't heights", () => {
    for (const cells of [
      { "530123.45,180456.78": ["79.4"] },
      { "530123.45,180456.78": [Number.NaN] },
      { "530123.45,180456.78": [1e9] },
      { "530123.45,180456.78": 79.4 },
      { __proto__x: [1] },
      [],
    ]) {
      expect(() => checkedCache({ ...good, cells }, "c.json")).toThrow(
        /delete it to sample again/,
      );
    }
    expect(() => checkedCache(null, "c.json")).toThrow(/not an object/);
    expect(lidarHeight(Infinity)).toBe(false);
    expect(lidarHeight(-99.9)).toBe(true);
  });
});

describe("the corridor's ground cache", () => {
  const point = {
    station: 10_000,
    longitude: -122.16669618759583,
    latitude: 37.77789422170647,
    groundMeters: 96.504211426,
  };
  const good = {
    source: "x",
    sampled: "2026-11-07",
    every: 500,
    points: [point],
  };

  it("takes a date, a spacing and points, and only their fields", () => {
    const extra = { ...point, note: "<script>" };
    expect(
      checkedCorridorGround({ ...good, points: [extra] }, "g.json"),
    ).toEqual({
      sampled: "2026-11-07",
      every: 500,
      points: [point],
    });
  });

  it("refuses a bad date, spacing or point", () => {
    for (const sampled of BAD_DATES) {
      expect(() =>
        checkedCorridorGround({ ...good, sampled }, "g.json"),
      ).toThrow(/sampled date/);
    }
    for (const every of [0, -500, "500", Number.NaN]) {
      expect(() => checkedCorridorGround({ ...good, every }, "g.json")).toThrow(
        /spacing/,
      );
    }
    for (const bad of [
      { ...point, groundMeters: "96.5" },
      { ...point, groundMeters: 1e6 },
      { ...point, latitude: 91 },
      { ...point, station: Number.POSITIVE_INFINITY },
      null,
    ]) {
      expect(() =>
        checkedCorridorGround({ ...good, points: [bad] }, "g.json"),
      ).toThrow(/delete it to sample again/);
    }
    expect(() =>
      checkedCorridorGround({ ...good, points: [] }, "g.json"),
    ).toThrow(/no points/);
  });
});

describe("the corridor's sections cache", () => {
  const good = {
    source: "x",
    sampled: "2026-11-08",
    ground: { "10000,-41": 98.894676208, "12345.5,131.00000000000003": 101 },
  };

  it("takes a date and heights by station and offset", () => {
    expect(checkedCorridorSections(good, "s.json")).toEqual({
      sampled: "2026-11-08",
      ground: good.ground,
    });
    expect(groundHeight(8_999)).toBe(true);
  });

  it("refuses a bad date, key or height", () => {
    for (const sampled of BAD_DATES) {
      expect(() =>
        checkedCorridorSections({ ...good, sampled }, "s.json"),
      ).toThrow(/sampled date/);
    }
    for (const ground of [
      { "10000,-41": "98.9" },
      { "10000,-41": Number.NaN },
      { "10000,-41,1": 98.9 },
      { "10000,abc": 98.9 },
      { "10000,0x10": 98.9 },
      { "10000, -41": 98.9 },
      { ",-41": 98.9 },
      [],
    ]) {
      expect(() =>
        checkedCorridorSections({ ...good, ground }, "s.json"),
      ).toThrow(/delete it to sample again|no ground/);
    }
  });
});

describe("a sample cache on disk", () => {
  const dirs: string[] = [];
  const env = process.env.FRAMES_DATA_DIR;
  afterEach(() => {
    for (const d of dirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
    if (env === undefined) {
      delete process.env.FRAMES_DATA_DIR;
    } else {
      process.env.FRAMES_DATA_DIR = env;
    }
  });
  const scratch = () => {
    const d = mkdtempSync(join(tmpdir(), "sample-cache-test-"));
    dirs.push(d);
    return d;
  };
  const mode = (path: string) => statSync(path).mode & 0o777;
  // Windows has no POSIX permission bits (chmod only toggles read-only).
  const posix = process.platform !== "win32";
  const expectMode = (path: string, want: number) => {
    if (posix) {
      expect(mode(path)).toBe(want);
    }
  };
  const sections = { sampled: "2026-11-08", ground: { "10000,-41": 98.9 } };

  it("defaults to samples/ in the frames data directory, never the shared temporary one", () => {
    expect(sampleCacheFile("x.json")).toMatch(/[/\\]samples[/\\]x\.json$/);
    expect(sampleCacheFile("x.json").startsWith(tmpdir())).toBe(false);
  });

  it("keeps the default samples folder 0700, each file 0600", () => {
    const d = scratch();
    process.env.FRAMES_DATA_DIR = d;
    const file = sampleCacheFile("s.json");
    // A samples folder left looser than it should be is made private.
    mkdirSync(join(d, "samples"), { mode: 0o755 });
    chmodSync(join(d, "samples"), 0o755);
    writeSampleCache(file, sections);
    expectMode(join(d, "samples"), 0o700);
    expectMode(file, 0o600);
    expect(readSampleCache(file, checkedCorridorSections)).toEqual(sections);
  });

  it("makes a --samples path's new folders 0700 (UX re-review N2)", () => {
    const d = scratch();
    const file = join(d, "mine", "deeper", "s.json");
    writeSampleCache(file, sections);
    expectMode(join(d, "mine"), 0o700);
    expectMode(join(d, "mine", "deeper"), 0o700);
    expectMode(file, 0o600);
  });

  it("leaves a --samples path's own private folder as it is", () => {
    const d = scratch();
    const folder = join(d, "mine");
    mkdirSync(folder);
    chmodSync(folder, 0o755);
    writeSampleCache(join(folder, "s.json"), sections);
    expectMode(folder, 0o755);
    expectMode(join(folder, "s.json"), 0o600);
  });

  // Windows has no group/other write bit to refuse on; the user-profile ACLs apply.
  it.skipIf(!posix)(
    "neither writes nor reads a cache in a folder others can write (UX re-review N1, N2)",
    () => {
      const d = scratch();
      const shared = join(d, "shared");
      mkdirSync(shared);
      chmodSync(shared, 0o777);
      const file = join(shared, "s.json");
      expect(() => writeSampleCache(file, sections)).toThrow(/isn't private/);
      expect(() => statSync(file)).toThrow();
      // A file planted there, as one could be in /tmp, is never taken.
      writeFileSync(file, JSON.stringify(sections));
      expect(() => readSampleCache(file, checkedCorridorSections)).toThrow(
        /isn't private/,
      );
      expect(mode(shared)).toBe(0o777);
    },
  );

  it("is undefined when there is none, and reads nothing from the old shared-temporary default", () => {
    const d = scratch();
    expect(
      readSampleCache(join(d, "s.json"), checkedCorridorSections),
    ).toBeUndefined();
    // readSampleCache takes no second place to look (the move is gone).
    expect(readSampleCache.length).toBe(2);
  });
});
