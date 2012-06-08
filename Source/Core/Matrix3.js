/*global define*/
define([
        './DeveloperError',
        './Cartesian3'
    ],
    function(
        DeveloperError,
        Cartesian3) {
    "use strict";

    var numberOfElements = 9;

    /**
     * A 3x3 matrix, stored internally in column-major order.
     *
     * <p>
     * When called with no arguments, the matrix elements are initialized to all zeros.
     * When called with one numeric argument, f, the columns are initialized to [f, 0, 0] [0, f, 0] [0, 0, f].  Hence new Matrix3(1) creates the identity matrix.
     * When called with nine numeric arguments in row-major order, these arguments define the elements of the matrix.
     * </p>
     *
     * @name Matrix3
     * @constructor
     * @immutable
     *
     * @see Matrix3.fromColumnMajorArray
     * @see Matrix2
     * @see Matrix4
     * @see Quaternion
     */
    function Matrix3() {
        var values = this.values = []; // Column-major
        values.length = numberOfElements;

        if (arguments.length === 0) {
            for ( var i = 0; i < numberOfElements; ++i) {
                values[i] = 0;
            }
        } else if (arguments.length < numberOfElements) {
            values[0] = arguments[0];
            values[1] = 0;
            values[2] = 0;

            values[3] = 0;
            values[4] = arguments[0];
            values[5] = 0;

            values[6] = 0;
            values[7] = 0;
            values[8] = arguments[0];
        } else if (arguments.length >= 9) {
            values[0] = arguments[0]; // Column 0, Row 0
            values[1] = arguments[3]; // Column 0, Row 1
            values[2] = arguments[6]; // Column 0, Row 2

            values[3] = arguments[1]; // Column 1, Row 0
            values[4] = arguments[4]; // Column 1, Row 1
            values[5] = arguments[7]; // Column 1, Row 2

            values[6] = arguments[2]; // Column 2, Row 0
            values[7] = arguments[5]; // Column 2, Row 1
            values[8] = arguments[8]; // Column 2, Row 2
        }
    }

    /**
     * Returns the element at column 0, row 0.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 0, row 0.
     */
    Matrix3.prototype.getColumn0Row0 = function() {
        return this.values[0];
    };

    /**
     * Returns the element at column 0, row 1.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 0, row 1.
     */
    Matrix3.prototype.getColumn0Row1 = function() {
        return this.values[1];
    };

    /**
     * Returns the element at column 0, row 2.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 0, row 2.
     */
    Matrix3.prototype.getColumn0Row2 = function() {
        return this.values[2];
    };

    /**
     * Returns the element at column 1, row 0.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 1, row 0.
     */
    Matrix3.prototype.getColumn1Row0 = function() {
        return this.values[3];
    };

    /**
     * Returns the element at column 1, row 1.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 1, row 1.
     */
    Matrix3.prototype.getColumn1Row1 = function() {
        return this.values[4];
    };

    /**
     * Returns the element at column 1, row 2.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 1, row 2.
     */
    Matrix3.prototype.getColumn1Row2 = function() {
        return this.values[5];
    };

    /**
     * Returns the element at column 2, row 0.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 2, row 0.
     */
    Matrix3.prototype.getColumn2Row0 = function() {
        return this.values[6];
    };

    /**
     * Returns the element at column 2, row 1.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 2, row 1.
     */
    Matrix3.prototype.getColumn2Row1 = function() {
        return this.values[7];
    };

    /**
     * Returns the element at column 2, row 1.
     *
     * @memberof Matrix3
     * @return {Number} The element at column 2, row 1.
     */
    Matrix3.prototype.getColumn2Row2 = function() {
        return this.values[8];
    };

    /**
     * Returns the element at the zero-based, column-major index.
     *
     * @memberof Matrix3
     * @return {Number} The element at the zero-based, column-major index.
     * @exception {DeveloperError} index must be between 0 and 8.
     */
    Matrix3.prototype.getColumnMajorValue = function(index) {
        if (index < 0 || index > 8) {
            throw new DeveloperError('index must be between 0 and 8.');
        }

        return this.values[index];
    };

    /**
     * Creates a 3x3 uniform scale matrix.
     *
     * @memberof Matrix3
     *
     * @param {Number} scale The uniform scale in the x, y, and z directions.
     *
     * @see Matrix3.createNonUniformScale
     *
     * @example
     * var m = Matrix3.createScale(2.0);
     * var v = m.multiplyWithVector(new Cartesian3(1.0, 1.0, 1.0));
     * // v is (2.0, 2.0, 2.0)
     */
    Matrix3.createScale = function(scale) {
        if (scale) {
            return new Matrix3(
                    scale, 0.0,   0.0,
                    0.0,   scale, 0.0,
                    0.0,   0.0,   scale);
        }

        return new Matrix3();
    };

    /**
     * Creates a 3x3 non-uniform scale matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} scale The non-uniform scale in the x, y, and z directions.
     *
     * @see Matrix3.createScale
     *
     * @example
     * var m = Matrix3.createNonUniformScale(new Cartesian3(1.0, 2.0, 3.0));
     * var v = m.multiplyWithVector(new Cartesian3(1.0, 1.0, 1.0));
     * // v is (1.0, 2.0, 3.0)
     */
    Matrix3.createNonUniformScale = function(scale) {
        if (scale) {
            return new Matrix3(
                    scale.x, 0.0,     0.0,
                    0.0,     scale.y, 0.0,
                    0.0,     0.0,     scale.z);
        }

        return new Matrix3();
    };

    /**
     * Returns a copy of the first, i.e. leftmost, column of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Cartesian3} The first column of this matrix.
     *
     * @see Matrix3#setColumn0
     *
     * @example
     * var m = Matrix3.IDENTITY;
     * var c = m.getColumn0(); // (x, y, z) == (1.0, 0.0, 0.0)
     */
    Matrix3.prototype.getColumn0 = function() {
        var values = this.values;
        return new Cartesian3(values[0], values[1], values[2]);
    };

    /**
     * Sets the first, i.e. leftmost, column of this matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} column The first column of this matrix.
     *
     * @see Matrix3#getColumn0
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0)
     * m.setColumn0(new Cartesian3(1.0, 2.0, 3.0));
     */
    Matrix3.prototype.setColumn0 = function(column) {
        var values = this.values;
        values[0] = column.x;
        values[1] = column.y;
        values[2] = column.z;
    };

    /**
     * Returns a copy of the second column of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Cartesian3} The second column of this matrix.
     *
     * @see Matrix3#setColumn1
     *
     * @example
     * var m = Matrix3.IDENTITY;
     * var c = m.getColumn1(); // (x, y, z) == (0.0, 1.0, 0.0)
     */
    Matrix3.prototype.getColumn1 = function() {
        var values = this.values;
        return new Cartesian3(values[3], values[4], values[5]);
    };

    /**
     * Sets the second column of this matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} column The second column of this matrix.
     *
     * @see Matrix3#getColumn1
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0)
     * m.setColumn1(new Cartesian3(1.0, 2.0, 3.0));
     */
    Matrix3.prototype.setColumn1 = function(column) {
        var values = this.values;
        values[3] = column.x;
        values[4] = column.y;
        values[5] = column.z;
    };

    /**
     * Returns a copy of the third, i.e. rightmost, column of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Cartesian3} The third column of this matrix.
     *
     * @see Matrix3#setColumn2
     *
     * @example
     * var m = Matrix3.IDENTITY;
     * var c = m.getColumn2(); // (x, y, z) == (0.0, 0.0, 1.0)
     */
    Matrix3.prototype.getColumn2 = function() {
        var values = this.values;
        return new Cartesian3(values[6], values[7], values[8]);
    };

    /**
     * Sets the third, i.e. rightmost, column of this matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} column The third column of this matrix.
     *
     * @see Matrix3#getColumn2
     *
     * @example
     * // Column will be (1.0, 2.0, 3.0)
     * m.setColumn1(new Cartesian3(1.0, 2.0, 3.0));
     */
    Matrix3.prototype.setColumn2 = function(column) {
        var values = this.values;
        values[6] = column.x;
        values[7] = column.y;
        values[8] = column.z;
    };

    /**
     * Returns a copy of the first, i.e. top, row of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Cartesian3} The first row of this matrix.
     *
     * @see Matrix3#setRow0
     *
     * @example
     * var m = Matrix3.IDENTITY;
     * var c = m.getRow0(); // (x, y, z) == (1.0, 0.0, 0.0)
     */
    Matrix3.prototype.getRow0 = function() {
        var values = this.values;
        return new Cartesian3(values[0], values[3], values[6]);
    };

    /**
     * Sets the first, i.e. top, row of this matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} row The first row of this matrix.
     *
     * @see Matrix3#getRow0
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0)
     * m.setRow0(new Cartesian3(1.0, 2.0, 3.0));
     */
    Matrix3.prototype.setRow0 = function(row) {
        var values = this.values;
        values[0] = row.x;
        values[3] = row.y;
        values[6] = row.z;
    };

    /**
     * Returns a copy of the second, e.g. middle, row of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Cartesian3} The second row of this matrix.
     *
     * @see Matrix3#setRow1
     *
     * @example
     * var m = Matrix3.IDENTITY;
     * var c = m.getRow1(); // (x, y, z) == (0.0, 1.0, 0.0)
     */
    Matrix3.prototype.getRow1 = function() {
        var values = this.values;
        return new Cartesian3(values[1], values[4], values[7]);
    };

    /**
     * Sets the second, i.e. middle, row of this matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} row The second row of this matrix.
     *
     * @see Matrix3#getRow1
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0)
     * m.setRow1(new Cartesian3(1.0, 2.0, 3.0));
     */
    Matrix3.prototype.setRow1 = function(row) {
        var values = this.values;
        values[1] = row.x;
        values[4] = row.y;
        values[7] = row.z;
    };

    /**
     * Returns a copy of the third, i.e. bottom, row of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Cartesian3} The third row of this matrix.
     *
     * @see Matrix3#setRow2
     *
     * @example
     * var m = Matrix3.IDENTITY;
     * var c = m.getRow2(); // (x, y, z) == (0.0, 0.0, 1.0)
     */
    Matrix3.prototype.getRow2 = function() {
        var values = this.values;
        return new Cartesian3(values[2], values[5], values[8]);
    };

    /**
     * Sets the third, i.e. bottom, row of this matrix.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} row The third row of this matrix.
     *
     * @see Matrix3#getRow2
     *
     * @example
     * // Row will be (1.0, 2.0, 3.0)
     * m.setRow2(new Cartesian3(1.0, 2.0, 3.0));
     */
    Matrix3.prototype.setRow2 = function(row) {
        var values = this.values;
        values[2] = row.x;
        values[5] = row.y;
        values[8] = row.z;
    };

    /**
     * DOC_TBA
     *
     * @memberof Matrix3
     *
     * @exception {DeveloperError} columnMajorValues must have 9 elements.
     */
    Matrix3.fromColumnMajorArray = function(columnMajorValues) {
        if (columnMajorValues) {
            if (columnMajorValues.length === numberOfElements) {
                return new Matrix3(
                        columnMajorValues[0], columnMajorValues[3], columnMajorValues[6],
                        columnMajorValues[1], columnMajorValues[4], columnMajorValues[7],
                        columnMajorValues[2], columnMajorValues[5], columnMajorValues[8]);
            }

            throw new DeveloperError('columnMajorValues must have 9 elements.');
        }
        return new Matrix3();
    };

    /**
     * An immutable Matrix3 instance initialized to the identity matrix.
     *
     * @memberof Matrix3
     */
    Matrix3.IDENTITY = Object.freeze(new Matrix3(1));

    /**
     * Returns 9, the number of elements in a Matrix3.
     *
     * @memberof Matrix3
     *
     * @return {Number} 9.
     */
    Matrix3.getNumberOfElements = function() {
        return numberOfElements;
    };

    /**
     * Returns the transpose of this matrix.
     *
     * @memberof Matrix3
     *
     * @return {Matrix3} The transpose of this matrix.
     */
    Matrix3.prototype.transpose = function() {
        return new Matrix3(
                this.getColumn0Row0(), this.getColumn0Row1(), this.getColumn0Row2(),
                this.getColumn1Row0(), this.getColumn1Row1(), this.getColumn1Row2(),
                this.getColumn2Row0(), this.getColumn2Row1(), this.getColumn2Row2());
    };

    /**
     * Multiplies a vector by this matrix, that is, v' = Mv, where M is this, v is the vector argument, and v' is returned.
     *
     * @memberof Matrix3
     * @param {Cartesian3} vector The vector that is multiplied with this.
     * @return {Cartesian3} The transformed vector.
     */
    Matrix3.prototype.multiplyWithVector = function(vector) {
        var vX = vector.x;
        var vY = vector.y;
        var vZ = vector.z;

        var x = this.getColumnMajorValue(0) * vX +
                this.getColumnMajorValue(3) * vY +
                this.getColumnMajorValue(6) * vZ;

        var y = this.getColumnMajorValue(1) * vX +
                this.getColumnMajorValue(4) * vY +
                this.getColumnMajorValue(7) * vZ;

        var z = this.getColumnMajorValue(2) * vX +
                this.getColumnMajorValue(5) * vY +
                this.getColumnMajorValue(8) * vZ;

        return new Cartesian3(x, y, z);
    };

    /**
     * Multiplies a matrix by this matrix.
     *
     * @memberof Matrix3
     * @param {Matrix3} matrix The matrix that is on the right hand side of the multiplication.
     * @return {Matrix3} The multipled matrix.
     */
    Matrix3.prototype.multiplyWithMatrix = function(matrix) {
        var col0row0 =
            this.getColumnMajorValue(0) * matrix.getColumnMajorValue(0) +
            this.getColumnMajorValue(3) * matrix.getColumnMajorValue(1) +
            this.getColumnMajorValue(6) * matrix.getColumnMajorValue(2);
        var col0row1 =
            this.getColumnMajorValue(1) * matrix.getColumnMajorValue(0) +
            this.getColumnMajorValue(4) * matrix.getColumnMajorValue(1) +
            this.getColumnMajorValue(7) * matrix.getColumnMajorValue(2);
        var col0row2 =
            this.getColumnMajorValue(2) * matrix.getColumnMajorValue(0) +
            this.getColumnMajorValue(5) * matrix.getColumnMajorValue(1) +
            this.getColumnMajorValue(8) * matrix.getColumnMajorValue(2);

        var col1row0 =
            this.getColumnMajorValue(0) * matrix.getColumnMajorValue(3) +
            this.getColumnMajorValue(3) * matrix.getColumnMajorValue(4) +
            this.getColumnMajorValue(6) * matrix.getColumnMajorValue(5);
        var col1row1 =
            this.getColumnMajorValue(1) * matrix.getColumnMajorValue(3) +
            this.getColumnMajorValue(4) * matrix.getColumnMajorValue(4) +
            this.getColumnMajorValue(7) * matrix.getColumnMajorValue(5);
        var col1row2 =
            this.getColumnMajorValue(2) * matrix.getColumnMajorValue(3) +
            this.getColumnMajorValue(5) * matrix.getColumnMajorValue(4) +
            this.getColumnMajorValue(8) * matrix.getColumnMajorValue(5);

        var col2row0 =
            this.getColumnMajorValue(0) * matrix.getColumnMajorValue(6) +
            this.getColumnMajorValue(3) * matrix.getColumnMajorValue(7) +
            this.getColumnMajorValue(6) * matrix.getColumnMajorValue(8);
        var col2row1 =
            this.getColumnMajorValue(1) * matrix.getColumnMajorValue(6) +
            this.getColumnMajorValue(4) * matrix.getColumnMajorValue(7) +
            this.getColumnMajorValue(6) * matrix.getColumnMajorValue(8);
        var col2row2 =
            this.getColumnMajorValue(2) * matrix.getColumnMajorValue(6) +
            this.getColumnMajorValue(5) * matrix.getColumnMajorValue(7) +
            this.getColumnMajorValue(8) * matrix.getColumnMajorValue(8);

        return new Matrix3(
                col0row0, col1row0, col2row0,
                col0row1, col1row1, col2row1,
                col0row2, col1row2, col2row2);
    };

    /**
     * Returns a copy of this matrix with each element negated.
     *
     * @memberof Matrix3
     *
     * @return {Matrix3} A copy of this matrix with each element negated.
     */
    Matrix3.prototype.negate = function() {
        return new Matrix3(
                -this.getColumn0Row0(), -this.getColumn1Row0(), -this.getColumn2Row0(),
                -this.getColumn0Row1(), -this.getColumn1Row1(), -this.getColumn2Row1(),
                -this.getColumn0Row2(), -this.getColumn1Row2(), -this.getColumn2Row2());
    };

    /**
     * Returns a duplicate of a Matrix3 instance.
     *
     * @memberof Matrix3
     *
     * @return {Matrix3} A new copy of the Matrix3 instance.
     */
    Matrix3.prototype.clone = function() {
        return new Matrix3(
                this.getColumn0Row0(), this.getColumn1Row0(), this.getColumn2Row0(),
                this.getColumn0Row1(), this.getColumn1Row1(), this.getColumn2Row1(),
                this.getColumn0Row2(), this.getColumn1Row2(), this.getColumn2Row2());
    };

    /**
     * Returns <code>true</code> if this matrix equals other element-wise.
     *
     * @memberof Matrix3
     * @param {Matrix3} other The matrix to compare for equality.
     * @return {Boolean} <code>true</code> if the matrices are equal element-wise; otherwise, <code>false</code>.
     */
    Matrix3.prototype.equals = function(other) {
        for ( var i = 0; i < numberOfElements; ++i) {
            if (this.getColumnMajorValue(i) !== other.getColumnMajorValue(i)) {
                return false;
            }
        }
        return true;
    };

    /**
     * Returns <code>true</code> if this matrix equals other element-wise within the specified epsilon.
     *
     * @param {Matrix3} other The matrix to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if the matrices are equal element-wise within the specified epsilon; otherwise, <code>false</code>.
     */
    Matrix3.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        for ( var i = 0; i < numberOfElements; ++i) {
            if (Math.abs(this.getColumnMajorValue(i) - other.getColumnMajorValue(i)) > epsilon) {
                return false;
            }
        }
        return true;
    };

    /**
     * Returns a string representing this instance with one line per row in the matrix.
     *
     * @memberof Matrix3
     *
     * @return {String} Returns a string representing this instance.
     */
    Matrix3.prototype.toString = function() {
        return '(' + this.getColumn0Row0() + ', ' + this.getColumn1Row0() + ', ' + this.getColumn2Row0() + ')\n' +
               '(' + this.getColumn0Row1() + ', ' + this.getColumn1Row1() + ', ' + this.getColumn2Row1() + ')\n' +
               '(' + this.getColumn0Row2() + ', ' + this.getColumn1Row2() + ', ' + this.getColumn2Row2() + ')';
    };

    /**
     * Returns a matrix that rotates a vector <code>theta</code> radians around the z-axis.
     *
     * @memberof Matrix3
     *
     * @param {Number} theta The rotation angle, in radians.
     *
     * @returns {Matrix3} The rotation matrix.
     *
     * @see Matrix3.rotationAroundY
     * @see Matrix3.rotationAroundX
     */
    Matrix3.rotationAroundZ = function(theta) {
        var c = Math.cos(theta);
        var s = Math.sin(theta);
        return new Matrix3(
                  c,  -s, 0.0,
                  s,   c, 0.0,
                0.0, 0.0, 1.0);
    };

    /**
     * Returns a matrix that rotates a vector <code>theta</code> radians around the y-axis.
     *
     * @memberof Matrix3
     *
     * @param {Number} theta The rotation angle, in radians.
     *
     * @returns {Matrix3} The rotation matrix.
     *
     * @see Matrix3.rotationAroundZ
     * @see Matrix3.rotationAroundX
     */
    Matrix3.rotationAroundY = function(theta) {
        var c = Math.cos(theta);
        var s = Math.sin(theta);
        return new Matrix3(
                  c, 0.0,   s,
                0.0, 1.0, 0.0,
                 -s, 0.0,   c);
    };

    /**
     * Returns a matrix that rotates a vector <code>theta</code> radians around the x-axis.
     *
     * @param {Number} theta The rotation angle, in radians.
     *
     * @returns {Matrix3} The rotation matrix.
     *
     * @see Matrix3.rotationAroundZ
     * @see Matrix3.rotationAroundY
     */
    Matrix3.rotationAroundX = function(theta) {
        var c = Math.cos(theta);
        var s = Math.sin(theta);
        return new Matrix3(
                1.0, 0.0, 0.0,
                0.0,   c,  -s,
                0.0,   s,   c);
    };

    /**
     * Returns a matrix that rotates a vector <code>theta</code> radians around <code>axis</code>.
     *
     * @memberof Matrix3
     *
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} theta The rotation angle, in radians.
     *
     * @returns {Matrix3} The rotation matrix.
     *
     * @see Quaternion.fromAxisAngle
     */
    Matrix3.fromAxisAngle = function(axis, theta) {
        var a = Cartesian3.clone(axis);
        var nAxis = a.normalize();

        var cosTheta = Math.cos(theta);
        var sinTheta = Math.sin(theta);
        var oneMinusCosTheta = 1.0 - cosTheta;

        var xy = nAxis.x * nAxis.y;
        var xz = nAxis.x * nAxis.z;
        var yz = nAxis.y * nAxis.z;

        var m00 = cosTheta + oneMinusCosTheta * nAxis.x * nAxis.x;
        var m01 = oneMinusCosTheta * xy + nAxis.z * sinTheta;
        var m02 = oneMinusCosTheta * xz - nAxis.y * sinTheta;

        var m10 = oneMinusCosTheta * xy - nAxis.z * sinTheta;
        var m11 = cosTheta + oneMinusCosTheta * nAxis.y * nAxis.y;
        var m12 = oneMinusCosTheta * yz + nAxis.x * sinTheta;

        var m20 = oneMinusCosTheta * xz + nAxis.y * sinTheta;
        var m21 = oneMinusCosTheta * yz - nAxis.x * sinTheta;
        var m22 = cosTheta + oneMinusCosTheta * nAxis.z * nAxis.z;

        return new Matrix3(
                m00, m10, m20,
                m01, m11, m21,
                m02, m12, m22);
    };

    return Matrix3;
});
