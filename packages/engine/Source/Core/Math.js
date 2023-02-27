import MersenneTwister from "mersenne-twister";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Math functions.
 *
 * @exports CesiumMath
 * @alias Math
 */
const CesiumMath = {};

/**
 * 0.1
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON1 = 0.1;

/**
 * 0.01
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON2 = 0.01;

/**
 * 0.001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON3 = 0.001;

/**
 * 0.0001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON4 = 0.0001;

/**
 * 0.00001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON5 = 0.00001;

/**
 * 0.000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON6 = 0.000001;

/**
 * 0.0000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON7 = 0.0000001;

/**
 * 0.00000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON8 = 0.00000001;

/**
 * 0.000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON9 = 0.000000001;

/**
 * 0.0000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON10 = 0.0000000001;

/**
 * 0.00000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON11 = 0.00000000001;

/**
 * 0.000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON12 = 0.000000000001;

/**
 * 0.0000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON13 = 0.0000000000001;

/**
 * 0.00000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON14 = 0.00000000000001;

/**
 * 0.000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON15 = 0.000000000000001;

/**
 * 0.0000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON16 = 0.0000000000000001;

/**
 * 0.00000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON17 = 0.00000000000000001;

/**
 * 0.000000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON18 = 0.000000000000000001;

/**
 * 0.0000000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON19 = 0.0000000000000000001;

/**
 * 0.00000000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON20 = 0.00000000000000000001;

/**
 * 0.000000000000000000001
 * @type {number}
 * @constant
 */
CesiumMath.EPSILON21 = 0.000000000000000000001;

/**
 * The gravitational parameter of the Earth in meters cubed
 * per second squared as defined by the WGS84 model: 3.986004418e14
 * @type {number}
 * @constant
 */
CesiumMath.GRAVITATIONALPARAMETER = 3.986004418e14;

/**
 * Radius of the sun in meters: 6.955e8
 * @type {number}
 * @constant
 */
CesiumMath.SOLAR_RADIUS = 6.955e8;

/**
 * The mean radius of the moon, according to the "Report of the IAU/IAG Working Group on
 * Cartographic Coordinates and Rotational Elements of the Planets and satellites: 2000",
 * Celestial Mechanics 82: 83-110, 2002.
 * @type {number}
 * @constant
 */
CesiumMath.LUNAR_RADIUS = 1737400.0;

/**
 * 64 * 1024
 * @type {number}
 * @constant
 */
CesiumMath.SIXTY_FOUR_KILOBYTES = 64 * 1024;

/**
 * 4 * 1024 * 1024 * 1024
 * @type {number}
 * @constant
 */
CesiumMath.FOUR_GIGABYTES = 4 * 1024 * 1024 * 1024;

/**
 * Returns the sign of the value; 1 if the value is positive, -1 if the value is
 * negative, or 0 if the value is 0.
 *
 * @function
 * @param {number} value The value to return the sign of.
 * @returns {number} The sign of value.
 */
// eslint-disable-next-line es/no-math-sign
CesiumMath.sign = defaultValue(Math.sign, function sign(value) {
  value = +value; // coerce to number
  if (value === 0 || value !== value) {
    // zero or NaN
    return value;
  }
  return value > 0 ? 1 : -1;
});

/**
 * Returns 1.0 if the given value is positive or zero, and -1.0 if it is negative.
 * This is similar to {@link CesiumMath#sign} except that returns 1.0 instead of
 * 0.0 when the input value is 0.0.
 * @param {number} value The value to return the sign of.
 * @returns {number} The sign of value.
 */
CesiumMath.signNotZero = function (value) {
  return value < 0.0 ? -1.0 : 1.0;
};

/**
 * Converts a scalar value in the range [-1.0, 1.0] to a SNORM in the range [0, rangeMaximum]
 * @param {number} value The scalar value in the range [-1.0, 1.0]
 * @param {number} [rangeMaximum=255] The maximum value in the mapped range, 255 by default.
 * @returns {number} A SNORM value, where 0 maps to -1.0 and rangeMaximum maps to 1.0.
 *
 * @see CesiumMath.fromSNorm
 */
