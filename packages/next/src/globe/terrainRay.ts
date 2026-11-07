/**
 * Exact ray queries against the drawn terrain (plan §13.10, "Height and
 * pick queries"): each loaded terrain tile keeps its drawn triangles on the
 * CPU (`TerrainHeights`), so a segment can be traced through them exactly,
 * synchronously, in float64. No sampling step: a feature one cell wide is
 * caught wherever it sits, and the earth's curvature comes with the
 * Earth-fixed triangles.
 *
 * The traversal goes patch by patch along the segment, asking the target
 * what is drawn at each place (`TerrainRayTarget.patchAt`). Inside a drawn
 * tile it steps cell by cell through a uniform grid over the tile's (u, v)
 * (a DDA). A cell's column is bounded by two meridian half-planes and two
 * cones of constant geodetic latitude, so its entry and exit along the
 * segment are exact roots, not footprint samples. In each cell it
 * intersects the segment with the cell's triangles (Möller–Trumbore,
 * double-sided) and measures the clearance above them.
 *
 * Clearance at a point is its height above the drawn surface along its
 * geodetic normal: the plane of the triangle containing its footprint in
 * (u, v), as `TerrainSource.surfaceHeight` (1.x `Globe.getHeight`) defines
 * the drawn surface's height. Along the segment it is near linear within a
 * triangle, so its minimum lies where the footprint crosses a triangle edge
 * (or at a patch's end); those crossings are found on the footprint
 * linearized across the cell and the lowest is then polished on the exact
 * clearance.
 *
 * 3D Tiles (buildings, BIM) are not here: they keep no CPU triangles, so
 * their rays go through §13.10's batched GPU API (`World.castRays`). See
 * the extension point in `terrainLineOfSight`.
 */
import { Ellipsoid, type Cartographic } from "../math/ellipsoid.ts";
import type { Rectangle, TerrainHeights } from "./quantizedMesh.ts";

/** A drawn terrain tile as a ray reads it. Nothing in it is written. */
export interface TerrainRayTile {
  /** The tile's extent, radians: what its quantized u and v span. */
  readonly rectangle: Rectangle;
  /** Its drawn triangles (no skirts), quantized as decoded. */
  readonly heights: TerrainHeights;
  /** Quadtree level. */
  readonly level: number;
  /**
   * Its level's geometric error, m: how far its drawn surface may lie from
   * the source's heights.
   */
  readonly geometricError: number;
}

/** What is drawn at a place, and the extent over which that answer holds. */
export interface TerrainRayPatch {
  /** Contains the point asked about; the answer holds over all of it. */
  readonly rectangle: Rectangle;
  /** The tile drawn there; undefined where the terrain is unknown. */
  readonly tile?: TerrainRayTile;
  /**
   * Why it is unknown: nothing is drawn there ("not drawn": not loaded, or
   * outside the views asked about), or only a coarser tile standing in
   * while finer ones load ("not refined").
   */
  readonly unknown?: "not drawn" | "not refined";
}

/**
 * Loaded terrain, read-only, as the screen draws it
 * (`TerrainSource.rayTarget`, `Tileset3D.terrainRayTarget`).
 */
export interface TerrainRayTarget {
  /** The ellipsoid the tiles' heights are geodetic over (of revolution). */
  readonly ellipsoid: Ellipsoid;
  /** What is drawn at a longitude and latitude, radians. */
  patchAt(longitude: number, latitude: number): TerrainRayPatch;
}

export interface TerrainRayOptions {
  /**
   * Hits this close to either end (m) are the observer's own ground, not a
   * block (default 1 mm).
   */
  endTolerance?: number;
}

export interface TerrainRayResult {
  /** The segment's length, m. */
  length: number;
  /**
   * The nearest point (fraction `t` of the way, Earth-fixed `point`) where
   * the segment meets a drawn triangle. Through a crack between tiles
   * (which skirts cover when drawn) it is the first point found below the
   * surface.
   */
  hit?: { t: number; point: Float64Array; level: number };
  /** The lowest clearance over the known spans, m, and where. */
  minClearance?: { meters: number; t: number; level: number };
  /** Lengths, m, over which the terrain is unknown, by reason. */
  unknown: { notDrawn: number; notRefined: number };
  /** Levels the known spans crossed, and the largest geometric error. */
  known?: { minLevel: number; maxLevel: number; geometricError: number };
}

/** Quantized coordinate range. */
const Q = 32767;
/** Probe this far past a boundary to ask what lies beyond, m. */
const PROBE = 1e-6;
/** Accept a cell exit this far behind the current point, m (corners). */
const SLACK = 1e-4;
/** A point this far below the surface counts as below, m. */
const BELOW = 1e-6;
/** Barycentric tolerance: edges shared by two triangles let nothing through. */
const EDGE = 1e-12;
const MAX_PATCHES = 100_000;
const MAX_CELLS = 2_000_000;

