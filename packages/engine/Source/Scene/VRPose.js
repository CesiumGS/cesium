import BoundingRectangle from "../Core/BoundingRectangle.js";
import Camera from "./Camera.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import PerspectiveOffCenterFrustum from "../Core/PerspectiveOffCenterFrustum.js";
import Scene from "./Scene.js";

function prepareViewportLegacy(pose, eye) {
  const viewport = pose.viewports[eye];
  const width = pose._passStateViewport.width * 0.5;

  viewport.x = eye === "right" ? width : 0;
  viewport.y = 0;
  viewport.width = width;
  viewport.height = pose._passStateViewport.height;
}

function prepareViewportsLegacy(pose) {
  if (!pose._paramsChanged) {
    return;
  }

  prepareViewportLegacy(pose, "left");
  prepareViewportLegacy(pose, "right");
}

// Based on Calculating Stereo pairs by Paul Bourke
// http://paulbourke.net/stereographics/stereorender/
function preparePoseCameraParamsLegacy(pose, camera) {
  const cameraParams = pose.cameraParams;

  const near = camera.frustum.near;
  const fo = near * defaultValue(pose.scene.focalLength, 5.0);
  const eyeSeparation = defaultValue(pose.scene.eyeSeparation, fo / 30.0);
  const frustumXOffset = (0.5 * eyeSeparation * near) / fo;

  if (
    !pose._paramsChanged &&
    fo === cameraParams._fo &&
    eyeSeparation === cameraParams._eyeSeparation
  ) {
    return;
  }

  const left = cameraParams.left;
  left.translationOp = Cartesian3.add;
  left.frustumXOffset = frustumXOffset;
  left.frustumAspectRatio =
    pose.viewports.left.width / pose.viewports.left.height;

  const right = cameraParams.right;
  right.translationOp = Cartesian3.subtract;
  right.frustumXOffset = -frustumXOffset;
  right.frustumAspectRatio =
    pose.viewports.right.width / pose.viewports.right.height;

  Cartesian3.multiplyByScalar(
    camera.right,
    eyeSeparation * 0.5,
    cameraParams._eyeTranslation
  );
  cameraParams._frustumNear = near;
  cameraParams._fo = fo;
  cameraParams._eyeSeparation = eyeSeparation;
}

function applyPoseParamsToCameraLegacy(pose, params, camera) {
  params.translationOp(
    pose._savedCamera.position,
    pose.cameraParams._eyeTranslation,
    camera.position
  );

  camera.frustum.xOffset = params.frustumXOffset;
  camera.frustum.aspectRatio = params.frustumAspectRatio;

  return true;
}

function prepareViewportsXR(pose, xrPose) {
  for (const xrView of xrPose.views) {
    // Try to dynamically do viewport scaling based on the browser's
    // recommendation. This allows the browser to designate a smaller
    // framebuffer area for the render, degrading quality of the image
    // but maintaining refresh rate in cases such as high system load.
    // https://developer.mozilla.org/en-US/docs/Web/API/XRView/requestViewportScale
    if (defined(xrView.requestViewPortScale)) {
      xrView.requestViewportScale(xrView.recommendedViewportScale);
    }

    const xrViewport = pose.xrLayer.getViewport(xrView);
    const eyeViewport = pose.viewports[xrView.eye];
    eyeViewport.x = xrViewport.x;
    eyeViewport.y = xrViewport.y;
    eyeViewport.width = xrViewport.width;
    eyeViewport.height = xrViewport.height;
  }
}

function arrayEquals(a, b) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(a) || !(a instanceof Float32Array) || a.length !== 16) {
    throw new DeveloperError(
      "a array must be a 16 element valid Float32Array."
    );
  }
  if (!defined(b) || !(b instanceof Float32Array) || b.length !== 16) {
    throw new DeveloperError(
      "b array must be a 16 element valid Float32Array."
    );
  }
  //>>includeEnd('debug');
  const differs = (value, idx) => value !== b[idx];
  return !a.some(differs);
}

// convert a PerspectiveOffCenterFrustum to a PerspectiveFrustum asuming the
// pocFrustum represents a symetrical PerspectiveFrustum
function convertPerspectiveOffCenterFrustum(pocFrustum, result) {
  if (!defined(result)) {
    result = new PerspectiveFrustum();
  }

  // Calculate the half width and half height of the frustum at the near plane
  const halfNearWidth = (pocFrustum.right - pocFrustum.left) / 2;
  const halfNearHeight = (pocFrustum.top - pocFrustum.bottom) / 2;

  // Calculate the center position of the frustum's base at the near plane
  const centerX = (pocFrustum.right + pocFrustum.left) / 2;
  const centerY = (pocFrustum.top + pocFrustum.bottom) / 2;

  // Calculate the field of view (FOV) using the half height at the near plane
  const fov = 2 * Math.atan(halfNearHeight / pocFrustum.near);

  const aspectRatio = halfNearWidth / halfNearHeight;

  result.aspectRatio = aspectRatio;
  result.fov = fov;
  result.near = pocFrustum.near;
  result.far = pocFrustum.far;
  result.xOffset = centerX;
  result.yOffset = centerY;

  return result;
}

