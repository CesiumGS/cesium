// A pick's hit as a point of the content's own domain (CESIUM2_WEBGPU_PLAN.md
// §13.26, increment 5): the pick variant (render/view/pickDomain.ts) draws
// what the opaque pass drew into a few pixels around the cursor and writes
// per pixel the draw, and in it a triangle's number and barycentrics or a
// b-rep face and its (u, v). This module turns that into the content's exact
// point: a mesh's triangle's stored positions, weighted by the barycentrics
// and carried by the draw's matrix; a patch draw's face, evaluated by its
// b-rep's `refinePick`. Nothing is inverted: a placement that bends the
// draw (a warp) moved where the content is drawn, not where it is, and the
// point is the content's own whatever was drawn.
import type { GeometryAccuracy } from "../geometry/query.ts";
import { FLAGS_WORD, RECORD_WORDS, RecordFlags } from "../render/layout.ts";
import type { World } from "./World.ts";
import { instanceAffine } from "./world/domains.ts";
import type { DrawHandle } from "./world/types.ts";

/** @internal A sample's triangle for a patch draw's face. */
export const NO_TRIANGLE = 0xffffffff;
/** @internal A sample's draw where nothing was drawn. */
export const NO_DRAW = 0xffffffff;

/**
 * @internal What the pick variant wrote in the pixel: the draw's record, the
 * feature, the triangle (`NO_TRIANGLE`: a patch draw's face), the instance;
 * the second target's four floats; the depth (reverse-Z, 0: nothing drawn);
 * and for a triangle, its three stored positions (corner 0, 1, 2).
 */
export interface DomainSample {
  readonly draw: number;
  /** The global feature ID: the face, for a patch draw. */
  readonly feature: number;
  readonly triangle: number;
  readonly instance: number;
  /** A triangle's barycentrics (xyz); a patch draw's (u, v) from its face rect's corner (xy) and the corner (zw). */
  readonly values: readonly [number, number, number, number];
  readonly depth: number;
  /** The triangle's corners, as stored (design coordinates: before the instance and the draw's matrix), 3 each. */
  readonly corners?: ArrayLike<number>;
}

/** @internal A sample from a pick's result words (shaders/pickDomain.slang). */
export function readSample(words: Uint32Array): DomainSample {
  const f = new Float32Array(words.buffer, words.byteOffset, words.length);
  return {
    draw: words[0]!,
    feature: words[1]!,
    triangle: words[2]!,
    instance: words[3]!,
    values: [f[4]!, f[5]!, f[6]!, f[7]!],
    depth: f[8]!,
    ...(words[9] === 1 ? { corners: f.slice(10, 19) } : {}),
  };
}

/** @internal Whether a sample holds a hit: something was drawn there. */
export function sampleHit(sample: DomainSample): boolean {
  return sample.draw !== NO_DRAW && sample.depth > 0;
}

/**
 * Where a hit is in the content's own domain (`CorePick.domain`): the draw,
 * and in it a triangle (its number among the mesh's, and the barycentrics of
 * the point on its three corners) or a b-rep face (the face's index in its
 * form, and the point's (u, v) on the face's surface).
 */
export interface PickDomain {
  readonly draw: DrawHandle;
  readonly kind: "triangle" | "face";
  /** A triangle's number in its mesh. */
  readonly primitive?: number;
  /** A triangle's barycentrics (sum 1), by corner. */
  readonly barycentrics?: readonly [number, number, number];
  /** A face's index in its form. */
  readonly face?: number;
  /** A face's (u, v) on its surface, refined from the GPU's. */
  readonly uv?: readonly [number, number];
  /** The instance, for a draw of instances. */
  readonly instance?: number;
}

/** @internal A hit in the content's own domain, resolved (`resolveDomain`). */
export interface ResolvedDomain {
  readonly domain: PickDomain;
  /** The content's own point, in the draw's anchor's coordinates (float64, m). */
  readonly position: Float64Array;
  readonly accuracy: GeometryAccuracy;
}

