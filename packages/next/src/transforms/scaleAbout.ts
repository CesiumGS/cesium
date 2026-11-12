// Scale about a point: q = c + S (p - c), S diagonal. Output is affine in
// each factor and each centre coordinate; the inverse is exact.
import type { WarpScale } from "../camera/route.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { SmoothEdge, SmoothSpec } from "../transform/graph.ts";
import {
  edgeOf,
  vec3Specs,
  type Named,
  type TransformDescriptor,
} from "./descriptor.ts";
import { LiveWarp, type ChangeableWarp } from "./liveWarp.ts";
import { scaleAlongAxes } from "./scaleAlongAxes.ts";

type K = "cx" | "cy" | "cz" | "sx" | "sy" | "sz";

const source = `(p, params) => {
  const { cx, cy, cz, sx, sy, sz } = params;
  return [
    cx + sx * (p[0] - cx),
    cy + sy * (p[1] - cy),
    cz + sz * (p[2] - cz),
  ];
}`;

export const scaleAboutDescriptor: TransformDescriptor = {
  id: "scaleAbout",
  params: {
    ...vec3Specs("c", [0, 0, 0], "the fixed point"),
    ...vec3Specs("s", [1, 1, 1], "the factor"),
  },
  forward(p, params, out, jacobian) {
    const { cx, cy, cz, sx, sy, sz } = params as Named<K>;
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    out[0] = cx + sx * (x - cx);
    out[1] = cy + sy * (y - cy);
    out[2] = cz + sz * (z - cz);
    if (jacobian) {
      jacobian.fill(0);
      jacobian[0] = sx;
      jacobian[4] = sy;
      jacobian[8] = sz;
    }
  },
  inverse(q, params, out) {
    const { cx, cy, cz, sx, sy, sz } = params as Named<K>;
    const x = q[0]!;
    const y = q[1]!;
    const z = q[2]!;
    out[0] = cx + (x - cx) / sx;
    out[1] = cy + (y - cy) / sy;
    out[2] = cz + (z - cz) / sz;
  },
  separable: ["cx", "cy", "cz", "sx", "sy", "sz"],
  identity: { sx: 1, sy: 1, sz: 1 },
  source,
  slang: "scaleAboutParity",
};

/**
 * Every point scaled about `center` (default the origin) by `factors`
 * (one number, or one per axis; nonzero for the inverse), as a graph edge.
 * For a smooth frame, `scaleAbout` below is the live helper.
 */
export function scaleAboutEdge(options: {
  center?: ArrayLike<number>;
  factors: number | ArrayLike<number>;
}): SmoothEdge {
  const c = options.center ?? [0, 0, 0];
  const f =
    typeof options.factors === "number"
      ? [options.factors, options.factors, options.factors]
      : options.factors;
  return edgeOf(scaleAboutDescriptor, {
    cx: c[0]!,
    cy: c[1]!,
    cz: c[2]!,
    sx: f[0]!,
    sy: f[1]!,
    sz: f[2]!,
  });
}

/** What `scaleAbout` takes besides its point and factors. */
export interface ScaleAboutOptions {
  /** The ellipsoid whose east, north and up at the point define the axes: WGS84 by default. */
  readonly ellipsoid?: Ellipsoid;
  /** A live number for a slider: see `Warp.scale`. */
  readonly scale?: WarpScale;
}

/** An anisotropic scale about a point; set `factors` to change it. */
export interface ScaleAbout extends ChangeableWarp {
  /** The scale along east, north and up: setting it calls `changed()`. */
  factors: readonly [number, number, number];
}

function checkFactors(
  factors: number | ArrayLike<number>,
): [number, number, number] {
  const f: number[] =
    typeof factors === "number"
      ? [factors, factors, factors]
      : [factors[0]!, factors[1]!, factors[2]!];
  for (const v of f) {
    if (!(Number.isFinite(v) && v > 0)) {
      throw new RangeError(
        `scaleAbout: factors must be positive finite numbers, got ${f.join(", ")}`,
      );
    }
  }
  return f as [number, number, number];
}

