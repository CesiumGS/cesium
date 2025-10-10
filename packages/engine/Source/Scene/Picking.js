import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import PerspectiveOffCenterFrustum from "../Core/PerspectiveOffCenterFrustum.js";
import Ray from "../Core/Ray.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import Camera from "./Camera.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import MetadataPicking from "./MetadataPicking.js";
import PickDepth from "./PickDepth.js";
import PrimitiveCollection from "./PrimitiveCollection.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";
import View from "./View.js";

const offscreenDefaultWidth = 0.1;

const mostDetailedPreloadTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.MOST_DETAILED_PRELOAD,
});

const mostDetailedPickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.MOST_DETAILED_PICK,
});

const pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

/**
 * @private
 */
function Picking(scene) {
  this._mostDetailedRayPicks = [];
  this.pickRenderStateCache = {};
  this._pickPositionCache = {};
  this._pickPositionCacheDirty = false;

  const pickOffscreenViewport = new BoundingRectangle(0, 0, 1, 1);
  const pickOffscreenCamera = new Camera(scene);
  pickOffscreenCamera.frustum = new OrthographicFrustum({
    width: offscreenDefaultWidth,
    aspectRatio: 1.0,
    near: 0.1,
  });

  this._pickOffscreenView = new View(
    scene,
    pickOffscreenCamera,
    pickOffscreenViewport,
  );
}

Picking.prototype.update = function () {
  this._pickPositionCacheDirty = true;
};

Picking.prototype.getPickDepth = function (scene, index) {
  const pickDepths = scene.view.pickDepths;
  let pickDepth = pickDepths[index];
  if (!defined(pickDepth)) {
    pickDepth = new PickDepth();
    pickDepths[index] = pickDepth;
  }
  return pickDepth;
};

const scratchOrthoPickingFrustum = new OrthographicOffCenterFrustum();
const scratchOrthoOrigin = new Cartesian3();
const scratchOrthoDirection = new Cartesian3();
const scratchOrthoPixelSize = new Cartesian2();
const scratchOrthoPickVolumeMatrix4 = new Matrix4();

function getPickOrthographicCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport,
) {
  const camera = scene.camera;
  let frustum = camera.frustum;
  const offCenterFrustum = frustum.offCenterFrustum;
  if (defined(offCenterFrustum)) {
    frustum = offCenterFrustum;
  }

  let x = (2.0 * (drawingBufferPosition.x - viewport.x)) / viewport.width - 1.0;
  x *= (frustum.right - frustum.left) * 0.5;
  let y =
    (2.0 * (viewport.height - drawingBufferPosition.y - viewport.y)) /
      viewport.height -
    1.0;
  y *= (frustum.top - frustum.bottom) * 0.5;

  const transform = Matrix4.clone(
    camera.transform,
    scratchOrthoPickVolumeMatrix4,
  );
  camera._setTransform(Matrix4.IDENTITY);

  const origin = Cartesian3.clone(camera.position, scratchOrthoOrigin);
  Cartesian3.multiplyByScalar(camera.right, x, scratchOrthoDirection);
  Cartesian3.add(scratchOrthoDirection, origin, origin);
  Cartesian3.multiplyByScalar(camera.up, y, scratchOrthoDirection);
  Cartesian3.add(scratchOrthoDirection, origin, origin);

  camera._setTransform(transform);

  if (scene.mode === SceneMode.SCENE2D) {
    Cartesian3.fromElements(origin.z, origin.x, origin.y, origin);
  }

  const pixelSize = frustum.getPixelDimensions(
    viewport.width,
    viewport.height,
    1.0,
    1.0,
    scratchOrthoPixelSize,
  );

  const ortho = scratchOrthoPickingFrustum;
  ortho.right = pixelSize.x * 0.5;
  ortho.left = -ortho.right;
  ortho.top = pixelSize.y * 0.5;
  ortho.bottom = -ortho.top;
  ortho.near = frustum.near;
  ortho.far = frustum.far;

  return ortho.computeCullingVolume(origin, camera.directionWC, camera.upWC);
}

const scratchPerspPickingFrustum = new PerspectiveOffCenterFrustum();
const scratchPerspPixelSize = new Cartesian2();

function getPickPerspectiveCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport,
) {
  const camera = scene.camera;
  const frustum = camera.frustum;
  const near = frustum.near;

  const tanPhi = Math.tan(frustum.fovy * 0.5);
  const tanTheta = frustum.aspectRatio * tanPhi;

  const x =
    (2.0 * (drawingBufferPosition.x - viewport.x)) / viewport.width - 1.0;
  const y =
    (2.0 * (viewport.height - drawingBufferPosition.y - viewport.y)) /
      viewport.height -
    1.0;

  const xDir = x * near * tanTheta;
  const yDir = y * near * tanPhi;

  const pixelSize = frustum.getPixelDimensions(
    viewport.width,
    viewport.height,
    1.0,
    1.0,
    scratchPerspPixelSize,
  );
  const pickWidth = pixelSize.x * width * 0.5;
  const pickHeight = pixelSize.y * height * 0.5;

  const offCenter = scratchPerspPickingFrustum;
  offCenter.top = yDir + pickHeight;
  offCenter.bottom = yDir - pickHeight;
  offCenter.right = xDir + pickWidth;
  offCenter.left = xDir - pickWidth;
  offCenter.near = near;
  offCenter.far = frustum.far;

  return offCenter.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC,
  );
}

function getPickCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport,
) {
  const frustum = scene.camera.frustum;
  if (
    frustum instanceof OrthographicFrustum ||
    frustum instanceof OrthographicOffCenterFrustum
  ) {
    return getPickOrthographicCullingVolume(
      scene,
      drawingBufferPosition,
      width,
      height,
      viewport,
    );
  }

  return getPickPerspectiveCullingVolume(
    scene,
    drawingBufferPosition,
    width,
    height,
    viewport,
  );
}

// Pick position and rectangle, used in all picking functions,
// filled in computePickingDrawingBufferRectangle and passed
// the the FrameBuffer begin/end methods
const scratchRectangle = new BoundingRectangle(0.0, 0.0, 3.0, 3.0);
const scratchPosition = new Cartesian2();

// Dummy color that is passed to updateAndExecuteCommands in
// all picking functions, used as the "background color"
const scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);

/**
 * Compute the rectangle that describes the part of the drawing buffer
 * that is relevant for picking.
 *
 * @param {number} drawingBufferHeight The height of the drawing buffer
 * @param {Cartesian2} position The position inside the drawing buffer
 * @param {number|undefined} width The width of the rectangle, assumed to
 * be an odd integer number, default : 3.0
 * @param {number|undefined} height The height of the rectangle. If unspecified,
 * height will default to the value of <code>width</code>
 * @param {BoundingRectangle} result The result rectangle
 * @returns {BoundingRectangle} The result rectangle
 */
function computePickingDrawingBufferRectangle(
  drawingBufferHeight,
  position,
  width,
  height,
  result,
) {
  result.width = width ?? 3.0;
  result.height = height ?? result.width;
  result.x = position.x - (result.width - 1.0) * 0.5;
  result.y = drawingBufferHeight - position.y - (result.height - 1.0) * 0.5;
  return result;
}

/**
 * Returns a list of objects with a <code>primitive</code> property that contains the first (top) primitives
 * in the scene at a particular window coordinate. Other properties may potentially be set depending on the
 * type of primitive and may be used to further identify the picked object.
 * <p>
 * When a feature of a 3D Tiles tileset is picked, <code>pick</code> returns a {@link Cesium3DTileFeature} object.
 * </p>
 * @param {Scene} scene
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {number} [width=3] Width of the pick rectangle.
 * @param {number} [height=3] Height of the pick rectangle.
 * @param {number} [limit=1] If supplied, stop iterating after collecting this many objects.
 * @returns {object[]} List of objects containing the picked primitives.
 */
Picking.prototype.pick = function (
  scene,
  windowPosition,
  width,
  height,
  limit = 1,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("windowPosition", windowPosition);
  //>>includeEnd('debug');

  const { context, frameState, defaultView } = scene;
  const { viewport, pickFramebuffer } = defaultView;

  scene.view = defaultView;

  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  let passState = defaultView.passState;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  const drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(
    scene,
    windowPosition,
    scratchPosition,
  );
  const drawingBufferRectangle = computePickingDrawingBufferRectangle(
    context.drawingBufferHeight,
    drawingBufferPosition,
    width,
    height,
    scratchRectangle,
  );

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    drawingBufferRectangle.width,
    drawingBufferRectangle.height,
    viewport,
  );
  frameState.invertClassification = false;
  frameState.passes.pick = true;
  frameState.tilesetPassState = pickTilesetPassState;

  context.uniformState.update(frameState);

  scene.updateEnvironment();

  passState = pickFramebuffer.begin(drawingBufferRectangle, viewport);

  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  const pickedObjects = pickFramebuffer.end(drawingBufferRectangle, limit);
  context.endFrame();
  return pickedObjects;
};

/**
 * Returns an object with information about the voxel sample rendered at
 * a particular window coordinate. Returns <code>undefined</code> if there is no
 * voxel at that position.
 *
 * @param {Scene} scene
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {number} [width=3] Width of the pick rectangle.
 * @param {number} [height=3] Height of the pick rectangle.
 * @returns {object|undefined} Object containing the picked primitive.
 */
