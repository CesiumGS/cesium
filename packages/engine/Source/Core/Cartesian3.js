import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * A 3D Cartesian point.
 * @alias Cartesian3
 * @constructor
 *
 * @param {number} [x=0.0] The X component.
 * @param {number} [y=0.0] The Y component.
 * @param {number} [z=0.0] The Z component.
 *
 * @see Cartesian2
 * @see Cartesian4
 * @see Packable
 */
function Cartesian3(x, y, z) {
  /**
   * The X component.
   * @type {number}
   * @default 0.0
   */
  this.x = defaultValue(x, 0.0);

  /**
   * The Y component.
   * @type {number}
   * @default 0.0
   */
  this.y = defaultValue(y, 0.0);

  /**
   * The Z component.
   * @type {number}
   * @default 0.0
   */
  this.z = defaultValue(z, 0.0);
}

/**
 * Converts the provided Spherical into Cartesian3 coordinates.
 *
 * @param {Spherical} spherical The Spherical to be converted to Cartesian3.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
 */
Cartesian3.fromSpherical = function (spherical, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("spherical", spherical);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  const clock = spherical.clock;
  const cone = spherical.cone;
  const magnitude = defaultValue(spherical.magnitude, 1.0);
  const radial = magnitude * Math.sin(cone);
  result.x = radial * Math.cos(clock);
  result.y = radial * Math.sin(clock);
  result.z = magnitude * Math.cos(cone);
  return result;
};

/**
 * Creates a Cartesian3 instance from x, y and z coordinates.
 *
 * @param {number} x The x coordinate.
 * @param {number} y The y coordinate.
 * @param {number} z The z coordinate.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
 */
Cartesian3.fromElements = function (x, y, z, result) {
  if (!defined(result)) {
    return new Cartesian3(x, y, z);
  }

  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};

/**
 * Duplicates a Cartesian3 instance.
 *
 * @param {Cartesian3} cartesian The Cartesian to duplicate.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided. (Returns undefined if cartesian is undefined)
 */
Cartesian3.clone = function (cartesian, result) {
  if (!defined(cartesian)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Cartesian3(cartesian.x, cartesian.y, cartesian.z);
  }

  result.x = cartesian.x;
  result.y = cartesian.y;
  result.z = cartesian.z;
  return result;
};

/**
 * Creates a Cartesian3 instance from an existing Cartesian4.  This simply takes the
 * x, y, and z properties of the Cartesian4 and drops w.
 * @function
 *
 * @param {Cartesian4} cartesian The Cartesian4 instance to create a Cartesian3 instance from.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
 */
Cartesian3.fromCartesian4 = Cartesian3.clone;

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
Cartesian3.packedLength = 3;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Cartesian3} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
Cartesian3.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex] = value.z;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Cartesian3} [result] The object into which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
 */
Cartesian3.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new Cartesian3();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.z = array[startingIndex];
  return result;
};

/**
 * Flattens an array of Cartesian3s into an array of components.
 *
 * @param {Cartesian3[]} array The array of cartesians to pack.
 * @param {number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 3 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 3) elements.
 * @returns {number[]} The packed array.
 */
Cartesian3.packArray = function (array, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  const length = array.length;
  const resultLength = length * 3;
  if (!defined(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "If result is a typed array, it must have exactly array.length * 3 elements"
    );
    //>>includeEnd('debug');
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }

  for (let i = 0; i < length; ++i) {
    Cartesian3.pack(array[i], result, i * 3);
  }
  return result;
};

/**
 * Unpacks an array of cartesian components into an array of Cartesian3s.
 *
 * @param {number[]} array The array of components to unpack.
 * @param {Cartesian3[]} [result] The array onto which to store the result.
 * @returns {Cartesian3[]} The unpacked array.
 */
Cartesian3.unpackArray = function (array, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 3);
  if (array.length % 3 !== 0) {
    throw new DeveloperError("array length must be a multiple of 3.");
  }
  //>>includeEnd('debug');

  const length = array.length;
  if (!defined(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }

  for (let i = 0; i < length; i += 3) {
    const index = i / 3;
    result[index] = Cartesian3.unpack(array, i, result[index]);
  }
  return result;
};

