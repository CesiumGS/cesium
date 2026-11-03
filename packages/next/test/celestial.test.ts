// The celestial frame's rotation to Earth-fixed axes (stars, plan §4.2):
// precession to the date and sidereal time, against catalog stars.
import { describe, expect, it } from "vitest";
import { icrfToFixed } from "../src/time/celestial.ts";
import { greenwichSiderealTime } from "../src/time/sun.ts";

const deg = Math.PI / 180;

/** A unit vector from right ascension and declination, degrees. */
const radec = (ra: number, dec: number) => [
  Math.cos(dec * deg) * Math.cos(ra * deg),
  Math.cos(dec * deg) * Math.sin(ra * deg),
  Math.sin(dec * deg),
];

const apply = (m: Float64Array, v: number[]) =>
  [0, 1, 2].map(
    (i) => m[i * 3]! * v[0]! + m[i * 3 + 1]! * v[1]! + m[i * 3 + 2]! * v[2]!,
  );

describe("icrfToFixed", () => {
  const time = Date.UTC(2026, 0, 1, 0, 0, 0);
  const m = icrfToFixed(time);

  it("is a rotation", () => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dot =
          m[i * 3]! * m[j * 3]! +
          m[i * 3 + 1]! * m[j * 3 + 1]! +
          m[i * 3 + 2]! * m[j * 3 + 2]!;
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 12);
      }
    }
  });

  it("turns with sidereal time", () => {
    // The J2000 equinox, nearly unmoved in 26 years, stands at minus the
    // sidereal time in longitude.
    const v = apply(m, [1, 0, 0]);
    const longitude = Math.atan2(v[1]!, v[0]!);
    const expected = -greenwichSiderealTime(time);
    const difference = Math.atan2(
      Math.sin(longitude - expected),
      Math.cos(longitude - expected),
    );
    // Precession in right ascension, 26 years: about 0.36°.
    expect(difference / deg).toBeGreaterThan(0.3);
    expect(difference / deg).toBeLessThan(0.4);
  });

  it("precesses Sirius as the annual rates say", () => {
    // Sirius, J2000: RA 6h 45m 08.9s, Dec −16° 42′ 58″. Over 26 years the
    // annual precession (m + n sin α tan δ, n cos α) moves it +69.7 s in
    // right ascension and −102″ in declination.
    const ra = (6 + 45 / 60 + 8.9 / 3600) * 15;
    const dec = -(16 + 42 / 60 + 58 / 3600);
    const v = apply(m, radec(ra, dec));
    const declination = Math.asin(v[2]!) / deg;
    expect(declination).toBeCloseTo(dec - 102 / 3600, 2);
    const hourAngleLongitude = Math.atan2(v[1]!, v[0]!) / deg;
    const expected =
      ra + (69.7 / 3600) * 15 - greenwichSiderealTime(time) / deg;
    const difference = ((hourAngleLongitude - expected + 540) % 360) - 180;
    expect(Math.abs(difference)).toBeLessThan(0.02);
  });

  it("puts Polaris near the pole", () => {
    // Polaris, J2000: RA 2h 31m 49s, Dec +89° 15′ 51″; closer to the pole
    // by 2026 (about 89.37°).
    const v = apply(m, radec((2 + 31 / 60 + 49 / 3600) * 15, 89.264));
    expect(Math.asin(v[2]!) / deg).toBeCloseTo(89.37, 1);
  });
});