Picking.prototype.pickVoxelCoordinate = function (
  scene,
  windowPosition,
  width,
  height,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("windowPosition", windowPosition);
  //>>includeEnd('debug');

  const { context, frameState, defaultView } = scene;
  const { viewport, pickFramebuffer } = defaultView;

  scene.view = defaultView;

  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  let passState = defaultView.passState;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  const drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(
    scene,
    windowPosition,
    scratchPosition,
  );
  const drawingBufferRectangle = computePickingDrawingBufferRectangle(
    context.drawingBufferHeight,
    drawingBufferPosition,
    width,
    height,
    scratchRectangle,
  );

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    drawingBufferRectangle.width,
    drawingBufferRectangle.height,
    viewport,
  );
  frameState.invertClassification = false;
  frameState.passes.pickVoxel = true;
  frameState.tilesetPassState = pickTilesetPassState;

  context.uniformState.update(frameState);

  scene.updateEnvironment();

  passState = pickFramebuffer.begin(drawingBufferRectangle, viewport);

  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  const voxelInfo = pickFramebuffer.readCenterPixel(drawingBufferRectangle);
  context.endFrame();
  return voxelInfo;
};

/**
 * Pick a metadata value at the given window position.
 *
 * The given `pickedMetadataInfo` defines the metadata value that is
 * supposed to be picked.
 *
 * The return type will depend on the type of the metadata property
 * that is picked. Given the current limitations of the types that
 * are supported for metadata picking, the return type will be one
 * of the following:
 *
 * - For `SCALAR`, the return type will be a `number`
 * - For `SCALAR` arrays, the return type will be a `number[]`
 * - For `VEC2`, the return type will be a `Cartesian2`
 * - For `VEC3`, the return type will be a `Cartesian3`
 * - For `VEC4`, the return type will be a `Cartesian4`
 *
 * Future implementations may additionally return `string`- or
 * `boolean` types, and `MATn` values as `MatrixN` objects,
 * and arrays of the respective types.
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {PickedMetadataInfo} pickedMetadataInfo Information about the picked metadata.
 * @returns {MetadataValue|undefined} The metadata value, or `undefined`
 * when no matching metadata value could be picked at the given position
 *
 * @private
 */
Picking.prototype.pickMetadata = function (
  scene,
  windowPosition,
  pickedMetadataInfo,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("windowPosition", windowPosition);
  Check.typeOf.object("pickedMetadataInfo", pickedMetadataInfo);
  //>>includeEnd('debug');

  const { context, frameState, defaultView } = scene;
  const { viewport, pickFramebuffer } = defaultView;

  scene.view = defaultView;

  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  let passState = defaultView.passState;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  const drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(
    scene,
    windowPosition,
    scratchPosition,
  );
  const drawingBufferRectangle = computePickingDrawingBufferRectangle(
    context.drawingBufferHeight,
    drawingBufferPosition,
    1.0,
    1.0,
    scratchRectangle,
  );

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    drawingBufferRectangle.width,
    drawingBufferRectangle.height,
    viewport,
  );
  frameState.invertClassification = false;

  frameState.passes.pick = true;
  frameState.tilesetPassState = pickTilesetPassState;

  // Insert the information about the picked metadata property
  // into the frame state, so that the `Scene.updateDerivedCommands`
  // call can detect any changes in the picked metadata description,
  // and update the derived commands for the new picked metadata
  // property
  frameState.pickingMetadata = true;
  frameState.pickedMetadataInfo = pickedMetadataInfo;
  context.uniformState.update(frameState);

  scene.updateEnvironment();

  passState = pickFramebuffer.begin(drawingBufferRectangle, viewport);

  scene.updateAndExecuteCommands(passState, scratchColorZero);

  // When OIT is enabled, then the resolveFrameBuffers function
  // will juggle around several frame buffers, and eventually use
  // the "environmentState.originalFramebuffer" instead of the
  // picking frame buffer. Skipping a million questions, just
  // switch OIT off here:
  const oldOIT = scene._environmentState.useOIT;
  scene._environmentState.useOIT = false;
  scene.resolveFramebuffers(passState);
  scene._environmentState.useOIT = oldOIT;

  const rawMetadataPixel = pickFramebuffer.readCenterPixel(
    drawingBufferRectangle,
  );
  context.endFrame();

  frameState.pickingMetadata = false;

  const metadataValue = MetadataPicking.decodeMetadataValues(
    pickedMetadataInfo.classProperty,
    pickedMetadataInfo.metadataProperty,
    rawMetadataPixel,
  );

  return metadataValue;
};

/**
 * @typedef {object} PickedMetadataInfo
 *
 * Information about metadata that is supposed to be picked
 *
 * @property {string|undefined} schemaId The optional ID of the metadata schema
 * @property {string} className The name of the metadata class
 * @property {string} propertyName The name of the metadata property
 * @property {MetadataClassProperty} classProperty The metadata class property
 */

function renderTranslucentDepthForPick(scene, drawingBufferPosition) {
  // PERFORMANCE_IDEA: render translucent only and merge with the previous frame
  const { defaultView, context, frameState, environmentState } = scene;
  const { viewport, pickDepthFramebuffer } = defaultView;

  scene.view = defaultView;

  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  let passState = defaultView.passState;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  scene.clearPasses(frameState.passes);
  frameState.passes.pick = true;
  frameState.passes.depth = true;
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    1,
    1,
    viewport,
  );
  frameState.tilesetPassState = pickTilesetPassState;

  scene.updateEnvironment();
  environmentState.renderTranslucentDepthForPick = true;
  passState = pickDepthFramebuffer.update(
    context,
    drawingBufferPosition,
    viewport,
  );

  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  context.endFrame();
}

