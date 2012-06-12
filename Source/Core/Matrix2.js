/*global define*/
define([
        './DeveloperError',
        './Cartesian2'
    ],
    function(
        DeveloperError,
        Cartesian2) {
    "use strict";

    var numberOfElements = 4;

    /**
     * A 2x2 matrix, stored internally in column-major order.
     *
     * <p>
     * When called with no arguments, the matrix elements are initialized to all zeros.
     * When called with one numeric argument, f, the columns are initialized to [f, 0] [0, f].  Hence new Matrix2(1) creates the identity matrix.
     * When called with four numeric arguments which define the matrix elements in row-major order; column0Row0, column1Row0, column0Row1, and column1Row1; the matrix is initialized to [column0Row0, column0Row1] [column1Row0, column1Row1].
     * </p>
     *
     * @name Matrix2
     * @constructor
     * @immutable
     *
     * @see Matrix3
     * @see Matrix4
     */
    function Matrix2() {
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
            values[3] = arguments[0];
        } else if (arguments.length >= numberOfElements) {

            values[0] = arguments[0]; // Column 0, Row 0
            values[1] = arguments[2]; // Column 1, Row 0

            values[2] = arguments[1]; // Column 0, Row 0
            values[3] = arguments[3]; // Column 1, Row 1
        }
    }

    /**
     * Returns the element at column 0, row 0.
     *
     * @memberof Matrix2
     * @return {Number} The element at column 0, row 0.
     */
    Matrix2.prototype.getColumn0Row0 = function() {
        return this.values[0];
    };

    /**
     * Returns the element at column 0, row 1.
     *
     * @memberof Matrix2
     * @return {Number} The element at column 0, row 1.
     */
    Matrix2.prototype.getColumn0Row1 = function() {
        return this.values[1];
    };

    /**
     * Returns the element at column 1, row 0.
     *
     * @memberof Matrix2
     * @return {Number} The element at column 1, row 0.
     */
    Matrix2.prototype.getColumn1Row0 = function() {
        return this.values[2];
    };

    /**
     * Returns the element at column 1, row 1.
     *
     * @memberof Matrix2
     * @return {Number} The element at column 1, row 1.
     */
    Matrix2.prototype.getColumn1Row1 = function() {
        return this.values[3];
    };

    /**
     * Returns the element at the zero-based, column-major index.
     *
     * @memberof Matrix2
     * @return {Number} The element at the zero-based, column-major index.
     * @exception {DeveloperError} index must be between 0 and 3.
     */
    Matrix2.prototype.getColumnMajorValue = function(index) {
        if (index < 0 || index > 3) {
            throw new DeveloperError('index must be between 0 and 3.');
        }

        return this.values[index];
    };

    /**
     * Creates a 2x2 uniform scale matrix.
     *
     * @memberof Matrix2
     *
     * @param {Number} scale The uniform scale in the x and y directions.
     *
     * @see Matrix2.createNonUniformScale
     *
     * @example
     * var m = Matrix2.createScale(2.0);
     * var v = m.multiplyWithVector(new Cartesian2(1.0, 1.0));
     * // v is (2.0, 2.0)
     */
    Matrix2.createScale = function(scale) {
        if (scale) {
            return new Matrix2(
                    scale, 0.0,
                    0.0,   scale);
        }

        return new Matrix2();
    };

    /**
     * Creates a 2x2 non-uniform scale matrix.
     *
     * @memberof Matrix2
     *
     * @param {Cartesian3} scale The non-uniform scale in the x and y directions.
     *
     * @see Matrix2.createScale
     *
     * @example
     * var m = Matrix2.createNonUniformScale(new Cartesian2(1.0, 2.0));
     * var v = m.multiplyWithVector(new Cartesian2(1.0, 1.0));
     * // v is (1.0, 2.0)
     */
    Matrix2.createNonUniformScale = function(scale) {
        if (scale) {
            return new Matrix2(
                    scale.x, 0.0,
                    0.0,     scale.y);
        }

        return new Matrix2();
    };

    /**
     * Returns a copy of the first, i.e. left, column of this matrix.
     *
     * @memberof Matrix2
     *
     * @return {Cartesian2} The first column of this matrix.
     *
     * @see Matrix2#setColumn0
     *
     * @example
     * var m = Matrix2.IDENTITY;
     * var c = m.getColumn0(); // (x, y) == (1.0, 0.0)
     */
    Matrix2.prototype.getColumn0 = function() {
        var values = this.values;
        return new Cartesian2(values[0], values[1]);
    };

    /**
     * Sets the first, i.e. left, column of this matrix.
     *
     * @memberof Matrix2
     *
     * @param {Cartesian2} column The first column of this matrix.
     *
     * @see Matrix2#getColumn0
     *
     * @example
     * // Column will be (1.0, 2.0)
     * m.setColumn0(new Cartesian2(1.0, 2.0));
     */
    Matrix2.prototype.setColumn0 = function(column) {
        var values = this.values;
        values[0] = column.x;
        values[1] = column.y;
    };

    /**
     * Returns a copy of the second, i.e. right, column of this matrix.
     *
     * @memberof Matrix2
     *
     * @return {Cartesian2} The second column of this matrix.
     *
     * @see Matrix2#setColumn1
     *
     * @example
     * var m = Matrix2.IDENTITY;
     * var c = m.getColumn1(); // (x, y) == (0.0, 1.0)
     */
    Matrix2.prototype.getColumn1 = function() {
        var values = this.values;
        return new Cartesian2(values[2], values[3]);
    };

    /**
     * Sets the second, i.e. right, column of this matrix.
     *
     * @memberof Matrix2
     *
     * @param {Cartesian2} column The second column of this matrix.
     *
     * @see Matrix2#getColumn1
     *
     * @example
     * // Column will be (1.0, 2.0)
     * m.setColumn1(new Cartesian2(1.0, 2.0));
     */
    Matrix2.prototype.setColumn1 = function(column) {
        var values = this.values;
        values[2] = column.x;
        values[3] = column.y;
    };

    /**
     * Returns a copy of the first, i.e. top, row of this matrix.
     *
     * @memberof Matrix2
     *
     * @return {Cartesian2} The first row of this matrix.
     *
     * @see Matrix2#setRow0
     *
     * @example
     * var m = Matrix2.IDENTITY;
     * var c = m.getRow0(); // (x, y) == (1.0, 0.0)
     */
    Matrix2.prototype.getRow0 = function() {
        var values = this.values;
        return new Cartesian2(values[0], values[2]);
    };

    /**
     * Sets the first, i.e. top, row of this matrix.
     *
     * @memberof Matrix2
     *
     * @param {Cartesian2} row The first row of this matrix.
     *
     * @see Matrix2#getRow0
     *
     * @example
     * // Row will be (1.0, 2.0)
     * m.setRow0(new Cartesian2(1.0, 2.0));
     */
    Matrix2.prototype.setRow0 = function(row) {
        var values = this.values;
        values[0] = row.x;
        values[2] = row.y;
    };

    /**
     * Returns a copy of the second, i.e. bottom, row of this matrix.
     *
     * @memberof Matrix2
     *
     * @return {Cartesian2} The second row of this matrix.
     *
     * @see Matrix2#setRow1
     *
     * @example
     * var m = Matrix2.IDENTITY;
     * var c = m.getRow1(); // (x, y) == (0.0, 1.0)
     */
    Matrix2.prototype.getRow1 = function() {
        var values = this.values;
        return new Cartesian2(values[1], values[3]);
    };

    /**
     * Sets the second, i.e. bottom, row of this matrix.
     *
     * @memberof Matrix2
     *
     * @param {Cartesian2} row The second row of this matrix.
     *
     * @see Matrix2#getRow1
     *
     * @example
     * // Row will be (1.0, 2.0)
     * m.setRow1(new Cartesian2(1.0, 2.0));
     */
    Matrix2.prototype.setRow1 = function(row) {
        var values = this.values;
        values[1] = row.x;
        values[3] = row.y;
    };

    /**
     * DOC_TBA
     *
     * @memberof Matrix2
     *
     * @exception {DeveloperError} columnMajorValues must have 4 elements.
     */
    Matrix2.fromColumnMajorArray = function(columnMajorValues) {
        if (columnMajorValues) {
            if (columnMajorValues.length === numberOfElements) {
                return new Matrix2(
                        columnMajorValues[0], columnMajorValues[2],
                        columnMajorValues[1], columnMajorValues[3]);
            }

            throw new DeveloperError('columnMajorValues must have 4 elements.');
        }
        return new Matrix2();
    };

    /**
     * An immutable Matrix2 instance initialized to the identity matrix.
     *
     * @memberof Matrix2
     */
    Matrix2.IDENTITY = Object.freeze(new Matrix2(1));

    /**
     * Returns 4, the number of elements in a Matrix2.
     *
     * @memberof Matrix2
     *
     * @return {Number} 4.
     */
    Matrix2.getNumberOfElements = function() {
        return numberOfElements;
    };

    /**
     * Returns the transpose of this matrix.
     *
     * @memberof Matrix2
     *
     * @return {Matrix2} The transpose of this matrix.
     */
    Matrix2.prototype.transpose = function() {
        return new Matrix2(
                this.getColumn0Row0(), this.getColumn0Row1(),
                this.getColumn1Row0(), this.getColumn1Row1());
    };

    /**
     * Returns a duplicate of a Matrix3 instance.
     *
     * @memberof Matrix2
     *
     * @return {Matrix2} A new copy of the Matrix3 instance.
     */
    Matrix2.prototype.clone = function() {
        return new Matrix2(
                this.getColumn0Row0(), this.getColumn1Row0(),
                this.getColumn0Row1(), this.getColumn1Row1());
    };

    /**
     * Returns <code>true</code> if this matrix equals other element-wise.
     *
     * @memberof Matrix2
     * @param {Matrix2} other The matrix to compare for equality.
     * @return {Boolean} <code>true</code> if the matrices are equal element-wise; otherwise, <code>false</code>.
     */
    Matrix2.prototype.equals = function(other) {
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
     * @memberof Matrix2
     *
     * @param {Matrix2} other The matrix to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the matrices are equal element-wise within the specified epsilon; otherwise, <code>false</code>.
     */
    Matrix2.prototype.equalsEpsilon = function(other, epsilon) {
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
     * @memberof Matrix2
     *
     * @return {String} Returns a string representing this instance.
     */
    Matrix2.prototype.toString = function() {
        return '(' + this.getColumn0Row0() + ', ' + this.getColumn1Row0() + ')\n' +
               '(' + this.getColumn0Row1() + ', ' + this.getColumn1Row1() + ')';
    };

    return Matrix2;
});
