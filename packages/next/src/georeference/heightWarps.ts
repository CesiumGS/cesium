// Warps of height above a reference surface: vertical exaggeration and a
// constant lift (plan §13.26). A point p is carried along the surface's
// normal through it, from height h above the surface to h′(h), so
// q = p + (h′ − h)·n, with the exact Jacobian
//
//   J = (I + hS)⁻¹ (I + h′S − nnᵀ) + (dh′/dh) nnᵀ
//
// where n is the unit normal at p's foot on the surface and S its shape
// operator there (the derivative of n along the surface; S·n = 0). Along n
// the stretch is dh′/dh. Along a principal direction of curvature κ it is
// (1 + h′κ)/(1 + hκ): a sphere of radius R gives (R + h′)/(R + h), a plane
// gives 1. The foot's normal is the same for p and q (they share the
// normal line), so the inverse is exact: it reads the height of q, undoes
// h′ and steps back along n. The formula is a closed form that holds on an
// ellipsoid with three different radii and has no singularity at a pole
// (it uses no latitude or longitude); it fails only where 1 + hκ = 0, a
// centre of curvature, deep inside the body.
import { Ellipsoid } from "../math/ellipsoid.ts";
import type { HeightScale, WarpScale } from "../camera/route.ts";
import type { SmoothSpec } from "../transform/graph.ts";
import { LiveWarp, type ChangeableWarp } from "../transforms/liveWarp.ts";
import { heightOffsetEdge } from "./heightOffset.ts";
import { verticalExaggerationEdge } from "./verticalExaggeration.ts";

/** A vertical exaggeration scales heights wherever content is: the built-in's ceiling, m, above any of it. */
const UNBOUNDED_CEILING = 1e9;

/**
 * The surface heights are measured from: the WGS84 ellipsoid by default,
 * `{ ellipsoid }` another, a sphere about the origin, or a plane. A plane's
 * `origin` (a point on it, default the origin) and `normal` (default
 * +z, the side heights are positive on) are in the parent frame's metres.
 */
export type ReferenceSurface =
  | "ellipsoid"
  | { readonly ellipsoid: Ellipsoid }
  | { readonly sphere: number }
  | {
      readonly plane: {
        readonly origin?: ArrayLike<number>;
        readonly normal?: ArrayLike<number>;
      };
    };

/** A reference surface: where a point's foot is and how the normal turns. */
interface Surface {
  readonly name: string;
  /** The radii of the ellipsoid or sphere, when it is one: the engine exaggerates terrain on it exactly (`HeightScale`). */
  readonly radii?: readonly [number, number, number];
  /** Writes p's foot and its unit normal, and returns p's signed height above the surface. */
  locate(p: ArrayLike<number>, foot: Float64Array, n: Float64Array): number;
  /** Writes the shape operator at a foot (column-major 3×3, symmetric, zero along `n`). */
  shape(foot: Float64Array, n: Float64Array, out: Float64Array): void;
}

/**
 * p's foot on the ellipsoid: the point of the surface along its normal
 * through p, written to `foot` (the 1.x algorithm, Newton on the
 * multiplier λ of p = foot + λ·gradient). `Ellipsoid.scaleToGeodeticSurface`
 * stops at |f| ≤ 1e-12, which leaves a few micrometres at Earth scale, and
 * this keeps iterating to float64's rounding, as the exact warps are
 * checked to a micrometre or better. Near the centre it defers to the
 * ellipsoid's own.
 */
const probe = new Float64Array(3);
const projector = new Float64Array(9);

