// The London ground script's sample cache (scripts/designTiles/
// poleLineCache.mjs; UX review M-d): read back checked, since its date goes
// into a generated source file's comment and its cells into the poles.
import { describe, expect, it } from "vitest";
import {
  checkedCache,
  lidarHeight,
} from "../scripts/designTiles/poleLineCache.mjs";

const good = {
  source: "anything",
  sampled: "2026-11-08",
  cells: { "530123.45,180456.78": [79.4, 79.5], "530200.00,180500.00": [] },
};

describe("the pole line's ground cache", () => {
  it("takes a date and heights", () => {
    expect(checkedCache(good, "c.json")).toEqual({
      sampled: "2026-11-08",
      cells: good.cells,
    });
  });

  it("refuses a date that could carry code into the generated file", () => {
    for (const sampled of [
      "2026-11-08\nexport const x = 1;",
      "2026-11-08 */",
      "8 Nov 2026",
      20261108,
    ]) {
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
