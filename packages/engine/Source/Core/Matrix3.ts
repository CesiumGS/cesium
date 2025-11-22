import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * Interface for Quaternion-like objects used in Matrix3 operations
 */
interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Interface for HeadingPitchRoll-like objects used in Matrix3 operations
 */
interface HeadingPitchRollLike {
  heading: number;
  pitch: number;
  roll: number;
}

/**
 * Interface for Cartesian3-like objects used in Matrix3 operations
 */
interface Cartesian3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Result type for eigen decomposition
 */
interface EigenDecompositionResult {
  unitary: Matrix3;
  diagonal: Matrix3;
}

/**
 * A 3x3 matrix, indexable as a column-major order array.
 * Constructor parameters are in row-major order for code readability.
 * @alias Matrix3
 */
class Matrix3 {
  /**
   * Matrix element storage with index signature for array-like access
   */
  [index: number]: number;

  /**
   * The number of elements used to pack the object into an array.
   */
  static readonly packedLength: number = 9;

  /**
   * An immutable Matrix3 instance initialized to the identity matrix.
   */
  static readonly IDENTITY: Readonly<Matrix3> = Object.freeze(
    new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0)
  );

  /**
   * An immutable Matrix3 instance initialized to the zero matrix.
   */
  static readonly ZERO: Readonly<Matrix3> = Object.freeze(
    new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
  );

  /**
   * The index into Matrix3 for column 0, row 0.
   */
  static readonly COLUMN0ROW0: number = 0;

  /**
   * The index into Matrix3 for column 0, row 1.
   */
  static readonly COLUMN0ROW1: number = 1;

  /**
   * The index into Matrix3 for column 0, row 2.
   */
  static readonly COLUMN0ROW2: number = 2;

  /**
   * The index into Matrix3 for column 1, row 0.
   */
  static readonly COLUMN1ROW0: number = 3;

  /**
   * The index into Matrix3 for column 1, row 1.
   */
  static readonly COLUMN1ROW1: number = 4;

  /**
   * The index into Matrix3 for column 1, row 2.
   */
  static readonly COLUMN1ROW2: number = 5;

  /**
   * The index into Matrix3 for column 2, row 0.
   */
  static readonly COLUMN2ROW0: number = 6;

  /**
   * The index into Matrix3 for column 2, row 1.
   */
  static readonly COLUMN2ROW1: number = 7;

  /**
   * The index into Matrix3 for column 2, row 2.
   */
  static readonly COLUMN2ROW2: number = 8;

  /**
   * Creates a new Matrix3 instance.
   * Constructor parameters are in row-major order for code readability.
   *
   * @param column0Row0 - The value for column 0, row 0.
   * @param column1Row0 - The value for column 1, row 0.
   * @param column2Row0 - The value for column 2, row 0.
   * @param column0Row1 - The value for column 0, row 1.
   * @param column1Row1 - The value for column 1, row 1.
   * @param column2Row1 - The value for column 2, row 1.
   * @param column0Row2 - The value for column 0, row 2.
   * @param column1Row2 - The value for column 1, row 2.
   * @param column2Row2 - The value for column 2, row 2.
   *
   * @see Matrix3.fromArray
   * @see Matrix3.fromColumnMajorArray
   * @see Matrix3.fromRowMajorArray
   * @see Matrix3.fromQuaternion
   * @see Matrix3.fromHeadingPitchRoll
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.fromCrossProduct
   * @see Matrix3.fromRotationX
   * @see Matrix3.fromRotationY
   * @see Matrix3.fromRotationZ
   * @see Matrix2
   * @see Matrix4
   */
  constructor(
    column0Row0: number = 0.0,
    column1Row0: number = 0.0,
    column2Row0: number = 0.0,
    column0Row1: number = 0.0,
    column1Row1: number = 0.0,
    column2Row1: number = 0.0,
    column0Row2: number = 0.0,
    column1Row2: number = 0.0,
    column2Row2: number = 0.0
  ) {
    this[0] = column0Row0;
    this[1] = column0Row1;
    this[2] = column0Row2;
    this[3] = column1Row0;
    this[4] = column1Row1;
    this[5] = column1Row2;
    this[6] = column2Row0;
    this[7] = column2Row1;
    this[8] = column2Row2;
  }

  /**
   * Gets the number of items in the collection.
   */
  get length(): number {
    return Matrix3.packedLength;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing the elements.
   * @returns The array that was packed into
   */
  static pack(value: Matrix3, array: number[], startingIndex: number = 0): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    array[startingIndex++] = value[0];
    array[startingIndex++] = value[1];
    array[startingIndex++] = value[2];
    array[startingIndex++] = value[3];
    array[startingIndex++] = value[4];
    array[startingIndex++] = value[5];
    array[startingIndex++] = value[6];
    array[startingIndex++] = value[7];
    array[startingIndex++] = value[8];

    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   *
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new Matrix3 instance if one was not provided.
   */
  static unpack(array: number[], startingIndex: number = 0, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Matrix3();
    }

    result![0] = array[startingIndex++];
    result![1] = array[startingIndex++];
    result![2] = array[startingIndex++];
    result![3] = array[startingIndex++];
    result![4] = array[startingIndex++];
    result![5] = array[startingIndex++];
    result![6] = array[startingIndex++];
    result![7] = array[startingIndex++];
    result![8] = array[startingIndex++];
    return result!;
  }

  /**
   * Flattens an array of Matrix3s into an array of components. The components
   * are stored in column-major order.
   *
   * @param array - The array of matrices to pack.
   * @param result - The array onto which to store the result. If this is a typed array, it must have array.length * 9 components, else a DeveloperError will be thrown. If it is a regular array, it will be resized to have (array.length * 9) elements.
   * @returns The packed array.
   */
  static packArray(array: Matrix3[], result?: number[]): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 9;
    if (!defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result!.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 9 elements"
      );
      //>>includeEnd('debug');
    } else if (result!.length !== resultLength) {
      result!.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Matrix3.pack(array[i], result!, i * 9);
    }
    return result!;
  }

  /**
   * Unpacks an array of column-major matrix components into an array of Matrix3s.
   *
   * @param array - The array of components to unpack.
   * @param result - The array onto which to store the result.
   * @returns The unpacked array.
   */
  static unpackArray(array: number[], result?: Matrix3[]): Matrix3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 9);
    if (array.length % 9 !== 0) {
      throw new DeveloperError("array length must be a multiple of 9.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defined(result)) {
      result = new Array(length / 9);
    } else {
      result!.length = length / 9;
    }

    for (let i = 0; i < length; i += 9) {
      const index = i / 9;
      result![index] = Matrix3.unpack(array, i, result![index]);
    }
    return result!;
  }

  /**
   * Duplicates a Matrix3 instance.
   *
   * @param matrix - The matrix to duplicate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Matrix3 instance if one was not provided. (Returns undefined if matrix is undefined)
   */
  static clone(matrix: Matrix3 | undefined, result?: Matrix3): Matrix3 | undefined {
    if (!defined(matrix)) {
      return undefined;
    }
    if (!defined(result)) {
      return new Matrix3(
        matrix![0],
        matrix![3],
        matrix![6],
        matrix![1],
        matrix![4],
        matrix![7],
        matrix![2],
        matrix![5],
        matrix![8]
      );
    }
    result![0] = matrix![0];
    result![1] = matrix![1];
    result![2] = matrix![2];
    result![3] = matrix![3];
    result![4] = matrix![4];
    result![5] = matrix![5];
    result![6] = matrix![6];
    result![7] = matrix![7];
    result![8] = matrix![8];
    return result;
  }

  /**
   * Creates a Matrix3 from 9 consecutive elements in an array.
   *
   * @param array - The array whose 9 consecutive elements correspond to the positions of the matrix. Assumes column-major order.
   * @param startingIndex - The offset into the array of the first element, which corresponds to first column first row position in the matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Create the Matrix3:
   * // [1.0, 2.0, 3.0]
   * // [1.0, 2.0, 3.0]
   * // [1.0, 2.0, 3.0]
   *
   * const v = [1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
   * const m = Cesium.Matrix3.fromArray(v);
   *
   * // Create same Matrix3 with using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
   * const m2 = Cesium.Matrix3.fromArray(v2, 2);
   */
  static fromArray(array: number[], startingIndex?: number, result?: Matrix3): Matrix3 {
    return Matrix3.unpack(array, startingIndex, result);
  }

  /**
   * Creates a Matrix3 instance from a column-major order array.
   *
   * @param values - The column-major order array.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   */
  static fromColumnMajorArray(values: ArrayLike<number>, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("values", values);
    //>>includeEnd('debug');

    return Matrix3.clone(values as unknown as Matrix3, result)!;
  }

  /**
   * Creates a Matrix3 instance from a row-major order array.
   * The resulting matrix will be in column-major order.
   *
   * @param values - The row-major order array.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   */
  static fromRowMajorArray(values: ArrayLike<number>, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("values", values);
    //>>includeEnd('debug');

    if (!defined(result)) {
      return new Matrix3(
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
        values[8]
      );
    }
    result![0] = values[0];
    result![1] = values[3];
    result![2] = values[6];
    result![3] = values[1];
    result![4] = values[4];
    result![5] = values[7];
    result![6] = values[2];
    result![7] = values[5];
    result![8] = values[8];
    return result!;
  }

  /**
   * Computes a 3x3 rotation matrix from the provided quaternion.
   *
   * @param quaternion - The quaternion to use.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The 3x3 rotation matrix from this quaternion.
   */
  static fromQuaternion(quaternion: QuaternionLike, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("quaternion", quaternion);
    //>>includeEnd('debug');

    const x2 = quaternion.x * quaternion.x;
    const xy = quaternion.x * quaternion.y;
    const xz = quaternion.x * quaternion.z;
    const xw = quaternion.x * quaternion.w;
    const y2 = quaternion.y * quaternion.y;
    const yz = quaternion.y * quaternion.z;
    const yw = quaternion.y * quaternion.w;
    const z2 = quaternion.z * quaternion.z;
    const zw = quaternion.z * quaternion.w;
    const w2 = quaternion.w * quaternion.w;

    const m00 = x2 - y2 - z2 + w2;
    const m01 = 2.0 * (xy - zw);
    const m02 = 2.0 * (xz + yw);

    const m10 = 2.0 * (xy + zw);
    const m11 = -x2 + y2 - z2 + w2;
    const m12 = 2.0 * (yz - xw);

    const m20 = 2.0 * (xz - yw);
    const m21 = 2.0 * (yz + xw);
    const m22 = -x2 - y2 + z2 + w2;

    if (!defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
    }
    result![0] = m00;
    result![1] = m10;
    result![2] = m20;
    result![3] = m01;
    result![4] = m11;
    result![5] = m21;
    result![6] = m02;
    result![7] = m12;
    result![8] = m22;
    return result!;
  }

  /**
   * Computes a 3x3 rotation matrix from the provided headingPitchRoll. (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
   *
   * @param headingPitchRoll - The headingPitchRoll to use.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The 3x3 rotation matrix from this headingPitchRoll.
   */
  static fromHeadingPitchRoll(headingPitchRoll: HeadingPitchRollLike, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("headingPitchRoll", headingPitchRoll);
    //>>includeEnd('debug');

    const cosTheta = Math.cos(-headingPitchRoll.pitch);
    const cosPsi = Math.cos(-headingPitchRoll.heading);
    const cosPhi = Math.cos(headingPitchRoll.roll);
    const sinTheta = Math.sin(-headingPitchRoll.pitch);
    const sinPsi = Math.sin(-headingPitchRoll.heading);
    const sinPhi = Math.sin(headingPitchRoll.roll);

    const m00 = cosTheta * cosPsi;
    const m01 = -cosPhi * sinPsi + sinPhi * sinTheta * cosPsi;
    const m02 = sinPhi * sinPsi + cosPhi * sinTheta * cosPsi;

    const m10 = cosTheta * sinPsi;
    const m11 = cosPhi * cosPsi + sinPhi * sinTheta * sinPsi;
    const m12 = -sinPhi * cosPsi + cosPhi * sinTheta * sinPsi;

    const m20 = -sinTheta;
    const m21 = sinPhi * cosTheta;
    const m22 = cosPhi * cosTheta;

    if (!defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
    }
    result![0] = m00;
    result![1] = m10;
    result![2] = m20;
    result![3] = m01;
    result![4] = m11;
    result![5] = m21;
    result![6] = m02;
    result![7] = m12;
    result![8] = m22;
    return result!;
  }

  /**
   * Computes a Matrix3 instance representing a non-uniform scale.
   *
   * @param scale - The x, y, and z scale factors.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [7.0, 0.0, 0.0]
   * //   [0.0, 8.0, 0.0]
   * //   [0.0, 0.0, 9.0]
   * const m = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  static fromScale(scale: Cartesian3Like, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!defined(result)) {
      return new Matrix3(scale.x, 0.0, 0.0, 0.0, scale.y, 0.0, 0.0, 0.0, scale.z);
    }

    result![0] = scale.x;
    result![1] = 0.0;
    result![2] = 0.0;
    result![3] = 0.0;
    result![4] = scale.y;
    result![5] = 0.0;
    result![6] = 0.0;
    result![7] = 0.0;
    result![8] = scale.z;
    return result!;
  }

  /**
   * Computes a Matrix3 instance representing a uniform scale.
   *
   * @param scale - The uniform scale factor.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [2.0, 0.0, 0.0]
   * //   [0.0, 2.0, 0.0]
   * //   [0.0, 0.0, 2.0]
   * const m = Cesium.Matrix3.fromUniformScale(2.0);
   */
  static fromUniformScale(scale: number, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("scale", scale);
    //>>includeEnd('debug');

    if (!defined(result)) {
      return new Matrix3(scale, 0.0, 0.0, 0.0, scale, 0.0, 0.0, 0.0, scale);
    }

    result![0] = scale;
    result![1] = 0.0;
    result![2] = 0.0;
    result![3] = 0.0;
    result![4] = scale;
    result![5] = 0.0;
    result![6] = 0.0;
    result![7] = 0.0;
    result![8] = scale;
    return result!;
  }

  /**
   * Computes a Matrix3 instance representing the cross product equivalent matrix of a Cartesian3 vector.
   *
   * @param vector - The vector on the left hand side of the cross product operation.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [0.0, -9.0,  8.0]
   * //   [9.0,  0.0, -7.0]
   * //   [-8.0, 7.0,  0.0]
   * const m = Cesium.Matrix3.fromCrossProduct(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  static fromCrossProduct(vector: Cartesian3Like, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("vector", vector);
    //>>includeEnd('debug');

    if (!defined(result)) {
      return new Matrix3(
        0.0,
        -vector.z,
        vector.y,
        vector.z,
        0.0,
        -vector.x,
        -vector.y,
        vector.x,
        0.0
      );
    }

    result![0] = 0.0;
    result![1] = vector.z;
    result![2] = -vector.y;
    result![3] = -vector.z;
    result![4] = 0.0;
    result![5] = vector.x;
    result![6] = vector.y;
    result![7] = -vector.x;
    result![8] = 0.0;
    return result!;
  }

  /**
   * Creates a rotation matrix around the x-axis.
   *
   * @param angle - The angle, in radians, of the rotation. Positive angles are counterclockwise.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the x-axis.
   * const p = new Cesium.Cartesian3(5, 6, 7);
   * const m = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  static fromRotationX(angle: number, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defined(result)) {
      return new Matrix3(
        1.0,
        0.0,
        0.0,
        0.0,
        cosAngle,
        -sinAngle,
        0.0,
        sinAngle,
        cosAngle
      );
    }

    result![0] = 1.0;
    result![1] = 0.0;
    result![2] = 0.0;
    result![3] = 0.0;
    result![4] = cosAngle;
    result![5] = sinAngle;
    result![6] = 0.0;
    result![7] = -sinAngle;
    result![8] = cosAngle;

    return result!;
  }

  /**
   * Creates a rotation matrix around the y-axis.
   *
   * @param angle - The angle, in radians, of the rotation. Positive angles are counterclockwise.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the y-axis.
   * const p = new Cesium.Cartesian3(5, 6, 7);
   * const m = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  static fromRotationY(angle: number, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defined(result)) {
      return new Matrix3(
        cosAngle,
        0.0,
        sinAngle,
        0.0,
        1.0,
        0.0,
        -sinAngle,
        0.0,
        cosAngle
      );
    }

    result![0] = cosAngle;
    result![1] = 0.0;
    result![2] = -sinAngle;
    result![3] = 0.0;
    result![4] = 1.0;
    result![5] = 0.0;
    result![6] = sinAngle;
    result![7] = 0.0;
    result![8] = cosAngle;

    return result!;
  }

  /**
   * Creates a rotation matrix around the z-axis.
   *
   * @param angle - The angle, in radians, of the rotation. Positive angles are counterclockwise.
   * @param result - The object in which the result will be stored, if undefined a new instance will be created.
   * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the z-axis.
   * const p = new Cesium.Cartesian3(5, 6, 7);
   * const m = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  static fromRotationZ(angle: number, result?: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defined(result)) {
      return new Matrix3(
        cosAngle,
        -sinAngle,
        0.0,
        sinAngle,
        cosAngle,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }

    result![0] = cosAngle;
    result![1] = sinAngle;
    result![2] = 0.0;
    result![3] = -sinAngle;
    result![4] = cosAngle;
    result![5] = 0.0;
    result![6] = 0.0;
    result![7] = 0.0;
    result![8] = 1.0;

    return result!;
  }

  /**
   * Creates an Array from the provided Matrix3 instance.
   * The array will be in column-major order.
   *
   * @param matrix - The matrix to use.
   * @param result - The Array onto which to store the result.
   * @returns The modified Array parameter or a new Array instance if one was not provided.
   */
  static toArray(matrix: Matrix3, result?: number[]): number[] {
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
      ];
    }
    result![0] = matrix[0];
    result![1] = matrix[1];
    result![2] = matrix[2];
    result![3] = matrix[3];
    result![4] = matrix[4];
    result![5] = matrix[5];
    result![6] = matrix[6];
    result![7] = matrix[7];
    result![8] = matrix[8];
    return result!;
  }

  /**
   * Computes the array index of the element at the provided row and column.
   *
   * @param column - The zero-based index of the column.
   * @param row - The zero-based index of the row.
   * @returns The index of the element at the provided row and column.
   *
   * @exception DeveloperError row must be 0, 1, or 2.
   * @exception DeveloperError column must be 0, 1, or 2.
   *
   * @example
   * const myMatrix = new Cesium.Matrix3();
   * const column1Row0Index = Cesium.Matrix3.getElementIndex(1, 0);
   * const column1Row0 = myMatrix[column1Row0Index]
   * myMatrix[column1Row0Index] = 10.0;
   */
  static getElementIndex(column: number, row: number): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("row", row, 0);
    Check.typeOf.number.lessThanOrEquals("row", row, 2);
    Check.typeOf.number.greaterThanOrEquals("column", column, 0);
    Check.typeOf.number.lessThanOrEquals("column", column, 2);
    //>>includeEnd('debug');

    return column * 3 + row;
  }

  /**
   * Retrieves a copy of the matrix column at the provided index as a Cartesian3 instance.
   *
   * @param matrix - The matrix to use.
   * @param index - The zero-based index of the column to retrieve.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @exception DeveloperError index must be 0, 1, or 2.
   */
  static getColumn(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const startIndex = index * 3;
    const x = matrix[startIndex];
    const y = matrix[startIndex + 1];
    const z = matrix[startIndex + 2];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  }

  /**
   * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian3 instance.
   *
   * @param matrix - The matrix to use.
   * @param index - The zero-based index of the column to set.
   * @param cartesian - The Cartesian whose values will be assigned to the specified column.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @exception DeveloperError index must be 0, 1, or 2.
   */
  static setColumn(matrix: Matrix3, index: number, cartesian: Cartesian3Like, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Matrix3.clone(matrix, result);
    const startIndex = index * 3;
    result[startIndex] = cartesian.x;
    result[startIndex + 1] = cartesian.y;
    result[startIndex + 2] = cartesian.z;
    return result;
  }

  /**
   * Retrieves a copy of the matrix row at the provided index as a Cartesian3 instance.
   *
   * @param matrix - The matrix to use.
   * @param index - The zero-based index of the row to retrieve.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @exception DeveloperError index must be 0, 1, or 2.
   */
  static getRow(matrix: Matrix3, index: number, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = matrix[index];
    const y = matrix[index + 3];
    const z = matrix[index + 6];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  }

  /**
   * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian3 instance.
   *
   * @param matrix - The matrix to use.
   * @param index - The zero-based index of the row to set.
   * @param cartesian - The Cartesian whose values will be assigned to the specified row.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @exception DeveloperError index must be 0, 1, or 2.
   */
  static setRow(matrix: Matrix3, index: number, cartesian: Cartesian3Like, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Matrix3.clone(matrix, result);
    result[index] = cartesian.x;
    result[index + 3] = cartesian.y;
    result[index + 6] = cartesian.z;
    return result;
  }

  /**
   * Computes a new matrix that replaces the scale with the provided scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param matrix - The matrix to use.
   * @param scale - The scale that replaces the scale of the provided matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @see Matrix3.setUniformScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.multiplyByScale
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.getScale
   */
  static setScale(matrix: Matrix3, scale: Cartesian3Like, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("scale", scale);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix3.getScale(matrix, scaleScratch1);
    const scaleRatioX = scale.x / existingScale.x;
    const scaleRatioY = scale.y / existingScale.y;
    const scaleRatioZ = scale.z / existingScale.z;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioX;
    result[3] = matrix[3] * scaleRatioY;
    result[4] = matrix[4] * scaleRatioY;
    result[5] = matrix[5] * scaleRatioY;
    result[6] = matrix[6] * scaleRatioZ;
    result[7] = matrix[7] * scaleRatioZ;
    result[8] = matrix[8] * scaleRatioZ;

    return result;
  }

  /**
   * Computes a new matrix that replaces the scale with the provided uniform scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param matrix - The matrix to use.
   * @param scale - The uniform scale that replaces the scale of the provided matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @see Matrix3.setScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.multiplyByScale
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.getScale
   */
  static setUniformScale(matrix: Matrix3, scale: number, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.number("scale", scale);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix3.getScale(matrix, scaleScratch2);
    const scaleRatioX = scale / existingScale.x;
    const scaleRatioY = scale / existingScale.y;
    const scaleRatioZ = scale / existingScale.z;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioX;
    result[3] = matrix[3] * scaleRatioY;
    result[4] = matrix[4] * scaleRatioY;
    result[5] = matrix[5] * scaleRatioY;
    result[6] = matrix[6] * scaleRatioZ;
    result[7] = matrix[7] * scaleRatioZ;
    result[8] = matrix[8] * scaleRatioZ;

    return result;
  }

  /**
   * Extracts the non-uniform scale assuming the matrix is an affine transformation.
   *
   * @param matrix - The matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @see Matrix3.multiplyByScale
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.setScale
   * @see Matrix3.setUniformScale
   */
  static getScale(matrix: Matrix3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn)
    );
    result.y = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[3], matrix[4], matrix[5], scratchColumn)
    );
    result.z = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[6], matrix[7], matrix[8], scratchColumn)
    );
    return result;
  }

  /**
   * Computes the maximum scale assuming the matrix is an affine transformation.
   * The maximum scale is the maximum length of the column vectors.
   *
   * @param matrix - The matrix.
   * @returns The maximum scale.
   */
  static getMaximumScale(matrix: Matrix3): number {
    Matrix3.getScale(matrix, scaleScratch3);
    return Cartesian3.maximumComponent(scaleScratch3);
  }

  /**
   * Sets the rotation assuming the matrix is an affine transformation.
   *
   * @param matrix - The matrix.
   * @param rotation - The rotation matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @see Matrix3.getRotation
   */
  static setRotation(matrix: Matrix3, rotation: Matrix3, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix3.getScale(matrix, scaleScratch4);

    result[0] = rotation[0] * scale.x;
    result[1] = rotation[1] * scale.x;
    result[2] = rotation[2] * scale.x;
    result[3] = rotation[3] * scale.y;
    result[4] = rotation[4] * scale.y;
    result[5] = rotation[5] * scale.y;
    result[6] = rotation[6] * scale.z;
    result[7] = rotation[7] * scale.z;
    result[8] = rotation[8] * scale.z;

    return result;
  }

  /**
   * Extracts the rotation matrix assuming the matrix is an affine transformation.
   *
   * @param matrix - The matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @see Matrix3.setRotation
   */
  static getRotation(matrix: Matrix3, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix3.getScale(matrix, scaleScratch5);

    result[0] = matrix[0] / scale.x;
    result[1] = matrix[1] / scale.x;
    result[2] = matrix[2] / scale.x;
    result[3] = matrix[3] / scale.y;
    result[4] = matrix[4] / scale.y;
    result[5] = matrix[5] / scale.y;
    result[6] = matrix[6] / scale.z;
    result[7] = matrix[7] / scale.z;
    result[8] = matrix[8] / scale.z;

    return result;
  }

  /**
   * Computes the product of two matrices.
   *
   * @param left - The first matrix.
   * @param right - The second matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiply(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 =
      left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
    const column0Row1 =
      left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
    const column0Row2 =
      left[2] * right[0] + left[5] * right[1] + left[8] * right[2];

    const column1Row0 =
      left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
    const column1Row1 =
      left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
    const column1Row2 =
      left[2] * right[3] + left[5] * right[4] + left[8] * right[5];

    const column2Row0 =
      left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
    const column2Row1 =
      left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
    const column2Row2 =
      left[2] * right[6] + left[5] * right[7] + left[8] * right[8];

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = column1Row0;
    result[4] = column1Row1;
    result[5] = column1Row2;
    result[6] = column2Row0;
    result[7] = column2Row1;
    result[8] = column2Row2;
    return result;
  }

  /**
   * Computes the sum of two matrices.
   *
   * @param left - The first matrix.
   * @param right - The second matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static add(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3 {
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
    return result;
  }

  /**
   * Computes the difference of two matrices.
   *
   * @param left - The first matrix.
   * @param right - The second matrix.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static subtract(left: Matrix3, right: Matrix3, result: Matrix3): Matrix3 {
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
    return result;
  }

  /**
   * Computes the product of a matrix and a column vector.
   *
   * @param matrix - The matrix.
   * @param cartesian - The column.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyByVector(matrix: Matrix3, cartesian: Cartesian3Like, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const vX = cartesian.x;
    const vY = cartesian.y;
    const vZ = cartesian.z;

    const x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
    const y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
    const z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  }

  /**
   * Computes the product of a matrix and a scalar.
   *
   * @param matrix - The matrix.
   * @param scalar - The number to multiply by.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyByScalar(matrix: Matrix3, scalar: number, result: Matrix3): Matrix3 {
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
    return result;
  }

  /**
   * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
   *
   * @param matrix - The matrix on the left-hand side.
   * @param scale - The non-uniform scale on the right-hand side.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromScale(scale), m);
   * Cesium.Matrix3.multiplyByScale(m, scale, m);
   *
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.setScale
   * @see Matrix3.setUniformScale
   * @see Matrix3.getScale
   */
  static multiplyByScale(matrix: Matrix3, scale: Cartesian3Like, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("scale", scale);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale.x;
    result[1] = matrix[1] * scale.x;
    result[2] = matrix[2] * scale.x;
    result[3] = matrix[3] * scale.y;
    result[4] = matrix[4] * scale.y;
    result[5] = matrix[5] * scale.y;
    result[6] = matrix[6] * scale.z;
    result[7] = matrix[7] * scale.z;
    result[8] = matrix[8] * scale.z;

    return result;
  }

  /**
   * Computes the product of a matrix times a uniform scale, as if the scale were a scale matrix.
   *
   * @param matrix - The matrix on the left-hand side.
   * @param scale - The uniform scale on the right-hand side.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromUniformScale(scale), m);
   * Cesium.Matrix3.multiplyByUniformScale(m, scale, m);
   *
   * @see Matrix3.multiplyByScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.setScale
   * @see Matrix3.setUniformScale
   * @see Matrix3.getScale
   */
  static multiplyByUniformScale(matrix: Matrix3, scale: number, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.number("scale", scale);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale;
    result[1] = matrix[1] * scale;
    result[2] = matrix[2] * scale;
    result[3] = matrix[3] * scale;
    result[4] = matrix[4] * scale;
    result[5] = matrix[5] * scale;
    result[6] = matrix[6] * scale;
    result[7] = matrix[7] * scale;
    result[8] = matrix[8] * scale;

    return result;
  }

  /**
   * Creates a negated copy of the provided matrix.
   *
   * @param matrix - The matrix to negate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static negate(matrix: Matrix3, result: Matrix3): Matrix3 {
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
    return result;
  }

  /**
   * Computes the transpose of the provided matrix.
   *
   * @param matrix - The matrix to transpose.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static transpose(matrix: Matrix3, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 = matrix[0];
    const column0Row1 = matrix[3];
    const column0Row2 = matrix[6];
    const column1Row0 = matrix[1];
    const column1Row1 = matrix[4];
    const column1Row2 = matrix[7];
    const column2Row0 = matrix[2];
    const column2Row1 = matrix[5];
    const column2Row2 = matrix[8];

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = column1Row0;
    result[4] = column1Row1;
    result[5] = column1Row2;
    result[6] = column2Row0;
    result[7] = column2Row1;
    result[8] = column2Row2;
    return result;
  }

  /**
   * Computes the eigenvectors and eigenvalues of a symmetric matrix.
   *
   * Returns a diagonal matrix and unitary matrix such that:
   * `matrix = unitary matrix * diagonal matrix * transpose(unitary matrix)`
   *
   * The values along the diagonal of the diagonal matrix are the eigenvalues. The columns
   * of the unitary matrix are the corresponding eigenvectors.
   *
   * @param matrix - The matrix to decompose into diagonal and unitary matrix. Expected to be symmetric.
   * @param result - An object with unitary and diagonal properties which are matrices onto which to store the result.
   * @returns An object with unitary and diagonal properties which are the unitary and diagonal matrices, respectively.
   *
   * @example
   * const a = //... symetric matrix
   * const result = {
   *     unitary : new Cesium.Matrix3(),
   *     diagonal : new Cesium.Matrix3()
   * };
   * Cesium.Matrix3.computeEigenDecomposition(a, result);
   *
   * const unitaryTranspose = Cesium.Matrix3.transpose(result.unitary, new Cesium.Matrix3());
   * const b = Cesium.Matrix3.multiply(result.unitary, result.diagonal, new Cesium.Matrix3());
   * Cesium.Matrix3.multiply(b, unitaryTranspose, b); // b is now equal to a
   *
   * const lambda = Cesium.Matrix3.getColumn(result.diagonal, 0, new Cesium.Cartesian3()).x;  // first eigenvalue
   * const v = Cesium.Matrix3.getColumn(result.unitary, 0, new Cesium.Cartesian3());          // first eigenvector
   * const c = Cesium.Cartesian3.multiplyByScalar(v, lambda, new Cesium.Cartesian3());        // equal to Cesium.Matrix3.multiplyByVector(a, v)
   */
  static computeEigenDecomposition(matrix: Matrix3, result?: EigenDecompositionResult): EigenDecompositionResult {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
    // section 8.4.3 The Classical Jacobi Algorithm

    const tolerance = CesiumMath.EPSILON20;
    const maxSweeps = 10;

    let count = 0;
    let sweep = 0;

    if (!defined(result)) {
      result = {} as EigenDecompositionResult;
    }

    const unitaryMatrix = (result!.unitary = Matrix3.clone(
      Matrix3.IDENTITY,
      result!.unitary
    )!);
    const diagMatrix = (result!.diagonal = Matrix3.clone(matrix, result!.diagonal)!);

    const epsilon = tolerance * computeFrobeniusNorm(diagMatrix);

    while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
      shurDecomposition(diagMatrix, jMatrix);
      Matrix3.transpose(jMatrix, jMatrixTranspose);
      Matrix3.multiply(diagMatrix, jMatrix, diagMatrix);
      Matrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix);
      Matrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix);

      if (++count > 2) {
        ++sweep;
        count = 0;
      }
    }

    return result!;
  }

  /**
   * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
   *
   * @param matrix - The matrix with signed elements.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static abs(matrix: Matrix3, result: Matrix3): Matrix3 {
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

    return result;
  }

  /**
   * Computes the determinant of the provided matrix.
   *
   * @param matrix - The matrix to use.
   * @returns The value of the determinant of the matrix.
   */
  static determinant(matrix: Matrix3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    const m11 = matrix[0];
    const m21 = matrix[3];
    const m31 = matrix[6];
    const m12 = matrix[1];
    const m22 = matrix[4];
    const m32 = matrix[7];
    const m13 = matrix[2];
    const m23 = matrix[5];
    const m33 = matrix[8];

    return (
      m11 * (m22 * m33 - m23 * m32) +
      m12 * (m23 * m31 - m21 * m33) +
      m13 * (m21 * m32 - m22 * m31)
    );
  }

  /**
   * Computes the inverse of the provided matrix.
   *
   * @param matrix - The matrix to invert.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @exception DeveloperError matrix is not invertible.
   */
  static inverse(matrix: Matrix3, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const m11 = matrix[0];
    const m21 = matrix[1];
    const m31 = matrix[2];
    const m12 = matrix[3];
    const m22 = matrix[4];
    const m32 = matrix[5];
    const m13 = matrix[6];
    const m23 = matrix[7];
    const m33 = matrix[8];

    const determinant = Matrix3.determinant(matrix);

    //>>includeStart('debug', pragmas.debug);
    if (Math.abs(determinant) <= CesiumMath.EPSILON15) {
      throw new DeveloperError("matrix is not invertible");
    }
    //>>includeEnd('debug');

    result[0] = m22 * m33 - m23 * m32;
    result[1] = m23 * m31 - m21 * m33;
    result[2] = m21 * m32 - m22 * m31;
    result[3] = m13 * m32 - m12 * m33;
    result[4] = m11 * m33 - m13 * m31;
    result[5] = m12 * m31 - m11 * m32;
    result[6] = m12 * m23 - m13 * m22;
    result[7] = m13 * m21 - m11 * m23;
    result[8] = m11 * m22 - m12 * m21;

    const scale = 1.0 / determinant;
    return Matrix3.multiplyByScalar(result, scale, result);
  }

  /**
   * Computes the inverse transpose of a matrix.
   *
   * @param matrix - The matrix to transpose and invert.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static inverseTranspose(matrix: Matrix3, result: Matrix3): Matrix3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("matrix", matrix);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    return Matrix3.inverse(
      Matrix3.transpose(matrix, scratchTransposeMatrix),
      result
    );
  }

  /**
   * Compares the provided matrices componentwise and returns
   * true if they are equal, false otherwise.
   *
   * @param left - The first matrix.
   * @param right - The second matrix.
   * @returns true if left and right are equal, false otherwise.
   */
  static equals(left?: Matrix3, right?: Matrix3): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left![0] === right![0] &&
        left![1] === right![1] &&
        left![2] === right![2] &&
        left![3] === right![3] &&
        left![4] === right![4] &&
        left![5] === right![5] &&
        left![6] === right![6] &&
        left![7] === right![7] &&
        left![8] === right![8])
    );
  }

  /**
   * Compares the provided matrices componentwise and returns
   * true if they are within the provided epsilon, false otherwise.
   *
   * @param left - The first matrix.
   * @param right - The second matrix.
   * @param epsilon - The epsilon to use for equality testing.
   * @returns true if left and right are within the provided epsilon, false otherwise.
   */
  static equalsEpsilon(left?: Matrix3, right?: Matrix3, epsilon: number = 0): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Math.abs(left![0] - right![0]) <= epsilon &&
        Math.abs(left![1] - right![1]) <= epsilon &&
        Math.abs(left![2] - right![2]) <= epsilon &&
        Math.abs(left![3] - right![3]) <= epsilon &&
        Math.abs(left![4] - right![4]) <= epsilon &&
        Math.abs(left![5] - right![5]) <= epsilon &&
        Math.abs(left![6] - right![6]) <= epsilon &&
        Math.abs(left![7] - right![7]) <= epsilon &&
        Math.abs(left![8] - right![8]) <= epsilon)
    );
  }

  /**
   * Compares a matrix to an array at a given offset componentwise.
   * @private
   *
   * @param matrix - The matrix to compare.
   * @param array - The array to compare against.
   * @param offset - The offset into the array.
   * @returns true if the matrix equals the array at the offset, false otherwise.
   */
  static equalsArray(matrix: Matrix3, array: number[], offset: number): boolean {
    return (
      matrix[0] === array[offset] &&
      matrix[1] === array[offset + 1] &&
      matrix[2] === array[offset + 2] &&
      matrix[3] === array[offset + 3] &&
      matrix[4] === array[offset + 4] &&
      matrix[5] === array[offset + 5] &&
      matrix[6] === array[offset + 6] &&
      matrix[7] === array[offset + 7] &&
      matrix[8] === array[offset + 8]
    );
  }

  /**
   * Duplicates the provided Matrix3 instance.
   *
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Matrix3 instance if one was not provided.
   */
  clone(result?: Matrix3): Matrix3 {
    return Matrix3.clone(this, result)!;
  }

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * true if they are equal, false otherwise.
   *
   * @param right - The right hand side matrix.
   * @returns true if they are equal, false otherwise.
   */
  equals(right?: Matrix3): boolean {
    return Matrix3.equals(this, right);
  }

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * true if they are within the provided epsilon, false otherwise.
   *
   * @param right - The right hand side matrix.
   * @param epsilon - The epsilon to use for equality testing.
   * @returns true if they are within the provided epsilon, false otherwise.
   */
  equalsEpsilon(right?: Matrix3, epsilon: number = 0): boolean {
    return Matrix3.equalsEpsilon(this, right, epsilon);
  }

  /**
   * Creates a string representing this Matrix with each row being
   * on a separate line and in the format '(column0, column1, column2)'.
   *
   * @returns A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2)'.
   */
  toString(): string {
    return (
      `(${this[0]}, ${this[3]}, ${this[6]})\n` +
      `(${this[1]}, ${this[4]}, ${this[7]})\n` +
      `(${this[2]}, ${this[5]}, ${this[8]})`
    );
  }
}

