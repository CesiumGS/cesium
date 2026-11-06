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

  it("uses the ellipsoid's own radii", () => {
    const a = Ellipsoid.WGS84.radii[0]!;
    const c = Ellipsoid.WGS84.radii[2]!;
    const h = 5e3;
    // A chord at height h above the equator (x = a - h) is blocked; at the
    // same height above the pole (z = c - h) it is blocked too, but at
    // x = a + h it passes above the equator and z = a + h is far above
    // the pole. Distinguish them by the oblateness: z = a - h clears the
    // pole by 21 km, x = a - h cuts the equator.
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
      solutionBetween(station, [a - 1e6, 1e6, 0]),
      frames,
    );
    expect(result.clear).toBe(false);
    expect(result.blockedBy).toBe(EARTH);
  });

  it("reports the first blocking body in the order given", () => {
    const solution = solutionBetween(station, [a - 1e6, 1e6, 0]);
    expect(lineOfSight(solution, frames, [EARTH, MOON]).blockedBy).toBe(EARTH);
  });
});
