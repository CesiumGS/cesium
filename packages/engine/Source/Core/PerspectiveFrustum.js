import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import PerspectiveOffCenterFrustum from "./PerspectiveOffCenterFrustum.js";

/**
 * The viewing frustum is defined by 6 planes.
 * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
 * define the unit vector normal to the plane, and the w component is the distance of the
 * plane from the origin/camera position.
 *
 * @alias PerspectiveFrustum
 * @constructor
 *
 * @param {object} [options] An object with the following properties:
 * @param {number} [options.fov] The angle of the field of view (FOV), in radians.
 * @param {number} [options.aspectRatio] The aspect ratio of the frustum's width to it's height.
 * @param {number} [options.near=1.0] The distance of the near plane.
 * @param {number} [options.far=500000000.0] The distance of the far plane.
 * @param {number} [options.xOffset=0.0] The offset in the x direction.
 * @param {number} [options.yOffset=0.0] The offset in the y direction.
 *
 * @example
 * const frustum = new Cesium.PerspectiveFrustum({
 *     fov : Cesium.Math.PI_OVER_THREE,
 *     aspectRatio : canvas.clientWidth / canvas.clientHeight
 *     near : 1.0,
 *     far : 1000.0
 * });
 *
 * @see PerspectiveOffCenterFrustum
 */
function PerspectiveFrustum(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._offCenterFrustum = new PerspectiveOffCenterFrustum();

  /**
   * The angle of the field of view (FOV), in radians.  This angle will be used
   * as the horizontal FOV if the width is greater than the height, otherwise
   * it will be the vertical FOV.
   * @type {number}
   * @default undefined
   */
  this.fov = options.fov;
  this._fov = undefined;
  this._fovy = undefined;

  this._sseDenominator = undefined;

  /**
   * The aspect ratio of the frustum's width to it's height.
   * @type {number}
   * @default undefined
   */
  this.aspectRatio = options.aspectRatio;
  this._aspectRatio = undefined;

  /**
   * The distance of the near plane.
   * @type {number}
   * @default 1.0
   */
  this.near = defaultValue(options.near, 1.0);
  this._near = this.near;

  /**
   * The distance of the far plane.
   * @type {number}
   * @default 500000000.0
   */
  this.far = defaultValue(options.far, 500000000.0);
  this._far = this.far;

  /**
   * Offsets the frustum in the x direction.
   * @type {number}
   * @default 0.0
   */
  this.xOffset = defaultValue(options.xOffset, 0.0);
  this._xOffset = this.xOffset;

  /**
   * Offsets the frustum in the y direction.
   * @type {number}
   * @default 0.0
   */
  this.yOffset = defaultValue(options.yOffset, 0.0);
  this._yOffset = this.yOffset;
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
PerspectiveFrustum.packedLength = 6;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {PerspectiveFrustum} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
PerspectiveFrustum.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.fov;
  array[startingIndex++] = value.aspectRatio;
  array[startingIndex++] = value.near;
  array[startingIndex++] = value.far;
  array[startingIndex++] = value.xOffset;
  array[startingIndex] = value.yOffset;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {PerspectiveFrustum} [result] The object into which to store the result.
 * @returns {PerspectiveFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
 */
PerspectiveFrustum.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new PerspectiveFrustum();
  }

  result.fov = array[startingIndex++];
  result.aspectRatio = array[startingIndex++];
  result.near = array[startingIndex++];
  result.far = array[startingIndex++];
  result.xOffset = array[startingIndex++];
  result.yOffset = array[startingIndex];

  return result;
};

function update(frustum) {
  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(frustum.fov) ||
    !defined(frustum.aspectRatio) ||
    !defined(frustum.near) ||
    !defined(frustum.far)
  ) {
    throw new DeveloperError(
      "fov, aspectRatio, near, or far parameters are not set."
    );
  }
  //>>includeEnd('debug');

  const f = frustum._offCenterFrustum;

  if (
    frustum.fov !== frustum._fov ||
    frustum.aspectRatio !== frustum._aspectRatio ||
    frustum.near !== frustum._near ||
    frustum.far !== frustum._far ||
    frustum.xOffset !== frustum._xOffset ||
    frustum.yOffset !== frustum._yOffset
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (frustum.fov < 0 || frustum.fov >= Math.PI) {
      throw new DeveloperError("fov must be in the range [0, PI).");
    }

    if (frustum.aspectRatio < 0) {
      throw new DeveloperError("aspectRatio must be positive.");
    }

    if (frustum.near < 0 || frustum.near > frustum.far) {
      throw new DeveloperError(
        "near must be greater than zero and less than far."
      );
    }
    //>>includeEnd('debug');

    frustum._aspectRatio = frustum.aspectRatio;
    frustum._fov = frustum.fov;
    frustum._fovy =
      frustum.aspectRatio <= 1
        ? frustum.fov
        : Math.atan(Math.tan(frustum.fov * 0.5) / frustum.aspectRatio) * 2.0;
    frustum._near = frustum.near;
    frustum._far = frustum.far;
    frustum._sseDenominator = 2.0 * Math.tan(0.5 * frustum._fovy);
    frustum._xOffset = frustum.xOffset;
    frustum._yOffset = frustum.yOffset;

    f.top = frustum.near * Math.tan(0.5 * frustum._fovy);
    f.bottom = -f.top;
    f.right = frustum.aspectRatio * f.top;
    f.left = -f.right;
    f.near = frustum.near;
    f.far = frustum.far;

    f.right += frustum.xOffset;
    f.left += frustum.xOffset;
    f.top += frustum.yOffset;
    f.bottom += frustum.yOffset;
  }
}