/** A tile's triangles ready for rays: Earth-fixed, with a (u, v) grid. */
interface RayMesh {
  rectangle: Rectangle;
  ellipsoid: Ellipsoid;
  heights: TerrainHeights;
  positions: Float64Array;
  /** Per triangle, e1 × e2 (not normalized). */
  normals: Float64Array;
  /** Cells per side. */
  g: number;
  /** Triangles per cell (CSR). */
  offsets: Uint32Array;
  items: Uint32Array;
  /** Last tile span that tested each triangle. */
  stamp: Uint32Array;
  /**
   * Per triangle, its (u, v) box grown by the bow of its 3D edges'
   * footprints: u min, u max, v min, v max. Its column lies inside.
   */
  boxes: Float64Array;
  /** The tile's width at the equator and height, m (radians × a). */
  widthMeters: number;
  heightMeters: number;
  /** Meridians and latitude cones of the grid lines (g + 1 each). */
  lonSin: Float64Array;
  lonCos: Float64Array;
  latSin: Float64Array;
  latCos: Float64Array;
  latZ0: Float64Array;
}

const meshes = new WeakMap<TerrainHeights, RayMesh>();
/** Tile spans traced so far: stamps which triangles a span has tested. */
let segment = 0;

/** Where the ray is: origin, direction (to − from), and its ellipsoid. */
interface Ray {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
  e2: number;
  a: number;
}

/**
 * Traces the segment `from`–`to` (Earth-fixed m) through the drawn
 * terrain. Undefined when an endpoint is not finite.
 */