/**
 * Creates a Cartesian3 from three consecutive elements in an array.
 * @function
 *
 * @param {number[]} array The array whose three consecutive elements correspond to the x, y, and z components, respectively.
 * @param {number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
 *
 * @example
 * // Create a Cartesian3 with (1.0, 2.0, 3.0)
 * const v = [1.0, 2.0, 3.0];
 * const p = Cesium.Cartesian3.fromArray(v);
 *
 * // Create a Cartesian3 with (1.0, 2.0, 3.0) using an offset into an array
 * const v2 = [0.0, 0.0, 1.0, 2.0, 3.0];
 * const p2 = Cesium.Cartesian3.fromArray(v2, 2);
 */
Cartesian3.fromArray = Cartesian3.unpack;

/**
 * Computes the value of the maximum component for the supplied Cartesian.
 *
 * @param {Cartesian3} cartesian The cartesian to use.
 * @returns {number} The value of the maximum component.
 */
Cartesian3.maximumComponent = function (cartesian) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  //>>includeEnd('debug');

  return Math.max(cartesian.x, cartesian.y, cartesian.z);
};

/**
 * Computes the value of the minimum component for the supplied Cartesian.
 *
 * @param {Cartesian3} cartesian The cartesian to use.
 * @returns {number} The value of the minimum component.
 */
Cartesian3.minimumComponent = function (cartesian) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  //>>includeEnd('debug');

  return Math.min(cartesian.x, cartesian.y, cartesian.z);
};

/**
 * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
 *
 * @param {Cartesian3} first A cartesian to compare.
 * @param {Cartesian3} second A cartesian to compare.
 * @param {Cartesian3} result The object into which to store the result.
 * @returns {Cartesian3} A cartesian with the minimum components.
 */
Cartesian3.minimumByComponent = function (first, second, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("first", first);
  Check.typeOf.object("second", second);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  result.z = Math.min(first.z, second.z);

  return result;
};

/**
 * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
 *
 * @param {Cartesian3} first A cartesian to compare.
 * @param {Cartesian3} second A cartesian to compare.
 * @param {Cartesian3} result The object into which to store the result.
 * @returns {Cartesian3} A cartesian with the maximum components.
 */
Cartesian3.maximumByComponent = function (first, second, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("first", first);
  Check.typeOf.object("second", second);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  result.z = Math.max(first.z, second.z);
  return result;
};

/**
 * Constrain a value to lie between two values.
 *
 * @param {Cartesian3} cartesian The value to clamp.
 * @param {Cartesian3} min The minimum bound.
 * @param {Cartesian3} max The maximum bound.
 * @param {Cartesian3} result The object into which to store the result.
 * @returns {Cartesian3} The clamped value such that min <= value <= max.
 */
Cartesian3.clamp = function (value, min, max, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.typeOf.object("min", min);
  Check.typeOf.object("max", max);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const x = CesiumMath.clamp(value.x, min.x, max.x);
  const y = CesiumMath.clamp(value.y, min.y, max.y);
  const z = CesiumMath.clamp(value.z, min.z, max.z);

  result.x = x;
  result.y = y;
  result.z = z;

  return result;
};

/**
 * Computes the provided Cartesian's squared magnitude.
 *
 * @param {Cartesian3} cartesian The Cartesian instance whose squared magnitude is to be computed.
 * @returns {number} The squared magnitude.
 */
Cartesian3.magnitudeSquared = function (cartesian) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  //>>includeEnd('debug');

  return (
    cartesian.x * cartesian.x +
    cartesian.y * cartesian.y +
    cartesian.z * cartesian.z
  );
};

/**
 * Computes the Cartesian's magnitude (length).
 *
 * @param {Cartesian3} cartesian The Cartesian instance whose magnitude is to be computed.
 * @returns {number} The magnitude.
 */
Cartesian3.magnitude = function (cartesian) {
  return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
};

const distanceScratch = new Cartesian3();

