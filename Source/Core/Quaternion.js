import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import FeatureDetection from "./FeatureDetection.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";

/**
 * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
 * @alias Quaternion
 * @constructor
 *
 * @param {Number} [x=0.0] The X component.
 * @param {Number} [y=0.0] The Y component.
 * @param {Number} [z=0.0] The Z component.
 * @param {Number} [w=0.0] The W component.
 *
 * @see PackableForInterpolation
 */
function Quaternion(x, y, z, w) {
  /**
   * The X component.
   * @type {Number}
   * @default 0.0
   */
  this.x = defaultValue(x, 0.0);

  /**
   * The Y component.
   * @type {Number}
   * @default 0.0
   */
  this.y = defaultValue(y, 0.0);

  /**
   * The Z component.
   * @type {Number}
   * @default 0.0
   */
  this.z = defaultValue(z, 0.0);

  /**
   * The W component.
   * @type {Number}
   * @default 0.0
   */
  this.w = defaultValue(w, 0.0);
}

let fromAxisAngleScratch = new Cartesian3();

/**
 * Computes a quaternion representing a rotation around an axis.
 *
 * @param {Cartesian3} axis The axis of rotation.
 * @param {Number} angle The angle in radians to rotate around the axis.
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
 */
Quaternion.fromAxisAngle = function (axis, angle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("axis", axis);
  Check.typeOf.number("angle", angle);
  //>>includeEnd('debug');

  const halfAngle = angle / 2.0;
  const s = Math.sin(halfAngle);
  fromAxisAngleScratch = Cartesian3.normalize(axis, fromAxisAngleScratch);

  const x = fromAxisAngleScratch.x * s;
  const y = fromAxisAngleScratch.y * s;
  const z = fromAxisAngleScratch.z * s;
  const w = Math.cos(halfAngle);
  if (!defined(result)) {
    return new Quaternion(x, y, z, w);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

const fromRotationMatrixNext = [1, 2, 0];
const fromRotationMatrixQuat = new Array(3);
/**
 * Computes a Quaternion from the provided Matrix3 instance.
 *
 * @param {Matrix3} matrix The rotation matrix.
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
 *
 * @see Matrix3.fromQuaternion
 */
Quaternion.fromRotationMatrix = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  //>>includeEnd('debug');

  let root;
  let x;
  let y;
  let z;
  let w;

  const m00 = matrix[Matrix3.COLUMN0ROW0];
  const m11 = matrix[Matrix3.COLUMN1ROW1];
  const m22 = matrix[Matrix3.COLUMN2ROW2];
  const trace = m00 + m11 + m22;

  if (trace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    root = Math.sqrt(trace + 1.0); // 2w
    w = 0.5 * root;
    root = 0.5 / root; // 1/(4w)

    x = (matrix[Matrix3.COLUMN1ROW2] - matrix[Matrix3.COLUMN2ROW1]) * root;
    y = (matrix[Matrix3.COLUMN2ROW0] - matrix[Matrix3.COLUMN0ROW2]) * root;
    z = (matrix[Matrix3.COLUMN0ROW1] - matrix[Matrix3.COLUMN1ROW0]) * root;
  } else {
    // |w| <= 1/2
    const next = fromRotationMatrixNext;

    let i = 0;
    if (m11 > m00) {
      i = 1;
    }
    if (m22 > m00 && m22 > m11) {
      i = 2;
    }
    const j = next[i];
    const k = next[j];

    root = Math.sqrt(
      matrix[Matrix3.getElementIndex(i, i)] -
        matrix[Matrix3.getElementIndex(j, j)] -
        matrix[Matrix3.getElementIndex(k, k)] +
        1.0
    );

    const quat = fromRotationMatrixQuat;
    quat[i] = 0.5 * root;
    root = 0.5 / root;
    w =
      (matrix[Matrix3.getElementIndex(k, j)] -
        matrix[Matrix3.getElementIndex(j, k)]) *
      root;
    quat[j] =
      (matrix[Matrix3.getElementIndex(j, i)] +
        matrix[Matrix3.getElementIndex(i, j)]) *
      root;
    quat[k] =
      (matrix[Matrix3.getElementIndex(k, i)] +
        matrix[Matrix3.getElementIndex(i, k)]) *
      root;

    x = -quat[0];
    y = -quat[1];
    z = -quat[2];
  }

  if (!defined(result)) {
    return new Quaternion(x, y, z, w);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

const scratchHPRQuaternion = new Quaternion();
let scratchHeadingQuaternion = new Quaternion();
let scratchPitchQuaternion = new Quaternion();
let scratchRollQuaternion = new Quaternion();

/**
 * Computes a rotation from the given heading, pitch and roll angles. Heading is the rotation about the
 * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
 * the positive x axis.
 *
 * @param {HeadingPitchRoll} headingPitchRoll The rotation expressed as a heading, pitch and roll.
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
 */
Quaternion.fromHeadingPitchRoll = function (headingPitchRoll, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("headingPitchRoll", headingPitchRoll);
  //>>includeEnd('debug');

  scratchRollQuaternion = Quaternion.fromAxisAngle(
    Cartesian3.UNIT_X,
    headingPitchRoll.roll,
    scratchHPRQuaternion
  );
  scratchPitchQuaternion = Quaternion.fromAxisAngle(
    Cartesian3.UNIT_Y,
    -headingPitchRoll.pitch,
    result
  );
  result = Quaternion.multiply(
    scratchPitchQuaternion,
    scratchRollQuaternion,
    scratchPitchQuaternion
  );
  scratchHeadingQuaternion = Quaternion.fromAxisAngle(
    Cartesian3.UNIT_Z,
    -headingPitchRoll.heading,
    scratchHPRQuaternion
  );
  return Quaternion.multiply(scratchHeadingQuaternion, result, result);
};

const sampledQuaternionAxis = new Cartesian3();
const sampledQuaternionRotation = new Cartesian3();
const sampledQuaternionTempQuaternion = new Quaternion();
const sampledQuaternionQuaternion0 = new Quaternion();
const sampledQuaternionQuaternion0Conjugate = new Quaternion();

/**
 * The number of elements used to pack the object into an array.
 * @type {Number}
 */
Quaternion.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Quaternion} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
Quaternion.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex++] = value.z;
  array[startingIndex] = value.w;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Quaternion} [result] The object into which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
 */
