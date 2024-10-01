import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import RuntimeError from "./RuntimeError.js";

/**
 * A 4x4 matrix, indexable as a column-major order array.
 * Constructor parameters are in row-major order for code readability.
 * @alias Matrix4
 * @constructor
 * @implements {ArrayLike<number>}
 *
 * @param {number} [column0Row0=0.0] The value for column 0, row 0.
 * @param {number} [column1Row0=0.0] The value for column 1, row 0.
 * @param {number} [column2Row0=0.0] The value for column 2, row 0.
 * @param {number} [column3Row0=0.0] The value for column 3, row 0.
 * @param {number} [column0Row1=0.0] The value for column 0, row 1.
 * @param {number} [column1Row1=0.0] The value for column 1, row 1.
 * @param {number} [column2Row1=0.0] The value for column 2, row 1.
 * @param {number} [column3Row1=0.0] The value for column 3, row 1.
 * @param {number} [column0Row2=0.0] The value for column 0, row 2.
 * @param {number} [column1Row2=0.0] The value for column 1, row 2.
 * @param {number} [column2Row2=0.0] The value for column 2, row 2.
 * @param {number} [column3Row2=0.0] The value for column 3, row 2.
 * @param {number} [column0Row3=0.0] The value for column 0, row 3.
 * @param {number} [column1Row3=0.0] The value for column 1, row 3.
 * @param {number} [column2Row3=0.0] The value for column 2, row 3.
 * @param {number} [column3Row3=0.0] The value for column 3, row 3.
 *
 * @see Matrix4.fromArray
 * @see Matrix4.fromColumnMajorArray
 * @see Matrix4.fromRowMajorArray
 * @see Matrix4.fromRotationTranslation
 * @see Matrix4.fromTranslationQuaternionRotationScale
 * @see Matrix4.fromTranslationRotationScale
 * @see Matrix4.fromTranslation
 * @see Matrix4.fromScale
 * @see Matrix4.fromUniformScale
 * @see Matrix4.fromRotation
 * @see Matrix4.fromCamera
 * @see Matrix4.computePerspectiveFieldOfView
 * @see Matrix4.computeOrthographicOffCenter
 * @see Matrix4.computePerspectiveOffCenter
 * @see Matrix4.computeInfinitePerspectiveOffCenter
 * @see Matrix4.computeViewportTransformation
 * @see Matrix4.computeView
 * @see Matrix2
 * @see Matrix3
 * @see Packable
 */
function Matrix4(
  column0Row0,
  column1Row0,
  column2Row0,
  column3Row0,
  column0Row1,
  column1Row1,
  column2Row1,
  column3Row1,
  column0Row2,
  column1Row2,
  column2Row2,
  column3Row2,
  column0Row3,
  column1Row3,
  column2Row3,
  column3Row3,
) {
  this[0] = defaultValue(column0Row0, 0.0);
  this[1] = defaultValue(column0Row1, 0.0);
  this[2] = defaultValue(column0Row2, 0.0);
  this[3] = defaultValue(column0Row3, 0.0);
  this[4] = defaultValue(column1Row0, 0.0);
  this[5] = defaultValue(column1Row1, 0.0);
  this[6] = defaultValue(column1Row2, 0.0);
  this[7] = defaultValue(column1Row3, 0.0);
  this[8] = defaultValue(column2Row0, 0.0);
  this[9] = defaultValue(column2Row1, 0.0);
  this[10] = defaultValue(column2Row2, 0.0);
  this[11] = defaultValue(column2Row3, 0.0);
  this[12] = defaultValue(column3Row0, 0.0);
  this[13] = defaultValue(column3Row1, 0.0);
  this[14] = defaultValue(column3Row2, 0.0);
  this[15] = defaultValue(column3Row3, 0.0);
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
Matrix4.packedLength = 16;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Matrix4} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
Matrix4.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];
  array[startingIndex++] = value[4];
  array[startingIndex++] = value[5];
  array[startingIndex++] = value[6];
  array[startingIndex++] = value[7];
  array[startingIndex++] = value[8];
  array[startingIndex++] = value[9];
  array[startingIndex++] = value[10];
  array[startingIndex++] = value[11];
  array[startingIndex++] = value[12];
  array[startingIndex++] = value[13];
  array[startingIndex++] = value[14];
  array[startingIndex] = value[15];

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Matrix4} [result] The object into which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
 */
Matrix4.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new Matrix4();
  }

  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  result[4] = array[startingIndex++];
  result[5] = array[startingIndex++];
  result[6] = array[startingIndex++];
  result[7] = array[startingIndex++];
  result[8] = array[startingIndex++];
  result[9] = array[startingIndex++];
  result[10] = array[startingIndex++];
  result[11] = array[startingIndex++];
  result[12] = array[startingIndex++];
  result[13] = array[startingIndex++];
  result[14] = array[startingIndex++];
  result[15] = array[startingIndex];
  return result;
};

/**
 * Flattens an array of Matrix4s into an array of components. The components
 * are stored in column-major order.
 *
 * @param {Matrix4[]} array The array of matrices to pack.
 * @param {number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 16 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 16) elements.
 * @returns {number[]} The packed array.
 */
Matrix4.packArray = function (array, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  const length = array.length;
  const resultLength = length * 16;
  if (!defined(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "If result is a typed array, it must have exactly array.length * 16 elements",
    );
    //>>includeEnd('debug');
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }

  for (let i = 0; i < length; ++i) {
    Matrix4.pack(array[i], result, i * 16);
  }
  return result;
};

/**
 * Unpacks an array of column-major matrix components into an array of Matrix4s.
 *
 * @param {number[]} array The array of components to unpack.
 * @param {Matrix4[]} [result] The array onto which to store the result.
 * @returns {Matrix4[]} The unpacked array.
 */
Matrix4.unpackArray = function (array, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 16);
  if (array.length % 16 !== 0) {
    throw new DeveloperError("array length must be a multiple of 16.");
  }
  //>>includeEnd('debug');

  const length = array.length;
  if (!defined(result)) {
    result = new Array(length / 16);
  } else {
    result.length = length / 16;
  }

  for (let i = 0; i < length; i += 16) {
    const index = i / 16;
    result[index] = Matrix4.unpack(array, i, result[index]);
  }
  return result;
};

/**
 * Duplicates a Matrix4 instance.
 *
 * @param {Matrix4} matrix The matrix to duplicate.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. (Returns undefined if matrix is undefined)
 */
Matrix4.clone = function (matrix, result) {
  if (!defined(matrix)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Matrix4(
      matrix[0],
      matrix[4],
      matrix[8],
      matrix[12],
      matrix[1],
      matrix[5],
      matrix[9],
      matrix[13],
      matrix[2],
      matrix[6],
      matrix[10],
      matrix[14],
      matrix[3],
      matrix[7],
      matrix[11],
      matrix[15],
    );
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};

/**
 * Creates a Matrix4 from 16 consecutive elements in an array.
 * @function
 *
 * @param {number[]} array The array whose 16 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
 * @param {number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
 *
 * @example
 * // Create the Matrix4:
 * // [1.0, 2.0, 3.0, 4.0]
 * // [1.0, 2.0, 3.0, 4.0]
 * // [1.0, 2.0, 3.0, 4.0]
 * // [1.0, 2.0, 3.0, 4.0]
 *
 * const v = [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
 * const m = Cesium.Matrix4.fromArray(v);
 *
 * // Create same Matrix4 with using an offset into an array
 * const v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
 * const m2 = Cesium.Matrix4.fromArray(v2, 2);
 */
Matrix4.fromArray = Matrix4.unpack;

/**
 * Computes a Matrix4 instance from a column-major order array.
 *
 * @param {number[]} values The column-major order array.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 */
Matrix4.fromColumnMajorArray = function (values, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("values", values);
  //>>includeEnd('debug');

  return Matrix4.clone(values, result);
};

/**
 * Computes a Matrix4 instance from a row-major order array.
 * The resulting matrix will be in column-major order.
 *
 * @param {number[]} values The row-major order array.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 */
Matrix4.fromRowMajorArray = function (values, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("values", values);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Matrix4(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      values[8],
      values[9],
      values[10],
      values[11],
      values[12],
      values[13],
      values[14],
      values[15],
    );
  }
  result[0] = values[0];
  result[1] = values[4];
  result[2] = values[8];
  result[3] = values[12];
  result[4] = values[1];
  result[5] = values[5];
  result[6] = values[9];
  result[7] = values[13];
  result[8] = values[2];
  result[9] = values[6];
  result[10] = values[10];
  result[11] = values[14];
  result[12] = values[3];
  result[13] = values[7];
  result[14] = values[11];
  result[15] = values[15];
  return result;
};

/**
 * Computes a Matrix4 instance from a Matrix3 representing the rotation
 * and a Cartesian3 representing the translation.
 *
 * @param {Matrix3} rotation The upper left portion of the matrix representing the rotation.
 * @param {Cartesian3} [translation=Cartesian3.ZERO] The upper right portion of the matrix representing the translation.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 */