function footOf(
  ellipsoid: Ellipsoid,
  p: ArrayLike<number>,
  foot: Float64Array,
): Float64Array | undefined {
  const px = p[0]!;
  const py = p[1]!;
  const pz = p[2]!;
  probe[0] = px;
  probe[1] = py;
  probe[2] = pz;
  const start = ellipsoid.scaleToGeodeticSurface(probe, foot);
  if (start === undefined) {
    return undefined;
  }
  const o = ellipsoid.oneOverRadii;
  const os = ellipsoid.oneOverRadiiSquared;
  const x2 = px * px * o[0]! * o[0]!;
  const y2 = py * py * o[1]! * o[1]!;
  const z2 = pz * pz * o[2]! * o[2]!;
  if (x2 + y2 + z2 < 0.1) {
    return foot;
  }
  // λ from the foot the ellipsoid found, by its largest component.
  const ax = Math.abs(px);
  const ay = Math.abs(py);
  const az = Math.abs(pz);
  const axis = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
  let lambda = (p[axis]! / foot[axis]! - 1) / os[axis]!;
  for (let i = 0; i < 30; i++) {
    const xm = 1 / (1 + lambda * os[0]!);
    const ym = 1 / (1 + lambda * os[1]!);
    const zm = 1 / (1 + lambda * os[2]!);
    const func = x2 * xm * xm + y2 * ym * ym + z2 * zm * zm - 1;
    const den =
      x2 * xm ** 3 * os[0]! + y2 * ym ** 3 * os[1]! + z2 * zm ** 3 * os[2]!;
    const correction = func / (-2 * den);
    lambda -= correction;
    if (!(Math.abs(correction) > 4 * Number.EPSILON * Math.abs(lambda))) {
      break;
    }
  }
  foot[0] = px / (1 + lambda * os[0]!);
  foot[1] = py / (1 + lambda * os[1]!);
  foot[2] = pz / (1 + lambda * os[2]!);
  return foot;
}

function ellipsoidSurface(ellipsoid: Ellipsoid, name: string): Surface {
  const inv = ellipsoid.oneOverRadiiSquared;
  return {
    name,
    radii: [ellipsoid.radii[0]!, ellipsoid.radii[1]!, ellipsoid.radii[2]!],
    locate(p, foot, n) {
      if (footOf(ellipsoid, p, foot) === undefined) {
        throw new RangeError(
          "a point at the body's centre has no height above its surface",
        );
      }
      const mx = foot[0]! * inv[0]!;
      const my = foot[1]! * inv[1]!;
      const mz = foot[2]! * inv[2]!;
      const length = Math.hypot(mx, my, mz);
      n[0] = mx / length;
      n[1] = my / length;
      n[2] = mz / length;
      return (
        n[0] * (p[0]! - foot[0]!) +
        n[1] * (p[1]! - foot[1]!) +
        n[2] * (p[2]! - foot[2]!)
      );
    },
    // The implicit surface's shape operator: P·diag(1/radii²)·P / |m|, with
    // m = diag(1/radii²)·foot (the gradient is 2m), and P = I − nnᵀ.
    shape(foot, n, out) {
      const mx = foot[0]! * inv[0]!;
      const my = foot[1]! * inv[1]!;
      const mz = foot[2]! * inv[2]!;
      const length = Math.hypot(mx, my, mz);
      // P = I − nnᵀ, symmetric.
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          projector[c * 3 + r] = (r === c ? 1 : 0) - n[r]! * n[c]!;
        }
      }
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          let sum = 0;
          for (let a = 0; a < 3; a++) {
            sum += projector[a * 3 + r]! * inv[a]! * projector[a * 3 + c]!;
          }
          out[c * 3 + r] = sum / length;
        }
      }
    },
  };
}

function sphereSurface(radius: number): Surface {
  return {
    name: `a sphere of radius ${radius} m`,
    radii: [radius, radius, radius],
    locate(p, foot, n) {
      const x = p[0]!;
      const y = p[1]!;
      const z = p[2]!;
      const r = Math.hypot(x, y, z);
      if (!(r > 0)) {
        throw new RangeError(
          "a point at the body's centre has no height above its surface",
        );
      }
      n[0] = x / r;
      n[1] = y / r;
      n[2] = z / r;
      foot[0] = n[0] * radius;
      foot[1] = n[1] * radius;
      foot[2] = n[2] * radius;
      return r - radius;
    },
    shape(_foot, n, out) {
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          out[c * 3 + r] = ((r === c ? 1 : 0) - n[r]! * n[c]!) / radius;
        }
      }
    },
  };
}