Quaternion.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new Quaternion();
  }
  result.x = array[startingIndex];
  result.y = array[startingIndex + 1];
  result.z = array[startingIndex + 2];
  result.w = array[startingIndex + 3];
  return result;
};

/**
 * The number of elements used to store the object into an array in its interpolatable form.
 * @type {Number}
 */
Quaternion.packedInterpolationLength = 3;

/**
 * Converts a packed array into a form suitable for interpolation.
 *
 * @param {Number[]} packedArray The packed array.
 * @param {Number} [startingIndex=0] The index of the first element to be converted.
 * @param {Number} [lastIndex=packedArray.length] The index of the last element to be converted.
 * @param {Number[]} [result] The object into which to store the result.
 */
Quaternion.convertPackedArrayForInterpolation = function (
  packedArray,
  startingIndex,
  lastIndex,
  result
) {
  Quaternion.unpack(
    packedArray,
    lastIndex * 4,
    sampledQuaternionQuaternion0Conjugate
  );
  Quaternion.conjugate(
    sampledQuaternionQuaternion0Conjugate,
    sampledQuaternionQuaternion0Conjugate
  );

  for (let i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
    const offset = i * 3;
    Quaternion.unpack(
      packedArray,
      (startingIndex + i) * 4,
      sampledQuaternionTempQuaternion
    );

    Quaternion.multiply(
      sampledQuaternionTempQuaternion,
      sampledQuaternionQuaternion0Conjugate,
      sampledQuaternionTempQuaternion
    );

    if (sampledQuaternionTempQuaternion.w < 0) {
      Quaternion.negate(
        sampledQuaternionTempQuaternion,
        sampledQuaternionTempQuaternion
      );
    }

    Quaternion.computeAxis(
      sampledQuaternionTempQuaternion,
      sampledQuaternionAxis
    );
    const angle = Quaternion.computeAngle(sampledQuaternionTempQuaternion);
    if (!defined(result)) {
      result = [];
    }
    result[offset] = sampledQuaternionAxis.x * angle;
    result[offset + 1] = sampledQuaternionAxis.y * angle;
    result[offset + 2] = sampledQuaternionAxis.z * angle;
  }
};

/**
 * Retrieves an instance from a packed array converted with {@link convertPackedArrayForInterpolation}.
 *
 * @param {Number[]} array The array previously packed for interpolation.
 * @param {Number[]} sourceArray The original packed array.
 * @param {Number} [firstIndex=0] The firstIndex used to convert the array.
 * @param {Number} [lastIndex=packedArray.length] The lastIndex used to convert the array.
 * @param {Quaternion} [result] The object into which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
 */
