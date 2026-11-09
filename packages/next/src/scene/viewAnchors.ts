// A view's placements of its world's anchors, and its camera relative to an
// anchor (View's anchor methods).
import type { FrameKey } from "../camera/frameResolver.ts";
import { rigidMatrixError } from "../math/transforms.ts";
import { MAX_ANCHORS } from "../render/layout.ts";
import { Camera, type CameraPose } from "./Camera.ts";
import type { View } from "./View.ts";
import type { AnchorHandle } from "./world/types.ts";
import type { ViewAnchorState } from "./viewAnchorState.ts";

/** Scene side: a view's anchor placements. */
export interface ViewAnchorContext extends Pick<
  View,
  "anchorPlacement" | "camera" | "wake" | "world"
> {
  readonly anchorState: Pick<
    ViewAnchorState,
    | "anchorRevision_"
    | "anchorsRemovals"
    | "anchorsWorld"
    | "placed"
    | "placementOwners"
    | "placements"
  >;
}

const IDENTITY_16 = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);
const scratchPlacement = new Float64Array(16);
const scratchP = new Float64Array(3);
const scratchD = new Float64Array(3);
const scratchU = new Float64Array(3);
const scratchR = new Float64Array(3);

function copy3(v: ArrayLike<number>, out: Float64Array): void {
  out[0] = v[0]!;
  out[1] = v[1]!;
  out[2] = v[2]!;
}

/**
 * `out` = R v (+ t for a point), for a column-major rigid `m`; a copy of
 * `v` without one (the identity, bit for bit).
 */
export function rotate(
  m: ArrayLike<number> | undefined,
  v: ArrayLike<number>,
  out: Float64Array,
  point: boolean,
): void {
  if (!m) {
    out[0] = v[0]!;
    out[1] = v[1]!;
    out[2] = v[2]!;
    return;
  }
  const x = v[0]!,
    y = v[1]!,
    z = v[2]!;
  const w = point ? 1 : 0;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]! * w;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]! * w;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]! * w;
}

/**
 * @internal `out` = Rᵀ (v - t for a point), for a column-major rigid `m`; a
 * copy without one.
 */
export function inverseRotate(
  m: ArrayLike<number> | undefined,
  v: ArrayLike<number>,
  out: Float64Array,
  point: boolean,
): void {
  if (!m) {
    rotate(undefined, v, out, point);
    return;
  }
  const x = v[0]! - (point ? m[12]! : 0),
    y = v[1]! - (point ? m[13]! : 0),
    z = v[2]! - (point ? m[14]! : 0);
  out[0] = m[0]! * x + m[1]! * y + m[2]! * z;
  out[1] = m[4]! * x + m[5]! * y + m[6]! * z;
  out[2] = m[8]! * x + m[9]! * y + m[10]! * z;
}

export function anchorPlacement(
  view: ViewAnchorContext,
  anchor: AnchorHandle | undefined,
  out = new Float64Array(16),
): Float64Array {
  const slot = placementSlot(view, anchor, "anchorPlacement");
  if (view.anchorState.placed[slot] === 1) {
    out.set(view.anchorState.placements.subarray(slot * 16, slot * 16 + 16));
  } else {
    out.fill(0);
    out[0] = out[5] = out[10] = out[15] = 1;
  }
  return out;
}

export function setAnchorPlacement(
  view: ViewAnchorContext,
  anchor: AnchorHandle | undefined,
  matrix: ArrayLike<number>,
): void {
  const slot = placementSlot(view, anchor, "setAnchorPlacement");
  const name = anchor ? anchor.name : "the transform table's root";
  const error = rigidMatrixError(matrix);
  if (error) {
    throw new Error(
      `setAnchorPlacement: ${name}'s placement is not rigid: ${error}.`,
    );
  }
  const current = view.anchorPlacement(anchor, scratchPlacement);
  let same = true;
  for (let i = 0; i < 16; i++) {
    if (current[i] !== matrix[i]) {
      same = false;
      break;
    }
  }
  if (same) {
    return;
  }
  let identity = true;
  for (let i = 0; i < 16; i++) {
    const v = matrix[i]!;
    view.anchorState.placements[slot * 16 + i] = v;
    if (v !== IDENTITY_16[i]) {
      identity = false;
    }
  }
  view.anchorState.placed[slot] = identity ? 0 : 1;
  view.anchorState.placementOwners[slot] = anchor;
  view.anchorState.anchorRevision_++;
  view.wake?.();
}