CesiumMath.toSNorm = function (value, rangeMaximum) {
  rangeMaximum = defaultValue(rangeMaximum, 255);
  return Math.round(
    (CesiumMath.clamp(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum
  );
};

/**
 * Converts a SNORM value in the range [0, rangeMaximum] to a scalar in the range [-1.0, 1.0].
 * @param {number} value SNORM value in the range [0, rangeMaximum]
 * @param {number} [rangeMaximum=255] The maximum value in the SNORM range, 255 by default.
 * @returns {number} Scalar in the range [-1.0, 1.0].
 *
 * @see CesiumMath.toSNorm
 */
CesiumMath.fromSNorm = function (value, rangeMaximum) {
  rangeMaximum = defaultValue(rangeMaximum, 255);
  return (
    (CesiumMath.clamp(value, 0.0, rangeMaximum) / rangeMaximum) * 2.0 - 1.0
  );
};

/**
 * Converts a scalar value in the range [rangeMinimum, rangeMaximum] to a scalar in the range [0.0, 1.0]
 * @param {number} value The scalar value in the range [rangeMinimum, rangeMaximum]
 * @param {number} rangeMinimum The minimum value in the mapped range.
 * @param {number} rangeMaximum The maximum value in the mapped range.
 * @returns {number} A scalar value, where rangeMinimum maps to 0.0 and rangeMaximum maps to 1.0.
 */
CesiumMath.normalize = function (value, rangeMinimum, rangeMaximum) {
  rangeMaximum = Math.max(rangeMaximum - rangeMinimum, 0.0);
  return rangeMaximum === 0.0
    ? 0.0
    : CesiumMath.clamp((value - rangeMinimum) / rangeMaximum, 0.0, 1.0);
};

/**
 * Returns the hyperbolic sine of a number.
 * The hyperbolic sine of <em>value</em> is defined to be
 * (<em>e<sup>x</sup>&nbsp;-&nbsp;e<sup>-x</sup></em>)/2.0
 * where <i>e</i> is Euler's number, approximately 2.71828183.
 *
 * <p>Special cases:
 *   <ul>
 *     <li>If the argument is NaN, then the result is NaN.</li>
 *
 *     <li>If the argument is infinite, then the result is an infinity
 *     with the same sign as the argument.</li>
 *
 *     <li>If the argument is zero, then the result is a zero with the
 *     same sign as the argument.</li>
 *   </ul>
 *</p>
 *
 * @function
 * @param {number} value The number whose hyperbolic sine is to be returned.
 * @returns {number} The hyperbolic sine of <code>value</code>.
 */
// eslint-disable-next-line es/no-math-sinh
CesiumMath.sinh = defaultValue(Math.sinh, function sinh(value) {
  return (Math.exp(value) - Math.exp(-value)) / 2.0;
});

/**
 * Returns the hyperbolic cosine of a number.
 * The hyperbolic cosine of <strong>value</strong> is defined to be
 * (<em>e<sup>x</sup>&nbsp;+&nbsp;e<sup>-x</sup></em>)/2.0
 * where <i>e</i> is Euler's number, approximately 2.71828183.
 *
 * <p>Special cases:
 *   <ul>
 *     <li>If the argument is NaN, then the result is NaN.</li>
 *
 *     <li>If the argument is infinite, then the result is positive infinity.</li>
 *
 *     <li>If the argument is zero, then the result is 1.0.</li>
 *   </ul>
 *</p>
 *
 * @function
 * @param {number} value The number whose hyperbolic cosine is to be returned.
 * @returns {number} The hyperbolic cosine of <code>value</code>.
 */
// eslint-disable-next-line es/no-math-cosh
CesiumMath.cosh = defaultValue(Math.cosh, function cosh(value) {
  return (Math.exp(value) + Math.exp(-value)) / 2.0;
});

/**
 * Computes the linear interpolation of two values.
 *
 * @param {number} p The start value to interpolate.
 * @param {number} q The end value to interpolate.
 * @param {number} time The time of interpolation generally in the range <code>[0.0, 1.0]</code>.
 * @returns {number} The linearly interpolated value.
 *
 * @example
 * const n = Cesium.Math.lerp(0.0, 2.0, 0.5); // returns 1.0
 */
CesiumMath.lerp = function (p, q, time) {
  return (1.0 - time) * p + time * q;
};

/**
 * pi
 *
 * @type {number}
 * @constant
 */
CesiumMath.PI = Math.PI;

/**
 * 1/pi
 *
 * @type {number}
 * @constant
 */
CesiumMath.ONE_OVER_PI = 1.0 / Math.PI;

/**
 * pi/2
 *
 * @type {number}
 * @constant
 */
CesiumMath.PI_OVER_TWO = Math.PI / 2.0;

/**
 * pi/3
 *
 * @type {number}
 * @constant
 */
CesiumMath.PI_OVER_THREE = Math.PI / 3.0;

/**
 * pi/4
 *
 * @type {number}
 * @constant
 */
CesiumMath.PI_OVER_FOUR = Math.PI / 4.0;

/**
 * pi/6
 *
 * @type {number}
 * @constant
 */
CesiumMath.PI_OVER_SIX = Math.PI / 6.0;

/**
 * 3pi/2
 *
 * @type {number}
 * @constant
 */
CesiumMath.THREE_PI_OVER_TWO = (3.0 * Math.PI) / 2.0;

/**
 * 2pi
 *
 * @type {number}
 * @constant
 */
CesiumMath.TWO_PI = 2.0 * Math.PI;

/**
 * 1/2pi
 *
 * @type {number}
 * @constant
 */
CesiumMath.ONE_OVER_TWO_PI = 1.0 / (2.0 * Math.PI);

/**
 * The number of radians in a degree.
 *
 * @type {number}
 * @constant
 */
CesiumMath.RADIANS_PER_DEGREE = Math.PI / 180.0;

/**
 * The number of degrees in a radian.
 *
 * @type {number}
 * @constant
 */
CesiumMath.DEGREES_PER_RADIAN = 180.0 / Math.PI;

/**
 * The number of radians in an arc second.
 *
 * @type {number}
 * @constant
 */
CesiumMath.RADIANS_PER_ARCSECOND = CesiumMath.RADIANS_PER_DEGREE / 3600.0;

/**
 * Converts degrees to radians.
 * @param {number} degrees The angle to convert in degrees.
 * @returns {number} The corresponding angle in radians.
 */
CesiumMath.toRadians = function (degrees) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(degrees)) {
    throw new DeveloperError("degrees is required.");
  }
  //>>includeEnd('debug');
  return degrees * CesiumMath.RADIANS_PER_DEGREE;
};