Quaternion.unpackInterpolationResult = function (
  array,
  sourceArray,
  firstIndex,
  lastIndex,
  result
) {
  if (!defined(result)) {
    result = new Quaternion();
  }
  Cartesian3.fromArray(array, 0, sampledQuaternionRotation);
  const magnitude = Cartesian3.magnitude(sampledQuaternionRotation);

  Quaternion.unpack(sourceArray, lastIndex * 4, sampledQuaternionQuaternion0);

  if (magnitude === 0) {
    Quaternion.clone(Quaternion.IDENTITY, sampledQuaternionTempQuaternion);
  } else {
    Quaternion.fromAxisAngle(
      sampledQuaternionRotation,
      magnitude,
      sampledQuaternionTempQuaternion
    );
  }

  return Quaternion.multiply(
    sampledQuaternionTempQuaternion,
    sampledQuaternionQuaternion0,
    result
  );
};

/**
 * Duplicates a Quaternion instance.
 *
 * @param {Quaternion} quaternion The quaternion to duplicate.
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided. (Returns undefined if quaternion is undefined)
 */
Quaternion.clone = function (quaternion, result) {
  if (!defined(quaternion)) {
    return undefined;
  }

  if (!defined(result)) {
    return new Quaternion(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
  }

  result.x = quaternion.x;
  result.y = quaternion.y;
  result.z = quaternion.z;
  result.w = quaternion.w;
  return result;
};

/**
 * Computes the conjugate of the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to conjugate.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.conjugate = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = -quaternion.x;
  result.y = -quaternion.y;
  result.z = -quaternion.z;
  result.w = quaternion.w;
  return result;
};

/**
 * Computes magnitude squared for the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to conjugate.
 * @returns {Number} The magnitude squared.
 */
Quaternion.magnitudeSquared = function (quaternion) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  //>>includeEnd('debug');

  return (
    quaternion.x * quaternion.x +
    quaternion.y * quaternion.y +
    quaternion.z * quaternion.z +
    quaternion.w * quaternion.w
  );
};

/**
 * Computes magnitude for the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to conjugate.
 * @returns {Number} The magnitude.
 */
Quaternion.magnitude = function (quaternion) {
  return Math.sqrt(Quaternion.magnitudeSquared(quaternion));
};

/**
 * Computes the normalized form of the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to normalize.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.normalize = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const inverseMagnitude = 1.0 / Quaternion.magnitude(quaternion);
  const x = quaternion.x * inverseMagnitude;
  const y = quaternion.y * inverseMagnitude;
  const z = quaternion.z * inverseMagnitude;
  const w = quaternion.w * inverseMagnitude;

  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

/**
 * Computes the inverse of the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to normalize.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.inverse = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
  result = Quaternion.conjugate(quaternion, result);
  return Quaternion.multiplyByScalar(result, 1.0 / magnitudeSquared, result);
};

/**
 * Computes the componentwise sum of two quaternions.
 *
 * @param {Quaternion} left The first quaternion.
 * @param {Quaternion} right The second quaternion.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.add = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  result.w = left.w + right.w;
  return result;
};

/**
 * Computes the componentwise difference of two quaternions.
 *
 * @param {Quaternion} left The first quaternion.
 * @param {Quaternion} right The second quaternion.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.subtract = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  result.w = left.w - right.w;
  return result;
};

/**
 * Negates the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to be negated.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.negate = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = -quaternion.x;
  result.y = -quaternion.y;
  result.z = -quaternion.z;
  result.w = -quaternion.w;
  return result;
};

/**
 * Computes the dot (scalar) product of two quaternions.
 *
 * @param {Quaternion} left The first quaternion.
 * @param {Quaternion} right The second quaternion.
 * @returns {Number} The dot product.
 */
Quaternion.dot = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  return (
    left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
  );
};