Matrix4.fromRotationTranslation = function (rotation, translation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rotation", rotation);
  //>>includeEnd('debug');

  translation = defaultValue(translation, Cartesian3.ZERO);

  if (!defined(result)) {
    return new Matrix4(
      rotation[0],
      rotation[3],
      rotation[6],
      translation.x,
      rotation[1],
      rotation[4],
      rotation[7],
      translation.y,
      rotation[2],
      rotation[5],
      rotation[8],
      translation.z,
      0.0,
      0.0,
      0.0,
      1.0,
    );
  }

  result[0] = rotation[0];
  result[1] = rotation[1];
  result[2] = rotation[2];
  result[3] = 0.0;
  result[4] = rotation[3];
  result[5] = rotation[4];
  result[6] = rotation[5];
  result[7] = 0.0;
  result[8] = rotation[6];
  result[9] = rotation[7];
  result[10] = rotation[8];
  result[11] = 0.0;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = 1.0;
  return result;
};

/**
 * Computes a Matrix4 instance from a translation, rotation, and scale (TRS)
 * representation with the rotation represented as a quaternion.
 *
 * @param {Cartesian3} translation The translation transformation.
 * @param {Quaternion} rotation The rotation transformation.
 * @param {Cartesian3} scale The non-uniform scale transformation.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 *
 * @example
 * const result = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
 *   new Cesium.Cartesian3(1.0, 2.0, 3.0), // translation
 *   Cesium.Quaternion.IDENTITY,           // rotation
 *   new Cesium.Cartesian3(7.0, 8.0, 9.0), // scale
 *   result);
 */
Matrix4.fromTranslationQuaternionRotationScale = function (
  translation,
  rotation,
  scale,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("translation", translation);
  Check.typeOf.object("rotation", rotation);
  Check.typeOf.object("scale", scale);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Matrix4();
  }

  const scaleX = scale.x;
  const scaleY = scale.y;
  const scaleZ = scale.z;

  const x2 = rotation.x * rotation.x;
  const xy = rotation.x * rotation.y;
  const xz = rotation.x * rotation.z;
  const xw = rotation.x * rotation.w;
  const y2 = rotation.y * rotation.y;
  const yz = rotation.y * rotation.z;
  const yw = rotation.y * rotation.w;
  const z2 = rotation.z * rotation.z;
  const zw = rotation.z * rotation.w;
  const w2 = rotation.w * rotation.w;

  const m00 = x2 - y2 - z2 + w2;
  const m01 = 2.0 * (xy - zw);
  const m02 = 2.0 * (xz + yw);

  const m10 = 2.0 * (xy + zw);
  const m11 = -x2 + y2 - z2 + w2;
  const m12 = 2.0 * (yz - xw);

  const m20 = 2.0 * (xz - yw);
  const m21 = 2.0 * (yz + xw);
  const m22 = -x2 - y2 + z2 + w2;

  result[0] = m00 * scaleX;
  result[1] = m10 * scaleX;
  result[2] = m20 * scaleX;
  result[3] = 0.0;
  result[4] = m01 * scaleY;
  result[5] = m11 * scaleY;
  result[6] = m21 * scaleY;
  result[7] = 0.0;
  result[8] = m02 * scaleZ;
  result[9] = m12 * scaleZ;
  result[10] = m22 * scaleZ;
  result[11] = 0.0;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = 1.0;

  return result;
};

/**
 * Creates a Matrix4 instance from a {@link TranslationRotationScale} instance.
 *
 * @param {TranslationRotationScale} translationRotationScale The instance.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 */
Matrix4.fromTranslationRotationScale = function (
  translationRotationScale,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("translationRotationScale", translationRotationScale);
  //>>includeEnd('debug');

  return Matrix4.fromTranslationQuaternionRotationScale(
    translationRotationScale.translation,
    translationRotationScale.rotation,
    translationRotationScale.scale,
    result,
  );
};

/**
 * Creates a Matrix4 instance from a Cartesian3 representing the translation.
 *
 * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 *
 * @see Matrix4.multiplyByTranslation
 */
Matrix4.fromTranslation = function (translation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("translation", translation);
  //>>includeEnd('debug');

  return Matrix4.fromRotationTranslation(Matrix3.IDENTITY, translation, result);
};

/**
 * Computes a Matrix4 instance representing a non-uniform scale.
 *
 * @param {Cartesian3} scale The x, y, and z scale factors.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 *
 * @example
 * // Creates
 * //   [7.0, 0.0, 0.0, 0.0]
 * //   [0.0, 8.0, 0.0, 0.0]
 * //   [0.0, 0.0, 9.0, 0.0]
 * //   [0.0, 0.0, 0.0, 1.0]
 * const m = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
 */
Matrix4.fromScale = function (scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scale", scale);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Matrix4(
      scale.x,
      0.0,
      0.0,
      0.0,
      0.0,
      scale.y,
      0.0,
      0.0,
      0.0,
      0.0,
      scale.z,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    );
  }

  result[0] = scale.x;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = scale.y;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = 0.0;
  result[9] = 0.0;
  result[10] = scale.z;
  result[11] = 0.0;
  result[12] = 0.0;
  result[13] = 0.0;
  result[14] = 0.0;
  result[15] = 1.0;
  return result;
};

/**
 * Computes a Matrix4 instance representing a uniform scale.
 *
 * @param {number} scale The uniform scale factor.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 *
 * @example
 * // Creates
 * //   [2.0, 0.0, 0.0, 0.0]
 * //   [0.0, 2.0, 0.0, 0.0]
 * //   [0.0, 0.0, 2.0, 0.0]
 * //   [0.0, 0.0, 0.0, 1.0]
 * const m = Cesium.Matrix4.fromUniformScale(2.0);
 */
Matrix4.fromUniformScale = function (scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("scale", scale);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Matrix4(
      scale,
      0.0,
      0.0,
      0.0,
      0.0,
      scale,
      0.0,
      0.0,
      0.0,
      0.0,
      scale,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    );
  }

  result[0] = scale;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = scale;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = 0.0;
  result[9] = 0.0;
  result[10] = scale;
  result[11] = 0.0;
  result[12] = 0.0;
  result[13] = 0.0;
  result[14] = 0.0;
  result[15] = 1.0;
  return result;
};

/**
 * Creates a rotation matrix.
 *
 * @param {Matrix3} rotation The rotation matrix.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 */
Matrix4.fromRotation = function (rotation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rotation", rotation);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Matrix4();
  }
  result[0] = rotation[0];
  result[1] = rotation[1];
  result[2] = rotation[2];
  result[3] = 0.0;

  result[4] = rotation[3];
  result[5] = rotation[4];
  result[6] = rotation[5];
  result[7] = 0.0;

  result[8] = rotation[6];
  result[9] = rotation[7];
  result[10] = rotation[8];
  result[11] = 0.0;

  result[12] = 0.0;
  result[13] = 0.0;
  result[14] = 0.0;
  result[15] = 1.0;

  return result;
};

const fromCameraF = new Cartesian3();
const fromCameraR = new Cartesian3();
const fromCameraU = new Cartesian3();

/**
 * Computes a Matrix4 instance from a Camera.
 *
 * @param {Camera} camera The camera to use.
 * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
 */
Matrix4.fromCamera = function (camera, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("camera", camera);
  //>>includeEnd('debug');

  const position = camera.position;
  const direction = camera.direction;
  const up = camera.up;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("camera.position", position);
  Check.typeOf.object("camera.direction", direction);
  Check.typeOf.object("camera.up", up);
  //>>includeEnd('debug');

  Cartesian3.normalize(direction, fromCameraF);
  Cartesian3.normalize(
    Cartesian3.cross(fromCameraF, up, fromCameraR),
    fromCameraR,
  );
  Cartesian3.normalize(
    Cartesian3.cross(fromCameraR, fromCameraF, fromCameraU),
    fromCameraU,
  );

  const sX = fromCameraR.x;
  const sY = fromCameraR.y;
  const sZ = fromCameraR.z;
  const fX = fromCameraF.x;
  const fY = fromCameraF.y;
  const fZ = fromCameraF.z;
  const uX = fromCameraU.x;
  const uY = fromCameraU.y;
  const uZ = fromCameraU.z;
  const positionX = position.x;
  const positionY = position.y;
  const positionZ = position.z;
  const t0 = sX * -positionX + sY * -positionY + sZ * -positionZ;
  const t1 = uX * -positionX + uY * -positionY + uZ * -positionZ;
  const t2 = fX * positionX + fY * positionY + fZ * positionZ;

  // The code below this comment is an optimized
  // version of the commented lines.
  // Rather that create two matrices and then multiply,
  // we just bake in the multiplcation as part of creation.
  // const rotation = new Matrix4(
  //                 sX,  sY,  sZ, 0.0,
  //                 uX,  uY,  uZ, 0.0,
  //                -fX, -fY, -fZ, 0.0,
  //                 0.0,  0.0,  0.0, 1.0);
  // const translation = new Matrix4(
  //                 1.0, 0.0, 0.0, -position.x,
  //                 0.0, 1.0, 0.0, -position.y,
  //                 0.0, 0.0, 1.0, -position.z,
  //                 0.0, 0.0, 0.0, 1.0);
  // return rotation.multiply(translation);
  if (!defined(result)) {
    return new Matrix4(
      sX,
      sY,
      sZ,
      t0,
      uX,
      uY,
      uZ,
      t1,
      -fX,
      -fY,
      -fZ,
      t2,
      0.0,
      0.0,
      0.0,
      1.0,
    );
  }
  result[0] = sX;
  result[1] = uX;
  result[2] = -fX;
  result[3] = 0.0;
  result[4] = sY;
  result[5] = uY;
  result[6] = -fY;
  result[7] = 0.0;
  result[8] = sZ;
  result[9] = uZ;
  result[10] = -fZ;
  result[11] = 0.0;
  result[12] = t0;
  result[13] = t1;
  result[14] = t2;
  result[15] = 1.0;
  return result;
};

