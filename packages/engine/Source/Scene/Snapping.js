import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import Ray from "../Core/Ray.js";
import { pickBegin, pickEnd } from "./Picking.js";
import SnapFramebuffer from "./SnapFramebuffer.js";

/**
 * Implementation of {@link Scene#snap}: snap-to-geometry picking.
 *
 * A snapping pass is an offscreen pick render (it reuses the pick render
 * machinery via <code>pickBegin</code>/<code>pickEnd</code>) that targets a
 * dedicated RGBA32F framebuffer instead of the RGBA8 pick framebuffer. Each
 * pixel carries a fuller payload than a pick color:
 * <ul>
 *   <li>R: pick ID (uint32)</li>
 *   <li>G: isEdge flag (0.0/1.0)</li>
 *   <li>B: linear eye-space depth (meters)</li>
 *   <li>A: unused</li>
 * </ul>
 * The payload expression is built in PickingPipelineStage (DrawCommand.snapId)
 * and compiled into a snap-derived shader by
 * DerivedCommand.createSnapDerivedCommand. Only commands with a
 * <code>snapId</code> (i.e. Model-pipeline primitives) render during a
 * snapping pass.
 *
 * @namespace Snapping
 *
 * @private
 */
const Snapping = {};

const scratchRectangle = new BoundingRectangle(0.0, 0.0, 3.0, 3.0);
const scratchSnapCoord = new Cartesian2();
const scratchSnapRay = new Ray();
const scratchSnapOffset = new Cartesian3();

// Radius around the crosshair, in pixels, used to sample the nearest surface
// (the occluder the cursor is on).
const SNAP_OCCLUDER_RADIUS_PIXELS = 3.0;

// An edge more than this fraction deeper than that surface is treated as
// occluded by it (the edge is only visible because it pokes through a gap in a
// nearer silhouette), so snap doesn't punch through to geometry behind the
// object the cursor is on.
const SNAP_OCCLUSION_TOLERANCE = 0.1;

function cursorDist(hit) {
  return Math.sqrt(hit.x * hit.x + hit.y * hit.y);
}

function selectBestHit(hits) {
  // Depth of the nearest surface under the crosshair; edges well behind it are
  // occluded by the object the cursor is on and must not win.
  let occluderDepth = Number.POSITIVE_INFINITY;
  for (const hit of hits) {
    if (!hit.isEdge && cursorDist(hit) <= SNAP_OCCLUDER_RADIUS_PIXELS) {
      occluderDepth = Math.min(occluderDepth, hit.depth);
    }
  }
  const maxEdgeDepth = occluderDepth * (1.0 + SNAP_OCCLUSION_TOLERANCE);

  // Edges outrank surfaces, but only edges in front of (or at) the occluder;
  // otherwise fall back to the closest surface. Within the chosen group the
  // hit closest to the crosshair wins.
  const visible = hits.filter(
    (hit) => !hit.isEdge || hit.depth <= maxEdgeDepth,
  );
  const wantEdge = visible.some((hit) => hit.isEdge);
  const group = visible.filter((hit) => hit.isEdge === wantEdge);
  return group.reduce((best, hit) =>
    cursorDist(hit) < cursorDist(best) ? hit : best,
  );
}

// Unproject a snap hit's eye-space depth (channel B of the snap framebuffer,
// written by the snap shader at the edge fragment itself) into a world
// position.
function snapHitToWorld(scene, windowPosition, hit) {
  const coords = scratchSnapCoord;
  coords.x = windowPosition.x + hit.x;
  coords.y = windowPosition.y + hit.y;

  const ray = scene.camera.getPickRay(coords, scratchSnapRay);
  if (!defined(ray)) {
    return undefined;
  }

  // hit.depth is perpendicular distance from the camera plane along the view
  // direction; convert to distance along the (non-axis-aligned) pick ray.
  const cos = Cartesian3.dot(ray.direction, scene.camera.directionWC);
  if (cos <= 0.0) {
    return undefined;
  }
  const t = hit.depth / cos;

  const offset = Cartesian3.multiplyByScalar(
    ray.direction,
    t,
    scratchSnapOffset,
  );
  return Cartesian3.add(ray.origin, offset, new Cartesian3());
}

/**
 * Returns the best snap target in a screen-space region around
 * <code>windowPosition</code>. See {@link Scene#snap} for the public API.
 *
 * @param {Scene} scene
 * @param {Cartesian2} windowPosition Window coordinates at the center of the search region.
 * @param {number} [width=3] Width of the search region in pixels.
 * @param {number} [height=3] Height of the search region in pixels.
 * @returns {{object: object, isEdge: boolean, position: Cartesian3, x: number, y: number} | undefined}
 *
 * @private
 */
Snapping.snap = function (scene, windowPosition, width, height) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("windowPosition", windowPosition);
  //>>includeEnd('debug');

  const { context, defaultView } = scene;

  // The snap framebuffer is RGBA32F; rendering to it requires float color
  // attachment support.
  if (!context.colorBufferFloat) {
    oneTimeWarning(
      "snap-color-buffer-float",
      "Scene.snap requires the EXT_color_buffer_float extension, which is not supported on this platform.",
    );
    return undefined;
  }

  // Created lazily so applications that never snap pay no framebuffer cost.
  if (!defined(defaultView.snapFramebuffer)) {
    defaultView.snapFramebuffer = new SnapFramebuffer(context);
  }
  const snapFramebuffer = defaultView.snapFramebuffer;

  const drawingBufferRectangle = scratchRectangle;
  pickBegin(scene, windowPosition, drawingBufferRectangle, width, height, {
    framebuffer: snapFramebuffer,
    snap: true,
  });
  const hits = snapFramebuffer.end(drawingBufferRectangle);
  pickEnd(scene);

  if (hits.length === 0) {
    return undefined;
  }

  const best = selectBestHit(hits);
  if (!defined(best)) {
    return undefined;
  }

  const position = snapHitToWorld(scene, windowPosition, best);
  if (!defined(position)) {
    return undefined;
  }

  return {
    object: best.object,
    isEdge: best.isEdge,
    position: position,
    x: best.x,
    y: best.y,
  };
};

export default Snapping;