// Scratch variables for internal use
const scaleScratch1 = new Cartesian3();
const scaleScratch2 = new Cartesian3();
const scratchColumn = new Cartesian3();
const scaleScratch3 = new Cartesian3();
const scaleScratch4 = new Cartesian3();
const scaleScratch5 = new Cartesian3();
const scratchTransposeMatrix = new Matrix3();

// Scratch matrices for eigen decomposition
const jMatrix = new Matrix3();
const jMatrixTranspose = new Matrix3();

// Helper arrays for eigen decomposition
const rowVal = [1, 0, 0];
const colVal = [2, 2, 1];

/**
 * Computes the Frobenius norm of a matrix.
 * @private
 */
function computeFrobeniusNorm(matrix: Matrix3): number {
  let norm = 0.0;
  for (let i = 0; i < 9; ++i) {
    const temp = matrix[i];
    norm += temp * temp;
  }

  return Math.sqrt(norm);
}

/**
 * Computes the "off-diagonal" Frobenius norm.
 * Assumes matrix is symmetric.
 * @private
 */
function offDiagonalFrobeniusNorm(matrix: Matrix3): number {
  let norm = 0.0;
  for (let i = 0; i < 3; ++i) {
    const temp = matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])];
    norm += 2.0 * temp * temp;
  }

  return Math.sqrt(norm);
}

