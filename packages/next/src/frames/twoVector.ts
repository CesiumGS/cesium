import type { Ellipsoid } from "../math/ellipsoid.ts";
import type { Instant } from "../time/Instant.ts";
import {
  Frame,
  frameTransform,
  routeRevision,
  type FrameOptions,
} from "./Frame.ts";
import { derivative } from "./motion.ts";
import { rotationPart } from "./matrix.ts";

/** An axis of a two-vector frame: a sign and a letter. */
export type Axis = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";

/**
 * A vector that defines an axis, after SPICE's two-vector frames and always
 * geometric (SPICE's `ABCORR = 'NONE'`):
 *
 * - `position`: `target`'s origin seen from `observer`'s origin;
 * - `velocity`: the derivative, taken in `frame`, of that position;
 * - `constant`: a fixed vector in `frame`;
 * - `nearPoint`: from `observer`'s origin to the nearest point of
 *   `ellipsoid`, in `bodyFixed`.
 *
 * (`observer` here is SPICE's sense: the origin a vector starts at.)
 */
export type VectorDefinition =
  | { kind: "position"; target: Frame; observer: Frame }
  | { kind: "velocity"; target: Frame; observer: Frame; frame: Frame }
  | { kind: "constant"; vector: ArrayLike<number>; frame: Frame }
  | {
      kind: "nearPoint";
      observer: Frame;
      bodyFixed: Frame;
      ellipsoid: Ellipsoid;
    };

/** The two vectors, the axes they define, and an optional freeze instant. */
export interface TwoVectorDefinition {
  readonly primary: { readonly axis: Axis; readonly vector: VectorDefinition };
  readonly secondary: {
    readonly axis: Axis;
    readonly vector: VectorDefinition;
  };
  /** Evaluate once at this instant; re-freeze only when an input's revision goes up. */
  readonly freeze?: Instant;
  /** Closest the vectors may come to parallel or antiparallel, radians (default 0.001, SPICE's). */
  readonly minimumAngle?: number;
}

/**
 * Thrown when a two-vector frame's vectors are closer than `minimumAngle`
 * to parallel or antiparallel, or when either is zero.
 */
export class TwoVectorDegenerateError extends Error {
  readonly frame: string;
  readonly angle: number;
  readonly minimum: number;
  readonly at: Instant;

  constructor(frame: string, angle: number, minimum: number, at: Instant) {
    super(
      `Frame "${frame}": its two vectors are degenerate at this instant (the angle between them is ${angle} rad; the least allowed is ${minimum} rad from parallel or antiparallel)`,
    );
    this.name = "TwoVectorDegenerateError";
    this.frame = frame;
    this.angle = angle;
    this.minimum = minimum;
    this.at = at;
  }
}

const INDEX = { X: 0, Y: 1, Z: 2 } as const;
const axisIndex = (a: Axis): number => INDEX[a[1] as "X" | "Y" | "Z"];
const axisSign = (a: Axis): number => (a[0] === "-" ? -1 : 1);

const columnMajor = new Float64Array(16);
const here = new Float64Array(16);
const rot = new Float64Array(9);

function scale(v: Float64Array, k: number): void {
  v[0] = v[0]! * k;
  v[1] = v[1]! * k;
  v[2] = v[2]! * k;
}

/** `R · v`, with `R` row-major. */
function rotate(r: Float64Array, v: Float64Array, out: Float64Array): void {
  const x = v[0]!,
    y = v[1]!,
    z = v[2]!;
  out[0] = r[0]! * x + r[1]! * y + r[2]! * z;
  out[1] = r[3]! * x + r[4]! * y + r[5]! * z;
  out[2] = r[6]! * x + r[7]! * y + r[8]! * z;
}

/** The rotation part, row-major, taking `from`'s directions to `to`'s. */
function rotationBetween(
  from: Frame,
  to: Frame,
  instant: Instant,
  out: Float64Array,
): Float64Array {
  return rotationPart(frameTransform(from, to, instant, columnMajor), out);
}

/** `target`'s origin in `observer`'s coordinates, written to `out`. */
function originIn(
  target: Frame,
  observer: Frame,
  instant: Instant,
  out: Float64Array,
): void {
  const m = frameTransform(target, observer, instant, here);
  out[0] = m[12]!;
  out[1] = m[13]!;
  out[2] = m[14]!;
}

/** The reference frames a vector's value depends on. */
function inputs(v: VectorDefinition): Frame[] {
  switch (v.kind) {
    case "position":
      return [v.target, v.observer];
    case "velocity":
      return [v.target, v.observer, v.frame];
    case "constant":
      return [v.frame];
    case "nearPoint":
      return [v.observer, v.bodyFixed];
  }
}