/**
 * Converts radians to degrees.
 * @param {number} radians The angle to convert in radians.
 * @returns {number} The corresponding angle in degrees.
 */
CesiumMath.toDegrees = function (radians) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(radians)) {
    throw new DeveloperError("radians is required.");
  }
  //>>includeEnd('debug');
  return radians * CesiumMath.DEGREES_PER_RADIAN;
};

/**
 * Converts a longitude value, in radians, to the range [<code>-Math.PI</code>, <code>Math.PI</code>).
 *
 * @param {number} angle The longitude value, in radians, to convert to the range [<code>-Math.PI</code>, <code>Math.PI</code>).
 * @returns {number} The equivalent longitude value in the range [<code>-Math.PI</code>, <code>Math.PI</code>).
 *
 * @example
 * // Convert 270 degrees to -90 degrees longitude
 * const longitude = Cesium.Math.convertLongitudeRange(Cesium.Math.toRadians(270.0));
 */
CesiumMath.convertLongitudeRange = function (angle) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(angle)) {
    throw new DeveloperError("angle is required.");
  }
  //>>includeEnd('debug');
  const twoPi = CesiumMath.TWO_PI;

  const simplified = angle - Math.floor(angle / twoPi) * twoPi;

  if (simplified < -Math.PI) {
    return simplified + twoPi;
  }
  if (simplified >= Math.PI) {
    return simplified - twoPi;
  }

  return simplified;
};