const scratchPerspectiveFrustum = new PerspectiveFrustum();
const scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
const scratchOrthographicFrustum = new OrthographicFrustum();
const scratchOrthographicOffCenterFrustum = new OrthographicOffCenterFrustum();

Picking.prototype.pickPositionWorldCoordinates = function (
  scene,
  windowPosition,
  result,
) {
  if (!scene.useDepthPicking) {
    return undefined;
  }

  //>>includeStart('debug', pragmas.debug);
  Check.defined("windowPosition", windowPosition);
  if (!scene.context.depthTexture) {
    throw new DeveloperError(
      "Picking from the depth buffer is not supported. Check pickPositionSupported.",
    );
  }
  //>>includeEnd('debug');

  const cacheKey = windowPosition.toString();

  if (this._pickPositionCacheDirty) {
    this._pickPositionCache = {};
    this._pickPositionCacheDirty = false;
  } else if (this._pickPositionCache.hasOwnProperty(cacheKey)) {
    return Cartesian3.clone(this._pickPositionCache[cacheKey], result);
  }

  const { context, frameState, camera, defaultView } = scene;
  const { uniformState } = context;

  scene.view = defaultView;

  const drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(
    scene,
    windowPosition,
    scratchPosition,
  );
  if (scene.pickTranslucentDepth) {
    renderTranslucentDepthForPick(scene, drawingBufferPosition);
  } else {
    scene.updateFrameState();
    uniformState.update(frameState);
    scene.updateEnvironment();
  }
  drawingBufferPosition.y = scene.drawingBufferHeight - drawingBufferPosition.y;

  // Create a working frustum from the original camera frustum.
  let frustum;
  if (defined(camera.frustum.fov)) {
    frustum = camera.frustum.clone(scratchPerspectiveFrustum);
  } else if (defined(camera.frustum.infiniteProjectionMatrix)) {
    frustum = camera.frustum.clone(scratchPerspectiveOffCenterFrustum);
  } else if (defined(camera.frustum.width)) {
    frustum = camera.frustum.clone(scratchOrthographicFrustum);
  } else {
    frustum = camera.frustum.clone(scratchOrthographicOffCenterFrustum);
  }

  const { frustumCommandsList } = defaultView;
  const numFrustums = frustumCommandsList.length;
  for (let i = 0; i < numFrustums; ++i) {
    const pickDepth = this.getPickDepth(scene, i);
    const depth = pickDepth.getDepth(
      context,
      drawingBufferPosition.x,
      drawingBufferPosition.y,
    );
    if (!defined(depth)) {
      continue;
    }
    if (depth > 0.0 && depth < 1.0) {
      const renderedFrustum = frustumCommandsList[i];
      let height2D;
      if (scene.mode === SceneMode.SCENE2D) {
        height2D = camera.position.z;
        camera.position.z = height2D - renderedFrustum.near + 1.0;
        frustum.far = Math.max(1.0, renderedFrustum.far - renderedFrustum.near);
        frustum.near = 1.0;
        uniformState.update(frameState);
        uniformState.updateFrustum(frustum);
      } else {
        frustum.near =
          renderedFrustum.near *
          (i !== 0 ? scene.opaqueFrustumNearOffset : 1.0);
        frustum.far = renderedFrustum.far;
        uniformState.updateFrustum(frustum);
      }

      result = SceneTransforms.drawingBufferToWorldCoordinates(
        scene,
        drawingBufferPosition,
        depth,
        result,
      );

      if (scene.mode === SceneMode.SCENE2D) {
        camera.position.z = height2D;
        uniformState.update(frameState);
      }

      this._pickPositionCache[cacheKey] = Cartesian3.clone(result);
      return result;
    }
  }

  this._pickPositionCache[cacheKey] = undefined;
  return undefined;
};

const scratchPickPositionCartographic = new Cartographic();

Picking.prototype.pickPosition = function (scene, windowPosition, result) {
  result = this.pickPositionWorldCoordinates(scene, windowPosition, result);
  if (defined(result) && scene.mode !== SceneMode.SCENE3D) {
    Cartesian3.fromElements(result.y, result.z, result.x, result);

    const projection = scene.mapProjection;
    const ellipsoid = projection.ellipsoid;

    const cart = projection.unproject(result, scratchPickPositionCartographic);
    ellipsoid.cartographicToCartesian(cart, result);
  }

  return result;
};

/**
 * @param {object[]} pickedResults the results from the pickCallback
 * @param {number} limit If supplied, stop drilling after collecting this many picks.
 * @param {object[]} results
 * @param {object[]} pickedPrimitives
 * @param {object[]} pickedAttributes
 * @param {object[]} pickedFeatures
 * @returns {boolean} whether picking should end
 */
