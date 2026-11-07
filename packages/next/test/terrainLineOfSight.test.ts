import { describe, expect, it } from "vitest";
import { terrainLineOfSight } from "../src/measure/terrainLineOfSight.ts";
import { LEVEL_ZERO_ERROR } from "../src/globe/TerrainSource.ts";
import {
  A,
  WGS84,
  at,
  distanceToTile,
  gridTile,
  strip,
  stripTarget,
  trueMinimumClearance,
  vertex,
} from "./terrainRayFixtures.ts";

const HALF = 20000 / A; // 20 km either side of the hill
const W = 3000 / A;
const SIGMA = 3000 / A;
const PEAK = 300;
const hill = (lon: number, lat: number): number =>
  PEAK * Math.exp(-(lon * lon + lat * lat) / (2 * SIGMA * SIGMA));

/** Eight tiles along the equator; `skip` marks some unknown. */
function hillTarget(
  unknown: Record<number, "not drawn" | "not refined"> = {},
  level = 14,
) {
  const rects = strip(-HALF * 1.01, HALF * 1.01, 8, -W, W);
  const tiles = rects.map((r) => gridTile(r, 33, hill, level));
  return {
    rects,
    tiles,
    target: stripTarget(
      rects.map((rectangle, i) =>
        unknown[i]
          ? { rectangle, unknown: unknown[i] }
          : { rectangle, tile: tiles[i]! },
      ),
    ),
  };
}

const ERROR_14 = LEVEL_ZERO_ERROR / 2 ** 14;