/**
 * Convenience function that clamps a latitude value, in radians, to the range [<code>-Math.PI/2</code>, <code>Math.PI/2</code>).
 * Useful for sanitizing data before use in objects requiring correct range.
 *
 * @param {number} angle The latitude value, in radians, to clamp to the range [<code>-Math.PI/2</code>, <code>Math.PI/2</code>).
 * @returns {number} The latitude value clamped to the range [<code>-Math.PI/2</code>, <code>Math.PI/2</code>).
 *
 * @example
 * // Clamp 108 degrees latitude to 90 degrees latitude
 * const latitude = Cesium.Math.clampToLatitudeRange(Cesium.Math.toRadians(108.0));
 */
CesiumMath.clampToLatitudeRange = function (angle) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(angle)) {
    throw new DeveloperError("angle is required.");
  }
  //>>includeEnd('debug');

  return CesiumMath.clamp(
    angle,
    -1 * CesiumMath.PI_OVER_TWO,
    CesiumMath.PI_OVER_TWO
  );
};

/**
 * Produces an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
 *
 * @param {number} angle in radians
 * @returns {number} The angle in the range [<code>-CesiumMath.PI</code>, <code>CesiumMath.PI</code>].
 */
CesiumMath.negativePiToPi = function (angle) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(angle)) {
    throw new DeveloperError("angle is required.");
  }
  //>>includeEnd('debug');
  if (angle >= -CesiumMath.PI && angle <= CesiumMath.PI) {
    // Early exit if the input is already inside the range. This avoids
    // unnecessary math which could introduce floating point error.
    return angle;
  }
  return CesiumMath.zeroToTwoPi(angle + CesiumMath.PI) - CesiumMath.PI;
};

/**
 * Produces an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
 *
 * @param {number} angle in radians
 * @returns {number} The angle in the range [0, <code>CesiumMath.TWO_PI</code>].
 */
CesiumMath.zeroToTwoPi = function (angle) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(angle)) {
    throw new DeveloperError("angle is required.");
  }
  //>>includeEnd('debug');
  if (angle >= 0 && angle <= CesiumMath.TWO_PI) {
    // Early exit if the input is already inside the range. This avoids
    // unnecessary math which could introduce floating point error.
    return angle;
  }
  const mod = CesiumMath.mod(angle, CesiumMath.TWO_PI);
  if (
    Math.abs(mod) < CesiumMath.EPSILON14 &&
    Math.abs(angle) > CesiumMath.EPSILON14
  ) {
    return CesiumMath.TWO_PI;
  }
  return mod;
};

/**
 * The modulo operation that also works for negative dividends.
 *
 * @param {number} m The dividend.
 * @param {number} n The divisor.
 * @returns {number} The remainder.
 */
CesiumMath.mod = function (m, n) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(m)) {
    throw new DeveloperError("m is required.");
  }
  if (!defined(n)) {
    throw new DeveloperError("n is required.");
  }
  if (n === 0.0) {
    throw new DeveloperError("divisor cannot be 0.");
  }
  //>>includeEnd('debug');
  if (CesiumMath.sign(m) === CesiumMath.sign(n) && Math.abs(m) < Math.abs(n)) {
    // Early exit if the input does not need to be modded. This avoids
    // unnecessary math which could introduce floating point error.
    return m;
  }

  return ((m % n) + n) % n;
};

/**
 * Determines if two values are equal using an absolute or relative tolerance test. This is useful
 * to avoid problems due to roundoff error when comparing floating-point values directly. The values are
 * first compared using an absolute tolerance test. If that fails, a relative tolerance test is performed.
 * Use this test if you are unsure of the magnitudes of left and right.
 *
 * @param {number} left The first value to compare.
 * @param {number} right The other value to compare.
 * @param {number} [relativeEpsilon=0] The maximum inclusive delta between <code>left</code> and <code>right</code> for the relative tolerance test.
 * @param {number} [absoluteEpsilon=relativeEpsilon] The maximum inclusive delta between <code>left</code> and <code>right</code> for the absolute tolerance test.
 * @returns {boolean} <code>true</code> if the values are equal within the epsilon; otherwise, <code>false</code>.
 *
 * @example
 * const a = Cesium.Math.equalsEpsilon(0.0, 0.01, Cesium.Math.EPSILON2); // true
 * const b = Cesium.Math.equalsEpsilon(0.0, 0.1, Cesium.Math.EPSILON2);  // false
 * const c = Cesium.Math.equalsEpsilon(3699175.1634344, 3699175.2, Cesium.Math.EPSILON7); // true
 * const d = Cesium.Math.equalsEpsilon(3699175.1634344, 3699175.2, Cesium.Math.EPSILON9); // false
 */
