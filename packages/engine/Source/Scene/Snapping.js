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

/**
 * Sort comparator for snap hits, best-first:
 * <ol>
 *   <li>Edges before non-edges.</li>
 *   <li>Closest to the cursor in screen space. This matches user intent: the
 *       hit "under the crosshair" wins, even if a nearer-in-depth edge sits
 *       elsewhere in the search region.</li>
 *   <li>Tiebreak on linear eye depth (front-most wins). Pixel-distance ties
 *       are common because x*x + y*y is integer-valued on the pixel grid
 *       (e.g. (3,0) and (0,3) both equal 9); without this tiebreak the result
 *       would be sort-order-dependent. depth is the linear eye-space distance
 *       written by the snap shader (channel B), so the comparison is valid
 *       across the whole scene rather than only within a single frustum.</li>
 * </ol>
 *
 * @private
 */
function compareSnapHits(a, b) {
  if (a.isEdge !== b.isEdge) {
    return a.isEdge ? -1 : 1;
  }

  const dCursor = a.x * a.x + a.y * a.y - (b.x * b.x + b.y * b.y);
  if (dCursor !== 0) {
    return dCursor;
  }

  return a.depth - b.depth;
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

  hits.sort(compareSnapHits);

  const best = hits[0];
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