/**
 * Computes a Matrix4 instance representing a perspective transformation matrix.
 *
 * @param {number} fovY The field of view along the Y axis in radians.
 * @param {number} aspectRatio The aspect ratio.
 * @param {number} near The distance to the near plane in meters.
 * @param {number} far The distance to the far plane in meters.
 * @param {Matrix4} result The object in which the result will be stored.
 * @returns {Matrix4} The modified result parameter.
 *
 * @exception {DeveloperError} fovY must be in (0, PI].
 * @exception {DeveloperError} aspectRatio must be greater than zero.
 * @exception {DeveloperError} near must be greater than zero.
 * @exception {DeveloperError} far must be greater than zero.
 */
Matrix4.computePerspectiveFieldOfView = function (
  fovY,
  aspectRatio,
  near,
  far,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("fovY", fovY, 0.0);
  Check.typeOf.number.lessThan("fovY", fovY, Math.PI);
  Check.typeOf.number.greaterThan("near", near, 0.0);
  Check.typeOf.number.greaterThan("far", far, 0.0);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const bottom = Math.tan(fovY * 0.5);

  const column1Row1 = 1.0 / bottom;
  const column0Row0 = column1Row1 / aspectRatio;
  const column2Row2 = (far + near) / (near - far);
  const column3Row2 = (2.0 * far * near) / (near - far);

  result[0] = column0Row0;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = column1Row1;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = 0.0;
  result[9] = 0.0;
  result[10] = column2Row2;
  result[11] = -1.0;
  result[12] = 0.0;
  result[13] = 0.0;
  result[14] = column3Row2;
  result[15] = 0.0;
  return result;
};

/**
 * Computes a Matrix4 instance representing an orthographic transformation matrix.
 *
 * @param {number} left The number of meters to the left of the camera that will be in view.
 * @param {number} right The number of meters to the right of the camera that will be in view.
 * @param {number} bottom The number of meters below of the camera that will be in view.
 * @param {number} top The number of meters above of the camera that will be in view.
 * @param {number} near The distance to the near plane in meters.
 * @param {number} far The distance to the far plane in meters.
 * @param {Matrix4} result The object in which the result will be stored.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.computeOrthographicOffCenter = function (
  left,
  right,
  bottom,
  top,
  near,
  far,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("left", left);
  Check.typeOf.number("right", right);
  Check.typeOf.number("bottom", bottom);
  Check.typeOf.number("top", top);
  Check.typeOf.number("near", near);
  Check.typeOf.number("far", far);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  let a = 1.0 / (right - left);
  let b = 1.0 / (top - bottom);
  let c = 1.0 / (far - near);

  const tx = -(right + left) * a;
  const ty = -(top + bottom) * b;
  const tz = -(far + near) * c;
  a *= 2.0;
  b *= 2.0;
  c *= -2.0;

  result[0] = a;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = b;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = 0.0;
  result[9] = 0.0;
  result[10] = c;
  result[11] = 0.0;
  result[12] = tx;
  result[13] = ty;
  result[14] = tz;
  result[15] = 1.0;
  return result;
};

/**
 * Computes a Matrix4 instance representing an off center perspective transformation.
 *
 * @param {number} left The number of meters to the left of the camera that will be in view.
 * @param {number} right The number of meters to the right of the camera that will be in view.
 * @param {number} bottom The number of meters below the camera that will be in view.
 * @param {number} top The number of meters above the camera that will be in view.
 * @param {number} near The distance to the near plane in meters.
 * @param {number} far The distance to the far plane in meters.
 * @param {Matrix4} result The object in which the result will be stored.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.computePerspectiveOffCenter = function (
  left,
  right,
  bottom,
  top,
  near,
  far,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("left", left);
  Check.typeOf.number("right", right);
  Check.typeOf.number("bottom", bottom);
  Check.typeOf.number("top", top);
  Check.typeOf.number("near", near);
  Check.typeOf.number("far", far);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const column0Row0 = (2.0 * near) / (right - left);
  const column1Row1 = (2.0 * near) / (top - bottom);
  const column2Row0 = (right + left) / (right - left);
  const column2Row1 = (top + bottom) / (top - bottom);
  const column2Row2 = -(far + near) / (far - near);
  const column2Row3 = -1.0;
  const column3Row2 = (-2.0 * far * near) / (far - near);

  result[0] = column0Row0;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = column1Row1;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = 0.0;
  result[13] = 0.0;
  result[14] = column3Row2;
  result[15] = 0.0;
  return result;
};

/**
 * Computes a Matrix4 instance representing an infinite off center perspective transformation.
 *
 * @param {number} left The number of meters to the left of the camera that will be in view.
 * @param {number} right The number of meters to the right of the camera that will be in view.
 * @param {number} bottom The number of meters below of the camera that will be in view.
 * @param {number} top The number of meters above of the camera that will be in view.
 * @param {number} near The distance to the near plane in meters.
 * @param {Matrix4} result The object in which the result will be stored.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.computeInfinitePerspectiveOffCenter = function (
  left,
  right,
  bottom,
  top,
  near,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("left", left);
  Check.typeOf.number("right", right);
  Check.typeOf.number("bottom", bottom);
  Check.typeOf.number("top", top);
  Check.typeOf.number("near", near);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const column0Row0 = (2.0 * near) / (right - left);
  const column1Row1 = (2.0 * near) / (top - bottom);
  const column2Row0 = (right + left) / (right - left);
  const column2Row1 = (top + bottom) / (top - bottom);
  const column2Row2 = -1.0;
  const column2Row3 = -1.0;
  const column3Row2 = -2.0 * near;

  result[0] = column0Row0;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = column1Row1;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = 0.0;
  result[13] = 0.0;
  result[14] = column3Row2;
  result[15] = 0.0;
  return result;
};

/**
 * Computes a Matrix4 instance that transforms from normalized device coordinates to window coordinates.
 *
 * @param {object} [viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
 * @param {number} [nearDepthRange=0.0] The near plane distance in window coordinates.
 * @param {number} [farDepthRange=1.0] The far plane distance in window coordinates.
 * @param {Matrix4} [result] The object in which the result will be stored.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * // Create viewport transformation using an explicit viewport and depth range.
 * const m = Cesium.Matrix4.computeViewportTransformation({
 *     x : 0.0,
 *     y : 0.0,
 *     width : 1024.0,
 *     height : 768.0
 * }, 0.0, 1.0, new Cesium.Matrix4());
 */
Matrix4.computeViewportTransformation = function (
  viewport,
  nearDepthRange,
  farDepthRange,
  result,
) {
  if (!defined(result)) {
    result = new Matrix4();
  }

  viewport = defaultValue(viewport, defaultValue.EMPTY_OBJECT);
  const x = defaultValue(viewport.x, 0.0);
  const y = defaultValue(viewport.y, 0.0);
  const width = defaultValue(viewport.width, 0.0);
  const height = defaultValue(viewport.height, 0.0);
  nearDepthRange = defaultValue(nearDepthRange, 0.0);
  farDepthRange = defaultValue(farDepthRange, 1.0);

  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const halfDepth = (farDepthRange - nearDepthRange) * 0.5;

  const column0Row0 = halfWidth;
  const column1Row1 = halfHeight;
  const column2Row2 = halfDepth;
  const column3Row0 = x + halfWidth;
  const column3Row1 = y + halfHeight;
  const column3Row2 = nearDepthRange + halfDepth;
  const column3Row3 = 1.0;

  result[0] = column0Row0;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = 0.0;
  result[4] = 0.0;
  result[5] = column1Row1;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = 0.0;
  result[9] = 0.0;
  result[10] = column2Row2;
  result[11] = 0.0;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = column3Row3;

  return result;
};

