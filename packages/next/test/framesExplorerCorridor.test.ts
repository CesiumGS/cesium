// The corridor's station lookup at the road's ends (Task 9): the trip
// through the ground puts the point at station 0 a few nanometres before the
// road's start, where the library's alignment rightly says "outside". The
// scenario reads it on the end tangent's extension, within the round trip's
// own tolerance, so its own knob's minimum answers.
import { describe, expect, it } from "vitest";
import { stationOffsetNearEnds } from "../examples/frames-explorer/scenarios/corridor.ts";
import { CLOTHOID_ROAD } from "../examples/frames-explorer/scenarios/sites.ts";
import { Alignment } from "../src/engineering/alignment.ts";

const road = new Alignment(CLOTHOID_ROAD);
const TOL = 3e-4;

/** The point at `end`, `offset` out, and the same moved `outward` design feet beyond that end, along the road. */
function nudged(end: number, offset: number, outward: number) {
  const design = Array.from(road.pointAt(end, offset));
  const a = road.pointAt(end, 0);
  const inside = road.pointAt(end + (end === road.startStation ? 1 : -1), 0);
  const len = Math.hypot(a[0]! - inside[0]!, a[1]! - inside[1]!);
  const p = [
    design[0]! + (outward * (a[0]! - inside[0]!)) / len,
    design[1]! + (outward * (a[1]! - inside[1]!)) / len,
  ];
  return { design, p };
}

describe("stationOffsetNearEnds", () => {
  it("reads a point a hair before the start on the first tangent's extension", () => {
    const { design, p } = nudged(road.startStation, 15, 6e-9);
    expect(() => road.stationOffset(p)).toThrow(/outside the alignment/);
    const r = stationOffsetNearEnds(road, p, design, TOL);
    // Held to the road's start, as the library holds its own stations.
    expect(r.station).toBe(road.startStation);
    expect(r.offset).toBeCloseTo(15, 9);
  });

  it("does the same a hair past the end", () => {
    const { design, p } = nudged(road.endStation, -10, 6e-9);
    expect(() => road.stationOffset(p)).toThrow(/outside the alignment/);
    const r = stationOffsetNearEnds(road, p, design, TOL);
    expect(r.station).toBe(road.endStation);
    expect(r.offset).toBeCloseTo(-10, 9);
  });

  it("agrees with the library inside the road", () => {
    const design = Array.from(road.pointAt(650, 15));
    const r = stationOffsetNearEnds(road, design, design, TOL);
    const lib = road.stationOffset(design);
    expect(r.station).toBe(lib.station);
    expect(r.offset).toBe(lib.offset);
  });

  it("still says outside for a point beyond the tolerance", () => {
    const { design, p } = nudged(road.startStation, 15, 1);
    expect(() => stationOffsetNearEnds(road, p, design, TOL)).toThrow(
      /outside the alignment/,
    );
  });
});
