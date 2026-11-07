import type { TileGeometry } from "../streaming/Tile.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import {
  designPoint,
  type DesignPoint,
  type SnapKind,
} from "./EngineeringFrame.ts";
import { pickInFrame, type PickCamera, type PickView } from "./pick.ts";

/** Where to snap: CSS pixels from the view's top-left, as `pickDesign`. */
export interface SnapRequest {
  readonly view: PickView;
  readonly x: number;
  readonly y: number;
  /** How far from the cursor a snap may land, in CSS pixels. */
  readonly aperture: number;
}

/** What a snap landed on. */
export interface SnapResult {
  /** The snapped position: body-fixed metres, as displayed. */
  readonly point: Float64Array;
  /** The pick under the cursor it started from (body-fixed, displayed). */
  readonly raw: Float64Array;
  /** CSS pixels from the cursor to `point` on the screen (0 on a surface). */
  readonly distance: number;
  readonly kind: SnapKind;
  /**
   * The unit normal of a face at `point`: one facing the camera where there
   * is one, else another turned toward it. None on a `surface`.
   */
  readonly normal?: Float64Array;
  /** The geometry snapped to: an edge's two ends for a `segment`. */
  readonly curve?: readonly Float64Array[];
  /**
   * Design coordinates of `point` (`obtained: { how: "snap", tolerance,
   * kind }`), only where `pickDesign` gives the raw pick design coordinates.
   */
  readonly design?: DesignPoint;
  /** Metres: how far `point` may be from the geometry it stands for. */
  readonly tolerance: number;
  /** Whether `point` lies on the analytic geometry (tolerance 0). */
  readonly exact: boolean;
  /** The listed tileset whose content was hit. */
  readonly tileset?: Tileset3D;
}

/**
 * Snaps a cursor to geometry (after 1.x's `SnapService`). Resolves undefined
 * over the sky.
 */
export interface SnapService {
  snap(request: SnapRequest): Promise<SnapResult | undefined>;
}

/** Added once to a tileset's `warnings` when snapping finds no geometry. */
export const GEOMETRY_NOT_RETAINED = "snap: geometry not retained";

/**
 * Snapping to the triangles tiles keep with `retainGeometry`, on the
 * client. From `pickDesign`'s hit, the hit draw's vertices are projected
 * with the camera of the pick's frame: the nearest within the aperture is a
 * `point`; failing that, the nearest point of an edge within it is a
 * `segment`; failing that, the raw hit is a `surface`. A snapped point is a
 * vertex or on an edge of the tile's mesh, which stands for the true
 * geometry within the tile's geometric error: that is the tolerance (a
 * geometric error of 0 is taken at its word), and no snap is exact.
 *
 * A vertex or edge point the hit draw's own triangles hide from the camera
 * (the line of sight crosses one of them before reaching it) is passed over
 * for the next nearest. Occlusion by other draws isn't tested: such a point
 * is still a vertex of the drawn mesh, within the aperture.
 */
export class ClientSnapService implements SnapService {
  /**
   * Per-vertex work buffers, kept across snaps: about 57 bytes per vertex
   * of the largest draw snapped to.
   */
  private readonly scratch = new Scratch();

  constructor(readonly tilesets: readonly Tileset3D[]) {}

  async snap(request: SnapRequest): Promise<SnapResult | undefined> {
    const { view, x, y, aperture } = request;
    if (!(Number.isFinite(aperture) && aperture >= 0)) {
      throw new Error(
        `ClientSnapService: the aperture must be a finite number of CSS pixels, not negative, got ${aperture}`,
      );
    }
    const framed = await pickInFrame(view, x, y, this.tilesets);
    if (framed === undefined) {
      return undefined;
    }
    const { pick, camera, draw, tile } = framed;
    const tileset = pick.tileset;
    const raw = pick.position;
    const surface = (tolerance: number): SnapResult => ({
      point: Float64Array.from(raw),
      raw,
      distance: 0,
      kind: "surface",
      ...(pick.design !== undefined && {
        design: designPoint(pick.design.engineeringFrame, pick.design.design, {
          how: "snap",
          tolerance,
          kind: "surface",
        }),
      }),
      tolerance,
      exact: false,
      ...(tileset !== undefined && { tileset }),
    });
    if (
      camera === undefined ||
      tileset === undefined ||
      draw === undefined ||
      tile === undefined
    ) {
      return surface(pick.tolerance);
    }
    // The raw hit is on the mesh within a pixel's footprint, and the mesh on
    // the geometry within the geometric error.
    const surfaceTolerance = pick.tolerance + tile.geometricError;
    if (tile.geometry === undefined) {
      if (
        !tileset.retainGeometry &&
        !tileset.warnings.has(GEOMETRY_NOT_RETAINED)
      ) {
        tileset.warnings.add(GEOMETRY_NOT_RETAINED);
      }
      return surface(surfaceTolerance);
    }
    const geometry = tile.geometry.find(
      (g) =>
        g.draw.index === draw.index && g.draw.generation === draw.generation,
    );
    const found =
      geometry === undefined
        ? undefined
        : nearest(geometry, camera, x, y, aperture, this.scratch);
    if (found === undefined) {
      return surface(surfaceTolerance);
    }
    const tolerance = tile.geometricError;
    const placement = tileset.placement;
    return {
      point: found.point,
      raw,
      distance: found.distance,
      kind: found.kind,
      ...(found.normal !== undefined && { normal: found.normal }),
      ...(found.curve !== undefined && { curve: found.curve }),
      ...(pick.design !== undefined &&
        placement !== undefined && {
          design: designPoint(
            placement.frame,
            placement.designOf(found.point),
            { how: "snap", tolerance, kind: found.kind },
          ),
        }),
      tolerance,
      exact: false,
      tileset,
    };
  }
}

