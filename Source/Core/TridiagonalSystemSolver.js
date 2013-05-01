/*global define*/
define(['./DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Uses the Tridiagonal Matrix Algorithm, also known as the Thomas Algorithm, to solve
     * a system of linear equations where the coefficient matrix is a tridiagonal matrix.
     *
     * @exports TridiagonalSystemSolver
     */
    var TridiagonalSystemSolver = {};

    /**
     * Solves a tridiagonal system of linear equations.
     *
     * @param {Array} diagonal An array with length <code>n</code> that contains the diagonal of the coefficient matrix.
     * @param {Array} lower An array with length <code>n - 1</code> that contains the lower diagonal of the coefficient matrix.
     * @param {Array} upper An array with length <code>n - 1</code> that contains the upper diagonal of the coefficient matrix.
     * @param {Array} right An array of Cartesians with length <code>n</code> that is the right side of the system of equations.
     *
     * @exception {DeveloperError} The array lower is required.
     * @exception {DeveloperError} The array diagonal is required.
     * @exception {DeveloperError} The array upper is required.
     * @exception {DeveloperError} The array right is required.
     * @exception {DeveloperError} diagonal and right must have the same lengths.
     * @exception {DeveloperError} lower and upper must have the same lengths.
     * @exception {DeveloperError} lower and upper must be one less than the length of diagonal.
     *
     * @returns {Array} An array of Cartesians with length <code>n</code> that is the solution to the tridiagonal system of equations.
     *
     * @performance Linear time.
     *
     * @example
     * var lowerDiagonal = [1.0, 1.0, 1.0, 1.0];
     * var diagonal = [2.0, 4.0, 4.0, 4.0, 2.0];
     * var upperDiagonal = [1.0, 1.0, 1.0, 1.0];
     * var rightHandSide = [
     *     new Cartesian3(410757.0, -1595711.0, 1375302.0),
     *     new Cartesian3(-5986705.0, -2190640.0, 1099600.0),
     *     new Cartesian3(-12593180.0, 288588.0, -1755549.0),
     *     new Cartesian3(-5349898.0, 2457005.0, -2685438.0),
     *     new Cartesian3(845820.0, 1573488.0, -1205591.0)
     * ];
     *
     * var solution = TridiagonalSystemSolver.solve(lowerDiagonal, diagonal, upperDiagonal, rightHandSide);
     */
    TridiagonalSystemSolver.solve = function(lower, diagonal, upper, right) {
        if (typeof lower === 'undefined' || !(lower instanceof Array)) {
            throw new DeveloperError('The array lower is required.');
        }

        if (typeof diagonal === 'undefined' || !(diagonal instanceof Array)) {
            throw new DeveloperError('The array diagonal is required.');
        }

        if (typeof upper === 'undefined' || !(upper instanceof Array)) {
            throw new DeveloperError('The array upper is required.');
        }

        if (typeof right === 'undefined' || !(right instanceof Array)) {
            throw new DeveloperError('The array right is required.');
        }

        if (diagonal.length !== right.length) {
            throw new DeveloperError('diagonal and right must have the same lengths.');
        }

        if (lower.length !== upper.length) {
            throw new DeveloperError('lower and upper must have the same lengths.');
        } else if (lower.length !== diagonal.length - 1) {
            throw new DeveloperError('lower and upper must be one less than the length of diagonal.');
        }

        var c = [], d = [], x = [];
        c.length = upper.length;
        d.length = x.length = right.length;

        c[0] = upper[0] / diagonal[0];
        d[0] = right[0].multiplyByScalar(1.0 / diagonal[0]);

        var scalar, i = 1;
        for (; i < c.length; ++i) {
            scalar = 1.0 / (diagonal[i] - c[i - 1] * lower[i - 1]);
            c[i] = upper[i] * scalar;
            d[i] = right[i].subtract(d[i - 1].multiplyByScalar(lower[i - 1]));
            d[i] = d[i].multiplyByScalar(scalar);
        }

        scalar = 1.0 / (diagonal[i] - c[i - 1] * lower[i - 1]);
        d[i] = right[i].subtract(d[i - 1].multiplyByScalar(lower[i - 1]));
        d[i] = d[i].multiplyByScalar(scalar);

        x[x.length - 1] = d[d.length - 1];
        for (i = x.length - 2; i >= 0; --i) {
            x[i] = d[i].subtract(x[i + 1].multiplyByScalar(c[i]));
        }

        return x;
    };

    return TridiagonalSystemSolver;
});
