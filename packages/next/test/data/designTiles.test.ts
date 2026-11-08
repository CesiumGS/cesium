// The design globe's generated tiles and answers (plan 4b Task 14), read
// from the store `npm run setup` fills (`<store>/design-globe/`):
//  - the corridor's rigid and reprojected tilesets have one tree, the same
//    tile ids and per-tile vertex counts (call 15), and equal geometric
//    errors once the engine scales them by their transforms;
//  - spec section 10's round trip, design -> displayed -> design within
//    1e-4 m, on every 50th vertex of every leaf, in either placement (the
//    exact drawn position stands in for the pick);
//  - the rigid roots are their placements' matrices (`checkRigidTransform`);
//  - the answers' rigid sag at 10 and 20 km is the spec's, and answers
//    recomputed with the library are the same numbers;
//  - answers.json is `Answers`' shape (Task 17): the station 170,000
//    marker's rigid separation, the survey mark's zone 3 coordinates
//    through PROJ against NGS's datasheet, and the measurement model on the
//    library's own measurement of pairs[0];
//  - the scale ladder (Task 17b): each site's rigid and reprojected
//    tilesets are partners (one tree, the same ids, indices, feature ids
//    and colours, and every vertex the same design point), load by their
//    own declarations, round-trip on their leaves, keep every reprojected
//    tile's edges within the sag rule, and have the extents and rigid
//    errors of the ladder, which grow down it;
//  - the ladder's coarse tiles (F6): each is within its stated error of the
//    leaves both ways (sampled), and keeps something standing in the region
//    of every solid feature its leaves hold (paint, wires and the ground
//    may go).
// `npm run test:data` runs it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Tile.ts reaches the content decoders, which need a browser worker; the
// tilesets here are only parsed.
vi.mock("../../src/io/decoders.ts", () => ({
  decodeDraco: async () => {
    throw new Error("no Draco");
  },
  transcodeKtx2: async () => {
    throw new Error("no KTX2");
  },
}));

import {
  ANCHOR_STATION,
  BRIDGE,
  CORRIDOR_ALIGNMENT,
  PAIR_STATIONS,
  SURVEY_MARK,
  corridorFrame,
  sectionSurface,
} from "../../examples/design-globe/corridor.ts";
import { parseAnswers } from "../../examples/design-globe/answers.ts";
import {
  MARK_SPC_TOLERANCE,
  checkRows,
} from "../../examples/design-globe/checks.ts";
import { measurementModel } from "../../examples/design-globe/measureModel.ts";
import type { SnapResult } from "../../src/engineering/snap.ts";
import {
  corridorTree,
  largestSlopeError,
  largestChordError,
  type CorridorNode,
} from "../../scripts/designTiles/corridorMesh.mjs";
import {
  LADDER,
  PORTFOLIO,
  SITE_BUILDING,
  modelAnchor,
} from "../../examples/design-globe/sites.ts";
import {
  DESIGN_TILES_INSTANT,
  rigidErrorTerms,
} from "../../scripts/designTiles.mjs";
import { MIN_RADIUS } from "../../scripts/designTiles/meshBuilder.mjs";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { Alignment } from "../../src/engineering/alignment.ts";
import {
  EngineeringFrame,
  designPoint,
} from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import {
  checkRigidTransform,
  declaredDefinition,
  readGeoreference,
} from "../../src/engineering/georeferenceTileset.ts";
import {
  formatPipeline,
  parsePipeline,
} from "../../src/engineering/pipeline.ts";
import {
  placeReprojected,
  placeRigid,
  type TilesetPlacement,
} from "../../src/engineering/placement.ts";
import {
  gridSource,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import type { ProjApi } from "../../src/engineering/projApi.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { splitGlb } from "../../src/io/glb.ts";
import { measure } from "../../src/measure/measure.ts";
import { treeFromJson, type Tile } from "../../src/streaming/Tile.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const store = framesDataDirectory();
const out = join(store, "design-globe");
const read = (...parts: string[]) => readFileSync(join(out, ...parts));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const tileset = (name: string): Json =>
  JSON.parse(read(name, "tileset.json").toString("utf8"));

/** Each tile's content URI (or "") and its children, in order. */
type Shape = { uri: string; children: Shape[] };
const shape = (tile: Json): Shape => ({
  uri: tile.content?.uri ?? "",
  children: (tile.children ?? []).map(shape),
});

/** A GLB's POSITION accessor as a Float32Array. */
function positions(bytes: Uint8Array): Float32Array {
  return accessorOf(bytes, "POSITION") as Float32Array;
}

/**
 * A GLB's attribute (by semantic) or its indices ("indices"), each element
 * read through its view's stride, as the accessor's array type.
 */
function accessorOf(bytes: Uint8Array, semantic: string): ArrayLike<number> {
  const { json, bin } = splitGlb(bytes);
  const primitive = json.meshes[0].primitives[0];
  const accessor =
    json.accessors[
      semantic === "indices"
        ? primitive.indices
        : primitive.attributes[semantic]
    ];
  const view = json.bufferViews[accessor.bufferView];
  const Type = (
    {
      5121: Uint8Array,
      5123: Uint16Array,
      5125: Uint32Array,
      5126: Float32Array,
    } as const
  )[accessor.componentType as 5121 | 5123 | 5125 | 5126];
  const components = { SCALAR: 1, VEC3: 3, VEC4: 4 }[
    accessor.type as "SCALAR" | "VEC3" | "VEC4"
  ];
  const size = Type.BYTES_PER_ELEMENT * components;
  const stride = view.byteStride ?? size;
  const start =
    bin!.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const out = new Type(accessor.count * components);
  const data = bin!.buffer.slice(
    start,
    start + stride * accessor.count,
  ) as ArrayBuffer;
  for (let i = 0; i < accessor.count; i++) {
    out.set(new Type(data, i * stride, components), i * components);
  }
  return out;
}

/** Pairs of (json tile, engine tile), depth first. */
function* walk(
  json: Json,
  tile: Tile,
  chain: number[][] = [],
): Generator<{
  json: Json;
  tile: Tile;
  chain: number[][];
}> {
  const here = json.transform ? [...chain, json.transform] : chain;
  yield { json, tile, chain: here };
  const children = json.children ?? [];
  for (let i = 0; i < children.length; i++) {
    yield* walk(children[i], tile.children[i]!, here);
  }
}

const tree = (json: Json) =>
  treeFromJson(json, "http://x/tileset.json", undefined, {
    warnings: new Set<string>(),
  } as never).root;

/** A column-major 4x4 applied to a point. */
const apply = (m: ArrayLike<number>, p: ArrayLike<number>) =>
  [0, 1, 2].map(
    (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
  );

/** glTF Y-up content to tile space (Z-up): (x, y, z) -> (x, -z, y). */
const zUp = (p: Float32Array, i: number) => [
  p[3 * i]!,
  -p[3 * i + 2]!,
  p[3 * i + 1]!,
];

/** A GLB's feature names (its property table's `name` column), by feature id. */
function featureNames(bytes: Uint8Array): string[] {
  const { json, bin } = splitGlb(bytes);
  const table = json.extensions.EXT_structural_metadata.propertyTables[0];
  const view = (i: number) => {
    const v = json.bufferViews[i];
    return new Uint8Array(
      bin!.buffer,
      bin!.byteOffset + (v.byteOffset ?? 0),
      v.byteLength,
    );
  };
  const values = view(table.properties.name.values);
  const raw = view(table.properties.name.stringOffsets);
  const offsets = new Uint32Array(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
  );
  const decoder = new TextDecoder();
  return Array.from({ length: table.count }, (_v, i) =>
    decoder.decode(values.subarray(offsets[i]!, offsets[i + 1]!)),
  );
}

/** Calls f on each triangle (9 numbers) of a flat array, with its index. */
function eachTriangle(
  tris: Float64Array,
  f: (t: Float64Array, i: number) => void,
) {
  for (let i = 0; 9 * i < tris.length; i++) {
    f(tris.subarray(9 * i, 9 * i + 9), i);
  }
}

/** A triangle's width: twice its area over its longest edge. */
function width(t: ArrayLike<number>): number {
  const [ux, uy, uz] = [t[3]! - t[0]!, t[4]! - t[1]!, t[5]! - t[2]!];
  const [vx, vy, vz] = [t[6]! - t[0]!, t[7]! - t[1]!, t[8]! - t[2]!];
  const area = Math.hypot(
    uy * vz - uz * vy,
    uz * vx - ux * vz,
    ux * vy - uy * vx,
  );
  const longest = Math.max(
    Math.hypot(ux, uy, uz),
    Math.hypot(vx, vy, vz),
    Math.hypot(t[6]! - t[3]!, t[7]! - t[4]!, t[8]! - t[5]!),
  );
  return area / Math.max(longest, 1e-12);
}

/** Points of a triangle no farther apart than `spacing`, its corners among them. */
function samples(
  t: ArrayLike<number>,
  spacing: number,
  f: (x: number, y: number, z: number) => void,
) {
  const n = Math.max(
    1,
    Math.ceil(
      Math.max(
        Math.hypot(t[3]! - t[0]!, t[4]! - t[1]!, t[5]! - t[2]!),
        Math.hypot(t[6]! - t[3]!, t[7]! - t[4]!, t[8]! - t[5]!),
        Math.hypot(t[0]! - t[6]!, t[1]! - t[7]!, t[2]! - t[8]!),
      ) / spacing,
    ),
  );
  for (let i = 0; i <= n; i++) {
    for (let j = 0; i + j <= n; j++) {
      const [u, v] = [i / n, j / n];
      const w = 1 - u - v;
      f(
        w * t[0]! + u * t[3]! + v * t[6]!,
        w * t[1]! + u * t[4]! + v * t[7]!,
        w * t[2]! + u * t[5]! + v * t[8]!,
      );
    }
  }
}

/** The distance from a point to the segment from t[a..a+2] to t[b..b+2]. */
function toSegment(
  x: number,
  y: number,
  z: number,
  t: Float64Array,
  a: number,
  b: number,
) {
  const dx = t[b]! - t[a]!;
  const dy = t[b + 1]! - t[a + 1]!;
  const dz = t[b + 2]! - t[a + 2]!;
  const len2 = dx * dx + dy * dy + dz * dz;
  const s =
    len2 > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((x - t[a]!) * dx + (y - t[a + 1]!) * dy + (z - t[a + 2]!) * dz) /
              len2,
          ),
        )
      : 0;
  return Math.hypot(
    x - t[a]! - s * dx,
    y - t[a + 1]! - s * dy,
    z - t[a + 2]! - s * dz,
  );
}

