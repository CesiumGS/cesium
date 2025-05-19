import { DeveloperError, Math, PerspectiveFrustum } from "@cesium/engine";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import Camera from "./Camera.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import View from "./View.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Event from "../Core/Event.js";

const defaultOrthoFrustumWidth = 10;

const pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

const scratchRectangle = new BoundingRectangle(0.0, 0.0, 3.0, 3.0);
const scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);
const scratchRight = new Cartesian3();
const scratchUp = new Cartesian3();
const scratchForward = new Cartesian3();
const scratchProj = new Cartesian3();

function ArbitraryRenders(scene) {
  this._scene = scene;
  this._arView = undefined;
  this.pixelDatatype = PixelDatatype.UNSIGNED_BYTE;

  this._preUpdate = new Event();
  this._postUpdate = new Event();
  this._preRender = new Event();
  this._postRender = new Event();
}

Object.defineProperties(ArbitraryRenders.prototype, {
  preUpdate: {
    get: function () {
      return this._preUpdate;
    },
  },
  postUpdate: {
    get: function () {
      return this._postUpdate;
    },
  },
  preRender: {
    get: function () {
      return this._preRender;
    },
  },
  postRender: {
    get: function () {
      return this._postRender;
    },
  },
});

ArbitraryRenders.prototype.destroy = function () {
  this._arView = this._arView && this._arView.destroy();
  this._scene = undefined;
};

ArbitraryRenders.prototype.setupOrthoFrustum = function (
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
    this._updateFrustumViewCommon(viewportWidth, viewportHeight, near, far);

    const view = this._arView;
    if (view.camera.frustum.width !== frustumWidth) {
      view.camera.frustum.width = frustumWidth;
    }
  } else {
    const orthoCamera = new Camera(this._scene);
    orthoCamera.frustum = new OrthographicFrustum({
      width: frustumWidth,
      aspectRatio: viewportWidth / viewportHeight,
      near: near,
      far: far,
    });

    this._setupView(orthoCamera, viewportWidth, viewportHeight);
  }
};

ArbitraryRenders.prototype.setupPerspectiveFrustum = function (
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
    this._updateFrustumViewCommon(viewportWidth, viewportHeight, near, far);

    const view = this._arView;
    if (view.camera.frustum.fov !== fov) {
      view.camera.frustum.fov = fov;
    }
  } else {
    // Create new
    const perspectiveCamera = new Camera(this._scene);
    perspectiveCamera.frustum = new PerspectiveFrustum({
      fov: fov,
      aspectRatio: viewportWidth / viewportHeight,
      near: near,
      far: far,
    });
    this._setupView(perspectiveCamera, viewportWidth, viewportHeight);
  }
};

ArbitraryRenders.prototype._setupView = function (
  camera,
  viewportWidth,
  viewportHeight,
) {
  this._arView = new View(
    this._scene,
    camera,
    new BoundingRectangle(0, 0, viewportWidth, viewportHeight),
  );
  // TODO: Might want to toggle this only for picker or Float32 pixeldata type renders
  // These prevent parts of the normal render pipeline from overriding the texture attached
  // to the framebuffer. This is important for ACTUALLY generating float32 outputs
  this._arView.globeDepth = undefined;
  this._arView.oit = undefined;
};

ArbitraryRenders.prototype._updateFrustumViewCommon = function (
  viewportWidth,
  viewportHeight,
  near,
  far,
) {
  const view = this._arView;

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
};

// Static function
ArbitraryRenders.getSnapshotFromRay = function (
  arbitraryRenderer,
  scene,
  ray,
  overrideUp = undefined,
) {
  // This is unique to arbRen (and picker) compared to normal render passes
  // This returns culling volume.  See updateMostDetailedRayPick in Picking to see how it's used
  const updateCameraBehavior = () =>
    updateOffscreenCameraFromRay(
      ray,
      arbitraryRenderer._arView.camera,
      overrideUp,
    );
  return ArbitraryRenders._getSnapshot(
    arbitraryRenderer,
    scene,
    updateCameraBehavior,
  );
};