/**
 * Computes a Matrix4 instance that transforms from world space to view space.
 *
 * @param {Cartesian3} position The position of the camera.
 * @param {Cartesian3} direction The forward direction.
 * @param {Cartesian3} up The up direction.
 * @param {Cartesian3} right The right direction.
 * @param {Matrix4} result The object in which the result will be stored.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.computeView = function (position, direction, up, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("position", position);
  Check.typeOf.object("direction", direction);
  Check.typeOf.object("up", up);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = right.x;
  result[1] = up.x;
  result[2] = -direction.x;
  result[3] = 0.0;
  result[4] = right.y;
  result[5] = up.y;
  result[6] = -direction.y;
  result[7] = 0.0;
  result[8] = right.z;
  result[9] = up.z;
  result[10] = -direction.z;
  result[11] = 0.0;
  result[12] = -Cartesian3.dot(right, position);
  result[13] = -Cartesian3.dot(up, position);
  result[14] = Cartesian3.dot(direction, position);
  result[15] = 1.0;
  return result;
};

/**
 * Computes an Array from the provided Matrix4 instance.
 * The array will be in column-major order.
 *
 * @param {Matrix4} matrix The matrix to use..
 * @param {number[]} [result] The Array onto which to store the result.
 * @returns {number[]} The modified Array parameter or a new Array instance if one was not provided.
 *
 * @example
 * //create an array from an instance of Matrix4
 * // m = [10.0, 14.0, 18.0, 22.0]
 * //     [11.0, 15.0, 19.0, 23.0]
 * //     [12.0, 16.0, 20.0, 24.0]
 * //     [13.0, 17.0, 21.0, 25.0]
 * const a = Cesium.Matrix4.toArray(m);
 *
 * // m remains the same
 * //creates a = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0]
 */
Matrix4.toArray = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[7],
      matrix[8],
      matrix[9],
      matrix[10],
      matrix[11],
      matrix[12],
      matrix[13],
      matrix[14],
      matrix[15],
    ];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};

/**
 * Computes the array index of the element at the provided row and column.
 *
 * @param {number} row The zero-based index of the row.
 * @param {number} column The zero-based index of the column.
 * @returns {number} The index of the element at the provided row and column.
 *
 * @exception {DeveloperError} row must be 0, 1, 2, or 3.
 * @exception {DeveloperError} column must be 0, 1, 2, or 3.
 *
 * @example
 * const myMatrix = new Cesium.Matrix4();
 * const column1Row0Index = Cesium.Matrix4.getElementIndex(1, 0);
 * const column1Row0 = myMatrix[column1Row0Index];
 * myMatrix[column1Row0Index] = 10.0;
 */
Matrix4.getElementIndex = function (column, row) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check.typeOf.number.lessThanOrEquals("row", row, 3);

  Check.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check.typeOf.number.lessThanOrEquals("column", column, 3);
  //>>includeEnd('debug');

  return column * 4 + row;
};

/**
 * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {number} index The zero-based index of the column to retrieve.
 * @param {Cartesian4} result The object onto which to store the result.
 * @returns {Cartesian4} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0, 1, 2, or 3.
 *
 * @example
 * //returns a Cartesian4 instance with values from the specified column
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * //Example 1: Creates an instance of Cartesian
 * const a = Cesium.Matrix4.getColumn(m, 2, new Cesium.Cartesian4());
 *
 * @example
 * //Example 2: Sets values for Cartesian instance
 * const a = new Cesium.Cartesian4();
 * Cesium.Matrix4.getColumn(m, 2, a);
 *
 * // a.x = 12.0; a.y = 16.0; a.z = 20.0; a.w = 24.0;
 */
Matrix4.getColumn = function (matrix, index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 3);

  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const startIndex = index * 4;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  const z = matrix[startIndex + 2];
  const w = matrix[startIndex + 3];

  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

/**
 * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian4 instance.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {number} index The zero-based index of the column to set.
 * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0, 1, 2, or 3.
 *
 * @example
 * //creates a new Matrix4 instance with new column values from the Cartesian4 instance
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * const a = Cesium.Matrix4.setColumn(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
 *
 * // m remains the same
 * // a = [10.0, 11.0, 99.0, 13.0]
 * //     [14.0, 15.0, 98.0, 17.0]
 * //     [18.0, 19.0, 97.0, 21.0]
 * //     [22.0, 23.0, 96.0, 25.0]
 */
Matrix4.setColumn = function (matrix, index, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 3);

  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result = Matrix4.clone(matrix, result);
  const startIndex = index * 4;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  result[startIndex + 2] = cartesian.z;
  result[startIndex + 3] = cartesian.w;
  return result;
};

/**
 * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {number} index The zero-based index of the row to retrieve.
 * @param {Cartesian4} result The object onto which to store the result.
 * @returns {Cartesian4} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0, 1, 2, or 3.
 *
 * @example
 * //returns a Cartesian4 instance with values from the specified column
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * //Example 1: Returns an instance of Cartesian
 * const a = Cesium.Matrix4.getRow(m, 2, new Cesium.Cartesian4());
 *
 * @example
 * //Example 2: Sets values for a Cartesian instance
 * const a = new Cesium.Cartesian4();
 * Cesium.Matrix4.getRow(m, 2, a);
 *
 * // a.x = 18.0; a.y = 19.0; a.z = 20.0; a.w = 21.0;
 */
Matrix4.getRow = function (matrix, index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 3);

  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const x = matrix[index];
  const y = matrix[index + 4];
  const z = matrix[index + 8];
  const w = matrix[index + 12];

  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

/**
 * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian4 instance.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {number} index The zero-based index of the row to set.
 * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0, 1, 2, or 3.
 *
 * @example
 * //create a new Matrix4 instance with new row values from the Cartesian4 instance
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * const a = Cesium.Matrix4.setRow(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
 *
 * // m remains the same
 * // a = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [99.0, 98.0, 97.0, 96.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 */
Matrix4.setRow = function (matrix, index, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 3);

  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result = Matrix4.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 4] = cartesian.y;
  result[index + 8] = cartesian.z;
  result[index + 12] = cartesian.w;
  return result;
};

/**
 * Computes a new matrix that replaces the translation in the rightmost column of the provided
 * matrix with the provided translation. This assumes the matrix is an affine transformation.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {Cartesian3} translation The translation that replaces the translation of the provided matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.setTranslation = function (matrix, translation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("translation", translation);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];

  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];

  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];

  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = matrix[15];

  return result;
};

const scaleScratch1 = new Cartesian3();

/**
 * Computes a new matrix that replaces the scale with the provided scale.
 * This assumes the matrix is an affine transformation.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {Cartesian3} scale The scale that replaces the scale of the provided matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @see Matrix4.setUniformScale
 * @see Matrix4.fromScale
 * @see Matrix4.fromUniformScale
 * @see Matrix4.multiplyByScale
 * @see Matrix4.multiplyByUniformScale
 * @see Matrix4.getScale
 */
Matrix4.setScale = function (matrix, scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("scale", scale);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const existingScale = Matrix4.getScale(matrix, scaleScratch1);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  const scaleRatioZ = scale.z / existingScale.z;

  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3];

  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioY;
  result[7] = matrix[7];

  result[8] = matrix[8] * scaleRatioZ;
  result[9] = matrix[9] * scaleRatioZ;
  result[10] = matrix[10] * scaleRatioZ;
  result[11] = matrix[11];

  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];

  return result;
};

const scaleScratch2 = new Cartesian3();

/**
 * Computes a new matrix that replaces the scale with the provided uniform scale.
 * This assumes the matrix is an affine transformation.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {number} scale The uniform scale that replaces the scale of the provided matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @see Matrix4.setScale
 * @see Matrix4.fromScale
 * @see Matrix4.fromUniformScale
 * @see Matrix4.multiplyByScale
 * @see Matrix4.multiplyByUniformScale
 * @see Matrix4.getScale
 */
Matrix4.setUniformScale = function (matrix, scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.number("scale", scale);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const existingScale = Matrix4.getScale(matrix, scaleScratch2);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  const scaleRatioZ = scale / existingScale.z;

  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3];

  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioY;
  result[7] = matrix[7];

  result[8] = matrix[8] * scaleRatioZ;
  result[9] = matrix[9] * scaleRatioZ;
  result[10] = matrix[10] * scaleRatioZ;
  result[11] = matrix[11];

  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];

  return result;
};

const scratchColumn = new Cartesian3();

/**
 * Extracts the non-uniform scale assuming the matrix is an affine transformation.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter
 *
 * @see Matrix4.multiplyByScale
 * @see Matrix4.multiplyByUniformScale
 * @see Matrix4.fromScale
 * @see Matrix4.fromUniformScale
 * @see Matrix4.setScale
 * @see Matrix4.setUniformScale
 */
Matrix4.getScale = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = Cartesian3.magnitude(
    Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn),
  );
  result.y = Cartesian3.magnitude(
    Cartesian3.fromElements(matrix[4], matrix[5], matrix[6], scratchColumn),
  );
  result.z = Cartesian3.magnitude(
    Cartesian3.fromElements(matrix[8], matrix[9], matrix[10], scratchColumn),
  );
  return result;
};