/**
 * The distance from a point to the triangle at t[o..o+8]: to its plane
 * where the foot lies inside it (on the inner side of every edge), else
 * to its nearest edge.
 */
function toTriangle(x: number, y: number, z: number, t: Float64Array, o = 0) {
  const ux = t[o + 3]! - t[o]!;
  const uy = t[o + 4]! - t[o + 1]!;
  const uz = t[o + 5]! - t[o + 2]!;
  const vx = t[o + 6]! - t[o]!;
  const vy = t[o + 7]! - t[o + 1]!;
  const vz = t[o + 8]! - t[o + 2]!;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const nn = Math.hypot(nx, ny, nz);
  if (nn > 0) {
    const h =
      ((x - t[o]!) * nx + (y - t[o + 1]!) * ny + (z - t[o + 2]!) * nz) / nn;
    const fx = x - (h * nx) / nn;
    const fy = y - (h * ny) / nn;
    const fz = z - (h * nz) / nn;
    let inside = true;
    for (let e = 0; e < 3 && inside; e++) {
      const a = o + 3 * e;
      const b = o + 3 * ((e + 1) % 3);
      const ex = t[b]! - t[a]!;
      const ey = t[b + 1]! - t[a + 1]!;
      const ez = t[b + 2]! - t[a + 2]!;
      const px = fx - t[a]!;
      const py = fy - t[a + 1]!;
      const pz = fz - t[a + 2]!;
      inside =
        (ey * pz - ez * py) * nx +
          (ez * px - ex * pz) * ny +
          (ex * py - ey * px) * nz >=
        0;
    }
    if (inside) {
      return Math.abs(h);
    }
  }
  return Math.min(
    toSegment(x, y, z, t, o, o + 3),
    toSegment(x, y, z, t, o + 3, o + 6),
    toSegment(x, y, z, t, o + 6, o),
  );
}

/** Tiles' triangles in a horizontal grid, for the distance to the nearest. */
class Grid {
  readonly tris: Float64Array;
  readonly cells = new Map<number, number[]>();
  readonly x0: number;
  readonly y0: number;
  constructor(
    tiles: { tris: Float64Array }[],
    readonly cell: number,
    from?: Grid,
  ) {
    this.tris = from?.tris ?? concat(tiles.map((r) => r.tris));
    // A local origin keeps the cell indices small, and exact as keys.
    this.x0 = this.tris[0] ?? 0;
    this.y0 = this.tris[1] ?? 0;
    if (cell <= 0) {
      return;
    }
    eachTriangle(this.tris, (t, i) => {
      const [i0, i1] = this.span(t[0]!, t[3]!, t[6]!, this.x0);
      const [j0, j1] = this.span(t[1]!, t[4]!, t[7]!, this.y0);
      for (let a = i0; a <= i1; a++) {
        for (let b = j0; b <= j1; b++) {
          const key = this.key(a, b);
          const list = this.cells.get(key);
          if (list) {
            list.push(i);
          } else {
            this.cells.set(key, [i]);
          }
        }
      }
    });
  }