/**
 * Computes the product of two quaternions.
 *
 * @param {Quaternion} left The first quaternion.
 * @param {Quaternion} right The second quaternion.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.multiply = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const leftX = left.x;
  const leftY = left.y;
  const leftZ = left.z;
  const leftW = left.w;

  const rightX = right.x;
  const rightY = right.y;
  const rightZ = right.z;
  const rightW = right.w;

  const x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
  const y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
  const z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
  const w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;

  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

/**
 * Multiplies the provided quaternion componentwise by the provided scalar.
 *
 * @param {Quaternion} quaternion The quaternion to be scaled.
 * @param {Number} scalar The scalar to multiply with.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.multiplyByScalar = function (quaternion, scalar, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  Check.typeOf.number("scalar", scalar);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = quaternion.x * scalar;
  result.y = quaternion.y * scalar;
  result.z = quaternion.z * scalar;
  result.w = quaternion.w * scalar;
  return result;
};

/**
 * Divides the provided quaternion componentwise by the provided scalar.
 *
 * @param {Quaternion} quaternion The quaternion to be divided.
 * @param {Number} scalar The scalar to divide by.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.divideByScalar = function (quaternion, scalar, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  Check.typeOf.number("scalar", scalar);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = quaternion.x / scalar;
  result.y = quaternion.y / scalar;
  result.z = quaternion.z / scalar;
  result.w = quaternion.w / scalar;
  return result;
};

/**
 * Computes the axis of rotation of the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to use.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Quaternion.computeAxis = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const w = quaternion.w;
  if (Math.abs(w - 1.0) < CesiumMath.EPSILON6) {
    result.x = result.y = result.z = 0;
    return result;
  }

  const scalar = 1.0 / Math.sqrt(1.0 - w * w);

  result.x = quaternion.x * scalar;
  result.y = quaternion.y * scalar;
  result.z = quaternion.z * scalar;
  return result;
};

/**
 * Computes the angle of rotation of the provided quaternion.
 *
 * @param {Quaternion} quaternion The quaternion to use.
 * @returns {Number} The angle of rotation.
 */
Quaternion.computeAngle = function (quaternion) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  //>>includeEnd('debug');

  if (Math.abs(quaternion.w - 1.0) < CesiumMath.EPSILON6) {
    return 0.0;
  }
  return 2.0 * Math.acos(quaternion.w);
};

let lerpScratch = new Quaternion();
/**
 * Computes the linear interpolation or extrapolation at t using the provided quaternions.
 *
 * @param {Quaternion} start The value corresponding to t at 0.0.
 * @param {Quaternion} end The value corresponding to t at 1.0.
 * @param {Number} t The point along t at which to interpolate.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.lerp = function (start, end, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("start", start);
  Check.typeOf.object("end", end);
  Check.typeOf.number("t", t);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch);
  result = Quaternion.multiplyByScalar(start, 1.0 - t, result);
  return Quaternion.add(lerpScratch, result, result);
};

let slerpEndNegated = new Quaternion();
let slerpScaledP = new Quaternion();
let slerpScaledR = new Quaternion();
/**
 * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
 *
 * @param {Quaternion} start The value corresponding to t at 0.0.
 * @param {Quaternion} end The value corresponding to t at 1.0.
 * @param {Number} t The point along t at which to interpolate.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 *
 * @see Quaternion#fastSlerp
 */
Quaternion.slerp = function (start, end, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("start", start);
  Check.typeOf.object("end", end);
  Check.typeOf.number("t", t);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  let dot = Quaternion.dot(start, end);

  // The angle between start must be acute. Since q and -q represent
  // the same rotation, negate q to get the acute angle.
  let r = end;
  if (dot < 0.0) {
    dot = -dot;
    r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated);
  }

  // dot > 0, as the dot product approaches 1, the angle between the
  // quaternions vanishes. use linear interpolation.
  if (1.0 - dot < CesiumMath.EPSILON6) {
    return Quaternion.lerp(start, r, t, result);
  }

  const theta = Math.acos(dot);
  slerpScaledP = Quaternion.multiplyByScalar(
    start,
    Math.sin((1 - t) * theta),
    slerpScaledP
  );
  slerpScaledR = Quaternion.multiplyByScalar(
    r,
    Math.sin(t * theta),
    slerpScaledR
  );
  result = Quaternion.add(slerpScaledP, slerpScaledR, result);
  return Quaternion.multiplyByScalar(result, 1.0 / Math.sin(theta), result);
};

/**
 * The logarithmic quaternion function.
 *
 * @param {Quaternion} quaternion The unit quaternion.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Quaternion.log = function (quaternion, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("quaternion", quaternion);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const theta = CesiumMath.acosClamped(quaternion.w);
  let thetaOverSinTheta = 0.0;

  if (theta !== 0.0) {
    thetaOverSinTheta = theta / Math.sin(theta);
  }

  return Cartesian3.multiplyByScalar(quaternion, thetaOverSinTheta, result);
};

/**
 * The exponential quaternion function.
 *
 * @param {Cartesian3} cartesian The cartesian.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 */