const scaleScratch3 = new Cartesian3();

/**
 * Computes the maximum scale assuming the matrix is an affine transformation.
 * The maximum scale is the maximum length of the column vectors in the upper-left
 * 3x3 matrix.
 *
 * @param {Matrix4} matrix The matrix.
 * @returns {number} The maximum scale.
 */
Matrix4.getMaximumScale = function (matrix) {
  Matrix4.getScale(matrix, scaleScratch3);
  return Cartesian3.maximumComponent(scaleScratch3);
};

const scaleScratch4 = new Cartesian3();

/**
 * Sets the rotation assuming the matrix is an affine transformation.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Matrix3} rotation The rotation matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @see Matrix4.fromRotation
 * @see Matrix4.getRotation
 */
Matrix4.setRotation = function (matrix, rotation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const scale = Matrix4.getScale(matrix, scaleScratch4);

  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.x;
  result[3] = matrix[3];

  result[4] = rotation[3] * scale.y;
  result[5] = rotation[4] * scale.y;
  result[6] = rotation[5] * scale.y;
  result[7] = matrix[7];

  result[8] = rotation[6] * scale.z;
  result[9] = rotation[7] * scale.z;
  result[10] = rotation[8] * scale.z;
  result[11] = matrix[11];

  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];

  return result;
};

const scaleScratch5 = new Cartesian3();

/**
 * Extracts the rotation matrix assuming the matrix is an affine transformation.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Matrix3} result The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter.
 *
 * @see Matrix4.setRotation
 * @see Matrix4.fromRotation
 */
Matrix4.getRotation = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const scale = Matrix4.getScale(matrix, scaleScratch5);

  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.x;

  result[3] = matrix[4] / scale.y;
  result[4] = matrix[5] / scale.y;
  result[5] = matrix[6] / scale.y;

  result[6] = matrix[8] / scale.z;
  result[7] = matrix[9] / scale.z;
  result[8] = matrix[10] / scale.z;

  return result;
};

/**
 * Computes the product of two matrices.
 *
 * @param {Matrix4} left The first matrix.
 * @param {Matrix4} right The second matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.multiply = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const left0 = left[0];
  const left1 = left[1];
  const left2 = left[2];
  const left3 = left[3];
  const left4 = left[4];
  const left5 = left[5];
  const left6 = left[6];
  const left7 = left[7];
  const left8 = left[8];
  const left9 = left[9];
  const left10 = left[10];
  const left11 = left[11];
  const left12 = left[12];
  const left13 = left[13];
  const left14 = left[14];
  const left15 = left[15];

  const right0 = right[0];
  const right1 = right[1];
  const right2 = right[2];
  const right3 = right[3];
  const right4 = right[4];
  const right5 = right[5];
  const right6 = right[6];
  const right7 = right[7];
  const right8 = right[8];
  const right9 = right[9];
  const right10 = right[10];
  const right11 = right[11];
  const right12 = right[12];
  const right13 = right[13];
  const right14 = right[14];
  const right15 = right[15];

  const column0Row0 =
    left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
  const column0Row1 =
    left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
  const column0Row2 =
    left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
  const column0Row3 =
    left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

  const column1Row0 =
    left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
  const column1Row1 =
    left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
  const column1Row2 =
    left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
  const column1Row3 =
    left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

  const column2Row0 =
    left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
  const column2Row1 =
    left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
  const column2Row2 =
    left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
  const column2Row3 =
    left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

  const column3Row0 =
    left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
  const column3Row1 =
    left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
  const column3Row2 =
    left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
  const column3Row3 =
    left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;

  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column0Row3;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = column1Row3;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = column3Row3;
  return result;
};

/**
 * Computes the sum of two matrices.
 *
 * @param {Matrix4} left The first matrix.
 * @param {Matrix4} right The second matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.add = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  result[4] = left[4] + right[4];
  result[5] = left[5] + right[5];
  result[6] = left[6] + right[6];
  result[7] = left[7] + right[7];
  result[8] = left[8] + right[8];
  result[9] = left[9] + right[9];
  result[10] = left[10] + right[10];
  result[11] = left[11] + right[11];
  result[12] = left[12] + right[12];
  result[13] = left[13] + right[13];
  result[14] = left[14] + right[14];
  result[15] = left[15] + right[15];
  return result;
};

/**
 * Computes the difference of two matrices.
 *
 * @param {Matrix4} left The first matrix.
 * @param {Matrix4} right The second matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.subtract = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  result[4] = left[4] - right[4];
  result[5] = left[5] - right[5];
  result[6] = left[6] - right[6];
  result[7] = left[7] - right[7];
  result[8] = left[8] - right[8];
  result[9] = left[9] - right[9];
  result[10] = left[10] - right[10];
  result[11] = left[11] - right[11];
  result[12] = left[12] - right[12];
  result[13] = left[13] - right[13];
  result[14] = left[14] - right[14];
  result[15] = left[15] - right[15];
  return result;
};

/**
 * Computes the product of two matrices assuming the matrices are affine transformation matrices,
 * where the upper left 3x3 elements are any matrix, and
 * the upper three elements in the fourth column are the translation.
 * The bottom row is assumed to be [0, 0, 0, 1].
 * The matrix is not verified to be in the proper form.
 * This method is faster than computing the product for general 4x4
 * matrices using {@link Matrix4.multiply}.
 *
 * @param {Matrix4} left The first matrix.
 * @param {Matrix4} right The second matrix.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * const m1 = new Cesium.Matrix4(1.0, 6.0, 7.0, 0.0, 2.0, 5.0, 8.0, 0.0, 3.0, 4.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0);
 * const m2 = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(1.0, 1.0, 1.0));
 * const m3 = Cesium.Matrix4.multiplyTransformation(m1, m2, new Cesium.Matrix4());
 */
Matrix4.multiplyTransformation = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const left0 = left[0];
  const left1 = left[1];
  const left2 = left[2];
  const left4 = left[4];
  const left5 = left[5];
  const left6 = left[6];
  const left8 = left[8];
  const left9 = left[9];
  const left10 = left[10];
  const left12 = left[12];
  const left13 = left[13];
  const left14 = left[14];

  const right0 = right[0];
  const right1 = right[1];
  const right2 = right[2];
  const right4 = right[4];
  const right5 = right[5];
  const right6 = right[6];
  const right8 = right[8];
  const right9 = right[9];
  const right10 = right[10];
  const right12 = right[12];
  const right13 = right[13];
  const right14 = right[14];

  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

  const column3Row0 =
    left0 * right12 + left4 * right13 + left8 * right14 + left12;
  const column3Row1 =
    left1 * right12 + left5 * right13 + left9 * right14 + left13;
  const column3Row2 =
    left2 * right12 + left6 * right13 + left10 * right14 + left14;

  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = 0.0;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = 0.0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = 0.0;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = 1.0;
  return result;
};

/**
 * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
 * by a 3x3 rotation matrix.  This is an optimization
 * for <code>Matrix4.multiply(m, Matrix4.fromRotationTranslation(rotation), m);</code> with less allocations and arithmetic operations.
 *
 * @param {Matrix4} matrix The matrix on the left-hand side.
 * @param {Matrix3} rotation The 3x3 rotation matrix on the right-hand side.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromRotationTranslation(rotation), m);
 * Cesium.Matrix4.multiplyByMatrix3(m, rotation, m);
 */
Matrix4.multiplyByMatrix3 = function (matrix, rotation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("rotation", rotation);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const left0 = matrix[0];
  const left1 = matrix[1];
  const left2 = matrix[2];
  const left4 = matrix[4];
  const left5 = matrix[5];
  const left6 = matrix[6];
  const left8 = matrix[8];
  const left9 = matrix[9];
  const left10 = matrix[10];

  const right0 = rotation[0];
  const right1 = rotation[1];
  const right2 = rotation[2];
  const right4 = rotation[3];
  const right5 = rotation[4];
  const right6 = rotation[5];
  const right8 = rotation[6];
  const right9 = rotation[7];
  const right10 = rotation[8];

  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = 0.0;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = 0.0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = 0.0;
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};

/**
 * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
 * by an implicit translation matrix defined by a {@link Cartesian3}.  This is an optimization
 * for <code>Matrix4.multiply(m, Matrix4.fromTranslation(position), m);</code> with less allocations and arithmetic operations.
 *
 * @param {Matrix4} matrix The matrix on the left-hand side.
 * @param {Cartesian3} translation The translation on the right-hand side.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromTranslation(position), m);
 * Cesium.Matrix4.multiplyByTranslation(m, position, m);
 */
Matrix4.multiplyByTranslation = function (matrix, translation, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("translation", translation);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const x = translation.x;
  const y = translation.y;
  const z = translation.z;

  const tx = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
  const ty = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
  const tz = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];

  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = tx;
  result[13] = ty;
  result[14] = tz;
  result[15] = matrix[15];
  return result;
};