function planeSurface(
  origin: ArrayLike<number>,
  normal: ArrayLike<number>,
): Surface {
  const length = Math.hypot(normal[0]!, normal[1]!, normal[2]!);
  if (!(Number.isFinite(length) && length > 0)) {
    throw new RangeError("a plane's normal must be a finite, non-zero vector");
  }
  const u = [normal[0]! / length, normal[1]! / length, normal[2]! / length];
  const o = [origin[0]!, origin[1]!, origin[2]!];
  return {
    name: `the plane through (${o.join(", ")}) with normal (${u.map((v) => Math.round(v * 1e6) / 1e6).join(", ")})`,
    locate(p, foot, n) {
      const h =
        u[0]! * (p[0]! - o[0]!) +
        u[1]! * (p[1]! - o[1]!) +
        u[2]! * (p[2]! - o[2]!);
      n[0] = u[0]!;
      n[1] = u[1]!;
      n[2] = u[2]!;
      foot[0] = p[0]! - h * u[0]!;
      foot[1] = p[1]! - h * u[1]!;
      foot[2] = p[2]! - h * u[2]!;
      return h;
    },
    shape(_foot, _n, out) {
      out.fill(0);
    },
  };
}

const WGS84_RADII = Ellipsoid.WGS84.radii;

function describeEllipsoid(e: Ellipsoid): string {
  const same = [0, 1, 2].every((i) => e.radii[i] === WGS84_RADII[i]);
  return same
    ? "the WGS84 ellipsoid"
    : `the ellipsoid of radii ${Array.from(e.radii).join(", ")} m`;
}

function surfaceOf(reference: ReferenceSurface): Surface {
  if (reference === "ellipsoid") {
    return ellipsoidSurface(
      Ellipsoid.WGS84,
      describeEllipsoid(Ellipsoid.WGS84),
    );
  }
  if ("ellipsoid" in reference) {
    return ellipsoidSurface(
      reference.ellipsoid,
      describeEllipsoid(reference.ellipsoid),
    );
  }
  if ("sphere" in reference) {
    if (!(Number.isFinite(reference.sphere) && reference.sphere > 0)) {
      throw new RangeError(
        `a sphere's radius must be a positive number of metres, got ${reference.sphere}`,
      );
    }
    return sphereSurface(reference.sphere);
  }
  return planeSurface(
    reference.plane.origin ?? [0, 0, 0],
    reference.plane.normal ?? [0, 0, 1],
  );
}

/** Column-major 3×3 inverse; throws where it is singular (a centre of curvature). */
function invert3(m: Float64Array, out: Float64Array): void {
  const a = m[0]!;
  const d = m[1]!;
  const g = m[2]!;
  const b = m[3]!;
  const e = m[4]!;
  const h = m[5]!;
  const c = m[6]!;
  const f = m[7]!;
  const i = m[8]!;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!(Math.abs(det) > 0) || !Number.isFinite(det)) {
    throw new RangeError(
      "the point is at a centre of curvature of the reference surface, where the warp has no Jacobian",
    );
  }
  out[0] = (e * i - f * h) / det;
  out[1] = -(d * i - f * g) / det;
  out[2] = (d * h - e * g) / det;
  out[3] = -(b * i - c * h) / det;
  out[4] = (a * i - c * g) / det;
  out[5] = -(a * h - b * g) / det;
  out[6] = (b * f - c * e) / det;
  out[7] = -(a * f - c * d) / det;
  out[8] = (a * e - b * d) / det;
}

/** The warps' common part: a height map h ↦ h′ along the reference's normals. */
abstract class HeightWarp extends LiveWarp {
  readonly scale: WarpScale | undefined;
  private readonly foot = new Float64Array(3);
  private readonly n = new Float64Array(3);
  private readonly s = new Float64Array(9);
  private readonly a = new Float64Array(9);
  private readonly ainv = new Float64Array(9);
  private readonly b = new Float64Array(9);

  constructor(
    private readonly surface: Surface,
    scale: WarpScale | undefined,
  ) {
    super();
    this.scale = scale;
  }

  protected get surfaceName(): string {
    return this.surface.name;
  }

  /** The reference's radii when it is an ellipsoid or a sphere. */
  protected get surfaceRadii(): readonly [number, number, number] | undefined {
    return this.surface.radii;
  }