function addDrillPickedResults(
  pickedResults,
  limit,
  results,
  pickedPrimitives,
  pickedAttributes,
  pickedFeatures,
) {
  for (const pickedResult of pickedResults) {
    const object = pickedResult.object;
    const position = pickedResult.position;
    const exclude = pickedResult.exclude;

    if (defined(position) && !defined(object)) {
      results.push(pickedResult);
      return true;
    }

    if (!defined(object) || !defined(object.primitive)) {
      return true;
    }

    if (!exclude) {
      results.push(pickedResult);
      if (results.length >= limit) {
        return true;
      }
    }

    const primitive = object.primitive;
    let hasShowAttribute = false;

    // If the picked object has a show attribute, use it.
    if (typeof primitive.getGeometryInstanceAttributes === "function") {
      if (defined(object.id)) {
        const attributes = primitive.getGeometryInstanceAttributes(object.id);
        if (defined(attributes) && defined(attributes.show)) {
          hasShowAttribute = true;
          attributes.show = ShowGeometryInstanceAttribute.toValue(
            false,
            attributes.show,
          );
          pickedAttributes.push(attributes);
        }
      }
    }

    if (object instanceof Cesium3DTileFeature) {
      hasShowAttribute = true;
      object.show = false;
      pickedFeatures.push(object);
    }

    // Otherwise, hide the entire primitive
    if (!hasShowAttribute) {
      primitive.show = false;
      pickedPrimitives.push(primitive);
    }
  }
}

/**
 * Drill pick by repeatedly calling a given `pickCallback`, each time stripping away the previously picked objects.
 * @param {function(number): object[]} pickCallback Pick callback to execute each iteration
 * @param {number} [limit=Number.MAX_VALUE] If supplied, stop drilling after collecting this many picks
 * @returns {object[]} List of picked results
 */
function drillPick(pickCallback, limit) {
  // PERFORMANCE_IDEA: This function calls each primitive's update for each pass. Instead
  // we could update the primitive once, and then just execute their commands for each pass,
  // and cull commands for picked primitives.  e.g., base on the command's owner.
  const results = [];
  const pickedPrimitives = [];
  const pickedAttributes = [];
  const pickedFeatures = [];
  if (!defined(limit)) {
    limit = Number.MAX_VALUE;
  }

  let pickedResults = pickCallback(limit);
  while (defined(pickedResults) && pickedResults.length > 0) {
    const complete = addDrillPickedResults(
      pickedResults,
      limit,
      results,
      pickedPrimitives,
      pickedAttributes,
      pickedFeatures,
    );
    if (complete) {
      break;
    }
    pickedResults = pickCallback(limit - results.length);
  }

  // Unhide everything we hid while drill picking
  for (let i = 0; i < pickedPrimitives.length; ++i) {
    pickedPrimitives[i].show = true;
  }

  for (let i = 0; i < pickedAttributes.length; ++i) {
    const attributes = pickedAttributes[i];
    attributes.show = ShowGeometryInstanceAttribute.toValue(
      true,
      attributes.show,
    );
  }

  for (let i = 0; i < pickedFeatures.length; ++i) {
    pickedFeatures[i].show = true;
  }

  return results;
}

Picking.prototype.drillPick = function (
  scene,
  windowPosition,
  limit,
  width,
  height,
) {
  const pickCallback = (limit) => {
    const pickedObjects = this.pick(
      scene,
      windowPosition,
      width,
      height,
      limit,
    );
    return pickedObjects.map((object) => ({
      object: object,
      position: undefined,
      exclude: false,
    }));
  };
  const objects = drillPick(pickCallback, limit);
  return objects.map((element) => element.object);
};

const scratchRight = new Cartesian3();
const scratchUp = new Cartesian3();

function MostDetailedRayPick(ray, width, tilesets) {
  this.ray = ray;
  this.width = width;
  this.tilesets = tilesets;
  this.ready = false;
  const pick = this;
  this.promise = new Promise((resolve) => {
    pick._completePick = () => {
      resolve();
    };
  });
}

function updateOffscreenCameraFromRay(picking, ray, width, camera) {
  const direction = ray.direction;
  const orthogonalAxis = Cartesian3.mostOrthogonalAxis(direction, scratchRight);
  const right = Cartesian3.cross(direction, orthogonalAxis, scratchRight);
  const up = Cartesian3.cross(direction, right, scratchUp);

  camera.position = ray.origin;
  camera.direction = direction;
  camera.up = up;
  camera.right = right;

  camera.frustum.width = width ?? offscreenDefaultWidth;
  return camera.frustum.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC,
  );
}

