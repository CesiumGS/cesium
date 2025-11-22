import MersenneTwister from "mersenne-twister";
import { Check } from "./Check.js";
import { defined } from "./defined.js";
import { DeveloperError } from "./DeveloperError.js";

/**
 * Math functions for Cesium.
 */
export namespace CesiumMath {
  /** 0.1 */
  export const EPSILON1 = 0.1;
  /** 0.01 */
  export const EPSILON2 = 0.01;
  /** 0.001 */
  export const EPSILON3 = 0.001;
  /** 0.0001 */
  export const EPSILON4 = 0.0001;
  /** 0.00001 */
  export const EPSILON5 = 0.00001;
  /** 0.000001 */
  export const EPSILON6 = 0.000001;
  /** 0.0000001 */
  export const EPSILON7 = 0.0000001;
  /** 0.00000001 */
  export const EPSILON8 = 0.00000001;
  /** 0.000000001 */
  export const EPSILON9 = 0.000000001;
  /** 0.0000000001 */
  export const EPSILON10 = 0.0000000001;
  /** 0.00000000001 */
  export const EPSILON11 = 0.00000000001;
  /** 0.000000000001 */
  export const EPSILON12 = 0.000000000001;
  /** 0.0000000000001 */
  export const EPSILON13 = 0.0000000000001;
  /** 0.00000000000001 */
  export const EPSILON14 = 0.00000000000001;
  /** 0.000000000000001 */
  export const EPSILON15 = 0.000000000000001;
  /** 0.0000000000000001 */
  export const EPSILON16 = 0.0000000000000001;
  /** 0.00000000000000001 */
  export const EPSILON17 = 0.00000000000000001;
  /** 0.000000000000000001 */
  export const EPSILON18 = 0.000000000000000001;
  /** 0.0000000000000000001 */
  export const EPSILON19 = 0.0000000000000000001;
  /** 0.00000000000000000001 */
  export const EPSILON20 = 0.00000000000000000001;
  /** 0.000000000000000000001 */
  export const EPSILON21 = 0.000000000000000000001;

  /** The gravitational parameter of the Earth in meters cubed per second squared (WGS84): 3.986004418e14 */
  export const GRAVITATIONALPARAMETER = 3.986004418e14;

  /** Radius of the sun in meters: 6.955e8 */
  export const SOLAR_RADIUS = 6.955e8;

  /** The mean radius of the moon in meters: 1737400.0 */
  export const LUNAR_RADIUS = 1737400.0;

  /** 64 * 1024 */
  export const SIXTY_FOUR_KILOBYTES = 64 * 1024;

  /** 4 * 1024 * 1024 * 1024 */
  export const FOUR_GIGABYTES = 4 * 1024 * 1024 * 1024;

  /** pi */
  export const PI = Math.PI;

  /** 1/pi */
  export const ONE_OVER_PI = 1.0 / Math.PI;

  /** pi/2 */
  export const PI_OVER_TWO = Math.PI / 2.0;

  /** pi/3 */
  export const PI_OVER_THREE = Math.PI / 3.0;

  /** pi/4 */
  export const PI_OVER_FOUR = Math.PI / 4.0;

  /** pi/6 */
  export const PI_OVER_SIX = Math.PI / 6.0;

  /** 3pi/2 */
  export const THREE_PI_OVER_TWO = (3.0 * Math.PI) / 2.0;

  /** 2pi */
  export const TWO_PI = 2.0 * Math.PI;

  /** 1/2pi */
  export const ONE_OVER_TWO_PI = 1.0 / (2.0 * Math.PI);

  /** The number of radians in a degree */
  export const RADIANS_PER_DEGREE = Math.PI / 180.0;

  /** The number of degrees in a radian */
  export const DEGREES_PER_RADIAN = 180.0 / Math.PI;

  /** The number of radians in an arc second */
  export const RADIANS_PER_ARCSECOND = RADIANS_PER_DEGREE / 3600.0;