export function castTerrainRay(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  target: TerrainRayTarget,
  options: TerrainRayOptions = {},
): TerrainRayResult | undefined {
  const ellipsoid = target.ellipsoid;
  const radii = ellipsoid.radii;
  if (radii[0] !== radii[1]) {
    throw new Error("castTerrainRay: the ellipsoid must be of revolution");
  }
  const a = radii[0]!;
  const ray: Ray = {
    ox: from[0]!,
    oy: from[1]!,
    oz: from[2]!,
    dx: to[0]! - from[0]!,
    dy: to[1]! - from[1]!,
    dz: to[2]! - from[2]!,
    e2: 1 - (radii[2]! * radii[2]!) / (a * a),
    a,
  };
  const length = Math.hypot(ray.dx, ray.dy, ray.dz);
  if (
    !Number.isFinite(length) ||
    !Number.isFinite(ray.ox) ||
    !Number.isFinite(ray.oy) ||
    !Number.isFinite(ray.oz)
  ) {
    return undefined;
  }
  const result: TerrainRayResult = {
    length,
    unknown: { notDrawn: 0, notRefined: 0 },
  };
  const perMeter = length > 0 ? 1 / length : 0;
  const probe = PROBE * perMeter;
  const slack = SLACK * perMeter;
  const end = (options.endTolerance ?? 1e-3) * perMeter;
  const tLo = length > 0 ? end : Infinity;
  const tHi = 1 - end;

  // Scratch for footprints.
  const point = new Float64Array(3);
  const carto: Cartographic = { longitude: 0, latitude: 0, height: 0 };
  const footprint = (t: number): Cartographic | undefined => {
    point[0] = ray.ox + ray.dx * t;
    point[1] = ray.oy + ray.dy * t;
    point[2] = ray.oz + ray.dz * t;
    return ellipsoid.cartesianToCartographic(point, carto);
  };

  // Nearest hit and lowest clearance so far.
  let hitT = Infinity;
  let hitLevel = 0;
  let belowT = Infinity;
  let belowLevel = 0;
  let best = Infinity;
  let bestT = 0;
  let bestLevel = 0;
  let bestMesh: RayMesh | undefined;
  let bestSpan = 0;
  let bestLo = 0;
  let bestHi = 0;
  let cells = 0;

  // A cell's footprint ends: (u, v) and the geodetic normal at each.
  const uv0 = new Float64Array(2);
  const uv1 = new Float64Array(2);
  const n0 = new Float64Array(3);
  const n1 = new Float64Array(3);
  const n = new Float64Array(3);

  /** (u, v) and normal at `t` on `mesh`; false off the ellipsoid's reach. */
  const sample = (
    mesh: RayMesh,
    t: number,
    uv: Float64Array,
    normal: Float64Array,
  ): boolean => {
    const c = footprint(t);
    if (!c) {
      return false;
    }
    const r = mesh.rectangle;
    const lon = unwrap(c.longitude, r);
    uv[0] = ((lon - r.west) / (r.east - r.west)) * Q;
    uv[1] = ((c.latitude - r.south) / (r.north - r.south)) * Q;
    const cosLat = Math.cos(c.latitude);
    normal[0] = cosLat * Math.cos(c.longitude);
    normal[1] = cosLat * Math.sin(c.longitude);
    normal[2] = Math.sin(c.latitude);
    return true;
  };

  /** Clearance at `t` over triangle `k`, with geodetic normal `normal`. */
  const clearance = (
    mesh: RayMesh,
    k: number,
    t: number,
    normal: Float64Array,
  ): number => {
    const N = mesh.normals;
    const nx = N[k * 3]!;
    const ny = N[k * 3 + 1]!;
    const nz = N[k * 3 + 2]!;
    const denominator = normal[0]! * nx + normal[1]! * ny + normal[2]! * nz;
    if (denominator * denominator <= 1e-24 * (nx * nx + ny * ny + nz * nz)) {
      return Infinity; // a vertical triangle: no height above it
    }
    const v = mesh.heights.triangles[k * 3]! * 3;
    const p = mesh.positions;
    return (
      ((ray.ox + ray.dx * t - p[v]!) * nx +
        (ray.oy + ray.dy * t - p[v + 1]!) * ny +
        (ray.oz + ray.dz * t - p[v + 2]!) * nz) /
      denominator
    );
  };

  /** Hits and clearance in cell `c` of `mesh` over [t0, t1]. */
  const cell = (
    mesh: RayMesh,
    level: number,
    c: number,
    t0: number,
    t1: number,
    lo: number,
    hi: number,
  ): void => {
    const { items, offsets, stamp, positions: p } = mesh;
    const hitLo = Math.max(tLo, lo);
    const hitHi = Math.min(tHi, hi);
    const tri = mesh.heights.triangles;
    const { u, v } = mesh.heights;
    const du = uv1[0]! - uv0[0]!;
    const dv = uv1[1]! - uv0[1]!;
    const span = (t1 - t0) * length;
    // The footprint over [t0, t1] stays within its chord's box grown by its
    // bow, about span²/(8R)·(1 + |tan φ|) (four times that, for room).
    const cosLat = Math.max(Math.sqrt(n0[0]! * n0[0]! + n0[1]! * n0[1]!), 1e-9);
    const tan = Math.abs(n0[2]!) / cosLat;
    const bow = (span * span * (1 + tan)) / (2 * ray.a) + 1e-6;
    const marginU = (bow / (mesh.widthMeters * cosLat)) * Q + 0.01;
    const marginV = (bow / mesh.heightMeters) * Q + 0.01;
    const uLo = Math.min(uv0[0]!, uv1[0]!) - marginU;
    const uHi = Math.max(uv0[0]!, uv1[0]!) + marginU;
    const vLo = Math.min(uv0[1]!, uv1[1]!) - marginV;
    const vHi = Math.max(uv0[1]!, uv1[1]!) + marginV;
    const boxes = mesh.boxes;
    for (let m = offsets[c]!; m < offsets[c + 1]!; m++) {
      const k = items[m]!;
      if (
        boxes[k * 4]! > uHi ||
        boxes[k * 4 + 1]! < uLo ||
        boxes[k * 4 + 2]! > vHi ||
        boxes[k * 4 + 3]! < vLo
      ) {
        continue; // the footprint never passes over it here
      }
      const i0 = tri[k * 3]!;
      const i1 = tri[k * 3 + 1]!;
      const i2 = tri[k * 3 + 2]!;
      if (stamp[k] !== segment) {
        stamp[k] = segment;
        // Only this tile's own span: elsewhere another tile is drawn.
        const t = intersect(ray, p, i0 * 3, i1 * 3, i2 * 3);
        if (t > hitLo && t <= hitHi && t < hitT) {
          hitT = t;
          hitLevel = level;
        }
      }
      // The footprint's piece inside the triangle, on [t0, t1] linearized.
      const ua = u[i0]!,
        va = v[i0]!,
        ub = u[i1]!,
        vb = v[i1]!,
        uc = u[i2]!,
        vc = v[i2]!;
      const area = (ub - ua) * (vc - va) - (vb - va) * (uc - ua);
      if (area === 0) {
        continue;
      }
      const sign = area > 0 ? 1 : -1;
      let s0 = 0;
      let s1 = 1;
      for (let e = 0; e < 3 && s0 <= s1; e++) {
        const px = e === 0 ? ua : e === 1 ? ub : uc;
        const py = e === 0 ? va : e === 1 ? vb : vc;
        const qx = e === 0 ? ub : e === 1 ? uc : ua;
        const qy = e === 0 ? vb : e === 1 ? vc : va;
        const ex = qx - px;
        const ey = qy - py;
        const f0 = sign * (ex * (uv0[1]! - py) - ey * (uv0[0]! - px));
        const f1 = sign * (ex * dv - ey * du);
        const tolerance = 1e-9 * (Math.abs(ex) + Math.abs(ey));
        if (Math.abs(f1) < 1e-300) {
          if (f0 < -tolerance) {
            s1 = -1;
          }
        } else if (f1 > 0) {
          s0 = Math.max(s0, (-tolerance - f0) / f1);
        } else {
          s1 = Math.min(s1, (-tolerance - f0) / f1);
        }
      }
      if (s0 > s1) {
        continue;
      }
      for (let end = 0; end < (s0 === s1 ? 1 : 2); end++) {
        const s = end === 0 ? s0 : s1;
        const t = t0 + (t1 - t0) * s;
        n[0] = n0[0]! + (n1[0]! - n0[0]!) * s;
        n[1] = n0[1]! + (n1[1]! - n0[1]!) * s;
        n[2] = n0[2]! + (n1[2]! - n0[2]!) * s;
        const l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        n[0] /= l;
        n[1] /= l;
        n[2] /= l;
        const height = clearance(mesh, k, t, n);
        if (height < best) {
          best = height;
          bestT = t;
          bestLevel = level;
          bestMesh = mesh;
          bestSpan = span;
          bestLo = lo;
          bestHi = hi;
        }
        if (
          height < -BELOW &&
          t > tLo &&
          t < tHi &&
          t < belowT &&
          // Confirmed on the exact footprint: the linearized one can stray
          // past the triangle's edge by about span²/(8R).
          exactClearance(mesh, ray, t, scratchCarto) < -BELOW
        ) {
          belowT = t;
          belowLevel = level;
        }
      }
    }
  };

  // DDA state carried across patches within one tile.
  let carryMesh: RayMesh | undefined;
  let carryT = -1;
  let carryI = 0;
  let carryJ = 0;

  /** Steps through `tile`'s grid over [ta, tb]. False if it lost the ray. */
  const traverse = (tile: TerrainRayTile, ta: number, tb: number): boolean => {
    const mesh = meshFor(tile, ellipsoid);
    const { g } = mesh;
    segment = (segment + 1) >>> 0;
    let i: number;
    let j: number;
    if (carryMesh === mesh && carryT === ta) {
      i = carryI;
      j = carryJ;
    } else {
      if (!sample(mesh, ta + Math.min(probe, (tb - ta) / 2), uv0, n0)) {
        return false;
      }
      i = clampCell(Math.floor((uv0[0]! / Q) * g), g);
      j = clampCell(Math.floor((uv0[1]! / Q) * g), g);
    }
    if (!sample(mesh, ta, uv0, n0)) {
      return false;
    }
    let t = ta;
    for (;;) {
      if (++cells > MAX_CELLS) {
        return false;
      }
      const exit = cellExit(ray, mesh, i, j, t - slack);
      const t1 = Math.max(t, Math.min(exit.t, tb));
      if (!sample(mesh, t1, uv1, n1)) {
        return false;
      }
      cell(mesh, tile.level, j * g + i, t, t1, ta, tb);
      uv0.set(uv1);
      n0.set(n1);
      t = t1;
      if (exit.t >= tb) {
        break;
      }
      const ni = i + (exit.side === 0 ? -1 : exit.side === 1 ? 1 : 0);
      const nj = j + (exit.side === 2 ? -1 : exit.side === 3 ? 1 : 0);
      if (ni < 0 || ni >= g || nj < 0 || nj >= g) {
        // Left the grid before the patch ends: only rounding can do that.
        // The rest of the span stays in this edge cell.
        if (!sample(mesh, tb, uv1, n1)) {
          return false;
        }
        cell(mesh, tile.level, j * g + i, t, tb, ta, tb);
        break;
      }
      i = ni;
      j = nj;
    }
    carryMesh = mesh;
    carryT = tb;
    carryI = i;
    carryJ = j;
    return true;
  };

  let known: TerrainRayResult["known"];
  let cur = 0;
  for (let patches = 0; cur < 1; patches++) {
    const at = cur + Math.min(probe, (1 - cur) / 2);
    const c = patches < MAX_PATCHES ? footprint(at) : undefined;
    if (!c) {
      // Near the ellipsoid's center, or too many patches: unknown from here.
      result.unknown.notDrawn += (1 - cur) * length;
      break;
    }
    const patch = target.patchAt(c.longitude, c.latitude);
    let exit = rectangleExit(ray, patch.rectangle, cur).t;
    exit = Math.min(1, Math.max(exit, at));
    if (patch.tile && traverse(patch.tile, cur, exit)) {
      const tile = patch.tile;
      known = known
        ? {
            minLevel: Math.min(known.minLevel, tile.level),
            maxLevel: Math.max(known.maxLevel, tile.level),
            geometricError: Math.max(known.geometricError, tile.geometricError),
          }
        : {
            minLevel: tile.level,
            maxLevel: tile.level,
            geometricError: tile.geometricError,
          };
    } else if (patch.unknown === "not refined") {
      result.unknown.notRefined += (exit - cur) * length;
    } else {
      result.unknown.notDrawn += (exit - cur) * length;
    }
    cur = exit;
  }

  if (bestMesh && length > 0) {
    // The lowest clearance on the exact footprint: the crossings were found
    // on it linearized across a cell, off by about span²/(8R), so the true
    // minimum is polished out of a window around it.
    const window = Math.max(1e-3, (2 * bestSpan * bestSpan) / ray.a) * perMeter;
    const mesh = bestMesh;
    const there = exactClearance(mesh, ray, bestT, carto);
    const polished = polish(
      Math.max(bestLo, bestT - window),
      Math.min(bestHi, bestT + window),
      (t) => exactClearance(mesh, ray, t, carto),
    );
    if (polished.meters < there) {
      best = polished.meters;
      bestT = polished.t;
    } else if (there < Infinity) {
      best = there;
    }
  }
  if (best < Infinity) {
    result.minClearance = { meters: best, t: bestT, level: bestLevel };
  }
  const blockedT = Math.min(hitT, belowT);
  if (blockedT < Infinity) {
    result.hit = {
      t: blockedT,
      point: Float64Array.of(
        ray.ox + ray.dx * blockedT,
        ray.oy + ray.dy * blockedT,
        ray.oz + ray.dz * blockedT,
      ),
      level: hitT <= belowT ? hitLevel : belowLevel,
    };
  }
  if (known) {
    result.known = known;
  }
  return result;
}

