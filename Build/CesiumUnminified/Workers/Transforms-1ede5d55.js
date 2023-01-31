/**
 * Cesium - https://github.com/CesiumGS/cesium
 *
 * Copyright 2011-2020 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/master/LICENSE.md for full licensing details.
 */

define(['exports', './Cartesian2-e7502022', './Check-24483042', './when-54335d57', './Math-34872ab7', './RuntimeError-88a32665'], function (exports, Cartesian2, Check, when, _Math, RuntimeError) { 'use strict';

  /**
   * A simple map projection where longitude and latitude are linearly mapped to X and Y by multiplying
   * them by the {@link Ellipsoid#maximumRadius}.  This projection
   * is commonly known as geographic, equirectangular, equidistant cylindrical, or plate carrée.  It
   * is also known as EPSG:4326.
   *
   * @alias GeographicProjection
   * @constructor
   *
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid.
   *
   * @see WebMercatorProjection
   */
  function GeographicProjection(ellipsoid) {
    this._ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);
    this._semimajorAxis = this._ellipsoid.maximumRadius;
    this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
  }

  Object.defineProperties(GeographicProjection.prototype, {
    /**
     * Gets the {@link Ellipsoid}.
     *
     * @memberof GeographicProjection.prototype
     *
     * @type {Ellipsoid}
     * @readonly
     */
    ellipsoid: {
      get: function () {
        return this._ellipsoid;
      },
    },
  });

  /**
   * Projects a set of {@link Cartographic} coordinates, in radians, to map coordinates, in meters.
   * X and Y are the longitude and latitude, respectively, multiplied by the maximum radius of the
   * ellipsoid.  Z is the unmodified height.
   *
   * @param {Cartographic} cartographic The coordinates to project.
   * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
   *        undefined, a new instance is created and returned.
   * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
   *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
   *          created and returned.
   */
  GeographicProjection.prototype.project = function (cartographic, result) {
    // Actually this is the special case of equidistant cylindrical called the plate carree
    var semimajorAxis = this._semimajorAxis;
    var x = cartographic.longitude * semimajorAxis;
    var y = cartographic.latitude * semimajorAxis;
    var z = cartographic.height;

    if (!when.defined(result)) {
      return new Cartesian2.Cartesian3(x, y, z);
    }

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Unprojects a set of projected {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
   * coordinates, in radians.  Longitude and Latitude are the X and Y coordinates, respectively,
   * divided by the maximum radius of the ellipsoid.  Height is the unmodified Z coordinate.
   *
   * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
   * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
   *        undefined, a new instance is created and returned.
   * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
   *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
   *          created and returned.
   */
  GeographicProjection.prototype.unproject = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(cartesian)) {
      throw new Check.DeveloperError("cartesian is required");
    }
    //>>includeEnd('debug');

    var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
    var longitude = cartesian.x * oneOverEarthSemimajorAxis;
    var latitude = cartesian.y * oneOverEarthSemimajorAxis;
    var height = cartesian.z;

    if (!when.defined(result)) {
      return new Cartesian2.Cartographic(longitude, latitude, height);
    }

    result.longitude = longitude;
    result.latitude = latitude;
    result.height = height;
    return result;
  };

  /**
   * This enumerated type is used in determining where, relative to the frustum, an
   * object is located. The object can either be fully contained within the frustum (INSIDE),
   * partially inside the frustum and partially outside (INTERSECTING), or somewhere entirely
   * outside of the frustum's 6 planes (OUTSIDE).
   *
   * @enum {Number}
   */
  var Intersect = {
    /**
     * Represents that an object is not contained within the frustum.
     *
     * @type {Number}
     * @constant
     */
    OUTSIDE: -1,

    /**
     * Represents that an object intersects one of the frustum's planes.
     *
     * @type {Number}
     * @constant
     */
    INTERSECTING: 0,

    /**
     * Represents that an object is fully within the frustum.
     *
     * @type {Number}
     * @constant
     */
    INSIDE: 1,
  };
  var Intersect$1 = Object.freeze(Intersect);

  /**
   * Represents the closed interval [start, stop].
   * @alias Interval
   * @constructor
   *
   * @param {Number} [start=0.0] The beginning of the interval.
   * @param {Number} [stop=0.0] The end of the interval.
   */
  function Interval(start, stop) {
    /**
     * The beginning of the interval.
     * @type {Number}
     * @default 0.0
     */
    this.start = when.defaultValue(start, 0.0);
    /**
     * The end of the interval.
     * @type {Number}
     * @default 0.0
     */
    this.stop = when.defaultValue(stop, 0.0);
  }

  /**
   * A 3x3 matrix, indexable as a column-major order array.
   * Constructor parameters are in row-major order for code readability.
   * @alias Matrix3
   * @constructor
   * @implements {ArrayLike<number>}
   *
   * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
   * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
   * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
   * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
   * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
   * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
   * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
   * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
   * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
   *
   * @see Matrix3.fromColumnMajorArray
   * @see Matrix3.fromRowMajorArray
   * @see Matrix3.fromQuaternion
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix2
   * @see Matrix4
   */
  function Matrix3(
    column0Row0,
    column1Row0,
    column2Row0,
    column0Row1,
    column1Row1,
    column2Row1,
    column0Row2,
    column1Row2,
    column2Row2
  ) {
    this[0] = when.defaultValue(column0Row0, 0.0);
    this[1] = when.defaultValue(column0Row1, 0.0);
    this[2] = when.defaultValue(column0Row2, 0.0);
    this[3] = when.defaultValue(column1Row0, 0.0);
    this[4] = when.defaultValue(column1Row1, 0.0);
    this[5] = when.defaultValue(column1Row2, 0.0);
    this[6] = when.defaultValue(column2Row0, 0.0);
    this[7] = when.defaultValue(column2Row1, 0.0);
    this[8] = when.defaultValue(column2Row2, 0.0);
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Matrix3.packedLength = 9;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Matrix3} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Matrix3.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

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
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Matrix3} [result] The object into which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
   */
  Matrix3.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    if (!when.defined(result)) {
      result = new Matrix3();
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
    return result;
  };

  /**
   * Duplicates a Matrix3 instance.
   *
   * @param {Matrix3} matrix The matrix to duplicate.
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided. (Returns undefined if matrix is undefined)
   */
  Matrix3.clone = function (matrix, result) {
    if (!when.defined(matrix)) {
      return undefined;
    }
    if (!when.defined(result)) {
      return new Matrix3(
        matrix[0],
        matrix[3],
        matrix[6],
        matrix[1],
        matrix[4],
        matrix[7],
        matrix[2],
        matrix[5],
        matrix[8]
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
    return result;
  };

  /**
   * Creates a Matrix3 from 9 consecutive elements in an array.
   *
   * @param {Number[]} array The array whose 9 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Create the Matrix3:
   * // [1.0, 2.0, 3.0]
   * // [1.0, 2.0, 3.0]
   * // [1.0, 2.0, 3.0]
   *
   * var v = [1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
   * var m = Cesium.Matrix3.fromArray(v);
   *
   * // Create same Matrix3 with using an offset into an array
   * var v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
   * var m2 = Cesium.Matrix3.fromArray(v2, 2);
   */
  Matrix3.fromArray = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    if (!when.defined(result)) {
      result = new Matrix3();
    }

    result[0] = array[startingIndex];
    result[1] = array[startingIndex + 1];
    result[2] = array[startingIndex + 2];
    result[3] = array[startingIndex + 3];
    result[4] = array[startingIndex + 4];
    result[5] = array[startingIndex + 5];
    result[6] = array[startingIndex + 6];
    result[7] = array[startingIndex + 7];
    result[8] = array[startingIndex + 8];
    return result;
  };

  /**
   * Creates a Matrix3 instance from a column-major order array.
   *
   * @param {Number[]} values The column-major order array.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   */
  Matrix3.fromColumnMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    return Matrix3.clone(values, result);
  };

  /**
   * Creates a Matrix3 instance from a row-major order array.
   * The resulting matrix will be in column-major order.
   *
   * @param {Number[]} values The row-major order array.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   */
  Matrix3.fromRowMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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
    result[0] = values[0];
    result[1] = values[3];
    result[2] = values[6];
    result[3] = values[1];
    result[4] = values[4];
    result[5] = values[7];
    result[6] = values[2];
    result[7] = values[5];
    result[8] = values[8];
    return result;
  };

  /**
   * Computes a 3x3 rotation matrix from the provided quaternion.
   *
   * @param {Quaternion} quaternion the quaternion to use.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The 3x3 rotation matrix from this quaternion.
   */
  Matrix3.fromQuaternion = function (quaternion, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("quaternion", quaternion);
    //>>includeEnd('debug');

    var x2 = quaternion.x * quaternion.x;
    var xy = quaternion.x * quaternion.y;
    var xz = quaternion.x * quaternion.z;
    var xw = quaternion.x * quaternion.w;
    var y2 = quaternion.y * quaternion.y;
    var yz = quaternion.y * quaternion.z;
    var yw = quaternion.y * quaternion.w;
    var z2 = quaternion.z * quaternion.z;
    var zw = quaternion.z * quaternion.w;
    var w2 = quaternion.w * quaternion.w;

    var m00 = x2 - y2 - z2 + w2;
    var m01 = 2.0 * (xy - zw);
    var m02 = 2.0 * (xz + yw);

    var m10 = 2.0 * (xy + zw);
    var m11 = -x2 + y2 - z2 + w2;
    var m12 = 2.0 * (yz - xw);

    var m20 = 2.0 * (xz - yw);
    var m21 = 2.0 * (yz + xw);
    var m22 = -x2 - y2 + z2 + w2;

    if (!when.defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
    }
    result[0] = m00;
    result[1] = m10;
    result[2] = m20;
    result[3] = m01;
    result[4] = m11;
    result[5] = m21;
    result[6] = m02;
    result[7] = m12;
    result[8] = m22;
    return result;
  };

  /**
   * Computes a 3x3 rotation matrix from the provided headingPitchRoll. (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
   *
   * @param {HeadingPitchRoll} headingPitchRoll the headingPitchRoll to use.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The 3x3 rotation matrix from this headingPitchRoll.
   */
  Matrix3.fromHeadingPitchRoll = function (headingPitchRoll, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("headingPitchRoll", headingPitchRoll);
    //>>includeEnd('debug');

    var cosTheta = Math.cos(-headingPitchRoll.pitch);
    var cosPsi = Math.cos(-headingPitchRoll.heading);
    var cosPhi = Math.cos(headingPitchRoll.roll);
    var sinTheta = Math.sin(-headingPitchRoll.pitch);
    var sinPsi = Math.sin(-headingPitchRoll.heading);
    var sinPhi = Math.sin(headingPitchRoll.roll);

    var m00 = cosTheta * cosPsi;
    var m01 = -cosPhi * sinPsi + sinPhi * sinTheta * cosPsi;
    var m02 = sinPhi * sinPsi + cosPhi * sinTheta * cosPsi;

    var m10 = cosTheta * sinPsi;
    var m11 = cosPhi * cosPsi + sinPhi * sinTheta * sinPsi;
    var m12 = -sinPhi * cosPsi + cosPhi * sinTheta * sinPsi;

    var m20 = -sinTheta;
    var m21 = sinPhi * cosTheta;
    var m22 = cosPhi * cosTheta;

    if (!when.defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
    }
    result[0] = m00;
    result[1] = m10;
    result[2] = m20;
    result[3] = m01;
    result[4] = m11;
    result[5] = m21;
    result[6] = m02;
    result[7] = m12;
    result[8] = m22;
    return result;
  };

  /**
   * Computes a Matrix3 instance representing a non-uniform scale.
   *
   * @param {Cartesian3} scale The x, y, and z scale factors.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [7.0, 0.0, 0.0]
   * //   [0.0, 8.0, 0.0]
   * //   [0.0, 0.0, 9.0]
   * var m = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  Matrix3.fromScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      return new Matrix3(scale.x, 0.0, 0.0, 0.0, scale.y, 0.0, 0.0, 0.0, scale.z);
    }

    result[0] = scale.x;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = scale.y;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = scale.z;
    return result;
  };

  /**
   * Computes a Matrix3 instance representing a uniform scale.
   *
   * @param {Number} scale The uniform scale factor.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [2.0, 0.0, 0.0]
   * //   [0.0, 2.0, 0.0]
   * //   [0.0, 0.0, 2.0]
   * var m = Cesium.Matrix3.fromUniformScale(2.0);
   */
  Matrix3.fromUniformScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("scale", scale);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      return new Matrix3(scale, 0.0, 0.0, 0.0, scale, 0.0, 0.0, 0.0, scale);
    }

    result[0] = scale;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = scale;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = scale;
    return result;
  };

  /**
   * Computes a Matrix3 instance representing the cross product equivalent matrix of a Cartesian3 vector.
   *
   * @param {Cartesian3} vector the vector on the left hand side of the cross product operation.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [0.0, -9.0,  8.0]
   * //   [9.0,  0.0, -7.0]
   * //   [-8.0, 7.0,  0.0]
   * var m = Cesium.Matrix3.fromCrossProduct(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  Matrix3.fromCrossProduct = function (vector, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("vector", vector);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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

    result[0] = 0.0;
    result[1] = vector.z;
    result[2] = -vector.y;
    result[3] = -vector.z;
    result[4] = 0.0;
    result[5] = vector.x;
    result[6] = vector.y;
    result[7] = -vector.x;
    result[8] = 0.0;
    return result;
  };

  /**
   * Creates a rotation matrix around the x-axis.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the x-axis.
   * var p = new Cesium.Cartesian3(5, 6, 7);
   * var m = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(45.0));
   * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  Matrix3.fromRotationX = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    var cosAngle = Math.cos(angle);
    var sinAngle = Math.sin(angle);

    if (!when.defined(result)) {
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

    result[0] = 1.0;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = cosAngle;
    result[5] = sinAngle;
    result[6] = 0.0;
    result[7] = -sinAngle;
    result[8] = cosAngle;

    return result;
  };

  /**
   * Creates a rotation matrix around the y-axis.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the y-axis.
   * var p = new Cesium.Cartesian3(5, 6, 7);
   * var m = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(45.0));
   * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  Matrix3.fromRotationY = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    var cosAngle = Math.cos(angle);
    var sinAngle = Math.sin(angle);

    if (!when.defined(result)) {
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

    result[0] = cosAngle;
    result[1] = 0.0;
    result[2] = -sinAngle;
    result[3] = 0.0;
    result[4] = 1.0;
    result[5] = 0.0;
    result[6] = sinAngle;
    result[7] = 0.0;
    result[8] = cosAngle;

    return result;
  };

  /**
   * Creates a rotation matrix around the z-axis.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the z-axis.
   * var p = new Cesium.Cartesian3(5, 6, 7);
   * var m = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(45.0));
   * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  Matrix3.fromRotationZ = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    var cosAngle = Math.cos(angle);
    var sinAngle = Math.sin(angle);

    if (!when.defined(result)) {
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

    result[0] = cosAngle;
    result[1] = sinAngle;
    result[2] = 0.0;
    result[3] = -sinAngle;
    result[4] = cosAngle;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 1.0;

    return result;
  };

  /**
   * Creates an Array from the provided Matrix3 instance.
   * The array will be in column-major order.
   *
   * @param {Matrix3} matrix The matrix to use..
   * @param {Number[]} [result] The Array onto which to store the result.
   * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
   */
  Matrix3.toArray = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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
    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];
    result[4] = matrix[4];
    result[5] = matrix[5];
    result[6] = matrix[6];
    result[7] = matrix[7];
    result[8] = matrix[8];
    return result;
  };

  /**
   * Computes the array index of the element at the provided row and column.
   *
   * @param {Number} row The zero-based index of the row.
   * @param {Number} column The zero-based index of the column.
   * @returns {Number} The index of the element at the provided row and column.
   *
   * @exception {DeveloperError} row must be 0, 1, or 2.
   * @exception {DeveloperError} column must be 0, 1, or 2.
   *
   * @example
   * var myMatrix = new Cesium.Matrix3();
   * var column1Row0Index = Cesium.Matrix3.getElementIndex(1, 0);
   * var column1Row0 = myMatrix[column1Row0Index]
   * myMatrix[column1Row0Index] = 10.0;
   */
  Matrix3.getElementIndex = function (column, row) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("row", row, 0);
    Check.Check.typeOf.number.lessThanOrEquals("row", row, 2);
    Check.Check.typeOf.number.greaterThanOrEquals("column", column, 0);
    Check.Check.typeOf.number.lessThanOrEquals("column", column, 2);
    //>>includeEnd('debug');

    return column * 3 + row;
  };

  /**
   * Retrieves a copy of the matrix column at the provided index as a Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to retrieve.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.getColumn = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var startIndex = index * 3;
    var x = matrix[startIndex];
    var y = matrix[startIndex + 1];
    var z = matrix[startIndex + 2];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to set.
   * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified column.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.setColumn = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix3.clone(matrix, result);
    var startIndex = index * 3;
    result[startIndex] = cartesian.x;
    result[startIndex + 1] = cartesian.y;
    result[startIndex + 2] = cartesian.z;
    return result;
  };

  /**
   * Retrieves a copy of the matrix row at the provided index as a Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to retrieve.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.getRow = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var x = matrix[index];
    var y = matrix[index + 3];
    var z = matrix[index + 6];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to set.
   * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified row.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.setRow = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix3.clone(matrix, result);
    result[index] = cartesian.x;
    result[index + 3] = cartesian.y;
    result[index + 6] = cartesian.z;
    return result;
  };

  var scratchColumn$1 = new Cartesian2.Cartesian3();

  /**
   * Extracts the non-uniform scale assuming the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Matrix3.getScale = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn$1)
    );
    result.y = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.fromElements(matrix[3], matrix[4], matrix[5], scratchColumn$1)
    );
    result.z = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.fromElements(matrix[6], matrix[7], matrix[8], scratchColumn$1)
    );
    return result;
  };

  var scratchScale$2 = new Cartesian2.Cartesian3();

  /**
   * Computes the maximum scale assuming the matrix is an affine transformation.
   * The maximum scale is the maximum length of the column vectors.
   *
   * @param {Matrix3} matrix The matrix.
   * @returns {Number} The maximum scale.
   */
  Matrix3.getMaximumScale = function (matrix) {
    Matrix3.getScale(matrix, scratchScale$2);
    return Cartesian2.Cartesian3.maximumComponent(scratchScale$2);
  };

  /**
   * Computes the product of two matrices.
   *
   * @param {Matrix3} left The first matrix.
   * @param {Matrix3} right The second matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.multiply = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var column0Row0 =
      left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
    var column0Row1 =
      left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
    var column0Row2 =
      left[2] * right[0] + left[5] * right[1] + left[8] * right[2];

    var column1Row0 =
      left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
    var column1Row1 =
      left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
    var column1Row2 =
      left[2] * right[3] + left[5] * right[4] + left[8] * right[5];

    var column2Row0 =
      left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
    var column2Row1 =
      left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
    var column2Row2 =
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
  };

  /**
   * Computes the sum of two matrices.
   *
   * @param {Matrix3} left The first matrix.
   * @param {Matrix3} right The second matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
  };

  /**
   * Computes the difference of two matrices.
   *
   * @param {Matrix3} left The first matrix.
   * @param {Matrix3} right The second matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
  };

  /**
   * Computes the product of a matrix and a column vector.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Cartesian3} cartesian The column.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Matrix3.multiplyByVector = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var vX = cartesian.x;
    var vY = cartesian.y;
    var vZ = cartesian.z;

    var x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
    var y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
    var z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes the product of a matrix and a scalar.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Number} scalar The number to multiply by.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.multiplyByScalar = function (matrix, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
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
  };

  /**
   * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
   *
   * @param {Matrix3} matrix The matrix on the left-hand side.
   * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   *
   * @example
   * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromScale(scale), m);
   * Cesium.Matrix3.multiplyByScale(m, scale, m);
   *
   * @see Matrix3.fromScale
   * @see Matrix3.multiplyByUniformScale
   */
  Matrix3.multiplyByScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
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
  };

  /**
   * Creates a negated copy of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to negate.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.negate = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
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
  };

  /**
   * Computes the transpose of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to transpose.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.transpose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var column0Row0 = matrix[0];
    var column0Row1 = matrix[3];
    var column0Row2 = matrix[6];
    var column1Row0 = matrix[1];
    var column1Row1 = matrix[4];
    var column1Row2 = matrix[7];
    var column2Row0 = matrix[2];
    var column2Row1 = matrix[5];
    var column2Row2 = matrix[8];

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
  };

  var UNIT = new Cartesian2.Cartesian3(1, 1, 1);

  /**
   * Extracts the rotation assuming the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter
   */
  Matrix3.getRotation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var inverseScale = Cartesian2.Cartesian3.divideComponents(
      UNIT,
      Matrix3.getScale(matrix, scratchScale$2),
      scratchScale$2
    );
    result = Matrix3.multiplyByScale(matrix, inverseScale, result);

    return result;
  };

  function computeFrobeniusNorm(matrix) {
    var norm = 0.0;
    for (var i = 0; i < 9; ++i) {
      var temp = matrix[i];
      norm += temp * temp;
    }

    return Math.sqrt(norm);
  }

  var rowVal = [1, 0, 0];
  var colVal = [2, 2, 1];

  function offDiagonalFrobeniusNorm(matrix) {
    // Computes the "off-diagonal" Frobenius norm.
    // Assumes matrix is symmetric.

    var norm = 0.0;
    for (var i = 0; i < 3; ++i) {
      var temp = matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])];
      norm += 2.0 * temp * temp;
    }

    return Math.sqrt(norm);
  }

  function shurDecomposition(matrix, result) {
    // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
    // section 8.4.2 The 2by2 Symmetric Schur Decomposition.
    //
    // The routine takes a matrix, which is assumed to be symmetric, and
    // finds the largest off-diagonal term, and then creates
    // a matrix (result) which can be used to help reduce it

    var tolerance = _Math.CesiumMath.EPSILON15;

    var maxDiagonal = 0.0;
    var rotAxis = 1;

    // find pivot (rotAxis) based on max diagonal of matrix
    for (var i = 0; i < 3; ++i) {
      var temp = Math.abs(matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])]);
      if (temp > maxDiagonal) {
        rotAxis = i;
        maxDiagonal = temp;
      }
    }

    var c = 1.0;
    var s = 0.0;

    var p = rowVal[rotAxis];
    var q = colVal[rotAxis];

    if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]) > tolerance) {
      var qq = matrix[Matrix3.getElementIndex(q, q)];
      var pp = matrix[Matrix3.getElementIndex(p, p)];
      var qp = matrix[Matrix3.getElementIndex(q, p)];

      var tau = (qq - pp) / 2.0 / qp;
      var t;

      if (tau < 0.0) {
        t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
      } else {
        t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau));
      }

      c = 1.0 / Math.sqrt(1.0 + t * t);
      s = t * c;
    }

    result = Matrix3.clone(Matrix3.IDENTITY, result);

    result[Matrix3.getElementIndex(p, p)] = result[
      Matrix3.getElementIndex(q, q)
    ] = c;
    result[Matrix3.getElementIndex(q, p)] = s;
    result[Matrix3.getElementIndex(p, q)] = -s;

    return result;
  }

  var jMatrix = new Matrix3();
  var jMatrixTranspose = new Matrix3();

  /**
   * Computes the eigenvectors and eigenvalues of a symmetric matrix.
   * <p>
   * Returns a diagonal matrix and unitary matrix such that:
   * <code>matrix = unitary matrix * diagonal matrix * transpose(unitary matrix)</code>
   * </p>
   * <p>
   * The values along the diagonal of the diagonal matrix are the eigenvalues. The columns
   * of the unitary matrix are the corresponding eigenvectors.
   * </p>
   *
   * @param {Matrix3} matrix The matrix to decompose into diagonal and unitary matrix. Expected to be symmetric.
   * @param {Object} [result] An object with unitary and diagonal properties which are matrices onto which to store the result.
   * @returns {Object} An object with unitary and diagonal properties which are the unitary and diagonal matrices, respectively.
   *
   * @example
   * var a = //... symetric matrix
   * var result = {
   *     unitary : new Cesium.Matrix3(),
   *     diagonal : new Cesium.Matrix3()
   * };
   * Cesium.Matrix3.computeEigenDecomposition(a, result);
   *
   * var unitaryTranspose = Cesium.Matrix3.transpose(result.unitary, new Cesium.Matrix3());
   * var b = Cesium.Matrix3.multiply(result.unitary, result.diagonal, new Cesium.Matrix3());
   * Cesium.Matrix3.multiply(b, unitaryTranspose, b); // b is now equal to a
   *
   * var lambda = Cesium.Matrix3.getColumn(result.diagonal, 0, new Cesium.Cartesian3()).x;  // first eigenvalue
   * var v = Cesium.Matrix3.getColumn(result.unitary, 0, new Cesium.Cartesian3());          // first eigenvector
   * var c = Cesium.Cartesian3.multiplyByScalar(v, lambda, new Cesium.Cartesian3());        // equal to Cesium.Matrix3.multiplyByVector(a, v)
   */
  Matrix3.computeEigenDecomposition = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
    // section 8.4.3 The Classical Jacobi Algorithm

    var tolerance = _Math.CesiumMath.EPSILON20;
    var maxSweeps = 10;

    var count = 0;
    var sweep = 0;

    if (!when.defined(result)) {
      result = {};
    }

    var unitaryMatrix = (result.unitary = Matrix3.clone(
      Matrix3.IDENTITY,
      result.unitary
    ));
    var diagMatrix = (result.diagonal = Matrix3.clone(matrix, result.diagonal));

    var epsilon = tolerance * computeFrobeniusNorm(diagMatrix);

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

    return result;
  };

  /**
   * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
   *
   * @param {Matrix3} matrix The matrix with signed elements.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.abs = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
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
  };

  /**
   * Computes the determinant of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @returns {Number} The value of the determinant of the matrix.
   */
  Matrix3.determinant = function (matrix) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    var m11 = matrix[0];
    var m21 = matrix[3];
    var m31 = matrix[6];
    var m12 = matrix[1];
    var m22 = matrix[4];
    var m32 = matrix[7];
    var m13 = matrix[2];
    var m23 = matrix[5];
    var m33 = matrix[8];

    return (
      m11 * (m22 * m33 - m23 * m32) +
      m12 * (m23 * m31 - m21 * m33) +
      m13 * (m21 * m32 - m22 * m31)
    );
  };

  /**
   * Computes the inverse of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to invert.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @exception {DeveloperError} matrix is not invertible.
   */
  Matrix3.inverse = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var m11 = matrix[0];
    var m21 = matrix[1];
    var m31 = matrix[2];
    var m12 = matrix[3];
    var m22 = matrix[4];
    var m32 = matrix[5];
    var m13 = matrix[6];
    var m23 = matrix[7];
    var m33 = matrix[8];

    var determinant = Matrix3.determinant(matrix);

    //>>includeStart('debug', pragmas.debug);
    if (Math.abs(determinant) <= _Math.CesiumMath.EPSILON15) {
      throw new Check.DeveloperError("matrix is not invertible");
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

    var scale = 1.0 / determinant;
    return Matrix3.multiplyByScalar(result, scale, result);
  };

  var scratchTransposeMatrix$1 = new Matrix3();

  /**
   * Computes the inverse transpose of a matrix.
   *
   * @param {Matrix3} matrix The matrix to transpose and invert.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.inverseTranspose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    return Matrix3.inverse(
      Matrix3.transpose(matrix, scratchTransposeMatrix$1),
      result
    );
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix3} [left] The first matrix.
   * @param {Matrix3} [right] The second matrix.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Matrix3.equals = function (left, right) {
    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[3] === right[3] &&
        left[4] === right[4] &&
        left[5] === right[5] &&
        left[6] === right[6] &&
        left[7] === right[7] &&
        left[8] === right[8])
    );
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix3} [left] The first matrix.
   * @param {Matrix3} [right] The second matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix3.equalsEpsilon = function (left, right, epsilon) {
    epsilon = when.defaultValue(epsilon, 0);

    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        Math.abs(left[0] - right[0]) <= epsilon &&
        Math.abs(left[1] - right[1]) <= epsilon &&
        Math.abs(left[2] - right[2]) <= epsilon &&
        Math.abs(left[3] - right[3]) <= epsilon &&
        Math.abs(left[4] - right[4]) <= epsilon &&
        Math.abs(left[5] - right[5]) <= epsilon &&
        Math.abs(left[6] - right[6]) <= epsilon &&
        Math.abs(left[7] - right[7]) <= epsilon &&
        Math.abs(left[8] - right[8]) <= epsilon)
    );
  };

  /**
   * An immutable Matrix3 instance initialized to the identity matrix.
   *
   * @type {Matrix3}
   * @constant
   */
  Matrix3.IDENTITY = Object.freeze(
    new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0)
  );

  /**
   * An immutable Matrix3 instance initialized to the zero matrix.
   *
   * @type {Matrix3}
   * @constant
   */
  Matrix3.ZERO = Object.freeze(
    new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
  );

  /**
   * The index into Matrix3 for column 0, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN0ROW0 = 0;

  /**
   * The index into Matrix3 for column 0, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN0ROW1 = 1;

  /**
   * The index into Matrix3 for column 0, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN0ROW2 = 2;

  /**
   * The index into Matrix3 for column 1, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN1ROW0 = 3;

  /**
   * The index into Matrix3 for column 1, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN1ROW1 = 4;

  /**
   * The index into Matrix3 for column 1, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN1ROW2 = 5;

  /**
   * The index into Matrix3 for column 2, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN2ROW0 = 6;

  /**
   * The index into Matrix3 for column 2, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN2ROW1 = 7;

  /**
   * The index into Matrix3 for column 2, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN2ROW2 = 8;

  Object.defineProperties(Matrix3.prototype, {
    /**
     * Gets the number of items in the collection.
     * @memberof Matrix3.prototype
     *
     * @type {Number}
     */
    length: {
      get: function () {
        return Matrix3.packedLength;
      },
    },
  });

  /**
   * Duplicates the provided Matrix3 instance.
   *
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
   */
  Matrix3.prototype.clone = function (result) {
    return Matrix3.clone(this, result);
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix3} [right] The right hand side matrix.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Matrix3.prototype.equals = function (right) {
    return Matrix3.equals(this, right);
  };

  /**
   * @private
   */
  Matrix3.equalsArray = function (matrix, array, offset) {
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
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix3} [right] The right hand side matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix3.prototype.equalsEpsilon = function (right, epsilon) {
    return Matrix3.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Creates a string representing this Matrix with each row being
   * on a separate line and in the format '(column0, column1, column2)'.
   *
   * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2)'.
   */
  Matrix3.prototype.toString = function () {
    return (
      "(" +
      this[0] +
      ", " +
      this[3] +
      ", " +
      this[6] +
      ")\n" +
      "(" +
      this[1] +
      ", " +
      this[4] +
      ", " +
      this[7] +
      ")\n" +
      "(" +
      this[2] +
      ", " +
      this[5] +
      ", " +
      this[8] +
      ")"
    );
  };

  /**
   * A 4D Cartesian point.
   * @alias Cartesian4
   * @constructor
   *
   * @param {Number} [x=0.0] The X component.
   * @param {Number} [y=0.0] The Y component.
   * @param {Number} [z=0.0] The Z component.
   * @param {Number} [w=0.0] The W component.
   *
   * @see Cartesian2
   * @see Cartesian3
   * @see Packable
   */
  function Cartesian4(x, y, z, w) {
    /**
     * The X component.
     * @type {Number}
     * @default 0.0
     */
    this.x = when.defaultValue(x, 0.0);

    /**
     * The Y component.
     * @type {Number}
     * @default 0.0
     */
    this.y = when.defaultValue(y, 0.0);

    /**
     * The Z component.
     * @type {Number}
     * @default 0.0
     */
    this.z = when.defaultValue(z, 0.0);

    /**
     * The W component.
     * @type {Number}
     * @default 0.0
     */
    this.w = when.defaultValue(w, 0.0);
  }

  /**
   * Creates a Cartesian4 instance from x, y, z and w coordinates.
   *
   * @param {Number} x The x coordinate.
   * @param {Number} y The y coordinate.
   * @param {Number} z The z coordinate.
   * @param {Number} w The w coordinate.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.fromElements = function (x, y, z, w, result) {
    if (!when.defined(result)) {
      return new Cartesian4(x, y, z, w);
    }

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  /**
   * Creates a Cartesian4 instance from a {@link Color}. <code>red</code>, <code>green</code>, <code>blue</code>,
   * and <code>alpha</code> map to <code>x</code>, <code>y</code>, <code>z</code>, and <code>w</code>, respectively.
   *
   * @param {Color} color The source color.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.fromColor = function (color, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("color", color);
    //>>includeEnd('debug');
    if (!when.defined(result)) {
      return new Cartesian4(color.red, color.green, color.blue, color.alpha);
    }

    result.x = color.red;
    result.y = color.green;
    result.z = color.blue;
    result.w = color.alpha;
    return result;
  };

  /**
   * Duplicates a Cartesian4 instance.
   *
   * @param {Cartesian4} cartesian The Cartesian to duplicate.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  Cartesian4.clone = function (cartesian, result) {
    if (!when.defined(cartesian)) {
      return undefined;
    }

    if (!when.defined(result)) {
      return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    }

    result.x = cartesian.x;
    result.y = cartesian.y;
    result.z = cartesian.z;
    result.w = cartesian.w;
    return result;
  };

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Cartesian4.packedLength = 4;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Cartesian4} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Cartesian4.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

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
   * @param {Cartesian4} [result] The object into which to store the result.
   * @returns {Cartesian4}  The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    if (!when.defined(result)) {
      result = new Cartesian4();
    }
    result.x = array[startingIndex++];
    result.y = array[startingIndex++];
    result.z = array[startingIndex++];
    result.w = array[startingIndex];
    return result;
  };

  /**
       * Flattens an array of Cartesian4s into and array of components.
       *
       * @param {Cartesian4[]} array The array of cartesians to pack.
       * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 4 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 4) elements.

       * @returns {Number[]} The packed array.
       */
  Cartesian4.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    var length = array.length;
    var resultLength = length * 4;
    if (!when.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 4 elements"
      );
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (var i = 0; i < length; ++i) {
      Cartesian4.pack(array[i], result, i * 4);
    }
    return result;
  };

  /**
   * Unpacks an array of cartesian components into and array of Cartesian4s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Cartesian4[]} [result] The array onto which to store the result.
   * @returns {Cartesian4[]} The unpacked array.
   */
  Cartesian4.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
    if (array.length % 4 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 4.");
    }
    //>>includeEnd('debug');

    var length = array.length;
    if (!when.defined(result)) {
      result = new Array(length / 4);
    } else {
      result.length = length / 4;
    }

    for (var i = 0; i < length; i += 4) {
      var index = i / 4;
      result[index] = Cartesian4.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Creates a Cartesian4 from four consecutive elements in an array.
   * @function
   *
   * @param {Number[]} array The array whose four consecutive elements correspond to the x, y, z, and w components, respectively.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4}  The modified result parameter or a new Cartesian4 instance if one was not provided.
   *
   * @example
   * // Create a Cartesian4 with (1.0, 2.0, 3.0, 4.0)
   * var v = [1.0, 2.0, 3.0, 4.0];
   * var p = Cesium.Cartesian4.fromArray(v);
   *
   * // Create a Cartesian4 with (1.0, 2.0, 3.0, 4.0) using an offset into an array
   * var v2 = [0.0, 0.0, 1.0, 2.0, 3.0, 4.0];
   * var p2 = Cesium.Cartesian4.fromArray(v2, 2);
   */
  Cartesian4.fromArray = Cartesian4.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   *
   * @param {Cartesian4} cartesian The cartesian to use.
   * @returns {Number} The value of the maximum component.
   */
  Cartesian4.maximumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  };

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   *
   * @param {Cartesian4} cartesian The cartesian to use.
   * @returns {Number} The value of the minimum component.
   */
  Cartesian4.minimumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   *
   * @param {Cartesian4} first A cartesian to compare.
   * @param {Cartesian4} second A cartesian to compare.
   * @param {Cartesian4} result The object into which to store the result.
   * @returns {Cartesian4} A cartesian with the minimum components.
   */
  Cartesian4.minimumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);
    result.z = Math.min(first.z, second.z);
    result.w = Math.min(first.w, second.w);

    return result;
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   *
   * @param {Cartesian4} first A cartesian to compare.
   * @param {Cartesian4} second A cartesian to compare.
   * @param {Cartesian4} result The object into which to store the result.
   * @returns {Cartesian4} A cartesian with the maximum components.
   */
  Cartesian4.maximumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    result.z = Math.max(first.z, second.z);
    result.w = Math.max(first.w, second.w);

    return result;
  };

  /**
   * Computes the provided Cartesian's squared magnitude.
   *
   * @param {Cartesian4} cartesian The Cartesian instance whose squared magnitude is to be computed.
   * @returns {Number} The squared magnitude.
   */
  Cartesian4.magnitudeSquared = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return (
      cartesian.x * cartesian.x +
      cartesian.y * cartesian.y +
      cartesian.z * cartesian.z +
      cartesian.w * cartesian.w
    );
  };

  /**
   * Computes the Cartesian's magnitude (length).
   *
   * @param {Cartesian4} cartesian The Cartesian instance whose magnitude is to be computed.
   * @returns {Number} The magnitude.
   */
  Cartesian4.magnitude = function (cartesian) {
    return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
  };

  var distanceScratch = new Cartesian4();

  /**
   * Computes the 4-space distance between two points.
   *
   * @param {Cartesian4} left The first point to compute the distance from.
   * @param {Cartesian4} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 1.0
   * var d = Cesium.Cartesian4.distance(
   *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
   *   new Cesium.Cartesian4(2.0, 0.0, 0.0, 0.0));
   */
  Cartesian4.distance = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian4.subtract(left, right, distanceScratch);
    return Cartesian4.magnitude(distanceScratch);
  };

  /**
   * Computes the squared distance between two points.  Comparing squared distances
   * using this function is more efficient than comparing distances using {@link Cartesian4#distance}.
   *
   * @param {Cartesian4} left The first point to compute the distance from.
   * @param {Cartesian4} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 4.0, not 2.0
   * var d = Cesium.Cartesian4.distance(
   *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
   *   new Cesium.Cartesian4(3.0, 0.0, 0.0, 0.0));
   */
  Cartesian4.distanceSquared = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian4.subtract(left, right, distanceScratch);
    return Cartesian4.magnitudeSquared(distanceScratch);
  };

  /**
   * Computes the normalized form of the supplied Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian to be normalized.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.normalize = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var magnitude = Cartesian4.magnitude(cartesian);

    result.x = cartesian.x / magnitude;
    result.y = cartesian.y / magnitude;
    result.z = cartesian.z / magnitude;
    result.w = cartesian.w / magnitude;

    //>>includeStart('debug', pragmas.debug);
    if (
      isNaN(result.x) ||
      isNaN(result.y) ||
      isNaN(result.z) ||
      isNaN(result.w)
    ) {
      throw new Check.DeveloperError("normalized result is not a number");
    }
    //>>includeEnd('debug');

    return result;
  };

  /**
   * Computes the dot (scalar) product of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @returns {Number} The dot product.
   */
  Cartesian4.dot = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return (
      left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
    );
  };

  /**
   * Computes the componentwise product of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.multiplyComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    result.z = left.z * right.z;
    result.w = left.w * right.w;
    return result;
  };

  /**
   * Computes the componentwise quotient of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.divideComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    result.z = left.z / right.z;
    result.w = left.w / right.w;
    return result;
  };

  /**
   * Computes the componentwise sum of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    result.z = left.z + right.z;
    result.w = left.w + right.w;
    return result;
  };

  /**
   * Computes the componentwise difference of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    result.z = left.z - right.z;
    result.w = left.w - right.w;
    return result;
  };

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian4} cartesian The Cartesian to be scaled.
   * @param {Number} scalar The scalar to multiply with.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.multiplyByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    result.z = cartesian.z * scalar;
    result.w = cartesian.w * scalar;
    return result;
  };

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian4} cartesian The Cartesian to be divided.
   * @param {Number} scalar The scalar to divide by.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.divideByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    result.z = cartesian.z / scalar;
    result.w = cartesian.w / scalar;
    return result;
  };

  /**
   * Negates the provided Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian to be negated.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.negate = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    result.z = -cartesian.z;
    result.w = -cartesian.w;
    return result;
  };

  /**
   * Computes the absolute value of the provided Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian whose absolute value is to be computed.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.abs = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    result.z = Math.abs(cartesian.z);
    result.w = Math.abs(cartesian.w);
    return result;
  };

  var lerpScratch$1 = new Cartesian4();
  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   *
   * @param {Cartesian4} start The value corresponding to t at 0.0.
   * @param {Cartesian4}end The value corresponding to t at 1.0.
   * @param {Number} t The point along t at which to interpolate.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.lerp = function (start, end, t, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian4.multiplyByScalar(end, t, lerpScratch$1);
    result = Cartesian4.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian4.add(lerpScratch$1, result, result);
  };

  var mostOrthogonalAxisScratch = new Cartesian4();
  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian on which to find the most orthogonal axis.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The most orthogonal axis.
   */
  Cartesian4.mostOrthogonalAxis = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var f = Cartesian4.normalize(cartesian, mostOrthogonalAxisScratch);
    Cartesian4.abs(f, f);

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        if (f.x <= f.w) {
          result = Cartesian4.clone(Cartesian4.UNIT_X, result);
        } else {
          result = Cartesian4.clone(Cartesian4.UNIT_W, result);
        }
      } else if (f.z <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result);
      }
    } else if (f.y <= f.z) {
      if (f.y <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_Y, result);
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result);
      }
    } else if (f.z <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result);
    }

    return result;
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian4} [left] The first Cartesian.
   * @param {Cartesian4} [right] The second Cartesian.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Cartesian4.equals = function (left, right) {
    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        left.x === right.x &&
        left.y === right.y &&
        left.z === right.z &&
        left.w === right.w)
    );
  };

  /**
   * @private
   */
  Cartesian4.equalsArray = function (cartesian, array, offset) {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2] &&
      cartesian.w === array[offset + 3]
    );
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian4} [left] The first Cartesian.
   * @param {Cartesian4} [right] The second Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian4.equalsEpsilon = function (
    left,
    right,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        _Math.CesiumMath.equalsEpsilon(
          left.x,
          right.x,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        _Math.CesiumMath.equalsEpsilon(
          left.y,
          right.y,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        _Math.CesiumMath.equalsEpsilon(
          left.z,
          right.z,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        _Math.CesiumMath.equalsEpsilon(
          left.w,
          right.w,
          relativeEpsilon,
          absoluteEpsilon
        ))
    );
  };

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.ZERO = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (1.0, 0.0, 0.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_X = Object.freeze(new Cartesian4(1.0, 0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 1.0, 0.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_Y = Object.freeze(new Cartesian4(0.0, 1.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 1.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_Z = Object.freeze(new Cartesian4(0.0, 0.0, 1.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_W = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0));

  /**
   * Duplicates this Cartesian4 instance.
   *
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.prototype.clone = function (result) {
    return Cartesian4.clone(this, result);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian4} [right] The right hand side Cartesian.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Cartesian4.prototype.equals = function (right) {
    return Cartesian4.equals(this, right);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian4} [right] The right hand side Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian4.prototype.equalsEpsilon = function (
    right,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return Cartesian4.equalsEpsilon(
      this,
      right,
      relativeEpsilon,
      absoluteEpsilon
    );
  };

  /**
   * Creates a string representing this Cartesian in the format '(x, y, z, w)'.
   *
   * @returns {String} A string representing the provided Cartesian in the format '(x, y, z, w)'.
   */
  Cartesian4.prototype.toString = function () {
    return "(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
  };

  // scratchU8Array and scratchF32Array are views into the same buffer
  var scratchF32Array = new Float32Array(1);
  var scratchU8Array = new Uint8Array(scratchF32Array.buffer);

  var testU32 = new Uint32Array([0x11223344]);
  var testU8 = new Uint8Array(testU32.buffer);
  var littleEndian = testU8[0] === 0x44;

  /**
   * Packs an arbitrary floating point value to 4 values representable using uint8.
   *
   * @param {Number} value A floating point number.
   * @param {Cartesian4} [result] The Cartesian4 that will contain the packed float.
   * @returns {Cartesian4} A Cartesian4 representing the float packed to values in x, y, z, and w.
   */
  Cartesian4.packFloat = function (value, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("value", value);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new Cartesian4();
    }

    // scratchU8Array and scratchF32Array are views into the same buffer
    scratchF32Array[0] = value;

    if (littleEndian) {
      result.x = scratchU8Array[0];
      result.y = scratchU8Array[1];
      result.z = scratchU8Array[2];
      result.w = scratchU8Array[3];
    } else {
      // convert from big-endian to little-endian
      result.x = scratchU8Array[3];
      result.y = scratchU8Array[2];
      result.z = scratchU8Array[1];
      result.w = scratchU8Array[0];
    }
    return result;
  };

  /**
   * Unpacks a float packed using Cartesian4.packFloat.
   *
   * @param {Cartesian4} packedFloat A Cartesian4 containing a float packed to 4 values representable using uint8.
   * @returns {Number} The unpacked float.
   * @private
   */
  Cartesian4.unpackFloat = function (packedFloat) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("packedFloat", packedFloat);
    //>>includeEnd('debug');

    // scratchU8Array and scratchF32Array are views into the same buffer
    if (littleEndian) {
      scratchU8Array[0] = packedFloat.x;
      scratchU8Array[1] = packedFloat.y;
      scratchU8Array[2] = packedFloat.z;
      scratchU8Array[3] = packedFloat.w;
    } else {
      // convert from little-endian to big-endian
      scratchU8Array[0] = packedFloat.w;
      scratchU8Array[1] = packedFloat.z;
      scratchU8Array[2] = packedFloat.y;
      scratchU8Array[3] = packedFloat.x;
    }
    return scratchF32Array[0];
  };

  /**
   * A 4x4 matrix, indexable as a column-major order array.
   * Constructor parameters are in row-major order for code readability.
   * @alias Matrix4
   * @constructor
   * @implements {ArrayLike<number>}
   *
   * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
   * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
   * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
   * @param {Number} [column3Row0=0.0] The value for column 3, row 0.
   * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
   * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
   * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
   * @param {Number} [column3Row1=0.0] The value for column 3, row 1.
   * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
   * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
   * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
   * @param {Number} [column3Row2=0.0] The value for column 3, row 2.
   * @param {Number} [column0Row3=0.0] The value for column 0, row 3.
   * @param {Number} [column1Row3=0.0] The value for column 1, row 3.
   * @param {Number} [column2Row3=0.0] The value for column 2, row 3.
   * @param {Number} [column3Row3=0.0] The value for column 3, row 3.
   *
   * @see Matrix4.fromColumnMajorArray
   * @see Matrix4.fromRowMajorArray
   * @see Matrix4.fromRotationTranslation
   * @see Matrix4.fromTranslationRotationScale
   * @see Matrix4.fromTranslationQuaternionRotationScale
   * @see Matrix4.fromTranslation
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
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
    column3Row3
  ) {
    this[0] = when.defaultValue(column0Row0, 0.0);
    this[1] = when.defaultValue(column0Row1, 0.0);
    this[2] = when.defaultValue(column0Row2, 0.0);
    this[3] = when.defaultValue(column0Row3, 0.0);
    this[4] = when.defaultValue(column1Row0, 0.0);
    this[5] = when.defaultValue(column1Row1, 0.0);
    this[6] = when.defaultValue(column1Row2, 0.0);
    this[7] = when.defaultValue(column1Row3, 0.0);
    this[8] = when.defaultValue(column2Row0, 0.0);
    this[9] = when.defaultValue(column2Row1, 0.0);
    this[10] = when.defaultValue(column2Row2, 0.0);
    this[11] = when.defaultValue(column2Row3, 0.0);
    this[12] = when.defaultValue(column3Row0, 0.0);
    this[13] = when.defaultValue(column3Row1, 0.0);
    this[14] = when.defaultValue(column3Row2, 0.0);
    this[15] = when.defaultValue(column3Row3, 0.0);
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Matrix4.packedLength = 16;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Matrix4} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Matrix4.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

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
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Matrix4} [result] The object into which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
   */
  Matrix4.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    if (!when.defined(result)) {
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
   * Duplicates a Matrix4 instance.
   *
   * @param {Matrix4} matrix The matrix to duplicate.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. (Returns undefined if matrix is undefined)
   */
  Matrix4.clone = function (matrix, result) {
    if (!when.defined(matrix)) {
      return undefined;
    }
    if (!when.defined(result)) {
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
        matrix[15]
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
   * @param {Number[]} array The array whose 16 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
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
   * var v = [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
   * var m = Cesium.Matrix4.fromArray(v);
   *
   * // Create same Matrix4 with using an offset into an array
   * var v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
   * var m2 = Cesium.Matrix4.fromArray(v2, 2);
   */
  Matrix4.fromArray = Matrix4.unpack;

  /**
   * Computes a Matrix4 instance from a column-major order array.
   *
   * @param {Number[]} values The column-major order array.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromColumnMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    return Matrix4.clone(values, result);
  };

  /**
   * Computes a Matrix4 instance from a row-major order array.
   * The resulting matrix will be in column-major order.
   *
   * @param {Number[]} values The row-major order array.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromRowMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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
        values[15]
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
    Check.Check.typeOf.object("rotation", rotation);
    //>>includeEnd('debug');

    translation = when.defaultValue(translation, Cartesian2.Cartesian3.ZERO);

    if (!when.defined(result)) {
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
        1.0
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
   * var result = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
   *   new Cesium.Cartesian3(1.0, 2.0, 3.0), // translation
   *   Cesium.Quaternion.IDENTITY,           // rotation
   *   new Cesium.Cartesian3(7.0, 8.0, 9.0), // scale
   *   result);
   */
  Matrix4.fromTranslationQuaternionRotationScale = function (
    translation,
    rotation,
    scale,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("translation", translation);
    Check.Check.typeOf.object("rotation", rotation);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new Matrix4();
    }

    var scaleX = scale.x;
    var scaleY = scale.y;
    var scaleZ = scale.z;

    var x2 = rotation.x * rotation.x;
    var xy = rotation.x * rotation.y;
    var xz = rotation.x * rotation.z;
    var xw = rotation.x * rotation.w;
    var y2 = rotation.y * rotation.y;
    var yz = rotation.y * rotation.z;
    var yw = rotation.y * rotation.w;
    var z2 = rotation.z * rotation.z;
    var zw = rotation.z * rotation.w;
    var w2 = rotation.w * rotation.w;

    var m00 = x2 - y2 - z2 + w2;
    var m01 = 2.0 * (xy - zw);
    var m02 = 2.0 * (xz + yw);

    var m10 = 2.0 * (xy + zw);
    var m11 = -x2 + y2 - z2 + w2;
    var m12 = 2.0 * (yz - xw);

    var m20 = 2.0 * (xz - yw);
    var m21 = 2.0 * (yz + xw);
    var m22 = -x2 - y2 + z2 + w2;

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
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("translationRotationScale", translationRotationScale);
    //>>includeEnd('debug');

    return Matrix4.fromTranslationQuaternionRotationScale(
      translationRotationScale.translation,
      translationRotationScale.rotation,
      translationRotationScale.scale,
      result
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
    Check.Check.typeOf.object("translation", translation);
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
   * var m = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  Matrix4.fromScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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
        1.0
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
   * @param {Number} scale The uniform scale factor.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [2.0, 0.0, 0.0, 0.0]
   * //   [0.0, 2.0, 0.0, 0.0]
   * //   [0.0, 0.0, 2.0, 0.0]
   * //   [0.0, 0.0, 0.0, 1.0]
   * var m = Cesium.Matrix4.fromUniformScale(2.0);
   */
  Matrix4.fromUniformScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("scale", scale);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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
        1.0
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

  var fromCameraF = new Cartesian2.Cartesian3();
  var fromCameraR = new Cartesian2.Cartesian3();
  var fromCameraU = new Cartesian2.Cartesian3();

  /**
   * Computes a Matrix4 instance from a Camera.
   *
   * @param {Camera} camera The camera to use.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromCamera = function (camera, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("camera", camera);
    //>>includeEnd('debug');

    var position = camera.position;
    var direction = camera.direction;
    var up = camera.up;

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("camera.position", position);
    Check.Check.typeOf.object("camera.direction", direction);
    Check.Check.typeOf.object("camera.up", up);
    //>>includeEnd('debug');

    Cartesian2.Cartesian3.normalize(direction, fromCameraF);
    Cartesian2.Cartesian3.normalize(
      Cartesian2.Cartesian3.cross(fromCameraF, up, fromCameraR),
      fromCameraR
    );
    Cartesian2.Cartesian3.normalize(
      Cartesian2.Cartesian3.cross(fromCameraR, fromCameraF, fromCameraU),
      fromCameraU
    );

    var sX = fromCameraR.x;
    var sY = fromCameraR.y;
    var sZ = fromCameraR.z;
    var fX = fromCameraF.x;
    var fY = fromCameraF.y;
    var fZ = fromCameraF.z;
    var uX = fromCameraU.x;
    var uY = fromCameraU.y;
    var uZ = fromCameraU.z;
    var positionX = position.x;
    var positionY = position.y;
    var positionZ = position.z;
    var t0 = sX * -positionX + sY * -positionY + sZ * -positionZ;
    var t1 = uX * -positionX + uY * -positionY + uZ * -positionZ;
    var t2 = fX * positionX + fY * positionY + fZ * positionZ;

    // The code below this comment is an optimized
    // version of the commented lines.
    // Rather that create two matrices and then multiply,
    // we just bake in the multiplcation as part of creation.
    // var rotation = new Matrix4(
    //                 sX,  sY,  sZ, 0.0,
    //                 uX,  uY,  uZ, 0.0,
    //                -fX, -fY, -fZ, 0.0,
    //                 0.0,  0.0,  0.0, 1.0);
    // var translation = new Matrix4(
    //                 1.0, 0.0, 0.0, -position.x,
    //                 0.0, 1.0, 0.0, -position.y,
    //                 0.0, 0.0, 1.0, -position.z,
    //                 0.0, 0.0, 0.0, 1.0);
    // return rotation.multiply(translation);
    if (!when.defined(result)) {
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
        1.0
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
   * @param {Number} fovY The field of view along the Y axis in radians.
   * @param {Number} aspectRatio The aspect ratio.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Number} far The distance to the far plane in meters.
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
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThan("fovY", fovY, 0.0);
    Check.Check.typeOf.number.lessThan("fovY", fovY, Math.PI);
    Check.Check.typeOf.number.greaterThan("near", near, 0.0);
    Check.Check.typeOf.number.greaterThan("far", far, 0.0);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var bottom = Math.tan(fovY * 0.5);

    var column1Row1 = 1.0 / bottom;
    var column0Row0 = column1Row1 / aspectRatio;
    var column2Row2 = (far + near) / (near - far);
    var column3Row2 = (2.0 * far * near) / (near - far);

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
   * @param {Number} left The number of meters to the left of the camera that will be in view.
   * @param {Number} right The number of meters to the right of the camera that will be in view.
   * @param {Number} bottom The number of meters below of the camera that will be in view.
   * @param {Number} top The number of meters above of the camera that will be in view.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Number} far The distance to the far plane in meters.
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
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("left", left);
    Check.Check.typeOf.number("right", right);
    Check.Check.typeOf.number("bottom", bottom);
    Check.Check.typeOf.number("top", top);
    Check.Check.typeOf.number("near", near);
    Check.Check.typeOf.number("far", far);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var a = 1.0 / (right - left);
    var b = 1.0 / (top - bottom);
    var c = 1.0 / (far - near);

    var tx = -(right + left) * a;
    var ty = -(top + bottom) * b;
    var tz = -(far + near) * c;
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
   * @param {Number} left The number of meters to the left of the camera that will be in view.
   * @param {Number} right The number of meters to the right of the camera that will be in view.
   * @param {Number} bottom The number of meters below of the camera that will be in view.
   * @param {Number} top The number of meters above of the camera that will be in view.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Number} far The distance to the far plane in meters.
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
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("left", left);
    Check.Check.typeOf.number("right", right);
    Check.Check.typeOf.number("bottom", bottom);
    Check.Check.typeOf.number("top", top);
    Check.Check.typeOf.number("near", near);
    Check.Check.typeOf.number("far", far);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var column0Row0 = (2.0 * near) / (right - left);
    var column1Row1 = (2.0 * near) / (top - bottom);
    var column2Row0 = (right + left) / (right - left);
    var column2Row1 = (top + bottom) / (top - bottom);
    var column2Row2 = -(far + near) / (far - near);
    var column2Row3 = -1.0;
    var column3Row2 = (-2.0 * far * near) / (far - near);

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
   * @param {Number} left The number of meters to the left of the camera that will be in view.
   * @param {Number} right The number of meters to the right of the camera that will be in view.
   * @param {Number} bottom The number of meters below of the camera that will be in view.
   * @param {Number} top The number of meters above of the camera that will be in view.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Matrix4} result The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.computeInfinitePerspectiveOffCenter = function (
    left,
    right,
    bottom,
    top,
    near,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("left", left);
    Check.Check.typeOf.number("right", right);
    Check.Check.typeOf.number("bottom", bottom);
    Check.Check.typeOf.number("top", top);
    Check.Check.typeOf.number("near", near);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var column0Row0 = (2.0 * near) / (right - left);
    var column1Row1 = (2.0 * near) / (top - bottom);
    var column2Row0 = (right + left) / (right - left);
    var column2Row1 = (top + bottom) / (top - bottom);
    var column2Row2 = -1.0;
    var column2Row3 = -1.0;
    var column3Row2 = -2.0 * near;

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
   * @param {Object} [viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
   * @param {Number} [nearDepthRange=0.0] The near plane distance in window coordinates.
   * @param {Number} [farDepthRange=1.0] The far plane distance in window coordinates.
   * @param {Matrix4} [result] The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * // Create viewport transformation using an explicit viewport and depth range.
   * var m = Cesium.Matrix4.computeViewportTransformation({
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
    result
  ) {
    if (!when.defined(result)) {
      result = new Matrix4();
    }

    viewport = when.defaultValue(viewport, when.defaultValue.EMPTY_OBJECT);
    var x = when.defaultValue(viewport.x, 0.0);
    var y = when.defaultValue(viewport.y, 0.0);
    var width = when.defaultValue(viewport.width, 0.0);
    var height = when.defaultValue(viewport.height, 0.0);
    nearDepthRange = when.defaultValue(nearDepthRange, 0.0);
    farDepthRange = when.defaultValue(farDepthRange, 1.0);

    var halfWidth = width * 0.5;
    var halfHeight = height * 0.5;
    var halfDepth = (farDepthRange - nearDepthRange) * 0.5;

    var column0Row0 = halfWidth;
    var column1Row1 = halfHeight;
    var column2Row2 = halfDepth;
    var column3Row0 = x + halfWidth;
    var column3Row1 = y + halfHeight;
    var column3Row2 = nearDepthRange + halfDepth;
    var column3Row3 = 1.0;

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
    Check.Check.typeOf.object("position", position);
    Check.Check.typeOf.object("direction", direction);
    Check.Check.typeOf.object("up", up);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
    result[12] = -Cartesian2.Cartesian3.dot(right, position);
    result[13] = -Cartesian2.Cartesian3.dot(up, position);
    result[14] = Cartesian2.Cartesian3.dot(direction, position);
    result[15] = 1.0;
    return result;
  };

  /**
   * Computes an Array from the provided Matrix4 instance.
   * The array will be in column-major order.
   *
   * @param {Matrix4} matrix The matrix to use..
   * @param {Number[]} [result] The Array onto which to store the result.
   * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
   *
   * @example
   * //create an array from an instance of Matrix4
   * // m = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   * var a = Cesium.Matrix4.toArray(m);
   *
   * // m remains the same
   * //creates a = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0]
   */
  Matrix4.toArray = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
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
   * @param {Number} row The zero-based index of the row.
   * @param {Number} column The zero-based index of the column.
   * @returns {Number} The index of the element at the provided row and column.
   *
   * @exception {DeveloperError} row must be 0, 1, 2, or 3.
   * @exception {DeveloperError} column must be 0, 1, 2, or 3.
   *
   * @example
   * var myMatrix = new Cesium.Matrix4();
   * var column1Row0Index = Cesium.Matrix4.getElementIndex(1, 0);
   * var column1Row0 = myMatrix[column1Row0Index];
   * myMatrix[column1Row0Index] = 10.0;
   */
  Matrix4.getElementIndex = function (column, row) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("row", row, 0);
    Check.Check.typeOf.number.lessThanOrEquals("row", row, 3);

    Check.Check.typeOf.number.greaterThanOrEquals("column", column, 0);
    Check.Check.typeOf.number.lessThanOrEquals("column", column, 3);
    //>>includeEnd('debug');

    return column * 4 + row;
  };

  /**
   * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to retrieve.
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
   * var a = Cesium.Matrix4.getColumn(m, 2, new Cesium.Cartesian4());
   *
   * @example
   * //Example 2: Sets values for Cartesian instance
   * var a = new Cesium.Cartesian4();
   * Cesium.Matrix4.getColumn(m, 2, a);
   *
   * // a.x = 12.0; a.y = 16.0; a.z = 20.0; a.w = 24.0;
   */
  Matrix4.getColumn = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var startIndex = index * 4;
    var x = matrix[startIndex];
    var y = matrix[startIndex + 1];
    var z = matrix[startIndex + 2];
    var w = matrix[startIndex + 3];

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
   * @param {Number} index The zero-based index of the column to set.
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
   * var a = Cesium.Matrix4.setColumn(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [10.0, 11.0, 99.0, 13.0]
   * //     [14.0, 15.0, 98.0, 17.0]
   * //     [18.0, 19.0, 97.0, 21.0]
   * //     [22.0, 23.0, 96.0, 25.0]
   */
  Matrix4.setColumn = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix4.clone(matrix, result);
    var startIndex = index * 4;
    result[startIndex] = cartesian.x;
    result[startIndex + 1] = cartesian.y;
    result[startIndex + 2] = cartesian.z;
    result[startIndex + 3] = cartesian.w;
    return result;
  };

  /**
   * Computes a new matrix that replaces the translation in the rightmost column of the provided
   * matrix with the provided translation.  This assumes the matrix is an affine transformation
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Cartesian3} translation The translation that replaces the translation of the provided matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.setTranslation = function (matrix, translation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("translation", translation);
    Check.Check.typeOf.object("result", result);
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

  var scaleScratch = new Cartesian2.Cartesian3();
  /**
   * Computes a new matrix that replaces the scale with the provided scale.  This assumes the matrix is an affine transformation
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Cartesian3} scale The scale that replaces the scale of the provided matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.setScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var existingScale = Matrix4.getScale(matrix, scaleScratch);
    var newScale = Cartesian2.Cartesian3.divideComponents(
      scale,
      existingScale,
      scaleScratch
    );
    return Matrix4.multiplyByScale(matrix, newScale, result);
  };

  /**
   * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to retrieve.
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
   * var a = Cesium.Matrix4.getRow(m, 2, new Cesium.Cartesian4());
   *
   * @example
   * //Example 2: Sets values for a Cartesian instance
   * var a = new Cesium.Cartesian4();
   * Cesium.Matrix4.getRow(m, 2, a);
   *
   * // a.x = 18.0; a.y = 19.0; a.z = 20.0; a.w = 21.0;
   */
  Matrix4.getRow = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var x = matrix[index];
    var y = matrix[index + 4];
    var z = matrix[index + 8];
    var w = matrix[index + 12];

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
   * @param {Number} index The zero-based index of the row to set.
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
   * var a = Cesium.Matrix4.setRow(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [99.0, 98.0, 97.0, 96.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   */
  Matrix4.setRow = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix4.clone(matrix, result);
    result[index] = cartesian.x;
    result[index + 4] = cartesian.y;
    result[index + 8] = cartesian.z;
    result[index + 12] = cartesian.w;
    return result;
  };

  var scratchColumn = new Cartesian2.Cartesian3();

  /**
   * Extracts the non-uniform scale assuming the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter
   */
  Matrix4.getScale = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn)
    );
    result.y = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.fromElements(matrix[4], matrix[5], matrix[6], scratchColumn)
    );
    result.z = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.fromElements(matrix[8], matrix[9], matrix[10], scratchColumn)
    );
    return result;
  };

  var scratchScale$1 = new Cartesian2.Cartesian3();

  /**
   * Computes the maximum scale assuming the matrix is an affine transformation.
   * The maximum scale is the maximum length of the column vectors in the upper-left
   * 3x3 matrix.
   *
   * @param {Matrix4} matrix The matrix.
   * @returns {Number} The maximum scale.
   */
  Matrix4.getMaximumScale = function (matrix) {
    Matrix4.getScale(matrix, scratchScale$1);
    return Cartesian2.Cartesian3.maximumComponent(scratchScale$1);
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var left0 = left[0];
    var left1 = left[1];
    var left2 = left[2];
    var left3 = left[3];
    var left4 = left[4];
    var left5 = left[5];
    var left6 = left[6];
    var left7 = left[7];
    var left8 = left[8];
    var left9 = left[9];
    var left10 = left[10];
    var left11 = left[11];
    var left12 = left[12];
    var left13 = left[13];
    var left14 = left[14];
    var left15 = left[15];

    var right0 = right[0];
    var right1 = right[1];
    var right2 = right[2];
    var right3 = right[3];
    var right4 = right[4];
    var right5 = right[5];
    var right6 = right[6];
    var right7 = right[7];
    var right8 = right[8];
    var right9 = right[9];
    var right10 = right[10];
    var right11 = right[11];
    var right12 = right[12];
    var right13 = right[13];
    var right14 = right[14];
    var right15 = right[15];

    var column0Row0 =
      left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
    var column0Row1 =
      left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
    var column0Row2 =
      left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
    var column0Row3 =
      left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

    var column1Row0 =
      left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
    var column1Row1 =
      left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
    var column1Row2 =
      left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
    var column1Row3 =
      left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

    var column2Row0 =
      left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
    var column2Row1 =
      left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
    var column2Row2 =
      left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
    var column2Row3 =
      left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

    var column3Row0 =
      left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
    var column3Row1 =
      left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
    var column3Row2 =
      left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
    var column3Row3 =
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
   * Computes the product of two matrices assuming the matrices are
   * affine transformation matrices, where the upper left 3x3 elements
   * are a rotation matrix, and the upper three elements in the fourth
   * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
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
   * var m1 = new Cesium.Matrix4(1.0, 6.0, 7.0, 0.0, 2.0, 5.0, 8.0, 0.0, 3.0, 4.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0);
   * var m2 = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(1.0, 1.0, 1.0));
   * var m3 = Cesium.Matrix4.multiplyTransformation(m1, m2, new Cesium.Matrix4());
   */
  Matrix4.multiplyTransformation = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var left0 = left[0];
    var left1 = left[1];
    var left2 = left[2];
    var left4 = left[4];
    var left5 = left[5];
    var left6 = left[6];
    var left8 = left[8];
    var left9 = left[9];
    var left10 = left[10];
    var left12 = left[12];
    var left13 = left[13];
    var left14 = left[14];

    var right0 = right[0];
    var right1 = right[1];
    var right2 = right[2];
    var right4 = right[4];
    var right5 = right[5];
    var right6 = right[6];
    var right8 = right[8];
    var right9 = right[9];
    var right10 = right[10];
    var right12 = right[12];
    var right13 = right[13];
    var right14 = right[14];

    var column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
    var column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
    var column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

    var column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
    var column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
    var column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

    var column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
    var column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
    var column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

    var column3Row0 =
      left0 * right12 + left4 * right13 + left8 * right14 + left12;
    var column3Row1 =
      left1 * right12 + left5 * right13 + left9 * right14 + left13;
    var column3Row2 =
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
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("rotation", rotation);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var left0 = matrix[0];
    var left1 = matrix[1];
    var left2 = matrix[2];
    var left4 = matrix[4];
    var left5 = matrix[5];
    var left6 = matrix[6];
    var left8 = matrix[8];
    var left9 = matrix[9];
    var left10 = matrix[10];

    var right0 = rotation[0];
    var right1 = rotation[1];
    var right2 = rotation[2];
    var right4 = rotation[3];
    var right5 = rotation[4];
    var right6 = rotation[5];
    var right8 = rotation[6];
    var right9 = rotation[7];
    var right10 = rotation[8];

    var column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
    var column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
    var column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

    var column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
    var column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
    var column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

    var column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
    var column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
    var column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

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
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("translation", translation);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var x = translation.x;
    var y = translation.y;
    var z = translation.z;

    var tx = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
    var ty = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
    var tz = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];

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

  var uniformScaleScratch = new Cartesian2.Cartesian3();

  /**
   * Multiplies an affine transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
   * by an implicit uniform scale matrix.  This is an optimization
   * for <code>Matrix4.multiply(m, Matrix4.fromUniformScale(scale), m);</code>, where
   * <code>m</code> must be an affine matrix.
   * This function performs fewer allocations and arithmetic operations.
   *
   * @param {Matrix4} matrix The affine matrix on the left-hand side.
   * @param {Number} scale The uniform scale on the right-hand side.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   *
   * @example
   * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromUniformScale(scale), m);
   * Cesium.Matrix4.multiplyByUniformScale(m, scale, m);
   *
   * @see Matrix4.fromUniformScale
   * @see Matrix4.multiplyByScale
   */
  Matrix4.multiplyByUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    uniformScaleScratch.x = scale;
    uniformScaleScratch.y = scale;
    uniformScaleScratch.z = scale;
    return Matrix4.multiplyByScale(matrix, uniformScaleScratch, result);
  };

  /**
   * Multiplies an affine transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
   * by an implicit non-uniform scale matrix.  This is an optimization
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
   * @see Matrix4.fromScale
   * @see Matrix4.multiplyByUniformScale
   */
  Matrix4.multiplyByScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var scaleX = scale.x;
    var scaleY = scale.y;
    var scaleZ = scale.z;

    // Faster than Cartesian3.equals
    if (scaleX === 1.0 && scaleY === 1.0 && scaleZ === 1.0) {
      return Matrix4.clone(matrix, result);
    }

    result[0] = scaleX * matrix[0];
    result[1] = scaleX * matrix[1];
    result[2] = scaleX * matrix[2];
    result[3] = 0.0;
    result[4] = scaleY * matrix[4];
    result[5] = scaleY * matrix[5];
    result[6] = scaleY * matrix[6];
    result[7] = 0.0;
    result[8] = scaleZ * matrix[8];
    result[9] = scaleZ * matrix[9];
    result[10] = scaleZ * matrix[10];
    result[11] = 0.0;
    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = 1.0;
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
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var vX = cartesian.x;
    var vY = cartesian.y;
    var vZ = cartesian.z;
    var vW = cartesian.w;

    var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
    var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
    var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
    var w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

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
   * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
   * var result = Cesium.Matrix4.multiplyByPointAsVector(matrix, p, new Cesium.Cartesian3());
   * // A shortcut for
   * //   Cartesian3 p = ...
   * //   Cesium.Matrix4.multiplyByVector(matrix, new Cesium.Cartesian4(p.x, p.y, p.z, 0.0), result);
   */
  Matrix4.multiplyByPointAsVector = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var vX = cartesian.x;
    var vY = cartesian.y;
    var vZ = cartesian.z;

    var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
    var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
    var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;

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
   * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
   * var result = Cesium.Matrix4.multiplyByPoint(matrix, p, new Cesium.Cartesian3());
   */
  Matrix4.multiplyByPoint = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var vX = cartesian.x;
    var vY = cartesian.y;
    var vZ = cartesian.z;

    var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
    var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
    var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes the product of a matrix and a scalar.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Number} scalar The number to multiply by.
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
   * var a = Cesium.Matrix4.multiplyByScalar(m, -2, new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [-20.0, -22.0, -24.0, -26.0]
   * //     [-28.0, -30.0, -32.0, -34.0]
   * //     [-36.0, -38.0, -40.0, -42.0]
   * //     [-44.0, -46.0, -48.0, -50.0]
   */
  Matrix4.multiplyByScalar = function (matrix, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
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
   * var a = Cesium.Matrix4.negate(m, new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [-10.0, -11.0, -12.0, -13.0]
   * //     [-14.0, -15.0, -16.0, -17.0]
   * //     [-18.0, -19.0, -20.0, -21.0]
   * //     [-22.0, -23.0, -24.0, -25.0]
   */
  Matrix4.negate = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
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
   * var a = Cesium.Matrix4.transpose(m, new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   */
  Matrix4.transpose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var matrix1 = matrix[1];
    var matrix2 = matrix[2];
    var matrix3 = matrix[3];
    var matrix6 = matrix[6];
    var matrix7 = matrix[7];
    var matrix11 = matrix[11];

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
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
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
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
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
      (when.defined(left) &&
        when.defined(right) &&
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
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
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
    epsilon = when.defaultValue(epsilon, 0);

    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
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
   * Gets the translation portion of the provided matrix, assuming the matrix is a affine transformation matrix.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Matrix4.getTranslation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = matrix[12];
    result.y = matrix[13];
    result.z = matrix[14];
    return result;
  };

  /**
   * Gets the upper left 3x3 rotation matrix of the provided matrix, assuming the matrix is an affine transformation matrix.
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
   * var b = new Cesium.Matrix3();
   * Cesium.Matrix4.getMatrix3(m,b);
   *
   * // b = [10.0, 14.0, 18.0]
   * //     [11.0, 15.0, 19.0]
   * //     [12.0, 16.0, 20.0]
   */
  Matrix4.getMatrix3 = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
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

  var scratchInverseRotation = new Matrix3();
  var scratchMatrix3Zero = new Matrix3();
  var scratchBottomRow = new Cartesian4();
  var scratchExpectedBottomRow = new Cartesian4(0.0, 0.0, 0.0, 1.0);

  /**
   * Computes the inverse of the provided matrix using Cramers Rule.
   * If the determinant is zero, the matrix can not be inverted, and an exception is thrown.
   * If the matrix is an affine transformation matrix, it is more efficient
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
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');
    //
    // Ported from:
    //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
    //
    var src0 = matrix[0];
    var src1 = matrix[4];
    var src2 = matrix[8];
    var src3 = matrix[12];
    var src4 = matrix[1];
    var src5 = matrix[5];
    var src6 = matrix[9];
    var src7 = matrix[13];
    var src8 = matrix[2];
    var src9 = matrix[6];
    var src10 = matrix[10];
    var src11 = matrix[14];
    var src12 = matrix[3];
    var src13 = matrix[7];
    var src14 = matrix[11];
    var src15 = matrix[15];

    // calculate pairs for first 8 elements (cofactors)
    var tmp0 = src10 * src15;
    var tmp1 = src11 * src14;
    var tmp2 = src9 * src15;
    var tmp3 = src11 * src13;
    var tmp4 = src9 * src14;
    var tmp5 = src10 * src13;
    var tmp6 = src8 * src15;
    var tmp7 = src11 * src12;
    var tmp8 = src8 * src14;
    var tmp9 = src10 * src12;
    var tmp10 = src8 * src13;
    var tmp11 = src9 * src12;

    // calculate first 8 elements (cofactors)
    var dst0 =
      tmp0 * src5 +
      tmp3 * src6 +
      tmp4 * src7 -
      (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
    var dst1 =
      tmp1 * src4 +
      tmp6 * src6 +
      tmp9 * src7 -
      (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
    var dst2 =
      tmp2 * src4 +
      tmp7 * src5 +
      tmp10 * src7 -
      (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
    var dst3 =
      tmp5 * src4 +
      tmp8 * src5 +
      tmp11 * src6 -
      (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
    var dst4 =
      tmp1 * src1 +
      tmp2 * src2 +
      tmp5 * src3 -
      (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
    var dst5 =
      tmp0 * src0 +
      tmp7 * src2 +
      tmp8 * src3 -
      (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
    var dst6 =
      tmp3 * src0 +
      tmp6 * src1 +
      tmp11 * src3 -
      (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
    var dst7 =
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
    var dst8 =
      tmp0 * src13 +
      tmp3 * src14 +
      tmp4 * src15 -
      (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
    var dst9 =
      tmp1 * src12 +
      tmp6 * src14 +
      tmp9 * src15 -
      (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
    var dst10 =
      tmp2 * src12 +
      tmp7 * src13 +
      tmp10 * src15 -
      (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
    var dst11 =
      tmp5 * src12 +
      tmp8 * src13 +
      tmp11 * src14 -
      (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
    var dst12 =
      tmp2 * src10 +
      tmp5 * src11 +
      tmp1 * src9 -
      (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
    var dst13 =
      tmp8 * src11 +
      tmp0 * src8 +
      tmp7 * src10 -
      (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
    var dst14 =
      tmp6 * src9 +
      tmp11 * src11 +
      tmp3 * src8 -
      (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
    var dst15 =
      tmp10 * src10 +
      tmp4 * src8 +
      tmp9 * src9 -
      (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);

    // calculate determinant
    var det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;

    if (Math.abs(det) < _Math.CesiumMath.EPSILON21) {
      // Special case for a zero scale matrix that can occur, for example,
      // when a model's node has a [0, 0, 0] scale.
      if (
        Matrix3.equalsEpsilon(
          Matrix4.getMatrix3(matrix, scratchInverseRotation),
          scratchMatrix3Zero,
          _Math.CesiumMath.EPSILON7
        ) &&
        Cartesian4.equals(
          Matrix4.getRow(matrix, 3, scratchBottomRow),
          scratchExpectedBottomRow
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

      throw new RuntimeError.RuntimeError(
        "matrix is not invertible because its determinate is zero."
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
   * Computes the inverse of the provided matrix assuming it is
   * an affine transformation matrix, where the upper left 3x3 elements
   * are a rotation matrix, and the upper three elements in the fourth
   * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
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
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    //This function is an optimized version of the below 4 lines.
    //var rT = Matrix3.transpose(Matrix4.getMatrix3(matrix));
    //var rTN = Matrix3.negate(rT);
    //var rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
    //return Matrix4.fromRotationTranslation(rT, rTT, result);

    var matrix0 = matrix[0];
    var matrix1 = matrix[1];
    var matrix2 = matrix[2];
    var matrix4 = matrix[4];
    var matrix5 = matrix[5];
    var matrix6 = matrix[6];
    var matrix8 = matrix[8];
    var matrix9 = matrix[9];
    var matrix10 = matrix[10];

    var vX = matrix[12];
    var vY = matrix[13];
    var vZ = matrix[14];

    var x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
    var y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
    var z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

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

  var scratchTransposeMatrix = new Matrix4();

  /**
   * Computes the inverse transpose of a matrix.
   *
   * @param {Matrix4} matrix The matrix to transpose and invert.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.inverseTranspose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    return Matrix4.inverse(
      Matrix4.transpose(matrix, scratchTransposeMatrix),
      result
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
      1.0
    )
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
      0.0
    )
  );

  /**
   * The index into Matrix4 for column 0, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW0 = 0;

  /**
   * The index into Matrix4 for column 0, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW1 = 1;

  /**
   * The index into Matrix4 for column 0, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW2 = 2;

  /**
   * The index into Matrix4 for column 0, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW3 = 3;

  /**
   * The index into Matrix4 for column 1, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW0 = 4;

  /**
   * The index into Matrix4 for column 1, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW1 = 5;

  /**
   * The index into Matrix4 for column 1, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW2 = 6;

  /**
   * The index into Matrix4 for column 1, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW3 = 7;

  /**
   * The index into Matrix4 for column 2, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW0 = 8;

  /**
   * The index into Matrix4 for column 2, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW1 = 9;

  /**
   * The index into Matrix4 for column 2, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW2 = 10;

  /**
   * The index into Matrix4 for column 2, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW3 = 11;

  /**
   * The index into Matrix4 for column 3, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW0 = 12;

  /**
   * The index into Matrix4 for column 3, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW1 = 13;

  /**
   * The index into Matrix4 for column 3, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW2 = 14;

  /**
   * The index into Matrix4 for column 3, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW3 = 15;

  Object.defineProperties(Matrix4.prototype, {
    /**
     * Gets the number of items in the collection.
     * @memberof Matrix4.prototype
     *
     * @type {Number}
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
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
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
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix4.prototype.equalsEpsilon = function (right, epsilon) {
    return Matrix4.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Computes a string representing this Matrix with each row being
   * on a separate line and in the format '(column0, column1, column2, column3)'.
   *
   * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2, column3)'.
   */
  Matrix4.prototype.toString = function () {
    return (
      "(" +
      this[0] +
      ", " +
      this[4] +
      ", " +
      this[8] +
      ", " +
      this[12] +
      ")\n" +
      "(" +
      this[1] +
      ", " +
      this[5] +
      ", " +
      this[9] +
      ", " +
      this[13] +
      ")\n" +
      "(" +
      this[2] +
      ", " +
      this[6] +
      ", " +
      this[10] +
      ", " +
      this[14] +
      ")\n" +
      "(" +
      this[3] +
      ", " +
      this[7] +
      ", " +
      this[11] +
      ", " +
      this[15] +
      ")"
    );
  };

  /**
   * A bounding sphere with a center and a radius.
   * @alias BoundingSphere
   * @constructor
   *
   * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
   * @param {Number} [radius=0.0] The radius of the bounding sphere.
   *
   * @see AxisAlignedBoundingBox
   * @see BoundingRectangle
   * @see Packable
   */
  function BoundingSphere(center, radius) {
    /**
     * The center point of the sphere.
     * @type {Cartesian3}
     * @default {@link Cartesian3.ZERO}
     */
    this.center = Cartesian2.Cartesian3.clone(when.defaultValue(center, Cartesian2.Cartesian3.ZERO));

    /**
     * The radius of the sphere.
     * @type {Number}
     * @default 0.0
     */
    this.radius = when.defaultValue(radius, 0.0);
  }

  var fromPointsXMin = new Cartesian2.Cartesian3();
  var fromPointsYMin = new Cartesian2.Cartesian3();
  var fromPointsZMin = new Cartesian2.Cartesian3();
  var fromPointsXMax = new Cartesian2.Cartesian3();
  var fromPointsYMax = new Cartesian2.Cartesian3();
  var fromPointsZMax = new Cartesian2.Cartesian3();
  var fromPointsCurrentPos = new Cartesian2.Cartesian3();
  var fromPointsScratch = new Cartesian2.Cartesian3();
  var fromPointsRitterCenter = new Cartesian2.Cartesian3();
  var fromPointsMinBoxPt = new Cartesian2.Cartesian3();
  var fromPointsMaxBoxPt = new Cartesian2.Cartesian3();
  var fromPointsNaiveCenterScratch = new Cartesian2.Cartesian3();
  var volumeConstant = (4.0 / 3.0) * _Math.CesiumMath.PI;

  /**
   * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
   * The bounding sphere is computed by running two algorithms, a naive algorithm and
   * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
   *
   * @param {Cartesian3[]} [positions] An array of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
   *
   * @see {@link http://help.agi.com/AGIComponents/html/BlogBoundingSphere.htm|Bounding Sphere computation article}
   */
  BoundingSphere.fromPoints = function (positions, result) {
    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    if (!when.defined(positions) || positions.length === 0) {
      result.center = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
      result.radius = 0.0;
      return result;
    }

    var currentPos = Cartesian2.Cartesian3.clone(positions[0], fromPointsCurrentPos);

    var xMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsXMin);
    var yMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsYMin);
    var zMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsZMin);

    var xMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsXMax);
    var yMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsYMax);
    var zMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsZMax);

    var numPositions = positions.length;
    var i;
    for (i = 1; i < numPositions; i++) {
      Cartesian2.Cartesian3.clone(positions[i], currentPos);

      var x = currentPos.x;
      var y = currentPos.y;
      var z = currentPos.z;

      // Store points containing the the smallest and largest components
      if (x < xMin.x) {
        Cartesian2.Cartesian3.clone(currentPos, xMin);
      }

      if (x > xMax.x) {
        Cartesian2.Cartesian3.clone(currentPos, xMax);
      }

      if (y < yMin.y) {
        Cartesian2.Cartesian3.clone(currentPos, yMin);
      }

      if (y > yMax.y) {
        Cartesian2.Cartesian3.clone(currentPos, yMax);
      }

      if (z < zMin.z) {
        Cartesian2.Cartesian3.clone(currentPos, zMin);
      }

      if (z > zMax.z) {
        Cartesian2.Cartesian3.clone(currentPos, zMax);
      }
    }

    // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
    var xSpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(xMax, xMin, fromPointsScratch)
    );
    var ySpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(yMax, yMin, fromPointsScratch)
    );
    var zSpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(zMax, zMin, fromPointsScratch)
    );

    // Set the diameter endpoints to the largest span.
    var diameter1 = xMin;
    var diameter2 = xMax;
    var maxSpan = xSpan;
    if (ySpan > maxSpan) {
      maxSpan = ySpan;
      diameter1 = yMin;
      diameter2 = yMax;
    }
    if (zSpan > maxSpan) {
      maxSpan = zSpan;
      diameter1 = zMin;
      diameter2 = zMax;
    }

    // Calculate the center of the initial sphere found by Ritter's algorithm
    var ritterCenter = fromPointsRitterCenter;
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

    // Calculate the radius of the initial sphere found by Ritter's algorithm
    var radiusSquared = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
    );
    var ritterRadius = Math.sqrt(radiusSquared);

    // Find the center of the sphere found using the Naive method.
    var minBoxPt = fromPointsMinBoxPt;
    minBoxPt.x = xMin.x;
    minBoxPt.y = yMin.y;
    minBoxPt.z = zMin.z;

    var maxBoxPt = fromPointsMaxBoxPt;
    maxBoxPt.x = xMax.x;
    maxBoxPt.y = yMax.y;
    maxBoxPt.z = zMax.z;

    var naiveCenter = Cartesian2.Cartesian3.midpoint(
      minBoxPt,
      maxBoxPt,
      fromPointsNaiveCenterScratch
    );

    // Begin 2nd pass to find naive radius and modify the ritter sphere.
    var naiveRadius = 0;
    for (i = 0; i < numPositions; i++) {
      Cartesian2.Cartesian3.clone(positions[i], currentPos);

      // Find the furthest point from the naive center to calculate the naive radius.
      var r = Cartesian2.Cartesian3.magnitude(
        Cartesian2.Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
      );
      if (r > naiveRadius) {
        naiveRadius = r;
      }

      // Make adjustments to the Ritter Sphere to include all points.
      var oldCenterToPointSquared = Cartesian2.Cartesian3.magnitudeSquared(
        Cartesian2.Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
      );
      if (oldCenterToPointSquared > radiusSquared) {
        var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
        // Calculate new radius to include the point that lies outside
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
        radiusSquared = ritterRadius * ritterRadius;
        // Calculate center of new Ritter sphere
        var oldToNew = oldCenterToPoint - ritterRadius;
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
          oldCenterToPoint;
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
          oldCenterToPoint;
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
          oldCenterToPoint;
      }
    }

    if (ritterRadius < naiveRadius) {
      Cartesian2.Cartesian3.clone(ritterCenter, result.center);
      result.radius = ritterRadius;
    } else {
      Cartesian2.Cartesian3.clone(naiveCenter, result.center);
      result.radius = naiveRadius;
    }

    return result;
  };

  var defaultProjection = new GeographicProjection();
  var fromRectangle2DLowerLeft = new Cartesian2.Cartesian3();
  var fromRectangle2DUpperRight = new Cartesian2.Cartesian3();
  var fromRectangle2DSouthwest = new Cartesian2.Cartographic();
  var fromRectangle2DNortheast = new Cartesian2.Cartographic();

  /**
   * Computes a bounding sphere from a rectangle projected in 2D.
   *
   * @param {Rectangle} [rectangle] The rectangle around which to create a bounding sphere.
   * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.fromRectangle2D = function (rectangle, projection, result) {
    return BoundingSphere.fromRectangleWithHeights2D(
      rectangle,
      projection,
      0.0,
      0.0,
      result
    );
  };

  /**
   * Computes a bounding sphere from a rectangle projected in 2D.  The bounding sphere accounts for the
   * object's minimum and maximum heights over the rectangle.
   *
   * @param {Rectangle} [rectangle] The rectangle around which to create a bounding sphere.
   * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
   * @param {Number} [minimumHeight=0.0] The minimum height over the rectangle.
   * @param {Number} [maximumHeight=0.0] The maximum height over the rectangle.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.fromRectangleWithHeights2D = function (
    rectangle,
    projection,
    minimumHeight,
    maximumHeight,
    result
  ) {
    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    if (!when.defined(rectangle)) {
      result.center = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
      result.radius = 0.0;
      return result;
    }

    projection = when.defaultValue(projection, defaultProjection);

    Cartesian2.Rectangle.southwest(rectangle, fromRectangle2DSouthwest);
    fromRectangle2DSouthwest.height = minimumHeight;
    Cartesian2.Rectangle.northeast(rectangle, fromRectangle2DNortheast);
    fromRectangle2DNortheast.height = maximumHeight;

    var lowerLeft = projection.project(
      fromRectangle2DSouthwest,
      fromRectangle2DLowerLeft
    );
    var upperRight = projection.project(
      fromRectangle2DNortheast,
      fromRectangle2DUpperRight
    );

    var width = upperRight.x - lowerLeft.x;
    var height = upperRight.y - lowerLeft.y;
    var elevation = upperRight.z - lowerLeft.z;

    result.radius =
      Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
    var center = result.center;
    center.x = lowerLeft.x + width * 0.5;
    center.y = lowerLeft.y + height * 0.5;
    center.z = lowerLeft.z + elevation * 0.5;
    return result;
  };

  var fromRectangle3DScratch = [];

  /**
   * Computes a bounding sphere from a rectangle in 3D. The bounding sphere is created using a subsample of points
   * on the ellipsoid and contained in the rectangle. It may not be accurate for all rectangles on all types of ellipsoids.
   *
   * @param {Rectangle} [rectangle] The valid rectangle used to create a bounding sphere.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the rectangle.
   * @param {Number} [surfaceHeight=0.0] The height above the surface of the ellipsoid.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.fromRectangle3D = function (
    rectangle,
    ellipsoid,
    surfaceHeight,
    result
  ) {
    ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);
    surfaceHeight = when.defaultValue(surfaceHeight, 0.0);

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    if (!when.defined(rectangle)) {
      result.center = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
      result.radius = 0.0;
      return result;
    }

    var positions = Cartesian2.Rectangle.subsample(
      rectangle,
      ellipsoid,
      surfaceHeight,
      fromRectangle3DScratch
    );
    return BoundingSphere.fromPoints(positions, result);
  };

  /**
   * Computes a tight-fitting bounding sphere enclosing a list of 3D points, where the points are
   * stored in a flat array in X, Y, Z, order.  The bounding sphere is computed by running two
   * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
   * ensure a tight fit.
   *
   * @param {Number[]} [positions] An array of points that the bounding sphere will enclose.  Each point
   *        is formed from three elements in the array in the order X, Y, Z.
   * @param {Cartesian3} [center=Cartesian3.ZERO] The position to which the positions are relative, which need not be the
   *        origin of the coordinate system.  This is useful when the positions are to be used for
   *        relative-to-center (RTC) rendering.
   * @param {Number} [stride=3] The number of array elements per vertex.  It must be at least 3, but it may
   *        be higher.  Regardless of the value of this parameter, the X coordinate of the first position
   *        is at array index 0, the Y coordinate is at array index 1, and the Z coordinate is at array index
   *        2.  When stride is 3, the X coordinate of the next position then begins at array index 3.  If
   *        the stride is 5, however, two array elements are skipped and the next position begins at array
   *        index 5.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
   *
   * @example
   * // Compute the bounding sphere from 3 positions, each specified relative to a center.
   * // In addition to the X, Y, and Z coordinates, the points array contains two additional
   * // elements per point which are ignored for the purpose of computing the bounding sphere.
   * var center = new Cesium.Cartesian3(1.0, 2.0, 3.0);
   * var points = [1.0, 2.0, 3.0, 0.1, 0.2,
   *               4.0, 5.0, 6.0, 0.1, 0.2,
   *               7.0, 8.0, 9.0, 0.1, 0.2];
   * var sphere = Cesium.BoundingSphere.fromVertices(points, center, 5);
   *
   * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
   */
  BoundingSphere.fromVertices = function (positions, center, stride, result) {
    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    if (!when.defined(positions) || positions.length === 0) {
      result.center = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
      result.radius = 0.0;
      return result;
    }

    center = when.defaultValue(center, Cartesian2.Cartesian3.ZERO);

    stride = when.defaultValue(stride, 3);

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("stride", stride, 3);
    //>>includeEnd('debug');

    var currentPos = fromPointsCurrentPos;
    currentPos.x = positions[0] + center.x;
    currentPos.y = positions[1] + center.y;
    currentPos.z = positions[2] + center.z;

    var xMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsXMin);
    var yMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsYMin);
    var zMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsZMin);

    var xMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsXMax);
    var yMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsYMax);
    var zMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsZMax);

    var numElements = positions.length;
    var i;
    for (i = 0; i < numElements; i += stride) {
      var x = positions[i] + center.x;
      var y = positions[i + 1] + center.y;
      var z = positions[i + 2] + center.z;

      currentPos.x = x;
      currentPos.y = y;
      currentPos.z = z;

      // Store points containing the the smallest and largest components
      if (x < xMin.x) {
        Cartesian2.Cartesian3.clone(currentPos, xMin);
      }

      if (x > xMax.x) {
        Cartesian2.Cartesian3.clone(currentPos, xMax);
      }

      if (y < yMin.y) {
        Cartesian2.Cartesian3.clone(currentPos, yMin);
      }

      if (y > yMax.y) {
        Cartesian2.Cartesian3.clone(currentPos, yMax);
      }

      if (z < zMin.z) {
        Cartesian2.Cartesian3.clone(currentPos, zMin);
      }

      if (z > zMax.z) {
        Cartesian2.Cartesian3.clone(currentPos, zMax);
      }
    }

    // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
    var xSpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(xMax, xMin, fromPointsScratch)
    );
    var ySpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(yMax, yMin, fromPointsScratch)
    );
    var zSpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(zMax, zMin, fromPointsScratch)
    );

    // Set the diameter endpoints to the largest span.
    var diameter1 = xMin;
    var diameter2 = xMax;
    var maxSpan = xSpan;
    if (ySpan > maxSpan) {
      maxSpan = ySpan;
      diameter1 = yMin;
      diameter2 = yMax;
    }
    if (zSpan > maxSpan) {
      maxSpan = zSpan;
      diameter1 = zMin;
      diameter2 = zMax;
    }

    // Calculate the center of the initial sphere found by Ritter's algorithm
    var ritterCenter = fromPointsRitterCenter;
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

    // Calculate the radius of the initial sphere found by Ritter's algorithm
    var radiusSquared = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
    );
    var ritterRadius = Math.sqrt(radiusSquared);

    // Find the center of the sphere found using the Naive method.
    var minBoxPt = fromPointsMinBoxPt;
    minBoxPt.x = xMin.x;
    minBoxPt.y = yMin.y;
    minBoxPt.z = zMin.z;

    var maxBoxPt = fromPointsMaxBoxPt;
    maxBoxPt.x = xMax.x;
    maxBoxPt.y = yMax.y;
    maxBoxPt.z = zMax.z;

    var naiveCenter = Cartesian2.Cartesian3.midpoint(
      minBoxPt,
      maxBoxPt,
      fromPointsNaiveCenterScratch
    );

    // Begin 2nd pass to find naive radius and modify the ritter sphere.
    var naiveRadius = 0;
    for (i = 0; i < numElements; i += stride) {
      currentPos.x = positions[i] + center.x;
      currentPos.y = positions[i + 1] + center.y;
      currentPos.z = positions[i + 2] + center.z;

      // Find the furthest point from the naive center to calculate the naive radius.
      var r = Cartesian2.Cartesian3.magnitude(
        Cartesian2.Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
      );
      if (r > naiveRadius) {
        naiveRadius = r;
      }

      // Make adjustments to the Ritter Sphere to include all points.
      var oldCenterToPointSquared = Cartesian2.Cartesian3.magnitudeSquared(
        Cartesian2.Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
      );
      if (oldCenterToPointSquared > radiusSquared) {
        var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
        // Calculate new radius to include the point that lies outside
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
        radiusSquared = ritterRadius * ritterRadius;
        // Calculate center of new Ritter sphere
        var oldToNew = oldCenterToPoint - ritterRadius;
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
          oldCenterToPoint;
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
          oldCenterToPoint;
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
          oldCenterToPoint;
      }
    }

    if (ritterRadius < naiveRadius) {
      Cartesian2.Cartesian3.clone(ritterCenter, result.center);
      result.radius = ritterRadius;
    } else {
      Cartesian2.Cartesian3.clone(naiveCenter, result.center);
      result.radius = naiveRadius;
    }

    return result;
  };

  /**
   * Computes a tight-fitting bounding sphere enclosing a list of EncodedCartesian3s, where the points are
   * stored in parallel flat arrays in X, Y, Z, order.  The bounding sphere is computed by running two
   * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
   * ensure a tight fit.
   *
   * @param {Number[]} [positionsHigh] An array of high bits of the encoded cartesians that the bounding sphere will enclose.  Each point
   *        is formed from three elements in the array in the order X, Y, Z.
   * @param {Number[]} [positionsLow] An array of low bits of the encoded cartesians that the bounding sphere will enclose.  Each point
   *        is formed from three elements in the array in the order X, Y, Z.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
   *
   * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
   */
  BoundingSphere.fromEncodedCartesianVertices = function (
    positionsHigh,
    positionsLow,
    result
  ) {
    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    if (
      !when.defined(positionsHigh) ||
      !when.defined(positionsLow) ||
      positionsHigh.length !== positionsLow.length ||
      positionsHigh.length === 0
    ) {
      result.center = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
      result.radius = 0.0;
      return result;
    }

    var currentPos = fromPointsCurrentPos;
    currentPos.x = positionsHigh[0] + positionsLow[0];
    currentPos.y = positionsHigh[1] + positionsLow[1];
    currentPos.z = positionsHigh[2] + positionsLow[2];

    var xMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsXMin);
    var yMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsYMin);
    var zMin = Cartesian2.Cartesian3.clone(currentPos, fromPointsZMin);

    var xMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsXMax);
    var yMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsYMax);
    var zMax = Cartesian2.Cartesian3.clone(currentPos, fromPointsZMax);

    var numElements = positionsHigh.length;
    var i;
    for (i = 0; i < numElements; i += 3) {
      var x = positionsHigh[i] + positionsLow[i];
      var y = positionsHigh[i + 1] + positionsLow[i + 1];
      var z = positionsHigh[i + 2] + positionsLow[i + 2];

      currentPos.x = x;
      currentPos.y = y;
      currentPos.z = z;

      // Store points containing the the smallest and largest components
      if (x < xMin.x) {
        Cartesian2.Cartesian3.clone(currentPos, xMin);
      }

      if (x > xMax.x) {
        Cartesian2.Cartesian3.clone(currentPos, xMax);
      }

      if (y < yMin.y) {
        Cartesian2.Cartesian3.clone(currentPos, yMin);
      }

      if (y > yMax.y) {
        Cartesian2.Cartesian3.clone(currentPos, yMax);
      }

      if (z < zMin.z) {
        Cartesian2.Cartesian3.clone(currentPos, zMin);
      }

      if (z > zMax.z) {
        Cartesian2.Cartesian3.clone(currentPos, zMax);
      }
    }

    // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
    var xSpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(xMax, xMin, fromPointsScratch)
    );
    var ySpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(yMax, yMin, fromPointsScratch)
    );
    var zSpan = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(zMax, zMin, fromPointsScratch)
    );

    // Set the diameter endpoints to the largest span.
    var diameter1 = xMin;
    var diameter2 = xMax;
    var maxSpan = xSpan;
    if (ySpan > maxSpan) {
      maxSpan = ySpan;
      diameter1 = yMin;
      diameter2 = yMax;
    }
    if (zSpan > maxSpan) {
      maxSpan = zSpan;
      diameter1 = zMin;
      diameter2 = zMax;
    }

    // Calculate the center of the initial sphere found by Ritter's algorithm
    var ritterCenter = fromPointsRitterCenter;
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

    // Calculate the radius of the initial sphere found by Ritter's algorithm
    var radiusSquared = Cartesian2.Cartesian3.magnitudeSquared(
      Cartesian2.Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
    );
    var ritterRadius = Math.sqrt(radiusSquared);

    // Find the center of the sphere found using the Naive method.
    var minBoxPt = fromPointsMinBoxPt;
    minBoxPt.x = xMin.x;
    minBoxPt.y = yMin.y;
    minBoxPt.z = zMin.z;

    var maxBoxPt = fromPointsMaxBoxPt;
    maxBoxPt.x = xMax.x;
    maxBoxPt.y = yMax.y;
    maxBoxPt.z = zMax.z;

    var naiveCenter = Cartesian2.Cartesian3.midpoint(
      minBoxPt,
      maxBoxPt,
      fromPointsNaiveCenterScratch
    );

    // Begin 2nd pass to find naive radius and modify the ritter sphere.
    var naiveRadius = 0;
    for (i = 0; i < numElements; i += 3) {
      currentPos.x = positionsHigh[i] + positionsLow[i];
      currentPos.y = positionsHigh[i + 1] + positionsLow[i + 1];
      currentPos.z = positionsHigh[i + 2] + positionsLow[i + 2];

      // Find the furthest point from the naive center to calculate the naive radius.
      var r = Cartesian2.Cartesian3.magnitude(
        Cartesian2.Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
      );
      if (r > naiveRadius) {
        naiveRadius = r;
      }

      // Make adjustments to the Ritter Sphere to include all points.
      var oldCenterToPointSquared = Cartesian2.Cartesian3.magnitudeSquared(
        Cartesian2.Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
      );
      if (oldCenterToPointSquared > radiusSquared) {
        var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
        // Calculate new radius to include the point that lies outside
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
        radiusSquared = ritterRadius * ritterRadius;
        // Calculate center of new Ritter sphere
        var oldToNew = oldCenterToPoint - ritterRadius;
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
          oldCenterToPoint;
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
          oldCenterToPoint;
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
          oldCenterToPoint;
      }
    }

    if (ritterRadius < naiveRadius) {
      Cartesian2.Cartesian3.clone(ritterCenter, result.center);
      result.radius = ritterRadius;
    } else {
      Cartesian2.Cartesian3.clone(naiveCenter, result.center);
      result.radius = naiveRadius;
    }

    return result;
  };

  /**
   * Computes a bounding sphere from the corner points of an axis-aligned bounding box.  The sphere
   * tighly and fully encompases the box.
   *
   * @param {Cartesian3} [corner] The minimum height over the rectangle.
   * @param {Cartesian3} [oppositeCorner] The maximum height over the rectangle.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   *
   * @example
   * // Create a bounding sphere around the unit cube
   * var sphere = Cesium.BoundingSphere.fromCornerPoints(new Cesium.Cartesian3(-0.5, -0.5, -0.5), new Cesium.Cartesian3(0.5, 0.5, 0.5));
   */
  BoundingSphere.fromCornerPoints = function (corner, oppositeCorner, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("corner", corner);
    Check.Check.typeOf.object("oppositeCorner", oppositeCorner);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    var center = Cartesian2.Cartesian3.midpoint(corner, oppositeCorner, result.center);
    result.radius = Cartesian2.Cartesian3.distance(center, oppositeCorner);
    return result;
  };

  /**
   * Creates a bounding sphere encompassing an ellipsoid.
   *
   * @param {Ellipsoid} ellipsoid The ellipsoid around which to create a bounding sphere.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   *
   * @example
   * var boundingSphere = Cesium.BoundingSphere.fromEllipsoid(ellipsoid);
   */
  BoundingSphere.fromEllipsoid = function (ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
    result.radius = ellipsoid.maximumRadius;
    return result;
  };

  var fromBoundingSpheresScratch = new Cartesian2.Cartesian3();

  /**
   * Computes a tight-fitting bounding sphere enclosing the provided array of bounding spheres.
   *
   * @param {BoundingSphere[]} [boundingSpheres] The array of bounding spheres.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.fromBoundingSpheres = function (boundingSpheres, result) {
    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    if (!when.defined(boundingSpheres) || boundingSpheres.length === 0) {
      result.center = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.ZERO, result.center);
      result.radius = 0.0;
      return result;
    }

    var length = boundingSpheres.length;
    if (length === 1) {
      return BoundingSphere.clone(boundingSpheres[0], result);
    }

    if (length === 2) {
      return BoundingSphere.union(boundingSpheres[0], boundingSpheres[1], result);
    }

    var positions = [];
    var i;
    for (i = 0; i < length; i++) {
      positions.push(boundingSpheres[i].center);
    }

    result = BoundingSphere.fromPoints(positions, result);

    var center = result.center;
    var radius = result.radius;
    for (i = 0; i < length; i++) {
      var tmp = boundingSpheres[i];
      radius = Math.max(
        radius,
        Cartesian2.Cartesian3.distance(center, tmp.center, fromBoundingSpheresScratch) +
          tmp.radius
      );
    }
    result.radius = radius;

    return result;
  };

  var fromOrientedBoundingBoxScratchU = new Cartesian2.Cartesian3();
  var fromOrientedBoundingBoxScratchV = new Cartesian2.Cartesian3();
  var fromOrientedBoundingBoxScratchW = new Cartesian2.Cartesian3();

  /**
   * Computes a tight-fitting bounding sphere enclosing the provided oriented bounding box.
   *
   * @param {OrientedBoundingBox} orientedBoundingBox The oriented bounding box.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.fromOrientedBoundingBox = function (
    orientedBoundingBox,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("orientedBoundingBox", orientedBoundingBox);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    var halfAxes = orientedBoundingBox.halfAxes;
    var u = Matrix3.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
    var v = Matrix3.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
    var w = Matrix3.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);

    Cartesian2.Cartesian3.add(u, v, u);
    Cartesian2.Cartesian3.add(u, w, u);

    result.center = Cartesian2.Cartesian3.clone(orientedBoundingBox.center, result.center);
    result.radius = Cartesian2.Cartesian3.magnitude(u);

    return result;
  };

  /**
   * Duplicates a BoundingSphere instance.
   *
   * @param {BoundingSphere} sphere The bounding sphere to duplicate.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided. (Returns undefined if sphere is undefined)
   */
  BoundingSphere.clone = function (sphere, result) {
    if (!when.defined(sphere)) {
      return undefined;
    }

    if (!when.defined(result)) {
      return new BoundingSphere(sphere.center, sphere.radius);
    }

    result.center = Cartesian2.Cartesian3.clone(sphere.center, result.center);
    result.radius = sphere.radius;
    return result;
  };

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  BoundingSphere.packedLength = 4;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {BoundingSphere} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  BoundingSphere.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    var center = value.center;
    array[startingIndex++] = center.x;
    array[startingIndex++] = center.y;
    array[startingIndex++] = center.z;
    array[startingIndex] = value.radius;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {BoundingSphere} [result] The object into which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
   */
  BoundingSphere.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    var center = result.center;
    center.x = array[startingIndex++];
    center.y = array[startingIndex++];
    center.z = array[startingIndex++];
    result.radius = array[startingIndex];
    return result;
  };

  var unionScratch = new Cartesian2.Cartesian3();
  var unionScratchCenter = new Cartesian2.Cartesian3();
  /**
   * Computes a bounding sphere that contains both the left and right bounding spheres.
   *
   * @param {BoundingSphere} left A sphere to enclose in a bounding sphere.
   * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.union = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    var leftCenter = left.center;
    var leftRadius = left.radius;
    var rightCenter = right.center;
    var rightRadius = right.radius;

    var toRightCenter = Cartesian2.Cartesian3.subtract(
      rightCenter,
      leftCenter,
      unionScratch
    );
    var centerSeparation = Cartesian2.Cartesian3.magnitude(toRightCenter);

    if (leftRadius >= centerSeparation + rightRadius) {
      // Left sphere wins.
      left.clone(result);
      return result;
    }

    if (rightRadius >= centerSeparation + leftRadius) {
      // Right sphere wins.
      right.clone(result);
      return result;
    }

    // There are two tangent points, one on far side of each sphere.
    var halfDistanceBetweenTangentPoints =
      (leftRadius + centerSeparation + rightRadius) * 0.5;

    // Compute the center point halfway between the two tangent points.
    var center = Cartesian2.Cartesian3.multiplyByScalar(
      toRightCenter,
      (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
      unionScratchCenter
    );
    Cartesian2.Cartesian3.add(center, leftCenter, center);
    Cartesian2.Cartesian3.clone(center, result.center);
    result.radius = halfDistanceBetweenTangentPoints;

    return result;
  };

  var expandScratch = new Cartesian2.Cartesian3();
  /**
   * Computes a bounding sphere by enlarging the provided sphere to contain the provided point.
   *
   * @param {BoundingSphere} sphere A sphere to expand.
   * @param {Cartesian3} point A point to enclose in a bounding sphere.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.expand = function (sphere, point, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("point", point);
    //>>includeEnd('debug');

    result = BoundingSphere.clone(sphere, result);

    var radius = Cartesian2.Cartesian3.magnitude(
      Cartesian2.Cartesian3.subtract(point, result.center, expandScratch)
    );
    if (radius > result.radius) {
      result.radius = radius;
    }

    return result;
  };

  /**
   * Determines which side of a plane a sphere is located.
   *
   * @param {BoundingSphere} sphere The bounding sphere to test.
   * @param {Plane} plane The plane to test against.
   * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
   *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
   *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
   *                      intersects the plane.
   */
  BoundingSphere.intersectPlane = function (sphere, plane) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("plane", plane);
    //>>includeEnd('debug');

    var center = sphere.center;
    var radius = sphere.radius;
    var normal = plane.normal;
    var distanceToPlane = Cartesian2.Cartesian3.dot(normal, center) + plane.distance;

    if (distanceToPlane < -radius) {
      // The center point is negative side of the plane normal
      return Intersect$1.OUTSIDE;
    } else if (distanceToPlane < radius) {
      // The center point is positive side of the plane, but radius extends beyond it; partial overlap
      return Intersect$1.INTERSECTING;
    }
    return Intersect$1.INSIDE;
  };

  /**
   * Applies a 4x4 affine transformation matrix to a bounding sphere.
   *
   * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
   * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.transform = function (sphere, transform, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("transform", transform);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    result.center = Matrix4.multiplyByPoint(
      transform,
      sphere.center,
      result.center
    );
    result.radius = Matrix4.getMaximumScale(transform) * sphere.radius;

    return result;
  };

  var distanceSquaredToScratch = new Cartesian2.Cartesian3();

  /**
   * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
   *
   * @param {BoundingSphere} sphere The sphere.
   * @param {Cartesian3} cartesian The point
   * @returns {Number} The estimated distance squared from the bounding sphere to the point.
   *
   * @example
   * // Sort bounding spheres from back to front
   * spheres.sort(function(a, b) {
   *     return Cesium.BoundingSphere.distanceSquaredTo(b, camera.positionWC) - Cesium.BoundingSphere.distanceSquaredTo(a, camera.positionWC);
   * });
   */
  BoundingSphere.distanceSquaredTo = function (sphere, cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    var diff = Cartesian2.Cartesian3.subtract(
      sphere.center,
      cartesian,
      distanceSquaredToScratch
    );
    return Cartesian2.Cartesian3.magnitudeSquared(diff) - sphere.radius * sphere.radius;
  };

  /**
   * Applies a 4x4 affine transformation matrix to a bounding sphere where there is no scale
   * The transformation matrix is not verified to have a uniform scale of 1.
   * This method is faster than computing the general bounding sphere transform using {@link BoundingSphere.transform}.
   *
   * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
   * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   *
   * @example
   * var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid);
   * var boundingSphere = new Cesium.BoundingSphere();
   * var newBoundingSphere = Cesium.BoundingSphere.transformWithoutScale(boundingSphere, modelMatrix);
   */
  BoundingSphere.transformWithoutScale = function (sphere, transform, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("transform", transform);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new BoundingSphere();
    }

    result.center = Matrix4.multiplyByPoint(
      transform,
      sphere.center,
      result.center
    );
    result.radius = sphere.radius;

    return result;
  };

  var scratchCartesian3 = new Cartesian2.Cartesian3();
  /**
   * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
   * plus/minus the radius of the bounding sphere.
   * <br>
   * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
   * closest and farthest planes from position that intersect the bounding sphere.
   *
   * @param {BoundingSphere} sphere The bounding sphere to calculate the distance to.
   * @param {Cartesian3} position The position to calculate the distance from.
   * @param {Cartesian3} direction The direction from position.
   * @param {Interval} [result] A Interval to store the nearest and farthest distances.
   * @returns {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
   */
  BoundingSphere.computePlaneDistances = function (
    sphere,
    position,
    direction,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("position", position);
    Check.Check.typeOf.object("direction", direction);
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new Interval();
    }

    var toCenter = Cartesian2.Cartesian3.subtract(
      sphere.center,
      position,
      scratchCartesian3
    );
    var mag = Cartesian2.Cartesian3.dot(direction, toCenter);

    result.start = mag - sphere.radius;
    result.stop = mag + sphere.radius;
    return result;
  };

  var projectTo2DNormalScratch = new Cartesian2.Cartesian3();
  var projectTo2DEastScratch = new Cartesian2.Cartesian3();
  var projectTo2DNorthScratch = new Cartesian2.Cartesian3();
  var projectTo2DWestScratch = new Cartesian2.Cartesian3();
  var projectTo2DSouthScratch = new Cartesian2.Cartesian3();
  var projectTo2DCartographicScratch = new Cartesian2.Cartographic();
  var projectTo2DPositionsScratch = new Array(8);
  for (var n = 0; n < 8; ++n) {
    projectTo2DPositionsScratch[n] = new Cartesian2.Cartesian3();
  }

  var projectTo2DProjection = new GeographicProjection();
  /**
   * Creates a bounding sphere in 2D from a bounding sphere in 3D world coordinates.
   *
   * @param {BoundingSphere} sphere The bounding sphere to transform to 2D.
   * @param {Object} [projection=GeographicProjection] The projection to 2D.
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.projectTo2D = function (sphere, projection, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    //>>includeEnd('debug');

    projection = when.defaultValue(projection, projectTo2DProjection);

    var ellipsoid = projection.ellipsoid;
    var center = sphere.center;
    var radius = sphere.radius;

    var normal;
    if (Cartesian2.Cartesian3.equals(center, Cartesian2.Cartesian3.ZERO)) {
      // Bounding sphere is at the center. The geodetic surface normal is not
      // defined here so pick the x-axis as a fallback.
      normal = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.UNIT_X, projectTo2DNormalScratch);
    } else {
      normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
    }
    var east = Cartesian2.Cartesian3.cross(
      Cartesian2.Cartesian3.UNIT_Z,
      normal,
      projectTo2DEastScratch
    );
    Cartesian2.Cartesian3.normalize(east, east);
    var north = Cartesian2.Cartesian3.cross(normal, east, projectTo2DNorthScratch);
    Cartesian2.Cartesian3.normalize(north, north);

    Cartesian2.Cartesian3.multiplyByScalar(normal, radius, normal);
    Cartesian2.Cartesian3.multiplyByScalar(north, radius, north);
    Cartesian2.Cartesian3.multiplyByScalar(east, radius, east);

    var south = Cartesian2.Cartesian3.negate(north, projectTo2DSouthScratch);
    var west = Cartesian2.Cartesian3.negate(east, projectTo2DWestScratch);

    var positions = projectTo2DPositionsScratch;

    // top NE corner
    var corner = positions[0];
    Cartesian2.Cartesian3.add(normal, north, corner);
    Cartesian2.Cartesian3.add(corner, east, corner);

    // top NW corner
    corner = positions[1];
    Cartesian2.Cartesian3.add(normal, north, corner);
    Cartesian2.Cartesian3.add(corner, west, corner);

    // top SW corner
    corner = positions[2];
    Cartesian2.Cartesian3.add(normal, south, corner);
    Cartesian2.Cartesian3.add(corner, west, corner);

    // top SE corner
    corner = positions[3];
    Cartesian2.Cartesian3.add(normal, south, corner);
    Cartesian2.Cartesian3.add(corner, east, corner);

    Cartesian2.Cartesian3.negate(normal, normal);

    // bottom NE corner
    corner = positions[4];
    Cartesian2.Cartesian3.add(normal, north, corner);
    Cartesian2.Cartesian3.add(corner, east, corner);

    // bottom NW corner
    corner = positions[5];
    Cartesian2.Cartesian3.add(normal, north, corner);
    Cartesian2.Cartesian3.add(corner, west, corner);

    // bottom SW corner
    corner = positions[6];
    Cartesian2.Cartesian3.add(normal, south, corner);
    Cartesian2.Cartesian3.add(corner, west, corner);

    // bottom SE corner
    corner = positions[7];
    Cartesian2.Cartesian3.add(normal, south, corner);
    Cartesian2.Cartesian3.add(corner, east, corner);

    var length = positions.length;
    for (var i = 0; i < length; ++i) {
      var position = positions[i];
      Cartesian2.Cartesian3.add(center, position, position);
      var cartographic = ellipsoid.cartesianToCartographic(
        position,
        projectTo2DCartographicScratch
      );
      projection.project(cartographic, position);
    }

    result = BoundingSphere.fromPoints(positions, result);

    // swizzle center components
    center = result.center;
    var x = center.x;
    var y = center.y;
    var z = center.z;
    center.x = z;
    center.y = x;
    center.z = y;

    return result;
  };

  /**
   * Determines whether or not a sphere is hidden from view by the occluder.
   *
   * @param {BoundingSphere} sphere The bounding sphere surrounding the occludee object.
   * @param {Occluder} occluder The occluder.
   * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
   */
  BoundingSphere.isOccluded = function (sphere, occluder) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("sphere", sphere);
    Check.Check.typeOf.object("occluder", occluder);
    //>>includeEnd('debug');
    return !occluder.isBoundingSphereVisible(sphere);
  };

  /**
   * Compares the provided BoundingSphere componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {BoundingSphere} [left] The first BoundingSphere.
   * @param {BoundingSphere} [right] The second BoundingSphere.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  BoundingSphere.equals = function (left, right) {
    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        Cartesian2.Cartesian3.equals(left.center, right.center) &&
        left.radius === right.radius)
    );
  };

  /**
   * Determines which side of a plane the sphere is located.
   *
   * @param {Plane} plane The plane to test against.
   * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
   *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
   *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
   *                      intersects the plane.
   */
  BoundingSphere.prototype.intersectPlane = function (plane) {
    return BoundingSphere.intersectPlane(this, plane);
  };

  /**
   * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
   *
   * @param {Cartesian3} cartesian The point
   * @returns {Number} The estimated distance squared from the bounding sphere to the point.
   *
   * @example
   * // Sort bounding spheres from back to front
   * spheres.sort(function(a, b) {
   *     return b.distanceSquaredTo(camera.positionWC) - a.distanceSquaredTo(camera.positionWC);
   * });
   */
  BoundingSphere.prototype.distanceSquaredTo = function (cartesian) {
    return BoundingSphere.distanceSquaredTo(this, cartesian);
  };

  /**
   * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
   * plus/minus the radius of the bounding sphere.
   * <br>
   * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
   * closest and farthest planes from position that intersect the bounding sphere.
   *
   * @param {Cartesian3} position The position to calculate the distance from.
   * @param {Cartesian3} direction The direction from position.
   * @param {Interval} [result] A Interval to store the nearest and farthest distances.
   * @returns {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
   */
  BoundingSphere.prototype.computePlaneDistances = function (
    position,
    direction,
    result
  ) {
    return BoundingSphere.computePlaneDistances(
      this,
      position,
      direction,
      result
    );
  };

  /**
   * Determines whether or not a sphere is hidden from view by the occluder.
   *
   * @param {Occluder} occluder The occluder.
   * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
   */
  BoundingSphere.prototype.isOccluded = function (occluder) {
    return BoundingSphere.isOccluded(this, occluder);
  };

  /**
   * Compares this BoundingSphere against the provided BoundingSphere componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {BoundingSphere} [right] The right hand side BoundingSphere.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  BoundingSphere.prototype.equals = function (right) {
    return BoundingSphere.equals(this, right);
  };

  /**
   * Duplicates this BoundingSphere instance.
   *
   * @param {BoundingSphere} [result] The object onto which to store the result.
   * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  BoundingSphere.prototype.clone = function (result) {
    return BoundingSphere.clone(this, result);
  };

  /**
   * Computes the radius of the BoundingSphere.
   * @returns {Number} The radius of the BoundingSphere.
   */
  BoundingSphere.prototype.volume = function () {
    var radius = this.radius;
    return volumeConstant * radius * radius * radius;
  };

  var _supportsFullscreen;
  var _names = {
    requestFullscreen: undefined,
    exitFullscreen: undefined,
    fullscreenEnabled: undefined,
    fullscreenElement: undefined,
    fullscreenchange: undefined,
    fullscreenerror: undefined,
  };

  /**
   * Browser-independent functions for working with the standard fullscreen API.
   *
   * @namespace Fullscreen
   *
   * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
   */
  var Fullscreen = {};

  Object.defineProperties(Fullscreen, {
    /**
     * The element that is currently fullscreen, if any.  To simply check if the
     * browser is in fullscreen mode or not, use {@link Fullscreen#fullscreen}.
     * @memberof Fullscreen
     * @type {Object}
     * @readonly
     */
    element: {
      get: function () {
        if (!Fullscreen.supportsFullscreen()) {
          return undefined;
        }

        return document[_names.fullscreenElement];
      },
    },

    /**
     * The name of the event on the document that is fired when fullscreen is
     * entered or exited.  This event name is intended for use with addEventListener.
     * In your event handler, to determine if the browser is in fullscreen mode or not,
     * use {@link Fullscreen#fullscreen}.
     * @memberof Fullscreen
     * @type {String}
     * @readonly
     */
    changeEventName: {
      get: function () {
        if (!Fullscreen.supportsFullscreen()) {
          return undefined;
        }

        return _names.fullscreenchange;
      },
    },

    /**
     * The name of the event that is fired when a fullscreen error
     * occurs.  This event name is intended for use with addEventListener.
     * @memberof Fullscreen
     * @type {String}
     * @readonly
     */
    errorEventName: {
      get: function () {
        if (!Fullscreen.supportsFullscreen()) {
          return undefined;
        }

        return _names.fullscreenerror;
      },
    },

    /**
     * Determine whether the browser will allow an element to be made fullscreen, or not.
     * For example, by default, iframes cannot go fullscreen unless the containing page
     * adds an "allowfullscreen" attribute (or prefixed equivalent).
     * @memberof Fullscreen
     * @type {Boolean}
     * @readonly
     */
    enabled: {
      get: function () {
        if (!Fullscreen.supportsFullscreen()) {
          return undefined;
        }

        return document[_names.fullscreenEnabled];
      },
    },

    /**
     * Determines if the browser is currently in fullscreen mode.
     * @memberof Fullscreen
     * @type {Boolean}
     * @readonly
     */
    fullscreen: {
      get: function () {
        if (!Fullscreen.supportsFullscreen()) {
          return undefined;
        }

        return Fullscreen.element !== null;
      },
    },
  });

  /**
   * Detects whether the browser supports the standard fullscreen API.
   *
   * @returns {Boolean} <code>true</code> if the browser supports the standard fullscreen API,
   * <code>false</code> otherwise.
   */
  Fullscreen.supportsFullscreen = function () {
    if (when.defined(_supportsFullscreen)) {
      return _supportsFullscreen;
    }

    _supportsFullscreen = false;

    var body = document.body;
    if (typeof body.requestFullscreen === "function") {
      // go with the unprefixed, standard set of names
      _names.requestFullscreen = "requestFullscreen";
      _names.exitFullscreen = "exitFullscreen";
      _names.fullscreenEnabled = "fullscreenEnabled";
      _names.fullscreenElement = "fullscreenElement";
      _names.fullscreenchange = "fullscreenchange";
      _names.fullscreenerror = "fullscreenerror";
      _supportsFullscreen = true;
      return _supportsFullscreen;
    }

    //check for the correct combination of prefix plus the various names that browsers use
    var prefixes = ["webkit", "moz", "o", "ms", "khtml"];
    var name;
    for (var i = 0, len = prefixes.length; i < len; ++i) {
      var prefix = prefixes[i];

      // casing of Fullscreen differs across browsers
      name = prefix + "RequestFullscreen";
      if (typeof body[name] === "function") {
        _names.requestFullscreen = name;
        _supportsFullscreen = true;
      } else {
        name = prefix + "RequestFullScreen";
        if (typeof body[name] === "function") {
          _names.requestFullscreen = name;
          _supportsFullscreen = true;
        }
      }

      // disagreement about whether it's "exit" as per spec, or "cancel"
      name = prefix + "ExitFullscreen";
      if (typeof document[name] === "function") {
        _names.exitFullscreen = name;
      } else {
        name = prefix + "CancelFullScreen";
        if (typeof document[name] === "function") {
          _names.exitFullscreen = name;
        }
      }

      // casing of Fullscreen differs across browsers
      name = prefix + "FullscreenEnabled";
      if (document[name] !== undefined) {
        _names.fullscreenEnabled = name;
      } else {
        name = prefix + "FullScreenEnabled";
        if (document[name] !== undefined) {
          _names.fullscreenEnabled = name;
        }
      }

      // casing of Fullscreen differs across browsers
      name = prefix + "FullscreenElement";
      if (document[name] !== undefined) {
        _names.fullscreenElement = name;
      } else {
        name = prefix + "FullScreenElement";
        if (document[name] !== undefined) {
          _names.fullscreenElement = name;
        }
      }

      // thankfully, event names are all lowercase per spec
      name = prefix + "fullscreenchange";
      // event names do not have 'on' in the front, but the property on the document does
      if (document["on" + name] !== undefined) {
        //except on IE
        if (prefix === "ms") {
          name = "MSFullscreenChange";
        }
        _names.fullscreenchange = name;
      }

      name = prefix + "fullscreenerror";
      if (document["on" + name] !== undefined) {
        //except on IE
        if (prefix === "ms") {
          name = "MSFullscreenError";
        }
        _names.fullscreenerror = name;
      }
    }

    return _supportsFullscreen;
  };

  /**
   * Asynchronously requests the browser to enter fullscreen mode on the given element.
   * If fullscreen mode is not supported by the browser, does nothing.
   *
   * @param {Object} element The HTML element which will be placed into fullscreen mode.
   * @param {Object} [vrDevice] The HMDVRDevice device.
   *
   * @example
   * // Put the entire page into fullscreen.
   * Cesium.Fullscreen.requestFullscreen(document.body)
   *
   * // Place only the Cesium canvas into fullscreen.
   * Cesium.Fullscreen.requestFullscreen(scene.canvas)
   */
  Fullscreen.requestFullscreen = function (element, vrDevice) {
    if (!Fullscreen.supportsFullscreen()) {
      return;
    }

    element[_names.requestFullscreen]({ vrDisplay: vrDevice });
  };

  /**
   * Asynchronously exits fullscreen mode.  If the browser is not currently
   * in fullscreen, or if fullscreen mode is not supported by the browser, does nothing.
   */
  Fullscreen.exitFullscreen = function () {
    if (!Fullscreen.supportsFullscreen()) {
      return;
    }

    document[_names.exitFullscreen]();
  };

  //For unit tests
  Fullscreen._names = _names;

  var theNavigator;
  if (typeof navigator !== "undefined") {
    theNavigator = navigator;
  } else {
    theNavigator = {};
  }

  function extractVersion(versionString) {
    var parts = versionString.split(".");
    for (var i = 0, len = parts.length; i < len; ++i) {
      parts[i] = parseInt(parts[i], 10);
    }
    return parts;
  }

  var isChromeResult;
  var chromeVersionResult;
  function isChrome() {
    if (!when.defined(isChromeResult)) {
      isChromeResult = false;
      // Edge contains Chrome in the user agent too
      if (!isEdge()) {
        var fields = / Chrome\/([\.0-9]+)/.exec(theNavigator.userAgent);
        if (fields !== null) {
          isChromeResult = true;
          chromeVersionResult = extractVersion(fields[1]);
        }
      }
    }

    return isChromeResult;
  }

  function chromeVersion() {
    return isChrome() && chromeVersionResult;
  }

  var isSafariResult;
  var safariVersionResult;
  function isSafari() {
    if (!when.defined(isSafariResult)) {
      isSafariResult = false;

      // Chrome and Edge contain Safari in the user agent too
      if (
        !isChrome() &&
        !isEdge() &&
        / Safari\/[\.0-9]+/.test(theNavigator.userAgent)
      ) {
        var fields = / Version\/([\.0-9]+)/.exec(theNavigator.userAgent);
        if (fields !== null) {
          isSafariResult = true;
          safariVersionResult = extractVersion(fields[1]);
        }
      }
    }

    return isSafariResult;
  }

  function safariVersion() {
    return isSafari() && safariVersionResult;
  }

  var isWebkitResult;
  var webkitVersionResult;
  function isWebkit() {
    if (!when.defined(isWebkitResult)) {
      isWebkitResult = false;

      var fields = / AppleWebKit\/([\.0-9]+)(\+?)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isWebkitResult = true;
        webkitVersionResult = extractVersion(fields[1]);
        webkitVersionResult.isNightly = !!fields[2];
      }
    }

    return isWebkitResult;
  }

  function webkitVersion() {
    return isWebkit() && webkitVersionResult;
  }

  var isInternetExplorerResult;
  var internetExplorerVersionResult;
  function isInternetExplorer() {
    if (!when.defined(isInternetExplorerResult)) {
      isInternetExplorerResult = false;

      var fields;
      if (theNavigator.appName === "Microsoft Internet Explorer") {
        fields = /MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(theNavigator.userAgent);
        if (fields !== null) {
          isInternetExplorerResult = true;
          internetExplorerVersionResult = extractVersion(fields[1]);
        }
      } else if (theNavigator.appName === "Netscape") {
        fields = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(
          theNavigator.userAgent
        );
        if (fields !== null) {
          isInternetExplorerResult = true;
          internetExplorerVersionResult = extractVersion(fields[1]);
        }
      }
    }
    return isInternetExplorerResult;
  }

  function internetExplorerVersion() {
    return isInternetExplorer() && internetExplorerVersionResult;
  }

  var isEdgeResult;
  var edgeVersionResult;
  function isEdge() {
    if (!when.defined(isEdgeResult)) {
      isEdgeResult = false;
      var fields = / Edge\/([\.0-9]+)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isEdgeResult = true;
        edgeVersionResult = extractVersion(fields[1]);
      }
    }
    return isEdgeResult;
  }

  function edgeVersion() {
    return isEdge() && edgeVersionResult;
  }

  var isFirefoxResult;
  var firefoxVersionResult;
  function isFirefox() {
    if (!when.defined(isFirefoxResult)) {
      isFirefoxResult = false;

      var fields = /Firefox\/([\.0-9]+)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isFirefoxResult = true;
        firefoxVersionResult = extractVersion(fields[1]);
      }
    }
    return isFirefoxResult;
  }

  var isWindowsResult;
  function isWindows() {
    if (!when.defined(isWindowsResult)) {
      isWindowsResult = /Windows/i.test(theNavigator.appVersion);
    }
    return isWindowsResult;
  }

  function firefoxVersion() {
    return isFirefox() && firefoxVersionResult;
  }

  var hasPointerEvents;
  function supportsPointerEvents() {
    if (!when.defined(hasPointerEvents)) {
      //While navigator.pointerEnabled is deprecated in the W3C specification
      //we still need to use it if it exists in order to support browsers
      //that rely on it, such as the Windows WebBrowser control which defines
      //PointerEvent but sets navigator.pointerEnabled to false.

      //Firefox disabled because of https://github.com/CesiumGS/cesium/issues/6372
      hasPointerEvents =
        !isFirefox() &&
        typeof PointerEvent !== "undefined" &&
        (!when.defined(theNavigator.pointerEnabled) || theNavigator.pointerEnabled);
    }
    return hasPointerEvents;
  }

  var imageRenderingValueResult;
  var supportsImageRenderingPixelatedResult;
  function supportsImageRenderingPixelated() {
    if (!when.defined(supportsImageRenderingPixelatedResult)) {
      var canvas = document.createElement("canvas");
      canvas.setAttribute(
        "style",
        "image-rendering: -moz-crisp-edges;" + "image-rendering: pixelated;"
      );
      //canvas.style.imageRendering will be undefined, null or an empty string on unsupported browsers.
      var tmp = canvas.style.imageRendering;
      supportsImageRenderingPixelatedResult = when.defined(tmp) && tmp !== "";
      if (supportsImageRenderingPixelatedResult) {
        imageRenderingValueResult = tmp;
      }
    }
    return supportsImageRenderingPixelatedResult;
  }

  function imageRenderingValue() {
    return supportsImageRenderingPixelated()
      ? imageRenderingValueResult
      : undefined;
  }

  function supportsWebP() {
    //>>includeStart('debug', pragmas.debug);
    if (!supportsWebP.initialized) {
      throw new Check.DeveloperError(
        "You must call FeatureDetection.supportsWebP.initialize and wait for the promise to resolve before calling FeatureDetection.supportsWebP"
      );
    }
    //>>includeEnd('debug');
    return supportsWebP._result;
  }
  supportsWebP._promise = undefined;
  supportsWebP._result = undefined;
  supportsWebP.initialize = function () {
    // From https://developers.google.com/speed/webp/faq#how_can_i_detect_browser_support_for_webp
    if (when.defined(supportsWebP._promise)) {
      return supportsWebP._promise;
    }

    var supportsWebPDeferred = when.when.defer();
    supportsWebP._promise = supportsWebPDeferred.promise;
    if (isEdge()) {
      // Edge's WebP support with WebGL is incomplete.
      // See bug report: https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/19221241/
      supportsWebP._result = false;
      supportsWebPDeferred.resolve(supportsWebP._result);
      return supportsWebPDeferred.promise;
    }

    var image = new Image();
    image.onload = function () {
      supportsWebP._result = image.width > 0 && image.height > 0;
      supportsWebPDeferred.resolve(supportsWebP._result);
    };

    image.onerror = function () {
      supportsWebP._result = false;
      supportsWebPDeferred.resolve(supportsWebP._result);
    };

    image.src =
      "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

    return supportsWebPDeferred.promise;
  };
  Object.defineProperties(supportsWebP, {
    initialized: {
      get: function () {
        return when.defined(supportsWebP._result);
      },
    },
  });

  var typedArrayTypes = [];
  if (typeof ArrayBuffer !== "undefined") {
    typedArrayTypes.push(
      Int8Array,
      Uint8Array,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array
    );

    if (typeof Uint8ClampedArray !== "undefined") {
      typedArrayTypes.push(Uint8ClampedArray);
    }

    if (typeof Uint8ClampedArray !== "undefined") {
      typedArrayTypes.push(Uint8ClampedArray);
    }
  }

  /**
   * A set of functions to detect whether the current browser supports
   * various features.
   *
   * @namespace FeatureDetection
   */
  var FeatureDetection = {
    isChrome: isChrome,
    chromeVersion: chromeVersion,
    isSafari: isSafari,
    safariVersion: safariVersion,
    isWebkit: isWebkit,
    webkitVersion: webkitVersion,
    isInternetExplorer: isInternetExplorer,
    internetExplorerVersion: internetExplorerVersion,
    isEdge: isEdge,
    edgeVersion: edgeVersion,
    isFirefox: isFirefox,
    firefoxVersion: firefoxVersion,
    isWindows: isWindows,
    hardwareConcurrency: when.defaultValue(theNavigator.hardwareConcurrency, 3),
    supportsPointerEvents: supportsPointerEvents,
    supportsImageRenderingPixelated: supportsImageRenderingPixelated,
    supportsWebP: supportsWebP,
    imageRenderingValue: imageRenderingValue,
    typedArrayTypes: typedArrayTypes,
  };

  /**
   * Detects whether the current browser supports the full screen standard.
   *
   * @returns {Boolean} true if the browser supports the full screen standard, false if not.
   *
   * @see Fullscreen
   * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
   */
  FeatureDetection.supportsFullscreen = function () {
    return Fullscreen.supportsFullscreen();
  };

  /**
   * Detects whether the current browser supports typed arrays.
   *
   * @returns {Boolean} true if the browser supports typed arrays, false if not.
   *
   * @see {@link http://www.khronos.org/registry/typedarray/specs/latest/|Typed Array Specification}
   */
  FeatureDetection.supportsTypedArrays = function () {
    return typeof ArrayBuffer !== "undefined";
  };

  /**
   * Detects whether the current browser supports Web Workers.
   *
   * @returns {Boolean} true if the browsers supports Web Workers, false if not.
   *
   * @see {@link http://www.w3.org/TR/workers/}
   */
  FeatureDetection.supportsWebWorkers = function () {
    return typeof Worker !== "undefined";
  };

  /**
   * Detects whether the current browser supports Web Assembly.
   *
   * @returns {Boolean} true if the browsers supports Web Assembly, false if not.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/WebAssembly}
   */
  FeatureDetection.supportsWebAssembly = function () {
    return typeof WebAssembly !== "undefined" && !FeatureDetection.isEdge();
  };

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
    this.x = when.defaultValue(x, 0.0);

    /**
     * The Y component.
     * @type {Number}
     * @default 0.0
     */
    this.y = when.defaultValue(y, 0.0);

    /**
     * The Z component.
     * @type {Number}
     * @default 0.0
     */
    this.z = when.defaultValue(z, 0.0);

    /**
     * The W component.
     * @type {Number}
     * @default 0.0
     */
    this.w = when.defaultValue(w, 0.0);
  }

  var fromAxisAngleScratch = new Cartesian2.Cartesian3();

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
    Check.Check.typeOf.object("axis", axis);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    var halfAngle = angle / 2.0;
    var s = Math.sin(halfAngle);
    fromAxisAngleScratch = Cartesian2.Cartesian3.normalize(axis, fromAxisAngleScratch);

    var x = fromAxisAngleScratch.x * s;
    var y = fromAxisAngleScratch.y * s;
    var z = fromAxisAngleScratch.z * s;
    var w = Math.cos(halfAngle);
    if (!when.defined(result)) {
      return new Quaternion(x, y, z, w);
    }
    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  var fromRotationMatrixNext = [1, 2, 0];
  var fromRotationMatrixQuat = new Array(3);
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
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    var root;
    var x;
    var y;
    var z;
    var w;

    var m00 = matrix[Matrix3.COLUMN0ROW0];
    var m11 = matrix[Matrix3.COLUMN1ROW1];
    var m22 = matrix[Matrix3.COLUMN2ROW2];
    var trace = m00 + m11 + m22;

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
      var next = fromRotationMatrixNext;

      var i = 0;
      if (m11 > m00) {
        i = 1;
      }
      if (m22 > m00 && m22 > m11) {
        i = 2;
      }
      var j = next[i];
      var k = next[j];

      root = Math.sqrt(
        matrix[Matrix3.getElementIndex(i, i)] -
          matrix[Matrix3.getElementIndex(j, j)] -
          matrix[Matrix3.getElementIndex(k, k)] +
          1.0
      );

      var quat = fromRotationMatrixQuat;
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

    if (!when.defined(result)) {
      return new Quaternion(x, y, z, w);
    }
    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  var scratchHPRQuaternion$1 = new Quaternion();
  var scratchHeadingQuaternion = new Quaternion();
  var scratchPitchQuaternion = new Quaternion();
  var scratchRollQuaternion = new Quaternion();

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
    Check.Check.typeOf.object("headingPitchRoll", headingPitchRoll);
    //>>includeEnd('debug');

    scratchRollQuaternion = Quaternion.fromAxisAngle(
      Cartesian2.Cartesian3.UNIT_X,
      headingPitchRoll.roll,
      scratchHPRQuaternion$1
    );
    scratchPitchQuaternion = Quaternion.fromAxisAngle(
      Cartesian2.Cartesian3.UNIT_Y,
      -headingPitchRoll.pitch,
      result
    );
    result = Quaternion.multiply(
      scratchPitchQuaternion,
      scratchRollQuaternion,
      scratchPitchQuaternion
    );
    scratchHeadingQuaternion = Quaternion.fromAxisAngle(
      Cartesian2.Cartesian3.UNIT_Z,
      -headingPitchRoll.heading,
      scratchHPRQuaternion$1
    );
    return Quaternion.multiply(scratchHeadingQuaternion, result, result);
  };

  var sampledQuaternionAxis = new Cartesian2.Cartesian3();
  var sampledQuaternionRotation = new Cartesian2.Cartesian3();
  var sampledQuaternionTempQuaternion = new Quaternion();
  var sampledQuaternionQuaternion0 = new Quaternion();
  var sampledQuaternionQuaternion0Conjugate = new Quaternion();

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
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

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
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    if (!when.defined(result)) {
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

    for (var i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
      var offset = i * 3;
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
      var angle = Quaternion.computeAngle(sampledQuaternionTempQuaternion);
      if (!when.defined(result)) {
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
    if (!when.defined(result)) {
      result = new Quaternion();
    }
    Cartesian2.Cartesian3.fromArray(array, 0, sampledQuaternionRotation);
    var magnitude = Cartesian2.Cartesian3.magnitude(sampledQuaternionRotation);

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
    if (!when.defined(quaternion)) {
      return undefined;
    }

    if (!when.defined(result)) {
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
    Check.Check.typeOf.object("quaternion", quaternion);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("quaternion", quaternion);
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
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var inverseMagnitude = 1.0 / Quaternion.magnitude(quaternion);
    var x = quaternion.x * inverseMagnitude;
    var y = quaternion.y * inverseMagnitude;
    var z = quaternion.z * inverseMagnitude;
    var w = quaternion.w * inverseMagnitude;

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
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("quaternion", quaternion);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
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
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var leftX = left.x;
    var leftY = left.y;
    var leftZ = left.z;
    var leftW = left.w;

    var rightX = right.x;
    var rightY = right.y;
    var rightZ = right.z;
    var rightW = right.w;

    var x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
    var y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
    var z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
    var w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;

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
    Check.Check.typeOf.object("quaternion", quaternion);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("quaternion", quaternion);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
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
    Check.Check.typeOf.object("quaternion", quaternion);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var w = quaternion.w;
    if (Math.abs(w - 1.0) < _Math.CesiumMath.EPSILON6) {
      result.x = result.y = result.z = 0;
      return result;
    }

    var scalar = 1.0 / Math.sqrt(1.0 - w * w);

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
    Check.Check.typeOf.object("quaternion", quaternion);
    //>>includeEnd('debug');

    if (Math.abs(quaternion.w - 1.0) < _Math.CesiumMath.EPSILON6) {
      return 0.0;
    }
    return 2.0 * Math.acos(quaternion.w);
  };

  var lerpScratch = new Quaternion();
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
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch);
    result = Quaternion.multiplyByScalar(start, 1.0 - t, result);
    return Quaternion.add(lerpScratch, result, result);
  };

  var slerpEndNegated = new Quaternion();
  var slerpScaledP = new Quaternion();
  var slerpScaledR = new Quaternion();
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
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var dot = Quaternion.dot(start, end);

    // The angle between start must be acute. Since q and -q represent
    // the same rotation, negate q to get the acute angle.
    var r = end;
    if (dot < 0.0) {
      dot = -dot;
      r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated);
    }

    // dot > 0, as the dot product approaches 1, the angle between the
    // quaternions vanishes. use linear interpolation.
    if (1.0 - dot < _Math.CesiumMath.EPSILON6) {
      return Quaternion.lerp(start, r, t, result);
    }

    var theta = Math.acos(dot);
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
    Check.Check.typeOf.object("quaternion", quaternion);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var theta = _Math.CesiumMath.acosClamped(quaternion.w);
    var thetaOverSinTheta = 0.0;

    if (theta !== 0.0) {
      thetaOverSinTheta = theta / Math.sin(theta);
    }

    return Cartesian2.Cartesian3.multiplyByScalar(quaternion, thetaOverSinTheta, result);
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
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var theta = Cartesian2.Cartesian3.magnitude(cartesian);
    var sinThetaOverTheta = 0.0;

    if (theta !== 0.0) {
      sinThetaOverTheta = Math.sin(theta) / theta;
    }

    result.x = cartesian.x * sinThetaOverTheta;
    result.y = cartesian.y * sinThetaOverTheta;
    result.z = cartesian.z * sinThetaOverTheta;
    result.w = Math.cos(theta);

    return result;
  };

  var squadScratchCartesian0 = new Cartesian2.Cartesian3();
  var squadScratchCartesian1 = new Cartesian2.Cartesian3();
  var squadScratchQuaternion0 = new Quaternion();
  var squadScratchQuaternion1 = new Quaternion();

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
    Check.Check.typeOf.object("q0", q0);
    Check.Check.typeOf.object("q1", q1);
    Check.Check.typeOf.object("q2", q2);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var qInv = Quaternion.conjugate(q1, squadScratchQuaternion0);
    Quaternion.multiply(qInv, q2, squadScratchQuaternion1);
    var cart0 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian0);

    Quaternion.multiply(qInv, q0, squadScratchQuaternion1);
    var cart1 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian1);

    Cartesian2.Cartesian3.add(cart0, cart1, cart0);
    Cartesian2.Cartesian3.multiplyByScalar(cart0, 0.25, cart0);
    Cartesian2.Cartesian3.negate(cart0, cart0);
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
   * var s0 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i - 1], quaternions[i], quaternions[i + 1], new Cesium.Quaternion());
   * var s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i], quaternions[i + 1], quaternions[i + 2], new Cesium.Quaternion());
   * var q = Cesium.Quaternion.squad(quaternions[i], quaternions[i + 1], s0, s1, t, new Cesium.Quaternion());
   *
   * // 2. compute the squad interpolation as above but where the first quaternion is a end point.
   * var s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[0], quaternions[1], quaternions[2], new Cesium.Quaternion());
   * var q = Cesium.Quaternion.squad(quaternions[0], quaternions[1], quaternions[0], s1, t, new Cesium.Quaternion());
   *
   * @see Quaternion#computeInnerQuadrangle
   */
  Quaternion.squad = function (q0, q1, s0, s1, t, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("q0", q0);
    Check.Check.typeOf.object("q1", q1);
    Check.Check.typeOf.object("s0", s0);
    Check.Check.typeOf.object("s1", s1);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var slerp0 = Quaternion.slerp(q0, q1, t, squadScratchQuaternion0);
    var slerp1 = Quaternion.slerp(s0, s1, t, squadScratchQuaternion1);
    return Quaternion.slerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
  };

  var fastSlerpScratchQuaternion = new Quaternion();
  var opmu = 1.90110745351730037;
  var u = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
  var v = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
  var bT = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
  var bD = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];

  for (var i = 0; i < 7; ++i) {
    var s = i + 1.0;
    var t = 2.0 * s + 1.0;
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
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var x = Quaternion.dot(start, end);

    var sign;
    if (x >= 0) {
      sign = 1.0;
    } else {
      sign = -1.0;
      x = -x;
    }

    var xm1 = x - 1.0;
    var d = 1.0 - t;
    var sqrT = t * t;
    var sqrD = d * d;

    for (var i = 7; i >= 0; --i) {
      bT[i] = (u[i] * sqrT - v[i]) * xm1;
      bD[i] = (u[i] * sqrD - v[i]) * xm1;
    }

    var cT =
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
    var cD =
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

    var temp = Quaternion.multiplyByScalar(start, cD, fastSlerpScratchQuaternion);
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
    Check.Check.typeOf.object("q0", q0);
    Check.Check.typeOf.object("q1", q1);
    Check.Check.typeOf.object("s0", s0);
    Check.Check.typeOf.object("s1", s1);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    var slerp0 = Quaternion.fastSlerp(q0, q1, t, squadScratchQuaternion0);
    var slerp1 = Quaternion.fastSlerp(s0, s1, t, squadScratchQuaternion1);
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
      (when.defined(left) &&
        when.defined(right) &&
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
    epsilon = when.defaultValue(epsilon, 0);

    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
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

  /**
   * Finds an item in a sorted array.
   *
   * @function
   * @param {Array} array The sorted array to search.
   * @param {*} itemToFind The item to find in the array.
   * @param {binarySearchComparator} comparator The function to use to compare the item to
   *        elements in the array.
   * @returns {Number} The index of <code>itemToFind</code> in the array, if it exists.  If <code>itemToFind</code>
   *        does not exist, the return value is a negative number which is the bitwise complement (~)
   *        of the index before which the itemToFind should be inserted in order to maintain the
   *        sorted order of the array.
   *
   * @example
   * // Create a comparator function to search through an array of numbers.
   * function comparator(a, b) {
   *     return a - b;
   * };
   * var numbers = [0, 2, 4, 6, 8];
   * var index = Cesium.binarySearch(numbers, 6, comparator); // 3
   */
  function binarySearch(array, itemToFind, comparator) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.defined("itemToFind", itemToFind);
    Check.Check.defined("comparator", comparator);
    //>>includeEnd('debug');

    var low = 0;
    var high = array.length - 1;
    var i;
    var comparison;

    while (low <= high) {
      i = ~~((low + high) / 2);
      comparison = comparator(array[i], itemToFind);
      if (comparison < 0) {
        low = i + 1;
        continue;
      }
      if (comparison > 0) {
        high = i - 1;
        continue;
      }
      return i;
    }
    return ~(high + 1);
  }

  /**
   * A set of Earth Orientation Parameters (EOP) sampled at a time.
   *
   * @alias EarthOrientationParametersSample
   * @constructor
   *
   * @param {Number} xPoleWander The pole wander about the X axis, in radians.
   * @param {Number} yPoleWander The pole wander about the Y axis, in radians.
   * @param {Number} xPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
   * @param {Number} yPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
   * @param {Number} ut1MinusUtc The difference in time standards, UT1 - UTC, in seconds.
   *
   * @private
   */
  function EarthOrientationParametersSample(
    xPoleWander,
    yPoleWander,
    xPoleOffset,
    yPoleOffset,
    ut1MinusUtc
  ) {
    /**
     * The pole wander about the X axis, in radians.
     * @type {Number}
     */
    this.xPoleWander = xPoleWander;

    /**
     * The pole wander about the Y axis, in radians.
     * @type {Number}
     */
    this.yPoleWander = yPoleWander;

    /**
     * The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
     * @type {Number}
     */
    this.xPoleOffset = xPoleOffset;

    /**
     * The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
     * @type {Number}
     */
    this.yPoleOffset = yPoleOffset;

    /**
     * The difference in time standards, UT1 - UTC, in seconds.
     * @type {Number}
     */
    this.ut1MinusUtc = ut1MinusUtc;
  }

  /**
  @license
  sprintf.js from the php.js project - https://github.com/kvz/phpjs
  Directly from https://github.com/kvz/phpjs/blob/master/functions/strings/sprintf.js

  php.js is copyright 2012 Kevin van Zonneveld.

  Portions copyright Brett Zamir (http://brett-zamir.me), Kevin van Zonneveld
  (http://kevin.vanzonneveld.net), Onno Marsman, Theriault, Michael White
  (http://getsprink.com), Waldo Malqui Silva, Paulo Freitas, Jack, Jonas
  Raoni Soares Silva (http://www.jsfromhell.com), Philip Peterson, Legaev
  Andrey, Ates Goral (http://magnetiq.com), Alex, Ratheous, Martijn Wieringa,
  Rafa? Kukawski (http://blog.kukawski.pl), lmeyrick
  (https://sourceforge.net/projects/bcmath-js/), Nate, Philippe Baumann,
  Enrique Gonzalez, Webtoolkit.info (http://www.webtoolkit.info/), Carlos R.
  L. Rodrigues (http://www.jsfromhell.com), Ash Searle
  (http://hexmen.com/blog/), Jani Hartikainen, travc, Ole Vrijenhoek,
  Erkekjetter, Michael Grier, Rafa? Kukawski (http://kukawski.pl), Johnny
  Mast (http://www.phpvrouwen.nl), T.Wild, d3x,
  http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript,
  Rafa? Kukawski (http://blog.kukawski.pl/), stag019, pilus, WebDevHobo
  (http://webdevhobo.blogspot.com/), marrtins, GeekFG
  (http://geekfg.blogspot.com), Andrea Giammarchi
  (http://webreflection.blogspot.com), Arpad Ray (mailto:arpad@php.net),
  gorthaur, Paul Smith, Tim de Koning (http://www.kingsquare.nl), Joris, Oleg
  Eremeev, Steve Hilder, majak, gettimeofday, KELAN, Josh Fraser
  (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/),
  Marc Palau, Martin
  (http://www.erlenwiese.de/), Breaking Par Consulting Inc
  (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7),
  Chris, Mirek Slugen, saulius, Alfonso Jimenez
  (http://www.alfonsojimenez.com), Diplom@t (http://difane.com/), felix,
  Mailfaker (http://www.weedem.fr/), Tyler Akins (http://rumkin.com), Caio
  Ariede (http://caioariede.com), Robin, Kankrelune
  (http://www.webfaktory.info/), Karol Kowalski, Imgen Tata
  (http://www.myipdf.com/), mdsjack (http://www.mdsjack.bo.it), Dreamer,
  Felix Geisendoerfer (http://www.debuggable.com/felix), Lars Fischer, AJ,
  David, Aman Gupta, Michael White, Public Domain
  (http://www.json.org/json2.js), Steven Levithan
  (http://blog.stevenlevithan.com), Sakimori, Pellentesque Malesuada,
  Thunder.m, Dj (http://phpjs.org/functions/htmlentities:425#comment_134018),
  Steve Clay, David James, Francois, class_exists, nobbler, T. Wild, Itsacon
  (http://www.itsacon.net/), date, Ole Vrijenhoek (http://www.nervous.nl/),
  Fox, Raphael (Ao RUDLER), Marco, noname, Mateusz "loonquawl" Zalega, Frank
  Forte, Arno, ger, mktime, john (http://www.jd-tech.net), Nick Kolosov
  (http://sammy.ru), marc andreu, Scott Cariss, Douglas Crockford
  (http://javascript.crockford.com), madipta, Slawomir Kaniecki,
  ReverseSyntax, Nathan, Alex Wilson, kenneth, Bayron Guevara, Adam Wallner
  (http://web2.bitbaro.hu/), paulo kuong, jmweb, Lincoln Ramsay, djmix,
  Pyerre, Jon Hohle, Thiago Mata (http://thiagomata.blog.com), lmeyrick
  (https://sourceforge.net/projects/bcmath-js/this.), Linuxworld, duncan,
  Gilbert, Sanjoy Roy, Shingo, sankai, Oskar Larsson H?gfeldt
  (http://oskar-lh.name/), Denny Wardhana, 0m3r, Everlasto, Subhasis Deb,
  josh, jd, Pier Paolo Ramon (http://www.mastersoup.com/), P, merabi, Soren
  Hansen, Eugene Bulkin (http://doubleaw.com/), Der Simon
  (http://innerdom.sourceforge.net/), echo is bad, Ozh, XoraX
  (http://www.xorax.info), EdorFaus, JB, J A R, Marc Jansen, Francesco, LH,
  Stoyan Kyosev (http://www.svest.org/), nord_ua, omid
  (http://phpjs.org/functions/380:380#comment_137122), Brad Touesnard, MeEtc
  (http://yass.meetcweb.com), Peter-Paul Koch
  (http://www.quirksmode.org/js/beat.html), Olivier Louvignes
  (http://mg-crea.com/), T0bsn, Tim Wiel, Bryan Elliott, Jalal Berrami,
  Martin, JT, David Randall, Thomas Beaucourt (http://www.webapp.fr), taith,
  vlado houba, Pierre-Luc Paour, Kristof Coomans (SCK-CEN Belgian Nucleair
  Research Centre), Martin Pool, Kirk Strobeck, Rick Waldron, Brant Messenger
  (http://www.brantmessenger.com/), Devan Penner-Woelk, Saulo Vallory, Wagner
  B. Soares, Artur Tchernychev, Valentina De Rosa, Jason Wong
  (http://carrot.org/), Christoph, Daniel Esteban, strftime, Mick@el, rezna,
  Simon Willison (http://simonwillison.net), Anton Ongson, Gabriel Paderni,
  Marco van Oort, penutbutterjelly, Philipp Lenssen, Bjorn Roesbeke
  (http://www.bjornroesbeke.be/), Bug?, Eric Nagel, Tomasz Wesolowski,
  Evertjan Garretsen, Bobby Drake, Blues (http://tech.bluesmoon.info/), Luke
  Godfrey, Pul, uestla, Alan C, Ulrich, Rafal Kukawski, Yves Sucaet,
  sowberry, Norman "zEh" Fuchs, hitwork, Zahlii, johnrembo, Nick Callen,
  Steven Levithan (stevenlevithan.com), ejsanders, Scott Baker, Brian Tafoya
  (http://www.premasolutions.com/), Philippe Jausions
  (http://pear.php.net/user/jausions), Aidan Lister
  (http://aidanlister.com/), Rob, e-mike, HKM, ChaosNo1, metjay, strcasecmp,
  strcmp, Taras Bogach, jpfle, Alexander Ermolaev
  (http://snippets.dzone.com/user/AlexanderErmolaev), DxGx, kilops, Orlando,
  dptr1988, Le Torbi, James (http://www.james-bell.co.uk/), Pedro Tainha
  (http://www.pedrotainha.com), James, Arnout Kazemier
  (http://www.3rd-Eden.com), Chris McMacken, gabriel paderni, Yannoo,
  FGFEmperor, baris ozdil, Tod Gentille, Greg Frazier, jakes, 3D-GRAF, Allan
  Jensen (http://www.winternet.no), Howard Yeend, Benjamin Lupton, davook,
  daniel airton wermann (http://wermann.com.br), Atli T¨®r, Maximusya, Ryan
  W Tenney (http://ryan.10e.us), Alexander M Beedie, fearphage
  (http://http/my.opera.com/fearphage/), Nathan Sepulveda, Victor, Matteo,
  Billy, stensi, Cord, Manish, T.J. Leahy, Riddler
  (http://www.frontierwebdev.com/), Rafa? Kukawski, FremyCompany, Matt
  Bradley, Tim de Koning, Luis Salazar (http://www.freaky-media.com/), Diogo
  Resende, Rival, Andrej Pavlovic, Garagoth, Le Torbi
  (http://www.letorbi.de/), Dino, Josep Sanz (http://www.ws3.es/), rem,
  Russell Walker (http://www.nbill.co.uk/), Jamie Beck
  (http://www.terabit.ca/), setcookie, Michael, YUI Library:
  http://developer.yahoo.com/yui/docs/YAHOO.util.DateLocale.html, Blues at
  http://hacks.bluesmoon.info/strftime/strftime.js, Ben
  (http://benblume.co.uk/), DtTvB
  (http://dt.in.th/2008-09-16.string-length-in-bytes.html), Andreas, William,
  meo, incidence, Cagri Ekin, Amirouche, Amir Habibi
  (http://www.residence-mixte.com/), Luke Smith (http://lucassmith.name),
  Kheang Hok Chin (http://www.distantia.ca/), Jay Klehr, Lorenzo Pisani,
  Tony, Yen-Wei Liu, Greenseed, mk.keck, Leslie Hoare, dude, booeyOH, Ben
  Bryan

  Licensed under the MIT (MIT-LICENSE.txt) license.

  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be included
  in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
  IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
  OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
  ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
  OTHER DEALINGS IN THE SOFTWARE.
  */

  function sprintf () {
    // http://kevin.vanzonneveld.net
    // +   original by: Ash Searle (http://hexmen.com/blog/)
    // + namespaced by: Michael White (http://getsprink.com)
    // +    tweaked by: Jack
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Paulo Freitas
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Dj
    // +   improved by: Allidylls
    // *     example 1: sprintf("%01.2f", 123.1);
    // *     returns 1: 123.10
    // *     example 2: sprintf("[%10s]", 'monkey');
    // *     returns 2: '[    monkey]'
    // *     example 3: sprintf("[%'#10s]", 'monkey');
    // *     returns 3: '[####monkey]'
    // *     example 4: sprintf("%d", 123456789012345);
    // *     returns 4: '123456789012345'
    var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
    var a = arguments,
      i = 0,
      format = a[i++];

    // pad()
    var pad = function (str, len, chr, leftJustify) {
      if (!chr) {
        chr = ' ';
      }

      var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
      return leftJustify ? str + padding : padding + str;
    };

    // justify()
    var justify = function (value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
      var diff = minWidth - value.length;
      if (diff > 0) {
        if (leftJustify || !zeroPad) {
          value = pad(value, minWidth, customPadChar, leftJustify);
        } else {
          value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
        }
      }
      return value;
    };

    // formatBaseX()
    var formatBaseX = function (value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
      // Note: casts negative numbers to positive ones
      var number = value >>> 0;
      prefix = prefix && number && {
        '2': '0b',
        '8': '0',
        '16': '0x'
      }[base] || '';
      value = prefix + pad(number.toString(base), precision || 0, '0', false);
      return justify(value, prefix, leftJustify, minWidth, zeroPad);
    };

    // formatString()
    var formatString = function (value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
      if (precision != null) {
        value = value.slice(0, precision);
      }
      return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
    };

    // doFormat()
    var doFormat = function (substring, valueIndex, flags, minWidth, _, precision, type) {
      var number;
      var prefix;
      var method;
      var textTransform;
      var value;

      if (substring == '%%') {
        return '%';
      }

      // parse flags
      var leftJustify = false,
        positivePrefix = '',
        zeroPad = false,
        prefixBaseX = false,
        customPadChar = ' ';
      var flagsl = flags.length;
      for (var j = 0; flags && j < flagsl; j++) {
        switch (flags.charAt(j)) {
        case ' ':
          positivePrefix = ' ';
          break;
        case '+':
          positivePrefix = '+';
          break;
        case '-':
          leftJustify = true;
          break;
        case "'":
          customPadChar = flags.charAt(j + 1);
          break;
        case '0':
          zeroPad = true;
          break;
        case '#':
          prefixBaseX = true;
          break;
        }
      }

      // parameters may be null, undefined, empty-string or real valued
      // we want to ignore null, undefined and empty-string values
      if (!minWidth) {
        minWidth = 0;
      } else if (minWidth == '*') {
        minWidth = +a[i++];
      } else if (minWidth.charAt(0) == '*') {
        minWidth = +a[minWidth.slice(1, -1)];
      } else {
        minWidth = +minWidth;
      }

      // Note: undocumented perl feature:
      if (minWidth < 0) {
        minWidth = -minWidth;
        leftJustify = true;
      }

      if (!isFinite(minWidth)) {
        throw new Error('sprintf: (minimum-)width must be finite');
      }

      if (!precision) {
        precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : undefined;
      } else if (precision == '*') {
        precision = +a[i++];
      } else if (precision.charAt(0) == '*') {
        precision = +a[precision.slice(1, -1)];
      } else {
        precision = +precision;
      }

      // grab value using valueIndex if required?
      value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

      switch (type) {
      case 's':
        return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
      case 'c':
        return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
      case 'b':
        return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
      case 'o':
        return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
      case 'x':
        return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
      case 'X':
        return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
      case 'u':
        return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
      case 'i':
      case 'd':
        number = +value || 0;
        number = Math.round(number - number % 1); // Plain Math.round doesn't just truncate
        prefix = number < 0 ? '-' : positivePrefix;
        value = prefix + pad(String(Math.abs(number)), precision, '0', false);
        return justify(value, prefix, leftJustify, minWidth, zeroPad);
      case 'e':
      case 'E':
      case 'f': // Should handle locales (as per setlocale)
      case 'F':
      case 'g':
      case 'G':
        number = +value;
        prefix = number < 0 ? '-' : positivePrefix;
        method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
        textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
        value = prefix + Math.abs(number)[method](precision);
        return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
      default:
        return substring;
      }
    };

    return format.replace(regex, doFormat);
  }

  /**
   * Represents a Gregorian date in a more precise format than the JavaScript Date object.
   * In addition to submillisecond precision, this object can also represent leap seconds.
   * @alias GregorianDate
   * @constructor
   *
   * @param {Number} [year] The year as a whole number.
   * @param {Number} [month] The month as a whole number with range [1, 12].
   * @param {Number} [day] The day of the month as a whole number starting at 1.
   * @param {Number} [hour] The hour as a whole number with range [0, 23].
   * @param {Number} [minute] The minute of the hour as a whole number with range [0, 59].
   * @param {Number} [second] The second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
   * @param {Number} [millisecond] The millisecond of the second as a floating point number with range [0.0, 1000.0).
   * @param {Boolean} [isLeapSecond] Whether this time is during a leap second.
   *
   * @see JulianDate#toGregorianDate
   */
  function GregorianDate(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    isLeapSecond
  ) {
    /**
     * Gets or sets the year as a whole number.
     * @type {Number}
     */
    this.year = year;
    /**
     * Gets or sets the month as a whole number with range [1, 12].
     * @type {Number}
     */
    this.month = month;
    /**
     * Gets or sets the day of the month as a whole number starting at 1.
     * @type {Number}
     */
    this.day = day;
    /**
     * Gets or sets the hour as a whole number with range [0, 23].
     * @type {Number}
     */
    this.hour = hour;
    /**
     * Gets or sets the minute of the hour as a whole number with range [0, 59].
     * @type {Number}
     */
    this.minute = minute;
    /**
     * Gets or sets the second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
     * @type {Number}
     */
    this.second = second;
    /**
     * Gets or sets the millisecond of the second as a floating point number with range [0.0, 1000.0).
     * @type {Number}
     */
    this.millisecond = millisecond;
    /**
     * Gets or sets whether this time is during a leap second.
     * @type {Boolean}
     */
    this.isLeapSecond = isLeapSecond;
  }

  /**
   * Determines if a given date is a leap year.
   *
   * @function isLeapYear
   *
   * @param {Number} year The year to be tested.
   * @returns {Boolean} True if <code>year</code> is a leap year.
   *
   * @example
   * var leapYear = Cesium.isLeapYear(2000); // true
   */
  function isLeapYear(year) {
    //>>includeStart('debug', pragmas.debug);
    if (year === null || isNaN(year)) {
      throw new Check.DeveloperError("year is required and must be a number.");
    }
    //>>includeEnd('debug');

    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Describes a single leap second, which is constructed from a {@link JulianDate} and a
   * numerical offset representing the number of seconds TAI is ahead of the UTC time standard.
   * @alias LeapSecond
   * @constructor
   *
   * @param {JulianDate} [date] A Julian date representing the time of the leap second.
   * @param {Number} [offset] The cumulative number of seconds that TAI is ahead of UTC at the provided date.
   */
  function LeapSecond(date, offset) {
    /**
     * Gets or sets the date at which this leap second occurs.
     * @type {JulianDate}
     */
    this.julianDate = date;

    /**
     * Gets or sets the cumulative number of seconds between the UTC and TAI time standards at the time
     * of this leap second.
     * @type {Number}
     */
    this.offset = offset;
  }

  /**
   * Constants for time conversions like those done by {@link JulianDate}.
   *
   * @namespace TimeConstants
   *
   * @see JulianDate
   *
   * @private
   */
  var TimeConstants = {
    /**
     * The number of seconds in one millisecond: <code>0.001</code>
     * @type {Number}
     * @constant
     */
    SECONDS_PER_MILLISECOND: 0.001,

    /**
     * The number of seconds in one minute: <code>60</code>.
     * @type {Number}
     * @constant
     */
    SECONDS_PER_MINUTE: 60.0,

    /**
     * The number of minutes in one hour: <code>60</code>.
     * @type {Number}
     * @constant
     */
    MINUTES_PER_HOUR: 60.0,

    /**
     * The number of hours in one day: <code>24</code>.
     * @type {Number}
     * @constant
     */
    HOURS_PER_DAY: 24.0,

    /**
     * The number of seconds in one hour: <code>3600</code>.
     * @type {Number}
     * @constant
     */
    SECONDS_PER_HOUR: 3600.0,

    /**
     * The number of minutes in one day: <code>1440</code>.
     * @type {Number}
     * @constant
     */
    MINUTES_PER_DAY: 1440.0,

    /**
     * The number of seconds in one day, ignoring leap seconds: <code>86400</code>.
     * @type {Number}
     * @constant
     */
    SECONDS_PER_DAY: 86400.0,

    /**
     * The number of days in one Julian century: <code>36525</code>.
     * @type {Number}
     * @constant
     */
    DAYS_PER_JULIAN_CENTURY: 36525.0,

    /**
     * One trillionth of a second.
     * @type {Number}
     * @constant
     */
    PICOSECOND: 0.000000001,

    /**
     * The number of days to subtract from a Julian date to determine the
     * modified Julian date, which gives the number of days since midnight
     * on November 17, 1858.
     * @type {Number}
     * @constant
     */
    MODIFIED_JULIAN_DATE_DIFFERENCE: 2400000.5,
  };
  var TimeConstants$1 = Object.freeze(TimeConstants);

  /**
   * Provides the type of time standards which JulianDate can take as input.
   *
   * @enum {Number}
   *
   * @see JulianDate
   */
  var TimeStandard = {
    /**
     * Represents the coordinated Universal Time (UTC) time standard.
     *
     * UTC is related to TAI according to the relationship
     * <code>UTC = TAI - deltaT</code> where <code>deltaT</code> is the number of leap
     * seconds which have been introduced as of the time in TAI.
     *
     * @type {Number}
     * @constant
     */
    UTC: 0,

    /**
     * Represents the International Atomic Time (TAI) time standard.
     * TAI is the principal time standard to which the other time standards are related.
     *
     * @type {Number}
     * @constant
     */
    TAI: 1,
  };
  var TimeStandard$1 = Object.freeze(TimeStandard);

  var gregorianDateScratch = new GregorianDate();
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var daysInLeapFeburary = 29;

  function compareLeapSecondDates$1(leapSecond, dateToFind) {
    return JulianDate.compare(leapSecond.julianDate, dateToFind.julianDate);
  }

  // we don't really need a leap second instance, anything with a julianDate property will do
  var binarySearchScratchLeapSecond = new LeapSecond();

  function convertUtcToTai(julianDate) {
    //Even though julianDate is in UTC, we'll treat it as TAI and
    //search the leap second table for it.
    binarySearchScratchLeapSecond.julianDate = julianDate;
    var leapSeconds = JulianDate.leapSeconds;
    var index = binarySearch(
      leapSeconds,
      binarySearchScratchLeapSecond,
      compareLeapSecondDates$1
    );

    if (index < 0) {
      index = ~index;
    }

    if (index >= leapSeconds.length) {
      index = leapSeconds.length - 1;
    }

    var offset = leapSeconds[index].offset;
    if (index > 0) {
      //Now we have the index of the closest leap second that comes on or after our UTC time.
      //However, if the difference between the UTC date being converted and the TAI
      //defined leap second is greater than the offset, we are off by one and need to use
      //the previous leap second.
      var difference = JulianDate.secondsDifference(
        leapSeconds[index].julianDate,
        julianDate
      );
      if (difference > offset) {
        index--;
        offset = leapSeconds[index].offset;
      }
    }

    JulianDate.addSeconds(julianDate, offset, julianDate);
  }

  function convertTaiToUtc(julianDate, result) {
    binarySearchScratchLeapSecond.julianDate = julianDate;
    var leapSeconds = JulianDate.leapSeconds;
    var index = binarySearch(
      leapSeconds,
      binarySearchScratchLeapSecond,
      compareLeapSecondDates$1
    );
    if (index < 0) {
      index = ~index;
    }

    //All times before our first leap second get the first offset.
    if (index === 0) {
      return JulianDate.addSeconds(julianDate, -leapSeconds[0].offset, result);
    }

    //All times after our leap second get the last offset.
    if (index >= leapSeconds.length) {
      return JulianDate.addSeconds(
        julianDate,
        -leapSeconds[index - 1].offset,
        result
      );
    }

    //Compute the difference between the found leap second and the time we are converting.
    var difference = JulianDate.secondsDifference(
      leapSeconds[index].julianDate,
      julianDate
    );

    if (difference === 0) {
      //The date is in our leap second table.
      return JulianDate.addSeconds(
        julianDate,
        -leapSeconds[index].offset,
        result
      );
    }

    if (difference <= 1.0) {
      //The requested date is during the moment of a leap second, then we cannot convert to UTC
      return undefined;
    }

    //The time is in between two leap seconds, index is the leap second after the date
    //we're converting, so we subtract one to get the correct LeapSecond instance.
    return JulianDate.addSeconds(
      julianDate,
      -leapSeconds[--index].offset,
      result
    );
  }

  function setComponents(wholeDays, secondsOfDay, julianDate) {
    var extraDays = (secondsOfDay / TimeConstants$1.SECONDS_PER_DAY) | 0;
    wholeDays += extraDays;
    secondsOfDay -= TimeConstants$1.SECONDS_PER_DAY * extraDays;

    if (secondsOfDay < 0) {
      wholeDays--;
      secondsOfDay += TimeConstants$1.SECONDS_PER_DAY;
    }

    julianDate.dayNumber = wholeDays;
    julianDate.secondsOfDay = secondsOfDay;
    return julianDate;
  }

  function computeJulianDateComponents(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond
  ) {
    // Algorithm from page 604 of the Explanatory Supplement to the
    // Astronomical Almanac (Seidelmann 1992).

    var a = ((month - 14) / 12) | 0;
    var b = year + 4800 + a;
    var dayNumber =
      (((1461 * b) / 4) | 0) +
      (((367 * (month - 2 - 12 * a)) / 12) | 0) -
      (((3 * (((b + 100) / 100) | 0)) / 4) | 0) +
      day -
      32075;

    // JulianDates are noon-based
    hour = hour - 12;
    if (hour < 0) {
      hour += 24;
    }

    var secondsOfDay =
      second +
      (hour * TimeConstants$1.SECONDS_PER_HOUR +
        minute * TimeConstants$1.SECONDS_PER_MINUTE +
        millisecond * TimeConstants$1.SECONDS_PER_MILLISECOND);

    if (secondsOfDay >= 43200.0) {
      dayNumber -= 1;
    }

    return [dayNumber, secondsOfDay];
  }

  //Regular expressions used for ISO8601 date parsing.
  //YYYY
  var matchCalendarYear = /^(\d{4})$/;
  //YYYY-MM (YYYYMM is invalid)
  var matchCalendarMonth = /^(\d{4})-(\d{2})$/;
  //YYYY-DDD or YYYYDDD
  var matchOrdinalDate = /^(\d{4})-?(\d{3})$/;
  //YYYY-Www or YYYYWww or YYYY-Www-D or YYYYWwwD
  var matchWeekDate = /^(\d{4})-?W(\d{2})-?(\d{1})?$/;
  //YYYY-MM-DD or YYYYMMDD
  var matchCalendarDate = /^(\d{4})-?(\d{2})-?(\d{2})$/;
  // Match utc offset
  var utcOffset = /([Z+\-])?(\d{2})?:?(\d{2})?$/;
  // Match hours HH or HH.xxxxx
  var matchHours = /^(\d{2})(\.\d+)?/.source + utcOffset.source;
  // Match hours/minutes HH:MM HHMM.xxxxx
  var matchHoursMinutes = /^(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;
  // Match hours/minutes HH:MM:SS HHMMSS.xxxxx
  var matchHoursMinutesSeconds =
    /^(\d{2}):?(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;

  var iso8601ErrorMessage = "Invalid ISO 8601 date.";

  /**
   * Represents an astronomical Julian date, which is the number of days since noon on January 1, -4712 (4713 BC).
   * For increased precision, this class stores the whole number part of the date and the seconds
   * part of the date in separate components.  In order to be safe for arithmetic and represent
   * leap seconds, the date is always stored in the International Atomic Time standard
   * {@link TimeStandard.TAI}.
   * @alias JulianDate
   * @constructor
   *
   * @param {Number} [julianDayNumber=0.0] The Julian Day Number representing the number of whole days.  Fractional days will also be handled correctly.
   * @param {Number} [secondsOfDay=0.0] The number of seconds into the current Julian Day Number.  Fractional seconds, negative seconds and seconds greater than a day will be handled correctly.
   * @param {TimeStandard} [timeStandard=TimeStandard.UTC] The time standard in which the first two parameters are defined.
   */
  function JulianDate(julianDayNumber, secondsOfDay, timeStandard) {
    /**
     * Gets or sets the number of whole days.
     * @type {Number}
     */
    this.dayNumber = undefined;

    /**
     * Gets or sets the number of seconds into the current day.
     * @type {Number}
     */
    this.secondsOfDay = undefined;

    julianDayNumber = when.defaultValue(julianDayNumber, 0.0);
    secondsOfDay = when.defaultValue(secondsOfDay, 0.0);
    timeStandard = when.defaultValue(timeStandard, TimeStandard$1.UTC);

    //If julianDayNumber is fractional, make it an integer and add the number of seconds the fraction represented.
    var wholeDays = julianDayNumber | 0;
    secondsOfDay =
      secondsOfDay +
      (julianDayNumber - wholeDays) * TimeConstants$1.SECONDS_PER_DAY;

    setComponents(wholeDays, secondsOfDay, this);

    if (timeStandard === TimeStandard$1.UTC) {
      convertUtcToTai(this);
    }
  }

  /**
   * Creates a new instance from a GregorianDate.
   *
   * @param {GregorianDate} date A GregorianDate.
   * @param {JulianDate} [result] An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
   *
   * @exception {DeveloperError} date must be a valid GregorianDate.
   */
  JulianDate.fromGregorianDate = function (date, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!(date instanceof GregorianDate)) {
      throw new Check.DeveloperError("date must be a valid GregorianDate.");
    }
    //>>includeEnd('debug');

    var components = computeJulianDateComponents(
      date.year,
      date.month,
      date.day,
      date.hour,
      date.minute,
      date.second,
      date.millisecond
    );
    if (!when.defined(result)) {
      return new JulianDate(components[0], components[1], TimeStandard$1.UTC);
    }
    setComponents(components[0], components[1], result);
    convertUtcToTai(result);
    return result;
  };

  /**
   * Creates a new instance from a JavaScript Date.
   *
   * @param {Date} date A JavaScript Date.
   * @param {JulianDate} [result] An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
   *
   * @exception {DeveloperError} date must be a valid JavaScript Date.
   */
  JulianDate.fromDate = function (date, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Check.DeveloperError("date must be a valid JavaScript Date.");
    }
    //>>includeEnd('debug');

    var components = computeJulianDateComponents(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    );
    if (!when.defined(result)) {
      return new JulianDate(components[0], components[1], TimeStandard$1.UTC);
    }
    setComponents(components[0], components[1], result);
    convertUtcToTai(result);
    return result;
  };

  /**
   * Creates a new instance from a from an {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601} date.
   * This method is superior to <code>Date.parse</code> because it will handle all valid formats defined by the ISO 8601
   * specification, including leap seconds and sub-millisecond times, which discarded by most JavaScript implementations.
   *
   * @param {String} iso8601String An ISO 8601 date.
   * @param {JulianDate} [result] An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
   *
   * @exception {DeveloperError} Invalid ISO 8601 date.
   */
  JulianDate.fromIso8601 = function (iso8601String, result) {
    //>>includeStart('debug', pragmas.debug);
    if (typeof iso8601String !== "string") {
      throw new Check.DeveloperError(iso8601ErrorMessage);
    }
    //>>includeEnd('debug');

    //Comma and decimal point both indicate a fractional number according to ISO 8601,
    //start out by blanket replacing , with . which is the only valid such symbol in JS.
    iso8601String = iso8601String.replace(",", ".");

    //Split the string into its date and time components, denoted by a mandatory T
    var tokens = iso8601String.split("T");
    var year;
    var month = 1;
    var day = 1;
    var hour = 0;
    var minute = 0;
    var second = 0;
    var millisecond = 0;

    //Lacking a time is okay, but a missing date is illegal.
    var date = tokens[0];
    var time = tokens[1];
    var tmp;
    var inLeapYear;
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(date)) {
      throw new Check.DeveloperError(iso8601ErrorMessage);
    }

    var dashCount;
    //>>includeEnd('debug');

    //First match the date against possible regular expressions.
    tokens = date.match(matchCalendarDate);
    if (tokens !== null) {
      //>>includeStart('debug', pragmas.debug);
      dashCount = date.split("-").length - 1;
      if (dashCount > 0 && dashCount !== 2) {
        throw new Check.DeveloperError(iso8601ErrorMessage);
      }
      //>>includeEnd('debug');
      year = +tokens[1];
      month = +tokens[2];
      day = +tokens[3];
    } else {
      tokens = date.match(matchCalendarMonth);
      if (tokens !== null) {
        year = +tokens[1];
        month = +tokens[2];
      } else {
        tokens = date.match(matchCalendarYear);
        if (tokens !== null) {
          year = +tokens[1];
        } else {
          //Not a year/month/day so it must be an ordinal date.
          var dayOfYear;
          tokens = date.match(matchOrdinalDate);
          if (tokens !== null) {
            year = +tokens[1];
            dayOfYear = +tokens[2];
            inLeapYear = isLeapYear(year);

            //This validation is only applicable for this format.
            //>>includeStart('debug', pragmas.debug);
            if (
              dayOfYear < 1 ||
              (inLeapYear && dayOfYear > 366) ||
              (!inLeapYear && dayOfYear > 365)
            ) {
              throw new Check.DeveloperError(iso8601ErrorMessage);
            }
            //>>includeEnd('debug')
          } else {
            tokens = date.match(matchWeekDate);
            if (tokens !== null) {
              //ISO week date to ordinal date from
              //http://en.wikipedia.org/w/index.php?title=ISO_week_date&oldid=474176775
              year = +tokens[1];
              var weekNumber = +tokens[2];
              var dayOfWeek = +tokens[3] || 0;

              //>>includeStart('debug', pragmas.debug);
              dashCount = date.split("-").length - 1;
              if (
                dashCount > 0 &&
                ((!when.defined(tokens[3]) && dashCount !== 1) ||
                  (when.defined(tokens[3]) && dashCount !== 2))
              ) {
                throw new Check.DeveloperError(iso8601ErrorMessage);
              }
              //>>includeEnd('debug')

              var january4 = new Date(Date.UTC(year, 0, 4));
              dayOfYear = weekNumber * 7 + dayOfWeek - january4.getUTCDay() - 3;
            } else {
              //None of our regular expressions succeeded in parsing the date properly.
              //>>includeStart('debug', pragmas.debug);
              throw new Check.DeveloperError(iso8601ErrorMessage);
              //>>includeEnd('debug')
            }
          }
          //Split an ordinal date into month/day.
          tmp = new Date(Date.UTC(year, 0, 1));
          tmp.setUTCDate(dayOfYear);
          month = tmp.getUTCMonth() + 1;
          day = tmp.getUTCDate();
        }
      }
    }

    //Now that we have all of the date components, validate them to make sure nothing is out of range.
    inLeapYear = isLeapYear(year);
    //>>includeStart('debug', pragmas.debug);
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      ((month !== 2 || !inLeapYear) && day > daysInMonth[month - 1]) ||
      (inLeapYear && month === 2 && day > daysInLeapFeburary)
    ) {
      throw new Check.DeveloperError(iso8601ErrorMessage);
    }
    //>>includeEnd('debug')

    //Now move onto the time string, which is much simpler.
    //If no time is specified, it is considered the beginning of the day, UTC to match Javascript's implementation.
    var offsetIndex;
    if (when.defined(time)) {
      tokens = time.match(matchHoursMinutesSeconds);
      if (tokens !== null) {
        //>>includeStart('debug', pragmas.debug);
        dashCount = time.split(":").length - 1;
        if (dashCount > 0 && dashCount !== 2 && dashCount !== 3) {
          throw new Check.DeveloperError(iso8601ErrorMessage);
        }
        //>>includeEnd('debug')

        hour = +tokens[1];
        minute = +tokens[2];
        second = +tokens[3];
        millisecond = +(tokens[4] || 0) * 1000.0;
        offsetIndex = 5;
      } else {
        tokens = time.match(matchHoursMinutes);
        if (tokens !== null) {
          //>>includeStart('debug', pragmas.debug);
          dashCount = time.split(":").length - 1;
          if (dashCount > 2) {
            throw new Check.DeveloperError(iso8601ErrorMessage);
          }
          //>>includeEnd('debug')

          hour = +tokens[1];
          minute = +tokens[2];
          second = +(tokens[3] || 0) * 60.0;
          offsetIndex = 4;
        } else {
          tokens = time.match(matchHours);
          if (tokens !== null) {
            hour = +tokens[1];
            minute = +(tokens[2] || 0) * 60.0;
            offsetIndex = 3;
          } else {
            //>>includeStart('debug', pragmas.debug);
            throw new Check.DeveloperError(iso8601ErrorMessage);
            //>>includeEnd('debug')
          }
        }
      }

      //Validate that all values are in proper range.  Minutes and hours have special cases at 60 and 24.
      //>>includeStart('debug', pragmas.debug);
      if (
        minute >= 60 ||
        second >= 61 ||
        hour > 24 ||
        (hour === 24 && (minute > 0 || second > 0 || millisecond > 0))
      ) {
        throw new Check.DeveloperError(iso8601ErrorMessage);
      }
      //>>includeEnd('debug');

      //Check the UTC offset value, if no value exists, use local time
      //a Z indicates UTC, + or - are offsets.
      var offset = tokens[offsetIndex];
      var offsetHours = +tokens[offsetIndex + 1];
      var offsetMinutes = +(tokens[offsetIndex + 2] || 0);
      switch (offset) {
        case "+":
          hour = hour - offsetHours;
          minute = minute - offsetMinutes;
          break;
        case "-":
          hour = hour + offsetHours;
          minute = minute + offsetMinutes;
          break;
        case "Z":
          break;
        default:
          minute =
            minute +
            new Date(
              Date.UTC(year, month - 1, day, hour, minute)
            ).getTimezoneOffset();
          break;
      }
    }

    //ISO8601 denotes a leap second by any time having a seconds component of 60 seconds.
    //If that's the case, we need to temporarily subtract a second in order to build a UTC date.
    //Then we add it back in after converting to TAI.
    var isLeapSecond = second === 60;
    if (isLeapSecond) {
      second--;
    }

    //Even if we successfully parsed the string into its components, after applying UTC offset or
    //special cases like 24:00:00 denoting midnight, we need to normalize the data appropriately.

    //milliseconds can never be greater than 1000, and seconds can't be above 60, so we start with minutes
    while (minute >= 60) {
      minute -= 60;
      hour++;
    }

    while (hour >= 24) {
      hour -= 24;
      day++;
    }

    tmp = inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
    while (day > tmp) {
      day -= tmp;
      month++;

      if (month > 12) {
        month -= 12;
        year++;
      }

      tmp =
        inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
    }

    //If UTC offset is at the beginning/end of the day, minutes can be negative.
    while (minute < 0) {
      minute += 60;
      hour--;
    }

    while (hour < 0) {
      hour += 24;
      day--;
    }

    while (day < 1) {
      month--;
      if (month < 1) {
        month += 12;
        year--;
      }

      tmp =
        inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
      day += tmp;
    }

    //Now create the JulianDate components from the Gregorian date and actually create our instance.
    var components = computeJulianDateComponents(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond
    );

    if (!when.defined(result)) {
      result = new JulianDate(components[0], components[1], TimeStandard$1.UTC);
    } else {
      setComponents(components[0], components[1], result);
      convertUtcToTai(result);
    }

    //If we were on a leap second, add it back.
    if (isLeapSecond) {
      JulianDate.addSeconds(result, 1, result);
    }

    return result;
  };

  /**
   * Creates a new instance that represents the current system time.
   * This is equivalent to calling <code>JulianDate.fromDate(new Date());</code>.
   *
   * @param {JulianDate} [result] An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
   */
  JulianDate.now = function (result) {
    return JulianDate.fromDate(new Date(), result);
  };

  var toGregorianDateScratch = new JulianDate(0, 0, TimeStandard$1.TAI);

  /**
   * Creates a {@link GregorianDate} from the provided instance.
   *
   * @param {JulianDate} julianDate The date to be converted.
   * @param {GregorianDate} [result] An existing instance to use for the result.
   * @returns {GregorianDate} The modified result parameter or a new instance if none was provided.
   */
  JulianDate.toGregorianDate = function (julianDate, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    //>>includeEnd('debug');

    var isLeapSecond = false;
    var thisUtc = convertTaiToUtc(julianDate, toGregorianDateScratch);
    if (!when.defined(thisUtc)) {
      //Conversion to UTC will fail if we are during a leap second.
      //If that's the case, subtract a second and convert again.
      //JavaScript doesn't support leap seconds, so this results in second 59 being repeated twice.
      JulianDate.addSeconds(julianDate, -1, toGregorianDateScratch);
      thisUtc = convertTaiToUtc(toGregorianDateScratch, toGregorianDateScratch);
      isLeapSecond = true;
    }

    var julianDayNumber = thisUtc.dayNumber;
    var secondsOfDay = thisUtc.secondsOfDay;

    if (secondsOfDay >= 43200.0) {
      julianDayNumber += 1;
    }

    // Algorithm from page 604 of the Explanatory Supplement to the
    // Astronomical Almanac (Seidelmann 1992).
    var L = (julianDayNumber + 68569) | 0;
    var N = ((4 * L) / 146097) | 0;
    L = (L - (((146097 * N + 3) / 4) | 0)) | 0;
    var I = ((4000 * (L + 1)) / 1461001) | 0;
    L = (L - (((1461 * I) / 4) | 0) + 31) | 0;
    var J = ((80 * L) / 2447) | 0;
    var day = (L - (((2447 * J) / 80) | 0)) | 0;
    L = (J / 11) | 0;
    var month = (J + 2 - 12 * L) | 0;
    var year = (100 * (N - 49) + I + L) | 0;

    var hour = (secondsOfDay / TimeConstants$1.SECONDS_PER_HOUR) | 0;
    var remainingSeconds = secondsOfDay - hour * TimeConstants$1.SECONDS_PER_HOUR;
    var minute = (remainingSeconds / TimeConstants$1.SECONDS_PER_MINUTE) | 0;
    remainingSeconds =
      remainingSeconds - minute * TimeConstants$1.SECONDS_PER_MINUTE;
    var second = remainingSeconds | 0;
    var millisecond =
      (remainingSeconds - second) / TimeConstants$1.SECONDS_PER_MILLISECOND;

    // JulianDates are noon-based
    hour += 12;
    if (hour > 23) {
      hour -= 24;
    }

    //If we were on a leap second, add it back.
    if (isLeapSecond) {
      second += 1;
    }

    if (!when.defined(result)) {
      return new GregorianDate(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        isLeapSecond
      );
    }

    result.year = year;
    result.month = month;
    result.day = day;
    result.hour = hour;
    result.minute = minute;
    result.second = second;
    result.millisecond = millisecond;
    result.isLeapSecond = isLeapSecond;
    return result;
  };

  /**
   * Creates a JavaScript Date from the provided instance.
   * Since JavaScript dates are only accurate to the nearest millisecond and
   * cannot represent a leap second, consider using {@link JulianDate.toGregorianDate} instead.
   * If the provided JulianDate is during a leap second, the previous second is used.
   *
   * @param {JulianDate} julianDate The date to be converted.
   * @returns {Date} A new instance representing the provided date.
   */
  JulianDate.toDate = function (julianDate) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    //>>includeEnd('debug');

    var gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch);
    var second = gDate.second;
    if (gDate.isLeapSecond) {
      second -= 1;
    }
    return new Date(
      Date.UTC(
        gDate.year,
        gDate.month - 1,
        gDate.day,
        gDate.hour,
        gDate.minute,
        second,
        gDate.millisecond
      )
    );
  };

  /**
   * Creates an ISO8601 representation of the provided date.
   *
   * @param {JulianDate} julianDate The date to be converted.
   * @param {Number} [precision] The number of fractional digits used to represent the seconds component.  By default, the most precise representation is used.
   * @returns {String} The ISO8601 representation of the provided date.
   */
  JulianDate.toIso8601 = function (julianDate, precision) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    //>>includeEnd('debug');

    var gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch);
    var year = gDate.year;
    var month = gDate.month;
    var day = gDate.day;
    var hour = gDate.hour;
    var minute = gDate.minute;
    var second = gDate.second;
    var millisecond = gDate.millisecond;

    // special case - Iso8601.MAXIMUM_VALUE produces a string which we can't parse unless we adjust.
    // 10000-01-01T00:00:00 is the same instant as 9999-12-31T24:00:00
    if (
      year === 10000 &&
      month === 1 &&
      day === 1 &&
      hour === 0 &&
      minute === 0 &&
      second === 0 &&
      millisecond === 0
    ) {
      year = 9999;
      month = 12;
      day = 31;
      hour = 24;
    }

    var millisecondStr;

    if (!when.defined(precision) && millisecond !== 0) {
      //Forces milliseconds into a number with at least 3 digits to whatever the default toString() precision is.
      millisecondStr = (millisecond * 0.01).toString().replace(".", "");
      return sprintf(
        "%04d-%02d-%02dT%02d:%02d:%02d.%sZ",
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecondStr
      );
    }

    //Precision is either 0 or milliseconds is 0 with undefined precision, in either case, leave off milliseconds entirely
    if (!when.defined(precision) || precision === 0) {
      return sprintf(
        "%04d-%02d-%02dT%02d:%02d:%02dZ",
        year,
        month,
        day,
        hour,
        minute,
        second
      );
    }

    //Forces milliseconds into a number with at least 3 digits to whatever the specified precision is.
    millisecondStr = (millisecond * 0.01)
      .toFixed(precision)
      .replace(".", "")
      .slice(0, precision);
    return sprintf(
      "%04d-%02d-%02dT%02d:%02d:%02d.%sZ",
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecondStr
    );
  };

  /**
   * Duplicates a JulianDate instance.
   *
   * @param {JulianDate} julianDate The date to duplicate.
   * @param {JulianDate} [result] An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter or a new instance if none was provided. Returns undefined if julianDate is undefined.
   */
  JulianDate.clone = function (julianDate, result) {
    if (!when.defined(julianDate)) {
      return undefined;
    }
    if (!when.defined(result)) {
      return new JulianDate(
        julianDate.dayNumber,
        julianDate.secondsOfDay,
        TimeStandard$1.TAI
      );
    }
    result.dayNumber = julianDate.dayNumber;
    result.secondsOfDay = julianDate.secondsOfDay;
    return result;
  };

  /**
   * Compares two instances.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Number} A negative value if left is less than right, a positive value if left is greater than right, or zero if left and right are equal.
   */
  JulianDate.compare = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(left)) {
      throw new Check.DeveloperError("left is required.");
    }
    if (!when.defined(right)) {
      throw new Check.DeveloperError("right is required.");
    }
    //>>includeEnd('debug');

    var julianDayNumberDifference = left.dayNumber - right.dayNumber;
    if (julianDayNumberDifference !== 0) {
      return julianDayNumberDifference;
    }
    return left.secondsOfDay - right.secondsOfDay;
  };

  /**
   * Compares two instances and returns <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {JulianDate} [left] The first instance.
   * @param {JulianDate} [right] The second instance.
   * @returns {Boolean} <code>true</code> if the dates are equal; otherwise, <code>false</code>.
   */
  JulianDate.equals = function (left, right) {
    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        left.dayNumber === right.dayNumber &&
        left.secondsOfDay === right.secondsOfDay)
    );
  };

  /**
   * Compares two instances and returns <code>true</code> if they are within <code>epsilon</code> seconds of
   * each other.  That is, in order for the dates to be considered equal (and for
   * this function to return <code>true</code>), the absolute value of the difference between them, in
   * seconds, must be less than <code>epsilon</code>.
   *
   * @param {JulianDate} [left] The first instance.
   * @param {JulianDate} [right] The second instance.
   * @param {Number} [epsilon=0] The maximum number of seconds that should separate the two instances.
   * @returns {Boolean} <code>true</code> if the two dates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
   */
  JulianDate.equalsEpsilon = function (left, right, epsilon) {
    epsilon = when.defaultValue(epsilon, 0);

    return (
      left === right ||
      (when.defined(left) &&
        when.defined(right) &&
        Math.abs(JulianDate.secondsDifference(left, right)) <= epsilon)
    );
  };

  /**
   * Computes the total number of whole and fractional days represented by the provided instance.
   *
   * @param {JulianDate} julianDate The date.
   * @returns {Number} The Julian date as single floating point number.
   */
  JulianDate.totalDays = function (julianDate) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    //>>includeEnd('debug');
    return (
      julianDate.dayNumber +
      julianDate.secondsOfDay / TimeConstants$1.SECONDS_PER_DAY
    );
  };

  /**
   * Computes the difference in seconds between the provided instance.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Number} The difference, in seconds, when subtracting <code>right</code> from <code>left</code>.
   */
  JulianDate.secondsDifference = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(left)) {
      throw new Check.DeveloperError("left is required.");
    }
    if (!when.defined(right)) {
      throw new Check.DeveloperError("right is required.");
    }
    //>>includeEnd('debug');

    var dayDifference =
      (left.dayNumber - right.dayNumber) * TimeConstants$1.SECONDS_PER_DAY;
    return dayDifference + (left.secondsOfDay - right.secondsOfDay);
  };

  /**
   * Computes the difference in days between the provided instance.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Number} The difference, in days, when subtracting <code>right</code> from <code>left</code>.
   */
  JulianDate.daysDifference = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(left)) {
      throw new Check.DeveloperError("left is required.");
    }
    if (!when.defined(right)) {
      throw new Check.DeveloperError("right is required.");
    }
    //>>includeEnd('debug');

    var dayDifference = left.dayNumber - right.dayNumber;
    var secondDifference =
      (left.secondsOfDay - right.secondsOfDay) / TimeConstants$1.SECONDS_PER_DAY;
    return dayDifference + secondDifference;
  };

  /**
   * Computes the number of seconds the provided instance is ahead of UTC.
   *
   * @param {JulianDate} julianDate The date.
   * @returns {Number} The number of seconds the provided instance is ahead of UTC
   */
  JulianDate.computeTaiMinusUtc = function (julianDate) {
    binarySearchScratchLeapSecond.julianDate = julianDate;
    var leapSeconds = JulianDate.leapSeconds;
    var index = binarySearch(
      leapSeconds,
      binarySearchScratchLeapSecond,
      compareLeapSecondDates$1
    );
    if (index < 0) {
      index = ~index;
      --index;
      if (index < 0) {
        index = 0;
      }
    }
    return leapSeconds[index].offset;
  };

  /**
   * Adds the provided number of seconds to the provided date instance.
   *
   * @param {JulianDate} julianDate The date.
   * @param {Number} seconds The number of seconds to add or subtract.
   * @param {JulianDate} result An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter.
   */
  JulianDate.addSeconds = function (julianDate, seconds, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    if (!when.defined(seconds)) {
      throw new Check.DeveloperError("seconds is required.");
    }
    if (!when.defined(result)) {
      throw new Check.DeveloperError("result is required.");
    }
    //>>includeEnd('debug');

    return setComponents(
      julianDate.dayNumber,
      julianDate.secondsOfDay + seconds,
      result
    );
  };

  /**
   * Adds the provided number of minutes to the provided date instance.
   *
   * @param {JulianDate} julianDate The date.
   * @param {Number} minutes The number of minutes to add or subtract.
   * @param {JulianDate} result An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter.
   */
  JulianDate.addMinutes = function (julianDate, minutes, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    if (!when.defined(minutes)) {
      throw new Check.DeveloperError("minutes is required.");
    }
    if (!when.defined(result)) {
      throw new Check.DeveloperError("result is required.");
    }
    //>>includeEnd('debug');

    var newSecondsOfDay =
      julianDate.secondsOfDay + minutes * TimeConstants$1.SECONDS_PER_MINUTE;
    return setComponents(julianDate.dayNumber, newSecondsOfDay, result);
  };

  /**
   * Adds the provided number of hours to the provided date instance.
   *
   * @param {JulianDate} julianDate The date.
   * @param {Number} hours The number of hours to add or subtract.
   * @param {JulianDate} result An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter.
   */
  JulianDate.addHours = function (julianDate, hours, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    if (!when.defined(hours)) {
      throw new Check.DeveloperError("hours is required.");
    }
    if (!when.defined(result)) {
      throw new Check.DeveloperError("result is required.");
    }
    //>>includeEnd('debug');

    var newSecondsOfDay =
      julianDate.secondsOfDay + hours * TimeConstants$1.SECONDS_PER_HOUR;
    return setComponents(julianDate.dayNumber, newSecondsOfDay, result);
  };

  /**
   * Adds the provided number of days to the provided date instance.
   *
   * @param {JulianDate} julianDate The date.
   * @param {Number} days The number of days to add or subtract.
   * @param {JulianDate} result An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter.
   */
  JulianDate.addDays = function (julianDate, days, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(julianDate)) {
      throw new Check.DeveloperError("julianDate is required.");
    }
    if (!when.defined(days)) {
      throw new Check.DeveloperError("days is required.");
    }
    if (!when.defined(result)) {
      throw new Check.DeveloperError("result is required.");
    }
    //>>includeEnd('debug');

    var newJulianDayNumber = julianDate.dayNumber + days;
    return setComponents(newJulianDayNumber, julianDate.secondsOfDay, result);
  };

  /**
   * Compares the provided instances and returns <code>true</code> if <code>left</code> is earlier than <code>right</code>, <code>false</code> otherwise.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Boolean} <code>true</code> if <code>left</code> is earlier than <code>right</code>, <code>false</code> otherwise.
   */
  JulianDate.lessThan = function (left, right) {
    return JulianDate.compare(left, right) < 0;
  };

  /**
   * Compares the provided instances and returns <code>true</code> if <code>left</code> is earlier than or equal to <code>right</code>, <code>false</code> otherwise.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Boolean} <code>true</code> if <code>left</code> is earlier than or equal to <code>right</code>, <code>false</code> otherwise.
   */
  JulianDate.lessThanOrEquals = function (left, right) {
    return JulianDate.compare(left, right) <= 0;
  };

  /**
   * Compares the provided instances and returns <code>true</code> if <code>left</code> is later than <code>right</code>, <code>false</code> otherwise.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Boolean} <code>true</code> if <code>left</code> is later than <code>right</code>, <code>false</code> otherwise.
   */
  JulianDate.greaterThan = function (left, right) {
    return JulianDate.compare(left, right) > 0;
  };

  /**
   * Compares the provided instances and returns <code>true</code> if <code>left</code> is later than or equal to <code>right</code>, <code>false</code> otherwise.
   *
   * @param {JulianDate} left The first instance.
   * @param {JulianDate} right The second instance.
   * @returns {Boolean} <code>true</code> if <code>left</code> is later than or equal to <code>right</code>, <code>false</code> otherwise.
   */
  JulianDate.greaterThanOrEquals = function (left, right) {
    return JulianDate.compare(left, right) >= 0;
  };

  /**
   * Duplicates this instance.
   *
   * @param {JulianDate} [result] An existing instance to use for the result.
   * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
   */
  JulianDate.prototype.clone = function (result) {
    return JulianDate.clone(this, result);
  };

  /**
   * Compares this and the provided instance and returns <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {JulianDate} [right] The second instance.
   * @returns {Boolean} <code>true</code> if the dates are equal; otherwise, <code>false</code>.
   */
  JulianDate.prototype.equals = function (right) {
    return JulianDate.equals(this, right);
  };

  /**
   * Compares this and the provided instance and returns <code>true</code> if they are within <code>epsilon</code> seconds of
   * each other.  That is, in order for the dates to be considered equal (and for
   * this function to return <code>true</code>), the absolute value of the difference between them, in
   * seconds, must be less than <code>epsilon</code>.
   *
   * @param {JulianDate} [right] The second instance.
   * @param {Number} [epsilon=0] The maximum number of seconds that should separate the two instances.
   * @returns {Boolean} <code>true</code> if the two dates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
   */
  JulianDate.prototype.equalsEpsilon = function (right, epsilon) {
    return JulianDate.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Creates a string representing this date in ISO8601 format.
   *
   * @returns {String} A string representing this date in ISO8601 format.
   */
  JulianDate.prototype.toString = function () {
    return JulianDate.toIso8601(this);
  };

  /**
   * Gets or sets the list of leap seconds used throughout Cesium.
   * @memberof JulianDate
   * @type {LeapSecond[]}
   */
  JulianDate.leapSeconds = [
    new LeapSecond(new JulianDate(2441317, 43210.0, TimeStandard$1.TAI), 10), // January 1, 1972 00:00:00 UTC
    new LeapSecond(new JulianDate(2441499, 43211.0, TimeStandard$1.TAI), 11), // July 1, 1972 00:00:00 UTC
    new LeapSecond(new JulianDate(2441683, 43212.0, TimeStandard$1.TAI), 12), // January 1, 1973 00:00:00 UTC
    new LeapSecond(new JulianDate(2442048, 43213.0, TimeStandard$1.TAI), 13), // January 1, 1974 00:00:00 UTC
    new LeapSecond(new JulianDate(2442413, 43214.0, TimeStandard$1.TAI), 14), // January 1, 1975 00:00:00 UTC
    new LeapSecond(new JulianDate(2442778, 43215.0, TimeStandard$1.TAI), 15), // January 1, 1976 00:00:00 UTC
    new LeapSecond(new JulianDate(2443144, 43216.0, TimeStandard$1.TAI), 16), // January 1, 1977 00:00:00 UTC
    new LeapSecond(new JulianDate(2443509, 43217.0, TimeStandard$1.TAI), 17), // January 1, 1978 00:00:00 UTC
    new LeapSecond(new JulianDate(2443874, 43218.0, TimeStandard$1.TAI), 18), // January 1, 1979 00:00:00 UTC
    new LeapSecond(new JulianDate(2444239, 43219.0, TimeStandard$1.TAI), 19), // January 1, 1980 00:00:00 UTC
    new LeapSecond(new JulianDate(2444786, 43220.0, TimeStandard$1.TAI), 20), // July 1, 1981 00:00:00 UTC
    new LeapSecond(new JulianDate(2445151, 43221.0, TimeStandard$1.TAI), 21), // July 1, 1982 00:00:00 UTC
    new LeapSecond(new JulianDate(2445516, 43222.0, TimeStandard$1.TAI), 22), // July 1, 1983 00:00:00 UTC
    new LeapSecond(new JulianDate(2446247, 43223.0, TimeStandard$1.TAI), 23), // July 1, 1985 00:00:00 UTC
    new LeapSecond(new JulianDate(2447161, 43224.0, TimeStandard$1.TAI), 24), // January 1, 1988 00:00:00 UTC
    new LeapSecond(new JulianDate(2447892, 43225.0, TimeStandard$1.TAI), 25), // January 1, 1990 00:00:00 UTC
    new LeapSecond(new JulianDate(2448257, 43226.0, TimeStandard$1.TAI), 26), // January 1, 1991 00:00:00 UTC
    new LeapSecond(new JulianDate(2448804, 43227.0, TimeStandard$1.TAI), 27), // July 1, 1992 00:00:00 UTC
    new LeapSecond(new JulianDate(2449169, 43228.0, TimeStandard$1.TAI), 28), // July 1, 1993 00:00:00 UTC
    new LeapSecond(new JulianDate(2449534, 43229.0, TimeStandard$1.TAI), 29), // July 1, 1994 00:00:00 UTC
    new LeapSecond(new JulianDate(2450083, 43230.0, TimeStandard$1.TAI), 30), // January 1, 1996 00:00:00 UTC
    new LeapSecond(new JulianDate(2450630, 43231.0, TimeStandard$1.TAI), 31), // July 1, 1997 00:00:00 UTC
    new LeapSecond(new JulianDate(2451179, 43232.0, TimeStandard$1.TAI), 32), // January 1, 1999 00:00:00 UTC
    new LeapSecond(new JulianDate(2453736, 43233.0, TimeStandard$1.TAI), 33), // January 1, 2006 00:00:00 UTC
    new LeapSecond(new JulianDate(2454832, 43234.0, TimeStandard$1.TAI), 34), // January 1, 2009 00:00:00 UTC
    new LeapSecond(new JulianDate(2456109, 43235.0, TimeStandard$1.TAI), 35), // July 1, 2012 00:00:00 UTC
    new LeapSecond(new JulianDate(2457204, 43236.0, TimeStandard$1.TAI), 36), // July 1, 2015 00:00:00 UTC
    new LeapSecond(new JulianDate(2457754, 43237.0, TimeStandard$1.TAI), 37), // January 1, 2017 00:00:00 UTC
  ];

  /**
   * @license
   *
   * Grauw URI utilities
   *
   * See: http://hg.grauw.nl/grauw-lib/file/tip/src/uri.js
   *
   * @author Laurens Holst (http://www.grauw.nl/)
   *
   *   Copyright 2012 Laurens Holst
   *
   *   Licensed under the Apache License, Version 2.0 (the "License");
   *   you may not use this file except in compliance with the License.
   *   You may obtain a copy of the License at
   *
   *       http://www.apache.org/licenses/LICENSE-2.0
   *
   *   Unless required by applicable law or agreed to in writing, software
   *   distributed under the License is distributed on an "AS IS" BASIS,
   *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   *   See the License for the specific language governing permissions and
   *   limitations under the License.
   *
   */

  	/**
  	 * Constructs a URI object.
  	 * @constructor
  	 * @class Implementation of URI parsing and base URI resolving algorithm in RFC 3986.
  	 * @param {string|URI} uri A string or URI object to create the object from.
  	 */
  	function URI(uri) {
  		if (uri instanceof URI) {  // copy constructor
  			this.scheme = uri.scheme;
  			this.authority = uri.authority;
  			this.path = uri.path;
  			this.query = uri.query;
  			this.fragment = uri.fragment;
  		} else if (uri) {  // uri is URI string or cast to string
  			var c = parseRegex.exec(uri);
  			this.scheme = c[1];
  			this.authority = c[2];
  			this.path = c[3];
  			this.query = c[4];
  			this.fragment = c[5];
  		}
  	}
  	// Initial values on the prototype
  	URI.prototype.scheme    = null;
  	URI.prototype.authority = null;
  	URI.prototype.path      = '';
  	URI.prototype.query     = null;
  	URI.prototype.fragment  = null;

  	// Regular expression from RFC 3986 appendix B
  	var parseRegex = new RegExp('^(?:([^:/?#]+):)?(?://([^/?#]*))?([^?#]*)(?:\\?([^#]*))?(?:#(.*))?$');

  	/**
  	 * Returns the scheme part of the URI.
  	 * In "http://example.com:80/a/b?x#y" this is "http".
  	 */
  	URI.prototype.getScheme = function() {
  		return this.scheme;
  	};

  	/**
  	 * Returns the authority part of the URI.
  	 * In "http://example.com:80/a/b?x#y" this is "example.com:80".
  	 */
  	URI.prototype.getAuthority = function() {
  		return this.authority;
  	};

  	/**
  	 * Returns the path part of the URI.
  	 * In "http://example.com:80/a/b?x#y" this is "/a/b".
  	 * In "mailto:mike@example.com" this is "mike@example.com".
  	 */
  	URI.prototype.getPath = function() {
  		return this.path;
  	};

  	/**
  	 * Returns the query part of the URI.
  	 * In "http://example.com:80/a/b?x#y" this is "x".
  	 */
  	URI.prototype.getQuery = function() {
  		return this.query;
  	};

  	/**
  	 * Returns the fragment part of the URI.
  	 * In "http://example.com:80/a/b?x#y" this is "y".
  	 */
  	URI.prototype.getFragment = function() {
  		return this.fragment;
  	};

  	/**
  	 * Tests whether the URI is an absolute URI.
  	 * See RFC 3986 section 4.3.
  	 */
  	URI.prototype.isAbsolute = function() {
  		return !!this.scheme && !this.fragment;
  	};

  	///**
  	//* Extensive validation of the URI against the ABNF in RFC 3986
  	//*/
  	//URI.prototype.validate

  	/**
  	 * Tests whether the URI is a same-document reference.
  	 * See RFC 3986 section 4.4.
  	 *
  	 * To perform more thorough comparison, you can normalise the URI objects.
  	 */
  	URI.prototype.isSameDocumentAs = function(uri) {
  		return uri.scheme == this.scheme &&
  		    uri.authority == this.authority &&
  		         uri.path == this.path &&
  		        uri.query == this.query;
  	};

  	/**
  	 * Simple String Comparison of two URIs.
  	 * See RFC 3986 section 6.2.1.
  	 *
  	 * To perform more thorough comparison, you can normalise the URI objects.
  	 */
  	URI.prototype.equals = function(uri) {
  		return this.isSameDocumentAs(uri) && uri.fragment == this.fragment;
  	};

  	/**
  	 * Normalizes the URI using syntax-based normalization.
  	 * This includes case normalization, percent-encoding normalization and path segment normalization.
  	 * XXX: Percent-encoding normalization does not escape characters that need to be escaped.
  	 *      (Although that would not be a valid URI in the first place. See validate().)
  	 * See RFC 3986 section 6.2.2.
  	 */
  	URI.prototype.normalize = function() {
  		this.removeDotSegments();
  		if (this.scheme)
  			this.scheme = this.scheme.toLowerCase();
  		if (this.authority)
  			this.authority = this.authority.replace(authorityRegex, replaceAuthority).
  									replace(caseRegex, replaceCase);
  		if (this.path)
  			this.path = this.path.replace(caseRegex, replaceCase);
  		if (this.query)
  			this.query = this.query.replace(caseRegex, replaceCase);
  		if (this.fragment)
  			this.fragment = this.fragment.replace(caseRegex, replaceCase);
  	};

  	var caseRegex = /%[0-9a-z]{2}/gi;
  	var percentRegex = /[a-zA-Z0-9\-\._~]/;
  	var authorityRegex = /(.*@)?([^@:]*)(:.*)?/;

  	function replaceCase(str) {
  		var dec = unescape(str);
  		return percentRegex.test(dec) ? dec : str.toUpperCase();
  	}

  	function replaceAuthority(str, p1, p2, p3) {
  		return (p1 || '') + p2.toLowerCase() + (p3 || '');
  	}

  	/**
  	 * Resolve a relative URI (this) against a base URI.
  	 * The base URI must be an absolute URI.
  	 * See RFC 3986 section 5.2
  	 */
  	URI.prototype.resolve = function(baseURI) {
  		var uri = new URI();
  		if (this.scheme) {
  			uri.scheme = this.scheme;
  			uri.authority = this.authority;
  			uri.path = this.path;
  			uri.query = this.query;
  		} else {
  			uri.scheme = baseURI.scheme;
  			if (this.authority) {
  				uri.authority = this.authority;
  				uri.path = this.path;
  				uri.query = this.query;
  			} else {
  				uri.authority = baseURI.authority;
  				if (this.path == '') {
  					uri.path = baseURI.path;
  					uri.query = this.query || baseURI.query;
  				} else {
  					if (this.path.charAt(0) == '/') {
  						uri.path = this.path;
  						uri.removeDotSegments();
  					} else {
  						if (baseURI.authority && baseURI.path == '') {
  							uri.path = '/' + this.path;
  						} else {
  							uri.path = baseURI.path.substring(0, baseURI.path.lastIndexOf('/') + 1) + this.path;
  						}
  						uri.removeDotSegments();
  					}
  					uri.query = this.query;
  				}
  			}
  		}
  		uri.fragment = this.fragment;
  		return uri;
  	};

  	/**
  	 * Remove dot segments from path.
  	 * See RFC 3986 section 5.2.4
  	 * @private
  	 */
  	URI.prototype.removeDotSegments = function() {
  		var input = this.path.split('/'),
  			output = [],
  			segment,
  			absPath = input[0] == '';
  		if (absPath)
  			input.shift();
  		input[0] == '' ? input.shift() : null;
  		while (input.length) {
  			segment = input.shift();
  			if (segment == '..') {
  				output.pop();
  			} else if (segment != '.') {
  				output.push(segment);
  			}
  		}
  		if (segment == '.' || segment == '..')
  			output.push('');
  		if (absPath)
  			output.unshift('');
  		this.path = output.join('/');
  	};

  	// We don't like this function because it builds up a cache that is never cleared.
  //	/**
  //	 * Resolves a relative URI against an absolute base URI.
  //	 * Convenience method.
  //	 * @param {String} uri the relative URI to resolve
  //	 * @param {String} baseURI the base URI (must be absolute) to resolve against
  //	 */
  //	URI.resolve = function(sURI, sBaseURI) {
  //		var uri = cache[sURI] || (cache[sURI] = new URI(sURI));
  //		var baseURI = cache[sBaseURI] || (cache[sBaseURI] = new URI(sBaseURI));
  //		return uri.resolve(baseURI).toString();
  //	};

  //	var cache = {};

  	/**
  	 * Serialises the URI to a string.
  	 */
  	URI.prototype.toString = function() {
  		var result = '';
  		if (this.scheme)
  			result += this.scheme + ':';
  		if (this.authority)
  			result += '//' + this.authority;
  		result += this.path;
  		if (this.query)
  			result += '?' + this.query;
  		if (this.fragment)
  			result += '#' + this.fragment;
  		return result;
  	};

  /**
   * @private
   */
  function appendForwardSlash(url) {
    if (url.length === 0 || url[url.length - 1] !== "/") {
      url = url + "/";
    }
    return url;
  }

  /**
   * Clones an object, returning a new object containing the same properties.
   *
   * @function
   *
   * @param {Object} object The object to clone.
   * @param {Boolean} [deep=false] If true, all properties will be deep cloned recursively.
   * @returns {Object} The cloned object.
   */
  function clone(object, deep) {
    if (object === null || typeof object !== "object") {
      return object;
    }

    deep = when.defaultValue(deep, false);

    var result = new object.constructor();
    for (var propertyName in object) {
      if (object.hasOwnProperty(propertyName)) {
        var value = object[propertyName];
        if (deep) {
          value = clone(value, deep);
        }
        result[propertyName] = value;
      }
    }

    return result;
  }

  /**
   * Merges two objects, copying their properties onto a new combined object. When two objects have the same
   * property, the value of the property on the first object is used.  If either object is undefined,
   * it will be treated as an empty object.
   *
   * @example
   * var object1 = {
   *     propOne : 1,
   *     propTwo : {
   *         value1 : 10
   *     }
   * }
   * var object2 = {
   *     propTwo : 2
   * }
   * var final = Cesium.combine(object1, object2);
   *
   * // final === {
   * //     propOne : 1,
   * //     propTwo : {
   * //         value1 : 10
   * //     }
   * // }
   *
   * @param {Object} [object1] The first object to merge.
   * @param {Object} [object2] The second object to merge.
   * @param {Boolean} [deep=false] Perform a recursive merge.
   * @returns {Object} The combined object containing all properties from both objects.
   *
   * @function
   */
  function combine(object1, object2, deep) {
    deep = when.defaultValue(deep, false);

    var result = {};

    var object1Defined = when.defined(object1);
    var object2Defined = when.defined(object2);
    var property;
    var object1Value;
    var object2Value;
    if (object1Defined) {
      for (property in object1) {
        if (object1.hasOwnProperty(property)) {
          object1Value = object1[property];
          if (
            object2Defined &&
            deep &&
            typeof object1Value === "object" &&
            object2.hasOwnProperty(property)
          ) {
            object2Value = object2[property];
            if (typeof object2Value === "object") {
              result[property] = combine(object1Value, object2Value, deep);
            } else {
              result[property] = object1Value;
            }
          } else {
            result[property] = object1Value;
          }
        }
      }
    }
    if (object2Defined) {
      for (property in object2) {
        if (
          object2.hasOwnProperty(property) &&
          !result.hasOwnProperty(property)
        ) {
          object2Value = object2[property];
          result[property] = object2Value;
        }
      }
    }
    return result;
  }

  /**
   * Given a relative Uri and a base Uri, returns the absolute Uri of the relative Uri.
   * @function
   *
   * @param {String} relative The relative Uri.
   * @param {String} [base] The base Uri.
   * @returns {String} The absolute Uri of the given relative Uri.
   *
   * @example
   * //absolute Uri will be "https://test.com/awesome.png";
   * var absoluteUri = Cesium.getAbsoluteUri('awesome.png', 'https://test.com');
   */
  function getAbsoluteUri(relative, base) {
    var documentObject;
    if (typeof document !== "undefined") {
      documentObject = document;
    }

    return getAbsoluteUri._implementation(relative, base, documentObject);
  }

  getAbsoluteUri._implementation = function (relative, base, documentObject) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(relative)) {
      throw new Check.DeveloperError("relative uri is required.");
    }
    //>>includeEnd('debug');

    if (!when.defined(base)) {
      if (typeof documentObject === "undefined") {
        return relative;
      }
      base = when.defaultValue(documentObject.baseURI, documentObject.location.href);
    }

    var baseUri = new URI(base);
    var relativeUri = new URI(relative);
    return relativeUri.resolve(baseUri).toString();
  };

  /**
   * Given a URI, returns the base path of the URI.
   * @function
   *
   * @param {String} uri The Uri.
   * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
   * @returns {String} The base path of the Uri.
   *
   * @example
   * // basePath will be "/Gallery/";
   * var basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false');
   *
   * // basePath will be "/Gallery/?value=true&example=false";
   * var basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false', true);
   */
  function getBaseUri(uri, includeQuery) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(uri)) {
      throw new Check.DeveloperError("uri is required.");
    }
    //>>includeEnd('debug');

    var basePath = "";
    var i = uri.lastIndexOf("/");
    if (i !== -1) {
      basePath = uri.substring(0, i + 1);
    }

    if (!includeQuery) {
      return basePath;
    }

    uri = new URI(uri);
    if (when.defined(uri.query)) {
      basePath += "?" + uri.query;
    }
    if (when.defined(uri.fragment)) {
      basePath += "#" + uri.fragment;
    }

    return basePath;
  }

  /**
   * Given a URI, returns the extension of the URI.
   * @function getExtensionFromUri
   *
   * @param {String} uri The Uri.
   * @returns {String} The extension of the Uri.
   *
   * @example
   * //extension will be "czml";
   * var extension = Cesium.getExtensionFromUri('/Gallery/simple.czml?value=true&example=false');
   */
  function getExtensionFromUri(uri) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(uri)) {
      throw new Check.DeveloperError("uri is required.");
    }
    //>>includeEnd('debug');

    var uriObject = new URI(uri);
    uriObject.normalize();
    var path = uriObject.path;
    var index = path.lastIndexOf("/");
    if (index !== -1) {
      path = path.substr(index + 1);
    }
    index = path.lastIndexOf(".");
    if (index === -1) {
      path = "";
    } else {
      path = path.substr(index + 1);
    }
    return path;
  }

  var blobUriRegex = /^blob:/i;

  /**
   * Determines if the specified uri is a blob uri.
   *
   * @function isBlobUri
   *
   * @param {String} uri The uri to test.
   * @returns {Boolean} true when the uri is a blob uri; otherwise, false.
   *
   * @private
   */
  function isBlobUri(uri) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.string("uri", uri);
    //>>includeEnd('debug');

    return blobUriRegex.test(uri);
  }

  var a$1;

  /**
   * Given a URL, determine whether that URL is considered cross-origin to the current page.
   *
   * @private
   */
  function isCrossOriginUrl(url) {
    if (!when.defined(a$1)) {
      a$1 = document.createElement("a");
    }

    // copy window location into the anchor to get consistent results
    // when the port is default for the protocol (e.g. 80 for HTTP)
    a$1.href = window.location.href;

    // host includes both hostname and port if the port is not standard
    var host = a$1.host;
    var protocol = a$1.protocol;

    a$1.href = url;
    // IE only absolutizes href on get, not set
    // eslint-disable-next-line no-self-assign
    a$1.href = a$1.href;

    return protocol !== a$1.protocol || host !== a$1.host;
  }

  var dataUriRegex$1 = /^data:/i;

  /**
   * Determines if the specified uri is a data uri.
   *
   * @function isDataUri
   *
   * @param {String} uri The uri to test.
   * @returns {Boolean} true when the uri is a data uri; otherwise, false.
   *
   * @private
   */
  function isDataUri(uri) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.string("uri", uri);
    //>>includeEnd('debug');

    return dataUriRegex$1.test(uri);
  }

  /**
   * @private
   */
  function loadAndExecuteScript(url) {
    var deferred = when.when.defer();
    var script = document.createElement("script");
    script.async = true;
    script.src = url;

    var head = document.getElementsByTagName("head")[0];
    script.onload = function () {
      script.onload = undefined;
      head.removeChild(script);
      deferred.resolve();
    };
    script.onerror = function (e) {
      deferred.reject(e);
    };

    head.appendChild(script);

    return deferred.promise;
  }

  /**
   * Converts an object representing a set of name/value pairs into a query string,
   * with names and values encoded properly for use in a URL.  Values that are arrays
   * will produce multiple values with the same name.
   * @function objectToQuery
   *
   * @param {Object} obj The object containing data to encode.
   * @returns {String} An encoded query string.
   *
   *
   * @example
   * var str = Cesium.objectToQuery({
   *     key1 : 'some value',
   *     key2 : 'a/b',
   *     key3 : ['x', 'y']
   * });
   *
   * @see queryToObject
   * // str will be:
   * // 'key1=some%20value&key2=a%2Fb&key3=x&key3=y'
   */
  function objectToQuery(obj) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(obj)) {
      throw new Check.DeveloperError("obj is required.");
    }
    //>>includeEnd('debug');

    var result = "";
    for (var propName in obj) {
      if (obj.hasOwnProperty(propName)) {
        var value = obj[propName];

        var part = encodeURIComponent(propName) + "=";
        if (Array.isArray(value)) {
          for (var i = 0, len = value.length; i < len; ++i) {
            result += part + encodeURIComponent(value[i]) + "&";
          }
        } else {
          result += part + encodeURIComponent(value) + "&";
        }
      }
    }

    // trim last &
    result = result.slice(0, -1);

    // This function used to replace %20 with + which is more compact and readable.
    // However, some servers didn't properly handle + as a space.
    // https://github.com/CesiumGS/cesium/issues/2192

    return result;
  }

  /**
   * Parses a query string into an object, where the keys and values of the object are the
   * name/value pairs from the query string, decoded. If a name appears multiple times,
   * the value in the object will be an array of values.
   * @function queryToObject
   *
   * @param {String} queryString The query string.
   * @returns {Object} An object containing the parameters parsed from the query string.
   *
   *
   * @example
   * var obj = Cesium.queryToObject('key1=some%20value&key2=a%2Fb&key3=x&key3=y');
   * // obj will be:
   * // {
   * //   key1 : 'some value',
   * //   key2 : 'a/b',
   * //   key3 : ['x', 'y']
   * // }
   *
   * @see objectToQuery
   */
  function queryToObject(queryString) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(queryString)) {
      throw new Check.DeveloperError("queryString is required.");
    }
    //>>includeEnd('debug');

    var result = {};
    if (queryString === "") {
      return result;
    }
    var parts = queryString.replace(/\+/g, "%20").split(/[&;]/);
    for (var i = 0, len = parts.length; i < len; ++i) {
      var subparts = parts[i].split("=");

      var name = decodeURIComponent(subparts[0]);
      var value = subparts[1];
      if (when.defined(value)) {
        value = decodeURIComponent(value);
      } else {
        value = "";
      }

      var resultValue = result[name];
      if (typeof resultValue === "string") {
        // expand the single value to an array
        result[name] = [resultValue, value];
      } else if (Array.isArray(resultValue)) {
        resultValue.push(value);
      } else {
        result[name] = value;
      }
    }
    return result;
  }

  /**
   * State of the request.
   *
   * @enum {Number}
   */
  var RequestState = {
    /**
     * Initial unissued state.
     *
     * @type Number
     * @constant
     */
    UNISSUED: 0,

    /**
     * Issued but not yet active. Will become active when open slots are available.
     *
     * @type Number
     * @constant
     */
    ISSUED: 1,

    /**
     * Actual http request has been sent.
     *
     * @type Number
     * @constant
     */
    ACTIVE: 2,

    /**
     * Request completed successfully.
     *
     * @type Number
     * @constant
     */
    RECEIVED: 3,

    /**
     * Request was cancelled, either explicitly or automatically because of low priority.
     *
     * @type Number
     * @constant
     */
    CANCELLED: 4,

    /**
     * Request failed.
     *
     * @type Number
     * @constant
     */
    FAILED: 5,
  };
  var RequestState$1 = Object.freeze(RequestState);

  /**
   * An enum identifying the type of request. Used for finer grained logging and priority sorting.
   *
   * @enum {Number}
   */
  var RequestType = {
    /**
     * Terrain request.
     *
     * @type Number
     * @constant
     */
    TERRAIN: 0,

    /**
     * Imagery request.
     *
     * @type Number
     * @constant
     */
    IMAGERY: 1,

    /**
     * 3D Tiles request.
     *
     * @type Number
     * @constant
     */
    TILES3D: 2,

    /**
     * Other request.
     *
     * @type Number
     * @constant
     */
    OTHER: 3,
  };
  var RequestType$1 = Object.freeze(RequestType);

  /**
   * Stores information for making a request. In general this does not need to be constructed directly.
   *
   * @alias Request
   * @constructor

   * @param {Object} [options] An object with the following properties:
   * @param {String} [options.url] The url to request.
   * @param {Request.RequestCallback} [options.requestFunction] The function that makes the actual data request.
   * @param {Request.CancelCallback} [options.cancelFunction] The function that is called when the request is cancelled.
   * @param {Request.PriorityCallback} [options.priorityFunction] The function that is called to update the request's priority, which occurs once per frame.
   * @param {Number} [options.priority=0.0] The initial priority of the request.
   * @param {Boolean} [options.throttle=false] Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the request will be throttled and sent based on priority.
   * @param {Boolean} [options.throttleByServer=false] Whether to throttle the request by server.
   * @param {RequestType} [options.type=RequestType.OTHER] The type of request.
   */
  function Request(options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);

    var throttleByServer = when.defaultValue(options.throttleByServer, false);
    var throttle = when.defaultValue(options.throttle, false);

    /**
     * The URL to request.
     *
     * @type {String}
     */
    this.url = options.url;

    /**
     * The function that makes the actual data request.
     *
     * @type {Request.RequestCallback}
     */
    this.requestFunction = options.requestFunction;

    /**
     * The function that is called when the request is cancelled.
     *
     * @type {Request.CancelCallback}
     */
    this.cancelFunction = options.cancelFunction;

    /**
     * The function that is called to update the request's priority, which occurs once per frame.
     *
     * @type {Request.PriorityCallback}
     */
    this.priorityFunction = options.priorityFunction;

    /**
     * Priority is a unit-less value where lower values represent higher priority.
     * For world-based objects, this is usually the distance from the camera.
     * A request that does not have a priority function defaults to a priority of 0.
     *
     * If priorityFunction is defined, this value is updated every frame with the result of that call.
     *
     * @type {Number}
     * @default 0.0
     */
    this.priority = when.defaultValue(options.priority, 0.0);

    /**
     * Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the
     * request will be throttled and sent based on priority.
     *
     * @type {Boolean}
     * @readonly
     *
     * @default false
     */
    this.throttle = throttle;

    /**
     * Whether to throttle the request by server. Browsers typically support about 6-8 parallel connections
     * for HTTP/1 servers, and an unlimited amount of connections for HTTP/2 servers. Setting this value
     * to <code>true</code> is preferable for requests going through HTTP/1 servers.
     *
     * @type {Boolean}
     * @readonly
     *
     * @default false
     */
    this.throttleByServer = throttleByServer;

    /**
     * Type of request.
     *
     * @type {RequestType}
     * @readonly
     *
     * @default RequestType.OTHER
     */
    this.type = when.defaultValue(options.type, RequestType$1.OTHER);

    /**
     * A key used to identify the server that a request is going to. It is derived from the url's authority and scheme.
     *
     * @type {String}
     *
     * @private
     */
    this.serverKey = undefined;

    /**
     * The current state of the request.
     *
     * @type {RequestState}
     * @readonly
     */
    this.state = RequestState$1.UNISSUED;

    /**
     * The requests's deferred promise.
     *
     * @type {Object}
     *
     * @private
     */
    this.deferred = undefined;

    /**
     * Whether the request was explicitly cancelled.
     *
     * @type {Boolean}
     *
     * @private
     */
    this.cancelled = false;
  }

  /**
   * Mark the request as cancelled.
   *
   * @private
   */
  Request.prototype.cancel = function () {
    this.cancelled = true;
  };

  /**
   * Duplicates a Request instance.
   *
   * @param {Request} [result] The object onto which to store the result.
   *
   * @returns {Request} The modified result parameter or a new Resource instance if one was not provided.
   */
  Request.prototype.clone = function (result) {
    if (!when.defined(result)) {
      return new Request(this);
    }

    result.url = this.url;
    result.requestFunction = this.requestFunction;
    result.cancelFunction = this.cancelFunction;
    result.priorityFunction = this.priorityFunction;
    result.priority = this.priority;
    result.throttle = this.throttle;
    result.throttleByServer = this.throttleByServer;
    result.type = this.type;
    result.serverKey = this.serverKey;

    // These get defaulted because the cloned request hasn't been issued
    result.state = this.RequestState.UNISSUED;
    result.deferred = undefined;
    result.cancelled = false;

    return result;
  };

  /**
   * Parses the result of XMLHttpRequest's getAllResponseHeaders() method into
   * a dictionary.
   *
   * @function parseResponseHeaders
   *
   * @param {String} headerString The header string returned by getAllResponseHeaders().  The format is
   *                 described here: http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders()-method
   * @returns {Object} A dictionary of key/value pairs, where each key is the name of a header and the corresponding value
   *                   is that header's value.
   *
   * @private
   */
  function parseResponseHeaders(headerString) {
    var headers = {};

    if (!headerString) {
      return headers;
    }

    var headerPairs = headerString.split("\u000d\u000a");

    for (var i = 0; i < headerPairs.length; ++i) {
      var headerPair = headerPairs[i];
      // Can't use split() here because it does the wrong thing
      // if the header value has the string ": " in it.
      var index = headerPair.indexOf("\u003a\u0020");
      if (index > 0) {
        var key = headerPair.substring(0, index);
        var val = headerPair.substring(index + 2);
        headers[key] = val;
      }
    }

    return headers;
  }

  /**
   * An event that is raised when a request encounters an error.
   *
   * @constructor
   * @alias RequestErrorEvent
   *
   * @param {Number} [statusCode] The HTTP error status code, such as 404.
   * @param {Object} [response] The response included along with the error.
   * @param {String|Object} [responseHeaders] The response headers, represented either as an object literal or as a
   *                        string in the format returned by XMLHttpRequest's getAllResponseHeaders() function.
   */
  function RequestErrorEvent(statusCode, response, responseHeaders) {
    /**
     * The HTTP error status code, such as 404.  If the error does not have a particular
     * HTTP code, this property will be undefined.
     *
     * @type {Number}
     */
    this.statusCode = statusCode;

    /**
     * The response included along with the error.  If the error does not include a response,
     * this property will be undefined.
     *
     * @type {Object}
     */
    this.response = response;

    /**
     * The headers included in the response, represented as an object literal of key/value pairs.
     * If the error does not include any headers, this property will be undefined.
     *
     * @type {Object}
     */
    this.responseHeaders = responseHeaders;

    if (typeof this.responseHeaders === "string") {
      this.responseHeaders = parseResponseHeaders(this.responseHeaders);
    }
  }

  /**
   * Creates a string representing this RequestErrorEvent.
   * @memberof RequestErrorEvent
   *
   * @returns {String} A string representing the provided RequestErrorEvent.
   */
  RequestErrorEvent.prototype.toString = function () {
    var str = "Request has failed.";
    if (when.defined(this.statusCode)) {
      str += " Status Code: " + this.statusCode;
    }
    return str;
  };

  /**
   * A generic utility class for managing subscribers for a particular event.
   * This class is usually instantiated inside of a container class and
   * exposed as a property for others to subscribe to.
   *
   * @alias Event
   * @constructor
   * @example
   * MyObject.prototype.myListener = function(arg1, arg2) {
   *     this.myArg1Copy = arg1;
   *     this.myArg2Copy = arg2;
   * }
   *
   * var myObjectInstance = new MyObject();
   * var evt = new Cesium.Event();
   * evt.addEventListener(MyObject.prototype.myListener, myObjectInstance);
   * evt.raiseEvent('1', '2');
   * evt.removeEventListener(MyObject.prototype.myListener);
   */
  function Event() {
    this._listeners = [];
    this._scopes = [];
    this._toRemove = [];
    this._insideRaiseEvent = false;
  }

  Object.defineProperties(Event.prototype, {
    /**
     * The number of listeners currently subscribed to the event.
     * @memberof Event.prototype
     * @type {Number}
     * @readonly
     */
    numberOfListeners: {
      get: function () {
        return this._listeners.length - this._toRemove.length;
      },
    },
  });

  /**
   * Registers a callback function to be executed whenever the event is raised.
   * An optional scope can be provided to serve as the <code>this</code> pointer
   * in which the function will execute.
   *
   * @param {Function} listener The function to be executed when the event is raised.
   * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
   *        pointer in which the listener function will execute.
   * @returns {Event.RemoveCallback} A function that will remove this event listener when invoked.
   *
   * @see Event#raiseEvent
   * @see Event#removeEventListener
   */
  Event.prototype.addEventListener = function (listener, scope) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.func("listener", listener);
    //>>includeEnd('debug');

    this._listeners.push(listener);
    this._scopes.push(scope);

    var event = this;
    return function () {
      event.removeEventListener(listener, scope);
    };
  };

  /**
   * Unregisters a previously registered callback.
   *
   * @param {Function} listener The function to be unregistered.
   * @param {Object} [scope] The scope that was originally passed to addEventListener.
   * @returns {Boolean} <code>true</code> if the listener was removed; <code>false</code> if the listener and scope are not registered with the event.
   *
   * @see Event#addEventListener
   * @see Event#raiseEvent
   */
  Event.prototype.removeEventListener = function (listener, scope) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.func("listener", listener);
    //>>includeEnd('debug');

    var listeners = this._listeners;
    var scopes = this._scopes;

    var index = -1;
    for (var i = 0; i < listeners.length; i++) {
      if (listeners[i] === listener && scopes[i] === scope) {
        index = i;
        break;
      }
    }

    if (index !== -1) {
      if (this._insideRaiseEvent) {
        //In order to allow removing an event subscription from within
        //a callback, we don't actually remove the items here.  Instead
        //remember the index they are at and undefined their value.
        this._toRemove.push(index);
        listeners[index] = undefined;
        scopes[index] = undefined;
      } else {
        listeners.splice(index, 1);
        scopes.splice(index, 1);
      }
      return true;
    }

    return false;
  };

  function compareNumber(a, b) {
    return b - a;
  }

  /**
   * Raises the event by calling each registered listener with all supplied arguments.
   *
   * @param {...Object} arguments This method takes any number of parameters and passes them through to the listener functions.
   *
   * @see Event#addEventListener
   * @see Event#removeEventListener
   */
  Event.prototype.raiseEvent = function () {
    this._insideRaiseEvent = true;

    var i;
    var listeners = this._listeners;
    var scopes = this._scopes;
    var length = listeners.length;

    for (i = 0; i < length; i++) {
      var listener = listeners[i];
      if (when.defined(listener)) {
        listeners[i].apply(scopes[i], arguments);
      }
    }

    //Actually remove items removed in removeEventListener.
    var toRemove = this._toRemove;
    length = toRemove.length;
    if (length > 0) {
      toRemove.sort(compareNumber);
      for (i = 0; i < length; i++) {
        var index = toRemove[i];
        listeners.splice(index, 1);
        scopes.splice(index, 1);
      }
      toRemove.length = 0;
    }

    this._insideRaiseEvent = false;
  };

  /**
   * Array implementation of a heap.
   *
   * @alias Heap
   * @constructor
   * @private
   *
   * @param {Object} options Object with the following properties:
   * @param {Heap.ComparatorCallback} options.comparator The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
   */
  function Heap(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("options", options);
    Check.Check.defined("options.comparator", options.comparator);
    //>>includeEnd('debug');

    this._comparator = options.comparator;
    this._array = [];
    this._length = 0;
    this._maximumLength = undefined;
  }

  Object.defineProperties(Heap.prototype, {
    /**
     * Gets the length of the heap.
     *
     * @memberof Heap.prototype
     *
     * @type {Number}
     * @readonly
     */
    length: {
      get: function () {
        return this._length;
      },
    },

    /**
     * Gets the internal array.
     *
     * @memberof Heap.prototype
     *
     * @type {Array}
     * @readonly
     */
    internalArray: {
      get: function () {
        return this._array;
      },
    },

    /**
     * Gets and sets the maximum length of the heap.
     *
     * @memberof Heap.prototype
     *
     * @type {Number}
     */
    maximumLength: {
      get: function () {
        return this._maximumLength;
      },
      set: function (value) {
        //>>includeStart('debug', pragmas.debug);
        Check.Check.typeOf.number.greaterThanOrEquals("maximumLength", value, 0);
        //>>includeEnd('debug');
        var originalLength = this._length;
        if (value < originalLength) {
          var array = this._array;
          // Remove trailing references
          for (var i = value; i < originalLength; ++i) {
            array[i] = undefined;
          }
          this._length = value;
          array.length = value;
        }
        this._maximumLength = value;
      },
    },

    /**
     * The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
     *
     * @memberof Heap.prototype
     *
     * @type {Heap.ComparatorCallback}
     */
    comparator: {
      get: function () {
        return this._comparator;
      },
    },
  });

  function swap(array, a, b) {
    var temp = array[a];
    array[a] = array[b];
    array[b] = temp;
  }

  /**
   * Resizes the internal array of the heap.
   *
   * @param {Number} [length] The length to resize internal array to. Defaults to the current length of the heap.
   */
  Heap.prototype.reserve = function (length) {
    length = when.defaultValue(length, this._length);
    this._array.length = length;
  };

  /**
   * Update the heap so that index and all descendants satisfy the heap property.
   *
   * @param {Number} [index=0] The starting index to heapify from.
   */
  Heap.prototype.heapify = function (index) {
    index = when.defaultValue(index, 0);
    var length = this._length;
    var comparator = this._comparator;
    var array = this._array;
    var candidate = -1;
    var inserting = true;

    while (inserting) {
      var right = 2 * (index + 1);
      var left = right - 1;

      if (left < length && comparator(array[left], array[index]) < 0) {
        candidate = left;
      } else {
        candidate = index;
      }

      if (right < length && comparator(array[right], array[candidate]) < 0) {
        candidate = right;
      }
      if (candidate !== index) {
        swap(array, candidate, index);
        index = candidate;
      } else {
        inserting = false;
      }
    }
  };

  /**
   * Resort the heap.
   */
  Heap.prototype.resort = function () {
    var length = this._length;
    for (var i = Math.ceil(length / 2); i >= 0; --i) {
      this.heapify(i);
    }
  };

  /**
   * Insert an element into the heap. If the length would grow greater than maximumLength
   * of the heap, extra elements are removed.
   *
   * @param {*} element The element to insert
   *
   * @return {*} The element that was removed from the heap if the heap is at full capacity.
   */
  Heap.prototype.insert = function (element) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("element", element);
    //>>includeEnd('debug');

    var array = this._array;
    var comparator = this._comparator;
    var maximumLength = this._maximumLength;

    var index = this._length++;
    if (index < array.length) {
      array[index] = element;
    } else {
      array.push(element);
    }

    while (index !== 0) {
      var parent = Math.floor((index - 1) / 2);
      if (comparator(array[index], array[parent]) < 0) {
        swap(array, index, parent);
        index = parent;
      } else {
        break;
      }
    }

    var removedElement;

    if (when.defined(maximumLength) && this._length > maximumLength) {
      removedElement = array[maximumLength];
      this._length = maximumLength;
    }

    return removedElement;
  };

  /**
   * Remove the element specified by index from the heap and return it.
   *
   * @param {Number} [index=0] The index to remove.
   * @returns {*} The specified element of the heap.
   */
  Heap.prototype.pop = function (index) {
    index = when.defaultValue(index, 0);
    if (this._length === 0) {
      return undefined;
    }
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.lessThan("index", index, this._length);
    //>>includeEnd('debug');

    var array = this._array;
    var root = array[index];
    swap(array, index, --this._length);
    this.heapify(index);
    array[this._length] = undefined; // Remove trailing reference
    return root;
  };

  function sortRequests(a, b) {
    return a.priority - b.priority;
  }

  var statistics = {
    numberOfAttemptedRequests: 0,
    numberOfActiveRequests: 0,
    numberOfCancelledRequests: 0,
    numberOfCancelledActiveRequests: 0,
    numberOfFailedRequests: 0,
    numberOfActiveRequestsEver: 0,
    lastNumberOfActiveRequests: 0,
  };

  var priorityHeapLength = 20;
  var requestHeap = new Heap({
    comparator: sortRequests,
  });
  requestHeap.maximumLength = priorityHeapLength;
  requestHeap.reserve(priorityHeapLength);

  var activeRequests = [];
  var numberOfActiveRequestsByServer = {};

  var pageUri =
    typeof document !== "undefined" ? new URI(document.location.href) : new URI();

  var requestCompletedEvent = new Event();

  /**
   * The request scheduler is used to track and constrain the number of active requests in order to prioritize incoming requests. The ability
   * to retain control over the number of requests in CesiumJS is important because due to events such as changes in the camera position,
   * a lot of new requests may be generated and a lot of in-flight requests may become redundant. The request scheduler manually constrains the
   * number of requests so that newer requests wait in a shorter queue and don't have to compete for bandwidth with requests that have expired.
   *
   * @namespace RequestScheduler
   *
   */
  function RequestScheduler() {}

  /**
   * The maximum number of simultaneous active requests. Un-throttled requests do not observe this limit.
   * @type {Number}
   * @default 50
   */
  RequestScheduler.maximumRequests = 50;

  /**
   * The maximum number of simultaneous active requests per server. Un-throttled requests or servers specifically
   * listed in {@link requestsByServer} do not observe this limit.
   * @type {Number}
   * @default 6
   */
  RequestScheduler.maximumRequestsPerServer = 6;

  /**
   * A per server key list of overrides to use for throttling instead of <code>maximumRequestsPerServer</code>
   * @type {Object}
   *
   * @example
   * RequestScheduler.requestsByServer = {
   *   'api.cesium.com:443': 18,
   *   'assets.cesium.com:443': 18
   * };
   */
  RequestScheduler.requestsByServer = {
    "api.cesium.com:443": 18,
    "assets.cesium.com:443": 18,
  };

  /**
   * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
   * @type {Boolean}
   * @default true
   */
  RequestScheduler.throttleRequests = true;

  /**
   * When true, log statistics to the console every frame
   * @type {Boolean}
   * @default false
   * @private
   */
  RequestScheduler.debugShowStatistics = false;

  /**
   * An event that's raised when a request is completed.  Event handlers are passed
   * the error object if the request fails.
   *
   * @type {Event}
   * @default Event()
   * @private
   */
  RequestScheduler.requestCompletedEvent = requestCompletedEvent;

  Object.defineProperties(RequestScheduler, {
    /**
     * Returns the statistics used by the request scheduler.
     *
     * @memberof RequestScheduler
     *
     * @type Object
     * @readonly
     * @private
     */
    statistics: {
      get: function () {
        return statistics;
      },
    },

    /**
     * The maximum size of the priority heap. This limits the number of requests that are sorted by priority. Only applies to requests that are not yet active.
     *
     * @memberof RequestScheduler
     *
     * @type {Number}
     * @default 20
     * @private
     */
    priorityHeapLength: {
      get: function () {
        return priorityHeapLength;
      },
      set: function (value) {
        // If the new length shrinks the heap, need to cancel some of the requests.
        // Since this value is not intended to be tweaked regularly it is fine to just cancel the high priority requests.
        if (value < priorityHeapLength) {
          while (requestHeap.length > value) {
            var request = requestHeap.pop();
            cancelRequest(request);
          }
        }
        priorityHeapLength = value;
        requestHeap.maximumLength = value;
        requestHeap.reserve(value);
      },
    },
  });

  function updatePriority(request) {
    if (when.defined(request.priorityFunction)) {
      request.priority = request.priorityFunction();
    }
  }

  function serverHasOpenSlots(serverKey) {
    var maxRequests = when.defaultValue(
      RequestScheduler.requestsByServer[serverKey],
      RequestScheduler.maximumRequestsPerServer
    );
    return numberOfActiveRequestsByServer[serverKey] < maxRequests;
  }

  function issueRequest(request) {
    if (request.state === RequestState$1.UNISSUED) {
      request.state = RequestState$1.ISSUED;
      request.deferred = when.when.defer();
    }
    return request.deferred.promise;
  }

  function getRequestReceivedFunction(request) {
    return function (results) {
      if (request.state === RequestState$1.CANCELLED) {
        // If the data request comes back but the request is cancelled, ignore it.
        return;
      }
      // explicitly set to undefined to ensure GC of request response data. See #8843
      var deferred = request.deferred;

      --statistics.numberOfActiveRequests;
      --numberOfActiveRequestsByServer[request.serverKey];
      requestCompletedEvent.raiseEvent();
      request.state = RequestState$1.RECEIVED;
      request.deferred = undefined;

      deferred.resolve(results);
    };
  }

  function getRequestFailedFunction(request) {
    return function (error) {
      if (request.state === RequestState$1.CANCELLED) {
        // If the data request comes back but the request is cancelled, ignore it.
        return;
      }
      ++statistics.numberOfFailedRequests;
      --statistics.numberOfActiveRequests;
      --numberOfActiveRequestsByServer[request.serverKey];
      requestCompletedEvent.raiseEvent(error);
      request.state = RequestState$1.FAILED;
      request.deferred.reject(error);
    };
  }

  function startRequest(request) {
    var promise = issueRequest(request);
    request.state = RequestState$1.ACTIVE;
    activeRequests.push(request);
    ++statistics.numberOfActiveRequests;
    ++statistics.numberOfActiveRequestsEver;
    ++numberOfActiveRequestsByServer[request.serverKey];
    request
      .requestFunction()
      .then(getRequestReceivedFunction(request))
      .otherwise(getRequestFailedFunction(request));
    return promise;
  }

  function cancelRequest(request) {
    var active = request.state === RequestState$1.ACTIVE;
    request.state = RequestState$1.CANCELLED;
    ++statistics.numberOfCancelledRequests;
    // check that deferred has not been cleared since cancelRequest can be called
    // on a finished request, e.g. by clearForSpecs during tests
    if (when.defined(request.deferred)) {
      var deferred = request.deferred;
      request.deferred = undefined;
      deferred.reject();
    }

    if (active) {
      --statistics.numberOfActiveRequests;
      --numberOfActiveRequestsByServer[request.serverKey];
      ++statistics.numberOfCancelledActiveRequests;
    }

    if (when.defined(request.cancelFunction)) {
      request.cancelFunction();
    }
  }

  /**
   * Sort requests by priority and start requests.
   * @private
   */
  RequestScheduler.update = function () {
    var i;
    var request;

    // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
    var removeCount = 0;
    var activeLength = activeRequests.length;
    for (i = 0; i < activeLength; ++i) {
      request = activeRequests[i];
      if (request.cancelled) {
        // Request was explicitly cancelled
        cancelRequest(request);
      }
      if (request.state !== RequestState$1.ACTIVE) {
        // Request is no longer active, remove from array
        ++removeCount;
        continue;
      }
      if (removeCount > 0) {
        // Shift back to fill in vacated slots from completed requests
        activeRequests[i - removeCount] = request;
      }
    }
    activeRequests.length -= removeCount;

    // Update priority of issued requests and resort the heap
    var issuedRequests = requestHeap.internalArray;
    var issuedLength = requestHeap.length;
    for (i = 0; i < issuedLength; ++i) {
      updatePriority(issuedRequests[i]);
    }
    requestHeap.resort();

    // Get the number of open slots and fill with the highest priority requests.
    // Un-throttled requests are automatically added to activeRequests, so activeRequests.length may exceed maximumRequests
    var openSlots = Math.max(
      RequestScheduler.maximumRequests - activeRequests.length,
      0
    );
    var filledSlots = 0;
    while (filledSlots < openSlots && requestHeap.length > 0) {
      // Loop until all open slots are filled or the heap becomes empty
      request = requestHeap.pop();
      if (request.cancelled) {
        // Request was explicitly cancelled
        cancelRequest(request);
        continue;
      }

      if (request.throttleByServer && !serverHasOpenSlots(request.serverKey)) {
        // Open slots are available, but the request is throttled by its server. Cancel and try again later.
        cancelRequest(request);
        continue;
      }

      startRequest(request);
      ++filledSlots;
    }

    updateStatistics();
  };

  /**
   * Get the server key from a given url.
   *
   * @param {String} url The url.
   * @returns {String} The server key.
   * @private
   */
  RequestScheduler.getServerKey = function (url) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.string("url", url);
    //>>includeEnd('debug');

    var uri = new URI(url).resolve(pageUri);
    uri.normalize();
    var serverKey = uri.authority;
    if (!/:/.test(serverKey)) {
      // If the authority does not contain a port number, add port 443 for https or port 80 for http
      serverKey = serverKey + ":" + (uri.scheme === "https" ? "443" : "80");
    }

    var length = numberOfActiveRequestsByServer[serverKey];
    if (!when.defined(length)) {
      numberOfActiveRequestsByServer[serverKey] = 0;
    }

    return serverKey;
  };

  /**
   * Issue a request. If request.throttle is false, the request is sent immediately. Otherwise the request will be
   * queued and sorted by priority before being sent.
   *
   * @param {Request} request The request object.
   *
   * @returns {Promise|undefined} A Promise for the requested data, or undefined if this request does not have high enough priority to be issued.
   *
   * @private
   */
  RequestScheduler.request = function (request) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("request", request);
    Check.Check.typeOf.string("request.url", request.url);
    Check.Check.typeOf.func("request.requestFunction", request.requestFunction);
    //>>includeEnd('debug');

    if (isDataUri(request.url) || isBlobUri(request.url)) {
      requestCompletedEvent.raiseEvent();
      request.state = RequestState$1.RECEIVED;
      return request.requestFunction();
    }

    ++statistics.numberOfAttemptedRequests;

    if (!when.defined(request.serverKey)) {
      request.serverKey = RequestScheduler.getServerKey(request.url);
    }

    if (
      RequestScheduler.throttleRequests &&
      request.throttleByServer &&
      !serverHasOpenSlots(request.serverKey)
    ) {
      // Server is saturated. Try again later.
      return undefined;
    }

    if (!RequestScheduler.throttleRequests || !request.throttle) {
      return startRequest(request);
    }

    if (activeRequests.length >= RequestScheduler.maximumRequests) {
      // Active requests are saturated. Try again later.
      return undefined;
    }

    // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
    // priority it will be returned.
    updatePriority(request);
    var removedRequest = requestHeap.insert(request);

    if (when.defined(removedRequest)) {
      if (removedRequest === request) {
        // Request does not have high enough priority to be issued
        return undefined;
      }
      // A previously issued request has been bumped off the priority heap, so cancel it
      cancelRequest(removedRequest);
    }

    return issueRequest(request);
  };

  function updateStatistics() {
    if (!RequestScheduler.debugShowStatistics) {
      return;
    }

    if (
      statistics.numberOfActiveRequests === 0 &&
      statistics.lastNumberOfActiveRequests > 0
    ) {
      if (statistics.numberOfAttemptedRequests > 0) {
        console.log(
          "Number of attempted requests: " + statistics.numberOfAttemptedRequests
        );
        statistics.numberOfAttemptedRequests = 0;
      }

      if (statistics.numberOfCancelledRequests > 0) {
        console.log(
          "Number of cancelled requests: " + statistics.numberOfCancelledRequests
        );
        statistics.numberOfCancelledRequests = 0;
      }

      if (statistics.numberOfCancelledActiveRequests > 0) {
        console.log(
          "Number of cancelled active requests: " +
            statistics.numberOfCancelledActiveRequests
        );
        statistics.numberOfCancelledActiveRequests = 0;
      }

      if (statistics.numberOfFailedRequests > 0) {
        console.log(
          "Number of failed requests: " + statistics.numberOfFailedRequests
        );
        statistics.numberOfFailedRequests = 0;
      }
    }

    statistics.lastNumberOfActiveRequests = statistics.numberOfActiveRequests;
  }

  /**
   * For testing only. Clears any requests that may not have completed from previous tests.
   *
   * @private
   */
  RequestScheduler.clearForSpecs = function () {
    while (requestHeap.length > 0) {
      var request = requestHeap.pop();
      cancelRequest(request);
    }
    var length = activeRequests.length;
    for (var i = 0; i < length; ++i) {
      cancelRequest(activeRequests[i]);
    }
    activeRequests.length = 0;
    numberOfActiveRequestsByServer = {};

    // Clear stats
    statistics.numberOfAttemptedRequests = 0;
    statistics.numberOfActiveRequests = 0;
    statistics.numberOfCancelledRequests = 0;
    statistics.numberOfCancelledActiveRequests = 0;
    statistics.numberOfFailedRequests = 0;
    statistics.numberOfActiveRequestsEver = 0;
    statistics.lastNumberOfActiveRequests = 0;
  };

  /**
   * For testing only.
   *
   * @private
   */
  RequestScheduler.numberOfActiveRequestsByServer = function (serverKey) {
    return numberOfActiveRequestsByServer[serverKey];
  };

  /**
   * For testing only.
   *
   * @private
   */
  RequestScheduler.requestHeap = requestHeap;

  /**
   * A singleton that contains all of the servers that are trusted. Credentials will be sent with
   * any requests to these servers.
   *
   * @namespace TrustedServers
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   */
  var TrustedServers = {};
  var _servers = {};

  /**
   * Adds a trusted server to the registry
   *
   * @param {String} host The host to be added.
   * @param {Number} port The port used to access the host.
   *
   * @example
   * // Add a trusted server
   * TrustedServers.add('my.server.com', 80);
   */
  TrustedServers.add = function (host, port) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(host)) {
      throw new Check.DeveloperError("host is required.");
    }
    if (!when.defined(port) || port <= 0) {
      throw new Check.DeveloperError("port is required to be greater than 0.");
    }
    //>>includeEnd('debug');

    var authority = host.toLowerCase() + ":" + port;
    if (!when.defined(_servers[authority])) {
      _servers[authority] = true;
    }
  };

  /**
   * Removes a trusted server from the registry
   *
   * @param {String} host The host to be removed.
   * @param {Number} port The port used to access the host.
   *
   * @example
   * // Remove a trusted server
   * TrustedServers.remove('my.server.com', 80);
   */
  TrustedServers.remove = function (host, port) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(host)) {
      throw new Check.DeveloperError("host is required.");
    }
    if (!when.defined(port) || port <= 0) {
      throw new Check.DeveloperError("port is required to be greater than 0.");
    }
    //>>includeEnd('debug');

    var authority = host.toLowerCase() + ":" + port;
    if (when.defined(_servers[authority])) {
      delete _servers[authority];
    }
  };

  function getAuthority(url) {
    var uri = new URI(url);
    uri.normalize();

    // Removes username:password@ so we just have host[:port]
    var authority = uri.getAuthority();
    if (!when.defined(authority)) {
      return undefined; // Relative URL
    }

    if (authority.indexOf("@") !== -1) {
      var parts = authority.split("@");
      authority = parts[1];
    }

    // If the port is missing add one based on the scheme
    if (authority.indexOf(":") === -1) {
      var scheme = uri.getScheme();
      if (!when.defined(scheme)) {
        scheme = window.location.protocol;
        scheme = scheme.substring(0, scheme.length - 1);
      }
      if (scheme === "http") {
        authority += ":80";
      } else if (scheme === "https") {
        authority += ":443";
      } else {
        return undefined;
      }
    }

    return authority;
  }

  /**
   * Tests whether a server is trusted or not. The server must have been added with the port if it is included in the url.
   *
   * @param {String} url The url to be tested against the trusted list
   *
   * @returns {boolean} Returns true if url is trusted, false otherwise.
   *
   * @example
   * // Add server
   * TrustedServers.add('my.server.com', 81);
   *
   * // Check if server is trusted
   * if (TrustedServers.contains('https://my.server.com:81/path/to/file.png')) {
   *     // my.server.com:81 is trusted
   * }
   * if (TrustedServers.contains('https://my.server.com/path/to/file.png')) {
   *     // my.server.com isn't trusted
   * }
   */
  TrustedServers.contains = function (url) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(url)) {
      throw new Check.DeveloperError("url is required.");
    }
    //>>includeEnd('debug');
    var authority = getAuthority(url);
    if (when.defined(authority) && when.defined(_servers[authority])) {
      return true;
    }

    return false;
  };

  /**
   * Clears the registry
   *
   * @example
   * // Remove a trusted server
   * TrustedServers.clear();
   */
  TrustedServers.clear = function () {
    _servers = {};
  };

  var xhrBlobSupported = (function () {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "#", true);
      xhr.responseType = "blob";
      return xhr.responseType === "blob";
    } catch (e) {
      return false;
    }
  })();

  /**
   * Parses a query string and returns the object equivalent.
   *
   * @param {Uri} uri The Uri with a query object.
   * @param {Resource} resource The Resource that will be assigned queryParameters.
   * @param {Boolean} merge If true, we'll merge with the resource's existing queryParameters. Otherwise they will be replaced.
   * @param {Boolean} preserveQueryParameters If true duplicate parameters will be concatenated into an array. If false, keys in uri will take precedence.
   *
   * @private
   */
  function parseQuery(uri, resource, merge, preserveQueryParameters) {
    var queryString = uri.query;
    if (!when.defined(queryString) || queryString.length === 0) {
      return {};
    }

    var query;
    // Special case we run into where the querystring is just a string, not key/value pairs
    if (queryString.indexOf("=") === -1) {
      var result = {};
      result[queryString] = undefined;
      query = result;
    } else {
      query = queryToObject(queryString);
    }

    if (merge) {
      resource._queryParameters = combineQueryParameters(
        query,
        resource._queryParameters,
        preserveQueryParameters
      );
    } else {
      resource._queryParameters = query;
    }
    uri.query = undefined;
  }

  /**
   * Converts a query object into a string.
   *
   * @param {Uri} uri The Uri object that will have the query object set.
   * @param {Resource} resource The resource that has queryParameters
   *
   * @private
   */
  function stringifyQuery(uri, resource) {
    var queryObject = resource._queryParameters;

    var keys = Object.keys(queryObject);

    // We have 1 key with an undefined value, so this is just a string, not key/value pairs
    if (keys.length === 1 && !when.defined(queryObject[keys[0]])) {
      uri.query = keys[0];
    } else {
      uri.query = objectToQuery(queryObject);
    }
  }

  /**
   * Clones a value if it is defined, otherwise returns the default value
   *
   * @param {*} [val] The value to clone.
   * @param {*} [defaultVal] The default value.
   *
   * @returns {*} A clone of val or the defaultVal.
   *
   * @private
   */
  function defaultClone(val, defaultVal) {
    if (!when.defined(val)) {
      return defaultVal;
    }

    return when.defined(val.clone) ? val.clone() : clone(val);
  }

  /**
   * Checks to make sure the Resource isn't already being requested.
   *
   * @param {Request} request The request to check.
   *
   * @private
   */
  function checkAndResetRequest(request) {
    if (
      request.state === RequestState$1.ISSUED ||
      request.state === RequestState$1.ACTIVE
    ) {
      throw new RuntimeError.RuntimeError("The Resource is already being fetched.");
    }

    request.state = RequestState$1.UNISSUED;
    request.deferred = undefined;
  }

  /**
   * This combines a map of query parameters.
   *
   * @param {Object} q1 The first map of query parameters. Values in this map will take precedence if preserveQueryParameters is false.
   * @param {Object} q2 The second map of query parameters.
   * @param {Boolean} preserveQueryParameters If true duplicate parameters will be concatenated into an array. If false, keys in q1 will take precedence.
   *
   * @returns {Object} The combined map of query parameters.
   *
   * @example
   * var q1 = {
   *   a: 1,
   *   b: 2
   * };
   * var q2 = {
   *   a: 3,
   *   c: 4
   * };
   * var q3 = {
   *   b: [5, 6],
   *   d: 7
   * }
   *
   * // Returns
   * // {
   * //   a: [1, 3],
   * //   b: 2,
   * //   c: 4
   * // };
   * combineQueryParameters(q1, q2, true);
   *
   * // Returns
   * // {
   * //   a: 1,
   * //   b: 2,
   * //   c: 4
   * // };
   * combineQueryParameters(q1, q2, false);
   *
   * // Returns
   * // {
   * //   a: 1,
   * //   b: [2, 5, 6],
   * //   d: 7
   * // };
   * combineQueryParameters(q1, q3, true);
   *
   * // Returns
   * // {
   * //   a: 1,
   * //   b: 2,
   * //   d: 7
   * // };
   * combineQueryParameters(q1, q3, false);
   *
   * @private
   */
  function combineQueryParameters(q1, q2, preserveQueryParameters) {
    if (!preserveQueryParameters) {
      return combine(q1, q2);
    }

    var result = clone(q1, true);
    for (var param in q2) {
      if (q2.hasOwnProperty(param)) {
        var value = result[param];
        var q2Value = q2[param];
        if (when.defined(value)) {
          if (!Array.isArray(value)) {
            value = result[param] = [value];
          }

          result[param] = value.concat(q2Value);
        } else {
          result[param] = Array.isArray(q2Value) ? q2Value.slice() : q2Value;
        }
      }
    }

    return result;
  }

  /**
   * A resource that includes the location and any other parameters we need to retrieve it or create derived resources. It also provides the ability to retry requests.
   *
   * @alias Resource
   * @constructor
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   *
   * @example
   * function refreshTokenRetryCallback(resource, error) {
   *   if (error.statusCode === 403) {
   *     // 403 status code means a new token should be generated
   *     return getNewAccessToken()
   *       .then(function(token) {
   *         resource.queryParameters.access_token = token;
   *         return true;
   *       })
   *       .otherwise(function() {
   *         return false;
   *       });
   *   }
   *
   *   return false;
   * }
   *
   * var resource = new Resource({
   *    url: 'http://server.com/path/to/resource.json',
   *    proxy: new DefaultProxy('/proxy/'),
   *    headers: {
   *      'X-My-Header': 'valueOfHeader'
   *    },
   *    queryParameters: {
   *      'access_token': '123-435-456-000'
   *    },
   *    retryCallback: refreshTokenRetryCallback,
   *    retryAttempts: 1
   * });
   */
  function Resource(options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);
    if (typeof options === "string") {
      options = {
        url: options,
      };
    }

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.string("options.url", options.url);
    //>>includeEnd('debug');

    this._url = undefined;
    this._templateValues = defaultClone(options.templateValues, {});
    this._queryParameters = defaultClone(options.queryParameters, {});

    /**
     * Additional HTTP headers that will be sent with the request.
     *
     * @type {Object}
     */
    this.headers = defaultClone(options.headers, {});

    /**
     * A Request object that will be used. Intended for internal use only.
     *
     * @type {Request}
     */
    this.request = when.defaultValue(options.request, new Request());

    /**
     * A proxy to be used when loading the resource.
     *
     * @type {Proxy}
     */
    this.proxy = options.proxy;

    /**
     * Function to call when a request for this resource fails. If it returns true or a Promise that resolves to true, the request will be retried.
     *
     * @type {Function}
     */
    this.retryCallback = options.retryCallback;

    /**
     * The number of times the retryCallback should be called before giving up.
     *
     * @type {Number}
     */
    this.retryAttempts = when.defaultValue(options.retryAttempts, 0);
    this._retryCount = 0;

    var uri = new URI(options.url);
    parseQuery(uri, this, true, true);

    // Remove the fragment as it's not sent with a request
    uri.fragment = undefined;

    this._url = uri.toString();
  }

  /**
   * A helper function to create a resource depending on whether we have a String or a Resource
   *
   * @param {Resource|String} resource A Resource or a String to use when creating a new Resource.
   *
   * @returns {Resource} If resource is a String, a Resource constructed with the url and options. Otherwise the resource parameter is returned.
   *
   * @private
   */
  Resource.createIfNeeded = function (resource) {
    if (resource instanceof Resource) {
      // Keep existing request object. This function is used internally to duplicate a Resource, so that it can't
      //  be modified outside of a class that holds it (eg. an imagery or terrain provider). Since the Request objects
      //  are managed outside of the providers, by the tile loading code, we want to keep the request property the same so if it is changed
      //  in the underlying tiling code the requests for this resource will use it.
      return resource.getDerivedResource({
        request: resource.request,
      });
    }

    if (typeof resource !== "string") {
      return resource;
    }

    return new Resource({
      url: resource,
    });
  };

  var supportsImageBitmapOptionsPromise;
  /**
   * A helper function to check whether createImageBitmap supports passing ImageBitmapOptions.
   *
   * @returns {Promise<Boolean>} A promise that resolves to true if this browser supports creating an ImageBitmap with options.
   *
   * @private
   */
  Resource.supportsImageBitmapOptions = function () {
    // Until the HTML folks figure out what to do about this, we need to actually try loading an image to
    // know if this browser supports passing options to the createImageBitmap function.
    // https://github.com/whatwg/html/pull/4248
    if (when.defined(supportsImageBitmapOptionsPromise)) {
      return supportsImageBitmapOptionsPromise;
    }

    if (typeof createImageBitmap !== "function") {
      supportsImageBitmapOptionsPromise = when.when.resolve(false);
      return supportsImageBitmapOptionsPromise;
    }

    var imageDataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4////fwAJ+wP9CNHoHgAAAABJRU5ErkJggg==";

    supportsImageBitmapOptionsPromise = Resource.fetchBlob({
      url: imageDataUri,
    })
      .then(function (blob) {
        return createImageBitmap(blob, {
          imageOrientation: "flipY",
          premultiplyAlpha: "none",
        });
      })
      .then(function (imageBitmap) {
        return true;
      })
      .otherwise(function () {
        return false;
      });

    return supportsImageBitmapOptionsPromise;
  };

  Object.defineProperties(Resource, {
    /**
     * Returns true if blobs are supported.
     *
     * @memberof Resource
     * @type {Boolean}
     *
     * @readonly
     */
    isBlobSupported: {
      get: function () {
        return xhrBlobSupported;
      },
    },
  });

  Object.defineProperties(Resource.prototype, {
    /**
     * Query parameters appended to the url.
     *
     * @memberof Resource.prototype
     * @type {Object}
     *
     * @readonly
     */
    queryParameters: {
      get: function () {
        return this._queryParameters;
      },
    },

    /**
     * The key/value pairs used to replace template parameters in the url.
     *
     * @memberof Resource.prototype
     * @type {Object}
     *
     * @readonly
     */
    templateValues: {
      get: function () {
        return this._templateValues;
      },
    },

    /**
     * The url to the resource with template values replaced, query string appended and encoded by proxy if one was set.
     *
     * @memberof Resource.prototype
     * @type {String}
     */
    url: {
      get: function () {
        return this.getUrlComponent(true, true);
      },
      set: function (value) {
        var uri = new URI(value);

        parseQuery(uri, this, false);

        // Remove the fragment as it's not sent with a request
        uri.fragment = undefined;

        this._url = uri.toString();
      },
    },

    /**
     * The file extension of the resource.
     *
     * @memberof Resource.prototype
     * @type {String}
     *
     * @readonly
     */
    extension: {
      get: function () {
        return getExtensionFromUri(this._url);
      },
    },

    /**
     * True if the Resource refers to a data URI.
     *
     * @memberof Resource.prototype
     * @type {Boolean}
     */
    isDataUri: {
      get: function () {
        return isDataUri(this._url);
      },
    },

    /**
     * True if the Resource refers to a blob URI.
     *
     * @memberof Resource.prototype
     * @type {Boolean}
     */
    isBlobUri: {
      get: function () {
        return isBlobUri(this._url);
      },
    },

    /**
     * True if the Resource refers to a cross origin URL.
     *
     * @memberof Resource.prototype
     * @type {Boolean}
     */
    isCrossOriginUrl: {
      get: function () {
        return isCrossOriginUrl(this._url);
      },
    },

    /**
     * True if the Resource has request headers. This is equivalent to checking if the headers property has any keys.
     *
     * @memberof Resource.prototype
     * @type {Boolean}
     */
    hasHeaders: {
      get: function () {
        return Object.keys(this.headers).length > 0;
      },
    },
  });

  /**
   * Override Object#toString so that implicit string conversion gives the
   * complete URL represented by this Resource.
   *
   * @returns {String} The URL represented by this Resource
   */
  Resource.prototype.toString = function () {
    return this.getUrlComponent(true, true);
  };

  /**
   * Returns the url, optional with the query string and processed by a proxy.
   *
   * @param {Boolean} [query=false] If true, the query string is included.
   * @param {Boolean} [proxy=false] If true, the url is processed by the proxy object, if defined.
   *
   * @returns {String} The url with all the requested components.
   */
  Resource.prototype.getUrlComponent = function (query, proxy) {
    if (this.isDataUri) {
      return this._url;
    }

    var uri = new URI(this._url);

    if (query) {
      stringifyQuery(uri, this);
    }

    // objectToQuery escapes the placeholders.  Undo that.
    var url = uri.toString().replace(/%7B/g, "{").replace(/%7D/g, "}");

    var templateValues = this._templateValues;
    url = url.replace(/{(.*?)}/g, function (match, key) {
      var replacement = templateValues[key];
      if (when.defined(replacement)) {
        // use the replacement value from templateValues if there is one...
        return encodeURIComponent(replacement);
      }
      // otherwise leave it unchanged
      return match;
    });

    if (proxy && when.defined(this.proxy)) {
      url = this.proxy.getURL(url);
    }
    return url;
  };

  /**
   * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
   *  as opposed to adding them one at a time to the queryParameters property. If a value is already set, it will be replaced with the new value.
   *
   * @param {Object} params The query parameters
   * @param {Boolean} [useAsDefault=false] If true the params will be used as the default values, so they will only be set if they are undefined.
   */
  Resource.prototype.setQueryParameters = function (params, useAsDefault) {
    if (useAsDefault) {
      this._queryParameters = combineQueryParameters(
        this._queryParameters,
        params,
        false
      );
    } else {
      this._queryParameters = combineQueryParameters(
        params,
        this._queryParameters,
        false
      );
    }
  };

  /**
   * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
   *  as opposed to adding them one at a time to the queryParameters property.
   *
   * @param {Object} params The query parameters
   */
  Resource.prototype.appendQueryParameters = function (params) {
    this._queryParameters = combineQueryParameters(
      params,
      this._queryParameters,
      true
    );
  };

  /**
   * Combines the specified object and the existing template values. This allows you to add many values at once,
   *  as opposed to adding them one at a time to the templateValues property. If a value is already set, it will become an array and the new value will be appended.
   *
   * @param {Object} template The template values
   * @param {Boolean} [useAsDefault=false] If true the values will be used as the default values, so they will only be set if they are undefined.
   */
  Resource.prototype.setTemplateValues = function (template, useAsDefault) {
    if (useAsDefault) {
      this._templateValues = combine(this._templateValues, template);
    } else {
      this._templateValues = combine(template, this._templateValues);
    }
  };

  /**
   * Returns a resource relative to the current instance. All properties remain the same as the current instance unless overridden in options.
   *
   * @param {Object} options An object with the following properties
   * @param {String} [options.url]  The url that will be resolved relative to the url of the current instance.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be combined with those of the current instance.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}). These will be combined with those of the current instance.
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The function to call when loading the resource fails.
   * @param {Number} [options.retryAttempts] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {Boolean} [options.preserveQueryParameters=false] If true, this will keep all query parameters from the current resource and derived resource. If false, derived parameters will replace those of the current resource.
   *
   * @returns {Resource} The resource derived from the current one.
   */
  Resource.prototype.getDerivedResource = function (options) {
    var resource = this.clone();
    resource._retryCount = 0;

    if (when.defined(options.url)) {
      var uri = new URI(options.url);

      var preserveQueryParameters = when.defaultValue(
        options.preserveQueryParameters,
        false
      );
      parseQuery(uri, resource, true, preserveQueryParameters);

      // Remove the fragment as it's not sent with a request
      uri.fragment = undefined;

      resource._url = uri.resolve(new URI(getAbsoluteUri(this._url))).toString();
    }

    if (when.defined(options.queryParameters)) {
      resource._queryParameters = combine(
        options.queryParameters,
        resource._queryParameters
      );
    }
    if (when.defined(options.templateValues)) {
      resource._templateValues = combine(
        options.templateValues,
        resource.templateValues
      );
    }
    if (when.defined(options.headers)) {
      resource.headers = combine(options.headers, resource.headers);
    }
    if (when.defined(options.proxy)) {
      resource.proxy = options.proxy;
    }
    if (when.defined(options.request)) {
      resource.request = options.request;
    }
    if (when.defined(options.retryCallback)) {
      resource.retryCallback = options.retryCallback;
    }
    if (when.defined(options.retryAttempts)) {
      resource.retryAttempts = options.retryAttempts;
    }

    return resource;
  };

  /**
   * Called when a resource fails to load. This will call the retryCallback function if defined until retryAttempts is reached.
   *
   * @param {Error} [error] The error that was encountered.
   *
   * @returns {Promise<Boolean>} A promise to a boolean, that if true will cause the resource request to be retried.
   *
   * @private
   */
  Resource.prototype.retryOnError = function (error) {
    var retryCallback = this.retryCallback;
    if (
      typeof retryCallback !== "function" ||
      this._retryCount >= this.retryAttempts
    ) {
      return when.when(false);
    }

    var that = this;
    return when.when(retryCallback(this, error)).then(function (result) {
      ++that._retryCount;

      return result;
    });
  };

  /**
   * Duplicates a Resource instance.
   *
   * @param {Resource} [result] The object onto which to store the result.
   *
   * @returns {Resource} The modified result parameter or a new Resource instance if one was not provided.
   */
  Resource.prototype.clone = function (result) {
    if (!when.defined(result)) {
      result = new Resource({
        url: this._url,
      });
    }

    result._url = this._url;
    result._queryParameters = clone(this._queryParameters);
    result._templateValues = clone(this._templateValues);
    result.headers = clone(this.headers);
    result.proxy = this.proxy;
    result.retryCallback = this.retryCallback;
    result.retryAttempts = this.retryAttempts;
    result._retryCount = 0;
    result.request = this.request.clone();

    return result;
  };

  /**
   * Returns the base path of the Resource.
   *
   * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
   *
   * @returns {String} The base URI of the resource
   */
  Resource.prototype.getBaseUri = function (includeQuery) {
    return getBaseUri(this.getUrlComponent(includeQuery), includeQuery);
  };

  /**
   * Appends a forward slash to the URL.
   */
  Resource.prototype.appendForwardSlash = function () {
    this._url = appendForwardSlash(this._url);
  };

  /**
   * Asynchronously loads the resource as raw binary data.  Returns a promise that will resolve to
   * an ArrayBuffer once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   * @example
   * // load a single URL asynchronously
   * resource.fetchArrayBuffer().then(function(arrayBuffer) {
   *     // use the data
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchArrayBuffer = function () {
    return this.fetch({
      responseType: "arraybuffer",
    });
  };

  /**
   * Creates a Resource and calls fetchArrayBuffer() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchArrayBuffer = function (options) {
    var resource = new Resource(options);
    return resource.fetchArrayBuffer();
  };

  /**
   * Asynchronously loads the given resource as a blob.  Returns a promise that will resolve to
   * a Blob once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   * @example
   * // load a single URL asynchronously
   * resource.fetchBlob().then(function(blob) {
   *     // use the data
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchBlob = function () {
    return this.fetch({
      responseType: "blob",
    });
  };

  /**
   * Creates a Resource and calls fetchBlob() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchBlob = function (options) {
    var resource = new Resource(options);
    return resource.fetchBlob();
  };

  /**
   * Asynchronously loads the given image resource.  Returns a promise that will resolve to
   * an {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap|ImageBitmap} if <code>preferImageBitmap</code> is true and the browser supports <code>createImageBitmap</code> or otherwise an
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement|Image} once loaded, or reject if the image failed to load.
   *
   * @param {Object} [options] An object with the following properties.
   * @param {Boolean} [options.preferBlob=false] If true, we will load the image via a blob.
   * @param {Boolean} [options.preferImageBitmap=false] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
   * @param {Boolean} [options.flipY=false] If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
   * @returns {Promise.<ImageBitmap>|Promise.<HTMLImageElement>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * // load a single image asynchronously
   * resource.fetchImage().then(function(image) {
   *     // use the loaded image
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * // load several images in parallel
   * when.all([resource1.fetchImage(), resource2.fetchImage()]).then(function(images) {
   *     // images is an array containing all the loaded images
   * });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchImage = function (options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);
    var preferImageBitmap = when.defaultValue(options.preferImageBitmap, false);
    var preferBlob = when.defaultValue(options.preferBlob, false);
    var flipY = when.defaultValue(options.flipY, false);

    checkAndResetRequest(this.request);

    // We try to load the image normally if
    // 1. Blobs aren't supported
    // 2. It's a data URI
    // 3. It's a blob URI
    // 4. It doesn't have request headers and we preferBlob is false
    if (
      !xhrBlobSupported ||
      this.isDataUri ||
      this.isBlobUri ||
      (!this.hasHeaders && !preferBlob)
    ) {
      return fetchImage({
        resource: this,
        flipY: flipY,
        preferImageBitmap: preferImageBitmap,
      });
    }

    var blobPromise = this.fetchBlob();
    if (!when.defined(blobPromise)) {
      return;
    }

    var supportsImageBitmap;
    var useImageBitmap;
    var generatedBlobResource;
    var generatedBlob;
    return Resource.supportsImageBitmapOptions()
      .then(function (result) {
        supportsImageBitmap = result;
        useImageBitmap = supportsImageBitmap && preferImageBitmap;
        return blobPromise;
      })
      .then(function (blob) {
        if (!when.defined(blob)) {
          return;
        }
        generatedBlob = blob;
        if (useImageBitmap) {
          return Resource.createImageBitmapFromBlob(blob, {
            flipY: flipY,
            premultiplyAlpha: false,
          });
        }
        var blobUrl = window.URL.createObjectURL(blob);
        generatedBlobResource = new Resource({
          url: blobUrl,
        });

        return fetchImage({
          resource: generatedBlobResource,
          flipY: flipY,
          preferImageBitmap: false,
        });
      })
      .then(function (image) {
        if (!when.defined(image)) {
          return;
        }

        // The blob object may be needed for use by a TileDiscardPolicy,
        // so attach it to the image.
        image.blob = generatedBlob;

        if (useImageBitmap) {
          return image;
        }

        window.URL.revokeObjectURL(generatedBlobResource.url);
        return image;
      })
      .otherwise(function (error) {
        if (when.defined(generatedBlobResource)) {
          window.URL.revokeObjectURL(generatedBlobResource.url);
        }

        // If the blob load succeeded but the image decode failed, attach the blob
        // to the error object for use by a TileDiscardPolicy.
        // In particular, BingMapsImageryProvider uses this to detect the
        // zero-length response that is returned when a tile is not available.
        error.blob = generatedBlob;

        return when.when.reject(error);
      });
  };

  /**
   * Fetches an image and returns a promise to it.
   *
   * @param {Object} [options] An object with the following properties.
   * @param {Resource} [options.resource] Resource object that points to an image to fetch.
   * @param {Boolean} [options.preferImageBitmap] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
   * @param {Boolean} [options.flipY] If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
   *
   * @private
   */
  function fetchImage(options) {
    var resource = options.resource;
    var flipY = options.flipY;
    var preferImageBitmap = options.preferImageBitmap;

    var request = resource.request;
    request.url = resource.url;
    request.requestFunction = function () {
      var crossOrigin = false;

      // data URIs can't have crossorigin set.
      if (!resource.isDataUri && !resource.isBlobUri) {
        crossOrigin = resource.isCrossOriginUrl;
      }

      var deferred = when.when.defer();
      Resource._Implementations.createImage(
        request,
        crossOrigin,
        deferred,
        flipY,
        preferImageBitmap
      );

      return deferred.promise;
    };

    var promise = RequestScheduler.request(request);
    if (!when.defined(promise)) {
      return;
    }

    return promise.otherwise(function (e) {
      // Don't retry cancelled or otherwise aborted requests
      if (request.state !== RequestState$1.FAILED) {
        return when.when.reject(e);
      }

      return resource.retryOnError(e).then(function (retry) {
        if (retry) {
          // Reset request so it can try again
          request.state = RequestState$1.UNISSUED;
          request.deferred = undefined;

          return fetchImage({
            resource: resource,
            flipY: flipY,
            preferImageBitmap: preferImageBitmap,
          });
        }

        return when.when.reject(e);
      });
    });
  }

  /**
   * Creates a Resource and calls fetchImage() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Boolean} [options.flipY=false] Whether to vertically flip the image during fetch and decode. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {Boolean} [options.preferBlob=false]  If true, we will load the image via a blob.
   * @param {Boolean} [options.preferImageBitmap=false] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
   * @returns {Promise.<ImageBitmap>|Promise.<HTMLImageElement>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchImage = function (options) {
    var resource = new Resource(options);
    return resource.fetchImage({
      flipY: options.flipY,
      preferBlob: options.preferBlob,
      preferImageBitmap: options.preferImageBitmap,
    });
  };

  /**
   * Asynchronously loads the given resource as text.  Returns a promise that will resolve to
   * a String once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   * @example
   * // load text from a URL, setting a custom header
   * var resource = new Resource({
   *   url: 'http://someUrl.com/someJson.txt',
   *   headers: {
   *     'X-Custom-Header' : 'some value'
   *   }
   * });
   * resource.fetchText().then(function(text) {
   *     // Do something with the text
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchText = function () {
    return this.fetch({
      responseType: "text",
    });
  };

  /**
   * Creates a Resource and calls fetchText() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchText = function (options) {
    var resource = new Resource(options);
    return resource.fetchText();
  };

  // note: &#42;&#47;&#42; below is */* but that ends the comment block early
  /**
   * Asynchronously loads the given resource as JSON.  Returns a promise that will resolve to
   * a JSON object once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This function
   * adds 'Accept: application/json,&#42;&#47;&#42;;q=0.01' to the request headers, if not
   * already specified.
   *
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.fetchJson().then(function(jsonData) {
   *     // Do something with the JSON object
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchJson = function () {
    var promise = this.fetch({
      responseType: "text",
      headers: {
        Accept: "application/json,*/*;q=0.01",
      },
    });

    if (!when.defined(promise)) {
      return undefined;
    }

    return promise.then(function (value) {
      if (!when.defined(value)) {
        return;
      }
      return JSON.parse(value);
    });
  };

  /**
   * Creates a Resource and calls fetchJson() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchJson = function (options) {
    var resource = new Resource(options);
    return resource.fetchJson();
  };

  /**
   * Asynchronously loads the given resource as XML.  Returns a promise that will resolve to
   * an XML Document once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @returns {Promise.<XMLDocument>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * // load XML from a URL, setting a custom header
   * Cesium.loadXML('http://someUrl.com/someXML.xml', {
   *   'X-Custom-Header' : 'some value'
   * }).then(function(document) {
   *     // Do something with the document
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchXML = function () {
    return this.fetch({
      responseType: "document",
      overrideMimeType: "text/xml",
    });
  };

  /**
   * Creates a Resource and calls fetchXML() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @returns {Promise.<XMLDocument>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchXML = function (options) {
    var resource = new Resource(options);
    return resource.fetchXML();
  };

  /**
   * Requests a resource using JSONP.
   *
   * @param {String} [callbackParameterName='callback'] The callback parameter name that the server expects.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * // load a data asynchronously
   * resource.fetchJsonp().then(function(data) {
   *     // use the loaded data
   * }).otherwise(function(error) {
   *     // an error occurred
   * });
   *
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetchJsonp = function (callbackParameterName) {
    callbackParameterName = when.defaultValue(callbackParameterName, "callback");

    checkAndResetRequest(this.request);

    //generate a unique function name
    var functionName;
    do {
      functionName = "loadJsonp" + Math.random().toString().substring(2, 8);
    } while (when.defined(window[functionName]));

    return fetchJsonp(this, callbackParameterName, functionName);
  };

  function fetchJsonp(resource, callbackParameterName, functionName) {
    var callbackQuery = {};
    callbackQuery[callbackParameterName] = functionName;
    resource.setQueryParameters(callbackQuery);

    var request = resource.request;
    request.url = resource.url;
    request.requestFunction = function () {
      var deferred = when.when.defer();

      //assign a function with that name in the global scope
      window[functionName] = function (data) {
        deferred.resolve(data);

        try {
          delete window[functionName];
        } catch (e) {
          window[functionName] = undefined;
        }
      };

      Resource._Implementations.loadAndExecuteScript(
        resource.url,
        functionName,
        deferred
      );
      return deferred.promise;
    };

    var promise = RequestScheduler.request(request);
    if (!when.defined(promise)) {
      return;
    }

    return promise.otherwise(function (e) {
      if (request.state !== RequestState$1.FAILED) {
        return when.when.reject(e);
      }

      return resource.retryOnError(e).then(function (retry) {
        if (retry) {
          // Reset request so it can try again
          request.state = RequestState$1.UNISSUED;
          request.deferred = undefined;

          return fetchJsonp(resource, callbackParameterName, functionName);
        }

        return when.when.reject(e);
      });
    });
  }

  /**
   * Creates a Resource from a URL and calls fetchJsonp() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetchJsonp = function (options) {
    var resource = new Resource(options);
    return resource.fetchJsonp(options.callbackParameterName);
  };

  /**
   * @private
   */
  Resource.prototype._makeRequest = function (options) {
    var resource = this;
    checkAndResetRequest(resource.request);

    var request = resource.request;
    request.url = resource.url;

    request.requestFunction = function () {
      var responseType = options.responseType;
      var headers = combine(options.headers, resource.headers);
      var overrideMimeType = options.overrideMimeType;
      var method = options.method;
      var data = options.data;
      var deferred = when.when.defer();
      var xhr = Resource._Implementations.loadWithXhr(
        resource.url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      );
      if (when.defined(xhr) && when.defined(xhr.abort)) {
        request.cancelFunction = function () {
          xhr.abort();
        };
      }
      return deferred.promise;
    };

    var promise = RequestScheduler.request(request);
    if (!when.defined(promise)) {
      return;
    }

    return promise
      .then(function (data) {
        // explicitly set to undefined to ensure GC of request response data. See #8843
        request.cancelFunction = undefined;
        return data;
      })
      .otherwise(function (e) {
        request.cancelFunction = undefined;
        if (request.state !== RequestState$1.FAILED) {
          return when.when.reject(e);
        }

        return resource.retryOnError(e).then(function (retry) {
          if (retry) {
            // Reset request so it can try again
            request.state = RequestState$1.UNISSUED;
            request.deferred = undefined;

            return resource.fetch(options);
          }

          return when.when.reject(e);
        });
      });
  };

  var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

  function decodeDataUriText(isBase64, data) {
    var result = decodeURIComponent(data);
    if (isBase64) {
      return atob(result);
    }
    return result;
  }

  function decodeDataUriArrayBuffer(isBase64, data) {
    var byteString = decodeDataUriText(isBase64, data);
    var buffer = new ArrayBuffer(byteString.length);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < byteString.length; i++) {
      view[i] = byteString.charCodeAt(i);
    }
    return buffer;
  }

  function decodeDataUri(dataUriRegexResult, responseType) {
    responseType = when.defaultValue(responseType, "");
    var mimeType = dataUriRegexResult[1];
    var isBase64 = !!dataUriRegexResult[2];
    var data = dataUriRegexResult[3];

    switch (responseType) {
      case "":
      case "text":
        return decodeDataUriText(isBase64, data);
      case "arraybuffer":
        return decodeDataUriArrayBuffer(isBase64, data);
      case "blob":
        var buffer = decodeDataUriArrayBuffer(isBase64, data);
        return new Blob([buffer], {
          type: mimeType,
        });
      case "document":
        var parser = new DOMParser();
        return parser.parseFromString(
          decodeDataUriText(isBase64, data),
          mimeType
        );
      case "json":
        return JSON.parse(decodeDataUriText(isBase64, data));
      default:
        //>>includeStart('debug', pragmas.debug);
        throw new Check.DeveloperError("Unhandled responseType: " + responseType);
      //>>includeEnd('debug');
    }
  }

  /**
   * Asynchronously loads the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. It's recommended that you use
   * the more specific functions eg. fetchJson, fetchBlob, etc.
   *
   * @param {Object} [options] Object with the following properties:
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.fetch()
   *   .then(function(body) {
   *       // use the data
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.fetch = function (options) {
    options = defaultClone(options, {});
    options.method = "GET";

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls fetch() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.fetch = function (options) {
    var resource = new Resource(options);
    return resource.fetch({
      // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
    });
  };

  /**
   * Asynchronously deletes the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @param {Object} [options] Object with the following properties:
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.delete()
   *   .then(function(body) {
   *       // use the data
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.delete = function (options) {
    options = defaultClone(options, {});
    options.method = "DELETE";

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls delete() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.data] Data that is posted with the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.delete = function (options) {
    var resource = new Resource(options);
    return resource.delete({
      // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
      data: options.data,
    });
  };

  /**
   * Asynchronously gets headers the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @param {Object} [options] Object with the following properties:
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.head()
   *   .then(function(headers) {
   *       // use the data
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.head = function (options) {
    options = defaultClone(options, {});
    options.method = "HEAD";

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls head() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.head = function (options) {
    var resource = new Resource(options);
    return resource.head({
      // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
    });
  };

  /**
   * Asynchronously gets options the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @param {Object} [options] Object with the following properties:
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.options()
   *   .then(function(headers) {
   *       // use the data
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.options = function (options) {
    options = defaultClone(options, {});
    options.method = "OPTIONS";

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls options() on it.
   *
   * @param {String|Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.options = function (options) {
    var resource = new Resource(options);
    return resource.options({
      // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
    });
  };

  /**
   * Asynchronously posts data to the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @param {Object} data Data that is posted with the resource.
   * @param {Object} [options] Object with the following properties:
   * @param {Object} [options.data] Data that is posted with the resource.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.post(data)
   *   .then(function(result) {
   *       // use the result
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.post = function (data, options) {
    Check.Check.defined("data", data);

    options = defaultClone(options, {});
    options.method = "POST";
    options.data = data;

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls post() on it.
   *
   * @param {Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} options.data Data that is posted with the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.post = function (options) {
    var resource = new Resource(options);
    return resource.post(options.data, {
      // Make copy of just the needed fields because headers can be passed to both the constructor and to post
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
    });
  };

  /**
   * Asynchronously puts data to the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @param {Object} data Data that is posted with the resource.
   * @param {Object} [options] Object with the following properties:
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.put(data)
   *   .then(function(result) {
   *       // use the result
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.put = function (data, options) {
    Check.Check.defined("data", data);

    options = defaultClone(options, {});
    options.method = "PUT";
    options.data = data;

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls put() on it.
   *
   * @param {Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} options.data Data that is posted with the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.put = function (options) {
    var resource = new Resource(options);
    return resource.put(options.data, {
      // Make copy of just the needed fields because headers can be passed to both the constructor and to post
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
    });
  };

  /**
   * Asynchronously patches data to the given resource.  Returns a promise that will resolve to
   * the result once loaded, or reject if the resource failed to load.  The data is loaded
   * using XMLHttpRequest, which means that in order to make requests to another origin,
   * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
   *
   * @param {Object} data Data that is posted with the resource.
   * @param {Object} [options] Object with the following properties:
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   *
   *
   * @example
   * resource.patch(data)
   *   .then(function(result) {
   *       // use the result
   *   }).otherwise(function(error) {
   *       // an error occurred
   *   });
   *
   * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
   * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
   */
  Resource.prototype.patch = function (data, options) {
    Check.Check.defined("data", data);

    options = defaultClone(options, {});
    options.method = "PATCH";
    options.data = data;

    return this._makeRequest(options);
  };

  /**
   * Creates a Resource from a URL and calls patch() on it.
   *
   * @param {Object} options A url or an object with the following properties
   * @param {String} options.url The url of the resource.
   * @param {Object} options.data Data that is posted with the resource.
   * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
   * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
   * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
   * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
   * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
   * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
   * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
   * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
   * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
   * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
   */
  Resource.patch = function (options) {
    var resource = new Resource(options);
    return resource.patch(options.data, {
      // Make copy of just the needed fields because headers can be passed to both the constructor and to post
      responseType: options.responseType,
      overrideMimeType: options.overrideMimeType,
    });
  };

  /**
   * Contains implementations of functions that can be replaced for testing
   *
   * @private
   */
  Resource._Implementations = {};

  function loadImageElement(url, crossOrigin, deferred) {
    var image = new Image();

    image.onload = function () {
      deferred.resolve(image);
    };

    image.onerror = function (e) {
      deferred.reject(e);
    };

    if (crossOrigin) {
      if (TrustedServers.contains(url)) {
        image.crossOrigin = "use-credentials";
      } else {
        image.crossOrigin = "";
      }
    }

    image.src = url;
  }

  Resource._Implementations.createImage = function (
    request,
    crossOrigin,
    deferred,
    flipY,
    preferImageBitmap
  ) {
    var url = request.url;
    // Passing an Image to createImageBitmap will force it to run on the main thread
    // since DOM elements don't exist on workers. We convert it to a blob so it's non-blocking.
    // See:
    //    https://bugzilla.mozilla.org/show_bug.cgi?id=1044102#c38
    //    https://bugs.chromium.org/p/chromium/issues/detail?id=580202#c10
    Resource.supportsImageBitmapOptions()
      .then(function (supportsImageBitmap) {
        // We can only use ImageBitmap if we can flip on decode.
        // See: https://github.com/CesiumGS/cesium/pull/7579#issuecomment-466146898
        if (!(supportsImageBitmap && preferImageBitmap)) {
          loadImageElement(url, crossOrigin, deferred);
          return;
        }
        var responseType = "blob";
        var method = "GET";
        var xhrDeferred = when.when.defer();
        var xhr = Resource._Implementations.loadWithXhr(
          url,
          responseType,
          method,
          undefined,
          undefined,
          xhrDeferred,
          undefined,
          undefined,
          undefined
        );

        if (when.defined(xhr) && when.defined(xhr.abort)) {
          request.cancelFunction = function () {
            xhr.abort();
          };
        }
        return xhrDeferred.promise
          .then(function (blob) {
            if (!when.defined(blob)) {
              deferred.reject(
                new RuntimeError.RuntimeError(
                  "Successfully retrieved " +
                    url +
                    " but it contained no content."
                )
              );
              return;
            }

            return Resource.createImageBitmapFromBlob(blob, {
              flipY: flipY,
              premultiplyAlpha: false,
            });
          })
          .then(deferred.resolve);
      })
      .otherwise(deferred.reject);
  };

  /**
   * Wrapper for createImageBitmap
   *
   * @private
   */
  Resource.createImageBitmapFromBlob = function (blob, options) {
    Check.Check.defined("options", options);
    Check.Check.typeOf.bool("options.flipY", options.flipY);
    Check.Check.typeOf.bool("options.premultiplyAlpha", options.premultiplyAlpha);

    return createImageBitmap(blob, {
      imageOrientation: options.flipY ? "flipY" : "none",
      premultiplyAlpha: options.premultiplyAlpha ? "premultiply" : "none",
    });
  };

  function decodeResponse(loadWithHttpResponse, responseType) {
    switch (responseType) {
      case "text":
        return loadWithHttpResponse.toString("utf8");
      case "json":
        return JSON.parse(loadWithHttpResponse.toString("utf8"));
      default:
        return new Uint8Array(loadWithHttpResponse).buffer;
    }
  }

  function loadWithHttpRequest(
    url,
    responseType,
    method,
    data,
    headers,
    deferred,
    overrideMimeType
  ) {
    // Note: only the 'json' and 'text' responseTypes transforms the loaded buffer
    /* eslint-disable no-undef */
    var URL = require("url").parse(url);
    var http = URL.protocol === "https:" ? require("https") : require("http");
    var zlib = require("zlib");
    /* eslint-enable no-undef */

    var options = {
      protocol: URL.protocol,
      hostname: URL.hostname,
      port: URL.port,
      path: URL.path,
      query: URL.query,
      method: method,
      headers: headers,
    };

    http
      .request(options)
      .on("response", function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          deferred.reject(
            new RequestErrorEvent(res.statusCode, res, res.headers)
          );
          return;
        }

        var chunkArray = [];
        res.on("data", function (chunk) {
          chunkArray.push(chunk);
        });

        res.on("end", function () {
          // eslint-disable-next-line no-undef
          var result = Buffer.concat(chunkArray);
          if (res.headers["content-encoding"] === "gzip") {
            zlib.gunzip(result, function (error, resultUnzipped) {
              if (error) {
                deferred.reject(
                  new RuntimeError.RuntimeError("Error decompressing response.")
                );
              } else {
                deferred.resolve(decodeResponse(resultUnzipped, responseType));
              }
            });
          } else {
            deferred.resolve(decodeResponse(result, responseType));
          }
        });
      })
      .on("error", function (e) {
        deferred.reject(new RequestErrorEvent());
      })
      .end();
  }

  var noXMLHttpRequest = typeof XMLHttpRequest === "undefined";
  Resource._Implementations.loadWithXhr = function (
    url,
    responseType,
    method,
    data,
    headers,
    deferred,
    overrideMimeType
  ) {
    var dataUriRegexResult = dataUriRegex.exec(url);
    if (dataUriRegexResult !== null) {
      deferred.resolve(decodeDataUri(dataUriRegexResult, responseType));
      return;
    }

    if (noXMLHttpRequest) {
      loadWithHttpRequest(
        url,
        responseType,
        method,
        data,
        headers,
        deferred);
      return;
    }

    var xhr = new XMLHttpRequest();

    if (TrustedServers.contains(url)) {
      xhr.withCredentials = true;
    }

    xhr.open(method, url, true);

    if (when.defined(overrideMimeType) && when.defined(xhr.overrideMimeType)) {
      xhr.overrideMimeType(overrideMimeType);
    }

    if (when.defined(headers)) {
      for (var key in headers) {
        if (headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
    }

    if (when.defined(responseType)) {
      xhr.responseType = responseType;
    }

    // While non-standard, file protocol always returns a status of 0 on success
    var localFile = false;
    if (typeof url === "string") {
      localFile =
        url.indexOf("file://") === 0 ||
        (typeof window !== "undefined" && window.location.origin === "file://");
    }

    xhr.onload = function () {
      if (
        (xhr.status < 200 || xhr.status >= 300) &&
        !(localFile && xhr.status === 0)
      ) {
        deferred.reject(
          new RequestErrorEvent(
            xhr.status,
            xhr.response,
            xhr.getAllResponseHeaders()
          )
        );
        return;
      }

      var response = xhr.response;
      var browserResponseType = xhr.responseType;

      if (method === "HEAD" || method === "OPTIONS") {
        var responseHeaderString = xhr.getAllResponseHeaders();
        var splitHeaders = responseHeaderString.trim().split(/[\r\n]+/);

        var responseHeaders = {};
        splitHeaders.forEach(function (line) {
          var parts = line.split(": ");
          var header = parts.shift();
          responseHeaders[header] = parts.join(": ");
        });

        deferred.resolve(responseHeaders);
        return;
      }

      //All modern browsers will go into either the first or second if block or last else block.
      //Other code paths support older browsers that either do not support the supplied responseType
      //or do not support the xhr.response property.
      if (xhr.status === 204) {
        // accept no content
        deferred.resolve();
      } else if (
        when.defined(response) &&
        (!when.defined(responseType) || browserResponseType === responseType)
      ) {
        deferred.resolve(response);
      } else if (responseType === "json" && typeof response === "string") {
        try {
          deferred.resolve(JSON.parse(response));
        } catch (e) {
          deferred.reject(e);
        }
      } else if (
        (browserResponseType === "" || browserResponseType === "document") &&
        when.defined(xhr.responseXML) &&
        xhr.responseXML.hasChildNodes()
      ) {
        deferred.resolve(xhr.responseXML);
      } else if (
        (browserResponseType === "" || browserResponseType === "text") &&
        when.defined(xhr.responseText)
      ) {
        deferred.resolve(xhr.responseText);
      } else {
        deferred.reject(
          new RuntimeError.RuntimeError("Invalid XMLHttpRequest response type.")
        );
      }
    };

    xhr.onerror = function (e) {
      deferred.reject(new RequestErrorEvent());
    };

    xhr.send(data);

    return xhr;
  };

  Resource._Implementations.loadAndExecuteScript = function (
    url,
    functionName,
    deferred
  ) {
    return loadAndExecuteScript(url).otherwise(deferred.reject);
  };

  /**
   * The default implementations
   *
   * @private
   */
  Resource._DefaultImplementations = {};
  Resource._DefaultImplementations.createImage =
    Resource._Implementations.createImage;
  Resource._DefaultImplementations.loadWithXhr =
    Resource._Implementations.loadWithXhr;
  Resource._DefaultImplementations.loadAndExecuteScript =
    Resource._Implementations.loadAndExecuteScript;

  /**
   * A resource instance initialized to the current browser location
   *
   * @type {Resource}
   * @constant
   */
  Resource.DEFAULT = Object.freeze(
    new Resource({
      url:
        typeof document === "undefined"
          ? ""
          : document.location.href.split("?")[0],
    })
  );

  /**
   * Specifies Earth polar motion coordinates and the difference between UT1 and UTC.
   * These Earth Orientation Parameters (EOP) are primarily used in the transformation from
   * the International Celestial Reference Frame (ICRF) to the International Terrestrial
   * Reference Frame (ITRF).
   *
   * @alias EarthOrientationParameters
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {Resource|String} [options.url] The URL from which to obtain EOP data.  If neither this
   *                 parameter nor options.data is specified, all EOP values are assumed
   *                 to be 0.0.  If options.data is specified, this parameter is
   *                 ignored.
   * @param {Object} [options.data] The actual EOP data.  If neither this
   *                 parameter nor options.data is specified, all EOP values are assumed
   *                 to be 0.0.
   * @param {Boolean} [options.addNewLeapSeconds=true] True if leap seconds that
   *                  are specified in the EOP data but not in {@link JulianDate.leapSeconds}
   *                  should be added to {@link JulianDate.leapSeconds}.  False if
   *                  new leap seconds should be handled correctly in the context
   *                  of the EOP data but otherwise ignored.
   *
   * @example
   * // An example EOP data file, EOP.json:
   * {
   *   "columnNames" : ["dateIso8601","modifiedJulianDateUtc","xPoleWanderRadians","yPoleWanderRadians","ut1MinusUtcSeconds","lengthOfDayCorrectionSeconds","xCelestialPoleOffsetRadians","yCelestialPoleOffsetRadians","taiMinusUtcSeconds"],
   *   "samples" : [
   *      "2011-07-01T00:00:00Z",55743.0,2.117957047295119e-7,2.111518721609984e-6,-0.2908948,-2.956e-4,3.393695767766752e-11,3.3452143996557983e-10,34.0,
   *      "2011-07-02T00:00:00Z",55744.0,2.193297093339541e-7,2.115460256837405e-6,-0.29065,-1.824e-4,-8.241832578862112e-11,5.623838700870617e-10,34.0,
   *      "2011-07-03T00:00:00Z",55745.0,2.262286080161428e-7,2.1191157519929706e-6,-0.2905572,1.9e-6,-3.490658503988659e-10,6.981317007977318e-10,34.0
   *   ]
   * }
   *
   * @example
   * // Loading the EOP data
   * var eop = new Cesium.EarthOrientationParameters({ url : 'Data/EOP.json' });
   * Cesium.Transforms.earthOrientationParameters = eop;
   *
   * @private
   */
  function EarthOrientationParameters(options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);

    this._dates = undefined;
    this._samples = undefined;

    this._dateColumn = -1;
    this._xPoleWanderRadiansColumn = -1;
    this._yPoleWanderRadiansColumn = -1;
    this._ut1MinusUtcSecondsColumn = -1;
    this._xCelestialPoleOffsetRadiansColumn = -1;
    this._yCelestialPoleOffsetRadiansColumn = -1;
    this._taiMinusUtcSecondsColumn = -1;

    this._columnCount = 0;
    this._lastIndex = -1;

    this._downloadPromise = undefined;
    this._dataError = undefined;

    this._addNewLeapSeconds = when.defaultValue(options.addNewLeapSeconds, true);

    if (when.defined(options.data)) {
      // Use supplied EOP data.
      onDataReady(this, options.data);
    } else if (when.defined(options.url)) {
      var resource = Resource.createIfNeeded(options.url);

      // Download EOP data.
      var that = this;
      this._downloadPromise = resource
        .fetchJson()
        .then(function (eopData) {
          onDataReady(that, eopData);
        })
        .otherwise(function () {
          that._dataError =
            "An error occurred while retrieving the EOP data from the URL " +
            resource.url +
            ".";
        });
    } else {
      // Use all zeros for EOP data.
      onDataReady(this, {
        columnNames: [
          "dateIso8601",
          "modifiedJulianDateUtc",
          "xPoleWanderRadians",
          "yPoleWanderRadians",
          "ut1MinusUtcSeconds",
          "lengthOfDayCorrectionSeconds",
          "xCelestialPoleOffsetRadians",
          "yCelestialPoleOffsetRadians",
          "taiMinusUtcSeconds",
        ],
        samples: [],
      });
    }
  }

  /**
   * A default {@link EarthOrientationParameters} instance that returns zero for all EOP values.
   */
  EarthOrientationParameters.NONE = Object.freeze({
    getPromiseToLoad: function () {
      return when.when.resolve();
    },
    compute: function (date, result) {
      if (!when.defined(result)) {
        result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
      } else {
        result.xPoleWander = 0.0;
        result.yPoleWander = 0.0;
        result.xPoleOffset = 0.0;
        result.yPoleOffset = 0.0;
        result.ut1MinusUtc = 0.0;
      }
      return result;
    },
  });

  /**
   * Gets a promise that, when resolved, indicates that the EOP data has been loaded and is
   * ready to use.
   *
   * @returns {Promise<void>} The promise.
   */
  EarthOrientationParameters.prototype.getPromiseToLoad = function () {
    return when.when(this._downloadPromise);
  };

  /**
   * Computes the Earth Orientation Parameters (EOP) for a given date by interpolating.
   * If the EOP data has not yet been download, this method returns undefined.
   *
   * @param {JulianDate} date The date for each to evaluate the EOP.
   * @param {EarthOrientationParametersSample} [result] The instance to which to copy the result.
   *        If this parameter is undefined, a new instance is created and returned.
   * @returns {EarthOrientationParametersSample} The EOP evaluated at the given date, or
   *          undefined if the data necessary to evaluate EOP at the date has not yet been
   *          downloaded.
   *
   * @exception {RuntimeError} The loaded EOP data has an error and cannot be used.
   *
   * @see EarthOrientationParameters#getPromiseToLoad
   */
  EarthOrientationParameters.prototype.compute = function (date, result) {
    // We cannot compute until the samples are available.
    if (!when.defined(this._samples)) {
      if (when.defined(this._dataError)) {
        throw new RuntimeError.RuntimeError(this._dataError);
      }

      return undefined;
    }

    if (!when.defined(result)) {
      result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
    }

    if (this._samples.length === 0) {
      result.xPoleWander = 0.0;
      result.yPoleWander = 0.0;
      result.xPoleOffset = 0.0;
      result.yPoleOffset = 0.0;
      result.ut1MinusUtc = 0.0;
      return result;
    }

    var dates = this._dates;
    var lastIndex = this._lastIndex;

    var before = 0;
    var after = 0;
    if (when.defined(lastIndex)) {
      var previousIndexDate = dates[lastIndex];
      var nextIndexDate = dates[lastIndex + 1];
      var isAfterPrevious = JulianDate.lessThanOrEquals(previousIndexDate, date);
      var isAfterLastSample = !when.defined(nextIndexDate);
      var isBeforeNext =
        isAfterLastSample || JulianDate.greaterThanOrEquals(nextIndexDate, date);

      if (isAfterPrevious && isBeforeNext) {
        before = lastIndex;

        if (!isAfterLastSample && nextIndexDate.equals(date)) {
          ++before;
        }
        after = before + 1;

        interpolate(this, dates, this._samples, date, before, after, result);
        return result;
      }
    }

    var index = binarySearch(dates, date, JulianDate.compare, this._dateColumn);
    if (index >= 0) {
      // If the next entry is the same date, use the later entry.  This way, if two entries
      // describe the same moment, one before a leap second and the other after, then we will use
      // the post-leap second data.
      if (index < dates.length - 1 && dates[index + 1].equals(date)) {
        ++index;
      }
      before = index;
      after = index;
    } else {
      after = ~index;
      before = after - 1;

      // Use the first entry if the date requested is before the beginning of the data.
      if (before < 0) {
        before = 0;
      }
    }

    this._lastIndex = before;

    interpolate(this, dates, this._samples, date, before, after, result);
    return result;
  };

  function compareLeapSecondDates(leapSecond, dateToFind) {
    return JulianDate.compare(leapSecond.julianDate, dateToFind);
  }

  function onDataReady(eop, eopData) {
    if (!when.defined(eopData.columnNames)) {
      eop._dataError =
        "Error in loaded EOP data: The columnNames property is required.";
      return;
    }

    if (!when.defined(eopData.samples)) {
      eop._dataError =
        "Error in loaded EOP data: The samples property is required.";
      return;
    }

    var dateColumn = eopData.columnNames.indexOf("modifiedJulianDateUtc");
    var xPoleWanderRadiansColumn = eopData.columnNames.indexOf(
      "xPoleWanderRadians"
    );
    var yPoleWanderRadiansColumn = eopData.columnNames.indexOf(
      "yPoleWanderRadians"
    );
    var ut1MinusUtcSecondsColumn = eopData.columnNames.indexOf(
      "ut1MinusUtcSeconds"
    );
    var xCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
      "xCelestialPoleOffsetRadians"
    );
    var yCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
      "yCelestialPoleOffsetRadians"
    );
    var taiMinusUtcSecondsColumn = eopData.columnNames.indexOf(
      "taiMinusUtcSeconds"
    );

    if (
      dateColumn < 0 ||
      xPoleWanderRadiansColumn < 0 ||
      yPoleWanderRadiansColumn < 0 ||
      ut1MinusUtcSecondsColumn < 0 ||
      xCelestialPoleOffsetRadiansColumn < 0 ||
      yCelestialPoleOffsetRadiansColumn < 0 ||
      taiMinusUtcSecondsColumn < 0
    ) {
      eop._dataError =
        "Error in loaded EOP data: The columnNames property must include modifiedJulianDateUtc, xPoleWanderRadians, yPoleWanderRadians, ut1MinusUtcSeconds, xCelestialPoleOffsetRadians, yCelestialPoleOffsetRadians, and taiMinusUtcSeconds columns";
      return;
    }

    var samples = (eop._samples = eopData.samples);
    var dates = (eop._dates = []);

    eop._dateColumn = dateColumn;
    eop._xPoleWanderRadiansColumn = xPoleWanderRadiansColumn;
    eop._yPoleWanderRadiansColumn = yPoleWanderRadiansColumn;
    eop._ut1MinusUtcSecondsColumn = ut1MinusUtcSecondsColumn;
    eop._xCelestialPoleOffsetRadiansColumn = xCelestialPoleOffsetRadiansColumn;
    eop._yCelestialPoleOffsetRadiansColumn = yCelestialPoleOffsetRadiansColumn;
    eop._taiMinusUtcSecondsColumn = taiMinusUtcSecondsColumn;

    eop._columnCount = eopData.columnNames.length;
    eop._lastIndex = undefined;

    var lastTaiMinusUtc;

    var addNewLeapSeconds = eop._addNewLeapSeconds;

    // Convert the ISO8601 dates to JulianDates.
    for (var i = 0, len = samples.length; i < len; i += eop._columnCount) {
      var mjd = samples[i + dateColumn];
      var taiMinusUtc = samples[i + taiMinusUtcSecondsColumn];
      var day = mjd + TimeConstants$1.MODIFIED_JULIAN_DATE_DIFFERENCE;
      var date = new JulianDate(day, taiMinusUtc, TimeStandard$1.TAI);
      dates.push(date);

      if (addNewLeapSeconds) {
        if (taiMinusUtc !== lastTaiMinusUtc && when.defined(lastTaiMinusUtc)) {
          // We crossed a leap second boundary, so add the leap second
          // if it does not already exist.
          var leapSeconds = JulianDate.leapSeconds;
          var leapSecondIndex = binarySearch(
            leapSeconds,
            date,
            compareLeapSecondDates
          );
          if (leapSecondIndex < 0) {
            var leapSecond = new LeapSecond(date, taiMinusUtc);
            leapSeconds.splice(~leapSecondIndex, 0, leapSecond);
          }
        }
        lastTaiMinusUtc = taiMinusUtc;
      }
    }
  }

  function fillResultFromIndex(eop, samples, index, columnCount, result) {
    var start = index * columnCount;
    result.xPoleWander = samples[start + eop._xPoleWanderRadiansColumn];
    result.yPoleWander = samples[start + eop._yPoleWanderRadiansColumn];
    result.xPoleOffset = samples[start + eop._xCelestialPoleOffsetRadiansColumn];
    result.yPoleOffset = samples[start + eop._yCelestialPoleOffsetRadiansColumn];
    result.ut1MinusUtc = samples[start + eop._ut1MinusUtcSecondsColumn];
  }

  function linearInterp(dx, y1, y2) {
    return y1 + dx * (y2 - y1);
  }

  function interpolate(eop, dates, samples, date, before, after, result) {
    var columnCount = eop._columnCount;

    // First check the bounds on the EOP data
    // If we are after the bounds of the data, return zeros.
    // The 'before' index should never be less than zero.
    if (after > dates.length - 1) {
      result.xPoleWander = 0;
      result.yPoleWander = 0;
      result.xPoleOffset = 0;
      result.yPoleOffset = 0;
      result.ut1MinusUtc = 0;
      return result;
    }

    var beforeDate = dates[before];
    var afterDate = dates[after];
    if (beforeDate.equals(afterDate) || date.equals(beforeDate)) {
      fillResultFromIndex(eop, samples, before, columnCount, result);
      return result;
    } else if (date.equals(afterDate)) {
      fillResultFromIndex(eop, samples, after, columnCount, result);
      return result;
    }

    var factor =
      JulianDate.secondsDifference(date, beforeDate) /
      JulianDate.secondsDifference(afterDate, beforeDate);

    var startBefore = before * columnCount;
    var startAfter = after * columnCount;

    // Handle UT1 leap second edge case
    var beforeUt1MinusUtc = samples[startBefore + eop._ut1MinusUtcSecondsColumn];
    var afterUt1MinusUtc = samples[startAfter + eop._ut1MinusUtcSecondsColumn];

    var offsetDifference = afterUt1MinusUtc - beforeUt1MinusUtc;
    if (offsetDifference > 0.5 || offsetDifference < -0.5) {
      // The absolute difference between the values is more than 0.5, so we may have
      // crossed a leap second.  Check if this is the case and, if so, adjust the
      // afterValue to account for the leap second.  This way, our interpolation will
      // produce reasonable results.
      var beforeTaiMinusUtc =
        samples[startBefore + eop._taiMinusUtcSecondsColumn];
      var afterTaiMinusUtc = samples[startAfter + eop._taiMinusUtcSecondsColumn];
      if (beforeTaiMinusUtc !== afterTaiMinusUtc) {
        if (afterDate.equals(date)) {
          // If we are at the end of the leap second interval, take the second value
          // Otherwise, the interpolation below will yield the wrong side of the
          // discontinuity
          // At the end of the leap second, we need to start accounting for the jump
          beforeUt1MinusUtc = afterUt1MinusUtc;
        } else {
          // Otherwise, remove the leap second so that the interpolation is correct
          afterUt1MinusUtc -= afterTaiMinusUtc - beforeTaiMinusUtc;
        }
      }
    }

    result.xPoleWander = linearInterp(
      factor,
      samples[startBefore + eop._xPoleWanderRadiansColumn],
      samples[startAfter + eop._xPoleWanderRadiansColumn]
    );
    result.yPoleWander = linearInterp(
      factor,
      samples[startBefore + eop._yPoleWanderRadiansColumn],
      samples[startAfter + eop._yPoleWanderRadiansColumn]
    );
    result.xPoleOffset = linearInterp(
      factor,
      samples[startBefore + eop._xCelestialPoleOffsetRadiansColumn],
      samples[startAfter + eop._xCelestialPoleOffsetRadiansColumn]
    );
    result.yPoleOffset = linearInterp(
      factor,
      samples[startBefore + eop._yCelestialPoleOffsetRadiansColumn],
      samples[startAfter + eop._yCelestialPoleOffsetRadiansColumn]
    );
    result.ut1MinusUtc = linearInterp(
      factor,
      beforeUt1MinusUtc,
      afterUt1MinusUtc
    );
    return result;
  }

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
    this.heading = when.defaultValue(heading, 0.0);
    /**
     * Gets or sets the pitch.
     * @type {Number}
     * @default 0.0
     */
    this.pitch = when.defaultValue(pitch, 0.0);
    /**
     * Gets or sets the roll.
     * @type {Number}
     * @default 0.0
     */
    this.roll = when.defaultValue(roll, 0.0);
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
    if (!when.defined(quaternion)) {
      throw new Check.DeveloperError("quaternion is required");
    }
    //>>includeEnd('debug');
    if (!when.defined(result)) {
      result = new HeadingPitchRoll();
    }
    var test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x);
    var denominatorRoll =
      1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y);
    var numeratorRoll =
      2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z);
    var denominatorHeading =
      1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z);
    var numeratorHeading =
      2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y);
    result.heading = -Math.atan2(numeratorHeading, denominatorHeading);
    result.roll = Math.atan2(numeratorRoll, denominatorRoll);
    result.pitch = -_Math.CesiumMath.asinClamped(test);
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
    if (!when.defined(heading)) {
      throw new Check.DeveloperError("heading is required");
    }
    if (!when.defined(pitch)) {
      throw new Check.DeveloperError("pitch is required");
    }
    if (!when.defined(roll)) {
      throw new Check.DeveloperError("roll is required");
    }
    //>>includeEnd('debug');
    if (!when.defined(result)) {
      result = new HeadingPitchRoll();
    }
    result.heading = heading * _Math.CesiumMath.RADIANS_PER_DEGREE;
    result.pitch = pitch * _Math.CesiumMath.RADIANS_PER_DEGREE;
    result.roll = roll * _Math.CesiumMath.RADIANS_PER_DEGREE;
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
    if (!when.defined(headingPitchRoll)) {
      return undefined;
    }
    if (!when.defined(result)) {
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
      (when.defined(left) &&
        when.defined(right) &&
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
      (when.defined(left) &&
        when.defined(right) &&
        _Math.CesiumMath.equalsEpsilon(
          left.heading,
          right.heading,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        _Math.CesiumMath.equalsEpsilon(
          left.pitch,
          right.pitch,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        _Math.CesiumMath.equalsEpsilon(
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
    return "(" + this.heading + ", " + this.pitch + ", " + this.roll + ")";
  };

  /*global CESIUM_BASE_URL*/

  var cesiumScriptRegex = /((?:.*\/)|^)Cesium\.js(?:\?|\#|$)/;
  function getBaseUrlFromCesiumScript() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0, len = scripts.length; i < len; ++i) {
      var src = scripts[i].getAttribute("src");
      var result = cesiumScriptRegex.exec(src);
      if (result !== null) {
        return result[1];
      }
    }
    return undefined;
  }

  var a;
  function tryMakeAbsolute(url) {
    if (typeof document === "undefined") {
      //Node.js and Web Workers. In both cases, the URL will already be absolute.
      return url;
    }

    if (!when.defined(a)) {
      a = document.createElement("a");
    }
    a.href = url;

    // IE only absolutizes href on get, not set
    // eslint-disable-next-line no-self-assign
    a.href = a.href;
    return a.href;
  }

  var baseResource;
  function getCesiumBaseUrl() {
    if (when.defined(baseResource)) {
      return baseResource;
    }

    var baseUrlString;
    if (typeof CESIUM_BASE_URL !== "undefined") {
      baseUrlString = CESIUM_BASE_URL;
    } else if (
      typeof define === "object" &&
      when.defined(define.amd) &&
      !define.amd.toUrlUndefined &&
      when.defined(require.toUrl)
    ) {
      baseUrlString = getAbsoluteUri(
        "..",
        buildModuleUrl("Core/buildModuleUrl.js")
      );
    } else {
      baseUrlString = getBaseUrlFromCesiumScript();
    }

    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(baseUrlString)) {
      throw new Check.DeveloperError(
        "Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL."
      );
    }
    //>>includeEnd('debug');

    baseResource = new Resource({
      url: tryMakeAbsolute(baseUrlString),
    });
    baseResource.appendForwardSlash();

    return baseResource;
  }

  function buildModuleUrlFromRequireToUrl(moduleID) {
    //moduleID will be non-relative, so require it relative to this module, in Core.
    return tryMakeAbsolute(require.toUrl("../" + moduleID));
  }

  function buildModuleUrlFromBaseUrl(moduleID) {
    var resource = getCesiumBaseUrl().getDerivedResource({
      url: moduleID,
    });
    return resource.url;
  }

  var implementation;

  /**
   * Given a relative URL under the Cesium base URL, returns an absolute URL.
   * @function
   *
   * @param {String} relativeUrl The relative path.
   * @returns {String} The absolutely URL representation of the provided path.
   *
   * @example
   * var viewer = new Cesium.Viewer("cesiumContainer", {
   *   imageryProvider: new Cesium.TileMapServiceImageryProvider({
   *   url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
   *   }),
   *   baseLayerPicker: false,
   * });
   */
  function buildModuleUrl(relativeUrl) {
    if (!when.defined(implementation)) {
      //select implementation
      if (
        typeof define === "object" &&
        when.defined(define.amd) &&
        !define.amd.toUrlUndefined &&
        when.defined(require.toUrl)
      ) {
        implementation = buildModuleUrlFromRequireToUrl;
      } else {
        implementation = buildModuleUrlFromBaseUrl;
      }
    }

    var url = implementation(relativeUrl);
    return url;
  }

  // exposed for testing
  buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;
  buildModuleUrl._buildModuleUrlFromBaseUrl = buildModuleUrlFromBaseUrl;
  buildModuleUrl._clearBaseResource = function () {
    baseResource = undefined;
  };

  /**
   * Sets the base URL for resolving modules.
   * @param {String} value The new base URL.
   */
  buildModuleUrl.setBaseUrl = function (value) {
    baseResource = Resource.DEFAULT.getDerivedResource({
      url: value,
    });
  };

  /**
   * Gets the base URL for resolving modules.
   */
  buildModuleUrl.getCesiumBaseUrl = getCesiumBaseUrl;

  /**
   * An IAU 2006 XYS value sampled at a particular time.
   *
   * @alias Iau2006XysSample
   * @constructor
   *
   * @param {Number} x The X value.
   * @param {Number} y The Y value.
   * @param {Number} s The S value.
   *
   * @private
   */
  function Iau2006XysSample(x, y, s) {
    /**
     * The X value.
     * @type {Number}
     */
    this.x = x;

    /**
     * The Y value.
     * @type {Number}
     */
    this.y = y;

    /**
     * The S value.
     * @type {Number}
     */
    this.s = s;
  }

  /**
   * A set of IAU2006 XYS data that is used to evaluate the transformation between the International
   * Celestial Reference Frame (ICRF) and the International Terrestrial Reference Frame (ITRF).
   *
   * @alias Iau2006XysData
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {Resource|String} [options.xysFileUrlTemplate='Assets/IAU2006_XYS/IAU2006_XYS_{0}.json'] A template URL for obtaining the XYS data.  In the template,
   *                 `{0}` will be replaced with the file index.
   * @param {Number} [options.interpolationOrder=9] The order of interpolation to perform on the XYS data.
   * @param {Number} [options.sampleZeroJulianEphemerisDate=2442396.5] The Julian ephemeris date (JED) of the
   *                 first XYS sample.
   * @param {Number} [options.stepSizeDays=1.0] The step size, in days, between successive XYS samples.
   * @param {Number} [options.samplesPerXysFile=1000] The number of samples in each XYS file.
   * @param {Number} [options.totalSamples=27426] The total number of samples in all XYS files.
   *
   * @private
   */
  function Iau2006XysData(options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);

    this._xysFileUrlTemplate = Resource.createIfNeeded(
      options.xysFileUrlTemplate
    );
    this._interpolationOrder = when.defaultValue(options.interpolationOrder, 9);
    this._sampleZeroJulianEphemerisDate = when.defaultValue(
      options.sampleZeroJulianEphemerisDate,
      2442396.5
    );
    this._sampleZeroDateTT = new JulianDate(
      this._sampleZeroJulianEphemerisDate,
      0.0,
      TimeStandard$1.TAI
    );
    this._stepSizeDays = when.defaultValue(options.stepSizeDays, 1.0);
    this._samplesPerXysFile = when.defaultValue(options.samplesPerXysFile, 1000);
    this._totalSamples = when.defaultValue(options.totalSamples, 27426);
    this._samples = new Array(this._totalSamples * 3);
    this._chunkDownloadsInProgress = [];

    var order = this._interpolationOrder;

    // Compute denominators and X values for interpolation.
    var denom = (this._denominators = new Array(order + 1));
    var xTable = (this._xTable = new Array(order + 1));

    var stepN = Math.pow(this._stepSizeDays, order);

    for (var i = 0; i <= order; ++i) {
      denom[i] = stepN;
      xTable[i] = i * this._stepSizeDays;

      for (var j = 0; j <= order; ++j) {
        if (j !== i) {
          denom[i] *= i - j;
        }
      }

      denom[i] = 1.0 / denom[i];
    }

    // Allocate scratch arrays for interpolation.
    this._work = new Array(order + 1);
    this._coef = new Array(order + 1);
  }

  var julianDateScratch = new JulianDate(0, 0.0, TimeStandard$1.TAI);

  function getDaysSinceEpoch(xys, dayTT, secondTT) {
    var dateTT = julianDateScratch;
    dateTT.dayNumber = dayTT;
    dateTT.secondsOfDay = secondTT;
    return JulianDate.daysDifference(dateTT, xys._sampleZeroDateTT);
  }

  /**
   * Preloads XYS data for a specified date range.
   *
   * @param {Number} startDayTT The Julian day number of the beginning of the interval to preload, expressed in
   *                 the Terrestrial Time (TT) time standard.
   * @param {Number} startSecondTT The seconds past noon of the beginning of the interval to preload, expressed in
   *                 the Terrestrial Time (TT) time standard.
   * @param {Number} stopDayTT The Julian day number of the end of the interval to preload, expressed in
   *                 the Terrestrial Time (TT) time standard.
   * @param {Number} stopSecondTT The seconds past noon of the end of the interval to preload, expressed in
   *                 the Terrestrial Time (TT) time standard.
   * @returns {Promise<void>} A promise that, when resolved, indicates that the requested interval has been
   *                    preloaded.
   */
  Iau2006XysData.prototype.preload = function (
    startDayTT,
    startSecondTT,
    stopDayTT,
    stopSecondTT
  ) {
    var startDaysSinceEpoch = getDaysSinceEpoch(this, startDayTT, startSecondTT);
    var stopDaysSinceEpoch = getDaysSinceEpoch(this, stopDayTT, stopSecondTT);

    var startIndex =
      (startDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2) |
      0;
    if (startIndex < 0) {
      startIndex = 0;
    }

    var stopIndex =
      (stopDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2) |
      (0 + this._interpolationOrder);
    if (stopIndex >= this._totalSamples) {
      stopIndex = this._totalSamples - 1;
    }

    var startChunk = (startIndex / this._samplesPerXysFile) | 0;
    var stopChunk = (stopIndex / this._samplesPerXysFile) | 0;

    var promises = [];
    for (var i = startChunk; i <= stopChunk; ++i) {
      promises.push(requestXysChunk(this, i));
    }

    return when.when.all(promises);
  };

  /**
   * Computes the XYS values for a given date by interpolating.  If the required data is not yet downloaded,
   * this method will return undefined.
   *
   * @param {Number} dayTT The Julian day number for which to compute the XYS value, expressed in
   *                 the Terrestrial Time (TT) time standard.
   * @param {Number} secondTT The seconds past noon of the date for which to compute the XYS value, expressed in
   *                 the Terrestrial Time (TT) time standard.
   * @param {Iau2006XysSample} [result] The instance to which to copy the interpolated result.  If this parameter
   *                           is undefined, a new instance is allocated and returned.
   * @returns {Iau2006XysSample} The interpolated XYS values, or undefined if the required data for this
   *                             computation has not yet been downloaded.
   *
   * @see Iau2006XysData#preload
   */
  Iau2006XysData.prototype.computeXysRadians = function (
    dayTT,
    secondTT,
    result
  ) {
    var daysSinceEpoch = getDaysSinceEpoch(this, dayTT, secondTT);
    if (daysSinceEpoch < 0.0) {
      // Can't evaluate prior to the epoch of the data.
      return undefined;
    }

    var centerIndex = (daysSinceEpoch / this._stepSizeDays) | 0;
    if (centerIndex >= this._totalSamples) {
      // Can't evaluate after the last sample in the data.
      return undefined;
    }

    var degree = this._interpolationOrder;

    var firstIndex = centerIndex - ((degree / 2) | 0);
    if (firstIndex < 0) {
      firstIndex = 0;
    }
    var lastIndex = firstIndex + degree;
    if (lastIndex >= this._totalSamples) {
      lastIndex = this._totalSamples - 1;
      firstIndex = lastIndex - degree;
      if (firstIndex < 0) {
        firstIndex = 0;
      }
    }

    // Are all the samples we need present?
    // We can assume so if the first and last are present
    var isDataMissing = false;
    var samples = this._samples;
    if (!when.defined(samples[firstIndex * 3])) {
      requestXysChunk(this, (firstIndex / this._samplesPerXysFile) | 0);
      isDataMissing = true;
    }

    if (!when.defined(samples[lastIndex * 3])) {
      requestXysChunk(this, (lastIndex / this._samplesPerXysFile) | 0);
      isDataMissing = true;
    }

    if (isDataMissing) {
      return undefined;
    }

    if (!when.defined(result)) {
      result = new Iau2006XysSample(0.0, 0.0, 0.0);
    } else {
      result.x = 0.0;
      result.y = 0.0;
      result.s = 0.0;
    }

    var x = daysSinceEpoch - firstIndex * this._stepSizeDays;

    var work = this._work;
    var denom = this._denominators;
    var coef = this._coef;
    var xTable = this._xTable;

    var i, j;
    for (i = 0; i <= degree; ++i) {
      work[i] = x - xTable[i];
    }

    for (i = 0; i <= degree; ++i) {
      coef[i] = 1.0;

      for (j = 0; j <= degree; ++j) {
        if (j !== i) {
          coef[i] *= work[j];
        }
      }

      coef[i] *= denom[i];

      var sampleIndex = (firstIndex + i) * 3;
      result.x += coef[i] * samples[sampleIndex++];
      result.y += coef[i] * samples[sampleIndex++];
      result.s += coef[i] * samples[sampleIndex];
    }

    return result;
  };

  function requestXysChunk(xysData, chunkIndex) {
    if (xysData._chunkDownloadsInProgress[chunkIndex]) {
      // Chunk has already been requested.
      return xysData._chunkDownloadsInProgress[chunkIndex];
    }

    var deferred = when.when.defer();

    xysData._chunkDownloadsInProgress[chunkIndex] = deferred;

    var chunkUrl;
    var xysFileUrlTemplate = xysData._xysFileUrlTemplate;
    if (when.defined(xysFileUrlTemplate)) {
      chunkUrl = xysFileUrlTemplate.getDerivedResource({
        templateValues: {
          0: chunkIndex,
        },
      });
    } else {
      chunkUrl = new Resource({
        url: buildModuleUrl(
          "Assets/IAU2006_XYS/IAU2006_XYS_" + chunkIndex + ".json"
        ),
      });
    }

    when.when(chunkUrl.fetchJson(), function (chunk) {
      xysData._chunkDownloadsInProgress[chunkIndex] = false;

      var samples = xysData._samples;
      var newSamples = chunk.samples;
      var startIndex = chunkIndex * xysData._samplesPerXysFile * 3;

      for (var i = 0, len = newSamples.length; i < len; ++i) {
        samples[startIndex + i] = newSamples[i];
      }

      deferred.resolve();
    });

    return deferred.promise;
  }

  /**
   * Contains functions for transforming positions to various reference frames.
   *
   * @namespace Transforms
   */
  var Transforms = {};

  var vectorProductLocalFrame = {
    up: {
      south: "east",
      north: "west",
      west: "south",
      east: "north",
    },
    down: {
      south: "west",
      north: "east",
      west: "north",
      east: "south",
    },
    south: {
      up: "west",
      down: "east",
      west: "down",
      east: "up",
    },
    north: {
      up: "east",
      down: "west",
      west: "up",
      east: "down",
    },
    west: {
      up: "north",
      down: "south",
      north: "down",
      south: "up",
    },
    east: {
      up: "south",
      down: "north",
      north: "up",
      south: "down",
    },
  };

  var degeneratePositionLocalFrame = {
    north: [-1, 0, 0],
    east: [0, 1, 0],
    up: [0, 0, 1],
    south: [1, 0, 0],
    west: [0, -1, 0],
    down: [0, 0, -1],
  };

  var localFrameToFixedFrameCache = {};

  var scratchCalculateCartesian = {
    east: new Cartesian2.Cartesian3(),
    north: new Cartesian2.Cartesian3(),
    up: new Cartesian2.Cartesian3(),
    west: new Cartesian2.Cartesian3(),
    south: new Cartesian2.Cartesian3(),
    down: new Cartesian2.Cartesian3(),
  };
  var scratchFirstCartesian = new Cartesian2.Cartesian3();
  var scratchSecondCartesian = new Cartesian2.Cartesian3();
  var scratchThirdCartesian = new Cartesian2.Cartesian3();
  /**
   * Generates a function that computes a 4x4 transformation matrix from a reference frame
   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
   * @param  {String} firstAxis  name of the first axis of the local reference frame. Must be
   *  'east', 'north', 'up', 'west', 'south' or 'down'.
   * @param  {String} secondAxis  name of the second axis of the local reference frame. Must be
   *  'east', 'north', 'up', 'west', 'south' or 'down'.
   * @return {Transforms.LocalFrameToFixedFrame} The function that will computes a
   * 4x4 transformation matrix from a reference frame, with first axis and second axis compliant with the parameters,
   */
  Transforms.localFrameToFixedFrameGenerator = function (firstAxis, secondAxis) {
    if (
      !vectorProductLocalFrame.hasOwnProperty(firstAxis) ||
      !vectorProductLocalFrame[firstAxis].hasOwnProperty(secondAxis)
    ) {
      throw new Check.DeveloperError(
        "firstAxis and secondAxis must be east, north, up, west, south or down."
      );
    }
    var thirdAxis = vectorProductLocalFrame[firstAxis][secondAxis];

    /**
     * Computes a 4x4 transformation matrix from a reference frame
     * centered at the provided origin to the provided ellipsoid's fixed reference frame.
     * @callback Transforms.LocalFrameToFixedFrame
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     */
    var resultat;
    var hashAxis = firstAxis + secondAxis;
    if (when.defined(localFrameToFixedFrameCache[hashAxis])) {
      resultat = localFrameToFixedFrameCache[hashAxis];
    } else {
      resultat = function (origin, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!when.defined(origin)) {
          throw new Check.DeveloperError("origin is required.");
        }
        //>>includeEnd('debug');
        if (!when.defined(result)) {
          result = new Matrix4();
        }
        if (
          Cartesian2.Cartesian3.equalsEpsilon(origin, Cartesian2.Cartesian3.ZERO, _Math.CesiumMath.EPSILON14)
        ) {
          // If x, y, and z are zero, use the degenerate local frame, which is a special case
          Cartesian2.Cartesian3.unpack(
            degeneratePositionLocalFrame[firstAxis],
            0,
            scratchFirstCartesian
          );
          Cartesian2.Cartesian3.unpack(
            degeneratePositionLocalFrame[secondAxis],
            0,
            scratchSecondCartesian
          );
          Cartesian2.Cartesian3.unpack(
            degeneratePositionLocalFrame[thirdAxis],
            0,
            scratchThirdCartesian
          );
        } else if (
          _Math.CesiumMath.equalsEpsilon(origin.x, 0.0, _Math.CesiumMath.EPSILON14) &&
          _Math.CesiumMath.equalsEpsilon(origin.y, 0.0, _Math.CesiumMath.EPSILON14)
        ) {
          // If x and y are zero, assume origin is at a pole, which is a special case.
          var sign = _Math.CesiumMath.sign(origin.z);

          Cartesian2.Cartesian3.unpack(
            degeneratePositionLocalFrame[firstAxis],
            0,
            scratchFirstCartesian
          );
          if (firstAxis !== "east" && firstAxis !== "west") {
            Cartesian2.Cartesian3.multiplyByScalar(
              scratchFirstCartesian,
              sign,
              scratchFirstCartesian
            );
          }

          Cartesian2.Cartesian3.unpack(
            degeneratePositionLocalFrame[secondAxis],
            0,
            scratchSecondCartesian
          );
          if (secondAxis !== "east" && secondAxis !== "west") {
            Cartesian2.Cartesian3.multiplyByScalar(
              scratchSecondCartesian,
              sign,
              scratchSecondCartesian
            );
          }

          Cartesian2.Cartesian3.unpack(
            degeneratePositionLocalFrame[thirdAxis],
            0,
            scratchThirdCartesian
          );
          if (thirdAxis !== "east" && thirdAxis !== "west") {
            Cartesian2.Cartesian3.multiplyByScalar(
              scratchThirdCartesian,
              sign,
              scratchThirdCartesian
            );
          }
        } else {
          ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);
          ellipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up);

          var up = scratchCalculateCartesian.up;
          var east = scratchCalculateCartesian.east;
          east.x = -origin.y;
          east.y = origin.x;
          east.z = 0.0;
          Cartesian2.Cartesian3.normalize(east, scratchCalculateCartesian.east);
          Cartesian2.Cartesian3.cross(up, east, scratchCalculateCartesian.north);

          Cartesian2.Cartesian3.multiplyByScalar(
            scratchCalculateCartesian.up,
            -1,
            scratchCalculateCartesian.down
          );
          Cartesian2.Cartesian3.multiplyByScalar(
            scratchCalculateCartesian.east,
            -1,
            scratchCalculateCartesian.west
          );
          Cartesian2.Cartesian3.multiplyByScalar(
            scratchCalculateCartesian.north,
            -1,
            scratchCalculateCartesian.south
          );

          scratchFirstCartesian = scratchCalculateCartesian[firstAxis];
          scratchSecondCartesian = scratchCalculateCartesian[secondAxis];
          scratchThirdCartesian = scratchCalculateCartesian[thirdAxis];
        }
        result[0] = scratchFirstCartesian.x;
        result[1] = scratchFirstCartesian.y;
        result[2] = scratchFirstCartesian.z;
        result[3] = 0.0;
        result[4] = scratchSecondCartesian.x;
        result[5] = scratchSecondCartesian.y;
        result[6] = scratchSecondCartesian.z;
        result[7] = 0.0;
        result[8] = scratchThirdCartesian.x;
        result[9] = scratchThirdCartesian.y;
        result[10] = scratchThirdCartesian.z;
        result[11] = 0.0;
        result[12] = origin.x;
        result[13] = origin.y;
        result[14] = origin.z;
        result[15] = 1.0;
        return result;
      };
      localFrameToFixedFrameCache[hashAxis] = resultat;
    }
    return resultat;
  };

  /**
   * Computes a 4x4 transformation matrix from a reference frame with an east-north-up axes
   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
   * The local axes are defined as:
   * <ul>
   * <li>The <code>x</code> axis points in the local east direction.</li>
   * <li>The <code>y</code> axis points in the local north direction.</li>
   * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
   * </ul>
   *
   * @function
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
   *
   * @example
   * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
   * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
   */
  Transforms.eastNorthUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
    "east",
    "north"
  );

  /**
   * Computes a 4x4 transformation matrix from a reference frame with an north-east-down axes
   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
   * The local axes are defined as:
   * <ul>
   * <li>The <code>x</code> axis points in the local north direction.</li>
   * <li>The <code>y</code> axis points in the local east direction.</li>
   * <li>The <code>z</code> axis points in the opposite direction of the ellipsoid surface normal which passes through the position.</li>
   * </ul>
   *
   * @function
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
   *
   * @example
   * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
   * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var transform = Cesium.Transforms.northEastDownToFixedFrame(center);
   */
  Transforms.northEastDownToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
    "north",
    "east"
  );

  /**
   * Computes a 4x4 transformation matrix from a reference frame with an north-up-east axes
   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
   * The local axes are defined as:
   * <ul>
   * <li>The <code>x</code> axis points in the local north direction.</li>
   * <li>The <code>y</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
   * <li>The <code>z</code> axis points in the local east direction.</li>
   * </ul>
   *
   * @function
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
   *
   * @example
   * // Get the transform from local north-up-east at cartographic (0.0, 0.0) to Earth's fixed frame.
   * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var transform = Cesium.Transforms.northUpEastToFixedFrame(center);
   */
  Transforms.northUpEastToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
    "north",
    "up"
  );

  /**
   * Computes a 4x4 transformation matrix from a reference frame with an north-west-up axes
   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
   * The local axes are defined as:
   * <ul>
   * <li>The <code>x</code> axis points in the local north direction.</li>
   * <li>The <code>y</code> axis points in the local west direction.</li>
   * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
   * </ul>
   *
   * @function
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
   *
   * @example
   * // Get the transform from local north-West-Up at cartographic (0.0, 0.0) to Earth's fixed frame.
   * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var transform = Cesium.Transforms.northWestUpToFixedFrame(center);
   */
  Transforms.northWestUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
    "north",
    "west"
  );

  var scratchHPRQuaternion = new Quaternion();
  var scratchScale = new Cartesian2.Cartesian3(1.0, 1.0, 1.0);
  var scratchHPRMatrix4 = new Matrix4();

  /**
   * Computes a 4x4 transformation matrix from a reference frame with axes computed from the heading-pitch-roll angles
   * centered at the provided origin to the provided ellipsoid's fixed reference frame. Heading is the rotation from the local north
   * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
   * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
   *
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
   *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
   *
   * @example
   * // Get the transform from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
   * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var heading = -Cesium.Math.PI_OVER_TWO;
   * var pitch = Cesium.Math.PI_OVER_FOUR;
   * var roll = 0.0;
   * var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
   * var transform = Cesium.Transforms.headingPitchRollToFixedFrame(center, hpr);
   */
  Transforms.headingPitchRollToFixedFrame = function (
    origin,
    headingPitchRoll,
    ellipsoid,
    fixedFrameTransform,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
    //>>includeEnd('debug');

    fixedFrameTransform = when.defaultValue(
      fixedFrameTransform,
      Transforms.eastNorthUpToFixedFrame
    );
    var hprQuaternion = Quaternion.fromHeadingPitchRoll(
      headingPitchRoll,
      scratchHPRQuaternion
    );
    var hprMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      Cartesian2.Cartesian3.ZERO,
      hprQuaternion,
      scratchScale,
      scratchHPRMatrix4
    );
    result = fixedFrameTransform(origin, ellipsoid, result);
    return Matrix4.multiply(result, hprMatrix, result);
  };

  var scratchENUMatrix4 = new Matrix4();
  var scratchHPRMatrix3 = new Matrix3();

  /**
   * Computes a quaternion from a reference frame with axes computed from the heading-pitch-roll angles
   * centered at the provided origin. Heading is the rotation from the local north
   * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
   * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
   *
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
   *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
   * @param {Quaternion} [result] The object onto which to store the result.
   * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
   *
   * @example
   * // Get the quaternion from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
   * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var heading = -Cesium.Math.PI_OVER_TWO;
   * var pitch = Cesium.Math.PI_OVER_FOUR;
   * var roll = 0.0;
   * var hpr = new HeadingPitchRoll(heading, pitch, roll);
   * var quaternion = Cesium.Transforms.headingPitchRollQuaternion(center, hpr);
   */
  Transforms.headingPitchRollQuaternion = function (
    origin,
    headingPitchRoll,
    ellipsoid,
    fixedFrameTransform,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
    //>>includeEnd('debug');

    var transform = Transforms.headingPitchRollToFixedFrame(
      origin,
      headingPitchRoll,
      ellipsoid,
      fixedFrameTransform,
      scratchENUMatrix4
    );
    var rotation = Matrix4.getMatrix3(transform, scratchHPRMatrix3);
    return Quaternion.fromRotationMatrix(rotation, result);
  };

  var noScale = new Cartesian2.Cartesian3(1.0, 1.0, 1.0);
  var hprCenterScratch = new Cartesian2.Cartesian3();
  var ffScratch = new Matrix4();
  var hprTransformScratch = new Matrix4();
  var hprRotationScratch = new Matrix3();
  var hprQuaternionScratch = new Quaternion();
  /**
   * Computes heading-pitch-roll angles from a transform in a particular reference frame. Heading is the rotation from the local north
   * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
   * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
   *
   * @param {Matrix4} transform The transform
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
   *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
   * @param {HeadingPitchRoll} [result] The object onto which to store the result.
   * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if none was provided.
   */
  Transforms.fixedFrameToHeadingPitchRoll = function (
    transform,
    ellipsoid,
    fixedFrameTransform,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("transform", transform);
    //>>includeEnd('debug');

    ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);
    fixedFrameTransform = when.defaultValue(
      fixedFrameTransform,
      Transforms.eastNorthUpToFixedFrame
    );
    if (!when.defined(result)) {
      result = new HeadingPitchRoll();
    }

    var center = Matrix4.getTranslation(transform, hprCenterScratch);
    if (Cartesian2.Cartesian3.equals(center, Cartesian2.Cartesian3.ZERO)) {
      result.heading = 0;
      result.pitch = 0;
      result.roll = 0;
      return result;
    }
    var toFixedFrame = Matrix4.inverseTransformation(
      fixedFrameTransform(center, ellipsoid, ffScratch),
      ffScratch
    );
    var transformCopy = Matrix4.setScale(transform, noScale, hprTransformScratch);
    transformCopy = Matrix4.setTranslation(
      transformCopy,
      Cartesian2.Cartesian3.ZERO,
      transformCopy
    );

    toFixedFrame = Matrix4.multiply(toFixedFrame, transformCopy, toFixedFrame);
    var quaternionRotation = Quaternion.fromRotationMatrix(
      Matrix4.getMatrix3(toFixedFrame, hprRotationScratch),
      hprQuaternionScratch
    );
    quaternionRotation = Quaternion.normalize(
      quaternionRotation,
      quaternionRotation
    );

    return HeadingPitchRoll.fromQuaternion(quaternionRotation, result);
  };

  var gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
  var gmstConstant1 = 8640184.812866;
  var gmstConstant2 = 0.093104;
  var gmstConstant3 = -6.2e-6;
  var rateCoef = 1.1772758384668e-19;
  var wgs84WRPrecessing = 7.2921158553e-5;
  var twoPiOverSecondsInDay = _Math.CesiumMath.TWO_PI / 86400.0;
  var dateInUtc = new JulianDate();

  /**
   * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
   * pseudo-fixed axes at a given time.  This method treats the UT1 time standard as equivalent to UTC.
   *
   * @param {JulianDate} date The time at which to compute the rotation matrix.
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
   *
   * @example
   * //Set the view to the inertial frame.
   * scene.postUpdate.addEventListener(function(scene, time) {
   *    var now = Cesium.JulianDate.now();
   *    var offset = Cesium.Matrix4.multiplyByPoint(camera.transform, camera.position, new Cesium.Cartesian3());
   *    var transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Transforms.computeTemeToPseudoFixedMatrix(now));
   *    var inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
   *    Cesium.Matrix4.multiplyByPoint(inverseTransform, offset, offset);
   *    camera.lookAtTransform(transform, offset);
   * });
   */
  Transforms.computeTemeToPseudoFixedMatrix = function (date, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(date)) {
      throw new Check.DeveloperError("date is required.");
    }
    //>>includeEnd('debug');

    // GMST is actually computed using UT1.  We're using UTC as an approximation of UT1.
    // We do not want to use the function like convertTaiToUtc in JulianDate because
    // we explicitly do not want to fail when inside the leap second.

    dateInUtc = JulianDate.addSeconds(
      date,
      -JulianDate.computeTaiMinusUtc(date),
      dateInUtc
    );
    var utcDayNumber = dateInUtc.dayNumber;
    var utcSecondsIntoDay = dateInUtc.secondsOfDay;

    var t;
    var diffDays = utcDayNumber - 2451545;
    if (utcSecondsIntoDay >= 43200.0) {
      t = (diffDays + 0.5) / TimeConstants$1.DAYS_PER_JULIAN_CENTURY;
    } else {
      t = (diffDays - 0.5) / TimeConstants$1.DAYS_PER_JULIAN_CENTURY;
    }

    var gmst0 =
      gmstConstant0 +
      t * (gmstConstant1 + t * (gmstConstant2 + t * gmstConstant3));
    var angle = (gmst0 * twoPiOverSecondsInDay) % _Math.CesiumMath.TWO_PI;
    var ratio = wgs84WRPrecessing + rateCoef * (utcDayNumber - 2451545.5);
    var secondsSinceMidnight =
      (utcSecondsIntoDay + TimeConstants$1.SECONDS_PER_DAY * 0.5) %
      TimeConstants$1.SECONDS_PER_DAY;
    var gha = angle + ratio * secondsSinceMidnight;
    var cosGha = Math.cos(gha);
    var sinGha = Math.sin(gha);

    if (!when.defined(result)) {
      return new Matrix3(
        cosGha,
        sinGha,
        0.0,
        -sinGha,
        cosGha,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }
    result[0] = cosGha;
    result[1] = -sinGha;
    result[2] = 0.0;
    result[3] = sinGha;
    result[4] = cosGha;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 1.0;
    return result;
  };

  /**
   * The source of IAU 2006 XYS data, used for computing the transformation between the
   * Fixed and ICRF axes.
   * @type {Iau2006XysData}
   *
   * @see Transforms.computeIcrfToFixedMatrix
   * @see Transforms.computeFixedToIcrfMatrix
   *
   * @private
   */
  Transforms.iau2006XysData = new Iau2006XysData();

  /**
   * The source of Earth Orientation Parameters (EOP) data, used for computing the transformation
   * between the Fixed and ICRF axes.  By default, zero values are used for all EOP values,
   * yielding a reasonable but not completely accurate representation of the ICRF axes.
   * @type {EarthOrientationParameters}
   *
   * @see Transforms.computeIcrfToFixedMatrix
   * @see Transforms.computeFixedToIcrfMatrix
   *
   * @private
   */
  Transforms.earthOrientationParameters = EarthOrientationParameters.NONE;

  var ttMinusTai = 32.184;
  var j2000ttDays = 2451545.0;

  /**
   * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
   * direction, over a given interval.  This function returns a promise that, when resolved,
   * indicates that the preload has completed.
   *
   * @param {TimeInterval} timeInterval The interval to preload.
   * @returns {Promise<void>} A promise that, when resolved, indicates that the preload has completed
   *          and evaluation of the transformation between the fixed and ICRF axes will
   *          no longer return undefined for a time inside the interval.
   *
   *
   * @example
   * var interval = new Cesium.TimeInterval(...);
   * when(Cesium.Transforms.preloadIcrfFixed(interval), function() {
   *     // the data is now loaded
   * });
   *
   * @see Transforms.computeIcrfToFixedMatrix
   * @see Transforms.computeFixedToIcrfMatrix
   * @see when
   */
  Transforms.preloadIcrfFixed = function (timeInterval) {
    var startDayTT = timeInterval.start.dayNumber;
    var startSecondTT = timeInterval.start.secondsOfDay + ttMinusTai;
    var stopDayTT = timeInterval.stop.dayNumber;
    var stopSecondTT = timeInterval.stop.secondsOfDay + ttMinusTai;

    var xysPromise = Transforms.iau2006XysData.preload(
      startDayTT,
      startSecondTT,
      stopDayTT,
      stopSecondTT
    );
    var eopPromise = Transforms.earthOrientationParameters.getPromiseToLoad();

    return when.when.all([xysPromise, eopPromise]);
  };

  /**
   * Computes a rotation matrix to transform a point or vector from the International Celestial
   * Reference Frame (GCRF/ICRF) inertial frame axes to the Earth-Fixed frame axes (ITRF)
   * at a given time.  This function may return undefined if the data necessary to
   * do the transformation is not yet loaded.
   *
   * @param {JulianDate} date The time at which to compute the rotation matrix.
   * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
   *                  not specified, a new instance is created and returned.
   * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
   *                   transformation is not yet loaded.
   *
   *
   * @example
   * scene.postUpdate.addEventListener(function(scene, time) {
   *   // View in ICRF.
   *   var icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
   *   if (Cesium.defined(icrfToFixed)) {
   *     var offset = Cesium.Cartesian3.clone(camera.position);
   *     var transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
   *     camera.lookAtTransform(transform, offset);
   *   }
   * });
   *
   * @see Transforms.preloadIcrfFixed
   */
  Transforms.computeIcrfToFixedMatrix = function (date, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(date)) {
      throw new Check.DeveloperError("date is required.");
    }
    //>>includeEnd('debug');
    if (!when.defined(result)) {
      result = new Matrix3();
    }

    var fixedToIcrfMtx = Transforms.computeFixedToIcrfMatrix(date, result);
    if (!when.defined(fixedToIcrfMtx)) {
      return undefined;
    }

    return Matrix3.transpose(fixedToIcrfMtx, result);
  };

  var xysScratch = new Iau2006XysSample(0.0, 0.0, 0.0);
  var eopScratch = new EarthOrientationParametersSample(
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0
  );
  var rotation1Scratch = new Matrix3();
  var rotation2Scratch = new Matrix3();

  /**
   * Computes a rotation matrix to transform a point or vector from the Earth-Fixed frame axes (ITRF)
   * to the International Celestial Reference Frame (GCRF/ICRF) inertial frame axes
   * at a given time.  This function may return undefined if the data necessary to
   * do the transformation is not yet loaded.
   *
   * @param {JulianDate} date The time at which to compute the rotation matrix.
   * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
   *                  not specified, a new instance is created and returned.
   * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
   *                   transformation is not yet loaded.
   *
   *
   * @example
   * // Transform a point from the ICRF axes to the Fixed axes.
   * var now = Cesium.JulianDate.now();
   * var pointInFixed = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
   * var fixedToIcrf = Cesium.Transforms.computeIcrfToFixedMatrix(now);
   * var pointInInertial = new Cesium.Cartesian3();
   * if (Cesium.defined(fixedToIcrf)) {
   *     pointInInertial = Cesium.Matrix3.multiplyByVector(fixedToIcrf, pointInFixed, pointInInertial);
   * }
   *
   * @see Transforms.preloadIcrfFixed
   */
  Transforms.computeFixedToIcrfMatrix = function (date, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(date)) {
      throw new Check.DeveloperError("date is required.");
    }
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new Matrix3();
    }

    // Compute pole wander
    var eop = Transforms.earthOrientationParameters.compute(date, eopScratch);
    if (!when.defined(eop)) {
      return undefined;
    }

    // There is no external conversion to Terrestrial Time (TT).
    // So use International Atomic Time (TAI) and convert using offsets.
    // Here we are assuming that dayTT and secondTT are positive
    var dayTT = date.dayNumber;
    // It's possible here that secondTT could roll over 86400
    // This does not seem to affect the precision (unit tests check for this)
    var secondTT = date.secondsOfDay + ttMinusTai;

    var xys = Transforms.iau2006XysData.computeXysRadians(
      dayTT,
      secondTT,
      xysScratch
    );
    if (!when.defined(xys)) {
      return undefined;
    }

    var x = xys.x + eop.xPoleOffset;
    var y = xys.y + eop.yPoleOffset;

    // Compute XYS rotation
    var a = 1.0 / (1.0 + Math.sqrt(1.0 - x * x - y * y));

    var rotation1 = rotation1Scratch;
    rotation1[0] = 1.0 - a * x * x;
    rotation1[3] = -a * x * y;
    rotation1[6] = x;
    rotation1[1] = -a * x * y;
    rotation1[4] = 1 - a * y * y;
    rotation1[7] = y;
    rotation1[2] = -x;
    rotation1[5] = -y;
    rotation1[8] = 1 - a * (x * x + y * y);

    var rotation2 = Matrix3.fromRotationZ(-xys.s, rotation2Scratch);
    var matrixQ = Matrix3.multiply(rotation1, rotation2, rotation1Scratch);

    // Similar to TT conversions above
    // It's possible here that secondTT could roll over 86400
    // This does not seem to affect the precision (unit tests check for this)
    var dateUt1day = date.dayNumber;
    var dateUt1sec =
      date.secondsOfDay - JulianDate.computeTaiMinusUtc(date) + eop.ut1MinusUtc;

    // Compute Earth rotation angle
    // The IERS standard for era is
    //    era = 0.7790572732640 + 1.00273781191135448 * Tu
    // where
    //    Tu = JulianDateInUt1 - 2451545.0
    // However, you get much more precision if you make the following simplification
    //    era = a + (1 + b) * (JulianDayNumber + FractionOfDay - 2451545)
    //    era = a + (JulianDayNumber - 2451545) + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
    //    era = a + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
    // since (JulianDayNumber - 2451545) represents an integer number of revolutions which will be discarded anyway.
    var daysSinceJ2000 = dateUt1day - 2451545;
    var fractionOfDay = dateUt1sec / TimeConstants$1.SECONDS_PER_DAY;
    var era =
      0.779057273264 +
      fractionOfDay +
      0.00273781191135448 * (daysSinceJ2000 + fractionOfDay);
    era = (era % 1.0) * _Math.CesiumMath.TWO_PI;

    var earthRotation = Matrix3.fromRotationZ(era, rotation2Scratch);

    // pseudoFixed to ICRF
    var pfToIcrf = Matrix3.multiply(matrixQ, earthRotation, rotation1Scratch);

    // Compute pole wander matrix
    var cosxp = Math.cos(eop.xPoleWander);
    var cosyp = Math.cos(eop.yPoleWander);
    var sinxp = Math.sin(eop.xPoleWander);
    var sinyp = Math.sin(eop.yPoleWander);

    var ttt = dayTT - j2000ttDays + secondTT / TimeConstants$1.SECONDS_PER_DAY;
    ttt /= 36525.0;

    // approximate sp value in rad
    var sp = (-47.0e-6 * ttt * _Math.CesiumMath.RADIANS_PER_DEGREE) / 3600.0;
    var cossp = Math.cos(sp);
    var sinsp = Math.sin(sp);

    var fToPfMtx = rotation2Scratch;
    fToPfMtx[0] = cosxp * cossp;
    fToPfMtx[1] = cosxp * sinsp;
    fToPfMtx[2] = sinxp;
    fToPfMtx[3] = -cosyp * sinsp + sinyp * sinxp * cossp;
    fToPfMtx[4] = cosyp * cossp + sinyp * sinxp * sinsp;
    fToPfMtx[5] = -sinyp * cosxp;
    fToPfMtx[6] = -sinyp * sinsp - cosyp * sinxp * cossp;
    fToPfMtx[7] = sinyp * cossp - cosyp * sinxp * sinsp;
    fToPfMtx[8] = cosyp * cosxp;

    return Matrix3.multiply(pfToIcrf, fToPfMtx, result);
  };

  var pointToWindowCoordinatesTemp = new Cartesian4();

  /**
   * Transform a point from model coordinates to window coordinates.
   *
   * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
   * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
   * @param {Cartesian3} point The point to transform.
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
   */
  Transforms.pointToWindowCoordinates = function (
    modelViewProjectionMatrix,
    viewportTransformation,
    point,
    result
  ) {
    result = Transforms.pointToGLWindowCoordinates(
      modelViewProjectionMatrix,
      viewportTransformation,
      point,
      result
    );
    result.y = 2.0 * viewportTransformation[5] - result.y;
    return result;
  };

  /**
   * @private
   */
  Transforms.pointToGLWindowCoordinates = function (
    modelViewProjectionMatrix,
    viewportTransformation,
    point,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(modelViewProjectionMatrix)) {
      throw new Check.DeveloperError("modelViewProjectionMatrix is required.");
    }

    if (!when.defined(viewportTransformation)) {
      throw new Check.DeveloperError("viewportTransformation is required.");
    }

    if (!when.defined(point)) {
      throw new Check.DeveloperError("point is required.");
    }
    //>>includeEnd('debug');

    if (!when.defined(result)) {
      result = new Cartesian2.Cartesian2();
    }

    var tmp = pointToWindowCoordinatesTemp;

    Matrix4.multiplyByVector(
      modelViewProjectionMatrix,
      Cartesian4.fromElements(point.x, point.y, point.z, 1, tmp),
      tmp
    );
    Cartesian4.multiplyByScalar(tmp, 1.0 / tmp.w, tmp);
    Matrix4.multiplyByVector(viewportTransformation, tmp, tmp);
    return Cartesian2.Cartesian2.fromCartesian4(tmp, result);
  };

  var normalScratch = new Cartesian2.Cartesian3();
  var rightScratch = new Cartesian2.Cartesian3();
  var upScratch = new Cartesian2.Cartesian3();

  /**
   * Transform a position and velocity to a rotation matrix.
   *
   * @param {Cartesian3} position The position to transform.
   * @param {Cartesian3} velocity The velocity vector to transform.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
   */
  Transforms.rotationMatrixFromPositionVelocity = function (
    position,
    velocity,
    ellipsoid,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(position)) {
      throw new Check.DeveloperError("position is required.");
    }

    if (!when.defined(velocity)) {
      throw new Check.DeveloperError("velocity is required.");
    }
    //>>includeEnd('debug');

    var normal = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84).geodeticSurfaceNormal(
      position,
      normalScratch
    );
    var right = Cartesian2.Cartesian3.cross(velocity, normal, rightScratch);

    if (Cartesian2.Cartesian3.equalsEpsilon(right, Cartesian2.Cartesian3.ZERO, _Math.CesiumMath.EPSILON6)) {
      right = Cartesian2.Cartesian3.clone(Cartesian2.Cartesian3.UNIT_X, right);
    }

    var up = Cartesian2.Cartesian3.cross(right, velocity, upScratch);
    Cartesian2.Cartesian3.normalize(up, up);
    Cartesian2.Cartesian3.cross(velocity, up, right);
    Cartesian2.Cartesian3.negate(right, right);
    Cartesian2.Cartesian3.normalize(right, right);

    if (!when.defined(result)) {
      result = new Matrix3();
    }

    result[0] = velocity.x;
    result[1] = velocity.y;
    result[2] = velocity.z;
    result[3] = right.x;
    result[4] = right.y;
    result[5] = right.z;
    result[6] = up.x;
    result[7] = up.y;
    result[8] = up.z;

    return result;
  };

  var swizzleMatrix = new Matrix4(
    0.0,
    0.0,
    1.0,
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
    0.0,
    1.0
  );

  var scratchCartographic = new Cartesian2.Cartographic();
  var scratchCartesian3Projection = new Cartesian2.Cartesian3();
  var scratchCenter = new Cartesian2.Cartesian3();
  var scratchRotation = new Matrix3();
  var scratchFromENU = new Matrix4();
  var scratchToENU = new Matrix4();

  /**
   * @private
   */
  Transforms.basisTo2D = function (projection, matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(projection)) {
      throw new Check.DeveloperError("projection is required.");
    }
    if (!when.defined(matrix)) {
      throw new Check.DeveloperError("matrix is required.");
    }
    if (!when.defined(result)) {
      throw new Check.DeveloperError("result is required.");
    }
    //>>includeEnd('debug');

    var rtcCenter = Matrix4.getTranslation(matrix, scratchCenter);
    var ellipsoid = projection.ellipsoid;

    // Get the 2D Center
    var cartographic = ellipsoid.cartesianToCartographic(
      rtcCenter,
      scratchCartographic
    );
    var projectedPosition = projection.project(
      cartographic,
      scratchCartesian3Projection
    );
    Cartesian2.Cartesian3.fromElements(
      projectedPosition.z,
      projectedPosition.x,
      projectedPosition.y,
      projectedPosition
    );

    // Assuming the instance are positioned in WGS84, invert the WGS84 transform to get the local transform and then convert to 2D
    var fromENU = Transforms.eastNorthUpToFixedFrame(
      rtcCenter,
      ellipsoid,
      scratchFromENU
    );
    var toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);
    var rotation = Matrix4.getMatrix3(matrix, scratchRotation);
    var local = Matrix4.multiplyByMatrix3(toENU, rotation, result);
    Matrix4.multiply(swizzleMatrix, local, result); // Swap x, y, z for 2D
    Matrix4.setTranslation(result, projectedPosition, result); // Use the projected center

    return result;
  };

  /**
   * @private
   */
  Transforms.wgs84To2DModelMatrix = function (projection, center, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(projection)) {
      throw new Check.DeveloperError("projection is required.");
    }
    if (!when.defined(center)) {
      throw new Check.DeveloperError("center is required.");
    }
    if (!when.defined(result)) {
      throw new Check.DeveloperError("result is required.");
    }
    //>>includeEnd('debug');

    var ellipsoid = projection.ellipsoid;

    var fromENU = Transforms.eastNorthUpToFixedFrame(
      center,
      ellipsoid,
      scratchFromENU
    );
    var toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);

    var cartographic = ellipsoid.cartesianToCartographic(
      center,
      scratchCartographic
    );
    var projectedPosition = projection.project(
      cartographic,
      scratchCartesian3Projection
    );
    Cartesian2.Cartesian3.fromElements(
      projectedPosition.z,
      projectedPosition.x,
      projectedPosition.y,
      projectedPosition
    );

    var translation = Matrix4.fromTranslation(projectedPosition, scratchFromENU);
    Matrix4.multiply(swizzleMatrix, toENU, result);
    Matrix4.multiply(translation, result, result);

    return result;
  };

  exports.BoundingSphere = BoundingSphere;
  exports.Cartesian4 = Cartesian4;
  exports.FeatureDetection = FeatureDetection;
  exports.GeographicProjection = GeographicProjection;
  exports.Intersect = Intersect$1;
  exports.Interval = Interval;
  exports.Matrix3 = Matrix3;
  exports.Matrix4 = Matrix4;
  exports.Quaternion = Quaternion;
  exports.Resource = Resource;
  exports.Transforms = Transforms;
  exports.buildModuleUrl = buildModuleUrl;

});
//# sourceMappingURL=Transforms-1ede5d55.js.map
