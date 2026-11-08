// Core picks (spec section 7.9; plan 5a, Task 15): what is drawn under a
// pixel, as the core knows it: a position in render space (the rig's
// position reference frame) with the anchor it was drawn under, the view,
// the draw and the feature, all from the tick whose image the pick read. A
// pick interpreter turns that into what an application asks for: the frames
// module's tags it with its reference frame (`createFramesPickInterpreter`),
// the engineering module's with design coordinates (`pickDesign`).
import type { FrameKey } from "../camera/frameResolver.ts";
import { UNDERLAY_DEPTH } from "../render/layout.ts";
import type { CameraPose } from "./Camera.ts";
import { inverseRotate, type PickResult, type View } from "./View.ts";
import type { SceneItem } from "./SceneItem.ts";
import type { AnchorHandle, DrawHandle, FeatureInfo, World } from "./World.ts";

/**
 * The camera a pick's position and feature were read with, for projecting
 * into that same tick (`projectToPixel`); public as `SnapCamera`. In a core
 * pick, in the hit anchor's coordinates (as `CorePick.anchorPosition`).
 */
export interface PickCamera extends CameraPose {
  readonly position: Float64Array;
  readonly direction: Float64Array;
  readonly up: Float64Array;
  readonly right: Float64Array;
  readonly fovy: number;
  /** Metres: nothing nearer is drawn. */
  readonly near: number;
  /** The view's size in CSS pixels. */
  readonly width: number;
  readonly height: number;
}

/**
 * What is drawn under a pixel (`View.pickPoint`), all from the tick whose
 * image the pick read: its position, the anchors' placements, the camera and
 * the scene time, never mixed with a later tick's (plan 5a, Review Focus 3).
 * `position` is in render space; `anchorPosition` and `camera` are in the
 * hit anchor's coordinates. `draw` and `feature` are looked up in the world
 * when the readback maps, from the feature ID the pick pass read.
 */
export interface CorePick {
  readonly view: View;
  /** Render space: the view's render root (`root`) at that tick, m. */
  readonly position: Float64Array;
  /** The view's render root at that tick: the rig's position reference frame. */
  readonly root: FrameKey;
  /**
   * The anchor the hit draw hangs under (undefined: the transform table's
   * root). With depth but no draw (the bare ellipsoid), the view's body
   * anchor.
   */
  readonly anchor: AnchorHandle | undefined;
  /** The same point in `anchor`'s coordinates (Earth-fixed under the Earth's anchor), m. */
  readonly anchorPosition: Float64Array;
  /**
   * The hit draw, if a draw was hit and is still in the world when the
   * readback maps (looked up then, from the feature ID read).
   */
  readonly draw: DrawHandle | undefined;
  /** The hit feature, looked up when the readback maps, as `View.pick`. */
  readonly feature: PickResult | undefined;
  /** The item that drew the hit, if an item did (`World.itemOfDraw`). */
  readonly item?: SceneItem;
  /** The scene clock's seconds at that tick (0 without a clock). */
  readonly seconds: number;
  /** That tick's camera, in `anchor`'s coordinates. */
  readonly camera: PickCamera;
}

/** Turns a core pick into what an application asks for, or undefined when it can't. */
export interface PickInterpreter<T> {
  interpret(pick: CorePick): T | undefined;
}

/**
 * @internal What the engine keeps of the tick a pick reads, taken as its
 * pick pass is encoded: the view's camera in render space, its anchors'
 * placements, its render root and the scene time.
 */
export interface PickTick {
  readonly view: View;
  readonly world: World;
  readonly root: FrameKey;
  readonly seconds: number;
  readonly bodyAnchor: AnchorHandle | undefined;
  /**
   * Render space ← anchor, for the table root (`undefined`) and each anchor
   * of the world then; `undefined` at the identity.
   */
  readonly placements: ReadonlyMap<
    AnchorHandle | undefined,
    Float64Array | undefined
  >;
  /** The view's camera, in render space. */
  readonly camera: CameraPose;
  readonly near: number;
  readonly fovy: number;
  /** The view's size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  /** Tangents of the half fields of view, across and up. */
  readonly tanX: number;
  readonly tanY: number;
  /** The pixel's centre in normalized device coordinates. */
  readonly ndcX: number;
  readonly ndcY: number;
}

/** A feature's pick result (`View.pick`). */
export function pickResult(
  featureId: number,
  info: FeatureInfo | undefined,
): PickResult | undefined {
  return info
    ? {
        featureId,
        name: info.name,
        ...(info.properties ? { properties: info.properties } : {}),
        ...(info.item ? { item: info.item } : {}),
      }
    : undefined;
}

/**
 * The distance along the view axis of a reverse-Z depth (infinite far:
 * near / depth), or undefined over the sky. Underlay draws (the bare
 * ellipsoid) scale their depth down.
 */
export function depthDistance(near: number, depth: number): number | undefined {
  if (!(depth > 0)) {
    return undefined;
  }
  return near / (depth <= UNDERLAY_DEPTH ? depth / UNDERLAY_DEPTH : depth);
}

/**
 * The point at distance `z` along the view axis through a pixel, seen from
 * `pose` (as the pick pass's position is computed for every pick).
 */
export function alongRay(
  pose: CameraPose,
  tanX: number,
  tanY: number,
  ndcX: number,
  ndcY: number,
  z: number,
): Float64Array {
  const p = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    p[i] =
      pose.position[i]! +
      z *
        (pose.direction[i]! +
          ndcX * tanX * pose.right[i]! +
          ndcY * tanY * pose.up[i]!);
  }
  return p;
}

/**
 * @internal The core pick a pick pass read at `tick`: undefined over the
 * sky. The anchor position is computed from the camera re-expressed in the
 * anchor (as `View.anchorCamera`), so under the body anchor it equals what
 * `View.pickPosition` gives, bit for bit.
 */
export function corePick(
  tick: PickTick,
  featureId: number,
  depth: number,
): CorePick | undefined {
  const z = depthDistance(tick.near, depth);
  if (z === undefined) {
    return undefined;
  }
  const { tanX, tanY } = tick;
  const position = alongRay(tick.camera, tanX, tanY, tick.ndcX, tick.ndcY, z);
  const info = tick.world.feature(featureId);
  const draw = info?.draw;
  let anchor = draw ? tick.world.drawAnchor(draw) : tick.bodyAnchor;
  if (!tick.placements.has(anchor)) {
    // Not an anchor at that tick (made since): nothing was drawn under it.
    anchor = tick.bodyAnchor;
  }
  const m = tick.placements.get(anchor);
  const c = tick.camera;
  const camera: PickCamera = {
    position: new Float64Array(3),
    direction: new Float64Array(3),
    up: new Float64Array(3),
    right: new Float64Array(3),
    fovy: tick.fovy,
    near: tick.near,
    width: tick.width,
    height: tick.height,
  };
  inverseRotate(m, c.position, camera.position, true);
  inverseRotate(m, c.direction, camera.direction, false);
  inverseRotate(m, c.up, camera.up, false);
  inverseRotate(m, c.right, camera.right, false);
  return {
    view: tick.view,
    position,
    root: tick.root,
    anchor,
    anchorPosition: alongRay(camera, tanX, tanY, tick.ndcX, tick.ndcY, z),
    draw,
    feature: pickResult(featureId, info),
    ...(info?.item && { item: info.item }),
    seconds: tick.seconds,
    camera,
  };
}
