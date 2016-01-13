/*global define*/
define([
        './Cartesian3',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian3,
        defined,
        DeveloperError) {
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
     * @param {Number[]} diagonal An array with length <code>n</code> that contains the diagonal of the coefficient matrix.
     * @param {Number[]} lower An array with length <code>n - 1</code> that contains the lower diagonal of the coefficient matrix.
     * @param {Number[]} upper An array with length <code>n - 1</code> that contains the upper diagonal of the coefficient matrix.
     * @param {Cartesian3[]} right An array of Cartesians with length <code>n</code> that is the right side of the system of equations.
     *
     * @exception {DeveloperError} diagonal and right must have the same lengths.
     * @exception {DeveloperError} lower and upper must have the same lengths.
     * @exception {DeveloperError} lower and upper must be one less than the length of diagonal.
     *
     * @performance Linear time.
     *
     * @example
     * var lowerDiagonal = [1.0, 1.0, 1.0, 1.0];
     * var diagonal = [2.0, 4.0, 4.0, 4.0, 2.0];
     * var upperDiagonal = [1.0, 1.0, 1.0, 1.0];
     * var rightHandSide = [
     *     new Cesium.Cartesian3(410757.0, -1595711.0, 1375302.0),
     *     new Cesium.Cartesian3(-5986705.0, -2190640.0, 1099600.0),
     *     new Cesium.Cartesian3(-12593180.0, 288588.0, -1755549.0),
     *     new Cesium.Cartesian3(-5349898.0, 2457005.0, -2685438.0),
     *     new Cesium.Cartesian3(845820.0, 1573488.0, -1205591.0)
     * ];
     *
     * var solution = Cesium.TridiagonalSystemSolver.solve(lowerDiagonal, diagonal, upperDiagonal, rightHandSide);
     *
     * @returns {Cartesian3[]} An array of Cartesians with length <code>n</code> that is the solution to the tridiagonal system of equations.
     */
    TridiagonalSystemSolver.solve = function(lower, diagonal, upper, right) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(lower) || !(lower instanceof Array)) {
            throw new DeveloperError('The array lower is required.');
        }
        if (!defined(diagonal) || !(diagonal instanceof Array)) {
            throw new DeveloperError('The array diagonal is required.');
        }
        if (!defined(upper) || !(upper instanceof Array)) {
            throw new DeveloperError('The array upper is required.');
        }
        if (!defined(right) || !(right instanceof Array)) {
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
        //>>includeEnd('debug');

        var c = new Array(upper.length);
        var d = new Array(right.length);
        var x = new Array(right.length);

        var i;
        for (i = 0; i < d.length; i++) {
            d[i] = new Cartesian3();
            x[i] = new Cartesian3();
        }

        c[0] = upper[0] / diagonal[0];
        d[0] = Cartesian3.multiplyByScalar(right[0], 1.0 / diagonal[0], d[0]);

        var scalar;
        for (i = 1; i < c.length; ++i) {
            scalar = 1.0 / (diagonal[i] - c[i - 1] * lower[i - 1]);
            c[i] = upper[i] * scalar;
            d[i] = Cartesian3.subtract(right[i], Cartesian3.multiplyByScalar(d[i - 1], lower[i - 1], d[i]), d[i]);
            d[i] = Cartesian3.multiplyByScalar(d[i], scalar, d[i]);
        }

        scalar = 1.0 / (diagonal[i] - c[i - 1] * lower[i - 1]);
        d[i] = Cartesian3.subtract(right[i], Cartesian3.multiplyByScalar(d[i - 1], lower[i - 1], d[i]), d[i]);
        d[i] = Cartesian3.multiplyByScalar(d[i], scalar, d[i]);

        x[x.length - 1] = d[d.length - 1];
        for (i = x.length - 2; i >= 0; --i) {
            x[i] = Cartesian3.subtract(d[i], Cartesian3.multiplyByScalar(x[i + 1], c[i], x[i]), x[i]);
        }

        return x;
    };

    return TridiagonalSystemSolver;
});
