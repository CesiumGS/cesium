// The core's own frame resolver (spec section 7.2, "Without the frames
// module"): the transform table's root, its anchors and its nodes are the
// only reference frames, so a rig can follow a moving node.
import * as m4 from "../math/mat4.ts";
import type { AnchorHandle, TransformFrameKey, World } from "../scene/World.ts";
import type { FrameKey, FrameResolver } from "./frameResolver.ts";

/**
 * A resolver over `world`'s transform table: `world.root`; its anchors, at
 * their places in the root (`World.placeAnchor`); and its nodes, named by
 * `World.frameOf`, at their anchor's place times their anchor-relative
 * matrix. Nothing in it moves with time. A route between anchors and the
 * root has the world's `anchorPlaceRevision` as its revision; one through
 * a node, the world's `transformRevision`. Any other key throws, naming it.
 */
export function tableResolver(world: World): FrameResolver {
  const a = new Float64Array(16);
  const b = new Float64Array(16);
  const anchorPlace = new Float64Array(16);

  /** `key` → the table root. */
  const place = (key: FrameKey, out: Float64Array<ArrayBuffer>): void => {
    if (key === world.root) {
      m4.identity(out);
      return;
    }
    if ("slot" in key) {
      const anchor = key as AnchorHandle;
      if (world.anchorOf(anchor) !== anchor) {
        throw new Error(
          `tableResolver: ${key.name} is not an anchor of this world.`,
        );
      }
      world.anchorMatrix(anchor, out);
      return;
    }
    const node = key as Partial<TransformFrameKey>;
    if (node.world === world && node.transform) {
      if (!world.transformAlive(node.transform)) {
        throw new Error(
          `tableResolver: the transform for ${key.name} was removed.`,
        );
      }
      world.worldMatrix(node.transform, out);
      const anchor = world.anchorOf(node.transform);
      if (anchor) {
        m4.multiply(out, world.anchorMatrix(anchor, anchorPlace), out);
      }
      return;
    }
    throw new Error(
      `tableResolver: ${key.name} is not a reference frame of this world's transform table.`,
    );
  };

  return {
    resolve(frame, base, _seconds, out) {
      if (frame === base) {
        return m4.identity(out);
      }
      place(frame, a);
      if (base === world.root) {
        return m4.copy(out, a);
      }
      place(base, b);
      m4.invertAffine(b, b);
      return m4.multiply(out, b, a);
    },
    routeRevision(frame, base) {
      // Between anchors and the root only anchor places matter; through a
      // node, any transform.
      return isNode(frame) || isNode(base)
        ? world.transformRevision
        : world.anchorPlaceRevision;
    },
  };
}

/** Whether `key` names a transform node (`World.frameOf`). */
function isNode(key: FrameKey): boolean {
  return "transform" in key;
}
