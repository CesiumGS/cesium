import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";

/**
 * A set of curvilinear 3-dimensional coordinates.
 *
 * @alias Spherical
 * @constructor
 *
 * @param {number} [clock=0.0] The angular coordinate lying in the xy-plane measured from the positive x-axis and toward the positive y-axis.
 * @param {number} [cone=0.0] The angular coordinate measured from the positive z-axis and toward the negative z-axis.
 * @param {number} [magnitude=1.0] The linear coordinate measured from the origin.
 */
function Spherical(clock, cone, magnitude) {
  /**
   * The clock component.
   * @type {number}
   * @default 0.0
   */
  this.clock = defaultValue(clock, 0.0);
  /**
   * The cone component.
   * @type {number}
   * @default 0.0
   */
  this.cone = defaultValue(cone, 0.0);
  /**
   * The magnitude component.
   * @type {number}
   * @default 1.0
   */
  this.magnitude = defaultValue(magnitude, 1.0);
}

/**
 * Converts the provided Cartesian3 into Spherical coordinates.
 *
 * @param {Cartesian3} cartesian3 The Cartesian3 to be converted to Spherical.
 * @param {Spherical} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Spherical} The modified result parameter, or a new instance if one was not provided.
 */
Spherical.fromCartesian3 = function (cartesian3, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian3", cartesian3);
  //>>includeEnd('debug');

  const x = cartesian3.x;
  const y = cartesian3.y;
  const z = cartesian3.z;
  const radialSquared = x * x + y * y;

  if (!defined(result)) {
    result = new Spherical();
  }

  result.clock = Math.atan2(y, x);
  result.cone = Math.atan2(Math.sqrt(radialSquared), z);
  result.magnitude = Math.sqrt(radialSquared + z * z);
  return result;
};

/**
 * Creates a duplicate of a Spherical.
 *
 * @param {Spherical} spherical The spherical to clone.
 * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
 * @returns {Spherical} The modified result parameter or a new instance if result was undefined. (Returns undefined if spherical is undefined)
 */
Spherical.clone = function (spherical, result) {
  if (!defined(spherical)) {
    return undefined;
  }

  if (!defined(result)) {
    return new Spherical(spherical.clock, spherical.cone, spherical.magnitude);
  }

  result.clock = spherical.clock;
  result.cone = spherical.cone;
  result.magnitude = spherical.magnitude;
  return result;
};

/**
 * Computes the normalized version of the provided spherical.
 *
 * @param {Spherical} spherical The spherical to be normalized.
 * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
 * @returns {Spherical} The modified result parameter or a new instance if result was undefined.
 */
Spherical.normalize = function (spherical, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("spherical", spherical);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Spherical(spherical.clock, spherical.cone, 1.0);
  }

  result.clock = spherical.clock;
  result.cone = spherical.cone;
  result.magnitude = 1.0;
  return result;
};

/**
 * Returns true if the first spherical is equal to the second spherical, false otherwise.
 *
 * @param {Spherical} left The first Spherical to be compared.
 * @param {Spherical} right The second Spherical to be compared.
 * @returns {boolean} true if the first spherical is equal to the second spherical, false otherwise.
 */
Spherical.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.clock === right.clock &&
      left.cone === right.cone &&
      left.magnitude === right.magnitude)
  );
};

/**
 * Returns true if the first spherical is within the provided epsilon of the second spherical, false otherwise.
 *
 * @param {Spherical} left The first Spherical to be compared.
 * @param {Spherical} right The second Spherical to be compared.
 * @param {number} [epsilon=0.0] The epsilon to compare against.
 * @returns {boolean} true if the first spherical is within the provided epsilon of the second spherical, false otherwise.
 */
Spherical.equalsEpsilon = function (left, right, epsilon) {
  epsilon = defaultValue(epsilon, 0.0);
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Math.abs(left.clock - right.clock) <= epsilon &&
      Math.abs(left.cone - right.cone) <= epsilon &&
      Math.abs(left.magnitude - right.magnitude) <= epsilon)
  );
};

/**
 * Returns true if this spherical is equal to the provided spherical, false otherwise.
 *
 * @param {Spherical} other The Spherical to be compared.
 * @returns {boolean} true if this spherical is equal to the provided spherical, false otherwise.
 */
Spherical.prototype.equals = function (other) {
  return Spherical.equals(this, other);
};

/**
 * Creates a duplicate of this Spherical.
 *
 * @param {Spherical} [result] The object to store the result into, if undefined a new instance will be created.
 * @returns {Spherical} The modified result parameter or a new instance if result was undefined.
 */
Spherical.prototype.clone = function (result) {
  return Spherical.clone(this, result);
};

/**
 * Returns true if this spherical is within the provided epsilon of the provided spherical, false otherwise.
 *
 * @param {Spherical} other The Spherical to be compared.
 * @param {number} epsilon The epsilon to compare against.
 * @returns {boolean} true if this spherical is within the provided epsilon of the provided spherical, false otherwise.
 */
Spherical.prototype.equalsEpsilon = function (other, epsilon) {
  return Spherical.equalsEpsilon(this, other, epsilon);
};

/**
 * Returns a string representing this instance in the format (clock, cone, magnitude).
 *
 * @returns {string} A string representing this instance.
 */
Spherical.prototype.toString = function () {
  return `(${this.clock}, ${this.cone}, ${this.magnitude})`;
};
export default Spherical;