class ScaleAboutImpl extends LiveWarp implements ScaleAbout {
  readonly scale: WarpScale | undefined;
  private readonly center: Float64Array;
  /** Column-major east, north, up. */
  private readonly basis = new Float64Array(9);
  private current: [number, number, number];
  private forwardMatrix = new Float64Array(9);
  private inverseMatrix = new Float64Array(9);
  private smoothRevision = -1;
  private smoothSpec: SmoothSpec | undefined;

  constructor(
    point: ArrayLike<number>,
    factors: number | ArrayLike<number>,
    options: ScaleAboutOptions,
  ) {
    super();
    this.scale = options.scale;
    this.center = Float64Array.from([point[0]!, point[1]!, point[2]!]);
    if (!this.center.every(Number.isFinite)) {
      throw new RangeError("scaleAbout: the point must be finite");
    }
    const enu = eastNorthUpToFixedFrame(
      this.center,
      options.ellipsoid ?? Ellipsoid.WGS84,
      new Float64Array(16),
    );
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        this.basis[c * 3 + r] = enu[c * 4 + r]!;
      }
    }
    this.current = checkFactors(factors);
    this.rebuild();
  }

  get factors(): readonly [number, number, number] {
    return this.current;
  }

  /** The built-in scale along the same axes, for the compiled route. */
  get smooth(): SmoothSpec {
    if (this.smoothRevision !== this.ownRevision) {
      this.smoothRevision = this.ownRevision;
      this.smoothSpec = scaleAlongAxes({
        center: this.center,
        factors: this.current,
        axes: this.basis,
      }).spec;
    }
    return this.smoothSpec!;
  }

  set factors(value: readonly [number, number, number]) {
    this.current = checkFactors(value);
    this.rebuild();
    this.changed();
  }

  get description(): string {
    const [e, n, u] = this.current;
    const c = Array.from(this.center, (v) => Math.round(v * 100) / 100);
    return `scale east × ${e}, north × ${n}, up × ${u} about (${c.join(", ")}) m`;
  }

  /** E·diag(f)·Eᵀ and E·diag(1/f)·Eᵀ. */
  private rebuild(): void {
    const b = this.basis;
    for (let k = 0; k < 2; k++) {
      const m = k === 0 ? this.forwardMatrix : this.inverseMatrix;
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          let sum = 0;
          for (let a = 0; a < 3; a++) {
            const f = k === 0 ? this.current[a]! : 1 / this.current[a]!;
            sum += b[a * 3 + r]! * f * b[a * 3 + c]!;
          }
          m[c * 3 + r] = sum;
        }
      }
    }
  }

  private apply(
    m: Float64Array,
    p: ArrayLike<number>,
    out: Float64Array,
  ): Float64Array {
    const c = this.center;
    const x = p[0]! - c[0]!;
    const y = p[1]! - c[1]!;
    const z = p[2]! - c[2]!;
    out[0] = c[0]! + m[0]! * x + m[3]! * y + m[6]! * z;
    out[1] = c[1]! + m[1]! * x + m[4]! * y + m[7]! * z;
    out[2] = c[2]! + m[2]! * x + m[5]! * y + m[8]! * z;
    return out;
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    this.apply(this.forwardMatrix, p, out);
    jacobian?.set(this.forwardMatrix);
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array =>
    this.apply(this.inverseMatrix, q, out);
}

/**
 * An anisotropic scale about `point` (metres, in the parent frame; a
 * position on the body), along the local east, north and up there:
 * `q = point + E·diag(factors)·Eᵀ·(p − point)`. `factors` is one number or
 * three (east, north, up), each positive. Affine, so the Jacobian is the
 * matrix, constant, and the inverse is exact. Give `scale` for a slider.
 * Place it over the content it scales (`smoothFrame`).
 */
export function scaleAbout(
  point: ArrayLike<number>,
  factors: number | ArrayLike<number>,
  options: ScaleAboutOptions = {},
): ScaleAbout {
  return new ScaleAboutImpl(point, factors, options);
}