// Static function
ArbitraryRenders.getSnapshotFromCamera = function (
  arbitraryRenderer,
  scene,
  cameraToClone,
) {
  const updateCameraBehavior = () =>
    updateOffscreenCameraFromClone(
      arbitraryRenderer._arView.camera,
      cameraToClone,
    );
  return ArbitraryRenders._getSnapshot(
    arbitraryRenderer,
    scene,
    updateCameraBehavior,
  );
};

ArbitraryRenders._getSnapshot = function (
  arbitraryRenderer,
  scene,
  updateCameraBehavior,
) {
  // Get relevant scene components
  const frameState = scene.frameState;
  const context = scene.context;
  const uniformState = context.uniformState;

  // Using the arbRen view as scene view for this pass
  const view = arbitraryRenderer._arView;
  if (!view) {
    throw new DeveloperError(
      "Arbitrary render frustrum was never setup. " +
        "Must call either setupOrthoFrustum or setupPerspectiveFrustum " +
        "before generating renders.",
    );
  }
  scene.view = view;

  updateCameraBehavior();

  // Create drawing buffer and pass state
  const drawingBufferRectangle = BoundingRectangle.clone(
    view.viewport,
    scratchRectangle,
  );
  const passState = view.arbitraryRenderFrameBuffer.begin(
    drawingBufferRectangle,
    view.viewport,
    arbitraryRenderer.pixelDatatype,
  );
  scene.jobScheduler.disableThisFrame();

  // This calculates culling volume for the scene camera.
  // It looks like it's working on some different scene camera but that's a misnomer.
  // Scene.camera is actually just a getter function for this._view.camera.
  // So we're actually setting the scene camera when we set scene.view = view above
  scene.updateFrameState();

  // Don't invert classifications, not needed
  frameState.invertClassification = false;

  // Set framestate pass flags.  We want to use the main render channel since picking passes have
  // some weird side effects and don't support customShaders which we need for arbRen and custom
  // point cloude picking
  frameState.passes.pick = false;
  frameState.passes.render = true;
  frameState.passes.offscreen = true;

  // Weirdly, using renderTilesetPassState doesn't render everything properly. Pointclouds and objects
  // might partially render but they're not consistent.
  // My suspicion is that renderTilesetPassState performs culling based on the main scene camera
  // or something related to it.  pickTilesetPassState however, is likely more permissive when it
  // comes to culling since pick renders can be from arbitrary angles. In the normal scene render
  // pipeline this would be set to renderTilesetPassState
  frameState.tilesetPassState = pickTilesetPassState;

  // Update scene uniforms
  uniformState.update(frameState);

  // More scene updates.  These are where draw commands are generated and rendering actually happens.
  scene.updateEnvironment();
  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  // Generate the output by reading pixels from the webgl context.
  // Includes helpers such as width, height, and inverseViewMatrix for picking calculations
  const output = view.arbitraryRenderFrameBuffer.end(drawingBufferRectangle);
  output.inverseViewMatrix = view.camera.inverseViewMatrix;

  // Restore the scene view to it's default view
  scene.view = scene.defaultView;

  context.endFrame();

  return output;
};

function updateOffscreenCameraFromClone(camera, cameraToClone) {
  Camera.clone(cameraToClone, camera);
  camera.frustum.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC,
  );
}

function updateOffscreenCameraFromRay(ray, camera, overrideUp = undefined) {
  const direction = ray.direction;

  // 1) forward is just the normalized view direction
  const forward = Cartesian3.normalize(direction, scratchForward);

  // 2) pick an “up” candidate
  const up = overrideUp
    ? overrideUp.clone(scratchUp)
    : Cartesian3.mostOrthogonalAxis(forward, scratchUp);

  // 3) make up orthogonal to forward (Gram–Schmidt)
  const proj = Cartesian3.multiplyByScalar(
    forward,
    Cartesian3.dot(up, forward),
    scratchProj,
  );
  Cartesian3.subtract(up, proj, up);
  Cartesian3.normalize(up, up);

  // 4) right = forward × up
  const right = Cartesian3.cross(forward, up, scratchRight);
  Cartesian3.normalize(right, right);

  // 5) re-recompute up = right × forward (to guarantee perfect orthonormality)
  Cartesian3.cross(right, forward, up);
  Cartesian3.normalize(up, up);

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
