import { projectToPixel } from "../scene/Camera.ts";
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
  /** The unit normal of the face snapped to, toward the camera. */
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
 * geometry within the tile's geometric error: that is the tolerance, and no
 * snap is exact. Occlusion isn't tested: within the aperture, a vertex of
 * the hit draw hidden behind its own surface can win.
 */
export class ClientSnapService implements SnapService {
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
        : nearest(geometry, camera, x, y, aperture);
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

/**
 * The nearest vertex of `g` to the cursor within `aperture` CSS pixels, else
 * the nearest point of an edge, as `camera` shows them.
 */
function nearest(
  g: TileGeometry,
  camera: PickCamera,
  cx: number,
  cy: number,
  aperture: number,
): Found | undefined {
  const { positions, indices, matrix: m } = g;
  const count = Math.floor(positions.length / 3);
  // Each vertex Earth-fixed (float64), its pixel and depth (NaN: behind).
  const world = new Float64Array(count * 3);
  const pixel = new Float64Array(count * 2);
  const depth = new Float64Array(count);
  const p = new Float64Array(3);
  const out = new Float64Array(2);
  for (let v = 0; v < count; v++) {
    const x = positions[3 * v]!,
      y = positions[3 * v + 1]!,
      z = positions[3 * v + 2]!;
    p[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    p[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    p[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
    world.set(p, 3 * v);
    const w = projectToPixel(
      camera,
      camera.fovy,
      camera.width,
      camera.height,
      p,
      out,
    );
    depth[v] = w > 0 ? w : NaN;
    pixel[2 * v] = out[0]!;
    pixel[2 * v + 1] = out[1]!;
  }
  const vertex = (v: number) => world.slice(3 * v, 3 * v + 3);
  const valid = (v: number) => v < count && !Number.isNaN(depth[v]!);

  // Vertices first.
  let best = -1;
  let bestTriangle = -1;
  let bestDistance = aperture;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k]!;
      if (!valid(v)) {
        continue;
      }
      const d = Math.hypot(pixel[2 * v]! - cx, pixel[2 * v + 1]! - cy);
      if (d <= bestDistance && (best < 0 || d < bestDistance)) {
        best = v;
        bestTriangle = t;
        bestDistance = d;
      }
    }
  }
  if (best >= 0) {
    return withNormal(
      { kind: "point", point: vertex(best), distance: bestDistance },
      bestTriangle,
    );
  }

  // Then edges: the nearest point on the screen, and the 3D point that
  // projects there (perspective-correct along the edge).
  let edge: [number, number] | undefined;
  let edgeT = 0;
  bestDistance = aperture;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = indices[t + k]!;
      const b = indices[t + ((k + 1) % 3)]!;
      if (!valid(a) || !valid(b)) {
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
      const s = Math.min(
        1,
        Math.max(0, ((cx - ax) * ex + (cy - ay) * ey) / length2),
      );
      const d = Math.hypot(ax + s * ex - cx, ay + s * ey - cy);
      if (d <= bestDistance && (edge === undefined || d < bestDistance)) {
        edge = [a, b];
        edgeT = s;
        bestTriangle = t;
        bestDistance = d;
      }
    }
  }
  if (edge === undefined) {
    return undefined;
  }
  const [a, b] = edge;
  const wa = depth[a]!,
    wb = depth[b]!;
  // A screen fraction s is the fraction s·wa / (s·wa + (1 - s)·wb) in 3D.
  const u = (edgeT * wa) / (edgeT * wa + (1 - edgeT) * wb);
  const A = vertex(a),
    B = vertex(b);
  const point = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    point[i] = A[i]! + u * (B[i]! - A[i]!);
  }
  return withNormal(
    { kind: "segment", point, distance: bestDistance, curve: [A, B] },
    bestTriangle,
  );

  function withNormal(found: Found, t: number): Found {
    const i0 = indices[t]!,
      i1 = indices[t + 1]!,
      i2 = indices[t + 2]!;
    if (i0 >= count || i1 >= count || i2 >= count) {
      return found;
    }
    const ux = world[3 * i1]! - world[3 * i0]!,
      uy = world[3 * i1 + 1]! - world[3 * i0 + 1]!,
      uz = world[3 * i1 + 2]! - world[3 * i0 + 2]!;
    const vx = world[3 * i2]! - world[3 * i0]!,
      vy = world[3 * i2 + 1]! - world[3 * i0 + 1]!,
      vz = world[3 * i2 + 2]! - world[3 * i0 + 2]!;
    const n = Float64Array.from([
      uy * vz - uz * vy,
      uz * vx - ux * vz,
      ux * vy - uy * vx,
    ]);
    const length = Math.hypot(n[0]!, n[1]!, n[2]!);
    if (!(length > 0)) {
      return found;
    }
    // Toward the camera.
    const e = camera.position;
    const toward =
      (e[0]! - found.point[0]!) * n[0]! +
        (e[1]! - found.point[1]!) * n[1]! +
        (e[2]! - found.point[2]!) * n[2]! <
      0
        ? -1
        : 1;
    for (let i = 0; i < 3; i++) {
      n[i] = (n[i]! / length) * toward;
    }
    return { ...found, normal: n };
  }
}