describe("terrainLineOfSight", () => {
  it("clears the hill and states the true lowest clearance", () => {
    const { target, tiles } = hillTarget();
    const from = at(-HALF, 0.2 * W, 520);
    const to = at(HALF, -0.1 * W, 500);
    const r = terrainLineOfSight(from, to, target);
    expect(r.clear).toBe(true);
    expect(r.unknownFraction).toBe(0);
    expect(r.blockedAt).toBeUndefined();
    const truth = trueMinimumClearance(from, to, tiles, 33);
    expect(Math.abs(r.minClearance! - truth.meters)).toBeLessThan(1e-6);
    expect(r.accuracy.meters).toBeCloseTo(ERROR_14, 9);
    expect(r.accuracy.note).toMatch(/level 14/);
    expect(r.accuracy.note).not.toMatch(/step|sampled/);
  });

  it("is blocked by a ray through the hill's face, at a point on a triangle", () => {
    const { target, tiles } = hillTarget();
    const r = terrainLineOfSight(at(-HALF, 0, 100), at(HALF, 0, 100), target);
    expect(r.clear).toBe(false);
    expect(r.minClearance).toBeLessThan(0);
    const c = WGS84.cartesianToCartographic(r.blockedAt!, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!;
    expect(c.longitude).toBeLessThan(0);
    expect(c.longitude).toBeGreaterThan(-3 * SIGMA);
    expect(
      Math.min(...tiles.map((t) => distanceToTile(r.blockedAt!, t))),
    ).toBeLessThan(1e-6);
  });

  it("never calls a path clear over unloaded or not-refined terrain, by length", () => {
    const { target, rects } = hillTarget({ 1: "not drawn", 6: "not refined" });
    const from = at(-HALF, 0, 2000);
    const to = at(HALF, 0, 2000);
    const r = terrainLineOfSight(from, to, target);
    // Along the equator the chord's longitude goes with the angle at the
    // center: tan λ = y / x on a line, so the span between two meridians is
    // exact.
    const t = (lon: number) => {
      const dx = to[0]! - from[0]!;
      const dy = to[1]! - from[1]!;
      return (
        (from[0]! * Math.sin(lon) - from[1]! * Math.cos(lon)) /
        (dy * Math.cos(lon) - dx * Math.sin(lon))
      );
    };
    const expected =
      t(rects[1]!.east) -
      t(rects[1]!.west) +
      (t(rects[6]!.east) - t(rects[6]!.west));
    expect(r.clear).toBeUndefined();
    expect(r.unknownFraction).toBeCloseTo(expected, 9);
    expect(r.accuracy.note).toMatch(/unknown over 25% of the path/);
    expect(r.accuracy.note).toMatch(/not loaded/);
    expect(r.accuracy.note).toMatch(/not refined/);
  });

  it("still reports a block when part of the path is unknown", () => {
    const { target } = hillTarget({ 6: "not drawn" });
    const r = terrainLineOfSight(at(-HALF, 0, 100), at(HALF, 0, 100), target);
    expect(r.clear).toBe(false);
    expect(r.unknownFraction).toBeGreaterThan(0);
  });

  it("widens the accuracy on coarse tiles, adding the source's own", () => {
    const { target } = hillTarget({}, 9);
    const r = terrainLineOfSight(
      at(-HALF, 0, 2000),
      at(HALF, 0, 2000),
      target,
      {
        sourceAccuracy: { meters: 12.5, statistic: "LE90" },
      },
    );
    const error9 = LEVEL_ZERO_ERROR / 2 ** 9;
    expect(r.accuracy.meters).toBeCloseTo(error9 + 12.5, 9);
    expect(r.accuracy.note).toMatch(/level 9/);
    expect(r.accuracy.note).toContain("±12.5 m (LE90)");
    const unstated = terrainLineOfSight(
      at(-HALF, 0, 2000),
      at(HALF, 0, 2000),
      target,
    );
    expect(unstated.accuracy.note).toMatch(
      /source's own accuracy is not stated/,
    );
  });

  it("is not clear when the true terrain could block within its error", () => {
    const { target } = hillTarget({}, 9);
    // 300 m peak; the ray clears it by tens of metres, inside level 9's 150 m.
    const r = terrainLineOfSight(at(-HALF, 0, 360), at(HALF, 0, 360), target);
    expect(r.blockedAt).toBeUndefined();
    expect(r.minClearance!).toBeGreaterThan(0);
    expect(r.minClearance!).toBeLessThan(r.accuracy.meters!);
    expect(r.clear).toBeUndefined();
    expect(r.accuracy.note).toMatch(
      /within its ±\d+ m error, so the true terrain may block/,
    );
    // The source's own error counts too: 120 m of room, 5 m of mesh error.
    const fine = hillTarget().target;
    const loose = terrainLineOfSight(
      at(-HALF, 0, 360),
      at(HALF, 0, 360),
      fine,
      {
        sourceAccuracy: { meters: 200, statistic: "1σ" },
      },
    );
    expect(loose.clear).toBeUndefined();
  });

  it("is clear from an observer on the ground: its own ground is not the error band", () => {
    // Flat drawn terrain, level 14 (±4.7 m): a dish standing on a vertex
    // looks at a mast top 2 km away.
    const rects = strip(-0.001, 0.001, 2, -0.0005, 0.0005);
    const tiles = rects.map((rectangle) => gridTile(rectangle, 33, () => 0));
    const target = stripTarget(
      rects.map((rectangle, i) => ({ rectangle, tile: tiles[i]! })),
    );
    const dish = vertex(tiles[0]!, 16 * 33 + 20);
    const r = terrainLineOfSight(dish, at(0.0003, 0.0001, 100), target);
    expect(Math.abs(r.minClearance!)).toBeLessThan(1e-6);
    expect(r.clear).toBe(true);
    expect(r.accuracy.note).not.toMatch(/may block/);
  });

  it("never rounds a share to 0% or 100% when it isn't", () => {
    const rects = strip(-0.003, 0.003, 300, -0.0005, 0.0005);
    const tiles = rects.map((rectangle) => gridTile(rectangle, 3, () => 0));
    const one = (gap: (i: number) => boolean) =>
      stripTarget(
        rects.map((rectangle, i) =>
          gap(i)
            ? { rectangle, unknown: "not drawn" as const }
            : { rectangle, tile: tiles[i]! },
        ),
      );
    const from = at(-0.003, 0, 3000);
    const to = at(0.003, 0, 3000);
    const few = terrainLineOfSight(
      from,
      to,
      one((i) => i === 150),
    );
    expect(few.unknownFraction).toBeLessThan(0.005);
    expect(few.accuracy.note).toMatch(/unknown over 1% of the path/);
    const most = terrainLineOfSight(
      from,
      to,
      one((i) => i !== 150),
    );
    expect(most.unknownFraction).toBeGreaterThan(0.995);
    expect(most.accuracy.note).toMatch(/unknown over 99% of the path/);
  });

  it("returns unknown for non-finite input without hanging", () => {
    const { target } = hillTarget();
    const r = terrainLineOfSight([NaN, 0, 0], at(HALF, 0, 0), target);
    expect(r.clear).toBeUndefined();
    expect(r.unknownFraction).toBe(1);
    const far = terrainLineOfSight(at(0, 0, 0), [Infinity, 0, 0], target);
    expect(far.clear).toBeUndefined();
    expect(far.unknownFraction).toBe(1);
  });

  it("counts unknown terrain under a zero-length path", () => {
    const { target } = hillTarget({ 3: "not drawn", 4: "not drawn" });
    const p = at(0, 0, 10);
    const unknown = terrainLineOfSight(p, p, target);
    expect(unknown.clear).toBeUndefined();
    expect(unknown.unknownFraction).toBe(1);
    const known = terrainLineOfSight(
      at(-HALF, 0, 500),
      at(-HALF, 0, 500),
      target,
    );
    expect(known.clear).toBe(true);
    expect(known.unknownFraction).toBe(0);
  });
});
