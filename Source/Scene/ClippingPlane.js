import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";

/**
 * A Plane in Hessian Normal form to be used with {@link ClippingPlaneCollection}.
 * Compatible with mathematics functions in {@link Plane}
 *
 * @alias ClippingPlane
 * @constructor
 *
 * @param {Cartesian3} normal The plane's normal (normalized).
 * @param {Number} distance The shortest distance from the origin to the plane.  The sign of
 * <code>distance</code> determines which side of the plane the origin
 * is on.  If <code>distance</code> is positive, the origin is in the half-space
 * in the direction of the normal; if negative, the origin is in the half-space
 * opposite to the normal; if zero, the plane passes through the origin.
 */
function ClippingPlane(normal, distance) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("normal", normal);
  Check.typeOf.number("distance", distance);
  //>>includeEnd('debug');

  this._distance = distance;
  this._normal = new UpdateChangedCartesian3(normal, this);
  this.onChangeCallback = undefined;
  this.index = -1; // to be set by ClippingPlaneCollection
}

Object.defineProperties(ClippingPlane.prototype, {
  /**
   * The shortest distance from the origin to the plane.  The sign of
   * <code>distance</code> determines which side of the plane the origin
   * is on.  If <code>distance</code> is positive, the origin is in the half-space
   * in the direction of the normal; if negative, the origin is in the half-space
   * opposite to the normal; if zero, the plane passes through the origin.
   *
   * @type {Number}
   * @memberof ClippingPlane.prototype
   */
  distance: {
    get: function () {
      return this._distance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');
      if (defined(this.onChangeCallback) && value !== this._distance) {
        this.onChangeCallback(this.index);
      }
      this._distance = value;
    },
  },
  /**
   * The plane's normal.
   *
   * @type {Cartesian3}
   * @memberof ClippingPlane.prototype
   */
  normal: {
    get: function () {
      return this._normal;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');
      if (
        defined(this.onChangeCallback) &&
        !Cartesian3.equals(this._normal._cartesian3, value)
      ) {
        this.onChangeCallback(this.index);
      }
      // Set without firing callback again
      Cartesian3.clone(value, this._normal._cartesian3);
    },
  },
});

/**
 * Create a ClippingPlane from a Plane object.
 *
 * @param {Plane} plane The plane containing parameters to copy
 * @param {ClippingPlane} [result] The object on which to store the result
 * @returns {ClippingPlane} The ClippingPlane generated from the plane's parameters.
 */
ClippingPlane.fromPlane = function (plane, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("plane", plane);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new ClippingPlane(plane.normal, plane.distance);
  } else {
    result.normal = plane.normal;
    result.distance = plane.distance;
  }
  return result;
};

/**
 * Clones the ClippingPlane without setting its ownership.
 * @param {ClippingPlane} clippingPlane The ClippingPlane to be cloned
 * @param {ClippingPlane} [result] The object on which to store the cloned parameters.
 * @returns {ClippingPlane} a clone of the input ClippingPlane
 */
ClippingPlane.clone = function (clippingPlane, result) {
  if (!defined(result)) {
    return new ClippingPlane(clippingPlane.normal, clippingPlane.distance);
  }
  result.normal = clippingPlane.normal;
  result.distance = clippingPlane.distance;
  return result;
};

/**
 * Wrapper on Cartesian3 that allows detection of Plane changes from "members of members," for example:
 *
 * var clippingPlane = new ClippingPlane(...);
 * clippingPlane.normal.z = -1.0;
 *
 * @private
 */
function UpdateChangedCartesian3(normal, clippingPlane) {
  this._clippingPlane = clippingPlane;
  this._cartesian3 = Cartesian3.clone(normal);
}

Object.defineProperties(UpdateChangedCartesian3.prototype, {
  x: {
    get: function () {
      return this._cartesian3.x;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');
      if (
        defined(this._clippingPlane.onChangeCallback) &&
        value !== this._cartesian3.x
      ) {
        this._clippingPlane.onChangeCallback(this._clippingPlane.index);
      }
      this._cartesian3.x = value;
    },
  },
  y: {
    get: function () {
      return this._cartesian3.y;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');
      if (
        defined(this._clippingPlane.onChangeCallback) &&
        value !== this._cartesian3.y
      ) {
        this._clippingPlane.onChangeCallback(this._clippingPlane.index);
      }
      this._cartesian3.y = value;
    },
  },
  z: {
    get: function () {
      return this._cartesian3.z;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');
      if (
        defined(this._clippingPlane.onChangeCallback) &&
        value !== this._cartesian3.z
      ) {
        this._clippingPlane.onChangeCallback(this._clippingPlane.index);
      }
      this._cartesian3.z = value;
    },
  },
});
export default ClippingPlane;
