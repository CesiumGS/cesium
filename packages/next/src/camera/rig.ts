// A rig is only a pose in a reference frame (spec section 7.5): where the
// camera is, split from where it looks, after Cinemachine's Body and Aim.
// Plan 5a ships its generic form; presets come in 5b, damping in 5d
// (plan's call 26).
import type { World } from "../scene/World.ts";
import type { FrameKey } from "./frameResolver.ts";

/**
 * Where the camera is. `frame` is the position reference frame, and the
 * view's render root: render space's origin is `frame`'s own origin and
 * its axes are `frame`'s (plan 5a's call 25). With `offset`, the camera
 * sits at `anchor`'s origin (default `frame`'s) plus `offset`, in metres
 * along `frame`'s axes. Without it, the camera's position is the
 * controller's (`view.camera.position`, in `frame`).
 */
export interface RigPosition {
  readonly frame: FrameKey;
  readonly anchor?: FrameKey;
  readonly offset?: ArrayLike<number>;
}

/**
 * Where the camera looks:
 *
 * - `free`: the controller's orientation (`view.camera`);
 * - `axes`: along `forward`, with `up` up, both in `frame`'s axes, so the
 *   camera turns with `frame`;
 * - `aim`: at `target`'s origin, with `up` (in `upFrame`'s axes) up.
 */
export type RigOrientation =
  | { readonly kind: "free" }
  | {
      readonly kind: "axes";
      readonly frame: FrameKey;
      readonly forward: ArrayLike<number>;
      readonly up: ArrayLike<number>;
    }
  | {
      readonly kind: "aim";
      readonly target: FrameKey;
      readonly upFrame: FrameKey;
      readonly up: ArrayLike<number>;
    };

/** A camera's pose in reference frames, evaluated each tick by the camera layer. */
export interface Rig {
  readonly position: RigPosition;
  readonly orientation: RigOrientation;
}

/**
 * The rig every view starts with: on the transform table's root (render
 * space as it always was), with a free orientation. It costs nothing per
 * tick: the camera layer leaves such a view's anchor placements to the
 * application (`View.setAnchorPlacement`).
 */
export function defaultRig(world: World): Rig {
  return { position: { frame: world.root }, orientation: { kind: "free" } };
}

/** Whether `rig` is `defaultRig(world)` in substance. */
export function isDefaultRig(rig: Rig, world: World): boolean {
  return (
    rig.position.frame === world.root &&
    rig.position.anchor === undefined &&
    rig.position.offset === undefined &&
    rig.orientation.kind === "free"
  );
}

/**
 * Why a rig can't be used, or undefined: an offset that isn't 3 finite
 * numbers, or a forward or up that isn't a finite non-zero direction.
 */
export function rigError(rig: Rig): string | undefined {
  const offset = rig.position.offset;
  if (offset !== undefined && !finite3(offset)) {
    return "the position's offset is not 3 finite numbers";
  }
  const o = rig.orientation;
  if (o.kind === "axes" && !direction(o.forward)) {
    return "the orientation's forward is not a direction";
  }
  if ((o.kind === "axes" || o.kind === "aim") && !direction(o.up)) {
    return "the orientation's up is not a direction";
  }
  return undefined;
}

function finite3(v: ArrayLike<number>): boolean {
  return (
    v.length === 3 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Number.isFinite(v[2])
  );
}

function direction(v: ArrayLike<number>): boolean {
  return finite3(v) && Math.hypot(v[0]!, v[1]!, v[2]!) > 1e-12;
}
