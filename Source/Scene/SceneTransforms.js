import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import Transforms from "../Core/Transforms.js";
import SceneMode from "./SceneMode.js";

/**
 * Functions that do scene-dependent transforms between rendering-related coordinate systems.
 *
 * @namespace SceneTransforms
 */
const SceneTransforms = {};

const actualPositionScratch = new Cartesian4(0, 0, 0, 1);
let positionCC = new Cartesian4();
const scratchViewport = new BoundingRectangle();

const scratchWindowCoord0 = new Cartesian2();
const scratchWindowCoord1 = new Cartesian2();

/**
 * Transforms a position in WGS84 coordinates to window coordinates.  This is commonly used to place an
 * HTML element at the same screen position as an object in the scene.
 *
 * @param {Scene} scene The scene.
 * @param {Cartesian3} position The position in WGS84 (world) coordinates.
 * @param {Cartesian2} [result] An optional object to return the input position transformed to window coordinates.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
 *
 * @example
 * // Output the window position of longitude/latitude (0, 0) every time the mouse moves.
 * var scene = widget.scene;
 * var ellipsoid = scene.globe.ellipsoid;
 * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 * handler.setInputAction(function(movement) {
 *     console.log(Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position));
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
SceneTransforms.wgs84ToWindowCoordinates = function (scene, position, result) {
  return SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates(
    scene,
    position,
    Cartesian3.ZERO,
    result
  );
};

const scratchCartesian4 = new Cartesian4();
const scratchEyeOffset = new Cartesian3();

function worldToClip(position, eyeOffset, camera, result) {
  const viewMatrix = camera.viewMatrix;

  const positionEC = Matrix4.multiplyByVector(
    viewMatrix,
    Cartesian4.fromElements(
      position.x,
      position.y,
      position.z,
      1,
      scratchCartesian4
    ),
    scratchCartesian4
  );

  const zEyeOffset = Cartesian3.multiplyComponents(
    eyeOffset,
    Cartesian3.normalize(positionEC, scratchEyeOffset),
    scratchEyeOffset
  );
  positionEC.x += eyeOffset.x + zEyeOffset.x;
  positionEC.y += eyeOffset.y + zEyeOffset.y;
  positionEC.z += zEyeOffset.z;

  return Matrix4.multiplyByVector(
    camera.frustum.projectionMatrix,
    positionEC,
    result
  );
}

const scratchMaxCartographic = new Cartographic(
  Math.PI,
  CesiumMath.PI_OVER_TWO
);
const scratchProjectedCartesian = new Cartesian3();
const scratchCameraPosition = new Cartesian3();

/**
 * @private
 */
SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates = function (
  scene,
  position,
  eyeOffset,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  if (!defined(position)) {
    throw new DeveloperError("position is required.");
  }
  //>>includeEnd('debug');

  // Transform for 3D, 2D, or Columbus view
  const frameState = scene.frameState;
  const actualPosition = SceneTransforms.computeActualWgs84Position(
    frameState,
    position,
    actualPositionScratch
  );

  if (!defined(actualPosition)) {
    return undefined;
  }

  // Assuming viewport takes up the entire canvas...
  const canvas = scene.canvas;
  const viewport = scratchViewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = canvas.clientWidth;
  viewport.height = canvas.clientHeight;

  const camera = scene.camera;
  let cameraCentered = false;

  if (frameState.mode === SceneMode.SCENE2D) {
    const projection = scene.mapProjection;
    const maxCartographic = scratchMaxCartographic;
    const maxCoord = projection.project(
      maxCartographic,
      scratchProjectedCartesian
    );

    const cameraPosition = Cartesian3.clone(
      camera.position,
      scratchCameraPosition
    );
    const frustum = camera.frustum.clone();

    const viewportTransformation = Matrix4.computeViewportTransformation(
      viewport,
      0.0,
      1.0,
      new Matrix4()
    );
    const projectionMatrix = camera.frustum.projectionMatrix;

    const x = camera.positionWC.y;
    const eyePoint = Cartesian3.fromElements(
      CesiumMath.sign(x) * maxCoord.x - x,
      0.0,
      -camera.positionWC.x
    );
    const windowCoordinates = Transforms.pointToGLWindowCoordinates(
      projectionMatrix,
      viewportTransformation,
      eyePoint
    );

    if (
      x === 0.0 ||
      windowCoordinates.x <= 0.0 ||
      windowCoordinates.x >= canvas.clientWidth
    ) {
      cameraCentered = true;
    } else {
      if (windowCoordinates.x > canvas.clientWidth * 0.5) {
        viewport.width = windowCoordinates.x;

        camera.frustum.right = maxCoord.x - x;

        positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
        SceneTransforms.clipToGLWindowCoordinates(
          viewport,
          positionCC,
          scratchWindowCoord0
        );

        viewport.x += windowCoordinates.x;

        camera.position.x = -camera.position.x;

        const right = camera.frustum.right;
        camera.frustum.right = -camera.frustum.left;
        camera.frustum.left = -right;

        positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
        SceneTransforms.clipToGLWindowCoordinates(
          viewport,
          positionCC,
          scratchWindowCoord1
        );
      } else {
        viewport.x += windowCoordinates.x;
        viewport.width -= windowCoordinates.x;

        camera.frustum.left = -maxCoord.x - x;

        positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
        SceneTransforms.clipToGLWindowCoordinates(
          viewport,
          positionCC,
          scratchWindowCoord0
        );

        viewport.x = viewport.x - viewport.width;

        camera.position.x = -camera.position.x;

        const left = camera.frustum.left;
        camera.frustum.left = -camera.frustum.right;
        camera.frustum.right = -left;

        positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
        SceneTransforms.clipToGLWindowCoordinates(
          viewport,
          positionCC,
          scratchWindowCoord1
        );
      }

      Cartesian3.clone(cameraPosition, camera.position);
      camera.frustum = frustum.clone();

      result = Cartesian2.clone(scratchWindowCoord0, result);
      if (result.x < 0.0 || result.x > canvas.clientWidth) {
        result.x = scratchWindowCoord1.x;
      }
    }
  }

  if (frameState.mode !== SceneMode.SCENE2D || cameraCentered) {
    // View-projection matrix to transform from world coordinates to clip coordinates
    positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
    if (
      positionCC.z < 0 &&
      !(camera.frustum instanceof OrthographicFrustum) &&
      !(camera.frustum instanceof OrthographicOffCenterFrustum)
    ) {
      return undefined;
    }

    result = SceneTransforms.clipToGLWindowCoordinates(
      viewport,
      positionCC,
      result
    );
  }

  result.y = canvas.clientHeight - result.y;
  return result;
};

/**
 * Transforms a position in WGS84 coordinates to drawing buffer coordinates.  This may produce different
 * results from SceneTransforms.wgs84ToWindowCoordinates when the browser zoom is not 100%, or on high-DPI displays.
 *
 * @param {Scene} scene The scene.
 * @param {Cartesian3} position The position in WGS84 (world) coordinates.
 * @param {Cartesian2} [result] An optional object to return the input position transformed to window coordinates.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
 *
 * @example
 * // Output the window position of longitude/latitude (0, 0) every time the mouse moves.
 * var scene = widget.scene;
 * var ellipsoid = scene.globe.ellipsoid;
 * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 * handler.setInputAction(function(movement) {
 *     console.log(Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position));
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
SceneTransforms.wgs84ToDrawingBufferCoordinates = function (
  scene,
  position,
  result
) {
  result = SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
  if (!defined(result)) {
    return undefined;
  }

  return SceneTransforms.transformWindowToDrawingBuffer(scene, result, result);
};

const projectedPosition = new Cartesian3();
const positionInCartographic = new Cartographic();

/**
 * @private
 */
SceneTransforms.computeActualWgs84Position = function (
  frameState,
  position,
  result
) {
  const mode = frameState.mode;

  if (mode === SceneMode.SCENE3D) {
    return Cartesian3.clone(position, result);
  }

  const projection = frameState.mapProjection;
  const cartographic = projection.ellipsoid.cartesianToCartographic(
    position,
    positionInCartographic
  );
  if (!defined(cartographic)) {
    return undefined;
  }

  projection.project(cartographic, projectedPosition);

  if (mode === SceneMode.COLUMBUS_VIEW) {
    return Cartesian3.fromElements(
      projectedPosition.z,
      projectedPosition.x,
      projectedPosition.y,
      result
    );
  }

  if (mode === SceneMode.SCENE2D) {
    return Cartesian3.fromElements(
      0.0,
      projectedPosition.x,
      projectedPosition.y,
      result
    );
  }

  // mode === SceneMode.MORPHING
  const morphTime = frameState.morphTime;
  return Cartesian3.fromElements(
    CesiumMath.lerp(projectedPosition.z, position.x, morphTime),
    CesiumMath.lerp(projectedPosition.x, position.y, morphTime),
    CesiumMath.lerp(projectedPosition.y, position.z, morphTime),
    result
  );
};