function clampCell(i: number, g: number): number {
  return Math.min(g - 1, Math.max(0, i));
}

/**
 * Möller–Trumbore, double-sided, in float64: the ray parameter where it
 * meets the triangle (vertices at offsets `a`, `b`, `c` in `p`), or NaN.
 */
function intersect(
  ray: Ray,
  p: Float64Array,
  a: number,
  b: number,
  c: number,
): number {
  const ax = p[a]!,
    ay = p[a + 1]!,
    az = p[a + 2]!;
  const e1x = p[b]! - ax,
    e1y = p[b + 1]! - ay,
    e1z = p[b + 2]! - az;
  const e2x = p[c]! - ax,
    e2y = p[c + 1]! - ay,
    e2z = p[c + 2]! - az;
  const { dx, dy, dz } = ray;
  const px = dy * e2z - dz * e2y;
  const py = dz * e2x - dx * e2z;
  const pz = dx * e2y - dy * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  // Parallel when det is tiny against |d|·|e1|·|e2| (compared squared).
  const scale2 =
    (dx * dx + dy * dy + dz * dz) *
    (e1x * e1x + e1y * e1y + e1z * e1z) *
    (e2x * e2x + e2y * e2y + e2z * e2z);
  if (det * det <= 1e-28 * scale2) {
    return NaN; // parallel (or a point ray)
  }
  const inverse = 1 / det;
  const sx = ray.ox - ax,
    sy = ray.oy - ay,
    sz = ray.oz - az;
  const bu = (sx * px + sy * py + sz * pz) * inverse;
  if (bu < -EDGE || bu > 1 + EDGE) {
    return NaN;
  }
  const qx = sy * e1z - sz * e1y;
  const qy = sz * e1x - sx * e1z;
  const qz = sx * e1y - sy * e1x;
  const bv = (dx * qx + dy * qy + dz * qz) * inverse;
  if (bv < -EDGE || bu + bv > 1 + EDGE) {
    return NaN;
  }
  return (e2x * qx + e2y * qy + e2z * qz) * inverse;
}