Quaternion.exp = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const theta = Cartesian3.magnitude(cartesian);
  let sinThetaOverTheta = 0.0;

  if (theta !== 0.0) {
    sinThetaOverTheta = Math.sin(theta) / theta;
  }

  result.x = cartesian.x * sinThetaOverTheta;
  result.y = cartesian.y * sinThetaOverTheta;
  result.z = cartesian.z * sinThetaOverTheta;
  result.w = Math.cos(theta);

  return result;
};

const squadScratchCartesian0 = new Cartesian3();
const squadScratchCartesian1 = new Cartesian3();
const squadScratchQuaternion0 = new Quaternion();
const squadScratchQuaternion1 = new Quaternion();

/**
 * Computes an inner quadrangle point.
 * <p>This will compute quaternions that ensure a squad curve is C<sup>1</sup>.</p>
 *
 * @param {Quaternion} q0 The first quaternion.
 * @param {Quaternion} q1 The second quaternion.
 * @param {Quaternion} q2 The third quaternion.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 *
 * @see Quaternion#squad
 */
Quaternion.computeInnerQuadrangle = function (q0, q1, q2, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("q0", q0);
  Check.typeOf.object("q1", q1);
  Check.typeOf.object("q2", q2);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const qInv = Quaternion.conjugate(q1, squadScratchQuaternion0);
  Quaternion.multiply(qInv, q2, squadScratchQuaternion1);
  const cart0 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian0);

  Quaternion.multiply(qInv, q0, squadScratchQuaternion1);
  const cart1 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian1);

  Cartesian3.add(cart0, cart1, cart0);
  Cartesian3.multiplyByScalar(cart0, 0.25, cart0);
  Cartesian3.negate(cart0, cart0);
  Quaternion.exp(cart0, squadScratchQuaternion0);

  return Quaternion.multiply(q1, squadScratchQuaternion0, result);
};

/**
 * Computes the spherical quadrangle interpolation between quaternions.
 *
 * @param {Quaternion} q0 The first quaternion.
 * @param {Quaternion} q1 The second quaternion.
 * @param {Quaternion} s0 The first inner quadrangle.
 * @param {Quaternion} s1 The second inner quadrangle.
 * @param {Number} t The time in [0,1] used to interpolate.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 *
 *
 * @example
 * // 1. compute the squad interpolation between two quaternions on a curve
 * const s0 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i - 1], quaternions[i], quaternions[i + 1], new Cesium.Quaternion());
 * const s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i], quaternions[i + 1], quaternions[i + 2], new Cesium.Quaternion());
 * const q = Cesium.Quaternion.squad(quaternions[i], quaternions[i + 1], s0, s1, t, new Cesium.Quaternion());
 *
 * // 2. compute the squad interpolation as above but where the first quaternion is a end point.
 * const s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[0], quaternions[1], quaternions[2], new Cesium.Quaternion());
 * const q = Cesium.Quaternion.squad(quaternions[0], quaternions[1], quaternions[0], s1, t, new Cesium.Quaternion());
 *
 * @see Quaternion#computeInnerQuadrangle
 */
Quaternion.squad = function (q0, q1, s0, s1, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("q0", q0);
  Check.typeOf.object("q1", q1);
  Check.typeOf.object("s0", s0);
  Check.typeOf.object("s1", s1);
  Check.typeOf.number("t", t);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const slerp0 = Quaternion.slerp(q0, q1, t, squadScratchQuaternion0);
  const slerp1 = Quaternion.slerp(s0, s1, t, squadScratchQuaternion1);
  return Quaternion.slerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
};

const fastSlerpScratchQuaternion = new Quaternion();
const opmu = 1.90110745351730037;
const u = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
const v = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
const bT = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
const bD = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];

for (let i = 0; i < 7; ++i) {
  const s = i + 1.0;
  const t = 2.0 * s + 1.0;
  u[i] = 1.0 / (s * t);
  v[i] = s / t;
}

u[7] = opmu / (8.0 * 17.0);
v[7] = (opmu * 8.0) / 17.0;

/**
 * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
 * This implementation is faster than {@link Quaternion#slerp}, but is only accurate up to 10<sup>-6</sup>.
 *
 * @param {Quaternion} start The value corresponding to t at 0.0.
 * @param {Quaternion} end The value corresponding to t at 1.0.
 * @param {Number} t The point along t at which to interpolate.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter.
 *
 * @see Quaternion#slerp
 */