function updateMostDetailedRayPick(picking, scene, rayPick) {
  const frameState = scene.frameState;

  const { ray, width, tilesets } = rayPick;

  const camera = picking._pickOffscreenView.camera;
  const cullingVolume = updateOffscreenCameraFromRay(
    picking,
    ray,
    width,
    camera,
  );

  const tilesetPassState = mostDetailedPreloadTilesetPassState;
  tilesetPassState.camera = camera;
  tilesetPassState.cullingVolume = cullingVolume;

  let ready = true;
  const tilesetsLength = tilesets.length;
  for (let i = 0; i < tilesetsLength; ++i) {
    const tileset = tilesets[i];
    if (tileset.show && scene.primitives.contains(tileset)) {
      // Only update tilesets that are still contained in the scene's primitive collection and are still visible
      // Update tilesets continually until all tilesets are ready. This way tiles are never removed from the cache.
      tileset.updateForPass(frameState, tilesetPassState);
      ready = ready && tilesetPassState.ready;
    }
  }

  if (ready) {
    rayPick._completePick();
  }

  return ready;
}

Picking.prototype.updateMostDetailedRayPicks = function (scene) {
  // Modifies array during iteration
  const rayPicks = this._mostDetailedRayPicks;
  for (let i = 0; i < rayPicks.length; ++i) {
    if (updateMostDetailedRayPick(this, scene, rayPicks[i])) {
      rayPicks.splice(i--, 1);
    }
  }
};

function getTilesets(primitives, objectsToExclude, tilesets) {
  for (let i = 0; i < primitives.length; ++i) {
    const primitive = primitives.get(i);
    if (primitive.show) {
      if (defined(primitive.isCesium3DTileset)) {
        if (
          !defined(objectsToExclude) ||
          objectsToExclude.indexOf(primitive) === -1
        ) {
          tilesets.push(primitive);
        }
      } else if (primitive instanceof PrimitiveCollection) {
        getTilesets(primitive, objectsToExclude, tilesets);
      }
    }
  }
}

/**
 * @private
 * @param {Picking} picking
 * @param {Scene} scene
 * @param {Ray} ray
 * @param {object[] | undefined} objectsToExclude
 * @param {number | undefined} width
 * @param {Function} callback
 * @returns {Promise<Cartesian3 | undefined>}
 */
function launchMostDetailedRayPick(
  picking,
  scene,
  ray,
  objectsToExclude,
  width,
  callback,
) {
  const tilesets = [];
  getTilesets(scene.primitives, objectsToExclude, tilesets);
  if (tilesets.length === 0) {
    return Promise.resolve(callback());
  }

  const rayPick = new MostDetailedRayPick(ray, width, tilesets);
  picking._mostDetailedRayPicks.push(rayPick);
  return rayPick.promise.then(function () {
    return callback();
  });
}

function isExcluded(object, objectsToExclude) {
  if (
    !defined(object) ||
    !defined(objectsToExclude) ||
    objectsToExclude.length === 0
  ) {
    return false;
  }
  return (
    objectsToExclude.indexOf(object) > -1 ||
    objectsToExclude.indexOf(object.primitive) > -1 ||
    objectsToExclude.indexOf(object.id) > -1
  );
}

function getRayIntersection(
  picking,
  scene,
  ray,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed,
) {
  const { context, frameState } = scene;
  const uniformState = context.uniformState;

  const view = picking._pickOffscreenView;
  scene.view = view;

  updateOffscreenCameraFromRay(picking, ray, width, view.camera);

  const drawingBufferRectangle = BoundingRectangle.clone(
    view.viewport,
    scratchRectangle,
  );

  const passState = view.pickFramebuffer.begin(
    drawingBufferRectangle,
    view.viewport,
  );

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.invertClassification = false;
  frameState.passes.pick = true;
  frameState.passes.offscreen = true;

  if (mostDetailed) {
    frameState.tilesetPassState = mostDetailedPickTilesetPassState;
  } else {
    frameState.tilesetPassState = pickTilesetPassState;
  }

  uniformState.update(frameState);

  scene.updateEnvironment();
  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  let position;
  // Picking one object, result is either [object] or []
  const object = view.pickFramebuffer.end(drawingBufferRectangle, 1)[0];

  if (scene.context.depthTexture) {
    const { frustumCommandsList } = view;
    const numFrustums = frustumCommandsList.length;
    for (let i = 0; i < numFrustums; ++i) {
      const pickDepth = picking.getPickDepth(scene, i);
      const depth = pickDepth.getDepth(context, 0, 0);
      if (!defined(depth)) {
        continue;
      }
      if (depth > 0.0 && depth < 1.0) {
        const renderedFrustum = frustumCommandsList[i];
        const near =
          renderedFrustum.near *
          (i !== 0 ? scene.opaqueFrustumNearOffset : 1.0);
        const far = renderedFrustum.far;
        const distance = near + depth * (far - near);
        position = Ray.getPoint(ray, distance);
        break;
      }
    }
  }

  scene.view = scene.defaultView;
  context.endFrame();

  if (defined(object) || defined(position)) {
    return {
      object: object,
      position: position,
      exclude:
        (!defined(position) && requirePosition) ||
        isExcluded(object, objectsToExclude),
    };
  }
}

