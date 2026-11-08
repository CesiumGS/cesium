// The design globe's terrain clips (feedback F11): each site's footprint,
// padded, and the corridor's strip, as polygons in geodetic degrees.
import { describe, expect, it } from "vitest";
import { Alignment } from "../src/engineering/alignment.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { CORRIDOR_ALIGNMENT } from "../examples/design-globe/corridor.ts";
import {
  footprintRegion,
  geodeticOf,
  stripRegion,
} from "../examples/design-globe/terrainClips.ts";

const R = Math.PI / 180;
/** A toy placement: a design unit is 1e-5° east or north of (10°, 50°). */
const displayed = (d: ArrayLike<number>) =>
  Ellipsoid.WGS84.cartographicToCartesian(
    {
      longitude: (10 + d[0]! * 1e-5) * R,
      latitude: (50 + d[1]! * 1e-5) * R,
      height: d[2]!,
    },
    new Float64Array(3),
  );

describe("terrain clip regions", () => {
  it("round-trips a point's longitude and latitude", () => {
    const g = geodeticOf(displayed([100, -200, 30]));
    expect(g.longitude).toBeCloseTo(10.001, 9);
    expect(g.latitude).toBeCloseTo(49.998, 9);
  });

  it("pads a footprint outward from its middle", () => {
    const corners: [number, number, number][] = [
      [0, 0, 0],
      [100, 0, 0],
      [100, 100, 0],
      [0, 100, 0],
    ];
    const p = footprintRegion(corners, displayed, 10 * Math.SQRT2);
    expect(p).toHaveLength(4);
    expect(p[0]!.longitude).toBeCloseTo(10 - 10e-5, 9);
    expect(p[0]!.latitude).toBeCloseTo(50 - 10e-5, 9);
    expect(p[2]!.longitude).toBeCloseTo(10 + 110e-5, 9);
    expect(p[2]!.latitude).toBeCloseTo(50 + 110e-5, 9);
  });

  it("runs the corridor's strip down one edge and back the other, within the clip's vertex limit", () => {
    const alignment = new Alignment(CORRIDOR_ALIGNMENT);
    const p = stripRegion(alignment, (d) => d, 52, 500);
    const perSide =
      Math.ceil((alignment.endStation - alignment.startStation) / 500) + 1;
    expect(p).toHaveLength(2 * perSide);
    expect(p.length).toBeLessThanOrEqual(1024);
  });
});