/** The vector's value at `instant`, in `parent`'s axes. */
function evaluate(
  v: VectorDefinition,
  parent: Frame,
  instant: Instant,
  out: Float64Array,
): void {
  const local = new Float64Array(3);
  switch (v.kind) {
    case "position": {
      originIn(v.target, v.observer, instant, local);
      rotate(rotationBetween(v.observer, parent, instant, rot), local, out);
      return;
    }
    case "velocity": {
      // The position of the target from the observer, in `frame`'s axes.
      const r = new Float64Array(9);
      derivative(
        (i, o) => {
          originIn(v.target, v.observer, i, o);
          rotate(rotationBetween(v.observer, v.frame, i, r), o, o);
        },
        instant,
        3,
        local,
      );
      rotate(rotationBetween(v.frame, parent, instant, rot), local, out);
      return;
    }
    case "constant": {
      local[0] = v.vector[0]!;
      local[1] = v.vector[1]!;
      local[2] = v.vector[2]!;
      rotate(rotationBetween(v.frame, parent, instant, rot), local, out);
      return;
    }
    case "nearPoint": {
      const p = new Float64Array(3);
      originIn(v.observer, v.bodyFixed, instant, p);
      const surface = v.ellipsoid.scaleToGeodeticSurface(
        p,
        new Float64Array(3),
      );
      if (surface === undefined) {
        throw new RangeError(
          "a near-point vector has no direction at the ellipsoid's centre",
        );
      }
      local[0] = surface[0]! - p[0]!;
      local[1] = surface[1]! - p[1]!;
      local[2] = surface[2]! - p[2]!;
      rotate(rotationBetween(v.bodyFixed, parent, instant, rot), local, out);
      return;
    }
  }
}

/**
 * A reference frame whose axes come from two vectors (SPICE's two-vector
 * frames): the primary axis along the primary vector, the secondary in
 * their plane on the secondary vector's side, the third completing a
 * right-handed set. Its origin is its parent's (plan's call 2).
 */
export class TwoVectorFrame<N extends string = string> extends Frame<N> {
  readonly definition: TwoVectorDefinition;
  private readonly watched: Frame[];
  private frozen: Float64Array | undefined;
  private frozenRevision = -1;

  constructor(
    name: N,
    parent: Frame,
    definition: TwoVectorDefinition,
    options?: Pick<FrameOptions, "accuracy">,
  ) {
    const minimum = definition.minimumAngle ?? 0.001;
    const pi = axisIndex(definition.primary.axis);
    const si = axisIndex(definition.secondary.axis);
    if (pi === si) {
      throw new RangeError(
        `Frame "${name}": the primary and secondary axes are the same axis (${definition.primary.axis}, ${definition.secondary.axis})`,
      );
    }
    if (!(Number.isFinite(minimum) && minimum > 0)) {
      throw new RangeError(
        `Frame "${name}": minimumAngle must be finite and positive, not ${minimum}`,
      );
    }
    const box: { self?: TwoVectorFrame<N> } = {};
    super(name, parent, (instant, out) => box.self!.fill(instant, out), {
      cache: false,
      accuracy: options?.accuracy ?? {
        byDefinition: true,
        note: "exact by definition: a two-vector frame's axes are defined by its two vectors; their data errors are on the route's other edges",
      },
    });
    box.self = this;
    this.definition = definition;
    const seen = new Set<Frame>();
    for (const v of [definition.primary.vector, definition.secondary.vector]) {
      for (const f of inputs(v)) {
        seen.add(f);
      }
    }
    this.watched = [...seen];
  }

  /** Its own revision plus the route revisions of every reference frame its vectors name. */
  override get revision(): number {
    let sum = super.revision;
    for (const f of this.watched ?? []) {
      sum += routeRevision(f, this.parent!);
    }
    return sum;
  }

  private fill(instant: Instant, out: Float64Array): void {
    const d = this.definition;
    if (d.freeze === undefined) {
      this.matrixAt(instant, instant, out);
      return;
    }
    const revision = this.revision;
    if (this.frozen === undefined || this.frozenRevision !== revision) {
      const m = new Float64Array(16);
      this.matrixAt(d.freeze, instant, m);
      this.frozen = m;
      this.frozenRevision = revision;
    }
    out.set(this.frozen);
  }

