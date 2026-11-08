import { describe, expect, it } from "vitest";
import { frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { C } from "../src/measure/constants.ts";
import type { LightTimeSolution } from "../src/measure/lightTime.ts";
import { lineOfSight, segmentBlocked } from "../src/measure/lineOfSight.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { transformPoint } from "../src/math/mat4.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const UNIT = [1, 1, 1];

describe("segmentBlocked", () => {
  it("blocks a segment through the center", () => {
    expect(segmentBlocked([-2, 0, 0], [2, 0, 0], UNIT, 0)).toBe(true);
  });

  it("clears a segment passing 1.01 radii from the center", () => {
    expect(segmentBlocked([-2, 1.01, 0], [2, 1.01, 0], UNIT, 0)).toBe(false);
  });

  it("clears a segment leaving the surface, with a 1 m inset", () => {
    const r = 6371000;
    expect(segmentBlocked([r, 0, 0], [r * 3, 0, 0], [r, r, r], 1)).toBe(false);
  });

  it("blocks a segment entering the surface", () => {
    const r = 6371000;
    expect(segmentBlocked([r, 0, 0], [-r, 0, 0], [r, r, r], 1)).toBe(true);
  });

  it("clears a segment shorter than twice the inset", () => {
    const r = 6371000;
    expect(segmentBlocked([r, 0, 0], [r - 1, 0, 0], [r, r, r], 1)).toBe(false);
  });

  it("treats a start below the surface as on it", () => {
    const a = Ellipsoid.WGS84.radii;
    const r = [a[0]!, a[1]!, a[2]!];
    const start = [a[0]! - 100, 0, 0];
    expect(segmentBlocked(start, [a[0]! + 1e7, 0, 0], r, 1)).toBe(false);
    expect(segmentBlocked(start, [-(a[0]! + 1e6), 1e6, 0], r, 1)).toBe(true);
    expect(segmentBlocked(start, [-a[0]!, 0, 0], r, 1)).toBe(true);
  });

  it("clears a station below the surface sighting straight up, whichever end it is", () => {
    // The closest point at an end of the segment is that end exactly: a
    // lower end found as a + (b − a) · 1 differs from b by a rounding, which
    // used to block about one such line in a few.
    const e = Ellipsoid.WGS84;
    const r = [e.radii[0]!, e.radii[1]!, e.radii[2]!];
    const at = (lon: number, lat: number, h: number) =>
      e.cartographicToCartesian(
        { longitude: lon, latitude: lat, height: h },
        new Float64Array(3),
      );
    let blocked = 0;
    for (let i = 0; i < 400; i++) {
      const lon = ((i * 0.618034) % 1) * 2 * Math.PI - Math.PI;
      const lat = ((i * 0.414214) % 1) * Math.PI - Math.PI / 2;
      const h = -1 - ((i * 0.732051) % 1) * 3000;
      const station = at(lon, lat, h);
      const overhead = at(lon, lat, 2e7);
      if (segmentBlocked(station, overhead, r, 1)) {
        blocked++;
      }
      if (segmentBlocked(overhead, station, r, 1)) {
        blocked++;
      }
    }
    expect(blocked).toBe(0);
  });

  it("uses the ellipsoid's own radii", () => {
    const a = Ellipsoid.WGS84.radii[0]!;
    const c = Ellipsoid.WGS84.radii[2]!;
    const h = 5e3;
    // Chords a distance h inside the equatorial radius a. In x (the equator)
    // it cuts the body; in z it passes 16 km clear of the pole, because the
    // polar radius is 21 km shorter than a.
    expect(segmentBlocked([a - h, -a, 0], [a - h, a, 0], [a, a, c], 1)).toBe(
      true,
    );
    expect(segmentBlocked([-a, 0, a - h], [a, 0, a - h], [a, a, c], 1)).toBe(
      false,
    );
  });
});

describe("lineOfSight", () => {
  const frames = createFrames(syntheticFrameData());
  const t0 = Instant.fromTdb(0);
  const toIcrf = frameTransform(frames.itrf, frames.icrf, t0);
  const a = Ellipsoid.WGS84.radii[0]!;

  /** A solution between two ITRF points at t0, as the signal's endpoints. */
  const solutionBetween = (from: number[], to: number[]): LightTimeSolution => {
    const p = transformPoint(
      new Float64Array(3),
      toIcrf,
      Float64Array.from(from),
    );
    const q = transformPoint(
      new Float64Array(3),
      toIcrf,
      Float64Array.from(to),
    );
    const rho = Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!);
    const lightTime = rho / C;
    return {
      lightTime,
      emission: t0,
      reception: Instant.fromTdb(lightTime),
      transmitterPosition: p,
      receiverPosition: q,
    };
  };

  const station = [a, 0, 0];

  it("is clear from a station to a target above its horizon", () => {
    const result = lineOfSight(
      solutionBetween(station, [a + 1e6, 1e6, 0]),
      frames,
    );
    expect(result).toEqual({ clear: true });
  });

  it("is blocked by the Earth to a target below its horizon", () => {
    const result = lineOfSight(
      solutionBetween(station, [-(a + 1e6), 1e6, 0]),
      frames,
    );
    expect(result.clear).toBe(false);
    expect(result.blockedBy).toBe(EARTH);
  });

  it("reports the first blocking body in the order given", () => {
    const solution = solutionBetween(station, [-(a + 1e6), 1e6, 0]);
    expect(lineOfSight(solution, frames, [EARTH, MOON]).blockedBy).toBe(EARTH);
  });
});