/**
 * Multiplies an affine transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
 * by an implicit non-uniform scale matrix. This is an optimization
 * for <code>Matrix4.multiply(m, Matrix4.fromUniformScale(scale), m);</code>, where
 * <code>m</code> must be an affine matrix.
 * This function performs fewer allocations and arithmetic operations.
 *
 * @param {Matrix4} matrix The affine matrix on the left-hand side.
 * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 *
 * @example
 * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromScale(scale), m);
 * Cesium.Matrix4.multiplyByScale(m, scale, m);
 *
 * @see Matrix4.multiplyByUniformScale
 * @see Matrix4.fromScale
 * @see Matrix4.fromUniformScale
 * @see Matrix4.setScale
 * @see Matrix4.setUniformScale
 * @see Matrix4.getScale
 */
Matrix4.multiplyByScale = function (matrix, scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("scale", scale);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const scaleX = scale.x;
  const scaleY = scale.y;
  const scaleZ = scale.z;

  // Faster than Cartesian3.equals
  if (scaleX === 1.0 && scaleY === 1.0 && scaleZ === 1.0) {
    return Matrix4.clone(matrix, result);
  }

  result[0] = scaleX * matrix[0];
  result[1] = scaleX * matrix[1];
  result[2] = scaleX * matrix[2];
  result[3] = matrix[3];

  result[4] = scaleY * matrix[4];
  result[5] = scaleY * matrix[5];
  result[6] = scaleY * matrix[6];
  result[7] = matrix[7];

  result[8] = scaleZ * matrix[8];
  result[9] = scaleZ * matrix[9];
  result[10] = scaleZ * matrix[10];
  result[11] = matrix[11];

  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];

  return result;
};

/**
 * Computes the product of a matrix times a uniform scale, as if the scale were a scale matrix.
 *
 * @param {Matrix4} matrix The matrix on the left-hand side.
 * @param {number} scale The uniform scale on the right-hand side.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromUniformScale(scale), m);
 * Cesium.Matrix4.multiplyByUniformScale(m, scale, m);
 *
 * @see Matrix4.multiplyByScale
 * @see Matrix4.fromScale
 * @see Matrix4.fromUniformScale
 * @see Matrix4.setScale
 * @see Matrix4.setUniformScale
 * @see Matrix4.getScale
 */
Matrix4.multiplyByUniformScale = function (matrix, scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.number("scale", scale);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3];

  result[4] = matrix[4] * scale;
  result[5] = matrix[5] * scale;
  result[6] = matrix[6] * scale;
  result[7] = matrix[7];

  result[8] = matrix[8] * scale;
  result[9] = matrix[9] * scale;
  result[10] = matrix[10] * scale;
  result[11] = matrix[11];

  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];

  return result;
};

/**
 * Computes the product of a matrix and a column vector.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Cartesian4} cartesian The vector.
 * @param {Cartesian4} result The object onto which to store the result.
 * @returns {Cartesian4} The modified result parameter.
 */
Matrix4.multiplyByVector = function (matrix, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const vW = cartesian.w;

  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
  const w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};

/**
 * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4.multiplyByVector}
 * with a {@link Cartesian4} with a <code>w</code> component of zero.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Cartesian3} cartesian The point.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 *
 * @example
 * const p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
 * const result = Cesium.Matrix4.multiplyByPointAsVector(matrix, p, new Cesium.Cartesian3());
 * // A shortcut for
 * //   Cartesian3 p = ...
 * //   Cesium.Matrix4.multiplyByVector(matrix, new Cesium.Cartesian4(p.x, p.y, p.z, 0.0), result);
 */
Matrix4.multiplyByPointAsVector = function (matrix, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;

  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;

  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};

/**
 * Computes the product of a matrix and a {@link Cartesian3}. This is equivalent to calling {@link Matrix4.multiplyByVector}
 * with a {@link Cartesian4} with a <code>w</code> component of 1, but returns a {@link Cartesian3} instead of a {@link Cartesian4}.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {Cartesian3} cartesian The point.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 *
 * @example
 * const p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
 * const result = Cesium.Matrix4.multiplyByPoint(matrix, p, new Cesium.Cartesian3());
 */
Matrix4.multiplyByPoint = function (matrix, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;

  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];

  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};

/**
 * Computes the product of a matrix and a scalar.
 *
 * @param {Matrix4} matrix The matrix.
 * @param {number} scalar The number to multiply by.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * //create a Matrix4 instance which is a scaled version of the supplied Matrix4
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * const a = Cesium.Matrix4.multiplyByScalar(m, -2, new Cesium.Matrix4());
 *
 * // m remains the same
 * // a = [-20.0, -22.0, -24.0, -26.0]
 * //     [-28.0, -30.0, -32.0, -34.0]
 * //     [-36.0, -38.0, -40.0, -42.0]
 * //     [-44.0, -46.0, -48.0, -50.0]
 */
Matrix4.multiplyByScalar = function (matrix, scalar, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.number("scalar", scalar);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  result[4] = matrix[4] * scalar;
  result[5] = matrix[5] * scalar;
  result[6] = matrix[6] * scalar;
  result[7] = matrix[7] * scalar;
  result[8] = matrix[8] * scalar;
  result[9] = matrix[9] * scalar;
  result[10] = matrix[10] * scalar;
  result[11] = matrix[11] * scalar;
  result[12] = matrix[12] * scalar;
  result[13] = matrix[13] * scalar;
  result[14] = matrix[14] * scalar;
  result[15] = matrix[15] * scalar;
  return result;
};

/**
 * Computes a negated copy of the provided matrix.
 *
 * @param {Matrix4} matrix The matrix to negate.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * //create a new Matrix4 instance which is a negation of a Matrix4
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * const a = Cesium.Matrix4.negate(m, new Cesium.Matrix4());
 *
 * // m remains the same
 * // a = [-10.0, -11.0, -12.0, -13.0]
 * //     [-14.0, -15.0, -16.0, -17.0]
 * //     [-18.0, -19.0, -20.0, -21.0]
 * //     [-22.0, -23.0, -24.0, -25.0]
 */
Matrix4.negate = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  result[4] = -matrix[4];
  result[5] = -matrix[5];
  result[6] = -matrix[6];
  result[7] = -matrix[7];
  result[8] = -matrix[8];
  result[9] = -matrix[9];
  result[10] = -matrix[10];
  result[11] = -matrix[11];
  result[12] = -matrix[12];
  result[13] = -matrix[13];
  result[14] = -matrix[14];
  result[15] = -matrix[15];
  return result;
};

/**
 * Computes the transpose of the provided matrix.
 *
 * @param {Matrix4} matrix The matrix to transpose.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @example
 * //returns transpose of a Matrix4
 * // m = [10.0, 11.0, 12.0, 13.0]
 * //     [14.0, 15.0, 16.0, 17.0]
 * //     [18.0, 19.0, 20.0, 21.0]
 * //     [22.0, 23.0, 24.0, 25.0]
 *
 * const a = Cesium.Matrix4.transpose(m, new Cesium.Matrix4());
 *
 * // m remains the same
 * // a = [10.0, 14.0, 18.0, 22.0]
 * //     [11.0, 15.0, 19.0, 23.0]
 * //     [12.0, 16.0, 20.0, 24.0]
 * //     [13.0, 17.0, 21.0, 25.0]
 */
Matrix4.transpose = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const matrix1 = matrix[1];
  const matrix2 = matrix[2];
  const matrix3 = matrix[3];
  const matrix6 = matrix[6];
  const matrix7 = matrix[7];
  const matrix11 = matrix[11];

  result[0] = matrix[0];
  result[1] = matrix[4];
  result[2] = matrix[8];
  result[3] = matrix[12];
  result[4] = matrix1;
  result[5] = matrix[5];
  result[6] = matrix[9];
  result[7] = matrix[13];
  result[8] = matrix2;
  result[9] = matrix6;
  result[10] = matrix[10];
  result[11] = matrix[14];
  result[12] = matrix3;
  result[13] = matrix7;
  result[14] = matrix11;
  result[15] = matrix[15];
  return result;
};

