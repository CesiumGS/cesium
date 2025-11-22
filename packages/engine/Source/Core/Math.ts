import MersenneTwister from "mersenne-twister";
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Interface for CesiumMath object
 */
interface CesiumMathInterface {
  // Epsilon constants
  EPSILON1: number;
  EPSILON2: number;
  EPSILON3: number;
  EPSILON4: number;
  EPSILON5: number;
  EPSILON6: number;
  EPSILON7: number;
  EPSILON8: number;
  EPSILON9: number;
  EPSILON10: number;
  EPSILON11: number;
  EPSILON12: number;
  EPSILON13: number;
  EPSILON14: number;
  EPSILON15: number;
  EPSILON16: number;
  EPSILON17: number;
  EPSILON18: number;
  EPSILON19: number;
  EPSILON20: number;
  EPSILON21: number;

  // Physical constants
  GRAVITATIONALPARAMETER: number;
  SOLAR_RADIUS: number;
  LUNAR_RADIUS: number;
  SIXTY_FOUR_KILOBYTES: number;
  FOUR_GIGABYTES: number;

  // Math constants
  PI: number;
  ONE_OVER_PI: number;
  PI_OVER_TWO: number;
  PI_OVER_THREE: number;
  PI_OVER_FOUR: number;
  PI_OVER_SIX: number;
  THREE_PI_OVER_TWO: number;
  TWO_PI: number;
  ONE_OVER_TWO_PI: number;
  RADIANS_PER_DEGREE: number;
  DEGREES_PER_RADIAN: number;
  RADIANS_PER_ARCSECOND: number;

  // Math functions
  sign: (value: number) => number;
  signNotZero: (value: number) => number;
  toSNorm: (value: number, rangeMaximum?: number) => number;
  fromSNorm: (value: number, rangeMaximum?: number) => number;
  normalize: (value: number, rangeMinimum: number, rangeMaximum: number) => number;
  sinh: (value: number) => number;
  cosh: (value: number) => number;
  lerp: (p: number, q: number, time: number) => number;
  toRadians: (degrees: number) => number;
  toDegrees: (radians: number) => number;
  convertLongitudeRange: (angle: number) => number;
  clampToLatitudeRange: (angle: number) => number;
  negativePiToPi: (angle: number) => number;
  zeroToTwoPi: (angle: number) => number;
  mod: (m: number, n: number) => number;
  equalsEpsilon: (left: number, right: number, relativeEpsilon?: number, absoluteEpsilon?: number) => boolean;
  lessThan: (left: number, right: number, absoluteEpsilon: number) => boolean;
  lessThanOrEquals: (left: number, right: number, absoluteEpsilon: number) => boolean;
  greaterThan: (left: number, right: number, absoluteEpsilon: number) => boolean;
  greaterThanOrEquals: (left: number, right: number, absoluteEpsilon: number) => boolean;
  factorial: (n: number) => number;
  incrementWrap: (n: number, maximumValue: number, minimumValue?: number) => number;
  isPowerOfTwo: (n: number) => boolean;
  nextPowerOfTwo: (n: number) => number;
  previousPowerOfTwo: (n: number) => number;
  clamp: (value: number, min: number, max: number) => number;
  setRandomNumberSeed: (seed: number) => void;
  nextRandomNumber: () => number;
  randomBetween: (min: number, max: number) => number;
  acosClamped: (value: number) => number;
  asinClamped: (value: number) => number;
  chordLength: (angle: number, radius: number) => number;
  logBase: (number: number, base: number) => number;
  cbrt: (number: number) => number;
  log2: (number: number) => number;
  fog: (distanceToCamera: number, density: number) => number;
  fastApproximateAtan: (x: number) => number;
  fastApproximateAtan2: (x: number, y: number) => number;
}

const factorials = [1];
let randomNumberGenerator = new MersenneTwister();

/**
 * Math functions.
 *
 * @exports CesiumMath
 * @alias Math
 */