/** Exact clearance at `t`: the triangle containing its footprint's (u, v). */
function exactClearance(
  mesh: RayMesh,
  ray: Ray,
  t: number,
  carto: Cartographic,
): number {
  const px = ray.ox + ray.dx * t;
  const py = ray.oy + ray.dy * t;
  const pz = ray.oz + ray.dz * t;
  scratchPoint[0] = px;
  scratchPoint[1] = py;
  scratchPoint[2] = pz;
  const c = mesh.ellipsoid.cartesianToCartographic(scratchPoint, carto);
  if (!c) {
    return Infinity;
  }
  const r = mesh.rectangle;
  const lon = unwrap(c.longitude, r);
  const u = ((lon - r.west) / (r.east - r.west)) * Q;
  const v = ((c.latitude - r.south) / (r.north - r.south)) * Q;
  const { g, items, offsets } = mesh;
  const index =
    clampCell(Math.floor((v / Q) * g), g) * g +
    clampCell(Math.floor((u / Q) * g), g);
  const { u: us, v: vs, triangles } = mesh.heights;
  let found = -1;
  let score = -Infinity;
  for (let m = offsets[index]!; m < offsets[index + 1]!; m++) {
    const k = items[m]!;
    const i0 = triangles[k * 3]!,
      i1 = triangles[k * 3 + 1]!,
      i2 = triangles[k * 3 + 2]!;
    // 1.x Intersections2D.computeBarycentricCoordinates, as
    // `containingTriangle`; the most inside wins on shared edges.
    const x1mx3 = us[i0]! - us[i2]!;
    const x3mx2 = us[i2]! - us[i1]!;
    const y2my3 = vs[i1]! - vs[i2]!;
    const y1my3 = vs[i0]! - vs[i2]!;
    const d = y2my3 * x1mx3 + x3mx2 * y1my3;
    if (d === 0) {
      continue;
    }
    const l1 = (y2my3 * (u - us[i2]!) + x3mx2 * (v - vs[i2]!)) / d;
    const l2 = (-y1my3 * (u - us[i2]!) + x1mx3 * (v - vs[i2]!)) / d;
    const s = Math.min(l1, l2, 1 - l1 - l2);
    if (s > score) {
      score = s;
      found = k;
    }
  }
  if (found < 0 || score < -1e-9) {
    return Infinity;
  }
  const cosLat = Math.cos(c.latitude);
  const nx = cosLat * Math.cos(c.longitude);
  const ny = cosLat * Math.sin(c.longitude);
  const nz = Math.sin(c.latitude);
  const N = mesh.normals;
  const Nx = N[found * 3]!,
    Ny = N[found * 3 + 1]!,
    Nz = N[found * 3 + 2]!;
  const denominator = nx * Nx + ny * Ny + nz * Nz;
  if (Math.abs(denominator) <= 1e-12 * Math.hypot(Nx, Ny, Nz)) {
    return Infinity;
  }
  const a = triangles[found * 3]! * 3;
  const p = mesh.positions;
  return (
    ((px - p[a]!) * Nx + (py - p[a + 1]!) * Ny + (pz - p[a + 2]!) * Nz) /
    denominator
  );
}

