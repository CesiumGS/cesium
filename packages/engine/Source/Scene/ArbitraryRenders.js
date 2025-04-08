import { Math, PerspectiveFrustum } from "@cesium/engine";
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

const defaultOrthoFrustumWidth = 10; //0.1;

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
  this.setupOrthoFrustum(scene, 100, 100);
}

ArbitraryRenders.prototype.setupOrthoFrustum = function (
  scene,
  viewportWidth,
  viewportHeight,
  frustumWidth = undefined,
  near = undefined,
  far = undefined,
) {
  frustumWidth = defaultValue(frustumWidth, defaultOrthoFrustumWidth);
  near = defaultValue(near, 0.1);
  far = defaultValue(far, 500000000.0);

  if (
    this._arView &&
    this._arView.camera.frustum instanceof OrthographicFrustum
  ) {
    // Change existing
    const view = this._arView;

    updateFrustumCommon(view, viewportWidth, viewportHeight, near, far);

    if (view.camera.frustum.width !== frustumWidth) {
      view.camera.frustum.width = frustumWidth;
    }
  } else {
    const orthoCamera = new Camera(scene);
    orthoCamera.frustum = new OrthographicFrustum({
      width: frustumWidth,
      aspectRatio: viewportWidth / viewportHeight,
      near: near,
      far: far,
    });
    this._arView = new View(
      scene,
      orthoCamera,
      new BoundingRectangle(0, 0, viewportWidth, viewportHeight),
    );
  }
};

ArbitraryRenders.prototype.setupPerspectiveFrustum = function (
  scene,
  viewportWidth,
  viewportHeight,
  fov = undefined,
  near = undefined,
  far = undefined,
) {
  fov = defaultValue(fov, Math.PI_OVER_THREE);
  near = defaultValue(near, 0.1);
  far = defaultValue(far, 500000000.0);

  if (
    this._arView &&
    this._arView.camera.frustum instanceof PerspectiveFrustum
  ) {
    const view = this._arView;

    updateFrustumCommon(view, viewportWidth, viewportHeight, near, far);

    if (view.camera.frustum.fov !== fov) {
      view.camera.frustum.fov = fov;
    }
  } else {
    // Create new
    const perspectiveCamera = new Camera(scene);
    perspectiveCamera.frustum = new PerspectiveFrustum({
      fov: fov,
      aspectRatio: viewportWidth / viewportHeight,
      near: near,
      far: far,
    });
    this._arView = new View(
      scene,
      perspectiveCamera,
      new BoundingRectangle(0, 0, viewportWidth, viewportHeight),
    );
  }
};

function updateFrustumCommon(view, viewportWidth, viewportHeight, near, far) {
  // Change existing
  if (
    view.viewport.width !== viewportWidth ||
    view.viewport.height !== viewportHeight
  ) {
    view.viewport.width = viewportWidth;
    view.viewport.height = viewportHeight;
    view.camera.frustum.aspectRatio = viewportWidth / viewportHeight;
  }

  if (view.camera.frustum.near !== near) {
    view.camera.frustum.near = near;
  }

  if (view.camera.frustum.near !== near) {
    view.camera.frustum.near = near;
  }

  if (view.camera.frustum.far !== far) {
    view.camera.frustum.far = far;
  }
}

ArbitraryRenders.prototype.snapshot = function (scene, ray) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError("Snapshots are only supported in 3D mode.");
  }
  //>>includeEnd('debug');

  return getSnapshot(this, scene, ray, false);
};

function getSnapshot(picking, scene, ray, mostDetailed) {
  const { context, frameState } = scene;
  const uniformState = context.uniformState;

  const view = picking._arView;

  scene.view = view;

  updateOffscreenCameraFromRay(ray, view.camera);

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

  // Leaving this in for now since I'm not sure if we'll need it
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

function updateOffscreenCameraFromRay(ray, camera) {
  const direction = ray.direction;
  const orthogonalAxis = Cartesian3.mostOrthogonalAxis(direction, scratchRight);
  const right = Cartesian3.cross(direction, orthogonalAxis, scratchRight);
  const up = Cartesian3.cross(direction, right, scratchUp);

  camera.position = ray.origin;
  camera.direction = direction;
  camera.up = up;
  camera.right = right;

  return camera.frustum.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC,
  );
}

export default ArbitraryRenders;
