import { describe, expect, it } from "vitest";
import { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import { Instant } from "../src/time/Instant.ts";
import { COUNT, INIT, LEN, pack } from "./syntheticPacks.ts";

// Synthetic packs over TDB [INIT, INIT + COUNT * LEN]; positions are
// meaningless, only the span and the segment lookup matter here.
const buffer = (u8: Uint8Array): ArrayBuffer =>
  u8.slice().buffer as ArrayBuffer;
const moonPa = buffer(pack("PCK", ["moonPa"], "MOON_PA", "euler"));
const ephemeris = Ephemeris.fromPacks(
  buffer(pack("SPK", ["sun", "emb", "moon"], "ICRF", "position")),
  moonPa,
);

/** An instant at TDB `tdb`, near enough for span tests. */
const near = (tdb: number): Instant => Instant.fromTdb(tdb);

describe("Ephemeris (synthetic packs)", () => {
  it("contains() is true inside the span, false outside and for NaN", () => {
    expect(ephemeris.span).toEqual([INIT, INIT + COUNT * LEN]);
    expect(ephemeris.contains(near(0))).toBe(true);
    expect(ephemeris.contains(near(INIT + 1e-6))).toBe(true);
    expect(ephemeris.contains(near(INIT + COUNT * LEN - 1e-6))).toBe(true);
    expect(ephemeris.contains(near(INIT - 1))).toBe(false);
    expect(ephemeris.contains(near(1e6))).toBe(false);
    expect(ephemeris.contains(Instant.fromTt(NaN))).toBe(false);
  });

  it("names the span, not a RangeError, for a NaN instant", () => {
    expect(() => ephemeris.sun(Instant.fromTt(NaN))).toThrow(
      /^ephemeris: NaN is outside the loaded span .*–.*\(npm run setup -- --frames-span\)$/,
    );
  });

  it("refuses a pack that splits a segment into pieces, naming them", () => {
    const split = buffer(
      pack("SPK", ["sun", "emb", "moon", "moon#2"], "ICRF", "position"),
    );
    expect(() => Ephemeris.fromPacks(split, moonPa)).toThrow(
      'ephemeris: the pack splits "moon" into pieces (moon, moon#2); multi-piece segments are not supported yet',
    );
  });
});