/**
 * Computes the distance between two points.
 *
 * @param {Cartesian3} left The first point to compute the distance from.
 * @param {Cartesian3} right The second point to compute the distance to.
 * @returns {number} The distance between two points.
 *
 * @example
 * // Returns 1.0
 * const d = Cesium.Cartesian3.distance(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(2.0, 0.0, 0.0));
 */
Cartesian3.distance = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  Cartesian3.subtract(left, right, distanceScratch);
  return Cartesian3.magnitude(distanceScratch);
};

/**
 * Computes the squared distance between two points.  Comparing squared distances
 * using this function is more efficient than comparing distances using {@link Cartesian3#distance}.
 *
 * @param {Cartesian3} left The first point to compute the distance from.
 * @param {Cartesian3} right The second point to compute the distance to.
 * @returns {number} The distance between two points.
 *
 * @example
 * // Returns 4.0, not 2.0
 * const d = Cesium.Cartesian3.distanceSquared(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(3.0, 0.0, 0.0));
 */
Cartesian3.distanceSquared = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  Cartesian3.subtract(left, right, distanceScratch);
  return Cartesian3.magnitudeSquared(distanceScratch);
};

/**
 * Computes the normalized form of the supplied Cartesian.
 *
 * @param {Cartesian3} cartesian The Cartesian to be normalized.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.normalize = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const magnitude = Cartesian3.magnitude(cartesian);

  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  result.z = cartesian.z / magnitude;

  //>>includeStart('debug', pragmas.debug);
  if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
    throw new DeveloperError("normalized result is not a number");
  }
  //>>includeEnd('debug');

  return result;
};

/**
 * Computes the dot (scalar) product of two Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @returns {number} The dot product.
 */
Cartesian3.dot = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  return left.x * right.x + left.y * right.y + left.z * right.z;
};

/**
 * Computes the componentwise product of two Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.multiplyComponents = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = left.x * right.x;
  result.y = left.y * right.y;
  result.z = left.z * right.z;
  return result;
};

/**
 * Computes the componentwise quotient of two Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.divideComponents = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = left.x / right.x;
  result.y = left.y / right.y;
  result.z = left.z / right.z;
  return result;
};

/**
 * Computes the componentwise sum of two Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.add = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  return result;
};

/**
 * Computes the componentwise difference of two Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.subtract = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  return result;
};

/**
 * Multiplies the provided Cartesian componentwise by the provided scalar.
 *
 * @param {Cartesian3} cartesian The Cartesian to be scaled.
 * @param {number} scalar The scalar to multiply with.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.multiplyByScalar = function (cartesian, scalar, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.number("scalar", scalar);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  result.z = cartesian.z * scalar;
  return result;
};

/**
 * Divides the provided Cartesian componentwise by the provided scalar.
 *
 * @param {Cartesian3} cartesian The Cartesian to be divided.
 * @param {number} scalar The scalar to divide by.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.divideByScalar = function (cartesian, scalar, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.number("scalar", scalar);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  result.z = cartesian.z / scalar;
  return result;
};

/**
 * Negates the provided Cartesian.
 *
 * @param {Cartesian3} cartesian The Cartesian to be negated.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.negate = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = -cartesian.x;
  result.y = -cartesian.y;
  result.z = -cartesian.z;
  return result;
};

/**
 * Computes the absolute value of the provided Cartesian.
 *
 * @param {Cartesian3} cartesian The Cartesian whose absolute value is to be computed.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.abs = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  result.z = Math.abs(cartesian.z);
  return result;
};

const lerpScratch = new Cartesian3();
/**
 * Computes the linear interpolation or extrapolation at t using the provided cartesians.
 *
 * @param {Cartesian3} start The value corresponding to t at 0.0.
 * @param {Cartesian3} end The value corresponding to t at 1.0.
 * @param {number} t The point along t at which to interpolate.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Cartesian3.lerp = function (start, end, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("start", start);
  Check.typeOf.object("end", end);
  Check.typeOf.number("t", t);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  Cartesian3.multiplyByScalar(end, t, lerpScratch);
  result = Cartesian3.multiplyByScalar(start, 1.0 - t, result);
  return Cartesian3.add(lerpScratch, result, result);
};

const angleBetweenScratch = new Cartesian3();
const angleBetweenScratch2 = new Cartesian3();
/**
 * Returns the angle, in radians, between the provided Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @returns {number} The angle between the Cartesians.
 */