  /**
   * Returns the sign of the value; 1 if positive, -1 if negative, or 0 if zero.
   * @param value - The value to return the sign of.
   * @returns The sign of value.
   */
  export const sign = Math.sign;

  /**
   * Returns 1.0 if the given value is positive or zero, and -1.0 if negative.
   * @param value - The value to return the sign of.
   * @returns The sign of value.
   */
  export function signNotZero(value: number): number {
    return value < 0.0 ? -1.0 : 1.0;
  }

  /**
   * Converts a scalar value in the range [-1.0, 1.0] to a SNORM in the range [0, rangeMaximum].
   * @param value - The scalar value in the range [-1.0, 1.0].
   * @param rangeMaximum - The maximum value in the mapped range, 255 by default.
   * @returns A SNORM value.
   */
  export function toSNorm(value: number, rangeMaximum: number = 255): number {
    return Math.round((clamp(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum);
  }

  /**
   * Converts a SNORM value in the range [0, rangeMaximum] to a scalar in the range [-1.0, 1.0].
   * @param value - SNORM value in the range [0, rangeMaximum].
   * @param rangeMaximum - The maximum value in the SNORM range, 255 by default.
   * @returns Scalar in the range [-1.0, 1.0].
   */
  export function fromSNorm(value: number, rangeMaximum: number = 255): number {
    return (clamp(value, 0.0, rangeMaximum) / rangeMaximum) * 2.0 - 1.0;
  }

  /**
   * Converts a scalar value in the range [rangeMinimum, rangeMaximum] to [0.0, 1.0].
   * @param value - The scalar value in the range [rangeMinimum, rangeMaximum].
   * @param rangeMinimum - The minimum value in the mapped range.
   * @param rangeMaximum - The maximum value in the mapped range.
   * @returns A scalar value in the range [0.0, 1.0].
   */
  export function normalize(
    value: number,
    rangeMinimum: number,
    rangeMaximum: number
  ): number {
    const range = Math.max(rangeMaximum - rangeMinimum, 0.0);
    return range === 0.0 ? 0.0 : clamp((value - rangeMinimum) / range, 0.0, 1.0);
  }

  /** Returns the hyperbolic sine of a number. */
  export const sinh = Math.sinh;

  /** Returns the hyperbolic cosine of a number. */
  export const cosh = Math.cosh;

  /**
   * Computes the linear interpolation of two values.
   * @param p - The start value to interpolate.
   * @param q - The end value to interpolate.
   * @param time - The time of interpolation generally in the range [0.0, 1.0].
   * @returns The linearly interpolated value.
   */
  export function lerp(p: number, q: number, time: number): number {
    return (1.0 - time) * p + time * q;
  }

  /**
   * Converts degrees to radians.
   * @param degrees - The angle to convert in degrees.
   * @returns The corresponding angle in radians.
   */
  export function toRadians(degrees: number): number {
    if (!defined(degrees)) {
      throw new DeveloperError("degrees is required.");
    }
    return degrees * RADIANS_PER_DEGREE;
  }

  /**
   * Converts radians to degrees.
   * @param radians - The angle to convert in radians.
   * @returns The corresponding angle in degrees.
   */
  export function toDegrees(radians: number): number {
    if (!defined(radians)) {
      throw new DeveloperError("radians is required.");
    }
    return radians * DEGREES_PER_RADIAN;
  }

  /**
   * Converts a longitude value, in radians, to the range [-Math.PI, Math.PI).
   * @param angle - The longitude value, in radians.
   * @returns The equivalent longitude value in the range [-Math.PI, Math.PI).
   */
  export function convertLongitudeRange(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    const twoPi = TWO_PI;
    const simplified = angle - Math.floor(angle / twoPi) * twoPi;

    if (simplified < -Math.PI) {
      return simplified + twoPi;
    }
    if (simplified >= Math.PI) {
      return simplified - twoPi;
    }
    return simplified;
  }

  /**
   * Clamps a latitude value, in radians, to the range [-Math.PI/2, Math.PI/2).
   * @param angle - The latitude value, in radians.
   * @returns The latitude value clamped to the range [-Math.PI/2, Math.PI/2).
   */
  export function clampToLatitudeRange(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    return clamp(angle, -1 * PI_OVER_TWO, PI_OVER_TWO);
  }

  /**
   * Produces an angle in the range -Pi <= angle <= Pi equivalent to the provided angle.
   * @param angle - in radians.
   * @returns The angle in the range [-CesiumMath.PI, CesiumMath.PI].
   */
  export function negativePiToPi(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    if (angle >= -PI && angle <= PI) {
      return angle;
    }
    return zeroToTwoPi(angle + PI) - PI;
  }

  /**
   * Produces an angle in the range 0 <= angle <= 2Pi equivalent to the provided angle.
   * @param angle - in radians.
   * @returns The angle in the range [0, CesiumMath.TWO_PI].
   */
  export function zeroToTwoPi(angle: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    if (angle >= 0 && angle <= TWO_PI) {
      return angle;
    }
    const modResult = mod(angle, TWO_PI);
    if (Math.abs(modResult) < EPSILON14 && Math.abs(angle) > EPSILON14) {
      return TWO_PI;
    }
    return modResult;
  }

  /**
   * The modulo operation that also works for negative dividends.
   * @param m - The dividend.
   * @param n - The divisor.
   * @returns The remainder.
   */
  export function mod(m: number, n: number): number {
    if (!defined(m)) {
      throw new DeveloperError("m is required.");
    }
    if (!defined(n)) {
      throw new DeveloperError("n is required.");
    }
    if (n === 0.0) {
      throw new DeveloperError("divisor cannot be 0.");
    }
    if (sign(m) === sign(n) && Math.abs(m) < Math.abs(n)) {
      return m;
    }
    return ((m % n) + n) % n;
  }

  /**
   * Determines if two values are equal using an absolute or relative tolerance test.
   * @param left - The first value to compare.
   * @param right - The other value to compare.
   * @param relativeEpsilon - The maximum inclusive delta for relative tolerance test.
   * @param absoluteEpsilon - The maximum inclusive delta for absolute tolerance test.
   * @returns true if the values are equal within the epsilon.
   */
  export function equalsEpsilon(
    left: number,
    right: number,
    relativeEpsilon: number = 0.0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    if (!defined(left)) {
      throw new DeveloperError("left is required.");
    }
    if (!defined(right)) {
      throw new DeveloperError("right is required.");
    }
    const absDiff = Math.abs(left - right);
    return (
      absDiff <= absoluteEpsilon ||
      absDiff <= relativeEpsilon * Math.max(Math.abs(left), Math.abs(right))
    );
  }

  /**
   * Determines if left is less than right by more than absoluteEpsilon.
   * @param left - The first number to compare.
   * @param right - The second number to compare.
   * @param absoluteEpsilon - The absolute epsilon to use in comparison.
   * @returns true if left is less than right by more than absoluteEpsilon.
   */
  export function lessThan(
    left: number,
    right: number,
    absoluteEpsilon: number
  ): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.");
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.");
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.");
    }
    return left - right < -absoluteEpsilon;
  }

