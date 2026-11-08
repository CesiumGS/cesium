// The design globe's scale ladder (plan 4b Task 17b): the seven portfolio
// sites' models, smallest first, as the generator cuts them into tiles.
//  - each model's extent is within 10% of the ladder's (owner, 2026-11-07);
//  - the tile trees: at least 3 levels for every model over 1 km, leaves at
//    the leaf tolerance, parents at least twice their children's error and
//    at least what they draw instead of full detail;
//  - the sag rule (owner: "no polygon cuts through the ground"): every
//    leaf's longest edge sags d²/8R at most its geometric error;
//  - faces wound to their normals; the same model every run;
//  - each model reads as what it is: the airport's markings, the pole
//    line's poles every 50 m, the solar farm's tilted panels, the block's
//    and the campus's varied buildings.
// The placed checks (the rigid error, both tilesets, the declarations) are
// in test/data/designTiles.test.ts, against the generated tiles.
import { describe, expect, it } from "vitest";
import {
  LADDER,
  PORTFOLIO,
  modelAnchor,
  type PoleLineModel,
  type PortModel,
  type PortfolioSite,
  type SolarFarmModel,
} from "../examples/design-globe/sites.ts";
import {
  LEAF_ERROR_METRES,
  ladderPlan,
  ladderTree,
  planExtent,
} from "../scripts/designTiles/ladder.mjs";
import {
  LAYER_METRES,
  MIN_RADIUS,
  edgeSag,
  longestEdge,
} from "../scripts/designTiles/meshBuilder.mjs";
import type { DesignTileMesh } from "../scripts/designTiles/corridorMesh.mjs";

/**
 * The ladder, smallest first: id, model kind and extent in metres (the
 * airport and the solar farm are both about 4 km; the airport is the
 * smaller, 3.97 km to 4.00).
 */
const TABLE: [string, string, number][] = [
  ["amsterdam", "building", 60],
  ["tokyo", "block", 1_000],
  ["jakarta", "port", 3_000],
  ["sydney", "airport", 4_000],
  ["phoenix", "solarFarm", 4_000],
  ["nairobi", "campus", 10_000],
  ["london", "poleLine", 30_000],
];

/** Metres per design unit: Phoenix's CRS is in international feet. */
const unit = (site: PortfolioSite) =>
  site.frame.crs.format === "wkid" && site.frame.crs.wkid === 6405 ? 0.3048 : 1;

type Node = {
  id: string;
  level: number;
  geometricError: number;
  children: Node[];
  mesh(): (DesignTileMesh & { colors: Float32Array }) | null;
};

function* nodes(node: Node): Generator<Node> {
  yield node;
  for (const child of node.children) {
    yield* nodes(child);
  }
}

/** Triangles whose winding faces their first vertex's normal. */
function facing(mesh: DesignTileMesh): number {
  const { design, normals, indices } = mesh;
  let good = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    const u = [0, 1, 2].map((k) => design[3 * b + k]! - design[3 * a + k]!);
    const v = [0, 1, 2].map((k) => design[3 * c + k]! - design[3 * a + k]!);
    const n = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    const dot =
      n[0]! * normals[3 * a]! +
      n[1]! * normals[3 * a + 1]! +
      n[2]! * normals[3 * a + 2]!;
    if (dot > 0) {
      good++;
    }
  }
  return good;
}

const site = (id: string) => PORTFOLIO.find((s) => s.id === id)!;
const trees = new Map<string, ReturnType<typeof build>>();
function build(s: PortfolioSite) {
  const plan = ladderPlan(s, { metersPerUnit: unit(s) });
  const mpu = unit(s);
  const tree = ladderTree(plan, {
    leafError: LEAF_ERROR_METRES / mpu,
    metersPerUnit: mpu,
  });
  return { plan, tree, mpu, top: tree.top as Node };
}
const built = (s: PortfolioSite) => {
  let b = trees.get(s.id);
  if (b === undefined) {
    b = build(s);
    trees.set(s.id, b);
  }
  return b;
};