CesiumMath.equalsEpsilon = function (
  left,
  right,
  relativeEpsilon,
  absoluteEpsilon
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(left)) {
    throw new DeveloperError("left is required.");
  }
  if (!defined(right)) {
    throw new DeveloperError("right is required.");
  }
  //>>includeEnd('debug');

  relativeEpsilon = defaultValue(relativeEpsilon, 0.0);
  absoluteEpsilon = defaultValue(absoluteEpsilon, relativeEpsilon);
  const absDiff = Math.abs(left - right);
  return (
    absDiff <= absoluteEpsilon ||
    absDiff <= relativeEpsilon * Math.max(Math.abs(left), Math.abs(right))
  );
};

/**
 * Determines if the left value is less than the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns false.
 *
 * @param {number} left The first number to compare.
 * @param {number} right The second number to compare.
 * @param {number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {boolean} <code>true</code> if <code>left</code> is less than <code>right</code> by more than
 *          <code>absoluteEpsilon<code>. <code>false</code> if <code>left</code> is greater or if the two
 *          values are nearly equal.
 */
CesiumMath.lessThan = function (left, right, absoluteEpsilon) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(left)) {
    throw new DeveloperError("first is required.");
  }
  if (!defined(right)) {
    throw new DeveloperError("second is required.");
  }
  if (!defined(absoluteEpsilon)) {
    throw new DeveloperError("absoluteEpsilon is required.");
  }
  //>>includeEnd('debug');
  return left - right < -absoluteEpsilon;
};

/**
 * Determines if the left value is less than or equal to the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns true.
 *
 * @param {number} left The first number to compare.
 * @param {number} right The second number to compare.
 * @param {number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {boolean} <code>true</code> if <code>left</code> is less than <code>right</code> or if the
 *          the values are nearly equal.
 */
CesiumMath.lessThanOrEquals = function (left, right, absoluteEpsilon) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(left)) {
    throw new DeveloperError("first is required.");
  }
  if (!defined(right)) {
    throw new DeveloperError("second is required.");
  }
  if (!defined(absoluteEpsilon)) {
    throw new DeveloperError("absoluteEpsilon is required.");
  }
  //>>includeEnd('debug');
  return left - right < absoluteEpsilon;
};

/**
 * Determines if the left value is greater the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns false.
 *
 * @param {number} left The first number to compare.
 * @param {number} right The second number to compare.
 * @param {number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {boolean} <code>true</code> if <code>left</code> is greater than <code>right</code> by more than
 *          <code>absoluteEpsilon<code>. <code>false</code> if <code>left</code> is less or if the two
 *          values are nearly equal.
 */
CesiumMath.greaterThan = function (left, right, absoluteEpsilon) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(left)) {
    throw new DeveloperError("first is required.");
  }
  if (!defined(right)) {
    throw new DeveloperError("second is required.");
  }
  if (!defined(absoluteEpsilon)) {
    throw new DeveloperError("absoluteEpsilon is required.");
  }
  //>>includeEnd('debug');
  return left - right > absoluteEpsilon;
};

/**
 * Determines if the left value is greater than or equal to the right value. If the two values are within
 * <code>absoluteEpsilon</code> of each other, they are considered equal and this function returns true.
 *
 * @param {number} left The first number to compare.
 * @param {number} right The second number to compare.
 * @param {number} absoluteEpsilon The absolute epsilon to use in comparison.
 * @returns {boolean} <code>true</code> if <code>left</code> is greater than <code>right</code> or if the
 *          the values are nearly equal.
 */
