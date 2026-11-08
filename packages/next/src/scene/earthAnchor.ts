import { EARTH } from "./Body.ts";
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