  /**
   * Determines if left is less than or equal to right within absoluteEpsilon.
   * @param left - The first number to compare.
   * @param right - The second number to compare.
   * @param absoluteEpsilon - The absolute epsilon to use in comparison.
   * @returns true if left is less than or nearly equal to right.
   */
  export function lessThanOrEquals(
    left: number,
    right: number,
    absoluteEpsilon: number
  ): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.");
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.");
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.");
    }
    return left - right < absoluteEpsilon;
  }

  /**
   * Determines if left is greater than right by more than absoluteEpsilon.
   * @param left - The first number to compare.
   * @param right - The second number to compare.
   * @param absoluteEpsilon - The absolute epsilon to use in comparison.
   * @returns true if left is greater than right by more than absoluteEpsilon.
   */
  export function greaterThan(
    left: number,
    right: number,
    absoluteEpsilon: number
  ): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.");
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.");
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.");
    }
    return left - right > absoluteEpsilon;
  }

  /**
   * Determines if left is greater than or equal to right within absoluteEpsilon.
   * @param left - The first number to compare.
   * @param right - The second number to compare.
   * @param absoluteEpsilon - The absolute epsilon to use in comparison.
   * @returns true if left is greater than or nearly equal to right.
   */
  export function greaterThanOrEquals(
    left: number,
    right: number,
    absoluteEpsilon: number
  ): boolean {
    if (!defined(left)) {
      throw new DeveloperError("first is required.");
    }
    if (!defined(right)) {
      throw new DeveloperError("second is required.");
    }
    if (!defined(absoluteEpsilon)) {
      throw new DeveloperError("absoluteEpsilon is required.");
    }
    return left - right > -absoluteEpsilon;
  }

  const factorials: number[] = [1];

  /**
   * Computes the factorial of the provided number.
   * @param n - The number whose factorial is to be computed.
   * @returns The factorial of the provided number.
   */
  export function factorial(n: number): number {
    if (typeof n !== "number" || n < 0) {
      throw new DeveloperError(
        "A number greater than or equal to 0 is required."
      );
    }

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
  }

  /**
   * Increments a number with a wrapping to a minimum value if the number exceeds the maximum value.
   * @param n - The number to be incremented.
   * @param maximumValue - The maximum incremented value before rolling over.
   * @param minimumValue - The number reset to after the maximum value has been exceeded.
   * @returns The incremented number.
   */
  export function incrementWrap(
    n: number,
    maximumValue: number,
    minimumValue: number = 0.0
  ): number {
    if (!defined(n)) {
      throw new DeveloperError("n is required.");
    }
    if (maximumValue <= minimumValue) {
      throw new DeveloperError("maximumValue must be greater than minimumValue.");
    }

    ++n;
    if (n > maximumValue) {
      n = minimumValue;
    }
    return n;
  }

  /**
   * Determines if a non-negative integer is a power of two.
   * @param n - The integer to test in the range [0, (2^32)-1].
   * @returns true if the number if a power of two.
   */
  export function isPowerOfTwo(n: number): boolean {
    if (typeof n !== "number" || n < 0 || n > 4294967295) {
      throw new DeveloperError("A number between 0 and (2^32)-1 is required.");
    }
    return n !== 0 && (n & (n - 1)) === 0;
  }

  /**
   * Computes the next power-of-two integer greater than or equal to the provided non-negative integer.
   * @param n - The integer to test in the range [0, 2^31].
   * @returns The next power-of-two integer.
   */
  export function nextPowerOfTwo(n: number): number {
    if (typeof n !== "number" || n < 0 || n > 2147483648) {
      throw new DeveloperError("A number between 0 and 2^31 is required.");
    }

    --n;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    ++n;

    return n;
  }

  /**
   * Computes the previous power-of-two integer less than or equal to the provided non-negative integer.
   * @param n - The integer to test in the range [0, (2^32)-1].
   * @returns The previous power-of-two integer.
   */
  export function previousPowerOfTwo(n: number): number {
    if (typeof n !== "number" || n < 0 || n > 4294967295) {
      throw new DeveloperError("A number between 0 and (2^32)-1 is required.");
    }

    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    n |= n >> 32;

    n = (n >>> 0) - (n >>> 1);

    return n;
  }

  /**
   * Constraint a value to lie between two values.
   * @param value - The value to clamp.
   * @param min - The minimum value.
   * @param max - The maximum value.
   * @returns The clamped value such that min <= result <= max.
   */
  export function clamp(value: number, min: number, max: number): number {
    Check.typeOf.number("value", value);
    Check.typeOf.number("min", min);
    Check.typeOf.number("max", max);
    return value < min ? min : value > max ? max : value;
  }

  let randomNumberGenerator = new MersenneTwister();

  /**
   * Sets the seed used by the random number generator.
   * @param seed - An integer used as the seed.
   */
  export function setRandomNumberSeed(seed: number): void {
    if (!defined(seed)) {
      throw new DeveloperError("seed is required.");
    }
    randomNumberGenerator = new MersenneTwister(seed);
  }

  /**
   * Generates a random floating point number in the range of [0.0, 1.0) using a Mersenne twister.
   * @returns A random number in the range of [0.0, 1.0).
   */
  export function nextRandomNumber(): number {
    return randomNumberGenerator.random();
  }

  /**
   * Generates a random number between two numbers.
   * @param min - The minimum value.
   * @param max - The maximum value.
   * @returns A random number between the min and max.
   */
  export function randomBetween(min: number, max: number): number {
    return nextRandomNumber() * (max - min) + min;
  }

  /**
   * Computes Math.acos(value), but first clamps value to [-1.0, 1.0].
   * @param value - The value for which to compute acos.
   * @returns The acos of the value.
   */
  export function acosClamped(value: number): number {
    if (!defined(value)) {
      throw new DeveloperError("value is required.");
    }
    return Math.acos(clamp(value, -1.0, 1.0));
  }

  /**
   * Computes Math.asin(value), but first clamps value to [-1.0, 1.0].
   * @param value - The value for which to compute asin.
   * @returns The asin of the value.
   */
  export function asinClamped(value: number): number {
    if (!defined(value)) {
      throw new DeveloperError("value is required.");
    }
    return Math.asin(clamp(value, -1.0, 1.0));
  }

  /**
   * Finds the chord length between two points given the circle's radius and the angle between the points.
   * @param angle - The angle between the two points.
   * @param radius - The radius of the circle.
   * @returns The chord length.
   */
  export function chordLength(angle: number, radius: number): number {
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    if (!defined(radius)) {
      throw new DeveloperError("radius is required.");
    }
    return 2.0 * radius * Math.sin(angle * 0.5);
  }

  /**
   * Finds the logarithm of a number to a base.
   * @param number - The number.
   * @param base - The base.
   * @returns The result.
   */
  export function logBase(number: number, base: number): number {
    if (!defined(number)) {
      throw new DeveloperError("number is required.");
    }
    if (!defined(base)) {
      throw new DeveloperError("base is required.");
    }
    return Math.log(number) / Math.log(base);
  }

  /** Finds the cube root of a number. */
  export const cbrt = Math.cbrt;

  /** Finds the base 2 logarithm of a number. */
  export const log2 = Math.log2;

  /**
   * Calculate the fog impact at a given distance.
   * @internal
   */
  export function fog(distanceToCamera: number, density: number): number {
    const scalar = distanceToCamera * density;
    return 1.0 - Math.exp(-(scalar * scalar));
  }

  /**
   * Computes a fast approximation of Atan for input in the range [-1, 1].
   * @param x - An input number in the range [-1, 1].
   * @returns An approximation of atan(x).
   */
  export function fastApproximateAtan(x: number): number {
    Check.typeOf.number("x", x);
    return x * (-0.1784 * Math.abs(x) - 0.0663 * x * x + 1.0301);
  }

  /**
   * Computes a fast approximation of Atan2(x, y) for arbitrary input scalars.
   * @param x - An input number that isn't zero if y is zero.
   * @param y - An input number that isn't zero if x is zero.
   * @returns An approximation of atan2(x, y).
   */
  export function fastApproximateAtan2(x: number, y: number): number {
    Check.typeOf.number("x", x);
    Check.typeOf.number("y", y);

    let opposite: number;
    let t = Math.abs(x);
    opposite = Math.abs(y);
    const adjacent = Math.max(t, opposite);
    opposite = Math.min(t, opposite);

    const oppositeOverAdjacent = opposite / adjacent;
    if (isNaN(oppositeOverAdjacent)) {
      throw new DeveloperError("either x or y must be nonzero");
    }
    t = fastApproximateAtan(oppositeOverAdjacent);

    t = Math.abs(y) > Math.abs(x) ? PI_OVER_TWO - t : t;
    t = x < 0.0 ? PI - t : t;
    t = y < 0.0 ? -t : t;
    return t;
  }
}

export default CesiumMath;