function prepareCameraParamsXR(camera, xrPose, xrView, params) {
  // Get the delta of Pose - View transformations (delta(A,B) = A_inv * B)
  const xrPoseTransform = Matrix4.fromArray(
    xrPose.transform.inverse.matrix,
    0,
    params.xrPoseTransform
  );
  const xrViewInvTransform = Matrix4.fromArray(
    xrView.transform.inverse.matrix,
    0,
    params.xrViewInvTransform
  );
  const deltaTransform = Matrix4.multiply(
    xrPoseTransform,
    xrViewInvTransform,
    params.deltaTransform
  );

  Matrix4.multiply(camera.viewMatrix, deltaTransform, params.viewTransform);

  const projectionMatrix = xrView.projectionMatrix;
  if (
    defined(params._projectionMatrix) &&
    arrayEquals(params._projectionMatrix, projectionMatrix)
  ) {
    return;
  }
  params._projectionMatrix = Float32Array.from(projectionMatrix);

  PerspectiveOffCenterFrustum.fromProjectionMatrix(
    Matrix4.fromArray(xrView.projectionMatrix, 0, params.projectionTransform),
    params.pocFrustum
  );
  convertPerspectiveOffCenterFrustum(params.pocFrustum, params.frustum);
}

function preparePoseCameraParamsXR(pose, camera, xrPose) {
  pose.cameraParams._frustumNear = camera.frustum.near;
  pose.cameraParams._frustumFar = camera.frustum.far;

  for (const xrView of xrPose.views) {
    prepareCameraParamsXR(
      camera,
      xrPose,
      xrView,
      pose.cameraParams[xrView.eye]
    );
  }
}

// WebXR provides the viewports indicating where to render for each display.
// https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Rendering#frames_poses_views_and_framebuffers
function prepareXR(pose, camera) {
  const xr = pose.scene.webXRContext;
  if (!defined(xr)) {
    // scene.webXRContext not set yet
    return false;
  }

  const xrFrame = xr.frame;
  if (!defined(xrFrame)) {
    // XR session is not ready yet
    return false;
  }

  const xrPose = xrFrame.getViewerPose(xr.refSpace);
  if (!defined(xrPose)) {
    // Getting the pose may fail if, for example, tracking is lost.
    // TODO: we should handle this gracefully.
    return false;
  }

  const xrLayer = xrFrame.session.renderState.baseLayer;
  pose.xrLayer = xrLayer; // Used after command execution for bitblit.

  if (!pose._initialized) {
    // Can't do this earlier because we need a valid xrPose
    // to know how many views the XR session has.
    pose._initialized = true;
    for (const xrView of xrPose.views) {
      const eye = xrView.eye;
      pose.viewports[eye] = new BoundingRectangle();
      pose.cameraParams[eye] = {
        xrPoseTransform: new Matrix4(),
        xrViewInvTransform: new Matrix4(),
        deltaTransform: new Matrix4(),
        viewTransform: new Matrix4(),
        projectionTransform: new Matrix4(),
        pocFrustum: new PerspectiveOffCenterFrustum(),
        frustum: new PerspectiveFrustum(),
      };
    }
  }

  prepareViewportsXR(pose, xrPose);
  preparePoseCameraParamsXR(pose, camera, xrPose);
  return true;
}

function applyPoseParamsToCameraXR(pose, params, camera) {
  camera.lookAtTransform(params.viewTransform);

  const frustum = camera.frustum;
  frustum.aspectRatio = params.frustum.aspectRatio;
  frustum.fov = params.frustum.fov;
  frustum.near = pose.cameraParams._frustumNear;
  frustum.far = pose.cameraParams._frustumFar;
  frustum.xOffset = params.frustum.xOffset;
  frustum.yOffset = params.frustum.yOffset;

  return true;
}

// eye can be "left", "right" or "none" (for monoscopic).
// https://developer.mozilla.org/en-US/docs/Web/API/XRView#instance_properties
//
// return value indicates to caller whether commands are to be executed for
// this view or not.
function applyPoseToCamera(pose, eye, camera) {
  const params = pose.cameraParams[eye];
  if (!defined(params)) {
    console.warn(`Unrecognized eye ${eye}`);
    return false;
  }

  if (
    eye === "none" &&
    (defined(pose.viewports["left"]) || defined(pose.viewports["right"]))
  ) {
    // don't execute commands for a monoscopic view if binocular views are present.
    return false;
  }

  if (pose.isWebXR) {
    return applyPoseParamsToCameraXR(pose, params, camera);
  }

  // Plain old WebVR.
  return applyPoseParamsToCameraLegacy(pose, params, camera);
}