  span(a: number, b: number, c: number, origin: number) {
    return [
      Math.floor((Math.min(a, b, c) - origin) / this.cell),
      Math.floor((Math.max(a, b, c) - origin) / this.cell),
    ] as const;
  }

  key(a: number, b: number) {
    return (a + 2_097_152) * 4_194_304 + (b + 2_097_152);
  }

  /** The distance to the nearest triangle, or some distance at most `enough` once one is that near. */
  distance(x: number, y: number, z: number, enough: number): number {
    const a = Math.floor((x - this.x0) / this.cell);
    const b = Math.floor((y - this.y0) / this.cell);
    let best = Infinity;
    for (let r = 0; r < 64; r++) {
      if (r > 0 && (r - 1) * this.cell >= best) {
        return best;
      }
      for (let i = -r; i <= r; i++) {
        const edge = i === -r || i === r;
        for (let j = -r; j <= r; j += edge || r === 0 ? 1 : 2 * r) {
          for (const k of this.cells.get(this.key(a + i, b + j)) ?? []) {
            best = Math.min(best, toTriangle(x, y, z, this.tris, 9 * k));
            if (best <= enough) {
              return best;
            }
          }
        }
      }
    }
    return best;
  }
}

const concat = (arrays: Float64Array[]) => {
  const out = new Float64Array(arrays.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const a of arrays) {
    out.set(a, at);
    at += a.length;
  }
  return out;
};