Object.defineProperties(PerspectiveFrustum.prototype, {
  /**
   * Gets the perspective projection matrix computed from the view frustum.
   * @memberof PerspectiveFrustum.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @see PerspectiveFrustum#infiniteProjectionMatrix
   */
  projectionMatrix: {
    get: function () {
      update(this);
      return this._offCenterFrustum.projectionMatrix;
    },
  },

  /**
   * The perspective projection matrix computed from the view frustum with an infinite far plane.
   * @memberof PerspectiveFrustum.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @see PerspectiveFrustum#projectionMatrix
   */
  infiniteProjectionMatrix: {
    get: function () {
      update(this);
      return this._offCenterFrustum.infiniteProjectionMatrix;
    },
  },

  /**
   * Gets the angle of the vertical field of view, in radians.
   * @memberof PerspectiveFrustum.prototype
   * @type {number}
   * @readonly
   * @default undefined
   */
  fovy: {
    get: function () {
      update(this);
      return this._fovy;
    },
  },

  /**
   * @readonly
   * @private
   */
  sseDenominator: {
    get: function () {
      update(this);
      return this._sseDenominator;
    },
  },

  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof PerspectiveFrustum.prototype
   * @type {PerspectiveOffCenterFrustum}
   * @readonly
   * @private
   */
  offCenterFrustum: {
    get: function () {
      update(this);
      return this._offCenterFrustum;
    },
  },
});

/**
 * Creates a culling volume for this frustum.
 *
 * @param {Cartesian3} position The eye position.
 * @param {Cartesian3} direction The view direction.
 * @param {Cartesian3} up The up direction.
 * @returns {CullingVolume} A culling volume at the given position and orientation.
 *
 * @example
 * // Check if a bounding volume intersects the frustum.
 * const cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
 * const intersect = cullingVolume.computeVisibility(boundingVolume);
 */
PerspectiveFrustum.prototype.computeCullingVolume = function (
  position,
  direction,
  up
) {
  update(this);
  return this._offCenterFrustum.computeCullingVolume(position, direction, up);
};

/**
 * Returns the pixel's width and height in meters.
 *
 * @param {number} drawingBufferWidth The width of the drawing buffer.
 * @param {number} drawingBufferHeight The height of the drawing buffer.
 * @param {number} distance The distance to the near plane in meters.
 * @param {number} pixelRatio The scaling factor from pixel space to coordinate space.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
 *
 * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
 * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
 * @exception {DeveloperError} pixelRatio must be greater than zero.
 *
 * @example
 * // Example 1
 * // Get the width and height of a pixel.
 * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 1.0, scene.pixelRatio, new Cesium.Cartesian2());
 *
 * @example
 * // Example 2
 * // Get the width and height of a pixel if the near plane was set to 'distance'.
 * // For example, get the size of a pixel of an image on a billboard.
 * const position = camera.position;
 * const direction = camera.direction;
 * const toCenter = Cesium.Cartesian3.subtract(primitive.boundingVolume.center, position, new Cesium.Cartesian3());      // vector from camera to a primitive
 * const toCenterProj = Cesium.Cartesian3.multiplyByScalar(direction, Cesium.Cartesian3.dot(direction, toCenter), new Cesium.Cartesian3()); // project vector onto camera direction vector
 * const distance = Cesium.Cartesian3.magnitude(toCenterProj);
 * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, distance, scene.pixelRatio, new Cesium.Cartesian2());
 */
PerspectiveFrustum.prototype.getPixelDimensions = function (
  drawingBufferWidth,
  drawingBufferHeight,
  distance,
  pixelRatio,
  result
) {
  update(this);
  return this._offCenterFrustum.getPixelDimensions(
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  );
};

/**
 * Returns a duplicate of a PerspectiveFrustum instance.
 *
 * @param {PerspectiveFrustum} [result] The object onto which to store the result.
 * @returns {PerspectiveFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
 */
PerspectiveFrustum.prototype.clone = function (result) {
  if (!defined(result)) {
    result = new PerspectiveFrustum();
  }

  result.aspectRatio = this.aspectRatio;
  result.fov = this.fov;
  result.near = this.near;
  result.far = this.far;

  // force update of clone to compute matrices
  result._aspectRatio = undefined;
  result._fov = undefined;
  result._near = undefined;
  result._far = undefined;

  this._offCenterFrustum.clone(result._offCenterFrustum);

  return result;
};

/**
 * Compares the provided PerspectiveFrustum componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {PerspectiveFrustum} [other] The right hand side PerspectiveFrustum.
 * @returns {boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
PerspectiveFrustum.prototype.equals = function (other) {
  if (!defined(other) || !(other instanceof PerspectiveFrustum)) {
    return false;
  }

  update(this);
  update(other);

  return (
    this.fov === other.fov &&
    this.aspectRatio === other.aspectRatio &&
    this._offCenterFrustum.equals(other._offCenterFrustum)
  );
};

/**
 * Compares the provided PerspectiveFrustum componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {PerspectiveFrustum} other The right hand side PerspectiveFrustum.
 * @param {number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
 * @param {number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
 */
PerspectiveFrustum.prototype.equalsEpsilon = function (
  other,
  relativeEpsilon,
  absoluteEpsilon
) {
  if (!defined(other) || !(other instanceof PerspectiveFrustum)) {
    return false;
  }

  update(this);
  update(other);

  return (
    CesiumMath.equalsEpsilon(
      this.fov,
      other.fov,
      relativeEpsilon,
      absoluteEpsilon
    ) &&
    CesiumMath.equalsEpsilon(
      this.aspectRatio,
      other.aspectRatio,
      relativeEpsilon,
      absoluteEpsilon
    ) &&
    this._offCenterFrustum.equalsEpsilon(
      other._offCenterFrustum,
      relativeEpsilon,
      absoluteEpsilon
    )
  );
};
export default PerspectiveFrustum;