CesiumMath.greaterThanOrEquals = function (left, right, absoluteEpsilon) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(left)) {
    throw new DeveloperError("first is required.");
  }
  if (!defined(right)) {
    throw new DeveloperError("second is required.");
  }
  if (!defined(absoluteEpsilon)) {
    throw new DeveloperError("absoluteEpsilon is required.");
  }
  //>>includeEnd('debug');
  return left - right > -absoluteEpsilon;
};

const factorials = [1];

/**
 * Computes the factorial of the provided number.
 *
 * @param {number} n The number whose factorial is to be computed.
 * @returns {number} The factorial of the provided number or undefined if the number is less than 0.
 *
 * @exception {DeveloperError} A number greater than or equal to 0 is required.
 *
 *
 * @example
 * //Compute 7!, which is equal to 5040
 * const computedFactorial = Cesium.Math.factorial(7);
 *
 * @see {@link http://en.wikipedia.org/wiki/Factorial|Factorial on Wikipedia}
 */
CesiumMath.factorial = function (n) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof n !== "number" || n < 0) {
    throw new DeveloperError(
      "A number greater than or equal to 0 is required."
    );
  }
  //>>includeEnd('debug');

  const length = factorials.length;
  if (n >= length) {
    let sum = factorials[length - 1];
    for (let i = length; i <= n; i++) {
      const next = sum * i;
      factorials.push(next);
      sum = next;
    }
  }
  return factorials[n];
};

/**
 * Increments a number with a wrapping to a minimum value if the number exceeds the maximum value.
 *
 * @param {number} [n] The number to be incremented.
 * @param {number} [maximumValue] The maximum incremented value before rolling over to the minimum value.
 * @param {number} [minimumValue=0.0] The number reset to after the maximum value has been exceeded.
 * @returns {number} The incremented number.
 *
 * @exception {DeveloperError} Maximum value must be greater than minimum value.
 *
 * @example
 * const n = Cesium.Math.incrementWrap(5, 10, 0); // returns 6
 * const m = Cesium.Math.incrementWrap(10, 10, 0); // returns 0
 */
CesiumMath.incrementWrap = function (n, maximumValue, minimumValue) {
  minimumValue = defaultValue(minimumValue, 0.0);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(n)) {
    throw new DeveloperError("n is required.");
  }
  if (maximumValue <= minimumValue) {
    throw new DeveloperError("maximumValue must be greater than minimumValue.");
  }
  //>>includeEnd('debug');

  ++n;
  if (n > maximumValue) {
    n = minimumValue;
  }
  return n;
};

/**
 * Determines if a non-negative integer is a power of two.
 * The maximum allowed input is (2^32)-1 due to 32-bit bitwise operator limitation in Javascript.
 *
 * @param {number} n The integer to test in the range [0, (2^32)-1].
 * @returns {boolean} <code>true</code> if the number if a power of two; otherwise, <code>false</code>.
 *
 * @exception {DeveloperError} A number between 0 and (2^32)-1 is required.
 *
 * @example
 * const t = Cesium.Math.isPowerOfTwo(16); // true
 * const f = Cesium.Math.isPowerOfTwo(20); // false
 */
CesiumMath.isPowerOfTwo = function (n) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof n !== "number" || n < 0 || n > 4294967295) {
    throw new DeveloperError("A number between 0 and (2^32)-1 is required.");
  }
  //>>includeEnd('debug');

  return n !== 0 && (n & (n - 1)) === 0;
};

/**
 * Computes the next power-of-two integer greater than or equal to the provided non-negative integer.
 * The maximum allowed input is 2^31 due to 32-bit bitwise operator limitation in Javascript.
 *
 * @param {number} n The integer to test in the range [0, 2^31].
 * @returns {number} The next power-of-two integer.
 *
 * @exception {DeveloperError} A number between 0 and 2^31 is required.
 *
 * @example
 * const n = Cesium.Math.nextPowerOfTwo(29); // 32
 * const m = Cesium.Math.nextPowerOfTwo(32); // 32
 */