/** @internal What `resolveDomain` reads of a world. */
export type DomainWorld = Pick<
  World,
  "drawMatrix" | "hasDraw" | "pickSource" | "raster"
>;

/**
 * Draws whose hits are not a surface of the content's: the bare ellipsoid
 * behind everything, billboards and point sets (their corners are offsets on
 * screen). Their picks keep the depth's position.
 */
const NOT_CONTENT =
  RecordFlags.underlay | RecordFlags.billboard | RecordFlags.points;

/**
 * @internal The content's point for a hit on `draw` (undefined: the depth's position
 * is all there is: a draw that isn't content, a triangle whose corners
 * weren't read, a face without a b-rep). `footprint`: the pixel's size at
 * the hit, m, which the rasterizer's snapping of vertices bounds a
 * triangle's barycentrics by (`SNAP`); 0 where unknown.
 */
export function resolveDomain(
  sample: DomainSample,
  world: DomainWorld,
  draw: DrawHandle,
  localFeature: number,
  footprint = 0,
): ResolvedDomain | undefined {
  if (!world.hasDraw(draw) || sample.draw !== draw.index) {
    return undefined;
  }
  const flags =
    world.raster.recordsU32[draw.index * RECORD_WORDS + FLAGS_WORD]!;
  if ((flags & NOT_CONTENT) !== 0) {
    return undefined;
  }
  const matrix = world.drawMatrix(draw);
  if (!matrix) {
    return undefined;
  }
  if (sample.triangle === NO_TRIANGLE) {
    return resolveFace(sample, world, draw, localFeature, matrix);
  }
  return resolveTriangle(sample, world, draw, matrix, footprint);
}

/** `matrix · (p, 1)`, a column-major 4 × 4. */
function carry(matrix: ArrayLike<number>, p: ArrayLike<number>): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  return Float64Array.of(
    matrix[0]! * x + matrix[4]! * y + matrix[8]! * z + matrix[12]!,
    matrix[1]! * x + matrix[5]! * y + matrix[9]! * z + matrix[13]!,
    matrix[2]! * x + matrix[6]! * y + matrix[10]! * z + matrix[14]!,
  );
}

/** The scale of a column-major 4 × 4's linear part: its largest axis. */
function scaleOf(matrix: ArrayLike<number>): number {
  return Math.max(
    Math.hypot(matrix[0]!, matrix[1]!, matrix[2]!),
    Math.hypot(matrix[4]!, matrix[5]!, matrix[6]!),
    Math.hypot(matrix[8]!, matrix[9]!, matrix[10]!),
  );
}

/** Barycentrics are float32: this fraction of the triangle's longest edge. */
const BARYCENTRIC_ERROR = 2 ** -20;
/**
 * The rasterizer snaps a triangle's vertices to a grid of this many pixels
 * (1/256, the least WebGPU guarantees), which moves a pixel's barycentrics,
 * and the point they give on the triangle, by as much across the screen.
 */
const SNAP = 2 ** -8;

/**
 * @internal A mesh's point: the barycentric weights of the triangle's stored corners
 * (as float64, so the point lies on the triangle's plane to the corners'
 * own float32 rounding), then the instance's and the draw's matrices.
 */
