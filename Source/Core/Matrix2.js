import Cartesian2 from "./Cartesian2.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * A 2x2 matrix, indexable as a column-major order array.
 * Constructor parameters are in row-major order for code readability.
 * @alias Matrix2
 * @constructor
 * @implements {ArrayLike<number>}
 *
 * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
 * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
 * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
 * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
 *
 * @see Matrix2.fromColumnMajorArray
 * @see Matrix2.fromRowMajorArray
 * @see Matrix2.fromScale
 * @see Matrix2.fromUniformScale
 * @see Matrix3
 * @see Matrix4
 */
function Matrix2(column0Row0, column1Row0, column0Row1, column1Row1) {
  this[0] = defaultValue(column0Row0, 0.0);
  this[1] = defaultValue(column0Row1, 0.0);
  this[2] = defaultValue(column1Row0, 0.0);
  this[3] = defaultValue(column1Row1, 0.0);
}

/**
 * The number of elements used to pack the object into an array.
 * @type {Number}
 */
Matrix2.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Matrix2} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
Matrix2.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Matrix2} [result] The object into which to store the result.
 * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided.
 */
Matrix2.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new Matrix2();
  }

  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  return result;
};

/**
 * Flattens an array of Matrix2s into an array of components. The components
 * are stored in column-major order.
 *
 * @param {Matrix2[]} array The array of matrices to pack.
 * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 4 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 4) elements.
 * @returns {Number[]} The packed array.
 */
Matrix2.packArray = function (array, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  const length = array.length;
  const resultLength = length * 4;
  if (!defined(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "If result is a typed array, it must have exactly array.length * 4 elements"
    );
    //>>includeEnd('debug');
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }

  for (let i = 0; i < length; ++i) {
    Matrix2.pack(array[i], result, i * 4);
  }
  return result;
};

/**
 * Unpacks an array of column-major matrix components into an array of Matrix2s.
 *
 * @param {Number[]} array The array of components to unpack.
 * @param {Matrix2[]} [result] The array onto which to store the result.
 * @returns {Matrix2[]} The unpacked array.
 */
Matrix2.unpackArray = function (array, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
  if (array.length % 4 !== 0) {
    throw new DeveloperError("array length must be a multiple of 4.");
  }
  //>>includeEnd('debug');

  const length = array.length;
  if (!defined(result)) {
    result = new Array(length / 4);
  } else {
    result.length = length / 4;
  }

  for (let i = 0; i < length; i += 4) {
    const index = i / 4;
    result[index] = Matrix2.unpack(array, i, result[index]);
  }
  return result;
};

/**
 * Duplicates a Matrix2 instance.
 *
 * @param {Matrix2} matrix The matrix to duplicate.
 * @param {Matrix2} [result] The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided. (Returns undefined if matrix is undefined)
 */
Matrix2.clone = function (matrix, result) {
  if (!defined(matrix)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Matrix2(matrix[0], matrix[2], matrix[1], matrix[3]);
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  return result;
};

/**
 * Creates a Matrix2 from 4 consecutive elements in an array.
 *
 * @param {Number[]} array The array whose 4 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
 * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
 * @param {Matrix2} [result] The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided.
 *
 * @example
 * // Create the Matrix2:
 * // [1.0, 2.0]
 * // [1.0, 2.0]
 *
 * const v = [1.0, 1.0, 2.0, 2.0];
 * const m = Cesium.Matrix2.fromArray(v);
 *
 * // Create same Matrix2 with using an offset into an array
 * const v2 = [0.0, 0.0, 1.0, 1.0, 2.0, 2.0];
 * const m2 = Cesium.Matrix2.fromArray(v2, 2);
 */
Matrix2.fromArray = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new Matrix2();
  }

  result[0] = array[startingIndex];
  result[1] = array[startingIndex + 1];
  result[2] = array[startingIndex + 2];
  result[3] = array[startingIndex + 3];
  return result;
};

/**
 * Creates a Matrix2 instance from a column-major order array.
 *
 * @param {Number[]} values The column-major order array.
 * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
 */
Matrix2.fromColumnMajorArray = function (values, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("values", values);
  //>>includeEnd('debug');

  return Matrix2.clone(values, result);
};

/**
 * Creates a Matrix2 instance from a row-major order array.
 * The resulting matrix will be in column-major order.
 *
 * @param {Number[]} values The row-major order array.
 * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
 */
