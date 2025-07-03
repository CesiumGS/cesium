import { DeveloperError, Math, PerspectiveFrustum } from "@cesium/engine";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import Camera from "./Camera.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import View from "./View.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Event from "../Core/Event.js";

const defaultOrthoFrustumWidth = 10;
const defaultViewportWidth = 50;
const defaultViewportHeight = 50;
const defaultNear = 0.1;
const defaultFar = 500000000.0;
const defaultPerspectiveFov = Math.PI_OVER_THREE; // 60 degrees

const pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

const scratchRectangle = new BoundingRectangle(0.0, 0.0, 3.0, 3.0);
const scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);
const scratchRight = new Cartesian3();
const scratchUp = new Cartesian3();
const scratchForward = new Cartesian3();
const scratchProj = new Cartesian3();

function ArbitraryRenders(scene, isOrtho = false) {
  this._scene = scene;
  this._arView = undefined;
  this.pixelDatatype = PixelDatatype.UNSIGNED_BYTE;

  this._preUpdate = new Event();
  this._postUpdate = new Event();
  this._preRender = new Event();
  this._postRender = new Event();

  if (isOrtho) {
    this.setupDefaultOrthoView();
  } else {
    this.setupDefaultPerspectiveView();
  }
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
  viewportWidth: {
    get: function () {
      return this._arView.viewport.width;
    },
    set: function (value) {
      if (value !== this._arView.viewport.width) {
        this._arView.viewport.width = value;
        this._arView.camera.frustum.aspectRatio =
          value / this._arView.viewport.height;
      }
    },
  },
  viewportHeight: {
    get: function () {
      return this._arView.viewport.height;
    },
    set: function (value) {
      if (value !== this._arView.viewport.height) {
        this._arView.viewport.height = value;
        this._arView.camera.frustum.aspectRatio =
          this._arView.viewport.width / value;
      }
    },
  },
  camera: {
    get: function () {
      return this._arView.camera;
    },
  },
  near: {
    get: function () {
      return this._arView.camera.frustum.near;
    },
    set: function (value) {
      this._arView.camera.frustum.near = value;
    },
  },
  far: {
    get: function () {
      return this._arView.camera.frustum.far;
    },
    set: function (value) {
      this._arView.camera.frustum.far = value;
    },
  },
  frustumWidth: {
    get: function () {
      if (this._arView.camera.frustum instanceof OrthographicFrustum) {
        return this._arView.camera.frustum.width;
      }
      throw new DeveloperError(
        "Cannot get frustumWidth on a non-orthographic frustum.",
      );
    },
    set: function (value) {
      if (this._arView.camera.frustum instanceof OrthographicFrustum) {
        this._arView.camera.frustum.width = value;
      } else {
        throw new DeveloperError(
          "Cannot set frustumWidth on a non-orthographic frustum.",
        );
      }
    },
  },
  fov: {
    get: function () {
      if (this._arView.camera.frustum instanceof PerspectiveFrustum) {
        return this._arView.camera.frustum.fov;
      }

      throw new DeveloperError("Cannot get fov on a non-perspective frustum.");
    },
    set: function (value) {
      if (this._arView.camera.frustum instanceof PerspectiveFrustum) {
        this._arView.camera.frustum.fov = value;
      } else {
        throw new DeveloperError(
          "Cannot set fov on a non-perspective frustum.",
        );
      }
    },
  },
  isOrthographic: {
    get: function () {
      return this._arView.camera.frustum instanceof OrthographicFrustum;
    },
  },
});

ArbitraryRenders.prototype.generateRenderFromRay = function (
  ray,
  snapshotTransforms,
  overrideUp = undefined,
) {
  // Generate render output
  const renderFunction = (scn) =>
    ArbitraryRenders.getSnapshotFromRay(this, scn, ray, overrideUp);
  return this._scene._generateArbitraryRender(
    this,
    snapshotTransforms,
    renderFunction,
  );
};

ArbitraryRenders.prototype.generateRenderFromCamera = function (
  snapshotTransforms,
  cameraToClone = undefined, // Optional camera to clone from
) {
  // Generate render output
  const renderFunction = (scn) =>
    ArbitraryRenders.getSnapshotFromCamera(this, scn, cameraToClone);
  return this._scene._generateArbitraryRender(
    this,
    snapshotTransforms,
    renderFunction,
  );
};

ArbitraryRenders.prototype.switchToOrthographicFrustum = function () {
  if (!this._arView) {
    this.setupDefaultOrthoView();
  } else if (!(this._arView.camera.frustum instanceof OrthographicFrustum)) {
    this.setupNewOrthoFrustum(
      this.viewportWidth,
      this.viewportHeight,
      defaultOrthoFrustumWidth,
      this.near,
      this.far,
    );
  }
};

ArbitraryRenders.prototype.switchToPerspectiveFrustum = function () {
  if (!this._arView) {
    this.setupDefaultPerspectiveView();
  } else if (!(this._arView.camera.frustum instanceof PerspectiveFrustum)) {
    this.setupNewPerspectiveFrustum(
      this.viewportWidth,
      this.viewportHeight,
      defaultPerspectiveFov,
      this.near,
      this.far,
    );
  }
};

ArbitraryRenders.prototype.setupDefaultOrthoView = function () {
  this.setupNewOrthoFrustum(
    defaultViewportWidth,
    defaultViewportHeight,
    defaultOrthoFrustumWidth,
    defaultNear,
    defaultFar,
  );
};

ArbitraryRenders.prototype.setupDefaultPerspectiveView = function () {
  this.setupNewPerspectiveFrustum(
    defaultViewportWidth,
    defaultViewportHeight,
    defaultPerspectiveFov,
    defaultNear,
    defaultFar,
  );
};

ArbitraryRenders.prototype.destroy = function () {
  this._arView = this._arView && this._arView.destroy();
  this._scene = undefined;
};

ArbitraryRenders.prototype.setupNewOrthoFrustum = function (
  viewportWidth,
  viewportHeight,
  frustumWidth,
  near,
  far,
) {
  const orthoCamera = new Camera(this._scene);
  orthoCamera.frustum = new OrthographicFrustum({
    width: frustumWidth,
    aspectRatio: viewportWidth / viewportHeight,
    near: near,
    far: far,
  });

  this._setupView(orthoCamera, viewportWidth, viewportHeight);
};

ArbitraryRenders.prototype.setupNewPerspectiveFrustum = function (
  viewportWidth,
  viewportHeight,
  fov,
  near,
  far,
) {
  // Create new
  const perspectiveCamera = new Camera(this._scene);
  perspectiveCamera.frustum = new PerspectiveFrustum({
    fov: fov,
    aspectRatio: viewportWidth / viewportHeight,
    near: near,
    far: far,
  });
  this._setupView(perspectiveCamera, viewportWidth, viewportHeight);
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
  cameraToClone = undefined,
) {
  const updateCameraBehavior = () =>
    updateOffscreenCamera(arbitraryRenderer._arView.camera, cameraToClone);
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

  return assignRenderOutputTyping(output);
};

function assignRenderOutputTyping(render) {
  if (!render) {
    return undefined;
  }

  if (render.pixels instanceof Uint8Array) {
    return { kind: "uint8", ...render };
  } else if (render.pixels instanceof Float32Array) {
    return { kind: "float32", ...render };
  }

  throw new DeveloperError(
    "Invalid arbitrary render output, pixels must be Uint8 or Float32",
  );
}

function updateOffscreenCamera(camera, cameraToClone = undefined) {
  if (cameraToClone) {
    Camera.clone(cameraToClone, camera);
  }

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
