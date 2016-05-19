/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError
    ) {
    'use strict';

    /**
     * An arbitrarily sized matrix of (values.length/numColumns)x(numColumns),
     * indexable as a column-major order array.
     *
     * This is for use in operations involving non-square matrices, or square matrices larger than 4x4.
     * Matrix is not as efficient as the more streamlined Matrix2, Matrix3 and Matrix4 which should be
     * used instead wherever possible.
     *
     * @alias Matrix
     * @constructor
     * @param {Number[]} values A column-major order array of numbers to initialize the matrix.
     * @param {Number} [numColumns = 1] The number of columns to divide the values into; default creates a column vector.
     *
     * @exception {DeveloperError} values.length must divide evenly by numColumns.
     *
     * @see Matrix2
     * @see Matrix3
     * @see Matrix4
     */
    function Matrix(values, numColumns) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(values)) {
            throw new DeveloperError('values parameter is required');
        }
        numColumns = defaultValue(numColumns, 1);
        var numRows = values.length / numColumns;
        if (Math.floor(numRows) !== numRows) {
            throw new DeveloperError('values.length doesn\'t divide evenly by numColumns');
        }
        //>>includeEnd('debug');


        for (var i = 0; i < values.length; i++) {
            this[i] = values[i];
        }

        /**
         * The number of rows in this matrix.
         *
         * @type {Number}
         */
        this.rows = numRows;

        /**
         * The number of columns in this matrix.
         *
         * @type {Number}
         */
        this.columns = numColumns;

        /**
         * The total number of values in this matrix,
         * expected to match the product of rows and columns.
         *
         * @type {Number}
         */
        this.length = values.length;
    }

    /**
     * Duplicates a Matrix instance.
     *
     * @param {Matrix} matrix The matrix to duplicate.
     * @param {Matrix} [result] The object onto which to store the result.
     * @returns {Matrix} The modified result parameter or a new Matrix instance if one was not provided. (Returns undefined if matrix is undefined)
     */
    Matrix.clone = function(matrix, result) {
        if (!defined(matrix)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Matrix(matrix, matrix.columns);
        }
        for (var i = 0; i < matrix.length; i++) {
            result[i] = matrix[i];
        }
        result.rows = matrix.rows;
        result.columns = matrix.columns;
        result.length = matrix.length;

        return result;
    };

    /**
     * Computes the transpose of the provided matrix.
     *
     * @param {Matrix} matrix The matrix to transpose.
     * @param {Matrix} result The object onto which to store the result.
     * @returns {Matrix} The modified result parameter.
     */
    Matrix.transpose = function(matrix, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        //>>includeEnd('debug');
        if (matrix === result) {
            matrix = matrix.clone();
        }

        for (var i = 0; i < matrix.columns; i++) {
            for (var j = 0; j < matrix.rows; j++) {
                result[matrix.columns * i + j] = matrix[matrix.columns * j + i];
            }
        }
        result.rows = matrix.columns;
        result.columns = matrix.rows;
        result.length = matrix.length;

        return result;
    };

    /**
     * Computes the product of two matrices.
     *
     * @param {Matrix} left The first matrix.
     * @param {Matrix} right The second matrix.
     * @param {Matrix} result The object onto which to store the result.
     * @returns {Matrix} The modified result parameter.
     *
     * @exception {DeveloperError} The inner dimensions of left and right must match.
     */
    Matrix.multiply = function(left, right, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        if (left.columns !== right.rows) {
            throw new DeveloperError('Unable to multiply matrices; inner dimensions must match');
        }
        //>>includeEnd('debug');
        if (left=== result) {
            left = left.clone();
        }
        if (right === result) {
            right = right.clone();
        }

        for (var i = 0; i < left.rows; i++) {
            for (var j = 0; j < right.columns; j++) {
                var index = right.columns * j + i;
                result[index] = 0;
                for (var k = 0; k < left.columns; k++) {
                    result[index] += left[left.columns * k + i] * right[right.rows * j + k];
                }
            }
        }

        result.rows = left.rows;
        result.columns = right.columns;
        result.length = result.rows * result.columns;

        return result;
    };

    /**
     * Computes the product of a matrix and a scalar.
     *
     * @param {Matrix} matrix The matrix.
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix} result The object onto which to store the result.
     * @returns {Matrix} The modified result parameter.
     */
    Matrix.multiplyByScalar = function(matrix, scalar, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        //>>includeEnd('debug');

        for (var i = 0; i < matrix.length; i++) {
            result[i] = scalar * matrix[i];
        }

        result.rows = matrix.rows;
        result.columns = matrix.columns;
        result.length = matrix.length;

        return result;
    };

    /**
     * Computes the sum of two matrices.
     *
     * @param {Matrix} left The first matrix.
     * @param {Matrix} right The second matrix.
     * @param {Matrix} result The object onto which to store the result.
     * @returns {Matrix} The modified result parameter.
     *
     * @exception {DeveloperError} The dimensions of left and right must match.
     */
    Matrix.add = function(left, right, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        if (left.rows !== right.rows || left.columns !== right.columns) {
            throw new DeveloperError('Unable to add matrices; dimensions must match');
        }
        //>>includeEnd('debug');
        if (left === result) {
            left = left.clone();
        }
        if (right === result) {
            right = right.clone();
        }

        for (var i = 0; i < left.length; i++) {
            result[i] = left[i] + right[i];
        }

        result.rows = left.rows;
        result.columns = left.columns;
        result.length = left.length;

        return result;
    };

    /**
     * Duplicates the provided Matrix instance.
     *
     * @param {Matrix} [result] The object onto which to store the result.
     * @returns {Matrix} The modified result parameter or a new Matrix instance if one was not provided.
     */
    Matrix.prototype.clone = function(result) {
        return Matrix.clone(this, result);
    };

    /**
     * Append a value to a Matrix instance representing a column or row vector.
     *
     * @param {Number} value The value to append.
     *
     * @exception {DeveloperError} The provided Matrix instance must be a column or row vector.
     */
    Matrix.prototype.push = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (this.rows !== 1 && this.columns !== 1) {
            throw new DeveloperError('push is only supported on column and row vectors');
        }
        //>>includeEnd('debug');
        this[this.length] = value;
        this.length++;
        if (this.rows === 1) {
            this.columns++;
        }
        else {
            this.rows++;
        }
    };

    /**
     * Remove a value from the end of a Matrix instance representing a column or row vector.
     *
     * @returns {Number} The removed value.
     *
     * @exception {DeveloperError} The provided Matrix instance must be a column or row vector.
     */
    Matrix.prototype.pop = function() {
        //>>includeStart('debug', pragmas.debug);
        if (this.rows !== 1 && this.columns !== 1) {
            throw new DeveloperError('pop is only supported on column and row vectors');
        }
        //>>includeEnd('debug');
        this.length--;
        var value = this[this.length];
        this[this.length] = undefined;
        if (this.rows === 1) {
            this.columns--;
        }
        else {
            this.rows--;
        }

        return value;
    };

    return Matrix;
});