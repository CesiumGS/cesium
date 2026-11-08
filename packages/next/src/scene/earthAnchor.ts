import { EARTH, bodyKey } from "./Body.ts";
import type { View } from "./View.ts";
import type { AnchorHandle, World } from "./World.ts";

/**
 * The anchor content hangs under (plan 5a's call 19): `anchor` when given,
 * checked against `world` (throws, naming it and `caller`, for another
 * world's anchor or a removed one), else the Earth's (`World.bodyAnchor`,
 * made on first ask). Under the Earth's anchor, positions are Earth-fixed.
 */
export function contentAnchor(
  world: World,
  anchor: AnchorHandle | undefined,
  caller: string,
): AnchorHandle {
  if (anchor === undefined) {
    return world.bodyAnchor(EARTH);
  }
  if (world.anchorOf(anchor) !== anchor) {
    throw new Error(
      `${caller}: ${anchor.name} is not an anchor of this world.`,
    );
  }
  return anchor;
}

/** The Earth's anchor of `world` (made on first ask). */
export function earthAnchor(world: World): AnchorHandle {
  return world.bodyAnchor(EARTH);
}

const EARTH_KEY = bodyKey(EARTH);
const scratchPlacement = new Float64Array(16);

/**
 * Whether the view's camera reads as Earth-fixed: the Earth's anchor (the
 * table's root while the world has none) sits at the identity in the
 * view's render space. The globe controls work in Earth-fixed
 * coordinates; until 5d makes them per body they ignore input otherwise
 * (plan 5a's call 27).
 */
export function earthFixed(view: View): boolean {
  const earth = view.world.findBodyAnchor(EARTH_KEY);
  const m = view.anchorPlacement(earth, scratchPlacement);
  for (let i = 0; i < 16; i++) {
    if (m[i] !== (i % 5 === 0 ? 1 : 0)) {
      return false;
    }
  }
  return true;
}

/** A control's check before input moves the camera: `earthFixed`, warning once. */
export class EarthFixedGuard {
  private warned = false;

  constructor(
    private readonly view: View,
    private readonly control: string,
  ) {}

  /** Whether input may move the camera; warns the first time it may not. */
  accepts(): boolean {
    if (earthFixed(this.view)) {
      return true;
    }
    if (!this.warned) {
      this.warned = true;
      console.warn(
        `${this.control}: input ignored while the Earth's anchor isn't at the identity in this view's render space (its rig isn't on the Earth); the control works in Earth-fixed coordinates.`,
      );
    }
    return false;
  }
}