describe("the scale ladder", () => {
  it("is the seven sites, smallest first, each with its model", () => {
    expect(LADDER.map((s) => [s.id, s.model.kind])).toEqual(
      TABLE.map(([id, kind]) => [id, kind]),
    );
    expect([...LADDER].sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual(
      [...PORTFOLIO].sort((a, b) => (a.id < b.id ? -1 : 1)),
    );
  });

  for (const [id, kind, metres] of TABLE) {
    it(`${id}: the ${kind}'s extent is within 10% of ${metres.toLocaleString("en-US")} m, about its anchor`, () => {
      const s = site(id);
      const { plan, mpu } = built(s);
      const anchor = modelAnchor(s);
      expect(plan.anchor).toEqual(anchor);
      const { extent, reach } = planExtent(plan, anchor);
      expect(Math.abs(extent * mpu - metres) / metres).toBeLessThan(0.1);
      // The anchor is the model's middle: its farthest point is about half
      // the extent away.
      expect(Math.abs((2 * reach) / extent - 1)).toBeLessThan(0.1);
    });
  }

  for (const [id] of TABLE) {
    it(`${id}: a tree by Task 14's rules, every leaf within the sag rule`, () => {
      const s = site(id);
      const { tree, top, mpu } = built(s);
      const leafError = LEAF_ERROR_METRES / mpu;
      const extent = planExtent(built(s).plan, modelAnchor(s)).extent * mpu;
      if (extent > 1_000) {
        expect(tree.levels).toBeGreaterThanOrEqual(3);
      }
      const ids = new Set<string>();
      let leaves = 0;
      for (const node of nodes(top)) {
        expect(ids.has(node.id)).toBe(false);
        ids.add(node.id);
        if (node.children.length === 0 && node.level === 0) {
          leaves++;
          expect(node.geometricError).toBe(leafError);
          const mesh = node.mesh()!;
          expect(mesh, node.id).not.toBeNull();
          // d²/8R of the longest edge, metres, against the leaf's error.
          const sag = edgeSag(longestEdge(mesh) * mpu);
          expect(sag, node.id).toBeLessThanOrEqual(leafError * mpu);
        }
        for (const child of node.children) {
          expect(child.level).toBe(node.level - 1);
          expect(node.geometricError).toBeGreaterThanOrEqual(
            2 * child.geometricError,
          );
        }
      }
      expect(leaves).toBeGreaterThan(0);
      expect(ids.size).toBe(tree.tiles);
      // Every leaf is at level 0: one depth.
      for (const node of nodes(top)) {
        if (node.children.length === 0) {
          expect(node.level, node.id).toBe(0);
        }
      }
    });
  }

  it("parents state at least what they draw instead of full detail", () => {
    const { plan, top } = built(site("london"));
    // The pole line drops its poles at level 4: those tiles state at
    // least half a pole's height.
    const level4 = [...nodes(top)].filter((n) => n.level === 4);
    expect(level4.length).toBeGreaterThan(0);
    const height = (site("london").model as PoleLineModel).poleHeight;
    for (const n of level4) {
      expect(n.geometricError).toBeGreaterThanOrEqual(height / 2);
    }
    expect(plan.parts.length).toBeGreaterThan(500);
  });

  it("winds every face to its normal, at every level, and builds the same model every run", () => {
    for (const s of LADDER) {
      const { top } = built(s);
      for (const node of nodes(top)) {
        const mesh = node.mesh();
        if (mesh === null) {
          continue;
        }
        expect(facing(mesh), `${s.id} ${node.id}`).toBe(
          mesh.indices.length / 3,
        );
        expect(mesh.colors.length / 4).toBe(mesh.design.length / 3);
        expect(mesh.featureIds.length).toBe(mesh.design.length / 3);
      }
      // Again from scratch: the same vertices.
      const again = build(s).top as Node;
      const a = top.mesh()!;
      const b = again.mesh()!;
      expect(Array.from(b.design)).toEqual(Array.from(a.design));
      expect(Array.from(b.indices)).toEqual(Array.from(a.indices));
    }
  });

  it("uses the sag rule's R: the smallest radius on WGS 84, a(1 − e²)", () => {
    expect(MIN_RADIUS).toBeCloseTo(6_335_439.327, 2);
    // 1 mm of sag at the leaves: edges up to about 225 m.
    expect(Math.sqrt(8 * MIN_RADIUS * LEAF_ERROR_METRES)).toBeCloseTo(225.1, 1);
  });
});

/**
 * A quad cell's first triangle (k, k + 1, k + row + 1) has its first two
 * edges at right angles, along the quad's sides: their lengths, shorter
 * first, or undefined for any other triangle.
 */
function cellSides(
  mesh: DesignTileMesh,
  t: number,
): [number, number] | undefined {
  const at = (j: number) => [
    mesh.design[3 * j]!,
    mesh.design[3 * j + 1]!,
    mesh.design[3 * j + 2]!,
  ];
  const [a, b, c] = [
    at(mesh.indices[t]!),
    at(mesh.indices[t + 1]!),
    at(mesh.indices[t + 2]!),
  ];
  const ab = [0, 1, 2].map((k) => b[k]! - a[k]!);
  const bc = [0, 1, 2].map((k) => c[k]! - b[k]!);
  const dot = ab[0]! * bc[0]! + ab[1]! * bc[1]! + ab[2]! * bc[2]!;
  const [x, y] = [Math.hypot(...ab), Math.hypot(...bc)];
  if (Math.abs(dot) > 1e-6 * x * y) {
    return undefined;
  }
  return x < y ? [x, y] : [y, x];
}

type Flat = { z: number; color: string; xy: [number, number][] };

/** The up-facing triangles of a mesh, with their height and colour. */
function flats(mesh: DesignTileMesh & { colors: Float32Array }): Flat[] {
  const out: Flat[] = [];
  const { design, normals, indices, colors } = mesh;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t]!, indices[t + 1]!, indices[t + 2]!];
    if (normals[3 * a + 2]! < 0.9999) {
      continue;
    }
    out.push({
      z: (design[3 * a + 2]! + design[3 * b + 2]! + design[3 * c + 2]!) / 3,
      color: Array.from(colors.subarray(4 * a, 4 * a + 4)).join(","),
      xy: [a, b, c].map((i) => [design[3 * i]!, design[3 * i + 1]!]) as [
        number,
        number,
      ][],
    });
  }
  return out;
}