Matrix2.fromRowMajorArray = function (values, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("values", values);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Matrix2(values[0], values[1], values[2], values[3]);
  }
  result[0] = values[0];
  result[1] = values[2];
  result[2] = values[1];
  result[3] = values[3];
  return result;
};

/**
 * Computes a Matrix2 instance representing a non-uniform scale.
 *
 * @param {Cartesian2} scale The x and y scale factors.
 * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
 *
 * @example
 * // Creates
 * //   [7.0, 0.0]
 * //   [0.0, 8.0]
 * const m = Cesium.Matrix2.fromScale(new Cesium.Cartesian2(7.0, 8.0));
 */
Matrix2.fromScale = function (scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scale", scale);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Matrix2(scale.x, 0.0, 0.0, scale.y);
  }

  result[0] = scale.x;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = scale.y;
  return result;
};

/**
 * Computes a Matrix2 instance representing a uniform scale.
 *
 * @param {Number} scale The uniform scale factor.
 * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
 *
 * @example
 * // Creates
 * //   [2.0, 0.0]
 * //   [0.0, 2.0]
 * const m = Cesium.Matrix2.fromUniformScale(2.0);
 */
Matrix2.fromUniformScale = function (scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("scale", scale);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Matrix2(scale, 0.0, 0.0, scale);
  }

  result[0] = scale;
  result[1] = 0.0;
  result[2] = 0.0;
  result[3] = scale;
  return result;
};

/**
 * Creates a rotation matrix.
 *
 * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
 * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
 * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
 *
 * @example
 * // Rotate a point 45 degrees counterclockwise.
 * const p = new Cesium.Cartesian2(5, 6);
 * const m = Cesium.Matrix2.fromRotation(Cesium.Math.toRadians(45.0));
 * const rotated = Cesium.Matrix2.multiplyByVector(m, p, new Cesium.Cartesian2());
 */
Matrix2.fromRotation = function (angle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("angle", angle);
  //>>includeEnd('debug');

  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  if (!defined(result)) {
    return new Matrix2(cosAngle, -sinAngle, sinAngle, cosAngle);
  }
  result[0] = cosAngle;
  result[1] = sinAngle;
  result[2] = -sinAngle;
  result[3] = cosAngle;
  return result;
};

/**
 * Creates an Array from the provided Matrix2 instance.
 * The array will be in column-major order.
 *
 * @param {Matrix2} matrix The matrix to use..
 * @param {Number[]} [result] The Array onto which to store the result.
 * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
 */
Matrix2.toArray = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return [matrix[0], matrix[1], matrix[2], matrix[3]];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  return result;
};

/**
 * Computes the array index of the element at the provided row and column.
 *
 * @param {Number} row The zero-based index of the row.
 * @param {Number} column The zero-based index of the column.
 * @returns {Number} The index of the element at the provided row and column.
 *
 * @exception {DeveloperError} row must be 0 or 1.
 * @exception {DeveloperError} column must be 0 or 1.
 *
 * @example
 * const myMatrix = new Cesium.Matrix2();
 * const column1Row0Index = Cesium.Matrix2.getElementIndex(1, 0);
 * const column1Row0 = myMatrix[column1Row0Index]
 * myMatrix[column1Row0Index] = 10.0;
 */
Matrix2.getElementIndex = function (column, row) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check.typeOf.number.lessThanOrEquals("row", row, 1);

  Check.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check.typeOf.number.lessThanOrEquals("column", column, 1);
  //>>includeEnd('debug');

  return column * 2 + row;
};

/**
 * Retrieves a copy of the matrix column at the provided index as a Cartesian2 instance.
 *
 * @param {Matrix2} matrix The matrix to use.
 * @param {Number} index The zero-based index of the column to retrieve.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0 or 1.
 */
Matrix2.getColumn = function (matrix, index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 1);

  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const startIndex = index * 2;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];

  result.x = x;
  result.y = y;
  return result;
};

/**
 * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian2 instance.
 *
 * @param {Matrix2} matrix The matrix to use.
 * @param {Number} index The zero-based index of the column to set.
 * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified column.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0 or 1.
 */
Matrix2.setColumn = function (matrix, index, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 1);

  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result = Matrix2.clone(matrix, result);
  const startIndex = index * 2;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  return result;
};

/**
 * Retrieves a copy of the matrix row at the provided index as a Cartesian2 instance.
 *
 * @param {Matrix2} matrix The matrix to use.
 * @param {Number} index The zero-based index of the row to retrieve.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0 or 1.
 */
