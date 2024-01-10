import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import PerspectiveOffCenterFrustum from "../Core/PerspectiveOffCenterFrustum.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import PickDepth from "./PickDepth.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";

const pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

/**
 * @private
 */
function VoxelPicking(scene) {
  this.pickRenderStateCache = {};
}

VoxelPicking.prototype.update = function () {};

VoxelPicking.prototype.getPickDepth = function (scene, index) {
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
  viewport
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
    scratchOrthoPickVolumeMatrix4
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
    scratchOrthoPixelSize
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
  viewport
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
    scratchPerspPixelSize
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
    camera.upWC
  );
}

function getPickCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport
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
      viewport
    );
  }

  return getPickPerspectiveCullingVolume(
    scene,
    drawingBufferPosition,
    width,
    height,
    viewport
  );
}

// pick rectangle width and height, assumed odd
let scratchRectangleWidth = 3.0;
let scratchRectangleHeight = 3.0;
const scratchRectangle = new BoundingRectangle(
  0.0,
  0.0,
  scratchRectangleWidth,
  scratchRectangleHeight
);
const scratchPosition = new Cartesian2();
const scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);

VoxelPicking.prototype.pick = function (scene, windowPosition, width, height) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(windowPosition)) {
    throw new DeveloperError("windowPosition is undefined.");
  }
  //>>includeEnd('debug');

  scratchRectangleWidth = defaultValue(width, 3.0);
  scratchRectangleHeight = defaultValue(height, scratchRectangleWidth);

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
    scratchPosition
  );

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    scratchRectangleWidth,
    scratchRectangleHeight,
    viewport
  );
  frameState.invertClassification = false;
  frameState.passes.pick = true;
  frameState.tilesetPassState = pickTilesetPassState;

  context.uniformState.update(frameState);

  scene.updateEnvironment();

  scratchRectangle.x =
    drawingBufferPosition.x - (scratchRectangleWidth - 1.0) * 0.5;
  scratchRectangle.y =
    scene.drawingBufferHeight -
    drawingBufferPosition.y -
    (scratchRectangleHeight - 1.0) * 0.5;
  scratchRectangle.width = scratchRectangleWidth;
  scratchRectangle.height = scratchRectangleHeight;
  passState = pickFramebuffer.begin(scratchRectangle, viewport);

  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  const object = pickFramebuffer.end(scratchRectangle);
  context.endFrame();
  return object;
};

VoxelPicking.prototype.destroy = function () {};
export default VoxelPicking;