export function resolveTriangle(
  sample: DomainSample,
  world: DomainWorld,
  draw: DrawHandle,
  matrix: ArrayLike<number>,
  footprint = 0,
): ResolvedDomain | undefined {
  const c = sample.corners;
  if (!c || c.length < 9) {
    return undefined;
  }
  const [b0, b1, b2] = sample.values;
  const sum = b0 + b1 + b2;
  if (!(sum > 0) || !Number.isFinite(sum)) {
    return undefined;
  }
  // Interpolation leaves the weights summing to 1 within rounding: exactly 1
  // puts the point in the triangle's plane.
  const w: [number, number, number] = [b0 / sum, b1 / sum, b2 / sum];
  let design = Float64Array.of(
    w[0] * c[0]! + w[1] * c[3]! + w[2] * c[6]!,
    w[0] * c[1]! + w[1] * c[4]! + w[2] * c[7]!,
    w[0] * c[2]! + w[1] * c[5]! + w[2] * c[8]!,
  );
  let edge = Math.max(
    Math.hypot(c[3]! - c[0]!, c[4]! - c[1]!, c[5]! - c[2]!),
    Math.hypot(c[6]! - c[3]!, c[7]! - c[4]!, c[8]! - c[5]!),
    Math.hypot(c[0]! - c[6]!, c[1]! - c[7]!, c[2]! - c[8]!),
  );
  const rows = instanceAffine(world, draw, sample.instance);
  let instanceScale = 1;
  if (rows) {
    const [x, y, z] = design;
    design = Float64Array.of(
      rows[0]! * x! + rows[1]! * y! + rows[2]! * z! + rows[3]!,
      rows[4]! * x! + rows[5]! * y! + rows[6]! * z! + rows[7]!,
      rows[8]! * x! + rows[9]! * y! + rows[10]! * z! + rows[11]!,
    );
    instanceScale = Math.max(
      Math.hypot(rows[0]!, rows[4]!, rows[8]!),
      Math.hypot(rows[1]!, rows[5]!, rows[9]!),
      Math.hypot(rows[2]!, rows[6]!, rows[10]!),
    );
  }
  edge *= instanceScale * scaleOf(matrix);
  const meters = Math.max(edge * BARYCENTRIC_ERROR, footprint * SNAP);
  return {
    domain: {
      draw,
      kind: "triangle",
      primitive: sample.triangle,
      barycentrics: w,
      ...(rows ? { instance: sample.instance } : {}),
    },
    position: carry(matrix, design),
    accuracy: {
      meters,
      exact: false,
      route: "stored triangle, barycentric",
      note:
        `on the content's own triangle: its three stored positions weighted by the pick's barycentrics, ` +
        `which are float32 and as the rasterizer places the triangle's vertices ` +
        `(to 1/256 pixel: ${meters.toPrecision(2)} m here); ` +
        `the mesh's own error against what it stands for is not stated`,
    },
  };
}

/**
 * @internal A patch draw's point: the face's (u, v) from the GPU (a pixel's, off by
 * the dicing's flat cells), refined by the b-rep behind the draw
 * (`refinePick`, `World.setPickSource`) to the face's own point, then the
 * draw's matrix.
 */
export function resolveFace(
  sample: DomainSample,
  world: DomainWorld,
  draw: DrawHandle,
  localFeature: number,
  matrix: ArrayLike<number>,
): ResolvedDomain | undefined {
  const source = world.pickSource(draw);
  if (!source || !(localFeature >= 0) || localFeature === 0xffffffff) {
    return undefined;
  }
  const [du, dv, cu, cv] = sample.values;
  const uv: [number, number] = [du + cu, dv + cv];
  if (!Number.isFinite(uv[0]) || !Number.isFinite(uv[1])) {
    return undefined;
  }
  const refined = source.refinePick(localFeature, { uv });
  if (!refined) {
    return undefined;
  }
  const model = Float64Array.of(
    refined.position[0]! - source.origin[0]!,
    refined.position[1]! - source.origin[1]!,
    refined.position[2]! - source.origin[2]!,
  );
  const scale = scaleOf(matrix);
  return {
    domain: {
      draw,
      kind: "face",
      face: localFeature,
      uv: refined.uv,
    },
    position: carry(matrix, model),
    accuracy: {
      ...refined.accuracy,
      meters: refined.accuracy.meters * scale,
      note: `${refined.accuracy.note}; (u, v) from the pick${refined.inFace ? "" : ", on the face's trim edge"}`,
    },
  };
}