const positionNDC = new Cartesian3();
const positionWC = new Cartesian3();
const viewportTransform = new Matrix4();

/**
 * @private
 */
SceneTransforms.clipToGLWindowCoordinates = function (
  viewport,
  position,
  result
) {
  // Perspective divide to transform from clip coordinates to normalized device coordinates
  Cartesian3.divideByScalar(position, position.w, positionNDC);

  // Viewport transform to transform from clip coordinates to window coordinates
  Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, viewportTransform);
  Matrix4.multiplyByPoint(viewportTransform, positionNDC, positionWC);

  return Cartesian2.fromCartesian3(positionWC, result);
};

/**
 * @private
 */
SceneTransforms.transformWindowToDrawingBuffer = function (
  scene,
  windowPosition,
  result
) {
  const canvas = scene.canvas;
  const xScale = scene.drawingBufferWidth / canvas.clientWidth;
  const yScale = scene.drawingBufferHeight / canvas.clientHeight;
  return Cartesian2.fromElements(
    windowPosition.x * xScale,
    windowPosition.y * yScale,
    result
  );
};

const scratchNDC = new Cartesian4();
const scratchWorldCoords = new Cartesian4();

/**
 * @private
 */
SceneTransforms.drawingBufferToWgs84Coordinates = function (
  scene,
  drawingBufferPosition,
  depth,
  result
) {
  const context = scene.context;
  const uniformState = context.uniformState;

  const currentFrustum = uniformState.currentFrustum;
  const near = currentFrustum.x;
  const far = currentFrustum.y;

  if (scene.frameState.useLogDepth) {
    // transforming logarithmic depth of form
    // log2(z + 1) / log2( far + 1);
    // to perspective form
    // (far - far * near / z) / (far - near)
    const log2Depth = depth * uniformState.log2FarDepthFromNearPlusOne;
    const depthFromNear = Math.pow(2.0, log2Depth) - 1.0;
    depth = (far * (1.0 - near / (depthFromNear + near))) / (far - near);
  }

  const viewport = scene.view.passState.viewport;
  const ndc = Cartesian4.clone(Cartesian4.UNIT_W, scratchNDC);
  ndc.x = ((drawingBufferPosition.x - viewport.x) / viewport.width) * 2.0 - 1.0;
  ndc.y =
    ((drawingBufferPosition.y - viewport.y) / viewport.height) * 2.0 - 1.0;
  ndc.z = depth * 2.0 - 1.0;
  ndc.w = 1.0;

  let worldCoords;
  let frustum = scene.camera.frustum;
  if (!defined(frustum.fovy)) {
    if (defined(frustum._offCenterFrustum)) {
      frustum = frustum._offCenterFrustum;
    }
    worldCoords = scratchWorldCoords;
    worldCoords.x =
      (ndc.x * (frustum.right - frustum.left) + frustum.left + frustum.right) *
      0.5;
    worldCoords.y =
      (ndc.y * (frustum.top - frustum.bottom) + frustum.bottom + frustum.top) *
      0.5;
    worldCoords.z = (ndc.z * (near - far) - near - far) * 0.5;
    worldCoords.w = 1.0;

    worldCoords = Matrix4.multiplyByVector(
      uniformState.inverseView,
      worldCoords,
      worldCoords
    );
  } else {
    worldCoords = Matrix4.multiplyByVector(
      uniformState.inverseViewProjection,
      ndc,
      scratchWorldCoords
    );

    // Reverse perspective divide
    const w = 1.0 / worldCoords.w;
    Cartesian3.multiplyByScalar(worldCoords, w, worldCoords);
  }
  return Cartesian3.fromCartesian4(worldCoords, result);
};
export default SceneTransforms;