CesiumMath.nextPowerOfTwo = function (n) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof n !== "number" || n < 0 || n > 2147483648) {
    throw new DeveloperError("A number between 0 and 2^31 is required.");
  }
  //>>includeEnd('debug');

  // From http://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
  --n;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  ++n;

  return n;
};

/**
 * Computes the previous power-of-two integer less than or equal to the provided non-negative integer.
 * The maximum allowed input is (2^32)-1 due to 32-bit bitwise operator limitation in Javascript.
 *
 * @param {number} n The integer to test in the range [0, (2^32)-1].
 * @returns {number} The previous power-of-two integer.
 *
 * @exception {DeveloperError} A number between 0 and (2^32)-1 is required.
 *
 * @example
 * const n = Cesium.Math.previousPowerOfTwo(29); // 16
 * const m = Cesium.Math.previousPowerOfTwo(32); // 32
 */
CesiumMath.previousPowerOfTwo = function (n) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof n !== "number" || n < 0 || n > 4294967295) {
    throw new DeveloperError("A number between 0 and (2^32)-1 is required.");
  }
  //>>includeEnd('debug');

  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  n |= n >> 32;

  // The previous bitwise operations implicitly convert to signed 32-bit. Use `>>>` to convert to unsigned
  n = (n >>> 0) - (n >>> 1);

  return n;
};

/**
 * Constraint a value to lie between two values.
 *
 * @param {number} value The value to clamp.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @returns {number} The clamped value such that min <= result <= max.
 */
CesiumMath.clamp = function (value, min, max) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("value", value);
  Check.typeOf.number("min", min);
  Check.typeOf.number("max", max);
  //>>includeEnd('debug');

  return value < min ? min : value > max ? max : value;
};

let randomNumberGenerator = new MersenneTwister();

/**
 * Sets the seed used by the random number generator
 * in {@link CesiumMath#nextRandomNumber}.
 *
 * @param {number} seed An integer used as the seed.
 */
CesiumMath.setRandomNumberSeed = function (seed) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(seed)) {
    throw new DeveloperError("seed is required.");
  }
  //>>includeEnd('debug');

  randomNumberGenerator = new MersenneTwister(seed);
};

/**
 * Generates a random floating point number in the range of [0.0, 1.0)
 * using a Mersenne twister.
 *
 * @returns {number} A random number in the range of [0.0, 1.0).
 *
 * @see CesiumMath.setRandomNumberSeed
 * @see {@link http://en.wikipedia.org/wiki/Mersenne_twister|Mersenne twister on Wikipedia}
 */
CesiumMath.nextRandomNumber = function () {
  return randomNumberGenerator.random();
};

/**
 * Generates a random number between two numbers.
 *
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @returns {number} A random number between the min and max.
 */
CesiumMath.randomBetween = function (min, max) {
  return CesiumMath.nextRandomNumber() * (max - min) + min;
};

/**
 * Computes <code>Math.acos(value)</code>, but first clamps <code>value</code> to the range [-1.0, 1.0]
 * so that the function will never return NaN.
 *
 * @param {number} value The value for which to compute acos.
 * @returns {number} The acos of the value if the value is in the range [-1.0, 1.0], or the acos of -1.0 or 1.0,
 *          whichever is closer, if the value is outside the range.
 */
CesiumMath.acosClamped = function (value) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required.");
  }
  //>>includeEnd('debug');
  return Math.acos(CesiumMath.clamp(value, -1.0, 1.0));
};

/**
 * Computes <code>Math.asin(value)</code>, but first clamps <code>value</code> to the range [-1.0, 1.0]
 * so that the function will never return NaN.
 *
 * @param {number} value The value for which to compute asin.
 * @returns {number} The asin of the value if the value is in the range [-1.0, 1.0], or the asin of -1.0 or 1.0,
 *          whichever is closer, if the value is outside the range.
 */
CesiumMath.asinClamped = function (value) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required.");
  }
  //>>includeEnd('debug');
  return Math.asin(CesiumMath.clamp(value, -1.0, 1.0));
};