Matrix2.getRow = function (matrix, index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 1);

  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const x = matrix[index];
  const y = matrix[index + 2];

  result.x = x;
  result.y = y;
  return result;
};

/**
 * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian2 instance.
 *
 * @param {Matrix2} matrix The matrix to use.
 * @param {Number} index The zero-based index of the row to set.
 * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified row.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 *
 * @exception {DeveloperError} index must be 0 or 1.
 */
Matrix2.setRow = function (matrix, index, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);

  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.lessThanOrEquals("index", index, 1);

  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result = Matrix2.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 2] = cartesian.y;
  return result;
};

const scratchColumn = new Cartesian2();

/**
 * Extracts the non-uniform scale assuming the matrix is an affine transformation.
 *
 * @param {Matrix2} matrix The matrix.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter.
 */
Matrix2.getScale = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result.x = Cartesian2.magnitude(
    Cartesian2.fromElements(matrix[0], matrix[1], scratchColumn)
  );
  result.y = Cartesian2.magnitude(
    Cartesian2.fromElements(matrix[2], matrix[3], scratchColumn)
  );
  return result;
};

const scratchScale = new Cartesian2();

/**
 * Computes the maximum scale assuming the matrix is an affine transformation.
 * The maximum scale is the maximum length of the column vectors.
 *
 * @param {Matrix2} matrix The matrix.
 * @returns {Number} The maximum scale.
 */
Matrix2.getMaximumScale = function (matrix) {
  Matrix2.getScale(matrix, scratchScale);
  return Cartesian2.maximumComponent(scratchScale);
};

/**
 * Computes the product of two matrices.
 *
 * @param {Matrix2} left The first matrix.
 * @param {Matrix2} right The second matrix.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.multiply = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const column0Row0 = left[0] * right[0] + left[2] * right[1];
  const column1Row0 = left[0] * right[2] + left[2] * right[3];
  const column0Row1 = left[1] * right[0] + left[3] * right[1];
  const column1Row1 = left[1] * right[2] + left[3] * right[3];

  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column1Row0;
  result[3] = column1Row1;
  return result;
};

/**
 * Computes the sum of two matrices.
 *
 * @param {Matrix2} left The first matrix.
 * @param {Matrix2} right The second matrix.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.add = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  return result;
};

/**
 * Computes the difference of two matrices.
 *
 * @param {Matrix2} left The first matrix.
 * @param {Matrix2} right The second matrix.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.subtract = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  return result;
};

/**
 * Computes the product of a matrix and a column vector.
 *
 * @param {Matrix2} matrix The matrix.
 * @param {Cartesian2} cartesian The column.
 * @param {Cartesian2} result The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter.
 */
Matrix2.multiplyByVector = function (matrix, cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("cartesian", cartesian);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const x = matrix[0] * cartesian.x + matrix[2] * cartesian.y;
  const y = matrix[1] * cartesian.x + matrix[3] * cartesian.y;

  result.x = x;
  result.y = y;
  return result;
};

/**
 * Computes the product of a matrix and a scalar.
 *
 * @param {Matrix2} matrix The matrix.
 * @param {Number} scalar The number to multiply by.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.multiplyByScalar = function (matrix, scalar, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.number("scalar", scalar);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  return result;
};

/**
 * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
 *
 * @param {Matrix2} matrix The matrix on the left-hand side.
 * @param {Cartesian2} scale The non-uniform scale on the right-hand side.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 *
 *
 * @example
 * // Instead of Cesium.Matrix2.multiply(m, Cesium.Matrix2.fromScale(scale), m);
 * Cesium.Matrix2.multiplyByScale(m, scale, m);
 *
 * @see Matrix2.fromScale
 * @see Matrix2.multiplyByUniformScale
 */
Matrix2.multiplyByScale = function (matrix, scale, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("scale", scale);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = matrix[0] * scale.x;
  result[1] = matrix[1] * scale.x;
  result[2] = matrix[2] * scale.y;
  result[3] = matrix[3] * scale.y;
  return result;
};

/**
 * Creates a negated copy of the provided matrix.
 *
 * @param {Matrix2} matrix The matrix to negate.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.negate = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  return result;
};

/**
 * Computes the transpose of the provided matrix.
 *
 * @param {Matrix2} matrix The matrix to transpose.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.transpose = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const column0Row0 = matrix[0];
  const column0Row1 = matrix[2];
  const column1Row0 = matrix[1];
  const column1Row1 = matrix[3];

  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column1Row0;
  result[3] = column1Row1;
  return result;
};

/**
 * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
 *
 * @param {Matrix2} matrix The matrix with signed elements.
 * @param {Matrix2} result The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter.
 */