function drillPickFromRay(
  picking,
  scene,
  ray,
  limit,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed,
) {
  const pickCallback = function () {
    const pickResult = getRayIntersection(
      picking,
      scene,
      ray,
      objectsToExclude,
      width,
      requirePosition,
      mostDetailed,
    );
    return pickResult ? [pickResult] : undefined;
  };
  return drillPick(pickCallback, limit);
}

function pickFromRay(
  picking,
  scene,
  ray,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed,
) {
  // Use drillPickFromRay rather than getRayIntersection directly to select the first non-excluded object
  const results = drillPickFromRay(
    picking,
    scene,
    ray,
    1,
    objectsToExclude,
    width,
    requirePosition,
    mostDetailed,
  );
  if (results.length > 0) {
    return results[0];
  }
}

function deferPromiseUntilPostRender(scene, promise) {
  // Resolve promise after scene's postRender in case entities are created when the promise resolves.
  // Entities can't be created between viewer._onTick and viewer._postRender.
  return new Promise((resolve, reject) => {
    promise
      .then(function (result) {
        const removeCallback = scene.postRender.addEventListener(function () {
          removeCallback();
          resolve(result);
        });
        scene.requestRender();
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

Picking.prototype.pickFromRay = function (scene, ray, objectsToExclude, width) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode.",
    );
  }
  //>>includeEnd('debug');

  return pickFromRay(this, scene, ray, objectsToExclude, width, false, false);
};

Picking.prototype.drillPickFromRay = function (
  scene,
  ray,
  limit,
  objectsToExclude,
  width,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode.",
    );
  }
  //>>includeEnd('debug');

  return drillPickFromRay(
    this,
    scene,
    ray,
    limit,
    objectsToExclude,
    width,
    false,
    false,
  );
};

Picking.prototype.pickFromRayMostDetailed = function (
  scene,
  ray,
  objectsToExclude,
  width,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode.",
    );
  }
  //>>includeEnd('debug');

  const that = this;
  ray = Ray.clone(ray);
  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  return deferPromiseUntilPostRender(
    scene,
    launchMostDetailedRayPick(
      that,
      scene,
      ray,
      objectsToExclude,
      width,
      function () {
        return pickFromRay(
          that,
          scene,
          ray,
          objectsToExclude,
          width,
          false,
          true,
        );
      },
    ),
  );
};

Picking.prototype.drillPickFromRayMostDetailed = function (
  scene,
  ray,
  limit,
  objectsToExclude,
  width,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode.",
    );
  }
  //>>includeEnd('debug');

  const that = this;
  ray = Ray.clone(ray);
  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  return deferPromiseUntilPostRender(
    scene,
    launchMostDetailedRayPick(
      that,
      scene,
      ray,
      objectsToExclude,
      width,
      function () {
        return drillPickFromRay(
          that,
          scene,
          ray,
          limit,
          objectsToExclude,
          width,
          false,
          true,
        );
      },
    ),
  );
};

const scratchSurfacePosition = new Cartesian3();
const scratchSurfaceNormal = new Cartesian3();
const scratchSurfaceRay = new Ray();
const scratchCartographic = new Cartographic();

/**
 * @private
 * @param {Scene} scene
 * @param {Cartographic} cartographic
 * @returns {Ray}
 */
function getRayForSampleHeight(scene, cartographic) {
  const ellipsoid = scene.ellipsoid;
  const height = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  const surfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
    cartographic,
    scratchSurfaceNormal,
  );
  const surfacePosition = Cartographic.toCartesian(
    cartographic,
    ellipsoid,
    scratchSurfacePosition,
  );
  const surfaceRay = scratchSurfaceRay;
  surfaceRay.origin = surfacePosition;
  surfaceRay.direction = surfaceNormal;
  const ray = new Ray();
  Ray.getPoint(surfaceRay, height, ray.origin);
  Cartesian3.negate(surfaceNormal, ray.direction);
  return ray;
}

/**
 * @private
 * @param {Scene} scene
 * @param {Cartesian3} cartesian
 * @returns {Ray}
 */
function getRayForClampToHeight(scene, cartesian) {
  const ellipsoid = scene.ellipsoid;
  const cartographic = Cartographic.fromCartesian(
    cartesian,
    ellipsoid,
    scratchCartographic,
  );
  return getRayForSampleHeight(scene, cartographic);
}

function getHeightFromCartesian(scene, cartesian) {
  const ellipsoid = scene.ellipsoid;
  const cartographic = Cartographic.fromCartesian(
    cartesian,
    ellipsoid,
    scratchCartographic,
  );
  return cartographic.height;
}