/**
 * Performs Schur decomposition on a symmetric matrix.
 * @private
 */
function shurDecomposition(matrix: Matrix3, result: Matrix3): Matrix3 {
  // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
  // section 8.4.2 The 2by2 Symmetric Schur Decomposition.
  //
  // The routine takes a matrix, which is assumed to be symmetric, and
  // finds the largest off-diagonal term, and then creates
  // a matrix (result) which can be used to help reduce it

  const tolerance = CesiumMath.EPSILON15;

  let maxDiagonal = 0.0;
  let rotAxis = 1;

  // find pivot (rotAxis) based on max diagonal of matrix
  for (let i = 0; i < 3; ++i) {
    const temp = Math.abs(
      matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])]
    );
    if (temp > maxDiagonal) {
      rotAxis = i;
      maxDiagonal = temp;
    }
  }

  let c = 1.0;
  let s = 0.0;

  const p = rowVal[rotAxis];
  const q = colVal[rotAxis];

  if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]) > tolerance) {
    const qq = matrix[Matrix3.getElementIndex(q, q)];
    const pp = matrix[Matrix3.getElementIndex(p, p)];
    const qp = matrix[Matrix3.getElementIndex(q, p)];

    const tau = (qq - pp) / 2.0 / qp;
    let t;

    if (tau < 0.0) {
      t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
    } else {
      t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau));
    }

    c = 1.0 / Math.sqrt(1.0 + t * t);
    s = t * c;
  }

  Matrix3.clone(Matrix3.IDENTITY, result);

  result[Matrix3.getElementIndex(p, p)] = result[
    Matrix3.getElementIndex(q, q)
  ] = c;
  result[Matrix3.getElementIndex(q, p)] = s;
  result[Matrix3.getElementIndex(p, q)] = -s;

  return result;
}

export default Matrix3;