Matrix2.abs = function (matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("matrix", matrix);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);

  return result;
};

/**
 * Compares the provided matrices componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Matrix2} [left] The first matrix.
 * @param {Matrix2} [right] The second matrix.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Matrix2.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left[0] === right[0] &&
      left[1] === right[1] &&
      left[2] === right[2] &&
      left[3] === right[3])
  );
};

/**
 * @private
 */
Matrix2.equalsArray = function (matrix, array, offset) {
  return (
    matrix[0] === array[offset] &&
    matrix[1] === array[offset + 1] &&
    matrix[2] === array[offset + 2] &&
    matrix[3] === array[offset + 3]
  );
};

/**
 * Compares the provided matrices componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Matrix2} [left] The first matrix.
 * @param {Matrix2} [right] The second matrix.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Matrix2.equalsEpsilon = function (left, right, epsilon) {
  epsilon = defaultValue(epsilon, 0);
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Math.abs(left[0] - right[0]) <= epsilon &&
      Math.abs(left[1] - right[1]) <= epsilon &&
      Math.abs(left[2] - right[2]) <= epsilon &&
      Math.abs(left[3] - right[3]) <= epsilon)
  );
};

/**
 * An immutable Matrix2 instance initialized to the identity matrix.
 *
 * @type {Matrix2}
 * @constant
 */
Matrix2.IDENTITY = Object.freeze(new Matrix2(1.0, 0.0, 0.0, 1.0));

/**
 * An immutable Matrix2 instance initialized to the zero matrix.
 *
 * @type {Matrix2}
 * @constant
 */
Matrix2.ZERO = Object.freeze(new Matrix2(0.0, 0.0, 0.0, 0.0));

/**
 * The index into Matrix2 for column 0, row 0.
 *
 * @type {Number}
 * @constant
 *
 * @example
 * const matrix = new Cesium.Matrix2();
 * matrix[Cesium.Matrix2.COLUMN0ROW0] = 5.0; // set column 0, row 0 to 5.0
 */
Matrix2.COLUMN0ROW0 = 0;

/**
 * The index into Matrix2 for column 0, row 1.
 *
 * @type {Number}
 * @constant
 *
 * @example
 * const matrix = new Cesium.Matrix2();
 * matrix[Cesium.Matrix2.COLUMN0ROW1] = 5.0; // set column 0, row 1 to 5.0
 */
Matrix2.COLUMN0ROW1 = 1;

/**
 * The index into Matrix2 for column 1, row 0.
 *
 * @type {Number}
 * @constant
 *
 * @example
 * const matrix = new Cesium.Matrix2();
 * matrix[Cesium.Matrix2.COLUMN1ROW0] = 5.0; // set column 1, row 0 to 5.0
 */
Matrix2.COLUMN1ROW0 = 2;

/**
 * The index into Matrix2 for column 1, row 1.
 *
 * @type {Number}
 * @constant
 *
 * @example
 * const matrix = new Cesium.Matrix2();
 * matrix[Cesium.Matrix2.COLUMN1ROW1] = 5.0; // set column 1, row 1 to 5.0
 */
Matrix2.COLUMN1ROW1 = 3;

Object.defineProperties(Matrix2.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix2.prototype
   *
   * @type {Number}
   */
  length: {
    get: function () {
      return Matrix2.packedLength;
    },
  },
});

/**
 * Duplicates the provided Matrix2 instance.
 *
 * @param {Matrix2} [result] The object onto which to store the result.
 * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided.
 */
Matrix2.prototype.clone = function (result) {
  return Matrix2.clone(this, result);
};

/**
 * Compares this matrix to the provided matrix componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Matrix2} [right] The right hand side matrix.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
Matrix2.prototype.equals = function (right) {
  return Matrix2.equals(this, right);
};

/**
 * Compares this matrix to the provided matrix componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Matrix2} [right] The right hand side matrix.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
 */
Matrix2.prototype.equalsEpsilon = function (right, epsilon) {
  return Matrix2.equalsEpsilon(this, right, epsilon);
};

/**
 * Creates a string representing this Matrix with each row being
 * on a separate line and in the format '(column0, column1)'.
 *
 * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1)'.
 */
Matrix2.prototype.toString = function () {
  return `(${this[0]}, ${this[2]})\n` + `(${this[1]}, ${this[3]})`;
};
export default Matrix2;