describe("the design globe's generated tiles", () => {
  let rigidJson: Json;
  let reprojectedJson: Json;
  let answers: Json;
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);
  const anchor = alignment.pointAt(ANCHOR_STATION);

  let P: ProjApi;
  let source: GridSource;
  let frame: EngineeringFrame;
  let rigid: TilesetPlacement;
  let reprojected: TilesetPlacement;
  beforeAll(async () => {
    if (!existsSync(join(out, "manifest.json"))) {
      throw new Error(`${out}/manifest.json is missing: run \`npm run setup\``);
    }
    rigidJson = tileset("corridor-rigid");
    reprojectedJson = tileset("corridor-reprojected");
    answers = JSON.parse(read("answers.json").toString("utf8"));
    P = await loadProj({ base: `${join(store, "proj")}/`, grids: [] });
    source = await gridSource({ base: `${join(store, "grids")}/` });
    // Every frame here is the one the tileset's own declaration describes,
    // loaded as georeferenceTileset loads it: a reader of the declaration
    // gets these tiles' frame.
    frame = await declaredFrame(rigidJson, "corridor-rigid");
    rigid = placeRigid(frame, anchor);
    reprojected = placeReprojected(
      await declaredFrame(reprojectedJson, "corridor-reprojected"),
    );
  });

  /** The frame a tileset's declaration describes, its grids checked first. */
  async function declaredFrame(json: Json, name: string) {
    const declared = readGeoreference(json)!;
    return EngineeringFrame.load(
      declaredDefinition(declared, name, source.catalog),
      {
        proj: P,
        grids: source,
      },
    );
  }

  it("writes a manifest of version 1 with the inputs' hashes", () => {
    const manifest = JSON.parse(read("manifest.json").toString("utf8"));
    expect(manifest.version).toBe(1);
    for (const file of [
      "examples/design-globe/corridor.ts",
      "examples/design-globe/sideSlopes.ts",
      "examples/design-globe/corridorDaylight.ts",
      "examples/design-globe/sites.ts",
      "scripts/designTiles.mjs",
      "scripts/designTiles/corridorMesh.mjs",
      "scripts/designTiles/siteMesh.mjs",
      "scripts/designTiles/ladder.mjs",
      "scripts/designTiles/meshBuilder.mjs",
      ...["block", "port", "solarFarm", "airport", "campus", "poleLine"].map(
        (m) => `scripts/designTiles/${m}Mesh.mjs`,
      ),
    ]) {
      expect(manifest.sha256[file]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("gives both corridor tilesets one tree, the same tile ids and vertex counts", () => {
    expect(shape(reprojectedJson.root)).toEqual(shape(rigidJson.root));
    const uris: string[] = [];
    const collect = (s: Shape) => {
      if (s.uri) {
        uris.push(s.uri);
      }
      s.children.forEach(collect);
    };
    collect(shape(rigidJson.root));
    expect(uris.length).toBeGreaterThan(80);
    expect(new Set(uris).size).toBe(uris.length);
    for (const uri of uris) {
      const a = positions(read("corridor-rigid", uri));
      const b = positions(read("corridor-reprojected", uri));
      expect(b.length, uri).toBe(a.length);
    }
  });

  it("states equal geometric errors once the engine scales them", () => {
    const a = [...walk(rigidJson.root, tree(rigidJson))];
    const b = [...walk(reprojectedJson.root, tree(reprojectedJson))];
    expect(b).toHaveLength(a.length);
    // The tileset's own error isn't scaled: metres in both.
    expect(rigidJson.geometricError).toBe(reprojectedJson.geometricError);
    // The generator's tree again, for each parent's stations.
    const nodes = new Map<string, CorridorNode>();
    const index = (node: CorridorNode) => {
      nodes.set(`tiles/${node.id}.glb`, node);
      node.children.forEach(index);
    };
    index(
      corridorTree(alignment, { leafLength: 2_000, chordTolerance: 0.003 }),
    );
    let checkedParents = 0;
    const leaf = a.find((x) => !x.json.children)!;
    expect(leaf.json.geometricError).toBe(0.003);
    for (let i = 0; i < a.length; i++) {
      const [x, y] = [a[i]!.tile.geometricError, b[i]!.tile.geometricError];
      expect(Math.abs(x - y) / y).toBeLessThan(1e-12);
      if (a[i]!.json.children) {
        // Parents state at least twice their children's error, and at
        // least their own stations' largest chord error.
        for (const child of a[i]!.json.children) {
          expect(a[i]!.json.geometricError).toBeGreaterThanOrEqual(
            2 * child.geometricError,
          );
        }
        const uri: string | undefined = a[i]!.json.content?.uri;
        if (uri !== undefined) {
          const node = nodes.get(uri)!;
          expect(a[i]!.json.geometricError, uri).toBeGreaterThanOrEqual(
            largestChordError(alignment, node.stations),
          );
          // And what its side slopes miss of its leaves'.
          const leaves: number[] = [];
          const gather = (n: CorridorNode) =>
            n.children.length === 0
              ? leaves.push(...n.stations)
              : n.children.forEach(gather);
          gather(node);
          expect(a[i]!.json.geometricError, uri).toBeGreaterThanOrEqual(
            largestSlopeError(
              alignment,
              node.stations,
              [...new Set(leaves)].sort((p, q) => p - q),
            ),
          );
          checkedParents++;
        }
      }
    }
    expect(checkedParents).toBe(85);
  });

  it("round-trips every 50th vertex of every leaf within 1e-4 m, in either placement", () => {
    const rigidTiles = [...walk(rigidJson.root, tree(rigidJson))];
    const reprojectedTiles = [
      ...walk(reprojectedJson.root, tree(reprojectedJson)),
    ];
    const mpu = frame.units.metersPerUnit;
    const mph = frame.metersPerHeightUnit;
    let checked = 0;
    let worstRigid = 0;
    let worstReprojected = 0;
    for (let t = 0; t < rigidTiles.length; t++) {
      const r = rigidTiles[t]!;
      if (r.json.children || !r.json.content) {
        continue;
      }
      const q = reprojectedTiles[t]!;
      // The tile's centre in design units: its translations from the root.
      const centre = [0, 1, 2].map((k) =>
        r.chain.slice(1).reduce((sum, m) => sum + m[12 + k]!, 0),
      );
      const a = positions(read("corridor-rigid", r.json.content.uri));
      const b = positions(read("corridor-reprojected", q.json.content.uri));
      for (let i = 0; i < a.length / 3; i += 50) {
        const local = zUp(a, i);
        const design = local.map((v, k) => centre[k]! + v);
        const gap = (got: ArrayLike<number>) =>
          Math.hypot(
            (got[0]! - design[0]!) * mpu,
            (got[1]! - design[1]!) * mpu,
            (got[2]! - design[2]!) * mph,
          );
        const shown = apply(r.tile.transform, local);
        worstRigid = Math.max(worstRigid, gap(rigid.designOf(shown)));
        const drawn = apply(q.tile.transform, zUp(b, i));
        worstReprojected = Math.max(
          worstReprojected,
          gap(reprojected.designOf(drawn)),
        );
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(3_000);
    expect(worstRigid).toBeLessThan(1e-4);
    expect(worstReprojected).toBeLessThan(1e-4);
  }, 120_000);

  it("places every tileset by its own declaration", async () => {
    const declared = readGeoreference(rigidJson)!;
    // BENTLEY_engineering_frame, with the alignments as BENTLEY_alignments:
    // nothing to warn about, and the corridor's alignment exactly.
    for (const json of [rigidJson, reprojectedJson]) {
      expect(json.extensionsUsed).toEqual([
        "BENTLEY_engineering_frame",
        "BENTLEY_alignments",
      ]);
      const g = readGeoreference(json)!;
      expect(g.warnings).toEqual([]);
      expect(g.sources.alignments).toBe("extensions.BENTLEY_alignments");
      expect(g.alignments).toEqual([CORRIDOR_ALIGNMENT]);
    }
    // The corridor's declared operation is its GEOID18 pin, exactly.
    expect(declared.pipeline).toBe(
      formatPipeline(parsePipeline(corridorFrame().pipeline as string)),
    );
    expect(frame.operation.grids).toEqual(["us_noaa_g2018u0.tif"]);
    expect(readGeoreference(reprojectedJson)!.pipeline).toBe(declared.pipeline);
    expect(declared.placement).toEqual({
      mode: "rigid",
      anchor: Array.from(anchor),
    });
    expect(readGeoreference(reprojectedJson)!.placement).toEqual({
      mode: "reprojected",
    });
    expect(rigidJson.root.transform).toEqual(Array.from(rigid.rigid!.matrix));
    expect(() =>
      checkRigidTransform(rigid, Float64Array.from(rigidJson.root.transform)),
    ).not.toThrow();
    const rigidDirs = [
      [SITE_BUILDING, "site-building"],
      ...PORTFOLIO.map((s) => [s, `portfolio-${s.id}-rigid`] as const),
    ] as const;
    for (const site of PORTFOLIO) {
      // The reprojected partner: declared reprojected, the same frame.
      const dir = `portfolio-${site.id}-reprojected`;
      const json = tileset(dir);
      const georeference = readGeoreference(json)!;
      expect(json.extensionsUsed, dir).toEqual(["BENTLEY_engineering_frame"]);
      expect(georeference.warnings, dir).toEqual([]);
      expect(georeference.placement, dir).toEqual({ mode: "reprojected" });
      expect(json.root.transform, dir).toBeUndefined();
      expect(georeference.geoidFallback, dir).toBe(site.frame.geoidFallback);
      const siteFrame = await declaredFrame(json, dir);
      expect([...siteFrame.operation.grids].sort(), dir).toEqual(
        [...site.grids].sort(),
      );
    }
    for (const [site, dir] of rigidDirs) {
      const json = tileset(dir);
      const georeference = readGeoreference(json)!;
      expect(json.extensionsUsed, site.id).toEqual([
        "BENTLEY_engineering_frame",
      ]);
      expect(georeference.warnings, site.id).toEqual([]);
      expect(georeference.placement.mode, site.id).toBe("rigid");
      expect(georeference.geoidFallback, site.id).toBe(
        site.frame.geoidFallback,
      );
      expect(georeference.pipeline !== undefined, site.id).toBe(
        site.frame.pipeline !== undefined,
      );
      const siteFrame = await declaredFrame(json, dir);
      expect([...siteFrame.operation.grids].sort(), site.id).toEqual(
        [...site.grids].sort(),
      );
      const placement = placeRigid(
        siteFrame,
        (georeference.placement as { readonly anchor: readonly number[] })
          .anchor,
      );
      expect(json.root.transform, site.id).toEqual(
        Array.from(placement.rigid!.matrix),
      );
      expect(() =>
        checkRigidTransform(placement, Float64Array.from(json.root.transform)),
      ).not.toThrow();
    }
  }, 120_000);

  it("states the spec's rigid sag at the points nearest 10 and 20 km from the anchor", () => {
    expect(answers.instant).toBe(DESIGN_TILES_INSTANT);
    const near = (km: number) =>
      answers.points.filter((p: Json) => p.nearKm === km && p.offset === 0);
    expect(near(10).length).toBeGreaterThan(0);
    expect(near(20).length).toBeGreaterThan(0);
    for (const p of near(10)) {
      expect(Math.abs(p.distanceFromAnchor - 10_000)).toBeLessThan(1);
      expect(Math.abs(p.displayError - 7.8)).toBeLessThanOrEqual(1.5);
    }
    for (const p of near(20)) {
      expect(Math.abs(p.distanceFromAnchor - 20_000)).toBeLessThan(1);
      expect(Math.abs(p.displayError - 31)).toBeLessThanOrEqual(3);
    }
    const end = answers.points.find(
      (p: Json) => p.station === alignment.endStation && p.offset === 0,
    );
    expect(end.distanceFromAnchor / 1000).toBeCloseTo(21.95, 2);
    expect(answers.pairs).toHaveLength(4);
  });

  it("recomputes three answers with the library, exactly", () => {
    const dir = store;
    const bytes = (file: string) => {
      const b = readFileSync(join(dir, file));
      return b.buffer.slice(
        b.byteOffset,
        b.byteOffset + b.byteLength,
      ) as ArrayBuffer;
    };
    const manifest = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    );
    const file = (role: string) =>
      manifest.files.find((f: Json) => f.role === role).file as string;
    const builtIn = LeapSeconds.builtIn();
    const stored = LeapSeconds.fromIers(
      readFileSync(join(dir, file("leapSeconds")), "utf8"),
    );
    const leapSeconds = stored.expires > builtIn.expires ? stored : builtIn;
    const frames = createFrames({
      leapSeconds,
      eop: EarthOrientationParameters.fromCelestrakCsv(
        readFileSync(join(dir, file("eop")), "utf8"),
      ),
      ephemeris: Ephemeris.fromPacks(
        bytes(file("planets")),
        bytes(file("moon")),
      ),
      warnings: [],
    });
    // The generator's instant uses the built-in leap seconds (37 s then, as
    // in every table since 2017).
    const instant = Instant.fromUtc(Date.parse(DESIGN_TILES_INSTANT), builtIn);

    // A point at 10 km, and one off the centreline on the bridge.
    for (const point of [
      answers.points.find((p: Json) => p.nearKm === 10),
      answers.points.find(
        (p: Json) => p.station === BRIDGE.toStation && p.offset === -17,
      ),
    ]) {
      const design = alignment.pointAt(point.station, point.offset);
      expect(point.design[0]).toBe(design[0]);
      expect(point.design[1]).toBe(design[1]);
      expect(point.design[2]).toBe(design[2]! + sectionSurface(point.offset));
      expect(Array.from(frame.toBodyFixed(point.design))).toEqual(
        point.bodyFixed,
      );
      expect(Array.from(rigid.displayed(point.design))).toEqual(
        point.rigidDisplayed,
      );
      expect(rigid.displayError(point.design)).toBe(point.displayError);
      const geodetic = frame.toGeodetic(point.design);
      expect([geodetic.longitude, geodetic.latitude, geodetic.height]).toEqual([
        point.geodetic.longitude,
        point.geodetic.latitude,
        point.geodetic.height,
      ]);
      const factors = gridFactors(frame, point.design);
      expect(factors.combinedFactor).toBe(point.combinedFactor);
      expect(factors.convergence).toBe(point.convergence);
    }

    // The pair across the bridge.
    const pair = answers.pairs.find((p: Json) => p.id === "bridge");
    const ends = [answers.points[pair.from], answers.points[pair.to]];
    expect(ends.map((p: Json) => [p.station, p.offset])).toEqual([
      [pair.ends.a.station, pair.ends.a.offset],
      [pair.ends.b.station, pair.ends.b.offset],
    ]);
    const m = measure(
      designPoint(frame, ends[0].design),
      designPoint(frame, ends[1].design),
      instant,
      frames,
      { signal: false, alignment: CORRIDOR_ALIGNMENT.name },
    );
    expect(m.design!.distance).toBe(pair.designDistance);
    expect(m.design!.horizontalDistance).toBe(pair.horizontalDistance);
    expect(m.distance).toBe(pair.trueDistance);

    // The measurement model on pairs[0], 10,000 ft on the first tangent, over
    // the profile's crest at station 19,000: the horizontal and 3D design distances, and
    // the true one.
    const first = answers.pairs[0];
    const [a, b] = [first.from, first.to].map(
      (i: number) => answers.points[i].design,
    );
    const exact = (design: number[]): SnapResult => ({
      snapPoint: frame.toBodyFixed(design),
      hitPoint: frame.toBodyFixed(design),
      distance: 0,
      kind: "segment",
      design: designPoint(frame, design, {
        how: "snap",
        tolerance: 0,
        kind: "segment",
      }),
      tolerance: 0,
      exact: true,
      source: "server",
      provisional: false,
    });
    const view = measurementModel(
      exact(a),
      exact(b),
      measure(designPoint(frame, a), designPoint(frame, b), instant, frames, {
        signal: false,
        alignment: CORRIDOR_ALIGNMENT.name,
      }),
    );
    expect(view.horizontalDistance).toBe("10,000.000 ftUS");
    // The straight line between the ends: 10,000 ft across, and the climb
    // between their elevations.
    const climb =
      alignment.elevationAt(PAIR_STATIONS[1]) -
      alignment.elevationAt(PAIR_STATIONS[0]);
    expect(view.designDistance).toBe(
      `${Math.hypot(10_000, climb).toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })} ftUS`,
    );
    expect(view.trueDistance).toBe(
      `${first.trueDistance.toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })} m`,
    );
    expect(view.a.station).toBe("112+00.000");
    expect(view.b.station).toBe("212+00.000");
  });

  it("writes answers.json as Answers' shape", () => {
    expect(() => parseAnswers(answers)).not.toThrow();
    expect(parseAnswers(answers)).toEqual(answers);
    expect(answers.anchorStation).toBe(ANCHOR_STATION);
    expect(answers.frame.unitName).toBe("US survey foot");
  });

  // The owner's "about 31.6 m" is the rigid error at the station nearest 20
  // km from the anchor (166,627); at station 170,000 it is about 34.4 m.
  it("records the station 170,000 marker: about 34.4 m between its true and rigid positions", () => {
    const marker = answers.marker;
    expect(marker.station).toBe(170_000);
    const point = answers.points[marker.point];
    expect([point.station, point.offset]).toEqual([170_000, 0]);
    expect(Array.from(frame.toBodyFixed(marker.design))).toEqual(
      marker.bodyFixed,
    );
    expect(Array.from(rigid.displayed(marker.design))).toEqual(
      marker.rigidDisplayed,
    );
    expect(marker.separation).toBe(rigid.displayError(marker.design));
    expect(Math.abs(marker.separation - 34.4)).toBeLessThan(0.1);
    expect(reprojected.displayError(marker.design)).toBe(0);
  });

  it("places the NGS mark: PROJ's zone 3 against the datasheet, and its distances to the centreline", () => {
    const mark = answers.mark;
    expect(mark.pid).toBe(SURVEY_MARK.pid);
    // The published position on the ellipsoid against the datasheet's own
    // X, Y, Z (to the millimetre it publishes; the GRS80 and WGS 84
    // ellipsoids differ by about 0.1 mm here).
    for (let k = 0; k < 3; k++) {
      expect(
        Math.abs(mark.bodyFixed[k] - SURVEY_MARK.publishedXyz[k]!),
      ).toBeLessThan(0.0006);
    }
    // PROJ's zone 3 from the published position, against the datasheet's.
    expect(Array.from(frame.fromBodyFixed(mark.bodyFixed))).toEqual(
      mark.design,
    );
    const rows = checkRows(parseAnswers(answers), {
      points: new Map(),
      pairs: new Map(),
      mark: { easting: mark.design[0], northing: mark.design[1] },
    });
    for (const id of ["mark.easting", "mark.northing"]) {
      const row = rows.find((r) => r.id === id)!;
      expect(row.kind).toBe("published reference");
      expect(row.tolerance).toBe(MARK_SPC_TOLERANCE);
      expect(row.status, `${id}: ${row.shown} against ${row.expected}`).toBe(
        "pass",
      );
    }
    // Its nearest centreline point and the distances to it.
    const at = alignment.stationOffset(mark.design);
    expect([at.station, at.offset]).toEqual([
      mark.nearest.station,
      mark.nearest.offset,
    ]);
    expect(
      Math.abs(mark.horizontalDistance - Math.abs(mark.nearest.offset)),
    ).toBeLessThan(1e-6);
    expect(Math.abs(mark.nearest.offset)).toBeLessThan(600);
    expect(mark.trueDistance).toBeGreaterThan(
      mark.horizontalDistance * frame.units.metersPerUnit * 0.99,
    );
    // `measure`'s true distance between the two design points, as the page
    // measures it: the straight line between where they truly are.
    const ends = [mark.design, mark.nearestDesign].map((d: number[]) =>
      frame.toBodyFixed(d),
    );
    expect(mark.trueDistance).toBe(
      Math.hypot(
        ends[1]![0]! - ends[0]![0]!,
        ends[1]![1]! - ends[0]![1]!,
        ends[1]![2]! - ends[0]![2]!,
      ),
    );
  });
});

/** The ladder (owner, 2026-11-07), smallest first: each model's extent, metres. */
const LADDER_EXTENTS: Record<string, number> = {
  amsterdam: 60,
  tokyo: 1_000,
  jakarta: 3_000,
  phoenix: 4_000,
  sydney: 4_000,
  nairobi: 10_000,
  london: 30_000,
};

describe("the scale ladder's tilesets (Task 17b)", () => {
  let P: ProjApi;
  let source: GridSource;
  let answers: Json;
  const loaded = new Map<
    string,
    {
      rigidJson: Json;
      reprojectedJson: Json;
      rigid: TilesetPlacement;
      reprojected: TilesetPlacement;
      frame: EngineeringFrame;
    }
  >();
  beforeAll(async () => {
    if (!existsSync(join(out, "manifest.json"))) {
      throw new Error(`${out}/manifest.json is missing: run \`npm run setup\``);
    }
    answers = JSON.parse(read("answers.json").toString("utf8"));
    P = await loadProj({ base: `${join(store, "proj")}/`, grids: [] });
    source = await gridSource({ base: `${join(store, "grids")}/` });
    // Each placement from its own tileset's declaration.
    const proj = P;
    const grids = source;
    const load = (json: Json, name: string) =>
      EngineeringFrame.load(
        declaredDefinition(readGeoreference(json)!, name, grids.catalog),
        { proj, grids },
      );
    for (const site of PORTFOLIO) {
      const rigidJson = tileset(`portfolio-${site.id}-rigid`);
      const reprojectedJson = tileset(`portfolio-${site.id}-reprojected`);
      const frame = await load(rigidJson, site.id);
      const anchor = (
        readGeoreference(rigidJson)!.placement as {
          readonly anchor: readonly number[];
        }
      ).anchor;
      loaded.set(site.id, {
        rigidJson,
        reprojectedJson,
        frame,
        rigid: placeRigid(frame, anchor),
        reprojected: placeReprojected(await load(reprojectedJson, site.id)),
      });
    }
  }, 60_000);

  it("anchors each rigid tileset at its model's middle, and passes checkRigidTransform", () => {
    for (const site of PORTFOLIO) {
      const { rigidJson, rigid } = loaded.get(site.id)!;
      expect(Array.from(rigid.rigid!.anchor), site.id).toEqual(
        modelAnchor(site),
      );
      expect(rigidJson.root.transform, site.id).toEqual(
        Array.from(rigid.rigid!.matrix),
      );
      expect(() =>
        checkRigidTransform(rigid, Float64Array.from(rigidJson.root.transform)),
      ).not.toThrow();
    }
  });

  for (const site of LADDER) {
    it(`${site.id}: both tilesets are partners, vertex for vertex, and the leaves round-trip within 1e-4 m`, () => {
      const { rigidJson, reprojectedJson, rigid, reprojected, frame } =
        loaded.get(site.id)!;
      const rigidDir = `portfolio-${site.id}-rigid`;
      const reprojectedDir = `portfolio-${site.id}-reprojected`;
      expect(shape(reprojectedJson.root)).toEqual(shape(rigidJson.root));
      expect(rigidJson.geometricError).toBe(reprojectedJson.geometricError);
      const a = [...walk(rigidJson.root, tree(rigidJson))];
      const b = [...walk(reprojectedJson.root, tree(reprojectedJson))];
      expect(b).toHaveLength(a.length);
      const mpu = frame.units.metersPerUnit;
      const mph = frame.metersPerHeightUnit;
      let leaves = 0;
      let leafVertices = 0;
      let checked = 0;
      let worstPartner = 0;
      let worstRigid = 0;
      let worstReprojected = 0;
      for (let t = 0; t < a.length; t++) {
        const r = a[t]!;
        const q = b[t]!;
        expect(q.json.content?.uri).toBe(r.json.content?.uri);
        // One error once the engine scales the rigid one by its transform.
        expect(
          Math.abs(r.tile.geometricError - q.tile.geometricError) /
            Math.max(q.tile.geometricError, 1e-12),
        ).toBeLessThan(1e-12);
        if (!r.json.content) {
          continue;
        }
        const uri = r.json.content.uri;
        const [ra, qa] = [read(rigidDir, uri), read(reprojectedDir, uri)];
        for (const semantic of ["indices", "_FEATURE_ID_0", "COLOR_0"]) {
          expect(
            Array.from(accessorOf(qa, semantic)),
            `${uri} ${semantic}`,
          ).toEqual(Array.from(accessorOf(ra, semantic)));
        }
        const pa = positions(ra);
        const pb = positions(qa);
        expect(pb.length, uri).toBe(pa.length);
        const centre = [0, 1, 2].map((k) =>
          r.chain.slice(1).reduce((sum, m) => sum + m[12 + k]!, 0),
        );
        const leaf = !r.json.children;
        leaves += leaf ? 1 : 0;
        leafVertices += leaf ? pa.length / 3 : 0;
        // Every vertex of a leaf; every 7th of a parent.
        const step = leaf ? 1 : 7;
        for (let i = 0; i < pa.length / 3; i += step) {
          const local = zUp(pa, i);
          const design = local.map((v, k) => centre[k]! + v);
          const gap = (got: ArrayLike<number>) =>
            Math.hypot(
              (got[0]! - design[0]!) * mpu,
              (got[1]! - design[1]!) * mpu,
              (got[2]! - design[2]!) * mph,
            );
          const partner = gap(
            reprojected.designOf(apply(q.tile.transform, zUp(pb, i))),
          );
          if (leaf) {
            worstReprojected = Math.max(worstReprojected, partner);
            worstRigid = Math.max(
              worstRigid,
              gap(rigid.designOf(apply(r.tile.transform, local))),
            );
            checked++;
          } else {
            // A parent's float32 offsets span its whole box: a millimetre.
            worstPartner = Math.max(worstPartner, partner);
          }
        }
      }
      expect(leaves).toBeGreaterThan(0);
      expect(checked).toBe(leafVertices);
      expect(checked).toBeGreaterThan(100);
      expect(worstRigid).toBeLessThan(1e-4);
      expect(worstReprojected).toBeLessThan(1e-4);
      expect(worstPartner).toBeLessThan(5e-3);
    }, 120_000);

    it(`${site.id}: every reprojected tile's longest edge sags (d²/8R) at most the tile's error, at every level`, () => {
      const { reprojectedJson } = loaded.get(site.id)!;
      const dir = `portfolio-${site.id}-reprojected`;
      let leaves = 0;
      let worst = 0;
      for (const { json } of walk(
        reprojectedJson.root,
        tree(reprojectedJson),
      )) {
        if (!json.content) {
          continue;
        }
        leaves += json.children ? 0 : 1;
        const bytes = read(dir, json.content.uri);
        const p = positions(bytes);
        const index = accessorOf(bytes, "indices");
        let longest = 0;
        const edge = (i: number, j: number) =>
          Math.hypot(
            p[3 * i]! - p[3 * j]!,
            p[3 * i + 1]! - p[3 * j + 1]!,
            p[3 * i + 2]! - p[3 * j + 2]!,
          );
        for (let t = 0; t < index.length; t += 3) {
          const [i, j, k] = [index[t]!, index[t + 1]!, index[t + 2]!];
          longest = Math.max(longest, edge(i, j), edge(j, k), edge(k, i));
        }
        // Metres: the reprojected tiles are Earth-fixed metres.
        const sag = (longest * longest) / (8 * MIN_RADIUS);
        expect(sag, json.content.uri).toBeLessThanOrEqual(json.geometricError);
        worst = Math.max(worst, sag / json.geometricError);
      }
      expect(leaves).toBeGreaterThan(0);
      expect(worst).toBeGreaterThan(0);
    }, 120_000);

    it(`${site.id}: each coarse tile is within its error of the leaves, both ways, and keeps something standing where each solid feature stood`, () => {
      const { rigidJson, frame } = loaded.get(site.id)!;
      const dir = `portfolio-${site.id}-rigid`;
      const mpu = frame.units.metersPerUnit;
      // Every content tile, rigid, in design coordinates.
      type Read = {
        id: string;
        level: number;
        error: number;
        leaves: Read[];
        tris: Float64Array;
        names: string[];
      };
      const all: Read[] = [];
      const visit = (json: Json, centre: number[]): Read[] => {
        const here = json.transform
          ? centre.map((v, k) => v + json.transform[12 + k])
          : centre;
        const below: Read[] = (json.children ?? []).flatMap((c: Json) =>
          visit(c, here),
        );
        if (!json.content) {
          return below;
        }
        const bytes = read(dir, json.content.uri);
        const p = positions(bytes);
        const index = accessorOf(bytes, "indices");
        const ids = accessorOf(bytes, "_FEATURE_ID_0");
        const names = featureNames(bytes);
        const tris = new Float64Array(3 * index.length);
        const triNames: string[] = [];
        for (let t = 0; t < index.length; t += 3) {
          for (let k = 0; k < 3; k++) {
            const local = zUp(p, index[t + k]!);
            for (let a = 0; a < 3; a++) {
              tris[3 * (t + k) + a] = here[a]! + local[a]!;
            }
          }
          triNames.push(names[ids[index[t]!]!]!);
        }
        const id = json.content.uri.replace(/^tiles\/|\.glb$/g, "");
        const leaf = !json.children;
        const tile: Read = {
          id,
          level: Number(id.split("-")[0]),
          error: json.geometricError,
          leaves: leaf ? [] : below.filter((r) => r.leaves.length === 0),
          tris,
          names: triNames,
        };
        all.push(tile);
        return [...below, tile];
      };
      visit(rigidJson.root.children[0], [0, 0, 0]);
      const leaves = all.filter((r) => r.level === 0);
      const coarse = all.filter((r) => r.level > 0);
      expect(leaves.length).toBeGreaterThan(0);
      if (coarse.length === 0) {
        return;
      }

      // Detail (paint, wires, the ground) may go; the rest is solid.
      const extent = new Map<
        string,
        { lo: number; hi: number; wide: number }
      >();
      for (const leaf of leaves) {
        eachTriangle(leaf.tris, (t, i) => {
          const name = leaf.names[i]!;
          const e = extent.get(name) ?? {
            lo: Infinity,
            hi: -Infinity,
            wide: 0,
          };
          e.lo = Math.min(e.lo, t[2]!, t[5]!, t[8]!);
          e.hi = Math.max(e.hi, t[2]!, t[5]!, t[8]!);
          e.wide = Math.max(e.wide, width(t));
          extent.set(name, e);
        });
      }
      const detail = new Set(
        [...extent]
          .filter(([, e]) => (e.hi - e.lo) * mpu <= 0.5 || e.wide * mpu <= 0.1)
          .map(([name]) => name),
      );

      const full = new Grid(leaves, 0);
      let groups = 0;
      let worst = 0;
      for (const level of new Set(coarse.map((r) => r.level))) {
        const tiles = coarse.filter((r) => r.level === level);
        const cell = Math.max(...tiles.map((r) => r.error));
        const shown = new Grid(tiles, cell);
        const detailGrid = new Grid(leaves, cell, full);
        for (const tile of tiles) {
          const e = tile.error;
          // What is drawn, near the full detail; the full detail, near
          // what this level draws. Samples at the level's largest error
          // apart: any sample's distance is a lower bound on the deviation,
          // so each must be within the tile's own (which may be 2 mm, where
          // the tile draws only full detail).
          const far = (from: Float64Array, to: Grid) => {
            let found = 0;
            eachTriangle(from, (t) =>
              samples(t, cell, (x, y, z) => {
                const d = to.distance(x, y, z, e);
                found = Math.max(found, d);
              }),
            );
            return found;
          };
          const back = far(tile.tris, detailGrid);
          const there = Math.max(...tile.leaves.map((l) => far(l.tris, shown)));
          expect(back, `${tile.id} drawn to full detail`).toBeLessThanOrEqual(
            e,
          );
          expect(there, `${tile.id} full detail to drawn`).toBeLessThanOrEqual(
            e,
          );
          worst = Math.max(worst, Math.max(back, there) / e);

          // Every leaf's solid feature keeps something standing in its region.
          const standing: number[][] = [];
          eachTriangle(tile.tris, (t, i) => {
            if (!detail.has(tile.names[i]!)) {
              standing.push(Array.from(t));
            }
          });
          for (const leaf of tile.leaves) {
            const regions = new Map<string, number[]>();
            eachTriangle(leaf.tris, (t, i) => {
              const name = leaf.names[i]!;
              if (detail.has(name)) {
                return;
              }
              const r = regions.get(name) ?? [
                Infinity,
                Infinity,
                Infinity,
                -Infinity,
                -Infinity,
                -Infinity,
              ];
              for (let k = 0; k < 9; k += 3) {
                r[0] = Math.min(r[0]!, t[k]!);
                r[1] = Math.min(r[1]!, t[k + 1]!);
                r[2] = Math.min(r[2]!, t[k + 2]!);
                r[3] = Math.max(r[3]!, t[k]!);
                r[4] = Math.max(r[4]!, t[k + 1]!);
                r[5] = Math.max(r[5]!, t[k + 2]!);
              }
              regions.set(name, r);
            });
            for (const [name, r] of regions) {
              groups++;
              const rise = r[2]! + 0.25 * (r[5]! - r[2]!);
              const slack = e / 2;
              const found = standing.some(
                (t) =>
                  [0, 3, 6].some((k) => t[k + 2]! >= rise) &&
                  Math.min(t[0]!, t[3]!, t[6]!) <= r[3]! + slack &&
                  Math.max(t[0]!, t[3]!, t[6]!) >= r[0]! - slack &&
                  Math.min(t[1]!, t[4]!, t[7]!) <= r[4]! + slack &&
                  Math.max(t[1]!, t[4]!, t[7]!) >= r[1]! - slack,
              );
              expect(found, `${tile.id}: ${name} (leaf ${leaf.id})`).toBe(true);
            }
          }
        }
      }
      expect(groups).toBeGreaterThan(0);
      expect(worst).toBeGreaterThan(0);
    }, 120_000);
  }

  it("answers.sites: the ladder's extents, three exact points each, and trees of 3 levels or more over 1 km", () => {
    expect(Object.keys(answers.sites).sort()).toEqual(
      PORTFOLIO.map((s) => s.id).sort(),
    );
    for (const site of LADDER) {
      const a = answers.sites[site.id];
      const { frame, rigid, rigidJson } = loaded.get(site.id)!;
      const metres = LADDER_EXTENTS[site.id]!;
      expect(a.kind).toBe(site.model.kind);
      expect(Math.abs(a.extent - metres) / metres, site.id).toBeLessThan(0.1);
      expect(a.anchor).toEqual(modelAnchor(site));
      expect(a.points.map((p: Json) => p.label).slice(0, 2)).toEqual([
        "Anchor",
        "Farthest point",
      ]);
      for (const p of a.points) {
        expect(Array.from(frame.toBodyFixed(p.design))).toEqual(p.bodyFixed);
        expect(Array.from(rigid.displayed(p.design))).toEqual(p.rigidDisplayed);
        expect(rigid.displayError(p.design)).toBe(p.displayError);
      }
      expect(a.points[0].displayError).toBeLessThan(1e-6);
      expect(a.displayError).toBe(a.points[1].displayError);
      expect(a.distanceFromAnchor).toBe(a.points[1].distanceFromAnchor);
      // The farthest point is about half the extent from the middle.
      expect(Math.abs((2 * a.distanceFromAnchor) / a.extent - 1)).toBeLessThan(
        0.1,
      );
      // The tree as written: its depth, counting the content tiles' levels.
      const depth = (tile: Json): number =>
        1 + Math.max(0, ...(tile.children ?? []).map(depth));
      expect(depth(rigidJson.root.children[0])).toBe(a.tiles.levels);
      if (a.extent > 1_000) {
        expect(a.tiles.levels, site.id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("the rigid error at each model's edge is d²/2R with the scale and geoid terms rigid ignores, d²/2R alone where it dominates, and grows down the ladder", () => {
    let dominated = 0;
    let previous = 0;
    for (const site of LADDER) {
      const a = answers.sites[site.id];
      const { frame } = loaded.get(site.id)!;
      const terms = rigidErrorTerms(frame, a.anchor, a.points[1].design);
      expect(terms).toEqual(a.terms);
      expect(a.combinedFactor).toBe(
        gridFactors(frame, a.anchor).combinedFactor,
      );
      // The scale term is the combined factor's, at the edge's distance.
      expect(terms.scale).toBeCloseTo(
        a.distanceFromAnchor * Math.abs(1 - 1 / a.combinedFactor),
        12,
      );
      const e = a.displayError;
      const predicted = Math.hypot(terms.curvature - terms.geoid, terms.scale);
      expect(Math.abs(e - predicted) / e, site.id).toBeLessThan(0.1);
      if (terms.curvature >= 3 * Math.max(terms.scale, Math.abs(terms.geoid))) {
        expect(Math.abs(e - terms.curvature) / e, site.id).toBeLessThan(0.1);
        dominated++;
      }
      // Bigger models, bigger rigid errors.
      expect(e, site.id).toBeGreaterThan(previous);
      previous = e;
    }
    expect(dominated).toBeGreaterThanOrEqual(2);
    // The corridor tops the ladder: its rigid error at its far end.
    const corridor = Math.max(
      ...answers.points.map((p: Json) => p.displayError),
    );
    expect(corridor).toBeGreaterThan(previous);
  });
});