interface Found {
  kind: "point" | "segment";
  point: Float64Array;
  distance: number;
  normal?: Float64Array;
  curve?: Float64Array[];
}

/** Outcodes against the aperture's box on the screen. */
const LEFT = 1,
  RIGHT = 2,
  ABOVE = 4,
  BELOW = 8;

/** Work buffers grown to the largest draw snapped to, and reused. */
class Scratch {
  /** Each vertex Earth-fixed, relative to the eye (float64). */
  rel = new Float64Array(0);
  /** Each vertex's CSS pixel (`projected`). */
  pixel = new Float64Array(0);
  /** Depth along the view direction; NaN nearer than the near plane. */
  depth = new Float64Array(0);
  /** Outcode; 0 also for a vertex not in front (never culls). */
  code = new Uint8Array(0);
  /** `stamp` where a vertex was already visited this snap. */
  seen = new Uint32Array(0);
  /** `stamp` where `pixel` holds a vertex's pixel (else camera right, up). */
  projected = new Uint32Array(0);
  stamp = 0;
  /** First index of the triangles the aperture may touch. */
  triangles = new Uint32Array(0);

  reserve(vertices: number, triangles: number): void {
    if (this.depth.length < vertices) {
      const n = Math.max(vertices, 2 * this.depth.length);
      this.rel = new Float64Array(3 * n);
      this.pixel = new Float64Array(2 * n);
      this.depth = new Float64Array(n);
      this.code = new Uint8Array(n);
      this.seen = new Uint32Array(n);
      this.projected = new Uint32Array(n);
      this.stamp = 0;
    }
    if (this.triangles.length < triangles) {
      this.triangles = new Uint32Array(
        Math.max(triangles, 2 * this.triangles.length),
      );
    }
    if (++this.stamp > 0xfffffff0) {
      this.seen.fill(0);
      this.projected.fill(0);
      this.stamp = 1;
    }
  }
}

/**
 * The nearest vertex of `g` to the cursor within `aperture` CSS pixels that
 * the camera sees, else the nearest such point of an edge, as `camera` shows
 * them.
 */