/**
 * Whether two triangles overlap by more than `depth` (separating axes: on
 * every edge normal of either, their projections share more than it), so
 * touching edges don't count.
 */
function overlap(p: [number, number][], q: [number, number][], depth: number) {
  for (const poly of [p, q]) {
    for (let i = 0; i < 3; i++) {
      const [x0, y0] = poly[i]!;
      const [x1, y1] = poly[(i + 1) % 3]!;
      const length = Math.hypot(x1 - x0, y1 - y0);
      const [nx, ny] = [(y0 - y1) / length, (x1 - x0) / length];
      const span = (r: [number, number][]) => {
        const d = r.map(([x, y]) => x * nx + y * ny);
        return [Math.min(...d), Math.max(...d)] as const;
      };
      const [a0, a1] = span(p);
      const [b0, b1] = span(q);
      if (Math.min(a1, b1) - Math.max(a0, b0) <= depth) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Pairs of up-facing triangles of different colours within `near` of the
 * same height that overlap (by more than 1 cm): where a renderer z-fights.
 */
function coplanarOverlaps(
  mesh: DesignTileMesh & { colors: Float32Array },
  near: number,
  cell: number,
): string[] {
  const all = flats(mesh);
  const grid = new Map<string, number[]>();
  all.forEach((f, i) => {
    const xs = f.xy.map((p) => p[0]);
    const ys = f.xy.map((p) => p[1]);
    for (
      let x = Math.floor(Math.min(...xs) / cell);
      x <= Math.floor(Math.max(...xs) / cell);
      x++
    ) {
      for (
        let y = Math.floor(Math.min(...ys) / cell);
        y <= Math.floor(Math.max(...ys) / cell);
        y++
      ) {
        const key = `${x},${y}`;
        const list = grid.get(key);
        if (list) {
          list.push(i);
        } else {
          grid.set(key, [i]);
        }
      }
    }
  });
  const found: string[] = [];
  const seen = new Set<string>();
  for (const list of grid.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [all[list[i]!]!, all[list[j]!]!];
        if (a.color === b.color || Math.abs(a.z - b.z) >= near) {
          continue;
        }
        const key = `${list[i]},${list[j]}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        if (overlap(a.xy, b.xy, (0.01 * near) / 0.02)) {
          found.push(
            `(${a.xy[0]!.map((v) => v.toFixed(1))}) z ${a.z.toFixed(3)} and ${b.z.toFixed(3)}`,
          );
          if (found.length >= 5) {
            return found;
          }
        }
      }
    }
  }
  return found;
}

describe("no polygon z-fights another (fix round 1)", () => {
  it("uses one layer stack of 5 cm", () => {
    expect(LAYER_METRES).toBe(0.05);
  });

  for (const [id] of TABLE) {
    it(`${id}: no two differently coloured up-facing surfaces overlap within 2 cm of one height, at any level`, () => {
      const s = site(id);
      const { top, mpu } = built(s);
      for (const node of nodes(top)) {
        const mesh = node.mesh();
        if (mesh === null) {
          continue;
        }
        expect(
          coplanarOverlaps(mesh, 0.02 / mpu, 25 / mpu),
          `${id} ${node.id}`,
        ).toEqual([]);
      }
    });
  }

  it("Tokyo: every zebra crossing lies on the streets' asphalt", () => {
    const s = site("tokyo");
    const { plan } = built(s);
    const streets = plan.grounds.find(
      (g) => g.lods[0]!.keep && g.z === s.origin[2],
    )!;
    const [c, sn] = [Math.cos(streets.angle), Math.sin(streets.angle)];
    let stripes = 0;
    for (const mesh of leafMeshes(s)) {
      const fid = mesh.features.findIndex(
        (f) => f.name === "Pedestrian crossings",
      );
      if (fid < 0) {
        continue;
      }
      for (let i = 0; i < mesh.featureIds.length; i++) {
        if (mesh.featureIds[i] !== fid) {
          continue;
        }
        stripes++;
        const de = mesh.design[3 * i]! - streets.at[0];
        const dn = mesh.design[3 * i + 1]! - streets.at[1];
        // In the streets' frame, inside their rectangle.
        expect(Math.abs(c * de + sn * dn)).toBeLessThanOrEqual(
          streets.length / 2 + 1e-6,
        );
        expect(Math.abs(-sn * de + c * dn)).toBeLessThanOrEqual(
          streets.width / 2 + 1e-6,
        );
      }
    }
    expect(stripes).toBeGreaterThan(1_000);
  });
});

/** Every full-detail feature of a model, by kind. */
function featuresOf(s: PortfolioSite) {
  const { top } = built(s);
  const byKind = new Map<string, Set<string>>();
  for (const node of nodes(top)) {
    if (node.level !== 0) {
      continue;
    }
    for (const f of node.mesh()!.features) {
      let names = byKind.get(f.kind);
      if (names === undefined) {
        names = new Set();
        byKind.set(f.kind, names);
      }
      names.add(f.name);
    }
  }
  return byKind;
}

/** Every full-detail leaf mesh of a model. */
const leafMeshes = (s: PortfolioSite) =>
  [...nodes(built(s).top)].filter((n) => n.level === 0).map((n) => n.mesh()!);

describe("each model reads as what it is", () => {
  it("the airport: two runways with markings and thresholds, taxiways, a terminal", () => {
    const kinds = featuresOf(site("sydney"));
    expect([...kinds.get("runway")!].sort()).toEqual([
      "Runway 16L/34R",
      "Runway 16R/34L",
    ]);
    expect(kinds.get("runway marking")!.size).toBe(2);
    expect(kinds.get("taxiway")!.size).toBeGreaterThanOrEqual(10);
    expect(kinds.get("terminal")!.has("Terminal")).toBe(true);
    expect(kinds.get("aircraft")!.size).toBeGreaterThan(10);
    expect(kinds.has("tower")).toBe(true);
    // The threshold stripes: twelve 30 m stripes at each of the four ends.
    let stripes = 0;
    for (const mesh of leafMeshes(site("sydney"))) {
      const fid = mesh.features.findIndex((f) => f.kind === "runway marking");
      if (fid < 0) {
        continue;
      }
      for (let t = 0; t < mesh.indices.length; t += 3) {
        if (mesh.featureIds[mesh.indices[t]!] !== fid) {
          continue;
        }
        const sides = cellSides(mesh, t);
        if (
          sides &&
          Math.abs(sides[0] - 1.8) < 1e-6 &&
          Math.abs(sides[1] - 30) < 1e-6
        ) {
          stripes++;
        }
      }
    }
    expect(stripes).toBe(4 * 12);
  });

  it("the pole line: a pole every 50 m, cross-arms, and the spans between", () => {
    const s = site("london");
    const plan = built(s).plan as { poles: number };
    const kinds = featuresOf(s);
    expect(kinds.get("pole")!.size).toBe(plan.poles);
    expect(kinds.get("conductor")!.size).toBe(plan.poles - 1);
    const route = (s.model as PoleLineModel).route;
    let length = 0;
    for (let k = 1; k < route.length; k++) {
      length += Math.hypot(
        route[k]![0] - route[k - 1]![0],
        route[k]![1] - route[k - 1]![1],
      );
    }
    expect(Math.abs(length / (plan.poles - 1) - 50)).toBeLessThan(0.5);
  });

  it("the solar farm: rows of panels tilted to the south by the model's tilt", () => {
    const s = site("phoenix");
    const tilt = (s.model as SolarFarmModel).tilt;
    let tilted = 0;
    for (const mesh of leafMeshes(s)) {
      for (let i = 0; i < mesh.normals.length; i += 3) {
        const [ne, nn, nu] = [
          mesh.normals[i]!,
          mesh.normals[i + 1]!,
          mesh.normals[i + 2]!,
        ];
        if (
          Math.abs(ne) < 1e-6 &&
          Math.abs(Math.atan2(-nn, nu) - tilt) < 1e-6
        ) {
          tilted++;
        }
      }
    }
    // Four corners a table, more than 20,000 tables.
    expect(tilted / 4).toBeGreaterThan(20_000);
    expect(featuresOf(s).get("solar array")!.size).toBeGreaterThan(80);
  });

  for (const id of ["tokyo", "nairobi"]) {
    it(`${id}: buildings of varied footprints and heights`, () => {
      const s = site(id);
      const heights = new Set<number>();
      const footprints = new Set<string>();
      for (const part of built(s).plan.parts as { height?: number }[]) {
        if (part.height !== undefined) {
          heights.add(Math.round(part.height));
        }
      }
      for (const mesh of leafMeshes(s)) {
        // Roofs: up-facing quads above the ground, by their size.
        for (let t = 0; t < mesh.indices.length; t += 3) {
          const i = mesh.indices[t]!;
          const sides = cellSides(mesh, t);
          if (
            sides &&
            mesh.normals[3 * i + 2]! > 0.99 &&
            mesh.design[3 * i + 2]! > s.origin[2] + 6
          ) {
            footprints.add(sides.map((x) => Math.round(x)).join("x"));
          }
        }
      }
      expect(heights.size).toBeGreaterThan(8);
      expect(footprints.size).toBeGreaterThan(15);
    });
  }

  it("the port: a quay, cranes, ships and the container yard", () => {
    const kinds = featuresOf(site("jakarta"));
    expect(kinds.get("quay")!.size).toBe(1);
    expect(kinds.get("container stack")!.size).toBeGreaterThan(50);
    expect(kinds.get("ship")!.size).toBe(2);
    expect(
      [...kinds.get("crane")!].filter((n) => n.startsWith("Ship-to-shore"))
        .length,
    ).toBe((site("jakarta").model as PortModel).cranes);
  });
});
