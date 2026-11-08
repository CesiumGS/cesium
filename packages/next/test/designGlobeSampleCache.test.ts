// The design globe's ground-sample caches (scripts/designTiles/
// sampleCache.mjs; UX review M-d): private to the user, moved from the old
// shared-temporary default, and read back checked, since their dates go
// into generated source and their heights into the design.
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  afterEach(() => {
    for (const d of dirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });
  const scratch = () => {
    const d = mkdtempSync(join(tmpdir(), "sample-cache-test-"));
    dirs.push(d);
    return d;
  };
  const sections = { sampled: "2026-11-08", ground: { "10000,-41": 98.9 } };

  it("defaults to samples/ in the frames data directory", () => {
    expect(sampleCacheFile("x.json")).toMatch(/[/\\]samples[/\\]x\.json$/);
    expect(sampleCacheFile("x.json").startsWith(tmpdir())).toBe(false);
  });

  it("writes 0600 in a 0700 folder", () => {
    const file = join(scratch(), "samples", "s.json");
    writeSampleCache(file, sections);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(join(file, "..")).mode & 0o777).toBe(0o700);
  });

  it("moves a cache from the old default, checked, so it needn't be sampled again", () => {
    const d = scratch();
    const legacy = join(d, "old.json");
    const file = join(d, "samples", "s.json");
    writeFileSync(legacy, JSON.stringify({ source: "x", ...sections }));
    expect(readSampleCache(file, checkedCorridorSections, legacy)).toEqual(
      sections,
    );
    expect(() => statSync(legacy)).toThrow();
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(sections);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    // Read again from its new place.
    expect(readSampleCache(file, checkedCorridorSections, legacy)).toEqual(
      sections,
    );
  });

  it("refuses a bad cache at the old default and leaves it there", () => {
    const d = scratch();
    const legacy = join(d, "old.json");
    const file = join(d, "samples", "s.json");
    writeFileSync(legacy, JSON.stringify({ ...sections, sampled: "now\n" }));
    expect(() =>
      readSampleCache(file, checkedCorridorSections, legacy),
    ).toThrow(/sampled date/);
    expect(statSync(legacy).isFile()).toBe(true);
    expect(() => statSync(file)).toThrow();
  });

  it("is undefined when there is none", () => {
    const d = scratch();
    expect(
      readSampleCache(
        join(d, "s.json"),
        checkedCorridorSections,
        join(d, "o.json"),
      ),
    ).toBeUndefined();
  });
});
