// A blend of two smooth specs: the weighted mix of their maps (plan §13.37; the
// helper `blendWarps` of §13.26). Both go from one frame to its parent, each
// at its own `scale`; the Jacobian is the same blend of theirs, exact, and the
// inverse is the engine's Newton. It is a function of two functions, not of
// source text, so it is fitted, not compiled.
import {
  warpForward,
  warpInverse,
  type SmoothFrameSpec,
  type Warp,
} from "../camera/route.ts";
import {
  LiveWarp,
  liveWarp,
  NO_FRAME,
  type ChangeableWarp,
} from "./liveWarp.ts";

/** A blend of two specs; set `t` to move it. */
export interface BlendedWarp extends ChangeableWarp {
  /** The weight of the second spec, 0 for the first and 1 for the second: setting it calls `changed()`. */
  t: number;
  inverse(q: ArrayLike<number>, out: Float64Array): Float64Array;
}

class BlendedWarpImpl extends LiveWarp implements BlendedWarp {
  private weight: number;
  private readonly a: Warp;
  private readonly b: Warp;
  private readonly core: Warp;
  private readonly ja = new Float64Array(9);
  private readonly jb = new Float64Array(9);
  private readonly qa = new Float64Array(3);
  private readonly qb = new Float64Array(3);

  constructor(
    private readonly first: SmoothFrameSpec,
    private readonly second: SmoothFrameSpec,
    t: number,
  ) {
    super();
    this.weight = checkWeight(t);
    this.a = liveWarp(first);
    this.b = liveWarp(second);
    this.core = {
      from: NO_FRAME,
      to: NO_FRAME,
      revision: 1,
      forward: (p, out, jacobian) => this.forward(p, out, jacobian),
    };
  }

  override get revision(): number {
    return this.ownRevision + this.first.revision + this.second.revision;
  }

  get t(): number {
    return this.weight;
  }

  set t(value: number) {
    this.weight = checkWeight(value);
    this.changed();
  }

  get description(): string {
    const name = (w: SmoothFrameSpec) => w.description ?? "a warp";
    return `blend of ${name(this.first)} and ${name(this.second)}, ${this.weight} of the way to the second`;
  }

  /** The weighted sum of the two stated accuracies, which is what perfectly correlated errors give: never optimistic. */
  get accuracy(): Warp["accuracy"] {
    const a = this.first.accuracy;
    const b = this.second.accuracy;
    if (a === undefined && b === undefined) {
      return undefined;
    }
    const t = this.weight;
    const mix = (x: number | undefined, y: number | undefined) =>
      x === undefined && y === undefined
        ? undefined
        : (1 - t) * (x ?? 0) + t * (y ?? 0);
    const sigma = mix(a?.sigma, b?.sigma);
    const bound = mix(a?.bound, b?.bound);
    return {
      ...(sigma !== undefined && { sigma }),
      ...(bound !== undefined && { bound }),
      note: "the weighted sum of the two warps' stated accuracies",
    };
  }

  forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array {
    const x = p[0]!;
    const y = p[1]!;
    const z = p[2]!;
    const at = [x, y, z];
    const t = this.weight;
    warpForward(this.a, at, this.qa, jacobian && this.ja);
    warpForward(this.b, at, this.qb, jacobian && this.jb);
    for (let i = 0; i < 3; i++) {
      out[i] = (1 - t) * this.qa[i]! + t * this.qb[i]!;
    }
    if (jacobian) {
      for (let i = 0; i < 9; i++) {
        jacobian[i] = (1 - t) * this.ja[i]! + t * this.jb[i]!;
      }
    }
    return out;
  }

  inverse = (q: ArrayLike<number>, out: Float64Array): Float64Array =>
    warpInverse(this.core, q, out as Float64Array<ArrayBuffer>);
}

function checkWeight(t: number): number {
  if (!(Number.isFinite(t) && t >= 0 && t <= 1)) {
    throw new RangeError(`blend: t must be in [0, 1], got ${t}`);
  }
  return t;
}

/**
 * The map that carries a point to `(1 − t)·a(p) + t·b(p)`: 0 is `a`, 1 is
 * `b`. Both go from one frame to its parent and each is taken at its own
 * `scale`. The Jacobian is the same blend of theirs, exact; the inverse is
 * the engine's Newton. Its revision follows both, but a frame is only
 * invalidated by its own `changed()`, so call that after changing `a` or
 * `b`. To fade one in from nothing, give it a `scale` instead.
 */
export function blend(
  a: SmoothFrameSpec,
  b: SmoothFrameSpec,
  t = 0.5,
): BlendedWarp {
  return new BlendedWarpImpl(a, b, t);
}