Cartesian3.angleBetween = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  Cartesian3.normalize(left, angleBetweenScratch);
  Cartesian3.normalize(right, angleBetweenScratch2);
  const cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2);
  const sine = Cartesian3.magnitude(
    Cartesian3.cross(
      angleBetweenScratch,
      angleBetweenScratch2,
      angleBetweenScratch
    )
  );
  return Math.atan2(sine, cosine);
};

const mostOrthogonalAxisScratch = new Cartesian3();
/**
 * Returns the axis that is most orthogonal to the provided Cartesian.
 *
 * @param {Cartesian3} cartesian The Cartesian on which to find the most orthogonal axis.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The most orthogonal axis.
 */
Cartesian3.mostOrthogonalAxis = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch);
  Cartesian3.abs(f, f);

  if (f.x <= f.y) {
    if (f.x <= f.z) {
      result = Cartesian3.clone(Cartesian3.UNIT_X, result);
    } else {
      result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
    }
  } else if (f.y <= f.z) {
    result = Cartesian3.clone(Cartesian3.UNIT_Y, result);
  } else {
    result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
  }

  return result;
};

/**
 * Projects vector a onto vector b
 * @param {Cartesian3} a The vector that needs projecting
 * @param {Cartesian3} b The vector to project onto
 * @param {Cartesian3} result The result cartesian
 * @returns {Cartesian3} The modified result parameter
 */
Cartesian3.projectVector = function (a, b, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("a", a);
  Check.defined("b", b);
  Check.defined("result", result);
  //>>includeEnd('debug');

  const scalar = Cartesian3.dot(a, b) / Cartesian3.dot(b, b);
  return Cartesian3.multiplyByScalar(b, scalar, result);
};

/**
 * Compares the provided Cartesians componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Cartesian3} [left] The first Cartesian.
 * @param {Cartesian3} [right] The second Cartesian.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Cartesian3.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.x === right.x &&
      left.y === right.y &&
      left.z === right.z)
  );
};

/**
 * @private
 */
Cartesian3.equalsArray = function (cartesian, array, offset) {
  return (
    cartesian.x === array[offset] &&
    cartesian.y === array[offset + 1] &&
    cartesian.z === array[offset + 2]
  );
};

/**
 * Compares the provided Cartesians componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {Cartesian3} [left] The first Cartesian.
 * @param {Cartesian3} [right] The second Cartesian.
 * @param {number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
 * @param {number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Cartesian3.equalsEpsilon = function (
  left,
  right,
  relativeEpsilon,
  absoluteEpsilon
) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      CesiumMath.equalsEpsilon(
        left.x,
        right.x,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      CesiumMath.equalsEpsilon(
        left.y,
        right.y,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      CesiumMath.equalsEpsilon(
        left.z,
        right.z,
        relativeEpsilon,
        absoluteEpsilon
      ))
  );
};

/**
 * Computes the cross (outer) product of two Cartesians.
 *
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The cross product.
 */
Cartesian3.cross = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const leftX = left.x;
  const leftY = left.y;
  const leftZ = left.z;
  const rightX = right.x;
  const rightY = right.y;
  const rightZ = right.z;

  const x = leftY * rightZ - leftZ * rightY;
  const y = leftZ * rightX - leftX * rightZ;
  const z = leftX * rightY - leftY * rightX;

  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};

/**
 * Computes the midpoint between the right and left Cartesian.
 * @param {Cartesian3} left The first Cartesian.
 * @param {Cartesian3} right The second Cartesian.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The midpoint.
 */
Cartesian3.midpoint = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = (left.x + right.x) * 0.5;
  result.y = (left.y + right.y) * 0.5;
  result.z = (left.z + right.z) * 0.5;

  return result;
};