const CesiumMath: CesiumMathInterface = {
  // Epsilon constants
  EPSILON1: 0.1,
  EPSILON2: 0.01,
  EPSILON3: 0.001,
  EPSILON4: 0.0001,
  EPSILON5: 0.00001,
  EPSILON6: 0.000001,
  EPSILON7: 0.0000001,
  EPSILON8: 0.00000001,
  EPSILON9: 0.000000001,
  EPSILON10: 0.0000000001,
  EPSILON11: 0.00000000001,
  EPSILON12: 0.000000000001,
  EPSILON13: 0.0000000000001,
  EPSILON14: 0.00000000000001,
  EPSILON15: 0.000000000000001,
  EPSILON16: 0.0000000000000001,
  EPSILON17: 0.00000000000000001,
  EPSILON18: 0.000000000000000001,
  EPSILON19: 0.0000000000000000001,
  EPSILON20: 0.00000000000000000001,
  EPSILON21: 0.000000000000000000001,

  // Physical constants
  GRAVITATIONALPARAMETER: 3.986004418e14,
  SOLAR_RADIUS: 6.955e8,
  LUNAR_RADIUS: 1737400.0,
  SIXTY_FOUR_KILOBYTES: 64 * 1024,
  FOUR_GIGABYTES: 4 * 1024 * 1024 * 1024,

  // Math constants
  PI: Math.PI,
  ONE_OVER_PI: 1.0 / Math.PI,
  PI_OVER_TWO: Math.PI / 2.0,
  PI_OVER_THREE: Math.PI / 3.0,
  PI_OVER_FOUR: Math.PI / 4.0,
  PI_OVER_SIX: Math.PI / 6.0,
  THREE_PI_OVER_TWO: (3.0 * Math.PI) / 2.0,
  TWO_PI: 2.0 * Math.PI,
  ONE_OVER_TWO_PI: 1.0 / (2.0 * Math.PI),
  RADIANS_PER_DEGREE: Math.PI / 180.0,
  DEGREES_PER_RADIAN: 180.0 / Math.PI,
  RADIANS_PER_ARCSECOND: (Math.PI / 180.0) / 3600.0,

  sign: Math.sign ?? function sign(value: number): number {
    value = +value;
    if (value === 0 || value !== value) {
      return value;
    }
    return value > 0 ? 1 : -1;
  },

  signNotZero: function (value: number): number {
    return value < 0.0 ? -1.0 : 1.0;
  },

  toSNorm: function (value: number, rangeMaximum: number = 255): number {
    return Math.round(
      (CesiumMath.clamp(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum
    );
  },

  fromSNorm: function (value: number, rangeMaximum: number = 255): number {
    return (
      (CesiumMath.clamp(value, 0.0, rangeMaximum) / rangeMaximum) * 2.0 - 1.0
    );
  },

  normalize: function (value: number, rangeMinimum: number, rangeMaximum: number): number {
    rangeMaximum = Math.max(rangeMaximum - rangeMinimum, 0.0);
    return rangeMaximum === 0.0
      ? 0.0
      : CesiumMath.clamp((value - rangeMinimum) / rangeMaximum, 0.0, 1.0);
  },

  sinh: Math.sinh ?? function sinh(value: number): number {
    return (Math.exp(value) - Math.exp(-value)) / 2.0;
  },

  cosh: Math.cosh ?? function cosh(value: number): number {
    return (Math.exp(value) + Math.exp(-value)) / 2.0;
  },

  lerp: function (p: number, q: number, time: number): number {
    return (1.0 - time) * p + time * q;
  },

  toRadians: function (degrees: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(degrees)) {
      throw new DeveloperError("degrees is required.");
    }
    //>>includeEnd('debug');
    return degrees * CesiumMath.RADIANS_PER_DEGREE;
  },

  toDegrees: function (radians: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(radians)) {
      throw new DeveloperError("radians is required.");
    }
    //>>includeEnd('debug');
    return radians * CesiumMath.DEGREES_PER_RADIAN;
  },

  convertLongitudeRange: function (angle: number): number {
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
  },

  clampToLatitudeRange: function (angle: number): number {
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
  },

  negativePiToPi: function (angle: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    //>>includeEnd('debug');
    if (angle >= -CesiumMath.PI && angle <= CesiumMath.PI) {
      return angle;
    }
    return CesiumMath.zeroToTwoPi(angle + CesiumMath.PI) - CesiumMath.PI;
  },

  zeroToTwoPi: function (angle: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    //>>includeEnd('debug');
    if (angle >= 0 && angle <= CesiumMath.TWO_PI) {
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
  },

  mod: function (m: number, n: number): number {
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
      return m;
    }
    return ((m % n) + n) % n;
  },

  equalsEpsilon: function (
    left: number,
    right: number,
    relativeEpsilon: number = 0.0,
    absoluteEpsilon?: number
  ): boolean {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(left)) {
      throw new DeveloperError("left is required.");
    }
    if (!defined(right)) {
      throw new DeveloperError("right is required.");
    }
    //>>includeEnd('debug');
    absoluteEpsilon = absoluteEpsilon ?? relativeEpsilon;
    const absDiff = Math.abs(left - right);
    return (
      absDiff <= absoluteEpsilon ||
      absDiff <= relativeEpsilon * Math.max(Math.abs(left), Math.abs(right))
    );
  },

  lessThan: function (left: number, right: number, absoluteEpsilon: number): boolean {
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
  },

  lessThanOrEquals: function (left: number, right: number, absoluteEpsilon: number): boolean {
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
  },

  greaterThan: function (left: number, right: number, absoluteEpsilon: number): boolean {
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
  },

  greaterThanOrEquals: function (left: number, right: number, absoluteEpsilon: number): boolean {
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
  },

  factorial: function (n: number): number {
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
  },

  incrementWrap: function (n: number, maximumValue: number, minimumValue: number = 0.0): number {
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
  },

  isPowerOfTwo: function (n: number): boolean {
    //>>includeStart('debug', pragmas.debug);
    if (typeof n !== "number" || n < 0 || n > 4294967295) {
      throw new DeveloperError("A number between 0 and (2^32)-1 is required.");
    }
    //>>includeEnd('debug');
    return n !== 0 && (n & (n - 1)) === 0;
  },

  nextPowerOfTwo: function (n: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (typeof n !== "number" || n < 0 || n > 2147483648) {
      throw new DeveloperError("A number between 0 and 2^31 is required.");
    }
    //>>includeEnd('debug');
    --n;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    ++n;
    return n;
  },

  previousPowerOfTwo: function (n: number): number {
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
    n = (n >>> 0) - (n >>> 1);
    return n;
  },

  clamp: function (value: number, min: number, max: number): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("value", value);
    Check.typeOf.number("min", min);
    Check.typeOf.number("max", max);
    //>>includeEnd('debug');
    return value < min ? min : value > max ? max : value;
  },

  setRandomNumberSeed: function (seed: number): void {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(seed)) {
      throw new DeveloperError("seed is required.");
    }
    //>>includeEnd('debug');
    randomNumberGenerator = new MersenneTwister(seed);
  },

  nextRandomNumber: function (): number {
    return randomNumberGenerator.random();
  },

  randomBetween: function (min: number, max: number): number {
    return CesiumMath.nextRandomNumber() * (max - min) + min;
  },

  acosClamped: function (value: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(value)) {
      throw new DeveloperError("value is required.");
    }
    //>>includeEnd('debug');
    return Math.acos(CesiumMath.clamp(value, -1.0, 1.0));
  },

  asinClamped: function (value: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(value)) {
      throw new DeveloperError("value is required.");
    }
    //>>includeEnd('debug');
    return Math.asin(CesiumMath.clamp(value, -1.0, 1.0));
  },

  chordLength: function (angle: number, radius: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(angle)) {
      throw new DeveloperError("angle is required.");
    }
    if (!defined(radius)) {
      throw new DeveloperError("radius is required.");
    }
    //>>includeEnd('debug');
    return 2.0 * radius * Math.sin(angle * 0.5);
  },

  logBase: function (number: number, base: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(number)) {
      throw new DeveloperError("number is required.");
    }
    if (!defined(base)) {
      throw new DeveloperError("base is required.");
    }
    //>>includeEnd('debug');
    return Math.log(number) / Math.log(base);
  },

  cbrt: Math.cbrt ?? function cbrt(number: number): number {
    const result = Math.pow(Math.abs(number), 1.0 / 3.0);
    return number < 0.0 ? -result : result;
  },

  log2: Math.log2 ?? function log2(number: number): number {
    return Math.log(number) * Math.LOG2E;
  },

  fog: function (distanceToCamera: number, density: number): number {
    const scalar = distanceToCamera * density;
    return 1.0 - Math.exp(-(scalar * scalar));
  },

  fastApproximateAtan: function (x: number): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("x", x);
    //>>includeEnd('debug');
    return x * (-0.1784 * Math.abs(x) - 0.0663 * x * x + 1.0301);
  },

  fastApproximateAtan2: function (x: number, y: number): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("x", x);
    Check.typeOf.number("y", y);
    //>>includeEnd('debug');

    let opposite;
    let t = Math.abs(x);
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

    t = Math.abs(y) > Math.abs(x) ? CesiumMath.PI_OVER_TWO - t : t;
    t = x < 0.0 ? CesiumMath.PI - t : t;
    t = y < 0.0 ? -t : t;
    return t;
  },
};

export default CesiumMath;