const scratchPoint = new Float64Array(3);
const scratchCarto: Cartographic = { longitude: 0, latitude: 0, height: 0 };

/** A longitude brought to the side of the antimeridian `r` lies on. */
function unwrap(longitude: number, r: Rectangle): number {
  if (longitude < r.west - Math.PI) {
    return longitude + 2 * Math.PI;
  }
  if (longitude > r.east + Math.PI) {
    return longitude - 2 * Math.PI;
  }
  return longitude;
}

/** Golden-section search for the lowest of `f` on [lo, hi]. */
function polish(
  lo: number,
  hi: number,
  f: (t: number) => number,
): { meters: number; t: number } {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let x1 = b - g * (b - a);
  let x2 = a + g * (b - a);
  let f1 = f(x1);
  let f2 = f(x2);
  for (let k = 0; k < 64 && b - a > 1e-15; k++) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - g * (b - a);
      f1 = f(x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + g * (b - a);
      f2 = f(x2);
    }
  }
  return f1 < f2 ? { meters: f1, t: x1 } : { meters: f2, t: x2 };
}

// ----------------------------------------------------------- boundaries

/**
 * Where the ray leaves the column of a longitude/latitude rectangle after
 * `tMin`: the smallest root, crossed outward, of its two meridian
 * half-planes and two cones of constant geodetic latitude. Side: 0 west,
 * 1 east, 2 south, 3 north; t is Infinity if it never leaves.
 */
function rectangleExit(
  ray: Ray,
  r: Rectangle,
  tMin: number,
): { t: number; side: number } {
  const west = meridianExit(ray, Math.sin(r.west), Math.cos(r.west), -1);
  const east = meridianExit(ray, Math.sin(r.east), Math.cos(r.east), 1);
  const south = coneExit(ray, r.south, -1, tMin);
  const north = coneExit(ray, r.north, 1, tMin);
  return pick(west, east, south, north, tMin);
}

function cellExit(
  ray: Ray,
  mesh: RayMesh,
  i: number,
  j: number,
  tMin: number,
): { t: number; side: number } {
  const west = meridianExit(ray, mesh.lonSin[i]!, mesh.lonCos[i]!, -1);
  const east = meridianExit(ray, mesh.lonSin[i + 1]!, mesh.lonCos[i + 1]!, 1);
  const south = coneRoot(
    ray,
    mesh.latSin[j]!,
    mesh.latCos[j]!,
    mesh.latZ0[j]!,
    -1,
    tMin,
  );
  const north = coneRoot(
    ray,
    mesh.latSin[j + 1]!,
    mesh.latCos[j + 1]!,
    mesh.latZ0[j + 1]!,
    1,
    tMin,
  );
  return pick(west, east, south, north, tMin);
}

/** The exit found last (shared: read it before the next call). */
const EXIT = { t: Infinity, side: -1 };

function pick(
  west: number,
  east: number,
  south: number,
  north: number,
  tMin: number,
): { t: number; side: number } {
  EXIT.t = Infinity;
  EXIT.side = -1;
  if (west >= tMin && west < EXIT.t) {
    EXIT.t = west;
    EXIT.side = 0;
  }
  if (east >= tMin && east < EXIT.t) {
    EXIT.t = east;
    EXIT.side = 1;
  }
  if (south >= tMin && south < EXIT.t) {
    EXIT.t = south;
    EXIT.side = 2;
  }
  if (north >= tMin && north < EXIT.t) {
    EXIT.t = north;
    EXIT.side = 3;
  }
  return EXIT;
}

/**
 * The ray's crossing of the meridian half-plane at longitude λ (sin, cos),
 * if it crosses outward: `outward` −1 for a west edge (leaving westward),
 * +1 for an east edge. NaN otherwise.
 */
function meridianExit(
  ray: Ray,
  sin: number,
  cos: number,
  outward: number,
): number {
  // f > 0 east of the meridian (locally): f = −x sin λ + y cos λ.
  const f0 = -ray.ox * sin + ray.oy * cos;
  const fd = -ray.dx * sin + ray.dy * cos;
  if (fd === 0 || Math.sign(fd) !== outward) {
    return NaN;
  }
  const t = -f0 / fd;
  // On the meridian's own half, not the one opposite.
  const x = ray.ox + ray.dx * t;
  const y = ray.oy + ray.dy * t;
  return x * cos + y * sin > 0 ? t : NaN;
}

function coneExit(
  ray: Ray,
  latitude: number,
  outward: number,
  tMin: number,
): number {
  const sin = Math.sin(latitude);
  const cos = Math.cos(latitude);
  return coneRoot(ray, sin, cos, coneApex(ray.a, ray.e2, sin), outward, tMin);
}

