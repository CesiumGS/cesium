/*global define*/
define([
        './DeveloperError',
        './RuntimeError',
        './Math',
        './Matrix3',
        './Cartesian3',
        './Cartesian4'
       ],
    function(
        DeveloperError,
        RuntimeError,
        CesiumMath,
        Matrix3,
        Cartesian3,
        Cartesian4) {
    "use strict";

    /**
     * A 4x4 matrix, indexable as a column-major order array.
     * Constructor parameters are in row-major order for code readability.
     * @alias Matrix4
     * @constructor
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
     * @see Matrix4.fromColumnMajor
     * @see Matrix4.fromRowMajorArray
     * @see Matrix2
     * @see Matrix3
     */
    var Matrix4 = function(column0Row0, column1Row0, column2Row0, column3Row0,
                           column0Row1, column1Row1, column2Row1, column3Row1,
                           column0Row2, column1Row2, column2Row2, column3Row2,
                           column0Row3, column1Row3, column2Row3, column3Row3) {
        this[0] = typeof column0Row0 === 'undefined' ? 0.0 : column0Row0;
        this[1] = typeof column0Row1 === 'undefined' ? 0.0 : column0Row1;
        this[2] = typeof column0Row2 === 'undefined' ? 0.0 : column0Row2;
        this[3] = typeof column0Row3 === 'undefined' ? 0.0 : column0Row3;
        this[4] = typeof column1Row0 === 'undefined' ? 0.0 : column1Row0;
        this[5] = typeof column1Row1 === 'undefined' ? 0.0 : column1Row1;
        this[6] = typeof column1Row2 === 'undefined' ? 0.0 : column1Row2;
        this[7] = typeof column1Row3 === 'undefined' ? 0.0 : column1Row3;
        this[8] = typeof column2Row0 === 'undefined' ? 0.0 : column2Row0;
        this[9] = typeof column2Row1 === 'undefined' ? 0.0 : column2Row1;
        this[10] = typeof column2Row2 === 'undefined' ? 0.0 : column2Row2;
        this[11] = typeof column2Row3 === 'undefined' ? 0.0 : column2Row3;
        this[12] = typeof column3Row0 === 'undefined' ? 0.0 : column3Row0;
        this[13] = typeof column3Row1 === 'undefined' ? 0.0 : column3Row1;
        this[14] = typeof column3Row2 === 'undefined' ? 0.0 : column3Row2;
        this[15] = typeof column3Row3 === 'undefined' ? 0.0 : column3Row3;
    };

    /**
     * Duplicates a Matrix4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to duplicate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.clone = function(values, result) {
        if (typeof values === 'undefined') {
            throw new DeveloperError('values is required');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(values[0], values[4], values[8], values[12],
                               values[1], values[5], values[9], values[13],
                               values[2], values[6], values[10], values[14],
                               values[3], values[7], values[11], values[15]);
        }
        result[0] = values[0];
        result[1] = values[1];
        result[2] = values[2];
        result[3] = values[3];
        result[4] = values[4];
        result[5] = values[5];
        result[6] = values[6];
        result[7] = values[7];
        result[8] = values[8];
        result[9] = values[9];
        result[10] = values[10];
        result[11] = values[11];
        result[12] = values[12];
        result[13] = values[13];
        result[14] = values[14];
        result[15] = values[15];
        return result;
    };

    /**
     * Creates a Matrix4 instance from a column-major order array.
     * @memberof Matrix4
     * @function
     *
     * @param {Array} values The column-major order array.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} values is required.
     */
    Matrix4.fromColumnMajorArray = Matrix4.clone;

    /**
     * Creates a Matrix4 instance from a row-major order array.
     * The resulting matrix will be in column-major order.
     * @memberof Matrix4
     *
     * @param {Array} values The row-major order array.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} values is required.
     */
    Matrix4.fromRowMajorArray = function(values, result) {
        if (typeof values === 'undefined') {
            throw new DeveloperError('values is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(values[0], values[1], values[2], values[3],
                               values[4], values[5], values[6], values[7],
                               values[8], values[9], values[10], values[11],
                               values[12], values[13], values[14], values[15]);
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

    Matrix4.fromRotationTranslation = function(rotation, translation, result) {
        if (typeof rotation === 'undefined') {
            throw new DeveloperError('rotation is required.');
        }
        if (typeof translation === 'undefined') {
            throw new DeveloperError('translation is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(rotation[0], rotation[3], rotation[6], translation.x,
                               rotation[1], rotation[4], rotation[7], translation.y,
                               rotation[2], rotation[5], rotation[8], translation.z,
                                       0.0,         0.0,         0.0,           1.0);
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

    Matrix4.fromTranslation = function(translation, result) {
        return Matrix4.fromRotationTranslation(Matrix4.IDENTITY, translation, result);
    };

    /**
    * Creates a Matrix4 representing a perspective transformation matrix.
    *
    * @memberof Matrix4
    *
    * @param {Number} fovy The field of view in radians.
    * @param {Number} aspect The aspect ratio.
    * @param {Number} zNear The distance to the near plane.
    * @param {Number} zFar The distance to the far plane.
    *
    * @return {Matrix4} The perspective transformation matrix.
    *
    * @exception {DeveloperError} fovy must be in [0, PI).
    * @exception {DeveloperError} aspect must be greater than zero.
    * @exception {DeveloperError} zNear must be greater than zero.
    * @exception {DeveloperError} zFar must be greater than zero.
    *
    * @see Matrix4.fromPerspectiveOffCenter
    * @see Matrix4.fromInfinitePerspectiveOffCenter
    * @see Matrix4.fromOrthographicOffCenter
    */
    Matrix4.fromPerspectiveFieldOfView = function(fovy, aspect, zNear, zFar) {
        if (fovy <= 0.0 || fovy > Math.PI) {
            throw new DeveloperError('fovy must be in [0, PI).');
        }

        if (aspect <= 0.0) {
            throw new DeveloperError('aspect must be greater than zero.');
        }

        if (zNear <= 0.0) {
            throw new DeveloperError('zNear must be greater than zero.');
        }

        if (zFar <= 0.0) {
            throw new DeveloperError('zFar must be greater than zero.');
        }

        var bottom = Math.tan(fovy * 0.5);
        var f = 1.0 / bottom;

        return new Matrix4(f / aspect, 0.0, 0.0, 0.0,
                           0.0, f, 0.0, 0.0, 0.0,
                           0.0, (zFar + zNear) / (zNear - zFar), (2.0 * zFar * zNear) / (zNear - zFar),
                           0.0, 0.0, -1.0, 0.0);
    };

      /**
      * Creates a Matrix4 representing a view matrix.
      *
      * @memberof Matrix4
      *
      * @param {Cartesian3} eye The position of the viewer.
      * @param {Cartesian3} target The point that the viewer is looking at.
      * @param {Cartesian3} up The up vector, i.e., how the viewer is tilted.
      *
      * @return {Matrix4} The view vector.
      */
    Matrix4.fromLookAt = function(eye, target, up) {
        var t = Cartesian3.clone(target);
        var f = t.subtract(eye).normalize();
        var s = f.cross(up).normalize();
        var u = s.cross(f).normalize();

        var rotation = new Matrix4(
            s.x,  s.y,  s.z, 0.0,
            u.x,  u.y,  u.z, 0.0,
           -f.x, -f.y, -f.z, 0.0,
            0.0,  0.0,  0.0, 1.0);

        var translation = new Matrix4(
            1.0, 0.0, 0.0, -eye.x,
            0.0, 1.0, 0.0, -eye.y,
            0.0, 0.0, 1.0, -eye.z,
            0.0, 0.0, 0.0, 1.0);

        return rotation.multiply(translation);
    };

    /**
    * Creates a Matrix4 representing an orthographic transformation matrix.
    *
    * @memberof Matrix4
    *
    * @param {Number} left
    * @param {Number} right
    * @param {Number} bottom
    * @param {Number} top
    * @param {Number} zNear The distance to the near plane.
    * @param {Number} zFar The distance to the far plane.
    *
    * @return {Matrix4} The orthographic transformation matrix.
    *
    * @see Matrix4.fromPerspectiveFieldOfView
    * @see Matrix4.fromPerspectiveOffCenter
    * @see Matrix4.fromInfinitePerspectiveOffCenter
    */
    Matrix4.fromOrthographicOffCenter = function(left, right, bottom, top, zNear, zFar) {
        var a = 1.0 / (right - left);
        var b = 1.0 / (top - bottom);
        var c = 1.0 / (zFar - zNear);

        var tx = -(right + left) * a;
        var ty = -(top + bottom) * b;
        var tz = -(zFar + zNear) * c;

        return new Matrix4(2.0 * a, 0.0, 0.0, tx,
                           0.0, 2.0 * b, 0.0, ty,
                           0.0, 0.0, -2.0 * c, tz,
                           0.0, 0.0, 0.0, 1.0);
    };

    /**
    * Creates a matrix that transforms from normalized device coordinates to window coordinates.
    *
    * @memberof Matrix4
    *
    * @param {Object}[viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
    * @param {Number}[nearDepthRange = 0.0] The near plane distance in window coordinates.
    * @param {Number}[farDepthRange = 1.0] The far plane distance in window coordinates.
    *
    * @return {Matrix4} The viewport transformation matrix.
    *
    * @see agi_viewportTransformation
    * @see Context#getViewport
    *
    * @example
    * // Example 1.  Create viewport transformation using an explicit viewport and depth range.
    * var m = Matrix4.fromViewportTransformation({
    *     x : 0.0,
    *     y : 0.0,
    *     width : 1024.0,
    *     height : 768.0
    * }, 0.0, 1.0);
    *
    * // Example 2.  Create viewport transformation using the context's viewport.
    * var m = Matrix4.fromViewportTransformation(context.getViewport());
    */
    Matrix4.fromViewportTransformation = function(viewport, nearDepthRange, farDepthRange) {
        var v = viewport || {};
        v.x = v.x || 0.0;
        v.y = v.y || 0.0;
        v.width = v.width || 0.0;
        v.height = v.height || 0.0;
        nearDepthRange = nearDepthRange || 0.0;
        farDepthRange = (typeof farDepthRange === 'undefined') ? 1.0 : farDepthRange;

        var halfWidth = v.width * 0.5;
        var halfHeight = v.height * 0.5;
        var halfDepth = (farDepthRange - nearDepthRange) * 0.5;

        return new Matrix4(
                halfWidth, 0.0,        0.0,       v.x + halfWidth,
                0.0,       halfHeight, 0.0,       v.y + halfHeight,
                0.0,       0.0,        halfDepth, nearDepthRange + halfDepth,
                0.0,       0.0,        0.0,       1.0);
    };

    Matrix4.fromPerspectiveOffCenter = function(left, right, bottom, top, zNear, zFar) {
        var l = left;
        var r = right;
        var b = bottom;
        var t = top;
        var n = zNear;
        var f = zFar;
        return new Matrix4(2.0 * n / (r - l), 0.0, (r + l) / (r - l), 0.0,
                           0.0, 2.0 * n / (t - b), (t + b) / (t - b), 0.0,
                           0.0, 0.0, -(f + n) / (f - n), -2.0 * f * n / (f - n),
                           0.0, 0.0, -1.0, 0.0);
    };

    Matrix4.fromInfinitePerspectiveOffCenter = function(left, right, bottom, top, zNear) {
        var l = left;
        var r = right;
        var b = bottom;
        var t = top;
        var n = zNear;
        return new Matrix4(2.0 * n / (r - l), 0.0, (r + l) / (r - l), 0.0,
                           0.0, 2.0 * n / (t - b), (t + b) / (t - b), 0.0,
                           0.0, 0.0, -1.0, -2.0 * n,
                           0.0, 0.0, -1.0, 0.0);
    };

    /**
     * Creates an Array from the provided Matrix4 instance.
     * The array will be in column-major order.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use..
     * @param {Array} [result] The Array onto which to store the result.
     * @return {Array} The modified Array parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.toArray = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return [matrix[0], matrix[1], matrix[2], matrix[3],
                    matrix[4], matrix[5], matrix[6], matrix[7],
                    matrix[8], matrix[9], matrix[10], matrix[11],
                    matrix[12], matrix[13], matrix[14], matrix[15]];
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
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.getColumn = function(matrix, index, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }

        var startIndex = index * 4;
        var x = matrix[startIndex];
        var y = matrix[startIndex + 1];
        var z = matrix[startIndex + 2];
        var w = matrix[startIndex + 3];

        if (typeof result === 'undefined') {
            return new Cartesian4(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.setColumn = function(matrix, index, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }
        result = Matrix4.clone(matrix, result);
        var startIndex = index * 4;
        result[startIndex] = cartesian.x;
        result[startIndex + 1] = cartesian.y;
        result[startIndex + 2] = cartesian.z;
        result[startIndex + 3] = cartesian.w;
        return result;
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.getRow = function(matrix, index, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }

        var x = matrix[index];
        var y = matrix[index + 4];
        var z = matrix[index + 8];
        var w = matrix[index + 12];

        if (typeof result === 'undefined') {
            return new Cartesian4(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.setRow = function(matrix, index, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }

        result = Matrix4.clone(matrix, result);
        result[index] = cartesian.x;
        result[index + 4] = cartesian.y;
        result[index + 8] = cartesian.z;
        result[index + 12] = cartesian.w;
        return result;
    };

    /**
     * Computes the product of two matrices.
     * @memberof Matrix4
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Matrix4.multiply = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }

        var column0Row0 = left[0] * right[0] + left[4] * right[1] + left[8] * right[2] + left[12] * right[3];
        var column0Row1 = left[1] * right[0] + left[5] * right[1] + left[9] * right[2] + left[13] * right[3];
        var column0Row2 = left[2] * right[0] + left[6] * right[1] + left[10] * right[2] + left[14] * right[3];
        var column0Row3 = left[3] * right[0] + left[7] * right[1] + left[11] * right[2] + left[15] * right[3];

        var column1Row0 = left[0] * right[4] + left[4] * right[5] + left[8] * right[6] + left[12] * right[7];
        var column1Row1 = left[1] * right[4] + left[5] * right[5] + left[9] * right[6] + left[13] * right[7];
        var column1Row2 = left[2] * right[4] + left[6] * right[5] + left[10] * right[6] + left[14] * right[7];
        var column1Row3 = left[3] * right[4] + left[7] * right[5] + left[11] * right[6] + left[15] * right[7];

        var column2Row0 = left[0] * right[8] + left[4] * right[9] + left[8] * right[10] + left[12] * right[11];
        var column2Row1 = left[1] * right[8] + left[5] * right[9] + left[9] * right[10] + left[13] * right[11];
        var column2Row2 = left[2] * right[8] + left[6] * right[9] + left[10] * right[10] + left[14] * right[11];
        var column2Row3 = left[3] * right[8] + left[7] * right[9] + left[11] * right[10] + left[15] * right[11];

        var column3Row0 = left[0] * right[12] + left[4] * right[13] + left[8] * right[14] + left[12] * right[15];
        var column3Row1 = left[1] * right[12] + left[5] * right[13] + left[9] * right[14] + left[13] * right[15];
        var column3Row2 = left[2] * right[12] + left[6] * right[13] + left[10] * right[14] + left[14] * right[15];
        var column3Row3 = left[3] * right[12] + left[7] * right[13] + left[11] * right[14] + left[15] * right[15];

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0, column1Row0, column2Row0, column3Row0,
                               column0Row1, column1Row1, column2Row1, column3Row1,
                               column0Row2, column1Row2, column2Row2, column3Row2,
                               column0Row3, column1Row3, column2Row3, column3Row3);
        }
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
     * Computes the product of a matrix and a column vector.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian4} cartesian The column.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix4.multiplyByVector = function(matrix, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;
        var vW = cartesian.w;

        var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
        var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
        var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
        var w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

        if (typeof result === 'undefined') {
            return new Cartesian4(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes the product of a matrix and a scalar.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Matrix4.multiplyByScalar = function(matrix, scalar, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number');
        }

        if (typeof result === 'undefined') {
            return new Matrix4(matrix[0] * scalar, matrix[4] * scalar, matrix[8] * scalar, matrix[12] * scalar,
                               matrix[1] * scalar, matrix[5] * scalar, matrix[9] * scalar, matrix[13] * scalar,
                               matrix[2] * scalar, matrix[6] * scalar, matrix[10] * scalar, matrix[14] * scalar,
                               matrix[3] * scalar, matrix[7] * scalar, matrix[11] * scalar, matrix[15] * scalar);
        }
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
     * Creates a negated copy of the provided matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to negate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.negate = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        if (typeof result === 'undefined') {
            return new Matrix4(-matrix[0], -matrix[4], -matrix[8], -matrix[12],
                               -matrix[1], -matrix[5], -matrix[9], -matrix[13],
                               -matrix[2], -matrix[6], -matrix[10], -matrix[14],
                               -matrix[3], -matrix[7], -matrix[11], -matrix[15]);
        }
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
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to transpose.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.transpose = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        var column0Row0 = matrix[0];
        var column0Row1 = matrix[4];
        var column0Row2 = matrix[8];
        var column0Row3 = matrix[12];
        var column1Row0 = matrix[1];
        var column1Row1 = matrix[5];
        var column1Row2 = matrix[9];
        var column1Row3 = matrix[13];
        var column2Row0 = matrix[2];
        var column2Row1 = matrix[6];
        var column2Row2 = matrix[10];
        var column2Row3 = matrix[14];
        var column3Row0 = matrix[3];
        var column3Row1 = matrix[7];
        var column3Row2 = matrix[11];
        var column3Row3 = matrix[15];

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0, column1Row0, column2Row0, column3Row0,
                               column0Row1, column1Row1, column2Row1, column3Row1,
                               column0Row2, column1Row2, column2Row2, column3Row2,
                               column0Row3, column1Row3, column2Row3, column3Row3);
        }
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
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Matrix4.equals = function(left, right) {
        return (left === right) ||
               (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                left[0] === right[0] &&
                left[1] === right[1] &&
                left[2] === right[2] &&
                left[3] === right[3] &&
                left[4] === right[4] &&
                left[5] === right[5] &&
                left[6] === right[6] &&
                left[7] === right[7] &&
                left[8] === right[8] &&
                left[9] === right[9] &&
                left[10] === right[10] &&
                left[11] === right[11] &&
                left[12] === right[12] &&
                left[13] === right[13] &&
                left[14] === right[14] &&
                left[15] === right[15]);
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Matrix4.equalsEpsilon = function(left, right, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number');
        }

        return (left === right) ||
                (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
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
                Math.abs(left[15] - right[15]) <= epsilon);
    };

    Matrix4.getTranslation = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian3(matrix[12], matrix[13], matrix[14]);
        }
        result.x = matrix[12];
        result.y = matrix[13];
        result.z = matrix[14];
        return result;
    };

    /**
     * Returns the upper left 3x3 rotation matrix, assuming the matrix is a affine transformation matrix.
     *
     * @memberof Matrix4
     *
     * @return {Matrix3} The upper left 3x3 matrix from this 4x4 matrix.
     */
     Matrix4.getRotation = function(matrix, result) {
         if (typeof matrix === 'undefined') {
             throw new DeveloperError('matrix is required');
         }
         if (typeof result === 'undefined') {
             return new Matrix3(matrix[0], matrix[4], matrix[8],
                                matrix[1], matrix[5], matrix[9],
                                matrix[2], matrix[6], matrix[10]);
         }
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

    /**
    * Computes and returns the inverse of this general 4x4 matrix.
    * <p>
    * The matrix is inverted using Cramer's Rule.  If the determinant
    * is zero, the matrix can not be inverted, and an exception is thrown.
    * </ p>
    * <p>
    * If the matrix is an affine transformation matrix, it is more efficient
    * to invert it with {@link #inverseTransformation}.
    * </ p>
    *
    * @memberof Matrix4
    *
    * @return {Matrix4} The inverse of this matrix.
    * @exception {RuntimeError} This matrix is not invertible because its determinate is zero.
    */
    Matrix4.inverse = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        //
        // Ported from:
        //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
        //

        var dst = new Array(16);
        var tmp = new Array(16);
        var src = new Array(16);
        var det;

        Matrix4.transpose(matrix, src);

        // calculate pairs for first 8 elements (cofactors)
        tmp[0] = src[10] * src[15];
        tmp[1] = src[11] * src[14];
        tmp[2] = src[9] * src[15];
        tmp[3] = src[11] * src[13];
        tmp[4] = src[9] * src[14];
        tmp[5] = src[10] * src[13];
        tmp[6] = src[8] * src[15];
        tmp[7] = src[11] * src[12];
        tmp[8] = src[8] * src[14];
        tmp[9] = src[10] * src[12];
        tmp[10] = src[8] * src[13];
        tmp[11] = src[9] * src[12];

        // calculate first 8 elements (cofactors)
        dst[0] = tmp[0] * src[5] + tmp[3] * src[6] + tmp[4] * src[7];
        dst[0] -= tmp[1] * src[5] + tmp[2] * src[6] + tmp[5] * src[7];
        dst[1] = tmp[1] * src[4] + tmp[6] * src[6] + tmp[9] * src[7];
        dst[1] -= tmp[0] * src[4] + tmp[7] * src[6] + tmp[8] * src[7];
        dst[2] = tmp[2] * src[4] + tmp[7] * src[5] + tmp[10] * src[7];
        dst[2] -= tmp[3] * src[4] + tmp[6] * src[5] + tmp[11] * src[7];
        dst[3] = tmp[5] * src[4] + tmp[8] * src[5] + tmp[11] * src[6];
        dst[3] -= tmp[4] * src[4] + tmp[9] * src[5] + tmp[10] * src[6];
        dst[4] = tmp[1] * src[1] + tmp[2] * src[2] + tmp[5] * src[3];
        dst[4] -= tmp[0] * src[1] + tmp[3] * src[2] + tmp[4] * src[3];
        dst[5] = tmp[0] * src[0] + tmp[7] * src[2] + tmp[8] * src[3];
        dst[5] -= tmp[1] * src[0] + tmp[6] * src[2] + tmp[9] * src[3];
        dst[6] = tmp[3] * src[0] + tmp[6] * src[1] + tmp[11] * src[3];
        dst[6] -= tmp[2] * src[0] + tmp[7] * src[1] + tmp[10] * src[3];
        dst[7] = tmp[4] * src[0] + tmp[9] * src[1] + tmp[10] * src[2];
        dst[7] -= tmp[5] * src[0] + tmp[8] * src[1] + tmp[11] * src[2];

        // calculate pairs for second 8 elements (cofactors)
        tmp[0] = src[2] * src[7];
        tmp[1] = src[3] * src[6];
        tmp[2] = src[1] * src[7];
        tmp[3] = src[3] * src[5];
        tmp[4] = src[1] * src[6];
        tmp[5] = src[2] * src[5];
        tmp[6] = src[0] * src[7];
        tmp[7] = src[3] * src[4];
        tmp[8] = src[0] * src[6];
        tmp[9] = src[2] * src[4];
        tmp[10] = src[0] * src[5];
        tmp[11] = src[1] * src[4];

        // calculate second 8 elements (cofactors)
        dst[8] = tmp[0] * src[13] + tmp[3] * src[14] + tmp[4] * src[15];
        dst[8] -= tmp[1] * src[13] + tmp[2] * src[14] + tmp[5] * src[15];
        dst[9] = tmp[1] * src[12] + tmp[6] * src[14] + tmp[9] * src[15];
        dst[9] -= tmp[0] * src[12] + tmp[7] * src[14] + tmp[8] * src[15];
        dst[10] = tmp[2] * src[12] + tmp[7] * src[13] + tmp[10] * src[15];
        dst[10] -= tmp[3] * src[12] + tmp[6] * src[13] + tmp[11] * src[15];
        dst[11] = tmp[5] * src[12] + tmp[8] * src[13] + tmp[11] * src[14];
        dst[11] -= tmp[4] * src[12] + tmp[9] * src[13] + tmp[10] * src[14];
        dst[12] = tmp[2] * src[10] + tmp[5] * src[11] + tmp[1] * src[9];
        dst[12] -= tmp[4] * src[11] + tmp[0] * src[9] + tmp[3] * src[10];
        dst[13] = tmp[8] * src[11] + tmp[0] * src[8] + tmp[7] * src[10];
        dst[13] -= tmp[6] * src[10] + tmp[9] * src[11] + tmp[1] * src[8];
        dst[14] = tmp[6] * src[9] + tmp[11] * src[11] + tmp[3] * src[8];
        dst[14] -= tmp[10] * src[11] + tmp[2] * src[8] + tmp[7] * src[9];
        dst[15] = tmp[10] * src[10] + tmp[4] * src[8] + tmp[9] * src[9];
        dst[15] -= tmp[8] * src[9] + tmp[11] * src[10] + tmp[5] * src[8];

        // calculate determinant
        det = src[0] * dst[0] + src[1] * dst[1] + src[2] * dst[2] + src[3] * dst[3];

        if (Math.abs(det) < CesiumMath.EPSILON20) {
            throw new RuntimeError('This matrix is not invertible because its determinate is zero.');
        }

        // calculate matrix inverse
        det = 1.0 / det;
        for ( var j = 0; j < 16; ++j) {
            dst[j] *= det;
        }

        if (typeof result === 'undefined') {
            return new Matrix4(dst[0], dst[4], dst[8], dst[12],
                               dst[1], dst[5], dst[9], dst[13],
                               dst[2], dst[6], dst[10], dst[14],
                               dst[3], dst[7], dst[11], dst[15]);
        }

        result[0] = dst[0];
        result[1] = dst[1];
        result[2] = dst[2];
        result[3] = dst[3];
        result[4] = dst[4];
        result[5] = dst[5];
        result[6] = dst[6];
        result[7] = dst[7];
        result[8] = dst[8];
        result[9] = dst[9];
        result[10] = dst[10];
        result[11] = dst[11];
        result[12] = dst[12];
        result[13] = dst[13];
        result[14] = dst[14];
        result[15] = dst[15];
        return result;
    };

    var invertTransformationScratch = new Cartesian3();

    /**
    * Computes and returns the inverse of this matrix, assuming it is
    * an affine transformation matrix, where the upper left 3x3 elements
    * are a rotation matrix, and the upper three elements in the fourth
    * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
    * <p>
    * This method is faster than computing the inverse for a general 4x4
    * matrix using {@link #inverse}.
    * </ p>
    * <p>
    * The matrix is not verified to be in the proper form.
    * </ p>
    *
    * @memberof Matrix4
    *
    * @return {Matrix4} The inverse of this affine transformation matrix.
    */
    Matrix4.inverseTransformation = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        // rT = negated rotational transpose
        var rTN = [-matrix[0], -matrix[1], -matrix[2],
                  -matrix[4], -matrix[5], -matrix[6],
                  -matrix[8], -matrix[9], -matrix[10]];

        // rTN = negated rotational transpose
        var rT = [matrix[0], matrix[1], matrix[2],
                   matrix[4], matrix[5], matrix[6],
                   matrix[8], matrix[9], matrix[10]];

        // T = translation, rTT = (rT)(T)
        var translation = Matrix4.getTranslation(matrix, invertTransformationScratch);
        var rTT = Matrix3.multiplyByVector(rTN, translation, invertTransformationScratch);
        return Matrix4.fromRotationTranslation(rT, rTT, result);
    };

    /**
     * An immutable Matrix4 instance initialized to the identity matrix.
     * @memberof Matrix4
     */
    Matrix4.IDENTITY = Object.freeze(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                                 0.0, 1.0, 0.0, 0.0,
                                                 0.0, 0.0, 1.0, 0.0,
                                                 0.0, 0.0, 0.0, 1.0));

    /**
     * The index into Matrix4 for column 0, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW0 = 0;

    /**
     * The index into Matrix4 for column 0, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW1 = 1;

    /**
     * The index into Matrix4 for column 0, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW2 = 2;

    /**
     * The index into Matrix4 for column 0, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW3 = 3;

    /**
     * The index into Matrix4 for column 1, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW0 = 4;

    /**
     * The index into Matrix4 for column 1, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW1 = 5;

    /**
     * The index into Matrix4 for column 1, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW2 = 6;

    /**
     * The index into Matrix4 for column 1, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW3 = 7;

    /**
     * The index into Matrix4 for column 2, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW0 = 8;

    /**
     * The index into Matrix4 for column 2, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW1 = 9;

    /**
     * The index into Matrix4 for column 2, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW2 = 10;

    /**
     * The index into Matrix4 for column 2, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW3 = 11;

    /**
     * The index into Matrix4 for column 3, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW0 = 12;

    /**
     * The index into Matrix4 for column 3, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW1 = 13;

    /**
     * The index into Matrix4 for column 3, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW2 = 14;

    /**
     * The index into Matrix4 for column 3, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW3 = 15;

    /**
     * Duplicates the provided Matrix4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     */
    Matrix4.prototype.clone = function(result) {
        return Matrix4.clone(this, result);
    };

    /**
     * Creates an Array from this Matrix4 instance.
     * @memberof Matrix4
     *
     * @param {Array} [result] The Array onto which to store the result.
     * @return {Array} The modified Array parameter or a new Array instance if none was provided.
     */
    Matrix4.prototype.toArray = function(result) {
        return Matrix4.toArray(this, result);
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.getColumn = function(index, result) {
        return Matrix4.getColumn(this, index, result);
    };

    /**
     * Computes a new matrix that replaces the specified column in this matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.setColumn = function(index, cartesian, result) {
        return Matrix4.setColumn(this, index, cartesian, result);
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.getRow = function(index, result) {
        return Matrix4.getRow(this, index, result);
    };

    /**
     * Computes a new matrix that replaces the specified row in this matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.setRow = function(index, cartesian, result) {
        return Matrix4.setRow(this, index, cartesian, result);
    };

    /**
     * Computes the product of this matrix and the provided matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} right The right hand side matrix.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Matrix4.prototype.multiply = function(right, result) {
        return Matrix4.multiply(this, right, result);
    };

    /**
     * Computes the product of this matrix and a column vector.
     * @memberof Matrix4
     *
     * @param {Cartesian4} cartesian The column.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix4.prototype.multiplyByVector = function(cartesian, result) {
        return Matrix4.multiplyByVector(this, cartesian, result);
    };

    /**
     * Computes the product of this matrix and a scalar.
     * @memberof Matrix4
     *
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Matrix4.prototype.multiplyByScalar = function(scalar, result) {
        return Matrix4.multiplyByScalar(this, scalar, result);
    };
    /**
     * Creates a negated copy of this matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to negate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.prototype.negate = function(result) {
        return Matrix4.negate(this, result);
    };

    /**
     * Computes the transpose of this matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     */
    Matrix4.prototype.transpose = function(result) {
        return Matrix4.transpose(this, result);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [right] The right hand side matrix.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Matrix4.prototype.equals = function(right) {
        return Matrix4.equals(this, right);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [right] The right hand side matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Matrix4.prototype.equalsEpsilon = function(right, epsilon) {
        return Matrix4.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Creates a string representing this Matrix with each row being
     * on a separate line and in the format '(column0, column1, column2, column3)'.
     * @memberof Matrix4
     *
     * @return {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2, column3)'.
     */
    Matrix4.prototype.toString = function() {
        return '(' + this[0] + ', ' + this[4] + ', ' + this[8] + ', ' + this[12] +')\n' +
               '(' + this[1] + ', ' + this[5] + ', ' + this[9] + ', ' + this[13] +')\n' +
               '(' + this[2] + ', ' + this[6] + ', ' + this[10] + ', ' + this[14] +')\n' +
               '(' + this[3] + ', ' + this[7] + ', ' + this[11] + ', ' + this[15] +')';
    };

    Matrix4.prototype.getTranslation = function(result) {
        return Matrix4.getTranslation(this, result);
    };

    Matrix4.prototype.getRotation = function(result) {
        return Matrix4.getRotation(this, result);
    };

    Matrix4.prototype.inverse = function(result) {
        return Matrix4.inverse(this, result);
    };

    Matrix4.prototype.inverseTransformation = function(result) {
        return Matrix4.inverseTransformation(this, result);
    };

    return Matrix4;
});