  /** h′ − h at height h. */
  protected abstract lift(h: number): number;
  /** dh′/dh at height h. */
  protected abstract slope(h: number): number;
  /** The height h whose h′ is `h2`. */
  protected abstract unlift(h2: number): number;

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const { foot, n } = this;
    const h = this.surface.locate(p, foot, n);
    const d = this.lift(h);
    out[0] = x + d * n[0]!;
    out[1] = y + d * n[1]!;
    out[2] = z + d * n[2]!;
    if (jacobian) {
      const { s, a, ainv, b } = this;
      const h2 = h + d;
      const k = this.slope(h);
      this.surface.shape(foot, n, s);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          const i = c * 3 + r;
          const id = r === c ? 1 : 0;
          const nn = n[r]! * n[c]!;
          a[i] = id + h * s[i]!;
          b[i] = id + h2 * s[i]! - nn;
        }
      }
      invert3(a, ainv);
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          let sum = 0;
          for (let m = 0; m < 3; m++) {
            sum += ainv[m * 3 + r]! * b[c * 3 + m]!;
          }
          jacobian[c * 3 + r] = sum + k * n[r]! * n[c]!;
        }
      }
    }
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array => {
    const x = q[0]!;
    const y = q[1]!;
    const z = q[2]!;
    const { foot, n } = this;
    const h2 = this.surface.locate(q, foot, n);
    const d = this.unlift(h2) - h2;
    out[0] = x + d * n[0]!;
    out[1] = y + d * n[1]!;
    out[2] = z + d * n[2]!;
    return out;
  };
}

/** What `verticalExaggeration` takes. */
export interface VerticalExaggerationOptions {
  /**
   * The heights' multiplier at `scale` 1 (at the warp's full strength),
   * positive: 10 draws heights ten times as tall, 1 changes nothing.
   * Without `scale` the warp always applies in full.
   */
  readonly factor: number;
  /** What heights are above: the WGS84 ellipsoid by default. */
  readonly reference?: ReferenceSurface;
  /** The height that stays where it is, m above the reference: 0 by default. Heights below it are scaled the same way. */
  readonly baseHeight?: number;
  /**
   * A live number for a slider (a world's `PlacementParameter`, range
   * [0, 1]): at scale `s` heights are multiplied by `1 + s·(factor − 1)`.
   * The engine fits the warp's displacement once and scales it, so moving
   * the slider refits nothing.
   */
  readonly scale?: WarpScale;
}

/** Heights above a reference surface, multiplied; set `factor` or `baseHeight` to change it. */
export interface VerticalExaggeration extends ChangeableWarp {
  /** The multiplier at scale 1: setting it calls `changed()`. */
  factor: number;
  /** The height that stays put, m: setting it calls `changed()`. */
  baseHeight: number;
}

function checkFactor(factor: number): number {
  if (!(Number.isFinite(factor) && factor > 0)) {
    throw new RangeError(
      `verticalExaggeration: factor must be a positive number, got ${factor} (a zero or negative factor is not injective)`,
    );
  }
  return factor;
}