function nearest(
  g: TileGeometry,
  camera: PickCamera,
  cx: number,
  cy: number,
  aperture: number,
  s: Scratch,
): Found | undefined {
  const { positions, indices, matrix: m } = g;
  const count = Math.floor(positions.length / 3);
  s.reserve(count, Math.floor(indices.length / 3));
  const { rel, pixel, depth, code, seen, projected, triangles } = s;
  const e = camera.position;
  // Relative to the eye: the translation's difference is taken once, in
  // float64, so the projection and ray tests keep metre-scale precision.
  const tx = m[12]! - e[0]!,
    ty = m[13]! - e[1]!,
    tz = m[14]! - e[2]!;
  const d0 = camera.direction[0]!,
    d1 = camera.direction[1]!,
    d2 = camera.direction[2]!;
  const r0 = camera.right[0]!,
    r1 = camera.right[1]!,
    r2 = camera.right[2]!;
  const u0 = camera.up[0]!,
    u1 = camera.up[1]!,
    u2 = camera.up[2]!;
  const { width, height, near: nearPlane } = camera;
  const tan = Math.tan(camera.fovy / 2);
  const aspect = width / height;
  // The aperture's box as bounds on right/depth and up/depth: a cheap
  // reject (no division) before any vertex is projected to a pixel.
  const left = ((2 * (cx - aperture)) / width - 1) * tan * aspect,
    right = ((2 * (cx + aperture)) / width - 1) * tan * aspect,
    above = (1 - (2 * (cy - aperture)) / height) * tan,
    below = (1 - (2 * (cy + aperture)) / height) * tan;
  for (let v = 0; v < count; v++) {
    const x = positions[3 * v]!,
      y = positions[3 * v + 1]!,
      z = positions[3 * v + 2]!;
    const px = m[0]! * x + m[4]! * y + m[8]! * z + tx,
      py = m[1]! * x + m[5]! * y + m[9]! * z + ty,
      pz = m[2]! * x + m[6]! * y + m[10]! * z + tz;
    rel[3 * v] = px;
    rel[3 * v + 1] = py;
    rel[3 * v + 2] = pz;
    const w = px * d0 + py * d1 + pz * d2;
    if (!(w > 0 && w >= nearPlane)) {
      depth[v] = NaN;
      code[v] = 0;
      continue;
    }
    depth[v] = w;
    // Camera-space right and up, made pixels only where needed.
    const sx = px * r0 + py * r1 + pz * r2,
      sy = px * u0 + py * u1 + pz * u2;
    pixel[2 * v] = sx;
    pixel[2 * v + 1] = sy;
    code[v] =
      (sx < left * w ? LEFT : sx > right * w ? RIGHT : 0) |
      (sy > above * w ? ABOVE : sy < below * w ? BELOW : 0);
  }
  const valid = (v: number) => !Number.isNaN(depth[v]!);

  // The triangles the aperture may touch: not all beyond one side of its box.
  // They hold every candidate, and every occluder of a line of sight through
  // the box.
  let near = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t]!,
      b = indices[t + 1]!,
      c = indices[t + 2]!;
    if (
      a < count &&
      b < count &&
      c < count &&
      !(code[a]! & code[b]! & code[c]!)
    ) {
      triangles[near++] = t;
    }
  }
  // Their vertices' pixels, as `projectToPixel` gives them.
  for (let i = 0; i < near; i++) {
    const t = triangles[i]!;
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k]!;
      if (projected[v] === s.stamp || !valid(v)) {
        continue;
      }
      projected[v] = s.stamp;
      const f = tan * depth[v]!;
      pixel[2 * v] = ((pixel[2 * v]! / (f * aspect) + 1) / 2) * width;
      pixel[2 * v + 1] = ((1 - pixel[2 * v + 1]! / f) / 2) * height;
    }
  }

  // Vertices first, nearest first, the first the camera sees.
  const vertices: { v: number; d: number }[] = [];
  for (let i = 0; i < near; i++) {
    const t = triangles[i]!;
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k]!;
      if (seen[v] === s.stamp) {
        continue;
      }
      seen[v] = s.stamp;
      if (code[v] !== 0 || !valid(v)) {
        continue;
      }
      const d = Math.hypot(pixel[2 * v]! - cx, pixel[2 * v + 1]! - cy);
      if (d <= aperture) {
        vertices.push({ v, d });
      }
    }
  }
  vertices.sort((p, q) => p.d - q.d);
  for (const { v, d } of vertices) {
    const at = rel.subarray(3 * v, 3 * v + 3);
    if (!hidden(at, (t) => has(t, v))) {
      const found: Found = { kind: "point", point: absolute(v), distance: d };
      return withNormal(found, at, (t) => has(t, v));
    }
  }

  // Then edges: the nearest point on the screen, and the 3D point that
  // projects there (perspective-correct along the edge).
  const edges: { a: number; b: number; s: number; d: number }[] = [];
  for (let i = 0; i < near; i++) {
    const t = triangles[i]!;
    for (let k = 0; k < 3; k++) {
      const a = indices[t + k]!;
      const b = indices[t + ((k + 1) % 3)]!;
      if (code[a]! & code[b]! || !valid(a) || !valid(b)) {
        continue;
      }
      const ax = pixel[2 * a]!,
        ay = pixel[2 * a + 1]!;
      const ex = pixel[2 * b]! - ax,
        ey = pixel[2 * b + 1]! - ay;
      const length2 = ex * ex + ey * ey;
      if (!(length2 > 0)) {
        continue;
      }
      const f = Math.min(
        1,
        Math.max(0, ((cx - ax) * ex + (cy - ay) * ey) / length2),
      );
      const d = Math.hypot(ax + f * ex - cx, ay + f * ey - cy);
      if (d <= aperture) {
        edges.push({ a, b, s: f, d });
      }
    }
  }
  edges.sort((p, q) => p.d - q.d);
  const at = new Float64Array(3);
  for (const { a, b, s: f, d } of edges) {
    const wa = depth[a]!,
      wb = depth[b]!;
    // A screen fraction f is the fraction f·wa / (f·wa + (1 - f)·wb) in 3D.
    const u = (f * wa) / (f * wa + (1 - f) * wb);
    for (let i = 0; i < 3; i++) {
      at[i] = rel[3 * a + i]! + u * (rel[3 * b + i]! - rel[3 * a + i]!);
    }
    const onEdge = (t: number) => has(t, a) && has(t, b);
    if (hidden(at, onEdge)) {
      continue;
    }
    const A = absolute(a),
      B = absolute(b);
    const p = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      p[i] = A[i]! + u * (B[i]! - A[i]!);
    }
    return withNormal(
      { kind: "segment", point: p, distance: d, curve: [A, B] },
      at,
      onEdge,
    );
  }
  return undefined;

  /** Whether triangle `t` (first index) has vertex `v`. */
  function has(t: number, v: number): boolean {
    return indices[t] === v || indices[t + 1] === v || indices[t + 2] === v;
  }

  /** A vertex Earth-fixed, as the matrix places it (exactly as drawn). */
  function absolute(v: number): Float64Array {
    const x = positions[3 * v]!,
      y = positions[3 * v + 1]!,
      z = positions[3 * v + 2]!;
    return Float64Array.from([
      m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
      m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
      m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
    ]);
  }

  /**
   * Whether a triangle other than `skip`'s crosses the line of sight from
   * the eye to `p` (eye-relative) before it, by more than a millionth of the
   * distance (and a millimetre), and beyond the near plane (nearer isn't
   * drawn).
   */
  function hidden(p: Float64Array, skip: (t: number) => boolean): boolean {
    const px = p[0]!,
      py = p[1]!,
      pz = p[2]!;
    const limit = 1 - Math.max(1e-6, 1e-3 / Math.hypot(px, py, pz));
    const d = camera.direction;
    // The fraction of the way to p where the near plane is.
    const first = camera.near / (px * d[0]! + py * d[1]! + pz * d[2]!);
    for (let i = 0; i < near; i++) {
      const t = triangles[i]!;
      if (skip(t)) {
        continue;
      }
      const i0 = 3 * indices[t]!,
        i1 = 3 * indices[t + 1]!,
        i2 = 3 * indices[t + 2]!;
      const ox = rel[i0]!,
        oy = rel[i0 + 1]!,
        oz = rel[i0 + 2]!;
      const e1x = rel[i1]! - ox,
        e1y = rel[i1 + 1]! - oy,
        e1z = rel[i1 + 2]! - oz;
      const e2x = rel[i2]! - ox,
        e2y = rel[i2 + 1]! - oy,
        e2z = rel[i2 + 2]! - oz;
      // Möller–Trumbore, the ray from the eye (0) along p (p at 1).
      const qx = py * e2z - pz * e2y,
        qy = pz * e2x - px * e2z,
        qz = px * e2y - py * e2x;
      const det = e1x * qx + e1y * qy + e1z * qz;
      if (!(Math.abs(det) > 0)) {
        continue;
      }
      const inv = 1 / det;
      const u = -(ox * qx + oy * qy + oz * qz) * inv;
      if (u < 0 || u > 1) {
        continue;
      }
      const rx = -oy * e1z + oz * e1y,
        ry = -oz * e1x + ox * e1z,
        rz = -ox * e1y + oy * e1x;
      const v = (px * rx + py * ry + pz * rz) * inv;
      if (v < 0 || u + v > 1) {
        continue;
      }
      const along = (e2x * rx + e2y * ry + e2z * rz) * inv;
      if (along >= first && along > 0 && along < limit) {
        return true;
      }
    }
    return false;
  }

  /**
   * The unit normal of a triangle at the snap facing the camera (another,
   * flipped toward it, when none does).
   */
  function withNormal(
    found: Found,
    p: Float64Array,
    at: (t: number) => boolean,
  ): Found {
    let fallback: Float64Array | undefined;
    for (let i = 0; i < near; i++) {
      const t = triangles[i]!;
      if (!at(t)) {
        continue;
      }
      const i0 = 3 * indices[t]!,
        i1 = 3 * indices[t + 1]!,
        i2 = 3 * indices[t + 2]!;
      const ux = rel[i1]! - rel[i0]!,
        uy = rel[i1 + 1]! - rel[i0 + 1]!,
        uz = rel[i1 + 2]! - rel[i0 + 2]!;
      const vx = rel[i2]! - rel[i0]!,
        vy = rel[i2 + 1]! - rel[i0 + 1]!,
        vz = rel[i2 + 2]! - rel[i0 + 2]!;
      const n = Float64Array.from([
        uy * vz - uz * vy,
        uz * vx - ux * vz,
        ux * vy - uy * vx,
      ]);
      const length = Math.hypot(n[0]!, n[1]!, n[2]!);
      if (!(length > 0)) {
        continue;
      }
      // The eye is at 0: facing it is a negative dot with p.
      const facing = n[0]! * p[0]! + n[1]! * p[1]! + n[2]! * p[2]! < 0;
      for (let k = 0; k < 3; k++) {
        n[k] = (n[k]! / length) * (facing ? 1 : -1);
      }
      if (facing) {
        return { ...found, normal: n };
      }
      fallback ??= n;
    }
    return fallback === undefined ? found : { ...found, normal: fallback };
  }
}
