import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * A rotation expressed as a heading, pitch, and roll. Heading is the rotation about the
 * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
 * the positive x axis.
 * @alias HeadingPitchRoll
 * @constructor
 *
 * @param {Number} [heading=0.0] The heading component in radians.
 * @param {Number} [pitch=0.0] The pitch component in radians.
 * @param {Number} [roll=0.0] The roll component in radians.
 */
function HeadingPitchRoll(heading, pitch, roll) {
  /**
   * Gets or sets the heading.
   * @type {Number}
   * @default 0.0
   */
  this.heading = defaultValue(heading, 0.0);
  /**
   * Gets or sets the pitch.
   * @type {Number}
   * @default 0.0
   */
  this.pitch = defaultValue(pitch, 0.0);
  /**
   * Gets or sets the roll.
   * @type {Number}
   * @default 0.0
   */
  this.roll = defaultValue(roll, 0.0);
}

/**
 * Computes the heading, pitch and roll from a quaternion (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
 *
 * @param {Quaternion} quaternion The quaternion from which to retrieve heading, pitch, and roll, all expressed in radians.
 * @param {HeadingPitchRoll} [result] The object in which to store the result. If not provided, a new instance is created and returned.
 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided.
 */
HeadingPitchRoll.fromQuaternion = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(quaternion)) {
    throw new DeveloperError("quaternion is required");
  }
  //>>includeEnd('debug');
  if (!defined(result)) {
    result = new HeadingPitchRoll();
  }
  const test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x);
  const denominatorRoll =
    1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y);
  const numeratorRoll =
    2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z);
  const denominatorHeading =
    1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z);
  const numeratorHeading =
    2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y);
  result.heading = -Math.atan2(numeratorHeading, denominatorHeading);
  result.roll = Math.atan2(numeratorRoll, denominatorRoll);
  result.pitch = -CesiumMath.asinClamped(test);
  return result;
};

/**
 * Returns a new HeadingPitchRoll instance from angles given in degrees.
 *
 * @param {Number} heading the heading in degrees
 * @param {Number} pitch the pitch in degrees
 * @param {Number} roll the heading in degrees
 * @param {HeadingPitchRoll} [result] The object in which to store the result. If not provided, a new instance is created and returned.
 * @returns {HeadingPitchRoll} A new HeadingPitchRoll instance
 */
HeadingPitchRoll.fromDegrees = function (heading, pitch, roll, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(heading)) {
    throw new DeveloperError("heading is required");
  }
  if (!defined(pitch)) {
    throw new DeveloperError("pitch is required");
  }
  if (!defined(roll)) {
    throw new DeveloperError("roll is required");
  }
  //>>includeEnd('debug');
  if (!defined(result)) {
    result = new HeadingPitchRoll();
  }
  result.heading = heading * CesiumMath.RADIANS_PER_DEGREE;
  result.pitch = pitch * CesiumMath.RADIANS_PER_DEGREE;
  result.roll = roll * CesiumMath.RADIANS_PER_DEGREE;
  return result;
};

/**
 * Duplicates a HeadingPitchRoll instance.
 *
 * @param {HeadingPitchRoll} headingPitchRoll The HeadingPitchRoll to duplicate.
 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided. (Returns undefined if headingPitchRoll is undefined)
 */
HeadingPitchRoll.clone = function (headingPitchRoll, result) {
  if (!defined(headingPitchRoll)) {
    return undefined;
  }
  if (!defined(result)) {
    return new HeadingPitchRoll(
      headingPitchRoll.heading,
      headingPitchRoll.pitch,
      headingPitchRoll.roll
    );
  }
  result.heading = headingPitchRoll.heading;
  result.pitch = headingPitchRoll.pitch;
  result.roll = headingPitchRoll.roll;
  return result;
};

/**
 * Compares the provided HeadingPitchRolls componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {HeadingPitchRoll} [left] The first HeadingPitchRoll.
 * @param {HeadingPitchRoll} [right] The second HeadingPitchRoll.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
HeadingPitchRoll.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.heading === right.heading &&
      left.pitch === right.pitch &&
      left.roll === right.roll)
  );
};

/**
 * Compares the provided HeadingPitchRolls componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {HeadingPitchRoll} [left] The first HeadingPitchRoll.
 * @param {HeadingPitchRoll} [right] The second HeadingPitchRoll.
 * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
 * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
HeadingPitchRoll.equalsEpsilon = function (
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
        left.heading,
        right.heading,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      CesiumMath.equalsEpsilon(
        left.pitch,
        right.pitch,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      CesiumMath.equalsEpsilon(
        left.roll,
        right.roll,
        relativeEpsilon,
        absoluteEpsilon
      ))
  );
};

/**
 * Duplicates this HeadingPitchRoll instance.
 *
 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided.
 */
HeadingPitchRoll.prototype.clone = function (result) {
  return HeadingPitchRoll.clone(this, result);
};

/**
 * Compares this HeadingPitchRoll against the provided HeadingPitchRoll componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {HeadingPitchRoll} [right] The right hand side HeadingPitchRoll.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
HeadingPitchRoll.prototype.equals = function (right) {
  return HeadingPitchRoll.equals(this, right);
};

/**
 * Compares this HeadingPitchRoll against the provided HeadingPitchRoll componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {HeadingPitchRoll} [right] The right hand side HeadingPitchRoll.
 * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
 * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
 * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
 */
HeadingPitchRoll.prototype.equalsEpsilon = function (
  right,
  relativeEpsilon,
  absoluteEpsilon
) {
  return HeadingPitchRoll.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};

/**
 * Creates a string representing this HeadingPitchRoll in the format '(heading, pitch, roll)' in radians.
 *
 * @returns {String} A string representing the provided HeadingPitchRoll in the format '(heading, pitch, roll)'.
 */
HeadingPitchRoll.prototype.toString = function () {
  return `(${this.heading}, ${this.pitch}, ${this.roll})`;
};
export default HeadingPitchRoll;
