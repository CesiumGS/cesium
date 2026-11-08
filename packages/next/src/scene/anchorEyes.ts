/**
 * An eye per anchor (plan 5a, Task 9; spec section 7.4): for each slot of a
 * view's anchor table, in float64, the eye's position in the anchor's
 * coordinates and the rotation from the anchor's axes to the view's
 * shading axes, which are its body anchor's axes (plan 5a's call 18). The
 * cull kernel's camera-relative matrix (cullTables.slang `relativeMatrix`)
 * reads them, so a draw under an anchor stays anchor-relative up to the
 * GPU and nothing large is rotated in float32.
 *
 * With every anchor at the identity each slot's eye is the camera and its
 * rotation the identity: every float the GPU reads is what it was before
 * anchors.
 */

import { MAX_ANCHORS, writeAnchorEye } from "../render/layout.ts";
import type { CameraPose } from "./Camera.ts";
import type { View } from "./View.ts";
import type { AnchorHandle } from "./World.ts";

/**
 * Farther than this from an anchor (meters, 2^31), the eye's split
 * position can't be subtracted from its content's as 32-bit integers
 * (common.slang `SplitPosition.difference`): the anchor's draws are hidden
 * in the view.
 */
export const ANCHOR_EYE_REACH = 2 ** 31;

/** Floats per slot in `AnchorEyes.values`: the eye, then the rotation by row. */
export const ANCHOR_EYE_VALUES = 12;

/** A view's anchor table in float64 (`computeAnchorEyes`). */
export interface AnchorEyes {
  /**
   * Per slot (`ANCHOR_EYE_VALUES` each): the eye in the anchor's
   * coordinates (xyz), then the rotation from the anchor's axes to the
   * shading axes by row (row-major 3×3).
   */
  readonly values: Float64Array;
  /** Per slot: 1 when its rotation is exactly the identity. */
  readonly identity: Uint8Array;
  /** Per slot: 1 when the eye is beyond `ANCHOR_EYE_REACH` of the anchor. */
  readonly hidden: Uint8Array;
  /** Per slot: the anchor (undefined for the root, slot 0, and empty slots). */
  readonly anchors: Array<AnchorHandle | undefined>;
}

/** A table to fill with `computeAnchorEyes`. */
export function createAnchorEyes(): AnchorEyes {
  return {
    values: new Float64Array(MAX_ANCHORS * ANCHOR_EYE_VALUES),
    identity: new Uint8Array(MAX_ANCHORS),
    hidden: new Uint8Array(MAX_ANCHORS),
    anchors: new Array<AnchorHandle | undefined>(MAX_ANCHORS).fill(undefined),
  };
}

const bodyPlacement = new Float64Array(16);
const placement = new Float64Array(16);
const eyeInRender = new Float64Array(3);
const scratchEyes = createAnchorEyes();
const scratchEye = new Float64Array(3);

/**
 * Fills `out` for `view`: `camera` is the eye in the view's body anchor
 * (`View.anchorCamera(view.bodyAnchor)`; the table's root while the world
 * has no body anchor), whose axes are the shading axes. Placements are read
 * through `View.anchorPlacement` only, so a removed anchor's placement is
 * never used. Empty slots read as anchors at the identity.
 */
export function computeAnchorEyes(
  camera: CameraPose,
  view: View,
  out: AnchorEyes = createAnchorEyes(),
): AnchorEyes {
  const body = view.bodyAnchor;
  const bodySlot = body?.slot ?? 0;
  const pb = view.anchorPlacement(body, bodyPlacement);
  const c = camera.position;
  // The eye in render space: Pb · c.
  for (let i = 0; i < 3; i++) {
    eyeInRender[i] =
      pb[i]! * c[0]! + pb[4 + i]! * c[1]! + pb[8 + i]! * c[2]! + pb[12 + i]!;
  }
  out.anchors.fill(undefined);
  const anchors = view.world.anchors;
  for (let i = 0; i < anchors.length; i++) {
    out.anchors[anchors[i]!.slot] = anchors[i];
  }
  const v = out.values;
  for (let slot = 0; slot < MAX_ANCHORS; slot++) {
    const o = slot * ANCHOR_EYE_VALUES;
    const anchor = out.anchors[slot];
    if (slot === bodySlot) {
      // The body anchor's eye is the camera itself, its rotation the
      // identity: set directly, never through a product.
      v[o] = c[0]!;
      v[o + 1] = c[1]!;
      v[o + 2] = c[2]!;
      v.fill(0, o + 3, o + 12);
      v[o + 3] = v[o + 7] = v[o + 11] = 1;
      out.identity[slot] = 1;
    } else {
      let pa: Float64Array;
      if (slot === 0 || anchor) {
        pa = view.anchorPlacement(anchor, placement);
      } else {
        pa = placement.fill(0);
        pa[0] = pa[5] = pa[10] = pa[15] = 1;
      }
      // The eye in the anchor: Raᵀ (eye - ta).
      const x = eyeInRender[0]! - pa[12]!;
      const y = eyeInRender[1]! - pa[13]!;
      const z = eyeInRender[2]! - pa[14]!;
      for (let i = 0; i < 3; i++) {
        v[o + i] = pa[i * 4]! * x + pa[i * 4 + 1]! * y + pa[i * 4 + 2]! * z;
      }
      // Anchor axes to shading axes: Rbᵀ Ra, row i column j the dot of
      // Rb's column i with Ra's column j.
      let identity = true;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const value =
            pb[i * 4]! * pa[j * 4]! +
            pb[i * 4 + 1]! * pa[j * 4 + 1]! +
            pb[i * 4 + 2]! * pa[j * 4 + 2]!;
          v[o + 3 + i * 3 + j] = value;
          if (value !== (i === j ? 1 : 0)) {
            identity = false;
          }
        }
      }
      out.identity[slot] = identity ? 1 : 0;
    }
    // The root (slot 0) is never hidden: draws under no anchor draw as
    // they did before anchors.
    out.hidden[slot] =
      slot !== 0 &&
      anchor !== undefined &&
      Math.hypot(v[o]!, v[o + 1]!, v[o + 2]!) > ANCHOR_EYE_REACH
        ? 1
        : 0;
  }
  return out;
}

/**
 * Writes `view`'s anchor table into the view block at `offsetFloats` of
 * `out` (after `writeViewBlock`), for `camera`, the eye in the view's body
 * anchor (`computeAnchorEyes`). Every writer of a view block calls it: the
 * view's, its shadow cascades' and its height captures'.
 */
export function writeAnchorEyes(
  out: Float32Array,
  offsetFloats: number,
  camera: CameraPose,
  view: View,
  eyes: AnchorEyes = computeAnchorEyes(camera, view, scratchEyes),
): void {
  const v = eyes.values;
  for (let slot = 0; slot < MAX_ANCHORS; slot++) {
    const o = slot * ANCHOR_EYE_VALUES;
    scratchEye[0] = v[o]!;
    scratchEye[1] = v[o + 1]!;
    scratchEye[2] = v[o + 2]!;
    writeAnchorEye(
      out,
      offsetFloats,
      slot,
      scratchEye,
      eyes.identity[slot] === 1 ? undefined : v,
      eyes.hidden[slot] === 1,
      o + 3,
    );
  }
}