/**
 * Returns a Cartesian3 position from longitude and latitude values given in degrees.
 *
 * @param {number} longitude The longitude, in degrees
 * @param {number} latitude The latitude, in degrees
 * @param {number} [height=0.0] The height, in meters, above the ellipsoid.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the position lies.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The position
 *
 * @example
 * const position = Cesium.Cartesian3.fromDegrees(-115.0, 37.0);
 */
Cartesian3.fromDegrees = function (
  longitude,
  latitude,
  height,
  ellipsoid,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("longitude", longitude);
  Check.typeOf.number("latitude", latitude);
  //>>includeEnd('debug');

  longitude = CesiumMath.toRadians(longitude);
  latitude = CesiumMath.toRadians(latitude);
  return Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, result);
};

let scratchN = new Cartesian3();
let scratchK = new Cartesian3();

// To prevent a circular dependency, this value is overridden by Ellipsoid when Ellipsoid.default is set
Cartesian3._ellipsoidRadiiSquared = new Cartesian3(
  6378137.0 * 6378137.0,
  6378137.0 * 6378137.0,
  6356752.3142451793 * 6356752.3142451793
);

/**
 * Returns a Cartesian3 position from longitude and latitude values given in radians.
 *
 * @param {number} longitude The longitude, in radians
 * @param {number} latitude The latitude, in radians
 * @param {number} [height=0.0] The height, in meters, above the ellipsoid.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the position lies.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The position
 *
 * @example
 * const position = Cesium.Cartesian3.fromRadians(-2.007, 0.645);
 */
Cartesian3.fromRadians = function (
  longitude,
  latitude,
  height,
  ellipsoid,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("longitude", longitude);
  Check.typeOf.number("latitude", latitude);
  //>>includeEnd('debug');

  height = defaultValue(height, 0.0);

  const radiiSquared = !defined(ellipsoid)
    ? Cartesian3._ellipsoidRadiiSquared
    : ellipsoid.radiiSquared;

  const cosLatitude = Math.cos(latitude);
  scratchN.x = cosLatitude * Math.cos(longitude);
  scratchN.y = cosLatitude * Math.sin(longitude);
  scratchN.z = Math.sin(latitude);
  scratchN = Cartesian3.normalize(scratchN, scratchN);

  Cartesian3.multiplyComponents(radiiSquared, scratchN, scratchK);
  const gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK));
  scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK);
  scratchN = Cartesian3.multiplyByScalar(scratchN, height, scratchN);

  if (!defined(result)) {
    result = new Cartesian3();
  }
  return Cartesian3.add(scratchK, scratchN, result);
};

/**
 * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in degrees.
 *
 * @param {number[]} coordinates A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the coordinates lie.
 * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
 * @returns {Cartesian3[]} The array of positions.
 *
 * @example
 * const positions = Cesium.Cartesian3.fromDegreesArray([-115.0, 37.0, -107.0, 33.0]);
 */
Cartesian3.fromDegreesArray = function (coordinates, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("coordinates", coordinates);
  if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
    throw new DeveloperError(
      "the number of coordinates must be a multiple of 2 and at least 2"
    );
  }
  //>>includeEnd('debug');

  const length = coordinates.length;
  if (!defined(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }

  for (let i = 0; i < length; i += 2) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const index = i / 2;
    result[index] = Cartesian3.fromDegrees(
      longitude,
      latitude,
      0,
      ellipsoid,
      result[index]
    );
  }

  return result;
};

/**
 * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in radians.
 *
 * @param {number[]} coordinates A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the coordinates lie.
 * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
 * @returns {Cartesian3[]} The array of positions.
 *
 * @example
 * const positions = Cesium.Cartesian3.fromRadiansArray([-2.007, 0.645, -1.867, .575]);
 */
Cartesian3.fromRadiansArray = function (coordinates, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("coordinates", coordinates);
  if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
    throw new DeveloperError(
      "the number of coordinates must be a multiple of 2 and at least 2"
    );
  }
  //>>includeEnd('debug');

  const length = coordinates.length;
  if (!defined(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }

  for (let i = 0; i < length; i += 2) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const index = i / 2;
    result[index] = Cartesian3.fromRadians(
      longitude,
      latitude,
      0,
      ellipsoid,
      result[index]
    );
  }

  return result;
};

