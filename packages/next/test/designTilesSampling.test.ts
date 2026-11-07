// The generator's station sampling and corridor mesh (plan 4b Task 14):
// chords within tolerance on curves, tangents at most 30 ft apart, every join
// and the bridge's ends kept, and triangles wound to face their normals.
import { describe, expect, it } from "vitest";
import {
  BRIDGE,
  CORRIDOR_ALIGNMENT,
} from "../examples/design-globe/corridor.ts";
import {
  corridorMesh,
  sampleStations,
} from "../scripts/designTiles/corridorMesh.mjs";
import {
  buildingAnchor,
  buildingMesh,
} from "../scripts/designTiles/siteMesh.mjs";
import { SITE_BUILDING } from "../examples/design-globe/sites.ts";
import {
  Alignment,
  type AlignmentDefinition,
} from "../src/engineering/alignment.ts";

/** A tangent, a 3,000 ft arc to the right, and a tangent (no profile). */
const ARC: AlignmentDefinition = {
  name: "Arc",
  start: [1_000, 2_000],
  startAzimuth: Math.PI / 3,
  startStation: 100,
  horizontal: [
    { kind: "line", length: 500 },
    { kind: "arc", length: 2_500, radius: -3_000 },
    { kind: "line", length: 400 },
  ],
};

/** The distance of the curve's midpoint from the chord's: the chord error. */
function chordError(alignment: Alignment, a: number, b: number): number {
  const pa = alignment.pointAt(a);
  const pb = alignment.pointAt(b);
  const pm = alignment.pointAt((a + b) / 2);
  return Math.hypot(
    pm[0]! - (pa[0]! + pb[0]!) / 2,
    pm[1]! - (pa[1]! + pb[1]!) / 2,
  );
}

describe("sampleStations", () => {
  const alignment = new Alignment(ARC);
  const stations = sampleStations(alignment, 100, 3_500, 0.003);

  it("starts and ends at the range and increases", () => {
    expect(stations[0]).toBe(100);
    expect(stations[stations.length - 1]).toBe(3_500);
    for (let i = 1; i < stations.length; i++) {
      expect(stations[i]!).toBeGreaterThan(stations[i - 1]!);
    }
  });

  it("keeps every chord on the 3,000 ft arc within 0.003", () => {
    let worst = 0;
    let onArc = 0;
    for (let i = 1; i < stations.length; i++) {
      const [a, b] = [stations[i - 1]!, stations[i]!];
      if (a >= 600 && b <= 3_100) {
        onArc++;
        worst = Math.max(worst, chordError(alignment, a, b));
      }
    }
    expect(onArc).toBeGreaterThan(250);
    expect(worst).toBeLessThanOrEqual(0.003);
    // Not wastefully dense: within a factor of two of the tolerance.
    expect(worst).toBeGreaterThan(0.0015);
  });

  it("spaces tangents at most 30 apart", () => {
    for (let i = 1; i < stations.length; i++) {
      const [a, b] = [stations[i - 1]!, stations[i]!];
      if (b <= 600 || a >= 3_100) {
        expect(b - a).toBeLessThanOrEqual(30);
      }
    }
  });

  it("includes every join", () => {
    expect(Array.from(stations)).toEqual(expect.arrayContaining([600, 3_100]));
  });

  it("includes the corridor's joins and the bridge's ends within a range", () => {
    const corridor = new Alignment(CORRIDOR_ALIGNMENT);
    const all = Array.from(
      sampleStations(
        corridor,
        corridor.startStation,
        corridor.endStation,
        0.003,
      ),
    );
    const joins = corridor.horizontalElements.map((e) => e.station);
    expect(joins).toHaveLength(13);
    expect(all).toEqual(
      expect.arrayContaining([
        ...joins,
        corridor.endStation,
        BRIDGE.fromStation,
        BRIDGE.toStation,
      ]),
    );
    // A range that starts and ends between joins keeps only its own.
    const part = Array.from(sampleStations(corridor, 29_990, 30_700, 0.003));
    expect(part[0]).toBe(29_990);
    expect(part[part.length - 1]).toBe(30_700);
    expect(part).toEqual(expect.arrayContaining([30_000, 30_500]));
  });
});

/** How many triangles face the way their first vertex's normal points. */
function facing(mesh: {
  design: Float64Array;
  normals: Float32Array;
  indices: Uint32Array;
}): number {
  const { design, normals, indices } = mesh;
  let count = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    const u = [0, 1, 2].map((k) => design[3 * b + k]! - design[3 * a + k]!);
    const v = [0, 1, 2].map((k) => design[3 * c + k]! - design[3 * a + k]!);
    const n = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    const dot = [0, 1, 2].reduce(
      (sum, k) => sum + n[k]! * normals[3 * a + k]!,
      0,
    );
    if (Math.hypot(...n) > 0 && dot > 0) {
      count++;
    }
  }
  return count;
}

describe("corridorMesh", () => {
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);
  const stations = sampleStations(alignment, 59_900, 61_300, 0.003);
  const mesh = corridorMesh(alignment, stations, { tickInterval: 100 });

  it("names the section's strips, the barriers, the deck, the piers and the ticks", () => {
    const names = mesh.features.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "left lanes",
        "right outer shoulder",
        "median barrier",
        "bridge deck",
        "pier 601+20 left",
        "pier 610+80 right",
        "tick 600+00 left",
        "tick 612+00 right",
      ]),
    );
    expect(mesh.featureIds.length * 3).toBe(mesh.design.length);
    expect(mesh.normals.length).toBe(mesh.design.length);
  });

  it("winds every triangle to face its vertices' normals", () => {
    expect(facing(mesh)).toBe(mesh.indices.length / 3);
  });

  it("puts the deck 1.5 ft under the surface and the piers 25 ft under the profile", () => {
    // The profile falls across the bridge, so the last pier reaches lowest.
    const deepest = Math.min(
      ...BRIDGE.piers.stations.map((s) => alignment.elevationAt(s)),
    );
    let lowest = Infinity;
    for (let i = 2; i < mesh.design.length; i += 3) {
      lowest = Math.min(lowest, mesh.design[i]!);
    }
    expect(lowest).toBeCloseTo(deepest - BRIDGE.piers.belowProfile, 6);
    // The deck's underside at the median, 1.5 ft under the surface there.
    const under = alignment.elevationAt(60_600) - BRIDGE.deckThickness;
    let found = false;
    for (let i = 0; i < mesh.design.length; i += 3) {
      const p = alignment.pointAt(60_600, 0);
      if (
        Math.hypot(mesh.design[i]! - p[0]!, mesh.design[i + 1]! - p[1]!) <
          1.0001 &&
        Math.abs(mesh.design[i + 2]! - under) < 1e-9
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});

describe("buildingMesh", () => {
  it("stacks a story box per story, wound to face its normals", () => {
    const mesh = buildingMesh(SITE_BUILDING);
    const { stories, storyHeight } = SITE_BUILDING.model;
    expect(mesh.features).toHaveLength(stories);
    expect(mesh.design.length / 3).toBe(24 * stories);
    expect(facing(mesh)).toBe(mesh.indices.length / 3);
    let top = -Infinity;
    for (let i = 2; i < mesh.design.length; i += 3) {
      top = Math.max(top, mesh.design[i]!);
    }
    expect(top).toBe(SITE_BUILDING.origin[2] + stories * storyHeight);
    expect(buildingAnchor(SITE_BUILDING)).toEqual([100, 60, 0]);
  });
});
