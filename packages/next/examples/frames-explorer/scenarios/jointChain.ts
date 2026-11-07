// A kinematic chain of joint frames, defined by the app through the public
// `Frame` API (Task 7b; owner, 2026-11-06: "those robotics frames are
// supplied by the app, not by cesiumjs, to show user frames as a feature").
// The example's own code, not the library's.
//
// Each joint sits at a fixed link offset in its parent and turns about its
// own x, y or z axis by its angle: child to parent is T(offset) · R(angle).
// The angles are state beyond the instant (a knob, an encoder), so the
// frames are uncached (`cache: false`): a new angle moves them at the same
// instant. Each joint states its own accuracy (an encoder's angle, a link's
// length tolerance), and the library composes it (`pointAccuracy`).
import { Frame } from "../../../src/frames/Frame.ts";
import type { FrameAccuracy } from "../../../src/frames/frameAccuracy.ts";

/** One joint of the chain. */
export interface Joint {
  name: string;
  /** The axis it turns about, its own. */
  axis: "x" | "y" | "z";
  /** Where it sits in its parent (the link from the parent's origin), m. */
  offset: readonly [number, number, number];
  /** Its angle now, radians (read at every evaluation). */
  angle: () => number;
  /** What the app states for it (1σ): its encoder, its link. Not stated if left out. */
  accuracy?: FrameAccuracy;
}

/**
 * Writes T(offset) · R(axis, angle), column-major: a rotation by `angle`
 * about the joint's own `axis`, then the link offset into the parent.
 */
export function jointMatrix(
  axis: Joint["axis"],
  angle: number,
  offset: readonly [number, number, number],
  out: Float64Array,
): Float64Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out.fill(0);
  // The rotation's columns: the child's axes in the parent.
  const [i, j, k] =
    axis === "x" ? [0, 1, 2] : axis === "y" ? [1, 2, 0] : [2, 0, 1];
  // About axis i: e_i stays, e_j turns toward e_k, e_k toward -e_j.
  out[i * 4 + i] = 1;
  out[j * 4 + j] = c;
  out[j * 4 + k] = s;
  out[k * 4 + j] = -s;
  out[k * 4 + k] = c;
  out[12] = offset[0];
  out[13] = offset[1];
  out[14] = offset[2];
  out[15] = 1;
  return out;
}

/**
 * The chain's frames under `parent`, in order (the tool last): each one a
 * child of the one before, uncached, with its stated accuracy.
 */
export function jointChain(parent: Frame, joints: readonly Joint[]): Frame[] {
  const out: Frame[] = [];
  let up = parent;
  for (const joint of joints) {
    // #region joint-frame
    const frame = new Frame(
      joint.name,
      up,
      // Child to parent: the link offset, then the turn by the angle now.
      (_instant, out) =>
        jointMatrix(joint.axis, joint.angle(), joint.offset, out),
      // The angle is state beyond the instant: no cache. The app states
      // the joint's accuracy (1σ); the library composes it.
      joint.accuracy
        ? { cache: false, accuracy: joint.accuracy }
        : { cache: false },
    );
    // #endregion joint-frame
    out.push(frame);
    up = frame;
  }
  return out;
}