export function anchorCamera(
  view: ViewAnchorContext,
  anchor: AnchorHandle | undefined,
  out = new Camera(),
): Camera {
  const m = placementOf(view, anchor, "anchorCamera");
  const camera = view.camera;
  // anchor ← render space is the transpose of the rotation, and minus the
  // rotated-back translation: p' = Rᵀ (p - t).
  inverseRotate(m, camera.position, out.position, true);
  inverseRotate(m, camera.direction, out.direction, false);
  inverseRotate(m, camera.up, out.up, false);
  inverseRotate(m, camera.right, out.right, false);
  if (out !== camera) {
    out.fov = camera.fov;
    out.near = camera.near;
  }
  out.version++;
  return out;
}

export function setCameraFromAnchor(
  view: ViewAnchorContext,
  anchor: AnchorHandle | undefined,
  pose: CameraPose,
): void {
  const m = placementOf(view, anchor, "setCameraFromAnchor");
  const camera = view.camera;
  // Read the pose first: it may be the camera itself.
  const p = scratchP,
    d = scratchD,
    u = scratchU,
    r = scratchR;
  copy3(pose.position, p);
  copy3(pose.direction, d);
  copy3(pose.up, u);
  copy3(pose.right, r);
  rotate(m, p, camera.position, true);
  rotate(m, d, camera.direction, false);
  rotate(m, u, camera.up, false);
  rotate(m, r, camera.right, false);
  camera.version++;
}

export function pickPlacements(
  view: ViewAnchorContext,
): Map<AnchorHandle | undefined, Float64Array | undefined> {
  const out = new Map<AnchorHandle | undefined, Float64Array | undefined>();
  const copy = (m: Float64Array | undefined) => m && Float64Array.from(m);
  out.set(undefined, copy(placementOf(view, undefined, "pickPlacements")));
  for (const anchor of view.world.anchors) {
    out.set(anchor, copy(placementOf(view, anchor, "pickPlacements")));
  }
  return out;
}

/** An anchor's placement, or undefined at the identity. */
export function placementOf(
  view: ViewAnchorContext,
  anchor: AnchorHandle | FrameKey | undefined,
  caller: string,
): Float64Array | undefined {
  const slot = placementSlot(view, anchor, caller);
  return view.anchorState.placed[slot] === 1
    ? view.anchorState.placements.subarray(slot * 16, slot * 16 + 16)
    : undefined;
}

/**
 * An anchor's slot, checked against this view's world; 0 for none
 * (`undefined`, or the world's `root`).
 */
function placementSlot(
  view: ViewAnchorContext,
  anchor: AnchorHandle | FrameKey | undefined,
  caller: string,
): number {
  syncAnchors(view);
  if (!anchor || anchor === view.world.root) {
    return 0;
  }
  if (
    !("slot" in anchor) ||
    view.world.anchorOf(anchor as AnchorHandle) !== anchor
  ) {
    throw new Error(
      `${caller}: ${anchor.name} is not an anchor of this view's world.`,
    );
  }
  const slot = (anchor as AnchorHandle).slot;
  if (view.anchorState.placementOwners[slot] !== anchor) {
    // The slot's last placement was for a removed anchor (normally
    // forgotten already, by syncAnchors).
    view.anchorState.placementOwners[slot] = anchor as AnchorHandle;
    if (view.anchorState.placed[slot] === 1) {
      view.anchorState.placed[slot] = 0;
      view.anchorState.anchorRevision_++;
      view.wake?.();
    }
  }
  return slot;
}

/**
 * Forgets placements of anchors the world removed (or of another world's
 * anchors, after `world` was set), counting it in `anchorRevision`.
 */
export function syncAnchors(view: ViewAnchorContext): void {
  const world = view.world;
  const removals = world.anchorRemovals;
  if (
    world === view.anchorState.anchorsWorld &&
    removals === view.anchorState.anchorsRemovals
  ) {
    return;
  }
  const first = view.anchorState.anchorsWorld === undefined;
  view.anchorState.anchorsWorld = world;
  view.anchorState.anchorsRemovals = removals;
  for (let slot = 1; slot < MAX_ANCHORS; slot++) {
    const owner = view.anchorState.placementOwners[slot];
    if (owner && world.anchorOf(owner) !== owner) {
      view.anchorState.placementOwners[slot] = undefined;
      view.anchorState.placed[slot] = 0;
    }
  }
  if (!first) {
    view.anchorState.anchorRevision_++;
    view.wake?.();
  }
}