/** z of the apex of the cone of constant geodetic latitude: −e²·N·sin φ. */
function coneApex(a: number, e2: number, sin: number): number {
  return (-e2 * a * sin) / Math.sqrt(1 - e2 * sin * sin);
}

/**
 * The smallest crossing at or after `tMin` of the cone of constant geodetic
 * latitude φ (sin, cos, apex z0), crossed outward: −1 for a south edge
 * (leaving southward), +1 for a north edge. Points at latitude φ satisfy
 * G = cos φ·(z − z0) − sin φ·ρ = 0 (ρ = √(x² + y²)), G > 0 north of it.
 */
function coneRoot(
  ray: Ray,
  sin: number,
  cos: number,
  z0: number,
  outward: number,
  tMin: number,
): number {
  if (cos < 1e-12) {
    return NaN; // a pole: no boundary to cross
  }
  const { ox, oy, dx, dy, dz } = ray;
  const zo = ray.oz - z0;
  if (Math.abs(sin) < 1e-15) {
    // The equator: the plane z = 0.
    if (dz === 0 || Math.sign(dz) !== outward) {
      return NaN;
    }
    const t = -zo / dz;
    return t >= tMin ? t : NaN;
  }
  // Squared: cos²φ (z − z0)² = sin²φ ρ², then keep the right nappe.
  const c2 = cos * cos;
  const s2 = sin * sin;
  const rho0 = Math.sqrt(ox * ox + oy * oy);
  const a2 = c2 * dz * dz - s2 * (dx * dx + dy * dy);
  const a1 = 2 * (c2 * zo * dz - s2 * (ox * dx + oy * dy));
  const a0 = (cos * zo - sin * rho0) * (cos * zo + sin * rho0);
  let r1 = NaN;
  let r2 = NaN;
  if (Math.abs(a2) <= 1e-15 * Math.abs(a1)) {
    if (a1 !== 0) {
      r1 = -a0 / a1;
    }
  } else {
    const disc = a1 * a1 - 4 * a2 * a0;
    if (disc < 0) {
      return NaN;
    }
    const q = -0.5 * (a1 + (a1 >= 0 ? 1 : -1) * Math.sqrt(disc));
    r1 = q / a2;
    if (q !== 0) {
      r2 = a0 / q;
    }
  }
  const a = coneCrossing(ray, sin, cos, zo, outward, tMin, r1);
  const b = coneCrossing(ray, sin, cos, zo, outward, tMin, r2);
  return a < b || Number.isNaN(b) ? a : b;
}

/** `t` if it is at or after `tMin`, on the cone's nappe, crossed outward. */
function coneCrossing(
  ray: Ray,
  sin: number,
  cos: number,
  zo: number,
  outward: number,
  tMin: number,
  t: number,
): number {
  if (!(t >= tMin)) {
    return NaN;
  }
  const { ox, oy, dx, dy, dz } = ray;
  const z = zo + dz * t;
  if (z * sin < 0) {
    return NaN; // the other nappe
  }
  const x = ox + dx * t;
  const y = oy + dy * t;
  const rho = Math.sqrt(x * x + y * y);
  const dG = cos * dz - (sin * (x * dx + y * dy)) / (rho || 1);
  return Math.sign(dG) === outward ? t : NaN;
}

// --------------------------------------------------------------- meshes

/** A tile's ray mesh, built on first use and kept with its heights. */
function meshFor(tile: TerrainRayTile, ellipsoid: Ellipsoid): RayMesh {
  const cached = meshes.get(tile.heights);
  const r = tile.rectangle;
  if (
    cached &&
    cached.ellipsoid === ellipsoid &&
    cached.rectangle.west === r.west &&
    cached.rectangle.east === r.east &&
    cached.rectangle.south === r.south &&
    cached.rectangle.north === r.north
  ) {
    return cached;
  }
  const mesh = buildMesh(tile, ellipsoid);
  meshes.set(tile.heights, mesh);
  return mesh;
}

