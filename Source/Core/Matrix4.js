/*global define*/
define([
        './DeveloperError',
        './RuntimeError',
        './Math',
        './Cartesian3',
        './Cartesian4',
        './Matrix3'
    ],
    function(
        DeveloperError,
        RuntimeError,
        CesiumMath,
        Cartesian3,
        Cartesian4,
        Matrix3) {
    "use strict";

    var numberOfElements = 16;

    /**
     * A 4x4 matrix, stored internally in column-major order.
     *
     * <p>
     * When called with no arguments, the matrix elements are initialized to all zeros.
     * When called with one numeric argument, f, the columns are initialized to [f, 0, 0, 0] [0, f, 0, 0] [0, 0, f, 0] [0, 0, 0, f].  Hence new Matrix4(1) creates the identity matrix.
     * When called with two arguments; one Matrix3, rotation, and one Vector3, translation; the matrix is initialized to a 4x4 transformation matrix composed of a 3x3 rotation matrix in the upper left and a 3D translation in the upper right.  The bottom row is [0, 0, 0, 1].
     * When called with sixteen numeric arguments in row-major order, these arguments define the elements of the matrix.
     * </p>
     *
     * @alias Matrix4
     * @constructor
     * @immutable
     *
     * @see Matrix4.fromColumnMajorArray
     * @see Matrix2
     * @see Matrix3
     */
    var Matrix4 = function() {
        var values = this.values = []; // Column-major
        values.length = numberOfElements;

        if (arguments.length === 0) {
            for ( var i = 0; i < numberOfElements; ++i) {
                values[i] = 0;
            }
        } else if (arguments.length === 1) {
            values[0] = arguments[0];
            values[1] = 0;
            values[2] = 0;
            values[3] = 0;

            values[4] = 0;
            values[5] = arguments[0];
            values[6] = 0;
            values[7] = 0;

            values[8] = 0;
            values[9] = 0;
            values[10] = arguments[0];
            values[11] = 0;

            values[12] = 0;
            values[13] = 0;
            values[14] = 0;
            values[15] = arguments[0];
        } else if (arguments.length < numberOfElements) {
            var rotation = arguments[0];
            var translation = arguments[1];

            values[0] = rotation[0];
            values[1] = rotation[1];
            values[2] = rotation[2];
            values[3] = 0;

            values[4] = rotation[3];
            values[5] = rotation[4];
            values[6] = rotation[5];
            values[7] = 0;

            values[8] = rotation[6];
            values[9] = rotation[7];
            values[10] = rotation[8];
            values[11] = 0;

            values[12] = translation.x;
            values[13] = translation.y;
            values[14] = translation.z;
            values[15] = 1;
        } else if (arguments.length >= numberOfElements) {
            values[0] = arguments[0];  // Column 0, Row 0
            values[1] = arguments[4];  // Column 0, Row 1
            values[2] = arguments[8];  // Column 0, Row 2
            values[3] = arguments[12]; // Column 0, Row 3

            values[4] = arguments[1];  // Column 1, Row 0
            values[5] = arguments[5];  // Column 1, Row 1
            values[6] = arguments[9];  // Column 1, Row 2
            values[7] = arguments[13]; // Column 1, Row 3

            values[8] = arguments[2];  // Column 2, Row 0
            values[9] = arguments[6];  // Column 2, Row 1
            values[10] = arguments[10];// Column 2, Row 2
            values[11] = arguments[14];// Column 2, Row 3

            values[12] = arguments[3]; // Column 3, Row 0
            values[13] = arguments[7]; // Column 3, Row 1
            values[14] = arguments[11];// Column 3, Row 2
            values[15] = arguments[15];// Column 3, Row 3
        }
    };

    /**
     * Returns the element at column 0, row 0.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 0, row 0.
     */
    Matrix4.prototype.getColumn0Row0 = function() {
        return this.values[0];
    };

    /**
     * Returns the element at column 0, row 1.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 0, row 1.
     */
    Matrix4.prototype.getColumn0Row1 = function() {
        return this.values[1];
    };

    /**
     * Returns the element at column 0, row 2.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 0, row 2.
     */
    Matrix4.prototype.getColumn0Row2 = function() {
        return this.values[2];
    };

    /**
     * Returns the element at column 0, row 3.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 0, row 3.
     */
    Matrix4.prototype.getColumn0Row3 = function() {
        return this.values[3];
    };

    /**
     * Returns the element at column 1, row 0.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 1, row 0.
     */
    Matrix4.prototype.getColumn1Row0 = function() {
        return this.values[4];
    };

    /**
     * Returns the element at column 1, row 1.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 1, row 1.
     */
    Matrix4.prototype.getColumn1Row1 = function() {
        return this.values[5];
    };

    /**
     * Returns the element at column 1, row 2.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 1, row 2.
     */
    Matrix4.prototype.getColumn1Row2 = function() {
        return this.values[6];
    };

    /**
     * Returns the element at column 1, row 3.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 1, row 3.
     */
    Matrix4.prototype.getColumn1Row3 = function() {
        return this.values[7];
    };

    /**
     * Returns the element at column 2, row 0.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 2, row 0.
     */
    Matrix4.prototype.getColumn2Row0 = function() {
        return this.values[8];
    };

    /**
     * Returns the element at column 2, row 1.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 2, row 1.
     */
    Matrix4.prototype.getColumn2Row1 = function() {
        return this.values[9];
    };

    /**
     * Returns the element at column 2, row 2.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 2, row 2.
     */
    Matrix4.prototype.getColumn2Row2 = function() {
        return this.values[10];
    };

    /**
     * Returns the element at column 2, row 3.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 2, row 3.
     */
    Matrix4.prototype.getColumn2Row3 = function() {
        return this.values[11];
    };

    /**
     * Returns the element at column 3, row 0.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 3, row 0.
     */
    Matrix4.prototype.getColumn3Row0 = function() {
        return this.values[12];
    };

    /**
     * Returns the element at column 3, row 1.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 3, row 1.
     */
    Matrix4.prototype.getColumn3Row1 = function() {
        return this.values[13];
    };

    /**
     * Returns the element at column 3, row 2.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 3, row 2.
     */
    Matrix4.prototype.getColumn3Row2 = function() {
        return this.values[14];
    };

    /**
     * Returns the element at column 3, row 3.
     *
     * @memberof Matrix4
     *
     * @return {Number} The element at column 3, row 3.
     */
    Matrix4.prototype.getColumn3Row3 = function() {
        return this.values[15];
    };

    /**
     * Returns the element at the zero-based, column-major index.
     *
     * @memberof Matrix4
     * @return {Number} The element at the zero-based, column-major index.
     * @exception {DeveloperError} index must be between 0 and 15.
     */
    Matrix4.prototype.getColumnMajorValue = function(index) {
        if (index < 0 || index > 15) {
            throw new DeveloperError('index must be between 0 and 15.');
        }

        return this.values[index];
    };

    /**
     * Returns a copy of the first, i.e. leftmost, column of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The first column of this matrix.
     *
     * @see Matrix4#setColumn0
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getColumn0(); // (x, y, z, w) == (1.0, 0.0, 0.0, 0.0)
     */
    Matrix4.prototype.getColumn0 = function() {
        var values = this.values;
        return new Cartesian4(values[0], values[1], values[2], values[3]);
    };

    /**
     * Sets the first, i.e. leftmost, column of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} column The first column of this matrix.
     *
     * @see Matrix4#getColumn0
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0, 4.0)
     * m.setColumn0(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setColumn0 = function(column) {
        var values = this.values;
        values[0] = column.x;
        values[1] = column.y;
        values[2] = column.z;
        values[3] = column.w;
    };

    /**
     * Returns a copy of the second column of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The second column of this matrix.
     *
     * @see Matrix4#setColumn1
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getColumn1(); // (x, y, z, w) == (0.0, 1.0, 0.0, 0.0)
     */
    Matrix4.prototype.getColumn1 = function() {
        var values = this.values;
        return new Cartesian4(values[4], values[5], values[6], values[7]);
    };

    /**
     * Sets the second column of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} column The second column of this matrix.
     *
     * @see Matrix4#getColumn1
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0, 4.0)
     * m.setColumn1(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setColumn1 = function(column) {
        var values = this.values;
        values[4] = column.x;
        values[5] = column.y;
        values[6] = column.z;
        values[7] = column.w;
    };

    /**
     * Returns a copy of the third column of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The third column of this matrix.
     *
     * @see Matrix4#setColumn2
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getColumn2(); // (x, y, z, w) == (0.0, 0.0, 1.0, 0.0)
     */
    Matrix4.prototype.getColumn2 = function() {
        var values = this.values;
        return new Cartesian4(values[8], values[9], values[10], values[11]);
    };

    /**
     * Sets the third column of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} column The third column of this matrix.
     *
     * @see Matrix4#getColumn2
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0, 4.0)
     * m.setColumn2(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setColumn2 = function(column) {
        var values = this.values;
        values[8] = column.x;
        values[9] = column.y;
        values[10] = column.z;
        values[11] = column.w;
    };

    /**
     * Returns a copy of the fourth, i.e. rightmost, column of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The fourth column of this matrix.
     *
     * @see Matrix4#setColumn3
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getColumn3(); // (x, y, z, w) == (0.0, 0.0, 0.0, 1.0)
     */
    Matrix4.prototype.getColumn3 = function() {
        var values = this.values;
        return new Cartesian4(values[12], values[13], values[14], values[15]);
    };

    /**
     * Sets the fourth, i.e. rightmost, column of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} column The fourth column of this matrix.
     *
     * @see Matrix4#getColumn3
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0, 4.0)
     * m.setColumn3(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setColumn3 = function(column) {
        var values = this.values;
        values[12] = column.x;
        values[13] = column.y;
        values[14] = column.z;
        values[15] = column.w;
    };

    /**
     * Returns a copy of the first, i.e. top, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The first row of this matrix.
     *
     * @see Matrix4#setRow0
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getRow0(); // (x, y, z, w) == (1.0, 0.0, 0.0, 0.0)
     */
    Matrix4.prototype.getRow0 = function() {
        var values = this.values;
        return new Cartesian4(values[0], values[4], values[8], values[12]);
    };

    /**
     * Sets the first, i.e. top, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} row The first row of this matrix.
     *
     * @see Matrix4#getRow0
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0, 4.0)
     * m.setRow0(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setRow0 = function(row) {
        var values = this.values;
        values[0] = row.x;
        values[4] = row.y;
        values[8] = row.z;
        values[12] = row.w;
    };

    /**
     * Returns a copy of the second, from the top, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The second row of this matrix.
     *
     * @see Matrix4#setRow1
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getRow1(); // (x, y, z, w) == (0.0, 1.0, 0.0, 0.0)
     */
    Matrix4.prototype.getRow1 = function() {
        var values = this.values;
        return new Cartesian4(values[1], values[5], values[9], values[13]);
    };

    /**
     * Sets the second, from the top, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} row The second row of this matrix.
     *
     * @see Matrix4#getRow1
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0, 4.0)
     * m.setRow1(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setRow1 = function(row) {
        var values = this.values;
        values[1] = row.x;
        values[5] = row.y;
        values[9] = row.z;
        values[13] = row.w;
    };

    /**
     * Returns a copy of the third, from the top, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The third row of this matrix.
     *
     * @see Matrix4#setRow2
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getRow2(); // (x, y, z, w) == (0.0, 0.0, 1.0, 0.0)
     */
    Matrix4.prototype.getRow2 = function() {
        var values = this.values;
        return new Cartesian4(values[2], values[6], values[10], values[14]);
    };

    /**
     * Sets the third, from the top, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} row The third row of this matrix.
     *
     * @see Matrix4#getRow2
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0, 4.0)
     * m.setRow2(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setRow2 = function(row) {
        var values = this.values;
        values[2] = row.x;
        values[6] = row.y;
        values[10] = row.z;
        values[14] = row.w;
    };

    /**
     * Returns a copy of the fourth, i.e. bottom, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian4} The fourth row of this matrix.
     *
     * @see Matrix4#setRow3
     *
     * @example
     * var m = Matrix4.IDENTITY;
     * var c = m.getRow3(); // (x, y, z, w) == (0.0, 0.0, 0.0, 1.0)
     */
    Matrix4.prototype.getRow3 = function() {
        var values = this.values;
        return new Cartesian4(values[3], values[7], values[11], values[15]);
    };

    /**
     * Sets the fourth, i.e. bottom, row of this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} row The fourth row of this matrix.
     *
     * @see Matrix4#getRow3
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0, 4.0)
     * m.setRow3(new Cartesian4(1.0, 2.0, 3.0, 4.0));
     */
    Matrix4.prototype.setRow3 = function(row) {
        var values = this.values;
        values[3] = row.x;
        values[7] = row.y;
        values[11] = row.z;
        values[15] = row.w;
    };

    /**
     * DOC_TBA
     *
     * @memberof Matrix4
     *
     * @exception {DeveloperError} columnMajorValues must have 16 elements.
     */
    Matrix4.fromColumnMajorArray = function(columnMajorValues) {
        if (columnMajorValues) {
            if (columnMajorValues.length === numberOfElements) {
                return new Matrix4(
                        columnMajorValues[0], columnMajorValues[4], columnMajorValues[8],  columnMajorValues[12],
                        columnMajorValues[1], columnMajorValues[5], columnMajorValues[9],  columnMajorValues[13],
                        columnMajorValues[2], columnMajorValues[6], columnMajorValues[10], columnMajorValues[14],
                        columnMajorValues[3], columnMajorValues[7], columnMajorValues[11], columnMajorValues[15]);
            }

            throw new DeveloperError('columnMajorValues must have 16 elements.');
        }

        return new Matrix4();
    };

    /**
     * Creates a 4x4 uniform scale matrix.
     *
     * @memberof Matrix4
     *
     * @param {Number} scale The uniform scale in the x, y, and z directions.
     *
     * @see Matrix4.createNonUniformScale
     *
     * @example
     * var m = Matrix4.createScale(2.0);
     * var v = m.multiplyByVector(new Cartesian4(1.0, 1.0, 1.0, 1.0));
     * // v is (2.0, 2.0, 2.0, 1.0)
     */
    Matrix4.createScale = function(scale) {
        if (scale) {
            return new Matrix4(
                 scale, 0.0,   0.0,   0.0,
                 0.0,   scale, 0.0,   0.0,
                 0.0,   0.0,   scale, 0.0,
                 0.0,   0.0,   0.0,   1.0);
        }

        return new Matrix4();
    };

    /**
     * Creates a 4x4 non-uniform scale matrix.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian3} scale The non-uniform scale in the x, y, and z directions.
     *
     * @see Matrix4.createScale
     *
     * @example
     * var m = Matrix4.createNonUniformScale(new Cartesian3(1.0, 2.0, 3.0));
     * var v = m.multiplyByVector(new Cartesian4(1.0, 1.0, 1.0, 1.0));
     * // v is (1.0, 2.0, 3.0, 1.0)
     */
    Matrix4.createNonUniformScale = function(scale) {
        if (scale) {
            return new Matrix4(
                 scale.x, 0.0,     0.0,     0.0,
                 0.0,     scale.y, 0.0,     0.0,
                 0.0,     0.0,     scale.z, 0.0,
                 0.0,     0.0,     0.0,     1.0);
        }

        return new Matrix4();
    };

    /**
     * DOC_TBA
     *
     * @memberof Matrix4
     */
    Matrix4.createTranslation = function(translation) {
        if (translation) {
            return new Matrix4(
                     1.0, 0.0, 0.0, translation.x,
                     0.0, 1.0, 0.0, translation.y,
                     0.0, 0.0, 1.0, translation.z,
                     0.0, 0.0, 0.0, 1.0);
        }

        return new Matrix4();
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
     * @see Matrix4.createPerspectiveOffCenter
     * @see Matrix4.createInfinitePerspectiveOffCenter
     * @see Matrix4.createOrthographicOffCenter
     */
    Matrix4.createPerspectiveFieldOfView = function(fovy, aspect, zNear, zFar) {
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

        return new Matrix4(
            f / aspect, 0.0,                             0.0, 0.0,
            0.0,          f,                             0.0, 0.0,
            0.0,        0.0, (zFar + zNear) / (zNear - zFar), (2.0 * zFar * zNear) / (zNear - zFar),
            0.0,        0.0,                            -1.0, 0.0);
    };

    /**
     * DOC_TBA
     *
     * @memberof Matrix4
     *
     * @see Matrix4.createPerspectiveFieldOfView
     * @see Matrix4.createInfinitePerspectiveOffCenter
     * @see Matrix4.createOrthographicOffCenter
     */
    Matrix4.createPerspectiveOffCenter = function(left, right, bottom, top, zNear, zFar) {
        var l = left;
        var r = right;
        var b = bottom;
        var t = top;
        var n = zNear;
        var f = zFar;
        return new Matrix4(
            2.0 * n / (r - l), 0.0,               (r + l) / (r - l),  0.0,
            0.0,               2.0 * n / (t - b), (t + b) / (t - b),  0.0,
            0.0,               0.0,              -(f + n) / (f - n), -2.0 * f * n / (f - n),
            0.0,               0.0,              -1.0,                0.0);
    };

    /**
     * DOC_TBA
     *
     * @memberof Matrix4
     *
     * @see Matrix4.createPerspectiveFieldOfView
     * @see Matrix4.createPerspectiveOffCenter
     * @see Matrix4.createOrthographicOffCenter
     */
    Matrix4.createInfinitePerspectiveOffCenter = function(left, right, bottom, top, zNear) {
        var l = left;
        var r = right;
        var b = bottom;
        var t = top;
        var n = zNear;
        return new Matrix4(
            2.0 * n / (r - l), 0.0,               (r + l) / (r - l),  0.0,
            0.0,               2.0 * n / (t - b), (t + b) / (t - b),  0.0,
            0.0,               0.0,              -1.0,               -2.0 * n,
            0.0,               0.0,              -1.0,                0.0);
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
     * @see Matrix4.createPerspectiveFieldOfView
     * @see Matrix4.createPerspectiveOffCenter
     * @see Matrix4.createInfinitePerspectiveOffCenter
     */
    Matrix4.createOrthographicOffCenter = function(left, right, bottom, top, zNear, zFar) {
        var a = 1.0 / (right - left);
        var b = 1.0 / (top - bottom);
        var c = 1.0 / (zFar - zNear);

        var tx = -(right + left) * a;
        var ty = -(top + bottom) * b;
        var tz = -(zFar + zNear) * c;

        return new Matrix4(
           2.0 * a, 0.0,      0.0,     tx,
           0.0,     2.0 * b,  0.0,     ty,
           0.0,     0.0,     -2.0 * c, tz,
           0.0,     0.0,      0.0,     1.0);
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
     * var m = Matrix4.createViewportTransformation({
     *     x : 0.0,
     *     y : 0.0,
     *     width : 1024.0,
     *     height : 768.0
     * }, 0.0, 1.0);
     *
     * // Example 2.  Create viewport transformation using the context's viewport.
     * var m = Matrix4.createViewportTransformation(context.getViewport());
     */
    Matrix4.createViewportTransformation = function(viewport, nearDepthRange, farDepthRange) {
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
    Matrix4.createLookAt = function(eye, target, up) {
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
     * An immutable Matrix4 instance initialized to the identity matrix.
     *
     * @memberof Matrix4
     */
    Matrix4.IDENTITY = Object.freeze(new Matrix4(1));

    /**
     * Returns 16, the number of elements in a Matrix4.
     *
     * @memberof Matrix4
     *
     * @return {Number} 16.
     */
    Matrix4.getNumberOfElements = function() {
        return numberOfElements;
    };

    /**
     * Returns the upper left 3x3 rotation matrix, assuming the matrix is a affine transformation matrix.
     *
     * @memberof Matrix4
     *
     * @return {Matrix3} The upper left 3x3 matrix from this 4x4 matrix.
     */
    Matrix4.prototype.getRotation = function() {
        return new Matrix3(
                this.getColumn0Row0(), this.getColumn1Row0(), this.getColumn2Row0(),
                this.getColumn0Row1(), this.getColumn1Row1(), this.getColumn2Row1(),
                this.getColumn0Row2(), this.getColumn1Row2(), this.getColumn2Row2());
    };

    /**
     * Returns the transpose of the upper left 3x3 rotation matrix, assuming the matrix is a affine transformation matrix.
     *
     * @memberof Matrix4
     *
     * @return {Matrix3} The transpose of the upper left 3x3 matrix from this 4x4 matrix.
     */
    Matrix4.prototype.getRotationTranspose = function() {
        return new Matrix3(
                this.getColumn0Row0(), this.getColumn0Row1(), this.getColumn0Row2(),
                this.getColumn1Row0(), this.getColumn1Row1(), this.getColumn1Row2(),
                this.getColumn2Row0(), this.getColumn2Row1(), this.getColumn2Row2());
    };

    /**
     * Returns the 3D translation portion of this matrix in the upper right, assuming the matrix is a affine transformation matrix.
     *
     * @memberof Matrix4
     *
     * @return {Cartesian3} The first three rows of the rightmost column of this 4x4 matrix.
     */
    Matrix4.prototype.getTranslation = function() {
        return new Cartesian3(this.getColumn3Row0(), this.getColumn3Row1(), this.getColumn3Row2());
    };

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
    Matrix4.prototype.inverseTransformation = function() {
        // r = rotaton, rT = r^-1
        var rT = this.getRotationTranspose();

        // T = translation, rTT = (-rT)(T)
        var rTT = rT.negate().multiplyByVector(this.getTranslation());

        // [ rT, rTT ]
        // [  0,  1  ]
        return new Matrix4(
                rT[0], rT[3], rT[6], rTT.x,
                rT[1], rT[4], rT[7], rTT.y,
                rT[2], rT[5], rT[8], rTT.z,
                  0.0,   0.0, 0.0,   1.0);
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
    Matrix4.prototype.inverse = function() {
        //
        // Ported from:
        //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
        //

        var dst = [];
        var tmp = [];
        var src = [];
        var det;

        // transpose matrix
        for ( var i = 0; i < 4; ++i) {
            src[i] = this.getColumnMajorValue(i * 4);
            src[i + 4] = this.getColumnMajorValue(i * 4 + 1);
            src[i + 8] = this.getColumnMajorValue(i * 4 + 2);
            src[i + 12] = this.getColumnMajorValue(i * 4 + 3);
        }

        // calculate pairs for first 8 elements (cofactors)
        tmp[0]  = src[10] * src[15];
        tmp[1]  = src[11] * src[14];
        tmp[2]  = src[9]  * src[15];
        tmp[3]  = src[11] * src[13];
        tmp[4]  = src[9]  * src[14];
        tmp[5]  = src[10] * src[13];
        tmp[6]  = src[8]  * src[15];
        tmp[7]  = src[11] * src[12];
        tmp[8]  = src[8]  * src[14];
        tmp[9]  = src[10] * src[12];
        tmp[10] = src[8]  * src[13];
        tmp[11] = src[9]  * src[12];

        // calculate first 8 elements (cofactors)
        dst[0]  = tmp[0] * src[5] + tmp[3] * src[6] + tmp[4]  * src[7];
        dst[0] -= tmp[1] * src[5] + tmp[2] * src[6] + tmp[5]  * src[7];
        dst[1]  = tmp[1] * src[4] + tmp[6] * src[6] + tmp[9]  * src[7];
        dst[1] -= tmp[0] * src[4] + tmp[7] * src[6] + tmp[8]  * src[7];
        dst[2]  = tmp[2] * src[4] + tmp[7] * src[5] + tmp[10] * src[7];
        dst[2] -= tmp[3] * src[4] + tmp[6] * src[5] + tmp[11] * src[7];
        dst[3]  = tmp[5] * src[4] + tmp[8] * src[5] + tmp[11] * src[6];
        dst[3] -= tmp[4] * src[4] + tmp[9] * src[5] + tmp[10] * src[6];
        dst[4]  = tmp[1] * src[1] + tmp[2] * src[2] + tmp[5]  * src[3];
        dst[4] -= tmp[0] * src[1] + tmp[3] * src[2] + tmp[4]  * src[3];
        dst[5]  = tmp[0] * src[0] + tmp[7] * src[2] + tmp[8]  * src[3];
        dst[5] -= tmp[1] * src[0] + tmp[6] * src[2] + tmp[9]  * src[3];
        dst[6]  = tmp[3] * src[0] + tmp[6] * src[1] + tmp[11] * src[3];
        dst[6] -= tmp[2] * src[0] + tmp[7] * src[1] + tmp[10] * src[3];
        dst[7]  = tmp[4] * src[0] + tmp[9] * src[1] + tmp[10] * src[2];
        dst[7] -= tmp[5] * src[0] + tmp[8] * src[1] + tmp[11] * src[2];

        // calculate pairs for second 8 elements (cofactors)
        tmp[0]  = src[2] * src[7];
        tmp[1]  = src[3] * src[6];
        tmp[2]  = src[1] * src[7];
        tmp[3]  = src[3] * src[5];
        tmp[4]  = src[1] * src[6];
        tmp[5]  = src[2] * src[5];
        tmp[6]  = src[0] * src[7];
        tmp[7]  = src[3] * src[4];
        tmp[8]  = src[0] * src[6];
        tmp[9]  = src[2] * src[4];
        tmp[10] = src[0] * src[5];
        tmp[11] = src[1] * src[4];

        // calculate second 8 elements (cofactors)
        dst[8]   = tmp[0]  * src[13] + tmp[3]  * src[14] + tmp[4]  * src[15];
        dst[8]  -= tmp[1]  * src[13] + tmp[2]  * src[14] + tmp[5]  * src[15];
        dst[9]   = tmp[1]  * src[12] + tmp[6]  * src[14] + tmp[9]  * src[15];
        dst[9]  -= tmp[0]  * src[12] + tmp[7]  * src[14] + tmp[8]  * src[15];
        dst[10]  = tmp[2]  * src[12] + tmp[7]  * src[13] + tmp[10] * src[15];
        dst[10] -= tmp[3]  * src[12] + tmp[6]  * src[13] + tmp[11] * src[15];
        dst[11]  = tmp[5]  * src[12] + tmp[8]  * src[13] + tmp[11] * src[14];
        dst[11] -= tmp[4]  * src[12] + tmp[9]  * src[13] + tmp[10] * src[14];
        dst[12]  = tmp[2]  * src[10] + tmp[5]  * src[11] + tmp[1]  * src[9];
        dst[12] -= tmp[4]  * src[11] + tmp[0]  * src[9]  + tmp[3]  * src[10];
        dst[13]  = tmp[8]  * src[11] + tmp[0]  * src[8]  + tmp[7]  * src[10];
        dst[13] -= tmp[6]  * src[10] + tmp[9]  * src[11] + tmp[1]  * src[8];
        dst[14]  = tmp[6]  * src[9]  + tmp[11] * src[11] + tmp[3]  * src[8];
        dst[14] -= tmp[10] * src[11] + tmp[2]  * src[8]  + tmp[7]  * src[9];
        dst[15]  = tmp[10] * src[10] + tmp[4]  * src[8]  + tmp[9]  * src[9];
        dst[15] -= tmp[8]  * src[9]  + tmp[11] * src[10] + tmp[5]  * src[8];

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

        return new Matrix4(
                dst[0], dst[4], dst[8],  dst[12],
                dst[1], dst[5], dst[9],  dst[13],
                dst[2], dst[6], dst[10], dst[14],
                dst[3], dst[7], dst[11], dst[15]);
    };

    /**
     * Returns the transpose of this matrix.
     *
     * @memberof Matrix4
     *
     * @return {Matrix4} The transpose of this matrix.
     */
    Matrix4.prototype.transpose = function() {
        return new Matrix4(
                this.getColumn0Row0(), this.getColumn0Row1(), this.getColumn0Row2(), this.getColumn0Row3(),
                this.getColumn1Row0(), this.getColumn1Row1(), this.getColumn1Row2(), this.getColumn1Row3(),
                this.getColumn2Row0(), this.getColumn2Row1(), this.getColumn2Row2(), this.getColumn2Row3(),
                this.getColumn3Row0(), this.getColumn3Row1(), this.getColumn3Row2(), this.getColumn3Row3());
    };

    /**
     * Multiplies a vector by this matrix, that is, v' = Mv, where M is this, v is the vector argument, and v' is returned.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian4} vector The vector that is multiplied with this.
     * @return {Cartesian4} The transformed vector.
     */
    Matrix4.prototype.multiplyByVector = function(vector) {
        var vX = vector.x;
        var vY = vector.y;
        var vZ = vector.z;
        var vW = vector.w;

        var x =
            this.getColumnMajorValue(0)  * vX +
            this.getColumnMajorValue(4)  * vY +
            this.getColumnMajorValue(8)  * vZ +
            this.getColumnMajorValue(12) * vW;

        var y =
            this.getColumnMajorValue(1)  * vX +
            this.getColumnMajorValue(5)  * vY +
            this.getColumnMajorValue(9)  * vZ +
            this.getColumnMajorValue(13) * vW;

        var z =
            this.getColumnMajorValue(2)  * vX +
            this.getColumnMajorValue(6)  * vY +
            this.getColumnMajorValue(10) * vZ +
            this.getColumnMajorValue(14) * vW;

        var w =
            this.getColumnMajorValue(3)  * vX +
            this.getColumnMajorValue(7)  * vY +
            this.getColumnMajorValue(11) * vZ +
            this.getColumnMajorValue(15) * vW;

        return new Cartesian4(x, y, z, w);
    };

    /**
     * Multiplies a matrix by this matrix.
     *
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix that is on the right hand side of the multiplication.
     * @return {Matrix4} The multipled matrix.
     */
    Matrix4.prototype.multiply = function(matrix) {
        var l = this.values;
        var r = matrix.values;

        var col0row0 =
            l[0]  * r[0] +
            l[4]  * r[1] +
            l[8]  * r[2] +
            l[12] * r[3];
        var col0row1 =
            l[1]  * r[0] +
            l[5]  * r[1] +
            l[9]  * r[2] +
            l[13] * r[3];
        var col0row2 =
            l[2]  * r[0] +
            l[6]  * r[1] +
            l[10] * r[2] +
            l[14] * r[3];
        var col0row3 =
            l[3]  * r[0] +
            l[7]  * r[1] +
            l[11] * r[2] +
            l[15] * r[3];

        var col1row0 =
            l[0]  * r[4] +
            l[4]  * r[5] +
            l[8]  * r[6] +
            l[12] * r[7];
        var col1row1 =
            l[1]  * r[4] +
            l[5]  * r[5] +
            l[9]  * r[6] +
            l[13] * r[7];
        var col1row2 =
            l[2]  * r[4] +
            l[6]  * r[5] +
            l[10] * r[6] +
            l[14] * r[7];
        var col1row3 =
            l[3]  * r[4] +
            l[7]  * r[5] +
            l[11] * r[6] +
            l[15] * r[7];

        var col2row0 =
            l[0]  * r[8]  +
            l[4]  * r[9]  +
            l[8]  * r[10] +
            l[12] * r[11];
        var col2row1 =
            l[1]  * r[8]  +
            l[5]  * r[9]  +
            l[9]  * r[10] +
            l[13] * r[11];
        var col2row2 =
            l[2]  * r[8]  +
            l[6]  * r[9]  +
            l[10] * r[10] +
            l[14] * r[11];
        var col2row3 =
            l[3]  * r[8]  +
            l[7]  * r[9]  +
            l[11] * r[10] +
            l[15] * r[11];

        var col3row0 =
            l[0]  * r[12] +
            l[4]  * r[13] +
            l[8]  * r[14] +
            l[12] * r[15];
        var col3row1 =
            l[1]  * r[12] +
            l[5]  * r[13] +
            l[9]  * r[14] +
            l[13] * r[15];
        var col3row2 =
            l[2]  * r[12] +
            l[6]  * r[13] +
            l[10] * r[14] +
            l[14] * r[15];
        var col3row3 =
            l[3]  * r[12] +
            l[7]  * r[13] +
            l[11] * r[14] +
            l[15] * r[15];

        return new Matrix4(
                col0row0, col1row0, col2row0, col3row0,
                col0row1, col1row1, col2row1, col3row1,
                col0row2, col1row2, col2row2, col3row2,
                col0row3, col1row3, col2row3, col3row3);
    };

    /**
     * Returns a copy of this matrix with each element negated.
     *
     * @memberof Matrix4
     *
     * @return {Matrix4} A copy of this matrix with each element negated.
     */
    Matrix4.prototype.negate = function() {
        return new Matrix4(
                -this.getColumn0Row0(), -this.getColumn1Row0(), -this.getColumn2Row0(), -this.getColumn3Row0(),
                -this.getColumn0Row1(), -this.getColumn1Row1(), -this.getColumn2Row1(), -this.getColumn3Row1(),
                -this.getColumn0Row2(), -this.getColumn1Row2(), -this.getColumn2Row2(), -this.getColumn3Row2(),
                -this.getColumn0Row3(), -this.getColumn1Row3(), -this.getColumn2Row3(), -this.getColumn3Row3());
    };

    /**
     * Returns a duplicate of a Matrix4 instance.
     *
     * @memberof Matrix4
     *
     * @return {Matrix4} A new copy of the Matrix4 instance.
     */
    Matrix4.prototype.clone = function() {
        return new Matrix4(
                this.getColumn0Row0(), this.getColumn1Row0(), this.getColumn2Row0(), this.getColumn3Row0(),
                this.getColumn0Row1(), this.getColumn1Row1(), this.getColumn2Row1(), this.getColumn3Row1(),
                this.getColumn0Row2(), this.getColumn1Row2(), this.getColumn2Row2(), this.getColumn3Row2(),
                this.getColumn0Row3(), this.getColumn1Row3(), this.getColumn2Row3(), this.getColumn3Row3());
    };

    /**
     * Returns <code>true</code> if this matrix equals other element-wise.
     *
     * @memberof Matrix4
     *
     * @param {Matrix4} other The matrix to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the matrices are equal element-wise; otherwise, <code>false</code>.
     */
    Matrix4.prototype.equals = function(other) {
        var thisValues = this.values;
        var otherValues = other.values;
        for ( var i = 0, len = thisValues.length; i < len; i++) {
            if (thisValues[i] !== otherValues[i]) {
                return false;
            }
        }
        return true;
    };

    /**
     * Returns <code>true</code> if this matrix equals other element-wise within the specified epsilon.
     *
     * @memberof Matrix4
     *
     * @param {Matrix4} other The matrix to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the matrices are equal element-wise within the specified epsilon; otherwise, <code>false</code>.
     */
    Matrix4.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        var thisValues = this.values;
        var otherValues = other.values;
        for ( var i = 0, len = thisValues.length; i < len; i++) {
            if (Math.abs(thisValues[i] - otherValues[i]) > epsilon) {
                return false;
            }
        }
        return true;
    };

    /**
     * Returns a string representing this instance with one line per row in the matrix.
     *
     * @memberof Matrix4
     *
     * @return {String} Returns a string representing this instance.
     */
    Matrix4.prototype.toString = function() {
        return '(' + this.getColumn0Row0() + ', ' + this.getColumn1Row0() + ', ' + this.getColumn2Row0() + ', ' + this.getColumn3Row0() + ')\n' +
               '(' + this.getColumn0Row1() + ', ' + this.getColumn1Row1() + ', ' + this.getColumn2Row1() + ', ' + this.getColumn3Row1() + ')\n' +
               '(' + this.getColumn0Row2() + ', ' + this.getColumn1Row2() + ', ' + this.getColumn2Row2() + ', ' + this.getColumn3Row2() + ')\n' +
               '(' + this.getColumn0Row3() + ', ' + this.getColumn1Row3() + ', ' + this.getColumn2Row3() + ', ' + this.getColumn3Row3() + ')';
    };

    return Matrix4;
});