/**
 * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
 *
 * @param {Matrix4} matrix The matrix with signed elements.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.abs = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);
  result[4] = Math.abs(matrix[4]);
  result[5] = Math.abs(matrix[5]);
  result[6] = Math.abs(matrix[6]);
  result[7] = Math.abs(matrix[7]);
  result[8] = Math.abs(matrix[8]);
  result[9] = Math.abs(matrix[9]);
  result[10] = Math.abs(matrix[10]);
  result[11] = Math.abs(matrix[11]);
  result[12] = Math.abs(matrix[12]);
  result[13] = Math.abs(matrix[13]);
  result[14] = Math.abs(matrix[14]);
  result[15] = Math.abs(matrix[15]);

  return result;
};

/**
 * Compares the provided matrices componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Matrix4} [left] The first matrix.
 * @param {Matrix4} [right] The second matrix.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 *
 * @example
 * //compares two Matrix4 instances
 *
 * // a = [10.0, 14.0, 18.0, 22.0]
 * //     [11.0, 15.0, 19.0, 23.0]
 * //     [12.0, 16.0, 20.0, 24.0]
 * //     [13.0, 17.0, 21.0, 25.0]
 *
 * // b = [10.0, 14.0, 18.0, 22.0]
 * //     [11.0, 15.0, 19.0, 23.0]
 * //     [12.0, 16.0, 20.0, 24.0]
 * //     [13.0, 17.0, 21.0, 25.0]
 *
 * if(Cesium.Matrix4.equals(a,b)) {
 *      console.log("Both matrices are equal");
 * } else {
 *      console.log("They are not equal");
 * }
 *
 * //Prints "Both matrices are equal" on the console
 */
Matrix4.equals = function (left, right) {
  // Given that most matrices will be transformation matrices, the elements
  // are tested in order such that the test is likely to fail as early
  // as possible.  I _think_ this is just as friendly to the L1 cache
  // as testing in index order.  It is certainty faster in practice.
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      // Translation
      left[12] === right[12] &&
      left[13] === right[13] &&
      left[14] === right[14] &&
      // Rotation/scale
      left[0] === right[0] &&
      left[1] === right[1] &&
      left[2] === right[2] &&
      left[4] === right[4] &&
      left[5] === right[5] &&
      left[6] === right[6] &&
      left[8] === right[8] &&
      left[9] === right[9] &&
      left[10] === right[10] &&
      // Bottom row
      left[3] === right[3] &&
      left[7] === right[7] &&
      left[11] === right[11] &&
      left[15] === right[15])
  );
};

/**
 * Compares the provided matrices componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Matrix4} [left] The first matrix.
 * @param {Matrix4} [right] The second matrix.
 * @param {number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 *
 * @example
 * //compares two Matrix4 instances
 *
 * // a = [10.5, 14.5, 18.5, 22.5]
 * //     [11.5, 15.5, 19.5, 23.5]
 * //     [12.5, 16.5, 20.5, 24.5]
 * //     [13.5, 17.5, 21.5, 25.5]
 *
 * // b = [10.0, 14.0, 18.0, 22.0]
 * //     [11.0, 15.0, 19.0, 23.0]
 * //     [12.0, 16.0, 20.0, 24.0]
 * //     [13.0, 17.0, 21.0, 25.0]
 *
 * if(Cesium.Matrix4.equalsEpsilon(a,b,0.1)){
 *      console.log("Difference between both the matrices is less than 0.1");
 * } else {
 *      console.log("Difference between both the matrices is not less than 0.1");
 * }
 *
 * //Prints "Difference between both the matrices is not less than 0.1" on the console
 */
Matrix4.equalsEpsilon = function (left, right, epsilon) {
  epsilon = defaultValue(epsilon, 0);

  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Math.abs(left[0] - right[0]) <= epsilon &&
      Math.abs(left[1] - right[1]) <= epsilon &&
      Math.abs(left[2] - right[2]) <= epsilon &&
      Math.abs(left[3] - right[3]) <= epsilon &&
      Math.abs(left[4] - right[4]) <= epsilon &&
      Math.abs(left[5] - right[5]) <= epsilon &&
      Math.abs(left[6] - right[6]) <= epsilon &&
      Math.abs(left[7] - right[7]) <= epsilon &&
      Math.abs(left[8] - right[8]) <= epsilon &&
      Math.abs(left[9] - right[9]) <= epsilon &&
      Math.abs(left[10] - right[10]) <= epsilon &&
      Math.abs(left[11] - right[11]) <= epsilon &&
      Math.abs(left[12] - right[12]) <= epsilon &&
      Math.abs(left[13] - right[13]) <= epsilon &&
      Math.abs(left[14] - right[14]) <= epsilon &&
      Math.abs(left[15] - right[15]) <= epsilon)
  );
};

/**
 * Gets the translation portion of the provided matrix, assuming the matrix is an affine transformation matrix.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {Cartesian3} result The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter.
 */
Matrix4.getTranslation = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = matrix[12];
  result.y = matrix[13];
  result.z = matrix[14];
  return result;
};

/**
 * Gets the upper left 3x3 matrix of the provided matrix.
 *
 * @param {Matrix4} matrix The matrix to use.
 * @param {Matrix3} result The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter.
 *
 * @example
 * // returns a Matrix3 instance from a Matrix4 instance
 *
 * // m = [10.0, 14.0, 18.0, 22.0]
 * //     [11.0, 15.0, 19.0, 23.0]
 * //     [12.0, 16.0, 20.0, 24.0]
 * //     [13.0, 17.0, 21.0, 25.0]
 *
 * const b = new Cesium.Matrix3();
 * Cesium.Matrix4.getMatrix3(m,b);
 *
 * // b = [10.0, 14.0, 18.0]
 * //     [11.0, 15.0, 19.0]
 * //     [12.0, 16.0, 20.0]
 */
Matrix4.getMatrix3 = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[4];
  result[4] = matrix[5];
  result[5] = matrix[6];
  result[6] = matrix[8];
  result[7] = matrix[9];
  result[8] = matrix[10];
  return result;
};

const scratchInverseRotation = new Matrix3();
const scratchMatrix3Zero = new Matrix3();
const scratchBottomRow = new Cartesian4();
const scratchExpectedBottomRow = new Cartesian4(0.0, 0.0, 0.0, 1.0);

/**
 * Computes the inverse of the provided matrix using Cramers Rule.
 * If the determinant is zero, the matrix can not be inverted, and an exception is thrown.
 * If the matrix is a proper rigid transformation, it is more efficient
 * to invert it with {@link Matrix4.inverseTransformation}.
 *
 * @param {Matrix4} matrix The matrix to invert.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 *
 * @exception {RuntimeError} matrix is not invertible because its determinate is zero.
 */
