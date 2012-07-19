/*global define*/
define([
        './DeveloperError',
        './Cartesian2'
       ],
    function(
        DeveloperError,
        Cartesian2) {
    "use strict";

    /**
     * A 2x2 matrix, indexable as a column-major order array.
     * Constructor parameters are in row-major order for code readability.
     * @alias Matrix2
     * @constructor
     *
     * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
     * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
     * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
     * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
     *
     * @see Matrix2.fromColumnMajor
     * @see Matrix2.fromRowMajorArray
     * @see Matrix3
     * @see Matrix4
     */
    var Matrix2 = function(column0Row0, column1Row0, column0Row1, column1Row1) {
        this[0] = typeof column0Row0 === 'undefined' ? 0.0 : column0Row0;
        this[1] = typeof column0Row1 === 'undefined' ? 0.0 : column0Row1;
        this[2] = typeof column1Row0 === 'undefined' ? 0.0 : column1Row0;
        this[3] = typeof column1Row1 === 'undefined' ? 0.0 : column1Row1;
    };

    /**
     * Duplicates a Matrix2 instance.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to duplicate.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix2.clone = function(values, result) {
        if (typeof values === 'undefined') {
            throw new DeveloperError('values is required');
        }
        if (typeof result === 'undefined') {
            return new Matrix2(values[0], values[2],
                               values[1], values[3]);
        }
        result[0] = values[0];
        result[1] = values[1];
        result[2] = values[2];
        result[3] = values[3];
        return result;
    };

    /**
     * Creates a Matrix2 instance from a column-major order array.
     * @memberof Matrix2
     * @function
     *
     * @param {Array} values The column-major order array.
     * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} values is required.
     */
    Matrix2.fromColumnMajorArray = Matrix2.clone;

    /**
     * Creates a Matrix2 instance from a row-major order array.
     * The resulting matrix will be in column-major order.
     * @memberof Matrix2
     *
     * @param {Array} values The row-major order array.
     * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} values is required.
     */
    Matrix2.fromRowMajorArray = function(values, result) {
        if (typeof values === 'undefined') {
            throw new DeveloperError('values is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix2(values[0], values[1],
                               values[2], values[3]);
        }
        result[0] = values[0];
        result[1] = values[2];
        result[2] = values[1];
        result[3] = values[3];
        return result;
    };

    /**
     * Creates an Array from the provided Matrix2 instance.
     * The array will be in column-major order.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to use..
     * @param {Array} [result] The Array onto which to store the result.
     * @return {Array} The modified Array parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix2.toArray = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return [matrix[0], matrix[1], matrix[2], matrix[3]];
        }
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        return result;
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.getColumn = function(matrix, index, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 1) {
            throw new DeveloperError('index is required and must be 0 or 1.');
        }

        var startIndex = index * 2;
        var x = matrix[startIndex];
        var y = matrix[startIndex + 1];

        if (typeof result === 'undefined') {
            return new Cartesian2(x, y);
        }
        result.x = x;
        result.y = y;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified column.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.setColumn = function(matrix, index, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 1) {
            throw new DeveloperError('index is required and must be 0 or 1.');
        }
        result = Matrix2.clone(matrix, result);
        var startIndex = index * 2;
        result[startIndex] = cartesian.x;
        result[startIndex + 1] = cartesian.y;
        return result;
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.getRow = function(matrix, index, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 1) {
            throw new DeveloperError('index is required and must be 0 or 1.');
        }

        var x = matrix[index];
        var y = matrix[index + 2];

        if (typeof result === 'undefined') {
            return new Cartesian2(x, y);
        }
        result.x = x;
        result.y = y;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified row.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.setRow = function(matrix, index, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 1) {
            throw new DeveloperError('index is required and must be 0 or 1.');
        }

        result = Matrix2.clone(matrix, result);
        result[index] = cartesian.x;
        result[index + 2] = cartesian.y;
        return result;
    };

    /**
     * Computes the product of two matrices.
     * @memberof Matrix2
     *
     * @param {Matrix2} left The first matrix.
     * @param {Matrix2} right The second matrix.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Matrix2.multiply = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }

        var column0Row0 = left[0] * right[0] + left[2] * right[1];
        var column1Row0 = left[0] * right[2] + left[2] * right[3];
        var column0Row1 = left[1] * right[0] + left[3] * right[1];
        var column1Row1 = left[1] * right[2] + left[3] * right[3];

        if (typeof result === 'undefined') {
            return new Matrix2(column0Row0, column1Row0,
                               column0Row1, column1Row1);
        }
        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column1Row0;
        result[3] = column1Row1;
        return result;
    };

    /**
     * Computes the product of a matrix and a column vector.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix.
     * @param {Cartesian2} cartesian The column.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix2.multiplyByVector = function(matrix, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        var x = matrix[0] * cartesian.x + matrix[2] * cartesian.y;
        var y = matrix[1] * cartesian.x + matrix[3] * cartesian.y;

        if (typeof result === 'undefined') {
            return new Cartesian2(x, y);
        }
        result.x = x;
        result.y = y;
        return result;
    };

    /**
     * Computes the product of a matrix and a scalar.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix.
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Matrix2.multiplyByScalar = function(matrix, scalar, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number');
        }

        if (typeof result === 'undefined') {
            return new Matrix2(matrix[0] * scalar, matrix[2] * scalar,
                               matrix[1] * scalar, matrix[3] * scalar);
        }
        result[0] = matrix[0] * scalar;
        result[1] = matrix[1] * scalar;
        result[2] = matrix[2] * scalar;
        result[3] = matrix[3] * scalar;
        return result;
    };

    /**
     * Creates a negated copy of the provided matrix.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to negate.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix2.negate = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        if (typeof result === 'undefined') {
            return new Matrix2(-matrix[0], -matrix[2],
                               -matrix[1], -matrix[3]);
        }
        result[0] = -matrix[0];
        result[1] = -matrix[1];
        result[2] = -matrix[2];
        result[3] = -matrix[3];
        return result;
    };

    /**
     * Computes the transpose of the provided matrix.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to transpose.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix2.transpose = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        var column0Row0 = matrix[0];
        var column0Row1 = matrix[2];
        var column1Row0 = matrix[1];
        var column1Row1 = matrix[3];

        if (typeof result === 'undefined') {
            return new Matrix2(column0Row0, column1Row0,
                               column0Row1, column1Row1);
        }
        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column1Row0;
        result[3] = column1Row1;
        return result;
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Matrix2
     *
     * @param {Matrix2} [left] The first matrix.
     * @param {Matrix2} [right] The second matrix.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Matrix2.equals = function(left, right) {
        return (left === right) ||
               (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                left[0] === right[0] &&
                left[1] === right[1] &&
                left[2] === right[2] &&
                left[3] === right[3]);
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Matrix2
     *
     * @param {Matrix2} [left] The first matrix.
     * @param {Matrix2} [right] The second matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Matrix2.equalsEpsilon = function(left, right, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number');
        }

        return (left === right) ||
                (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                Math.abs(left[0] - right[0]) <= epsilon &&
                Math.abs(left[1] - right[1]) <= epsilon &&
                Math.abs(left[2] - right[2]) <= epsilon &&
                Math.abs(left[3] - right[3]) <= epsilon);
    };

    /**
     * An immutable Matrix2 instance initialized to the identity matrix.
     * @memberof Matrix2
     */
    Matrix2.IDENTITY = Object.freeze(new Matrix2(1.0, 0.0, 0.0, 1.0));

    /**
     * The index into Matrix2 for column 0, row 0.
     * @memberof Matrix2
     *
     * @example
     * var matrix = new Matrix2();
     * matrix[Matrix2.COLUMN0ROW0] = 5.0; //set column 0, row 0 to 5.0
     */
    Matrix2.COLUMN0ROW0 = 0;

    /**
     * The index into Matrix2 for column 0, row 1.
     * @memberof Matrix2
     *
     * @example
     * var matrix = new Matrix2();
     * matrix[Matrix2.COLUMN0ROW1] = 5.0; //set column 0, row 1 to 5.0
     */
    Matrix2.COLUMN0ROW1 = 1;

    /**
     * The index into Matrix2 for column 1, row 0.
     * @memberof Matrix2
     *
     * @example
     * var matrix = new Matrix2();
     * matrix[Matrix2.COLUMN1ROW0] = 5.0; //set column 1, row 0 to 5.0
     */
    Matrix2.COLUMN1ROW0 = 2;

    /**
     * The index into Matrix2 for column 1, row 1.
     * @memberof Matrix2
     *
     * @example
     * var matrix = new Matrix2();
     * matrix[Matrix2.COLUMN1ROW1] = 5.0; //set column 1, row 1 to 5.0
     */
    Matrix2.COLUMN1ROW1 = 3;

    /**
     * Duplicates the provided Matrix2 instance.
     * @memberof Matrix2
     *
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     */
    Matrix2.prototype.clone = function(result) {
        return Matrix2.clone(this, result);
    };

    /**
     * Creates an Array from this Matrix2 instance.
     * @memberof Matrix2
     *
     * @param {Array} [result] The Array onto which to store the result.
     * @return {Array} The modified Array parameter or a new Array instance if none was provided.
     */
    Matrix2.prototype.toArray = function(result) {
        return Matrix2.toArray(this, result);
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.prototype.getColumn = function(index, result) {
        return Matrix2.getColumn(this, index, result);
    };

    /**
     * Computes a new matrix that replaces the specified column in this matrix with the provided Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified column.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.prototype.setColumn = function(index, cartesian, result) {
        return Matrix2.setColumn(this, index, cartesian, result);
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.prototype.getRow = function(index, result) {
        return Matrix2.getRow(this, index, result);
    };

    /**
     * Computes a new matrix that replaces the specified row in this matrix with the provided Cartesian2 instance.
     * @memberof Matrix2
     *
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified row.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0 or 1.
     *
     * @see Cartesian2
     */
    Matrix2.prototype.setRow = function(index, cartesian, result) {
        return Matrix2.setRow(this, index, cartesian, result);
    };

    /**
     * Computes the product of this matrix and the provided matrix.
     * @memberof Matrix2
     *
     * @param {Matrix2} right The right hand side matrix.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Matrix2.prototype.multiply = function(right, result) {
        return Matrix2.multiply(this, right, result);
    };

    /**
     * Computes the product of this matrix and a column vector.
     * @memberof Matrix2
     *
     * @param {Cartesian2} cartesian The column.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix2.prototype.multiplyByVector = function(cartesian, result) {
        return Matrix2.multiplyByVector(this, cartesian, result);
    };

    /**
     * Computes the product of this matrix and a scalar.
     * @memberof Matrix2
     *
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Matrix2.prototype.multiplyByScalar = function(scalar, result) {
        return Matrix2.multiplyByScalar(this, scalar, result);
    };
    /**
     * Creates a negated copy of this matrix.
     * @memberof Matrix2
     *
     * @param {Matrix2} matrix The matrix to negate.
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix2.prototype.negate = function(result) {
        return Matrix2.negate(this, result);
    };

    /**
     * Computes the transpose of this matrix.
     * @memberof Matrix2
     *
     * @param {Matrix2} [result] The object onto which to store the result.
     * @return {Matrix2} The modified result parameter or a new Matrix2 instance if none was provided.
     */
    Matrix2.prototype.transpose = function(result) {
        return Matrix2.transpose(this, result);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Matrix2
     *
     * @param {Matrix2} [right] The right hand side matrix.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Matrix2.prototype.equals = function(right) {
        return Matrix2.equals(this, right);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Matrix2
     *
     * @param {Matrix2} [right] The right hand side matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Matrix2.prototype.equalsEpsilon = function(right, epsilon) {
        return Matrix2.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Creates a string representing this Matrix with each row being
     * on a separate line and in the format '(column1, column2)'.
     * @memberof Matrix2
     *
     * @return {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column1, column2)'.
     */
    Matrix2.prototype.toString = function() {
        return '(' + this[0] + ', ' + this[2] + ')\n' +
               '(' + this[1] + ', ' + this[3] + ')';
    };

    return Matrix2;
});
