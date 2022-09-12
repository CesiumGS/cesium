import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Quaternion from "../Core/Quaternion.js";

/**
 * @private
 */
function DeviceOrientationCameraController(scene) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  this._scene = scene;

  this._lastAlpha = undefined;
  this._lastBeta = undefined;
  this._lastGamma = undefined;

  this._alpha = undefined;
  this._beta = undefined;
  this._gamma = undefined;

  const that = this;

  function callback(e) {
    const alpha = e.alpha;
    if (!defined(alpha)) {
      that._alpha = undefined;
      that._beta = undefined;
      that._gamma = undefined;
      return;
    }

    that._alpha = CesiumMath.toRadians(alpha);
    that._beta = CesiumMath.toRadians(e.beta);
    that._gamma = CesiumMath.toRadians(e.gamma);
  }

  window.addEventListener("deviceorientation", callback, false);

  this._removeListener = function () {
    window.removeEventListener("deviceorientation", callback, false);
  };
}

const scratchQuaternion1 = new Quaternion();
const scratchQuaternion2 = new Quaternion();
const scratchMatrix3 = new Matrix3();

function rotate(camera, alpha, beta, gamma) {
  const direction = camera.direction;
  const right = camera.right;
  const up = camera.up;

  const bQuat = Quaternion.fromAxisAngle(direction, beta, scratchQuaternion2);
  const gQuat = Quaternion.fromAxisAngle(right, gamma, scratchQuaternion1);

  const rotQuat = Quaternion.multiply(gQuat, bQuat, gQuat);

  const aQuat = Quaternion.fromAxisAngle(up, alpha, scratchQuaternion2);
  Quaternion.multiply(aQuat, rotQuat, rotQuat);

  const matrix = Matrix3.fromQuaternion(rotQuat, scratchMatrix3);
  Matrix3.multiplyByVector(matrix, right, right);
  Matrix3.multiplyByVector(matrix, up, up);
  Matrix3.multiplyByVector(matrix, direction, direction);
}

DeviceOrientationCameraController.prototype.update = function () {
  if (!defined(this._alpha)) {
    return;
  }

  if (!defined(this._lastAlpha)) {
    this._lastAlpha = this._alpha;
    this._lastBeta = this._beta;
    this._lastGamma = this._gamma;
  }

  const a = this._lastAlpha - this._alpha;
  const b = this._lastBeta - this._beta;
  const g = this._lastGamma - this._gamma;

  rotate(this._scene.camera, -a, b, g);

  this._lastAlpha = this._alpha;
  this._lastBeta = this._beta;
  this._lastGamma = this._gamma;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
DeviceOrientationCameraController.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the resources held by this object.  Destroying an object allows for deterministic
 * release of resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
DeviceOrientationCameraController.prototype.destroy = function () {
  this._removeListener();
  return destroyObject(this);
};
export default DeviceOrientationCameraController;