function checkMetres(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number of metres`);
  }
  return value;
}

class VerticalExaggerationImpl
  extends HeightWarp
  implements VerticalExaggeration
{
  private k: number;
  private base: number;
  private smoothRevision = -1;
  private smoothSpec: SmoothSpec | undefined;

  constructor(options: VerticalExaggerationOptions) {
    super(surfaceOf(options.reference ?? "ellipsoid"), options.scale);
    this.k = checkFactor(options.factor);
    this.base = checkMetres("baseHeight", options.baseHeight ?? 0);
  }

  get factor(): number {
    return this.k;
  }

  /** Declares the warp a height scale on an ellipsoid or sphere reference (`HeightScale`): the engine exaggerates terrain exactly. */
  get heightScale(): HeightScale | undefined {
    const radii = this.surfaceRadii;
    return radii
      ? { kind: "heightScale", radii, factor: this.k, baseHeight: this.base }
      : undefined;
  }

  /**
   * The georeference built-in over the same ellipsoid, for the compiled
   * route: a ceiling so high that heights are scaled everywhere content is
   * (this warp has none). A plane reference has no built-in: fitted.
   */
  get smooth(): SmoothSpec | undefined {
    const radii = this.surfaceRadii;
    if (!radii) {
      return undefined;
    }
    if (this.smoothRevision !== this.ownRevision) {
      this.smoothRevision = this.ownRevision;
      this.smoothSpec = verticalExaggerationEdge({
        radii,
        factor: this.k,
        ceiling: UNBOUNDED_CEILING,
        baseHeight: this.base,
      }).spec;
    }
    return this.smoothSpec;
  }

  set factor(value: number) {
    this.k = checkFactor(value);
    this.changed();
  }

  get baseHeight(): number {
    return this.base;
  }

  set baseHeight(value: number) {
    this.base = checkMetres("baseHeight", value);
    this.changed();
  }

  get description(): string {
    return `vertical exaggeration × ${this.k} of height above ${this.surfaceName}${this.base !== 0 ? `, about ${this.base} m` : ""}`;
  }

  protected lift(h: number): number {
    return (this.k - 1) * (h - this.base);
  }

  protected slope(): number {
    return this.k;
  }

  protected unlift(h2: number): number {
    return this.base + (h2 - this.base) / this.k;
  }
}

/**
 * Height above a reference surface multiplied by `factor` (about
 * `baseHeight`): a point at height h goes to `baseHeight + factor·(h −
 * baseHeight)` along the surface's normal, keeping its latitude and
 * longitude (on an ellipsoid) or its place along the surface. The Jacobian
 * and the inverse are exact closed forms (see the file's header), at any
 * height and at the poles. Place it over the content it exaggerates
 * (`smoothFrame(name, parent, verticalExaggeration(…))`): that content keeps
 * its true coordinates and is drawn through the edge.
 *
 * For a slider, give `scale` (a `PlacementParameter` in [0, 1]) and `factor`
 * the largest multiplier: the heights are multiplied by `1 + s(factor − 1)`.
 */
export function verticalExaggeration(
  options: VerticalExaggerationOptions,
): VerticalExaggeration {
  return new VerticalExaggerationImpl(options);
}

/** What `heightOffset` takes. */
export interface HeightOffsetOptions {
  /** What heights are above: the WGS84 ellipsoid by default. */
  readonly reference?: ReferenceSurface;
  /** A live number for a slider: at scale `s` the offset is `s·metres`. */
  readonly scale?: WarpScale;
}

/** A constant offset along the normal; set `metres` to change it. */
export interface HeightOffset extends ChangeableWarp {
  /** The offset, m, along the normal (up is positive): setting it calls `changed()`. */
  metres: number;
}

class HeightOffsetImpl extends HeightWarp implements HeightOffset {
  private offset: number;
  private smoothRevision = -1;
  private smoothSpec: SmoothSpec | undefined;

  constructor(metres: number, options: HeightOffsetOptions) {
    super(surfaceOf(options.reference ?? "ellipsoid"), options.scale);
    this.offset = checkMetres("heightOffset: metres", metres);
  }

  get metres(): number {
    return this.offset;
  }

  set metres(value: number) {
    this.offset = checkMetres("heightOffset: metres", value);
    this.changed();
  }

  /** The georeference built-in over the same ellipsoid, for the compiled route; a plane reference is fitted. */
  get smooth(): SmoothSpec | undefined {
    const radii = this.surfaceRadii;
    if (!radii) {
      return undefined;
    }
    if (this.smoothRevision !== this.ownRevision) {
      this.smoothRevision = this.ownRevision;
      this.smoothSpec = heightOffsetEdge({ radii, offset: this.offset }).spec;
    }
    return this.smoothSpec;
  }

  get description(): string {
    return `height offset of ${this.offset} m along the normal to ${this.surfaceName}`;
  }

  protected lift(): number {
    return this.offset;
  }

  protected slope(): number {
    return 1;
  }

  protected unlift(h2: number): number {
    return h2 - this.offset;
  }
}

/**
 * Every point moved `metres` along the normal of a reference surface (up
 * for positive): lifts content clear of terrain, or sinks it. The
 * Jacobian and the inverse are exact. Place it over the content it lifts
 * (`smoothFrame`).
 */
export function heightOffset(
  metres: number,
  options: HeightOffsetOptions = {},
): HeightOffset {
  return new HeightOffsetImpl(metres, options);
}
