import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import CullingVolume from "./CullingVolume.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import Matrix4 from "./Matrix4.js";

/**
 * The viewing frustum is defined by 6 planes.
 * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
 * define the unit vector normal to the plane, and the w component is the distance of the
 * plane from the origin/camera position.
 *
 * @alias OrthographicOffCenterFrustum
 * @constructor
 *
 * @param {object} [options] An object with the following properties:
 * @param {number} [options.left] The left clipping plane distance.
 * @param {number} [options.right] The right clipping plane distance.
 * @param {number} [options.top] The top clipping plane distance.
 * @param {number} [options.bottom] The bottom clipping plane distance.
 * @param {number} [options.near=1.0] The near clipping plane distance.
 * @param {number} [options.far=500000000.0] The far clipping plane distance.
 *
 * @example
 * const maxRadii = ellipsoid.maximumRadius;
 *
 * const frustum = new Cesium.OrthographicOffCenterFrustum();
 * frustum.right = maxRadii * Cesium.Math.PI;
 * frustum.left = -c.frustum.right;
 * frustum.top = c.frustum.right * (canvas.clientHeight / canvas.clientWidth);
 * frustum.bottom = -c.frustum.top;
 * frustum.near = 0.01 * maxRadii;
 * frustum.far = 50.0 * maxRadii;
 */
function OrthographicOffCenterFrustum(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The left clipping plane.
   * @type {number|undefined}
   * @default undefined
   */
  this.left = options.left;
  this._left = undefined;

  /**
   * The right clipping plane.
   * @type {number|undefined}
   * @default undefined
   */
  this.right = options.right;
  this._right = undefined;

  /**
   * The top clipping plane.
   * @type {number|undefined}
   * @default undefined
   */
  this.top = options.top;
  this._top = undefined;

  /**
   * The bottom clipping plane.
   * @type {number|undefined}
   * @default undefined
   */
  this.bottom = options.bottom;
  this._bottom = undefined;

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

  this._cullingVolume = new CullingVolume();
  this._orthographicMatrix = new Matrix4();
}

function update(frustum) {
  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(frustum.right) ||
    !defined(frustum.left) ||
    !defined(frustum.top) ||
    !defined(frustum.bottom) ||
    !defined(frustum.near) ||
    !defined(frustum.far)
  ) {
    throw new DeveloperError(
      "right, left, top, bottom, near, or far parameters are not set.",
    );
  }
  //>>includeEnd('debug');

  if (
    frustum.top !== frustum._top ||
    frustum.bottom !== frustum._bottom ||
    frustum.left !== frustum._left ||
    frustum.right !== frustum._right ||
    frustum.near !== frustum._near ||
    frustum.far !== frustum._far
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (frustum.left > frustum.right) {
      throw new DeveloperError("right must be greater than left.");
    }
    if (frustum.bottom > frustum.top) {
      throw new DeveloperError("top must be greater than bottom.");
    }
    if (frustum.near <= 0 || frustum.near > frustum.far) {
      throw new DeveloperError(
        "near must be greater than zero and less than far.",
      );
    }
    //>>includeEnd('debug');

    frustum._left = frustum.left;
    frustum._right = frustum.right;
    frustum._top = frustum.top;
    frustum._bottom = frustum.bottom;
    frustum._near = frustum.near;
    frustum._far = frustum.far;
    frustum._orthographicMatrix = Matrix4.computeOrthographicOffCenter(
      frustum.left,
      frustum.right,
      frustum.bottom,
      frustum.top,
      frustum.near,
      frustum.far,
      frustum._orthographicMatrix,
    );
  }
}

Object.defineProperties(OrthographicOffCenterFrustum.prototype, {
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof OrthographicOffCenterFrustum.prototype
   * @type {Matrix4}
   * @readonly
   */
  projectionMatrix: {
    get: function () {
      update(this);
      return this._orthographicMatrix;
    },
  },
});

