// The generator's station sampling and corridor mesh (plan 4b Task 14):
// chords within tolerance on curves, tangents at most 30 ft apart, every join
// and the structures' ends kept, and triangles wound to face their normals.
import { describe, expect, it } from "vitest";
import {
  BRIDGE,
  CORRIDOR_ALIGNMENT,
  STRUCTURES,
} from "../examples/design-globe/corridor.ts";
import {
  CORRIDOR_PALETTE,
  corridorMesh,
  decimate,
  largestSlopeError,
  sampleStations,
} from "../scripts/designTiles/corridorMesh.mjs";
import {
  EARTHWORK,
  END_STATION,
  HAS_SLOPES,
  HINGE_RISE,
  SIDE_SLOPES,
  daylightBreaks,
  daylightRise,
  slopeSection,
} from "../examples/design-globe/sideSlopes.ts";
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

  it("includes the corridor's joins and the structures' ends within a range", () => {
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
        ...STRUCTURES.flatMap((st) => [st.fromStation, st.toStation]),
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
  // The viaduct on the long tangent, 43,700 to 47,800, and a little either side.
  const stations = sampleStations(alignment, 43_600, 47_900, 0.003);
  const mesh = corridorMesh(alignment, stations, { tickInterval: 100 });

  it("names the section's strips, the barriers, the deck, the piers and the ticks", () => {
    const names = mesh.features.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "left lanes",
        "right outer shoulder",
        "median barrier",
        "viaduct 437+00 to 473+00",
        "pier 438+20 left",
        "pier 471+80 right",
        "tick 437+00 left",
        "tick 473+00 right",
        "left side slope",
        "right side slope",
        "abutment 437+00",
        "abutment 473+00",
        "portal 477+00 headwall",
        "portal 477+00 mouth",
      ]),
    );
    // A pick on a slope says so.
    expect(
      mesh.features.filter((f) => f.kind === "side slope").length,
    ).toBeGreaterThanOrEqual(2);
    expect(mesh.featureIds.length * 3).toBe(mesh.design.length);
    expect(mesh.normals.length).toBe(mesh.design.length);
  });

  it("winds every triangle to face its vertices' normals", () => {
    expect(facing(mesh)).toBe(mesh.indices.length / 3);
  });

  it("puts the deck 1.5 ft under the surface and each pier its viaduct's depth under the profile", () => {
    const deepest = Math.min(
      ...BRIDGE.piers.stations.map(
        (s) => alignment.elevationAt(s) - BRIDGE.piers.belowProfile,
      ),
    );
    let lowest = Infinity;
    for (let i = 2; i < mesh.design.length; i += 3) {
      lowest = Math.min(lowest, mesh.design[i]!);
    }
    expect(lowest).toBeCloseTo(deepest, 6);
    // The deck's underside at the median, 1.5 ft under the surface there.
    // A sampled station near the viaduct's middle.
    const at = Array.from(stations).find((s) => s >= 45_000)!;
    const under = alignment.elevationAt(at) - BRIDGE.deckThickness;
    let found = false;
    for (let i = 0; i < mesh.design.length; i += 3) {
      const p = alignment.pointAt(at, 0);
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

describe("the side slopes", () => {
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);

  it("follow their rules: 2H:1V in fill and soil, 1H:1V in rock under 30 ftUS of soil", () => {
    expect(slopeSection(-10)).toEqual({ rock: [0, 0], daylight: [20, -10] });
    expect(slopeSection(20)).toEqual({ rock: [0, 0], daylight: [40, 20] });
    expect(slopeSection(30)).toEqual({ rock: [0, 0], daylight: [60, 30] });
    expect(slopeSection(50)).toEqual({ rock: [20, 20], daylight: [80, 50] });
    expect(SIDE_SLOPES.hinge).toBe(41);
    expect(HINGE_RISE).toBeCloseTo(-1.04, 12);
  });

  it("are on every earthwork stretch, and only there", () => {
    expect(HAS_SLOPES).toBe(true);
    const structures = STRUCTURES.reduce(
      (sum, s) => sum + s.toStation - s.fromStation,
      0,
    );
    const earthwork = EARTHWORK.reduce(
      (sum, r) => sum + r.toStation - r.fromStation,
      0,
    );
    expect(END_STATION).toBe(alignment.endStation);
    expect(earthwork + structures).toBe(
      alignment.endStation - alignment.startStation,
    );
    expect(daylightRise(45_500, 1)).toBeUndefined(); // on a viaduct
    expect(daylightRise(90_000, -1)).toBeUndefined(); // in a tunnel
    expect(daylightRise(86_170, -1)).toBeLessThan(0); // the anchor, on fill
  });

  it("reach the daylight line: the mesh's outermost slope vertices at each station", () => {
    // The anchor's stretch, between a viaduct and a portal.
    const stations = sampleStations(alignment, 85_800, 86_700, 0.003);
    const mesh = corridorMesh(alignment, stations, { tickInterval: 100 });
    const breaks = daylightBreaks().filter((b) => b > 85_800 && b < 86_700);
    expect(Array.from(stations)).toEqual(expect.arrayContaining(breaks));
    expect(facing(mesh)).toBe(mesh.indices.length / 3);
    for (const station of [85_800, 86_150, 86_700]) {
      for (const side of [-1, 1] as const) {
        const rise = daylightRise(station, side)!;
        const run = slopeSection(rise).daylight[0];
        const p = alignment.pointAt(station, side * (SIDE_SLOPES.hinge + run));
        let found = false;
        for (let i = 0; i < mesh.design.length && !found; i += 3) {
          found =
            Math.hypot(
              mesh.design[i]! - p[0]!,
              mesh.design[i + 1]! - p[1]!,
              mesh.design[i + 2]! - (p[2]! + HINGE_RISE + rise),
            ) < 1e-6;
        }
        expect(found, `station ${station}, side ${side}`).toBe(true);
      }
    }
    // Each slope vertex in the slopes' colours, the rest the pavement's.
    const slopeIds = new Set(
      mesh.features.flatMap((f, i) => (f.kind === "side slope" ? [i] : [])),
    );
    expect(mesh.colors.length).toBe((mesh.design.length / 3) * 4);
    const f32 = (c: readonly number[]) => c.map((x) => Math.fround(x));
    const slopeColours = [CORRIDOR_PALETTE.grass, CORRIDOR_PALETTE.rock].map(
      f32,
    );
    for (let v = 0; v < mesh.featureIds.length; v++) {
      const c = Array.from(mesh.colors.subarray(v * 4, v * 4 + 4));
      expect(
        slopeIds.has(mesh.featureIds[v]!)
          ? slopeColours
          : [
              f32(CORRIDOR_PALETTE.pavement),
              f32(CORRIDOR_PALETTE.concrete),
              f32(CORRIDOR_PALETTE.mouth),
            ],
      ).toContainEqual(c);
    }
  });

  it("measure what a parent's decimated slopes miss", () => {
    const stations = sampleStations(alignment, 85_800, 86_700, 0.003);
    expect(largestSlopeError(alignment, stations, stations)).toBe(0);
    const coarse = decimate(alignment, decimate(alignment, stations));
    expect(largestSlopeError(alignment, coarse, stations)).toBeGreaterThan(0);
  });
});

describe("buildingMesh", () => {
  it("stacks a story box per story, wound to face its normals", () => {
    const mesh = buildingMesh(SITE_BUILDING);
    const { stories, storyHeight, plinth } = SITE_BUILDING.model;
    // The stories, and the plinth under them (five faces, open at the top).
    expect(mesh.features).toHaveLength(stories + 1);
    expect(mesh.features.at(-1)!.kind).toBe("plinth");
    expect(mesh.design.length / 3).toBe(24 * stories + 20);
    expect(facing(mesh)).toBe(mesh.indices.length / 3);
    let top = -Infinity;
    let bottom = Infinity;
    for (let i = 2; i < mesh.design.length; i += 3) {
      top = Math.max(top, mesh.design[i]!);
      bottom = Math.min(bottom, mesh.design[i]!);
    }
    expect(top).toBe(SITE_BUILDING.origin[2] + stories * storyHeight);
    expect(bottom).toBe(plinth);
    expect(buildingAnchor(SITE_BUILDING)).toEqual([100, 60, 297]);
  });
});
