import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import OrthographicOffCenterFrustum from "./OrthographicOffCenterFrustum.js";

/**
 * The viewing frustum is defined by 6 planes.
 * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
 * define the unit vector normal to the plane, and the w component is the distance of the
 * plane from the origin/camera position.
 *
 * @alias OrthographicFrustum
 * @constructor
 *
 * @param {object} [options] An object with the following properties:
 * @param {number} [options.width] The width of the frustum in meters.
 * @param {number} [options.aspectRatio] The aspect ratio of the frustum's width to it's height.
 * @param {number} [options.near=1.0] The distance of the near plane.
 * @param {number} [options.far=500000000.0] The distance of the far plane.
 *
 * @example
 * const maxRadii = ellipsoid.maximumRadius;
 *
 * const frustum = new Cesium.OrthographicFrustum();
 * frustum.near = 0.01 * maxRadii;
 * frustum.far = 50.0 * maxRadii;
 */
function OrthographicFrustum(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._offCenterFrustum = new OrthographicOffCenterFrustum();

  /**
   * The horizontal width of the frustum in meters.
   * @type {number}
   * @default undefined
   */
  this.width = options.width;
  this._width = undefined;

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
   * @default 500000000.0;
   */
  this.far = defaultValue(options.far, 500000000.0);
  this._far = this.far;
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
OrthographicFrustum.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {OrthographicFrustum} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
OrthographicFrustum.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.width;
  array[startingIndex++] = value.aspectRatio;
  array[startingIndex++] = value.near;
  array[startingIndex] = value.far;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {OrthographicFrustum} [result] The object into which to store the result.
 * @returns {OrthographicFrustum} The modified result parameter or a new OrthographicFrustum instance if one was not provided.
 */
OrthographicFrustum.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new OrthographicFrustum();
  }

  result.width = array[startingIndex++];
  result.aspectRatio = array[startingIndex++];
  result.near = array[startingIndex++];
  result.far = array[startingIndex];

  return result;
};

function update(frustum) {
  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(frustum.width) ||
    !defined(frustum.aspectRatio) ||
    !defined(frustum.near) ||
    !defined(frustum.far)
  ) {
    throw new DeveloperError(
      "width, aspectRatio, near, or far parameters are not set."
    );
  }
  //>>includeEnd('debug');

  const f = frustum._offCenterFrustum;

  if (
    frustum.width !== frustum._width ||
    frustum.aspectRatio !== frustum._aspectRatio ||
    frustum.near !== frustum._near ||
    frustum.far !== frustum._far
  ) {
    //>>includeStart('debug', pragmas.debug);
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
    frustum._width = frustum.width;
    frustum._near = frustum.near;
    frustum._far = frustum.far;

    const ratio = 1.0 / frustum.aspectRatio;
    f.right = frustum.width * 0.5;
    f.left = -f.right;
    f.top = ratio * f.right;
    f.bottom = -f.top;
    f.near = frustum.near;
    f.far = frustum.far;
  }
}

Object.defineProperties(OrthographicFrustum.prototype, {
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof OrthographicFrustum.prototype
   * @type {Matrix4}
   * @readonly
   */
  projectionMatrix: {
    get: function () {
      update(this);
      return this._offCenterFrustum.projectionMatrix;
    },
  },
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof OrthographicFrustum.prototype
   * @type {OrthographicOffCenterFrustum}
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
OrthographicFrustum.prototype.computeCullingVolume = function (
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
 * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 0.0, scene.pixelRatio, new Cesium.Cartesian2());
 */
OrthographicFrustum.prototype.getPixelDimensions = function (
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
 * Returns a duplicate of a OrthographicFrustum instance.
 *
 * @param {OrthographicFrustum} [result] The object onto which to store the result.
 * @returns {OrthographicFrustum} The modified result parameter or a new OrthographicFrustum instance if one was not provided.
 */
OrthographicFrustum.prototype.clone = function (result) {
  if (!defined(result)) {
    result = new OrthographicFrustum();
  }

  result.aspectRatio = this.aspectRatio;
  result.width = this.width;
  result.near = this.near;
  result.far = this.far;

  // force update of clone to compute matrices
  result._aspectRatio = undefined;
  result._width = undefined;
  result._near = undefined;
  result._far = undefined;

  this._offCenterFrustum.clone(result._offCenterFrustum);

  return result;
};

/**
 * Compares the provided OrthographicFrustum componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {OrthographicFrustum} [other] The right hand side OrthographicFrustum.
 * @returns {boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
OrthographicFrustum.prototype.equals = function (other) {
  if (!defined(other) || !(other instanceof OrthographicFrustum)) {
    return false;
  }

  update(this);
  update(other);

  return (
    this.width === other.width &&
    this.aspectRatio === other.aspectRatio &&
    this._offCenterFrustum.equals(other._offCenterFrustum)
  );
};

/**
 * Compares the provided OrthographicFrustum componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {OrthographicFrustum} other The right hand side OrthographicFrustum.
 * @param {number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
 * @param {number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
 */
OrthographicFrustum.prototype.equalsEpsilon = function (
  other,
  relativeEpsilon,
  absoluteEpsilon
) {
  if (!defined(other) || !(other instanceof OrthographicFrustum)) {
    return false;
  }

  update(this);
  update(other);

  return (
    CesiumMath.equalsEpsilon(
      this.width,
      other.width,
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
export default OrthographicFrustum;