const getPlanesRight = new Cartesian3();
const getPlanesNearCenter = new Cartesian3();
const getPlanesPoint = new Cartesian3();
const negateScratch = new Cartesian3();

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
OrthographicOffCenterFrustum.prototype.computeCullingVolume = function (
  position,
  direction,
  up,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(position)) {
    throw new DeveloperError("position is required.");
  }
  if (!defined(direction)) {
    throw new DeveloperError("direction is required.");
  }
  if (!defined(up)) {
    throw new DeveloperError("up is required.");
  }
  //>>includeEnd('debug');

  const planes = this._cullingVolume.planes;
  const t = this.top;
  const b = this.bottom;
  const r = this.right;
  const l = this.left;
  const n = this.near;
  const f = this.far;

  const right = Cartesian3.cross(direction, up, getPlanesRight);
  Cartesian3.normalize(right, right);
  const nearCenter = getPlanesNearCenter;
  Cartesian3.multiplyByScalar(direction, n, nearCenter);
  Cartesian3.add(position, nearCenter, nearCenter);

  const point = getPlanesPoint;

  // Left plane
  Cartesian3.multiplyByScalar(right, l, point);
  Cartesian3.add(nearCenter, point, point);

  let plane = planes[0];
  if (!defined(plane)) {
    plane = planes[0] = new Cartesian4();
  }
  plane.x = right.x;
  plane.y = right.y;
  plane.z = right.z;
  plane.w = -Cartesian3.dot(right, point);

  // Right plane
  Cartesian3.multiplyByScalar(right, r, point);
  Cartesian3.add(nearCenter, point, point);

  plane = planes[1];
  if (!defined(plane)) {
    plane = planes[1] = new Cartesian4();
  }
  plane.x = -right.x;
  plane.y = -right.y;
  plane.z = -right.z;
  plane.w = -Cartesian3.dot(Cartesian3.negate(right, negateScratch), point);

  // Bottom plane
  Cartesian3.multiplyByScalar(up, b, point);
  Cartesian3.add(nearCenter, point, point);

  plane = planes[2];
  if (!defined(plane)) {
    plane = planes[2] = new Cartesian4();
  }
  plane.x = up.x;
  plane.y = up.y;
  plane.z = up.z;
  plane.w = -Cartesian3.dot(up, point);

  // Top plane
  Cartesian3.multiplyByScalar(up, t, point);
  Cartesian3.add(nearCenter, point, point);

  plane = planes[3];
  if (!defined(plane)) {
    plane = planes[3] = new Cartesian4();
  }
  plane.x = -up.x;
  plane.y = -up.y;
  plane.z = -up.z;
  plane.w = -Cartesian3.dot(Cartesian3.negate(up, negateScratch), point);

  // Near plane
  plane = planes[4];
  if (!defined(plane)) {
    plane = planes[4] = new Cartesian4();
  }
  plane.x = direction.x;
  plane.y = direction.y;
  plane.z = direction.z;
  plane.w = -Cartesian3.dot(direction, nearCenter);

  // Far plane
  Cartesian3.multiplyByScalar(direction, f, point);
  Cartesian3.add(position, point, point);

  plane = planes[5];
  if (!defined(plane)) {
    plane = planes[5] = new Cartesian4();
  }
  plane.x = -direction.x;
  plane.y = -direction.y;
  plane.z = -direction.z;
  plane.w = -Cartesian3.dot(Cartesian3.negate(direction, negateScratch), point);

  return this._cullingVolume;
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
OrthographicOffCenterFrustum.prototype.getPixelDimensions = function (
  drawingBufferWidth,
  drawingBufferHeight,
  distance,
  pixelRatio,
  result,
) {
  update(this);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(drawingBufferWidth) || !defined(drawingBufferHeight)) {
    throw new DeveloperError(
      "Both drawingBufferWidth and drawingBufferHeight are required.",
    );
  }
  if (drawingBufferWidth <= 0) {
    throw new DeveloperError("drawingBufferWidth must be greater than zero.");
  }
  if (drawingBufferHeight <= 0) {
    throw new DeveloperError("drawingBufferHeight must be greater than zero.");
  }
  if (!defined(distance)) {
    throw new DeveloperError("distance is required.");
  }
  if (!defined(pixelRatio)) {
    throw new DeveloperError("pixelRatio is required.");
  }
  if (pixelRatio <= 0) {
    throw new DeveloperError("pixelRatio must be greater than zero.");
  }
  if (!defined(result)) {
    throw new DeveloperError("A result object is required.");
  }
  //>>includeEnd('debug');

  const frustumWidth = this.right - this.left;
  const frustumHeight = this.top - this.bottom;
  const pixelWidth = (pixelRatio * frustumWidth) / drawingBufferWidth;
  const pixelHeight = (pixelRatio * frustumHeight) / drawingBufferHeight;

  result.x = pixelWidth;
  result.y = pixelHeight;
  return result;
};

/**
 * Returns a duplicate of a OrthographicOffCenterFrustum instance.
 *
 * @param {OrthographicOffCenterFrustum} [result] The object onto which to store the result.
 * @returns {OrthographicOffCenterFrustum} The modified result parameter or a new OrthographicOffCenterFrustum instance if one was not provided.
 */
OrthographicOffCenterFrustum.prototype.clone = function (result) {
  if (!defined(result)) {
    result = new OrthographicOffCenterFrustum();
  }

  result.left = this.left;
  result.right = this.right;
  result.top = this.top;
  result.bottom = this.bottom;
  result.near = this.near;
  result.far = this.far;

  // force update of clone to compute matrices
  result._left = undefined;
  result._right = undefined;
  result._top = undefined;
  result._bottom = undefined;
  result._near = undefined;
  result._far = undefined;

  return result;
};

/**
 * Compares the provided OrthographicOffCenterFrustum componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {OrthographicOffCenterFrustum} [other] The right hand side OrthographicOffCenterFrustum.
 * @returns {boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
OrthographicOffCenterFrustum.prototype.equals = function (other) {
  return (
    defined(other) &&
    other instanceof OrthographicOffCenterFrustum &&
    this.right === other.right &&
    this.left === other.left &&
    this.top === other.top &&
    this.bottom === other.bottom &&
    this.near === other.near &&
    this.far === other.far
  );
};

/**
 * Compares the provided OrthographicOffCenterFrustum componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {OrthographicOffCenterFrustum} other The right hand side OrthographicOffCenterFrustum.
 * @param {number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
 * @param {number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
 */
OrthographicOffCenterFrustum.prototype.equalsEpsilon = function (
  other,
  relativeEpsilon,
  absoluteEpsilon,
) {
  return (
    other === this ||
    (defined(other) &&
      other instanceof OrthographicOffCenterFrustum &&
      CesiumMath.equalsEpsilon(
        this.right,
        other.right,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
      CesiumMath.equalsEpsilon(
        this.left,
        other.left,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
      CesiumMath.equalsEpsilon(
        this.top,
        other.top,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
      CesiumMath.equalsEpsilon(
        this.bottom,
        other.bottom,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
      CesiumMath.equalsEpsilon(
        this.near,
        other.near,
        relativeEpsilon,
        absoluteEpsilon,
      ) &&
      CesiumMath.equalsEpsilon(
        this.far,
        other.far,
        relativeEpsilon,
        absoluteEpsilon,
      ))
  );
};
export default OrthographicOffCenterFrustum;