Matrix4.inverse = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');
  //
  // Ported from:
  //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
  //
  const src0 = matrix[0];
  const src1 = matrix[4];
  const src2 = matrix[8];
  const src3 = matrix[12];
  const src4 = matrix[1];
  const src5 = matrix[5];
  const src6 = matrix[9];
  const src7 = matrix[13];
  const src8 = matrix[2];
  const src9 = matrix[6];
  const src10 = matrix[10];
  const src11 = matrix[14];
  const src12 = matrix[3];
  const src13 = matrix[7];
  const src14 = matrix[11];
  const src15 = matrix[15];

  // calculate pairs for first 8 elements (cofactors)
  let tmp0 = src10 * src15;
  let tmp1 = src11 * src14;
  let tmp2 = src9 * src15;
  let tmp3 = src11 * src13;
  let tmp4 = src9 * src14;
  let tmp5 = src10 * src13;
  let tmp6 = src8 * src15;
  let tmp7 = src11 * src12;
  let tmp8 = src8 * src14;
  let tmp9 = src10 * src12;
  let tmp10 = src8 * src13;
  let tmp11 = src9 * src12;

  // calculate first 8 elements (cofactors)
  const dst0 =
    tmp0 * src5 +
    tmp3 * src6 +
    tmp4 * src7 -
    (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
  const dst1 =
    tmp1 * src4 +
    tmp6 * src6 +
    tmp9 * src7 -
    (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
  const dst2 =
    tmp2 * src4 +
    tmp7 * src5 +
    tmp10 * src7 -
    (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
  const dst3 =
    tmp5 * src4 +
    tmp8 * src5 +
    tmp11 * src6 -
    (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
  const dst4 =
    tmp1 * src1 +
    tmp2 * src2 +
    tmp5 * src3 -
    (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
  const dst5 =
    tmp0 * src0 +
    tmp7 * src2 +
    tmp8 * src3 -
    (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
  const dst6 =
    tmp3 * src0 +
    tmp6 * src1 +
    tmp11 * src3 -
    (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
  const dst7 =
    tmp4 * src0 +
    tmp9 * src1 +
    tmp10 * src2 -
    (tmp5 * src0 + tmp8 * src1 + tmp11 * src2);

  // calculate pairs for second 8 elements (cofactors)
  tmp0 = src2 * src7;
  tmp1 = src3 * src6;
  tmp2 = src1 * src7;
  tmp3 = src3 * src5;
  tmp4 = src1 * src6;
  tmp5 = src2 * src5;
  tmp6 = src0 * src7;
  tmp7 = src3 * src4;
  tmp8 = src0 * src6;
  tmp9 = src2 * src4;
  tmp10 = src0 * src5;
  tmp11 = src1 * src4;

  // calculate second 8 elements (cofactors)
  const dst8 =
    tmp0 * src13 +
    tmp3 * src14 +
    tmp4 * src15 -
    (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
  const dst9 =
    tmp1 * src12 +
    tmp6 * src14 +
    tmp9 * src15 -
    (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
  const dst10 =
    tmp2 * src12 +
    tmp7 * src13 +
    tmp10 * src15 -
    (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
  const dst11 =
    tmp5 * src12 +
    tmp8 * src13 +
    tmp11 * src14 -
    (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
  const dst12 =
    tmp2 * src10 +
    tmp5 * src11 +
    tmp1 * src9 -
    (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
  const dst13 =
    tmp8 * src11 +
    tmp0 * src8 +
    tmp7 * src10 -
    (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
  const dst14 =
    tmp6 * src9 +
    tmp11 * src11 +
    tmp3 * src8 -
    (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
  const dst15 =
    tmp10 * src10 +
    tmp4 * src8 +
    tmp9 * src9 -
    (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);

  // calculate determinant
  let det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;

  if (Math.abs(det) < CesiumMath.EPSILON21) {
    // Special case for a zero scale matrix that can occur, for example,
    // when a model's node has a [0, 0, 0] scale.
    if (
      Matrix3.equalsEpsilon(
        Matrix4.getMatrix3(matrix, scratchInverseRotation),
        scratchMatrix3Zero,
        CesiumMath.EPSILON7,
      ) &&
      Cartesian4.equals(
        Matrix4.getRow(matrix, 3, scratchBottomRow),
        scratchExpectedBottomRow,
      )
    ) {
      result[0] = 0.0;
      result[1] = 0.0;
      result[2] = 0.0;
      result[3] = 0.0;
      result[4] = 0.0;
      result[5] = 0.0;
      result[6] = 0.0;
      result[7] = 0.0;
      result[8] = 0.0;
      result[9] = 0.0;
      result[10] = 0.0;
      result[11] = 0.0;
      result[12] = -matrix[12];
      result[13] = -matrix[13];
      result[14] = -matrix[14];
      result[15] = 1.0;
      return result;
    }

    throw new RuntimeError(
      "matrix is not invertible because its determinate is zero.",
    );
  }

  // calculate matrix inverse
  det = 1.0 / det;

  result[0] = dst0 * det;
  result[1] = dst1 * det;
  result[2] = dst2 * det;
  result[3] = dst3 * det;
  result[4] = dst4 * det;
  result[5] = dst5 * det;
  result[6] = dst6 * det;
  result[7] = dst7 * det;
  result[8] = dst8 * det;
  result[9] = dst9 * det;
  result[10] = dst10 * det;
  result[11] = dst11 * det;
  result[12] = dst12 * det;
  result[13] = dst13 * det;
  result[14] = dst14 * det;
  result[15] = dst15 * det;
  return result;
};

/**
 * Computes the inverse of the provided matrix assuming it is a proper rigid matrix,
 * where the upper left 3x3 elements are a rotation matrix,
 * and the upper three elements in the fourth column are the translation.
 * The bottom row is assumed to be [0, 0, 0, 1].
 * The matrix is not verified to be in the proper form.
 * This method is faster than computing the inverse for a general 4x4
 * matrix using {@link Matrix4.inverse}.
 *
 * @param {Matrix4} matrix The matrix to invert.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.inverseTransformation = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  //This function is an optimized version of the below 4 lines.
  //const rT = Matrix3.transpose(Matrix4.getMatrix3(matrix));
  //const rTN = Matrix3.negate(rT);
  //const rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
  //return Matrix4.fromRotationTranslation(rT, rTT, result);

  const matrix0 = matrix[0];
  const matrix1 = matrix[1];
  const matrix2 = matrix[2];
  const matrix4 = matrix[4];
  const matrix5 = matrix[5];
  const matrix6 = matrix[6];
  const matrix8 = matrix[8];
  const matrix9 = matrix[9];
  const matrix10 = matrix[10];

  const vX = matrix[12];
  const vY = matrix[13];
  const vZ = matrix[14];

  const x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
  const y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
  const z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

  result[0] = matrix0;
  result[1] = matrix4;
  result[2] = matrix8;
  result[3] = 0.0;
  result[4] = matrix1;
  result[5] = matrix5;
  result[6] = matrix9;
  result[7] = 0.0;
  result[8] = matrix2;
  result[9] = matrix6;
  result[10] = matrix10;
  result[11] = 0.0;
  result[12] = x;
  result[13] = y;
  result[14] = z;
  result[15] = 1.0;
  return result;
};

const scratchTransposeMatrix = new Matrix4();

/**
 * Computes the inverse transpose of a matrix.
 *
 * @param {Matrix4} matrix The matrix to transpose and invert.
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
Matrix4.inverseTranspose = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  return Matrix4.inverse(
    Matrix4.transpose(matrix, scratchTransposeMatrix),
    result,
  );
};

/**
 * An immutable Matrix4 instance initialized to the identity matrix.
 *
 * @type {Matrix4}
 * @constant
 */
Matrix4.IDENTITY = Object.freeze(
  new Matrix4(
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
  ),
);

/**
 * An immutable Matrix4 instance initialized to the zero matrix.
 *
 * @type {Matrix4}
 * @constant
 */
Matrix4.ZERO = Object.freeze(
  new Matrix4(
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
  ),
);

/**
 * The index into Matrix4 for column 0, row 0.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN0ROW0 = 0;

/**
 * The index into Matrix4 for column 0, row 1.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN0ROW1 = 1;

/**
 * The index into Matrix4 for column 0, row 2.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN0ROW2 = 2;

/**
 * The index into Matrix4 for column 0, row 3.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN0ROW3 = 3;

/**
 * The index into Matrix4 for column 1, row 0.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN1ROW0 = 4;

/**
 * The index into Matrix4 for column 1, row 1.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN1ROW1 = 5;

/**
 * The index into Matrix4 for column 1, row 2.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN1ROW2 = 6;

/**
 * The index into Matrix4 for column 1, row 3.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN1ROW3 = 7;

/**
 * The index into Matrix4 for column 2, row 0.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN2ROW0 = 8;

/**
 * The index into Matrix4 for column 2, row 1.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN2ROW1 = 9;

/**
 * The index into Matrix4 for column 2, row 2.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN2ROW2 = 10;

/**
 * The index into Matrix4 for column 2, row 3.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN2ROW3 = 11;

/**
 * The index into Matrix4 for column 3, row 0.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN3ROW0 = 12;

/**
 * The index into Matrix4 for column 3, row 1.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN3ROW1 = 13;

/**
 * The index into Matrix4 for column 3, row 2.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN3ROW2 = 14;

/**
 * The index into Matrix4 for column 3, row 3.
 *
 * @type {number}
 * @constant
 */
Matrix4.COLUMN3ROW3 = 15;

Object.defineProperties(Matrix4.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix4.prototype
   *
   * @type {number}
   */
  length: {
    get: function () {
      return Matrix4.packedLength;
    },
  },
});

/**
 * Duplicates the provided Matrix4 instance.
 *
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
 */
Matrix4.prototype.clone = function (result) {
  return Matrix4.clone(this, result);
};

/**
 * Compares this matrix to the provided matrix componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Matrix4} [right] The right hand side matrix.
 * @returns {boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
Matrix4.prototype.equals = function (right) {
  return Matrix4.equals(this, right);
};

/**
 * @private
 */
Matrix4.equalsArray = function (matrix, array, offset) {
  return (
    matrix[0] === array[offset] &&
    matrix[1] === array[offset + 1] &&
    matrix[2] === array[offset + 2] &&
    matrix[3] === array[offset + 3] &&
    matrix[4] === array[offset + 4] &&
    matrix[5] === array[offset + 5] &&
    matrix[6] === array[offset + 6] &&
    matrix[7] === array[offset + 7] &&
    matrix[8] === array[offset + 8] &&
    matrix[9] === array[offset + 9] &&
    matrix[10] === array[offset + 10] &&
    matrix[11] === array[offset + 11] &&
    matrix[12] === array[offset + 12] &&
    matrix[13] === array[offset + 13] &&
    matrix[14] === array[offset + 14] &&
    matrix[15] === array[offset + 15]
  );
};

/**
 * Compares this matrix to the provided matrix componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Matrix4} [right] The right hand side matrix.
 * @param {number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
 */
Matrix4.prototype.equalsEpsilon = function (right, epsilon) {
  return Matrix4.equalsEpsilon(this, right, epsilon);
};

/**
 * Computes a string representing this Matrix with each row being
 * on a separate line and in the format '(column0, column1, column2, column3)'.
 *
 * @returns {string} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2, column3)'.
 */
Matrix4.prototype.toString = function () {
  return (
    `(${this[0]}, ${this[4]}, ${this[8]}, ${this[12]})\n` +
    `(${this[1]}, ${this[5]}, ${this[9]}, ${this[13]})\n` +
    `(${this[2]}, ${this[6]}, ${this[10]}, ${this[14]})\n` +
    `(${this[3]}, ${this[7]}, ${this[11]}, ${this[15]})`
  );
};
export default Matrix4;
