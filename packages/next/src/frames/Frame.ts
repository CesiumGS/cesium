import {
  identity,
  invertAffine,
  multiply,
  copy,
  type Mat4,
} from "../math/mat4.ts";
import type { Instant } from "../time/Instant.ts";
import {
  NOT_STATED,
  checkedAccuracy,
  type FrameAccuracy,
} from "./frameAccuracy.ts";

/** A frame's options: its cache, and its edge's stated accuracy. */
export interface FrameOptions {
  /** Keep one matrix, keyed by `instant.tt` (the default `true`). */
  cache?: boolean;
  /**
   * How accurate the edge to the parent is (1σ; `FrameAccuracy`), or a
   * function of the instant for an edge whose accuracy drifts with time.
   * Left out, the accuracy is not stated, and `pointAccuracy` across the
   * edge is unbounded, naming it.
   */
  accuracy?:
    Readonly<FrameAccuracy> | ((instant: Instant) => Readonly<FrameAccuracy>);
}

/**
 * A reference frame: a named coordinate system placed in a parent frame by
 * a transform that may depend on time. Frames form trees; positions in
 * different frames of one tree convert through `frameTransform`.
 *
 * `toParent` maps child coordinates to parent coordinates
 * (`p_parent = M · p_child`, column-major float64, meters). Positions only:
 * velocities need the rotation's rate (plan 3).
 */
export class Frame<N extends string = string> {
  readonly name: N;
  readonly parent: Frame | undefined;
  private readonly compute: (instant: Instant, out: Mat4) => void;
  private readonly cached: boolean;
  private readonly stated:
    FrameAccuracy | ((instant: Instant) => FrameAccuracy);
  private readonly entry = new Float64Array(16);
  private entryTt = NaN;

  /**
   * A child of `parent`. `toParent` writes the child-to-parent matrix for
   * an instant. With `cache` (the default) the frame keeps one entry,
   * keyed by `instant.tt`; pass `cache: false` when the matrix depends on
   * state besides the instant. `accuracy` states how accurate the edge is
   * (1σ); a fixed one is checked here, and throws a `RangeError` naming the
   * frame when a figure is not a finite positive number.
   */
  constructor(
    name: N,
    parent: Frame,
    toParent: (instant: Instant, out: Mat4) => void,
    options?: FrameOptions,
  ) {
    this.name = name;
    this.parent = parent;
    this.compute = toParent;
    this.cached = options?.cache ?? true;
    const a = options?.accuracy ?? NOT_STATED;
    this.stated = typeof a === "function" ? a : checkedAccuracy(name, a);
  }

  /**
   * The edge's stated accuracy at `instant` (1σ): as given to the
   * constructor, or not stated; frozen. A function's answer is checked as a
   * fixed one is.
   */
  accuracy(instant: Instant): Readonly<FrameAccuracy> {
    const a = this.stated;
    return typeof a === "function" ? checkedAccuracy(this.name, a(instant)) : a;
  }

  /** A frame with no parent. Its `toParent` is the identity. */
  static root<N extends string>(name: N): Frame<N> {
    // The one construction without a parent; `toParent` never calls compute.
    return new Frame(name, undefined as unknown as Frame, () => {});
  }

  /** A child whose placement in `parent` never changes, as accurate as `options.accuracy` states. */
  static constant<N extends string>(
    name: N,
    parent: Frame,
    toParent: ArrayLike<number>,
    options?: Pick<FrameOptions, "accuracy">,
  ): Frame<N> {
    const fixed = Float64Array.from(toParent);
    return new Frame(name, parent, (_instant, out) => copy(out, fixed), {
      cache: false,
      ...(options?.accuracy !== undefined && { accuracy: options.accuracy }),
    });
  }

  /** The child-to-parent matrix at `instant`; the identity for a root. */
  toParent(instant: Instant, out: Mat4 = new Float64Array(16)): Mat4 {
    if (!this.parent) {
      return identity(out);
    }
    if (!this.cached) {
      this.compute(instant, out);
      return out;
    }
    if (this.entryTt !== instant.tt) {
      // Invalidate first: a compute that throws after writing part of the
      // matrix must not leave garbage keyed to the previous instant.
      this.entryTt = NaN;
      this.compute(instant, this.entry);
      this.entryTt = instant.tt;
    }
    return copy(out, this.entry);
  }
}

// Scratch for frameTransform, one set per reentrancy level: a guard for a
// frame whose compute calls `frameTransform` itself (none of the built-in
// frames does), so the inner call cannot overwrite the outer one's matrices.
interface Scratch {
  up: Mat4;
  down: Mat4;
  step: Mat4;
  inverse: Mat4;
}
const scratchLevels: Scratch[] = [];
let level = 0;

function scratchFor(depth: number): Scratch {
  return (scratchLevels[depth] ??= {
    up: new Float64Array(16),
    down: new Float64Array(16),
    step: new Float64Array(16),
    inverse: new Float64Array(16),
  });
}

function depthOf(frame: Frame): number {
  let depth = 0;
  for (let f = frame.parent; f; f = f.parent) {
    depth++;
  }
  return depth;
}

/** Writes the matrix taking `frame` coordinates to those of `ancestor`. */
function toAncestor(
  frame: Frame,
  ancestor: Frame,
  instant: Instant,
  acc: Mat4,
  step: Mat4,
): void {
  identity(acc);
  for (let f = frame; f !== ancestor; f = f.parent!) {
    f.toParent(instant, step);
    multiply(acc, step, acc);
  }
}

/**
 * The matrix `M` with `p_to = M · p_from`, composed through the lowest
 * common ancestor of the two frames. Throws across trees.
 */
export function frameTransform(
  from: Frame,
  to: Frame,
  instant: Instant,
  out: Mat4 = new Float64Array(16),
): Mat4 {
  let a = from;
  let b = to;
  let da = depthOf(a);
  let db = depthOf(b);
  while (da > db) {
    a = a.parent!;
    da--;
  }
  while (db > da) {
    b = b.parent!;
    db--;
  }
  while (a !== b) {
    if (!a.parent || !b.parent) {
      throw new Error(
        `frameTransform: no common ancestor of "${from.name}" and "${to.name}"`,
      );
    }
    a = a.parent;
    b = b.parent;
  }
  const s = scratchFor(level++);
  try {
    toAncestor(from, a, instant, s.up, s.step);
    toAncestor(to, a, instant, s.down, s.step);
    invertAffine(s.inverse, s.down);
    return multiply(out, s.inverse, s.up);
  } finally {
    level--;
  }
}