/**
 * Processor allows for a scene's Camera to be altered in
 * translation and frustum according to VR parameters and also
 * provides the viewports where rendering is to be performed for
 * each viewpoint required by the VR session (typically side-by-side
 * stereographic)
 *
 * @constructor
 *
 * @param {Scene} scene The scene for which the pose will perform computations.
 *
 * @private
 */
function VRPose(scene) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene) || !(scene instanceof Scene)) {
    throw new DeveloperError("scene must be a valid Scene.");
  }
  //>>includeEnd('debug');

  this.isWebXR = scene.useWebXR && defined(scene.webXRContext);
  this.scene = scene;
  this.xrLayer = null;
  this.viewports = {};
  this.cameraParams = {};
  this._passStateViewport = null;
  this._paramsChanged = true;

  if (this.isWebXR) {
    // Initialization is postponed until we get a valid xrPose.
    this._initialized = false;
  } else {
    this.viewports.left = new BoundingRectangle();
    this.viewports.right = new BoundingRectangle();
    this.cameraParams.left = {};
    this.cameraParams.right = {};
    this.cameraParams._eyeTranslation = new Cartesian3();
  }
}

Object.defineProperties(VRPose.prototype, {
  /**
   * The viewport of the PassState for the commands that will be executed for
   * the render.
   * <p>
   * On <code>prepare</code> for WebVR, it determines each eye's view
   * geometry.
   * </p>
   * <p>
   * On <code>apply</code>, it is set to each eye viewport before the
   * corresponding render.
   * </p>
   *
   * @memberof VRPose.prototype
   * @type {BoundingRectangle}
   * @default null
   */
  passStateViewport: {
    get: function () {
      return this._passStateViewport;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value) || !(value instanceof BoundingRectangle)) {
        throw new DeveloperError("value must be a valid BoundingRectangle.");
      }
      //>>includeEnd('debug');
      if (
        !this.isWebXR &&
        this._passStateViewport !== value &&
        !BoundingRectangle.equals(this._paramsChanged, value)
      ) {
        this._paramsChanged = true;
      }
      this._passStateViewport = value;
    },
  },

  /**
   * The main scene camera from where the VR camera parameters will be derived.
   * On <code>apply</code>, this is the camera that will be modified before
   * each VR view render.
   *
   * @memberof VRPose.prototype
   * @type {Camera}
   * @default null
   */
  camera: {
    get: function () {
      return this._camera;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value) || !(value instanceof Camera)) {
        throw new DeveloperError("value must be a valid Camera.");
      }
      //>>includeEnd('debug');
      if (
        !this.isWebXR &&
        this.cameraParams._frustumNear !== value.frustum.near
      ) {
        this._paramsChanged = true;
      }
      this._camera = value;
    },
  },
});

/**
 * Perform calculations of the relative translation and frustum for
 * each of the VR views. As little calculations as possible are performed, by
 * detecting if there are changes in the basic parameters.
 *
 * @memberof VRPose.prototype
 *
 * @param {Camera} camera The main camera used as a base for the VR view parameters.
 * @param {BoundingRectangle} passStateViewport Viewport of the passState that will be set to determine where the render will be performed when <code>apply</code> is called. Used also for WebVR (Legacy) calculations.
 * @returns {boolean} Whether calculations were successfully done. In case of WebXR, depends if a VR session is running and a pose was successfully obtained. WebVR (Legacy) always succeeds.
 */
VRPose.prototype.prepare = function (camera, passStateViewport) {
  // These two will be used for apply
  this.camera = camera;
  this.passStateViewport = passStateViewport;

  let validPose;

  if (this.isWebXR) {
    validPose = prepareXR(this, camera);
  } else {
    // Plain old WebVR.
    prepareViewportsLegacy(this);
    preparePoseCameraParamsLegacy(this, camera);
    validPose = true;
  }

  if (validPose) {
    this._paramsChanged = false;
  }
  return validPose;
};

/**
 * For each of the views present for the VR session (typically one for the left
 * and one for the right eye), apply the prepared parameters to the camera and
 * passState viewport that were provided to the <code>prepare</code> method and
 * call the provided callback (so typically, the callback is called twice).
 *
 * @memberof VRPose.prototype
 *
 * @param {function} execute_cb Execution callback. Receives no parameters.
 */
VRPose.prototype.apply = function (execute_cb) {
  const camera = this._camera;
  const savedCamera = Camera.clone(camera, this._savedCamera);
  const savedViewport = BoundingRectangle.clone(
    this._passStateViewport,
    this._savedViewport
  );

  for (const eye of Object.keys(this.viewports)) {
    if (applyPoseToCamera(this, eye, camera)) {
      BoundingRectangle.clone(this.viewports[eye], this._passStateViewport);
      execute_cb();
    }
  }

  BoundingRectangle.clone(savedViewport, this._passStateViewport);
  savedCamera.frustum = camera.frustum;
  Camera.clone(savedCamera, camera);
};

export default VRPose;