/**
 * Finds the chord length between two points given the circle's radius and the angle between the points.
 *
 * @param {number} angle The angle between the two points.
 * @param {number} radius The radius of the circle.
 * @returns {number} The chord length.
 */
CesiumMath.chordLength = function (angle, radius) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(angle)) {
    throw new DeveloperError("angle is required.");
  }
  if (!defined(radius)) {
    throw new DeveloperError("radius is required.");
  }
  //>>includeEnd('debug');
  return 2.0 * radius * Math.sin(angle * 0.5);
};

/**
 * Finds the logarithm of a number to a base.
 *
 * @param {number} number The number.
 * @param {number} base The base.
 * @returns {number} The result.
 */
CesiumMath.logBase = function (number, base) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(number)) {
    throw new DeveloperError("number is required.");
  }
  if (!defined(base)) {
    throw new DeveloperError("base is required.");
  }
  //>>includeEnd('debug');
  return Math.log(number) / Math.log(base);
};

/**
 * Finds the cube root of a number.
 * Returns NaN if <code>number</code> is not provided.
 *
 * @function
 * @param {number} [number] The number.
 * @returns {number} The result.
 */
// eslint-disable-next-line es/no-math-cbrt
CesiumMath.cbrt = defaultValue(Math.cbrt, function cbrt(number) {
  const result = Math.pow(Math.abs(number), 1.0 / 3.0);
  return number < 0.0 ? -result : result;
});

/**
 * Finds the base 2 logarithm of a number.
 *
 * @function
 * @param {number} number The number.
 * @returns {number} The result.
 */
// eslint-disable-next-line es/no-math-log2
CesiumMath.log2 = defaultValue(Math.log2, function log2(number) {
  return Math.log(number) * Math.LOG2E;
});

/**
 * @private
 */
CesiumMath.fog = function (distanceToCamera, density) {
  const scalar = distanceToCamera * density;
  return 1.0 - Math.exp(-(scalar * scalar));
};

/**
 * Computes a fast approximation of Atan for input in the range [-1, 1].
 *
 * Based on Michal Drobot's approximation from ShaderFastLibs,
 * which in turn is based on "Efficient approximations for the arctangent function,"
 * Rajan, S. Sichun Wang Inkol, R. Joyal, A., May 2006.
 * Adapted from ShaderFastLibs under MIT License.
 *
 * @param {number} x An input number in the range [-1, 1]
 * @returns {number} An approximation of atan(x)
 */
CesiumMath.fastApproximateAtan = function (x) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("x", x);
  //>>includeEnd('debug');

  return x * (-0.1784 * Math.abs(x) - 0.0663 * x * x + 1.0301);
};

/**
 * Computes a fast approximation of Atan2(x, y) for arbitrary input scalars.
 *
 * Range reduction math based on nvidia's cg reference implementation: http://developer.download.nvidia.com/cg/atan2.html
 *
 * @param {number} x An input number that isn't zero if y is zero.
 * @param {number} y An input number that isn't zero if x is zero.
 * @returns {number} An approximation of atan2(x, y)
 */
CesiumMath.fastApproximateAtan2 = function (x, y) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  //>>includeEnd('debug');

  // atan approximations are usually only reliable over [-1, 1]
  // So reduce the range by flipping whether x or y is on top based on which is bigger.
  let opposite;
  let t = Math.abs(x); // t used as swap and atan result.
  opposite = Math.abs(y);
  const adjacent = Math.max(t, opposite);
  opposite = Math.min(t, opposite);

  const oppositeOverAdjacent = opposite / adjacent;
  //>>includeStart('debug', pragmas.debug);
  if (isNaN(oppositeOverAdjacent)) {
    throw new DeveloperError("either x or y must be nonzero");
  }
  //>>includeEnd('debug');
  t = CesiumMath.fastApproximateAtan(oppositeOverAdjacent);

  // Undo range reduction
  t = Math.abs(y) > Math.abs(x) ? CesiumMath.PI_OVER_TWO - t : t;
  t = x < 0.0 ? CesiumMath.PI - t : t;
  t = y < 0.0 ? -t : t;
  return t;
};
export default CesiumMath;
