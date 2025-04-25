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

const defaultOrthoFrustumWidth = 10;

const pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

const scratchRectangle = new BoundingRectangle(0.0, 0.0, 3.0, 3.0);
const scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);
const scratchRight = new Cartesian3();
const scratchUp = new Cartesian3();

function ArbitraryRenders(scene) {
  this._scene = scene;
  this._arView = undefined;
  this.pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
}

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
  // These prevent parts of the normal render pipeline from overriding the texture attached to the framebuffer
  // this is important for ACTUALLY generating float32 outputs
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
};

ArbitraryRenders.debugMode = false;
ArbitraryRenders.debugPassState = undefined;

// Static function
ArbitraryRenders.getSnapshotFromRay = function (arbitraryRenderer, scene, ray, overrideUp = undefined) {
  // This is unique to arbRen (and picker)
  // This returns culling volume.  See updateMostDetailedRayPick in Picking to see how it's used
  const updateCameraBehavior = () => updateOffscreenCameraFromRay(ray, arbitraryRenderer._arView.camera, overrideUp);
  return ArbitraryRenders._getSnapshot(arbitraryRenderer, scene, updateCameraBehavior);
}

// Static function
ArbitraryRenders.getSnapshotFromCamera = function (arbitraryRenderer, scene, cameraToClone) {
  const updateCameraBehavior = () => updateOffscreenCameraFromClone(arbitraryRenderer._arView.camera, cameraToClone);
  return ArbitraryRenders._getSnapshot(arbitraryRenderer, scene, updateCameraBehavior);
}

ArbitraryRenders._getSnapshot = function (arbitraryRenderer, scene, updateCameraBehavior) {
  ArbitraryRenders.debugMode = true;
  // This is identical to scene render
  const frameState = scene.frameState;
  const context = scene.context;
  const uniformState = context.uniformState;

  // Similar but we're using the arbRen view
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

  // Following lines are unique to arbRen (and picker)
  const drawingBufferRectangle = BoundingRectangle.clone(
    view.viewport,
    scratchRectangle,
  );
  const passState = view.arbitraryRenderFrameBuffer.begin(
    drawingBufferRectangle,
    view.viewport,
    arbitraryRenderer.pixelDatatype, // Change this later for point cloud picker renders that need high precision floats
  );
  scene.jobScheduler.disableThisFrame();

  // This is also called in scene render
  // This calculates culling volume for the scene camera.  It looks like it's working on some different
  // scene camera but that's a misnomer.  Scene.camera is actually just a getter function for
  // this._view.camera.  So we're actually setting the scene camera when we set scene.view = view above
  scene.updateFrameState();

  // Not sure why this is being set to false explicitly, it's not in the main render loop
  // It's probably fine though unless we're classifying geometries (associating them with
  // other geometries such as the terrain)
  frameState.invertClassification = false;

  // Don't render this as a picker render (we might need to add a special flag for arbitrary renders)
  frameState.passes.pick = false;
  // Use normal rendering (this is what makes it render an image)
  frameState.passes.render = true;
  frameState.passes.offscreen = true;

  // We're missing this from the scene render function:
  // frameState.passes.postProcess = scene.postProcessStages.hasSelected;

  // Weirdly, using renderTilesetPassState doesn't render everything properly. Pointclouds and objects
  // might partially render but they're not consistent. My suspicion is that renderTilesetPassState
  // performs culling based on the main scene camera or something related to it.  pickTilesetPassState
  // likely is more permissive when it comes to culling since pick renders can be from arbitrary angles.
  // In the scene render function this would be set to renderTilesetPassState
  frameState.tilesetPassState = pickTilesetPassState;

  // There's a lot of stuff missing here from the scene render function.
  //   - Background color is set (some special conditions apply if HDR is enabled)
  //   - frameState.atmosphere is assigned
  //   - scene.fog.update(frameState)

  // This is in scene render
  uniformState.update(frameState);

  // Something about shadow map and such are set here

  // _computeCommandList and _overlayCommandList arrays are both set to empty here

  // viewport dimesnsions are setup here based on context drawingBufferWidth and drawingBufferHeight
  // Not sure what to make of this but we're already using a different view.viewport

  // passState is setup here in scene render, but we've already setup passState earlier in this function
  // For arbRen passState is returned by arbitraryRenderFrameBuffer.begin

  // Missing scene.globe.beginFrame

  // This is really similar to scene render
  ArbitraryRenders.debugPassState = passState;
  console.log("AAA passState before updateEnvironment", passState);
  scene.updateEnvironment();
  console.log("AAA passState before updateAndExecuteCommands", passState);
  scene.updateAndExecuteCommands(passState, scratchColorZero); // backgroundColor is used instead of scratchColorZero
  console.log("AAA passState before resolveFramebuffers", passState);
  scene.resolveFramebuffers(passState);
  // passState.framebuffer is set to undefined and overlayCommands are exectuted here
  // globe.endFrame is also called, as well as a flag to load new globe tiles

  console.log("AAA arbitraryRenderFrameBuffer.end (readPixels)");
  const output = view.arbitraryRenderFrameBuffer.end(drawingBufferRectangle);
  scene.view = scene.defaultView;

  // This is the last function called in scene render
  console.log("AAA arbitraryRenderFrameBuffer context.endFrame()");
  context.endFrame();
  ArbitraryRenders.debugMode = false;

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

  let right;
  let up;

  if (overrideUp) {
    up = overrideUp;
    right = Cartesian3.cross(direction, up, scratchRight);
  } else {
    const orthogonalAxis = Cartesian3.mostOrthogonalAxis(direction, scratchRight);
    right = Cartesian3.cross(direction, orthogonalAxis, scratchRight);
    up = Cartesian3.cross(direction, right, scratchUp);
  }

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