function sampleHeightMostDetailed(
  picking,
  scene,
  cartographic,
  objectsToExclude,
  width,
) {
  const ray = getRayForSampleHeight(scene, cartographic);
  return launchMostDetailedRayPick(
    picking,
    scene,
    ray,
    objectsToExclude,
    width,
    function () {
      const pickResult = pickFromRay(
        picking,
        scene,
        ray,
        objectsToExclude,
        width,
        true,
        true,
      );
      if (defined(pickResult)) {
        return getHeightFromCartesian(scene, pickResult.position);
      }
    },
  );
}

/**
 * @private
 * @param {Picking} picking
 * @param {Scene} scene
 * @param {Cartesian3} cartesian
 * @param {object[]} [objectsToExclude]
 * @param {number} [width]
 * @param {Cartesian3} [result]
 * @returns {Promise<Cartesian3 | undefined>}
 */
function clampToHeightMostDetailed(
  picking,
  scene,
  cartesian,
  objectsToExclude,
  width,
  result,
) {
  const ray = getRayForClampToHeight(scene, cartesian);
  return launchMostDetailedRayPick(
    picking,
    scene,
    ray,
    objectsToExclude,
    width,
    function () {
      const pickResult = pickFromRay(
        picking,
        scene,
        ray,
        objectsToExclude,
        width,
        true,
        true,
      );
      if (defined(pickResult)) {
        return Cartesian3.clone(pickResult.position, result);
      }
    },
  );
}

Picking.prototype.sampleHeight = function (
  scene,
  position,
  objectsToExclude,
  width,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("position", position);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError("sampleHeight is only supported in 3D mode.");
  }
  if (!scene.sampleHeightSupported) {
    throw new DeveloperError(
      "sampleHeight requires depth texture support. Check sampleHeightSupported.",
    );
  }
  //>>includeEnd('debug');

  const ray = getRayForSampleHeight(scene, position);
  const pickResult = pickFromRay(
    this,
    scene,
    ray,
    objectsToExclude,
    width,
    true,
    false,
  );
  if (defined(pickResult)) {
    return getHeightFromCartesian(scene, pickResult.position);
  }
};

Picking.prototype.clampToHeight = function (
  scene,
  cartesian,
  objectsToExclude,
  width,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesian", cartesian);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError("clampToHeight is only supported in 3D mode.");
  }
  if (!scene.clampToHeightSupported) {
    throw new DeveloperError(
      "clampToHeight requires depth texture support. Check clampToHeightSupported.",
    );
  }
  //>>includeEnd('debug');

  const ray = getRayForClampToHeight(scene, cartesian);
  const pickResult = pickFromRay(
    this,
    scene,
    ray,
    objectsToExclude,
    width,
    true,
    false,
  );
  if (defined(pickResult)) {
    return Cartesian3.clone(pickResult.position, result);
  }
};

Picking.prototype.sampleHeightMostDetailed = function (
  scene,
  positions,
  objectsToExclude,
  width,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "sampleHeightMostDetailed is only supported in 3D mode.",
    );
  }
  if (!scene.sampleHeightSupported) {
    throw new DeveloperError(
      "sampleHeightMostDetailed requires depth texture support. Check sampleHeightSupported.",
    );
  }
  //>>includeEnd('debug');

  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  const length = positions.length;
  const promises = new Array(length);
  for (let i = 0; i < length; ++i) {
    promises[i] = sampleHeightMostDetailed(
      this,
      scene,
      positions[i],
      objectsToExclude,
      width,
    );
  }
  return deferPromiseUntilPostRender(
    scene,
    Promise.all(promises).then(function (heights) {
      const length = heights.length;
      for (let i = 0; i < length; ++i) {
        positions[i].height = heights[i];
      }
      return positions;
    }),
  );
};

/**
 * @private
 * @param {Scene} scene
 * @param {Cartesian3[]} cartesians
 * @param {object[]} [objectsToExclude]
 * @param {number} [width]
 * @returns {Promise<Array<Cartesian3 | undefined>>}
 */
Picking.prototype.clampToHeightMostDetailed = function (
  scene,
  cartesians,
  objectsToExclude,
  width,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesians", cartesians);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "clampToHeightMostDetailed is only supported in 3D mode.",
    );
  }
  if (!scene.clampToHeightSupported) {
    throw new DeveloperError(
      "clampToHeightMostDetailed requires depth texture support. Check clampToHeightSupported.",
    );
  }
  //>>includeEnd('debug');

  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  const length = cartesians.length;
  const promises = new Array(length);
  for (let i = 0; i < length; ++i) {
    promises[i] = clampToHeightMostDetailed(
      this,
      scene,
      cartesians[i],
      objectsToExclude,
      width,
      cartesians[i],
    );
  }
  return deferPromiseUntilPostRender(
    scene,
    Promise.all(promises).then(function (clampedCartesians) {
      const length = clampedCartesians.length;
      for (let i = 0; i < length; ++i) {
        cartesians[i] = clampedCartesians[i];
      }
      return cartesians;
    }),
  );
};

Picking.prototype.destroy = function () {
  this._pickOffscreenView =
    this._pickOffscreenView && this._pickOffscreenView.destroy();
};
export default Picking;