Quaternion.fastSlerp = function (start, end, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("start", start);
  Check.typeOf.object("end", end);
  Check.typeOf.number("t", t);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  let x = Quaternion.dot(start, end);

  let sign;
  if (x >= 0) {
    sign = 1.0;
  } else {
    sign = -1.0;
    x = -x;
  }

  const xm1 = x - 1.0;
  const d = 1.0 - t;
  const sqrT = t * t;
  const sqrD = d * d;

  for (let i = 7; i >= 0; --i) {
    bT[i] = (u[i] * sqrT - v[i]) * xm1;
    bD[i] = (u[i] * sqrD - v[i]) * xm1;
  }

  const cT =
    sign *
    t *
    (1.0 +
      bT[0] *
        (1.0 +
          bT[1] *
            (1.0 +
              bT[2] *
                (1.0 +
                  bT[3] *
                    (1.0 +
                      bT[4] *
                        (1.0 + bT[5] * (1.0 + bT[6] * (1.0 + bT[7]))))))));
  const cD =
    d *
    (1.0 +
      bD[0] *
        (1.0 +
          bD[1] *
            (1.0 +
              bD[2] *
                (1.0 +
                  bD[3] *
                    (1.0 +
                      bD[4] *
                        (1.0 + bD[5] * (1.0 + bD[6] * (1.0 + bD[7]))))))));

  const temp = Quaternion.multiplyByScalar(
    start,
    cD,
    fastSlerpScratchQuaternion
  );
  Quaternion.multiplyByScalar(end, cT, result);
  return Quaternion.add(temp, result, result);
};

/**
 * Computes the spherical quadrangle interpolation between quaternions.
 * An implementation that is faster than {@link Quaternion#squad}, but less accurate.
 *
 * @param {Quaternion} q0 The first quaternion.
 * @param {Quaternion} q1 The second quaternion.
 * @param {Quaternion} s0 The first inner quadrangle.
 * @param {Quaternion} s1 The second inner quadrangle.
 * @param {Number} t The time in [0,1] used to interpolate.
 * @param {Quaternion} result The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new instance if none was provided.
 *
 * @see Quaternion#squad
 */
Quaternion.fastSquad = function (q0, q1, s0, s1, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("q0", q0);
  Check.typeOf.object("q1", q1);
  Check.typeOf.object("s0", s0);
  Check.typeOf.object("s1", s1);
  Check.typeOf.number("t", t);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const slerp0 = Quaternion.fastSlerp(q0, q1, t, squadScratchQuaternion0);
  const slerp1 = Quaternion.fastSlerp(s0, s1, t, squadScratchQuaternion1);
  return Quaternion.fastSlerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
};

/**
 * Compares the provided quaternions componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Quaternion} [left] The first quaternion.
 * @param {Quaternion} [right] The second quaternion.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Quaternion.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.x === right.x &&
      left.y === right.y &&
      left.z === right.z &&
      left.w === right.w)
  );
};

/**
 * Compares the provided quaternions componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Quaternion} [left] The first quaternion.
 * @param {Quaternion} [right] The second quaternion.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Quaternion.equalsEpsilon = function (left, right, epsilon) {
  epsilon = defaultValue(epsilon, 0);

  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Math.abs(left.x - right.x) <= epsilon &&
      Math.abs(left.y - right.y) <= epsilon &&
      Math.abs(left.z - right.z) <= epsilon &&
      Math.abs(left.w - right.w) <= epsilon)
  );
};

/**
 * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 0.0).
 *
 * @type {Quaternion}
 * @constant
 */
Quaternion.ZERO = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 0.0));

/**
 * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 1.0).
 *
 * @type {Quaternion}
 * @constant
 */
Quaternion.IDENTITY = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 1.0));

/**
 * Duplicates this Quaternion instance.
 *
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
 */
Quaternion.prototype.clone = function (result) {
  return Quaternion.clone(this, result);
};

/**
 * Compares this and the provided quaternion componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Quaternion} [right] The right hand side quaternion.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Quaternion.prototype.equals = function (right) {
  return Quaternion.equals(this, right);
};

/**
 * Compares this and the provided quaternion componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Quaternion} [right] The right hand side quaternion.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Quaternion.prototype.equalsEpsilon = function (right, epsilon) {
  return Quaternion.equalsEpsilon(this, right, epsilon);
};

/**
 * Returns a string representing this quaternion in the format (x, y, z, w).
 *
 * @returns {String} A string representing this Quaternion.
 */
Quaternion.prototype.toString = function () {
  return "(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
};
export default Quaternion;
