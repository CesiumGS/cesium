import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import Camera from "./Camera.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import SceneMode from "./SceneMode.js";
import View from "./View.js";

const offscreenDefaultWidth = 0.1;

const mostDetailedPickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.MOST_DETAILED_PICK,
});

const pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

const scratchRectangle = new BoundingRectangle(0.0, 0.0, 3.0, 3.0);
const scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);
const scratchRight = new Cartesian3();
const scratchUp = new Cartesian3();

function ArbitraryRenders(scene) {
  const pickOffscreenViewport = new BoundingRectangle(0, 0, 100, 100);
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

ArbitraryRenders.prototype.snapshot = function (scene, ray, width) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError("Snapshots are only supported in 3D mode.");
  }
  //>>includeEnd('debug');

  return getSnapshot(this, scene, ray, width, false);
};

function getSnapshot(picking, scene, ray, width, mostDetailed) {
  const { context, frameState } = scene;
  const uniformState = context.uniformState;

  const view = picking._pickOffscreenView;
  scene.view = view;

  // You can adjust view.viewport width and height here if you want to change the size of the render

  updateOffscreenCameraFromRay(ray, width, view.camera);

  const drawingBufferRectangle = BoundingRectangle.clone(
    view.viewport,
    scratchRectangle,
  );

  console.log(
    "AAA getRayIntersection drawingBufferRectangle",
    drawingBufferRectangle,
  );

  const passState = view.arbitraryRenderFrameBuffer.begin(
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

  const output = view.arbitraryRenderFrameBuffer.end(drawingBufferRectangle);

  scene.view = scene.defaultView;
  context.endFrame();

  return output;
}

function updateOffscreenCameraFromRay(ray, width, camera) {
  const direction = ray.direction;
  const orthogonalAxis = Cartesian3.mostOrthogonalAxis(direction, scratchRight);
  const right = Cartesian3.cross(direction, orthogonalAxis, scratchRight);
  const up = Cartesian3.cross(direction, right, scratchUp);

  camera.position = ray.origin;
  camera.direction = direction;
  camera.up = up;
  camera.right = right;

  camera.frustum.width = defaultValue(width, offscreenDefaultWidth);
  return camera.frustum.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC,
  );
}

export default ArbitraryRenders;