  /** The matrix from the vectors' values at `at`; `shown` is the instant an error names. */
  private matrixAt(at: Instant, shown: Instant, out: Float64Array): void {
    const d = this.definition;
    const u = new Float64Array(3);
    const s = new Float64Array(3);
    evaluate(d.primary.vector, this.parent!, at, u);
    evaluate(d.secondary.vector, this.parent!, at, s);
    const nu = Math.hypot(u[0]!, u[1]!, u[2]!);
    const ns = Math.hypot(s[0]!, s[1]!, s[2]!);
    const minimum = d.minimumAngle ?? 0.001;
    if (!(nu > 0 && ns > 0) || !Number.isFinite(nu + ns)) {
      throw new TwoVectorDegenerateError(this.name, Number.NaN, minimum, shown);
    }
    scale(u, 1 / nu);
    scale(s, 1 / ns);
    const cross = Math.hypot(
      u[1]! * s[2]! - u[2]! * s[1]!,
      u[2]! * s[0]! - u[0]! * s[2]!,
      u[0]! * s[1]! - u[1]! * s[0]!,
    );
    const dot = u[0]! * s[0]! + u[1]! * s[1]! + u[2]! * s[2]!;
    const angle = Math.atan2(cross, dot);
    if (angle < minimum || Math.PI - angle < minimum) {
      throw new TwoVectorDegenerateError(this.name, angle, minimum, shown);
    }
    // The secondary's part perpendicular to the primary.
    const t = new Float64Array(3);
    for (let k = 0; k < 3; k++) {
      t[k] = s[k]! - dot * u[k]!;
    }
    scale(t, 1 / Math.hypot(t[0]!, t[1]!, t[2]!));
    const pi = axisIndex(d.primary.axis);
    const si = axisIndex(d.secondary.axis);
    const ti = 3 - pi - si;
    const pa = axisSign(d.primary.axis);
    const sa = axisSign(d.secondary.axis);
    const column = (i: number, v: Float64Array, sign: number) => {
      out[i * 4] = sign * v[0]!;
      out[i * 4 + 1] = sign * v[1]!;
      out[i * 4 + 2] = sign * v[2]!;
      out[i * 4 + 3] = 0;
    };
    column(pi, u, pa);
    column(si, t, sa);
    const a = [out[pi * 4]!, out[pi * 4 + 1]!, out[pi * 4 + 2]!];
    const b = [out[si * 4]!, out[si * 4 + 1]!, out[si * 4 + 2]!];
    // (pi, si, ti) is cyclic when si = pi + 1 (mod 3): then ti = pi × si.
    const cyclic = (pi + 1) % 3 === si;
    const x = cyclic ? a : b;
    const y = cyclic ? b : a;
    out[ti * 4] = x[1]! * y[2]! - x[2]! * y[1]!;
    out[ti * 4 + 1] = x[2]! * y[0]! - x[0]! * y[2]!;
    out[ti * 4 + 2] = x[0]! * y[1]! - x[1]! * y[0]!;
    out[ti * 4 + 3] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    for (let n = 0; n < 12; n++) {
      if (!Number.isFinite(out[n]!)) {
        throw new TwoVectorDegenerateError(
          this.name,
          Number.NaN,
          minimum,
          shown,
        );
      }
    }
  }
}

/**
 * A two-vector reference frame under `parent`: the primary axis along the
 * primary vector, the secondary axis in the plane of the two vectors on the
 * secondary's side, the third completing a right-handed set. Its origin is
 * `parent`'s. Exact by definition unless `options.accuracy` states more
 * (plan's call 5). With `freeze`, the matrix is the one at that instant.
 */
export function twoVectorFrame<N extends string>(
  name: N,
  parent: Frame,
  definition: TwoVectorDefinition,
  options?: Pick<FrameOptions, "accuracy">,
): TwoVectorFrame<N> {
  return new TwoVectorFrame(name, parent, definition, options);
}

class AxesFrame<N extends string> extends Frame<N> {
  constructor(
    name: N,
    private readonly origin: Frame,
    private readonly axes: Frame,
  ) {
    super(
      name,
      origin,
      (instant, out) => {
        const r = rotationPart(frameTransform(axes, origin, instant, here));
        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 3; row++) {
            out[col * 4 + row] = r[row * 3 + col]!;
          }
          out[col * 4 + 3] = 0;
        }
        out[12] = out[13] = out[14] = 0;
        out[15] = 1;
      },
      {
        accuracy: {
          byDefinition: true,
          note: `exact by definition: ${origin.name}'s origin with ${axes.name}'s axes`,
        },
      },
    );
  }

  override get revision(): number {
    return super.revision + routeRevision(this.axes, this.origin);
  }
}

/**
 * A child of `origin` with `axes`' axes: the rotation part of
 * `frameTransform(axes, origin, ·)`, no translation. Exact by definition.
 */
export function axesAt<N extends string>(
  name: N,
  origin: Frame,
  axes: Frame,
): Frame<N> {
  return new AxesFrame(name, origin, axes);
}