function buildMesh(tile: TerrainRayTile, ellipsoid: Ellipsoid): RayMesh {
  const r = { ...tile.rectangle };
  const t = tile.heights;
  const { u, v, h, triangles } = t;
  const vertexCount = u.length;
  const triangleCount = Math.floor(triangles.length / 3);
  const width = r.east - r.west;
  const heightSpan = r.north - r.south;
  const range = t.maximumHeight - t.minimumHeight;
  // Earth-fixed vertices, dequantized as the drawn mesh is (in float64).
  const positions = new Float64Array(vertexCount * 3);
  const carto: Cartographic = { longitude: 0, latitude: 0, height: 0 };
  const scratch = new Float64Array(3);
  for (let i = 0; i < vertexCount; i++) {
    carto.longitude = r.west + (u[i]! / Q) * width;
    carto.latitude = r.south + (v[i]! / Q) * heightSpan;
    carto.height = t.minimumHeight + (h[i]! / Q) * range;
    ellipsoid.cartographicToCartesian(carto, scratch);
    positions[i * 3] = scratch[0]!;
    positions[i * 3 + 1] = scratch[1]!;
    positions[i * 3 + 2] = scratch[2]!;
  }
  const normals = new Float64Array(triangleCount * 3);
  for (let k = 0; k < triangleCount; k++) {
    const a = triangles[k * 3]! * 3;
    const b = triangles[k * 3 + 1]! * 3;
    const c = triangles[k * 3 + 2]! * 3;
    const e1x = positions[b]! - positions[a]!;
    const e1y = positions[b + 1]! - positions[a + 1]!;
    const e1z = positions[b + 2]! - positions[a + 2]!;
    const e2x = positions[c]! - positions[a]!;
    const e2y = positions[c + 1]! - positions[a + 1]!;
    const e2z = positions[c + 2]! - positions[a + 2]!;
    normals[k * 3] = e1y * e2z - e1z * e2y;
    normals[k * 3 + 1] = e1z * e2x - e1x * e2z;
    normals[k * 3 + 2] = e1x * e2y - e1y * e2x;
  }

  // About two triangles per cell.
  const g = Math.min(
    256,
    Math.max(1, Math.round(Math.sqrt(triangleCount / 2))),
  );
  // Each triangle goes in every cell its (u, v) box touches, grown by a
  // bound on how far a straight 3D edge's footprint bows from the straight
  // (u, v) edge (latitude along a chord bulges by about Δλ²·sin 2φ / 16;
  // a quarter of the squared extent covers that with room) and by 0.01
  // unit, far above the footprint's rounding (about 1e-4 unit at level 14).
  const range0 = new Int32Array(triangleCount * 4);
  const boxes = new Float64Array(triangleCount * 4);
  const counts = new Uint32Array(g * g + 1);
  for (let k = 0; k < triangleCount; k++) {
    const i0 = triangles[k * 3]!,
      i1 = triangles[k * 3 + 1]!,
      i2 = triangles[k * 3 + 2]!;
    const uMin = Math.min(u[i0]!, u[i1]!, u[i2]!);
    const uMax = Math.max(u[i0]!, u[i1]!, u[i2]!);
    const vMin = Math.min(v[i0]!, v[i1]!, v[i2]!);
    const vMax = Math.max(v[i0]!, v[i1]!, v[i2]!);
    const dLon = ((uMax - uMin) / Q) * width;
    const dLat = ((vMax - vMin) / Q) * heightSpan;
    const bow = (dLon * dLon + dLat * dLat) / 4;
    const mu = (bow / width) * Q + 0.01;
    const mv = (bow / heightSpan) * Q + 0.01;
    boxes[k * 4] = uMin - mu;
    boxes[k * 4 + 1] = uMax + mu;
    boxes[k * 4 + 2] = vMin - mv;
    boxes[k * 4 + 3] = vMax + mv;
    const ia = clampCell(Math.floor(((uMin - mu) / Q) * g), g);
    const ib = clampCell(Math.floor(((uMax + mu) / Q) * g), g);
    const ja = clampCell(Math.floor(((vMin - mv) / Q) * g), g);
    const jb = clampCell(Math.floor(((vMax + mv) / Q) * g), g);
    range0[k * 4] = ia;
    range0[k * 4 + 1] = ib;
    range0[k * 4 + 2] = ja;
    range0[k * 4 + 3] = jb;
    for (let j = ja; j <= jb; j++) {
      for (let i = ia; i <= ib; i++) {
        counts[j * g + i + 1]!++;
      }
    }
  }
  const offsets = new Uint32Array(g * g + 1);
  for (let c = 0; c < g * g; c++) {
    offsets[c + 1] = offsets[c]! + counts[c + 1]!;
  }
  const items = new Uint32Array(offsets[g * g]!);
  const fill = offsets.slice(0, g * g);
  for (let k = 0; k < triangleCount; k++) {
    for (let j = range0[k * 4 + 2]!; j <= range0[k * 4 + 3]!; j++) {
      for (let i = range0[k * 4]!; i <= range0[k * 4 + 1]!; i++) {
        items[fill[j * g + i]!++] = k;
      }
    }
  }

  const radii = ellipsoid.radii;
  const a = radii[0]!;
  const e2 = 1 - (radii[2]! * radii[2]!) / (a * a);
  const lonSin = new Float64Array(g + 1);
  const lonCos = new Float64Array(g + 1);
  const latSin = new Float64Array(g + 1);
  const latCos = new Float64Array(g + 1);
  const latZ0 = new Float64Array(g + 1);
  for (let i = 0; i <= g; i++) {
    const lon = i === g ? r.east : r.west + (i / g) * width;
    lonSin[i] = Math.sin(lon);
    lonCos[i] = Math.cos(lon);
    const lat = i === g ? r.north : r.south + (i / g) * heightSpan;
    latSin[i] = Math.sin(lat);
    latCos[i] = Math.cos(lat);
    latZ0[i] = coneApex(a, e2, latSin[i]!);
  }
  return {
    rectangle: r,
    ellipsoid,
    heights: t,
    positions,
    normals,
    g,
    offsets,
    items,
    stamp: new Uint32Array(triangleCount),
    boxes,
    widthMeters: width * a,
    heightMeters: heightSpan * a,
    lonSin,
    lonCos,
    latSin,
    latCos,
    latZ0,
  };
}