/**
 * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in degrees.
 *
 * @param {number[]} coordinates A list of longitude, latitude and height values. Values alternate [longitude, latitude, height, longitude, latitude, height...].
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the position lies.
 * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
 * @returns {Cartesian3[]} The array of positions.
 *
 * @example
 * const positions = Cesium.Cartesian3.fromDegreesArrayHeights([-115.0, 37.0, 100000.0, -107.0, 33.0, 150000.0]);
 */
Cartesian3.fromDegreesArrayHeights = function (coordinates, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("coordinates", coordinates);
  if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
    throw new DeveloperError(
      "the number of coordinates must be a multiple of 3 and at least 3"
    );
  }
  //>>includeEnd('debug');

  const length = coordinates.length;
  if (!defined(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }

  for (let i = 0; i < length; i += 3) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const height = coordinates[i + 2];
    const index = i / 3;
    result[index] = Cartesian3.fromDegrees(
      longitude,
      latitude,
      height,
      ellipsoid,
      result[index]
    );
  }

  return result;
};

/**
 * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in radians.
 *
 * @param {number[]} coordinates A list of longitude, latitude and height values. Values alternate [longitude, latitude, height, longitude, latitude, height...].
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the position lies.
 * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
 * @returns {Cartesian3[]} The array of positions.
 *
 * @example
 * const positions = Cesium.Cartesian3.fromRadiansArrayHeights([-2.007, 0.645, 100000.0, -1.867, .575, 150000.0]);
 */
Cartesian3.fromRadiansArrayHeights = function (coordinates, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("coordinates", coordinates);
  if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
    throw new DeveloperError(
      "the number of coordinates must be a multiple of 3 and at least 3"
    );
  }
  //>>includeEnd('debug');

  const length = coordinates.length;
  if (!defined(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }

  for (let i = 0; i < length; i += 3) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const height = coordinates[i + 2];
    const index = i / 3;
    result[index] = Cartesian3.fromRadians(
      longitude,
      latitude,
      height,
      ellipsoid,
      result[index]
    );
  }

  return result;
};

/**
 * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
 *
 * @type {Cartesian3}
 * @constant
 */
Cartesian3.ZERO = Object.freeze(new Cartesian3(0.0, 0.0, 0.0));

/**
 * An immutable Cartesian3 instance initialized to (1.0, 1.0, 1.0).
 *
 * @type {Cartesian3}
 * @constant
 */
Cartesian3.ONE = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));

/**
 * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
 *
 * @type {Cartesian3}
 * @constant
 */
Cartesian3.UNIT_X = Object.freeze(new Cartesian3(1.0, 0.0, 0.0));

/**
 * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
 *
 * @type {Cartesian3}
 * @constant
 */
Cartesian3.UNIT_Y = Object.freeze(new Cartesian3(0.0, 1.0, 0.0));

/**
 * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
 *
 * @type {Cartesian3}
 * @constant
 */
Cartesian3.UNIT_Z = Object.freeze(new Cartesian3(0.0, 0.0, 1.0));

/**
 * Duplicates this Cartesian3 instance.
 *
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
 */
Cartesian3.prototype.clone = function (result) {
  return Cartesian3.clone(this, result);
};

/**
 * Compares this Cartesian against the provided Cartesian componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Cartesian3} [right] The right hand side Cartesian.
 * @returns {boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
Cartesian3.prototype.equals = function (right) {
  return Cartesian3.equals(this, right);
};

/**
 * Compares this Cartesian against the provided Cartesian componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {Cartesian3} [right] The right hand side Cartesian.
 * @param {number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
 * @param {number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
 */
Cartesian3.prototype.equalsEpsilon = function (
  right,
  relativeEpsilon,
  absoluteEpsilon
) {
  return Cartesian3.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};

/**
 * Creates a string representing this Cartesian in the format '(x, y, z)'.
 *
 * @returns {string} A string representing this Cartesian in the format '(x, y, z)'.
 */
Cartesian3.prototype.toString = function () {
  return `(${this.x}, ${this.y}, ${this.z})`;
};
export default Cartesian3;
