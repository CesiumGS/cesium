/*global define*/
define([
        './DeveloperError'
       ],function(
         DeveloperError) {
    "use strict";


    /**
     * Functions for performing linear interpolation.
     * @exports LinearApproximation
     *
     * @see LagrangePolynomialApproximation
     * @see HermitePolynomialApproximation
     */
    var LinearApproximation = {
        type : 'Linear'
    };

    /**
     * Given the desired degree, returns the number of data points required for interpolation.
     *
     * @memberof LinearApproximation
     *
     * @param degree The desired degree of interpolation.
     *
     * @exception {DeveloperError} Linear interpolation can only generate a first degree polynomial.
     *
     * @returns The number of required data points needed for the desired degree of interpolation.
     */
    LinearApproximation.getRequiredDataPoints = function(degree) {
        if (degree !== 1) {
            throw new DeveloperError('Linear interpolation can only generate a first degree polynomial.');
        }
        return 2;
    };

    /**
     * <p>
     * Interpolates values using the supplied interpolation algorithm.  The appropriate subset of input
     * values to use for the interpolation is determined automatically from an interpolation given
     * degree.
     * </p>
     * <p>
     * The xTable array can contain any number of elements, and the appropriate subset will be
     * selected according to the degree of interpolation requested.  For example, if degree is 5,
     * the 6 elements surrounding x will be used for interpolation.  When using
     * {@link LinearApproximation} the degree should be 1 since it always deals with only 2 elements
     * surrounding x. The yTable array should contain a number of elements equal to:
     * <code>xTable.length * yStride</code>.  If insufficient elements are provided
     * to perform the requested degree of interpolation, the highest possible degree of interpolation
     * will be performed.
     * </p>
     *
     * @param {Number} x The independent variable for which the dependent variables will be interpolated.
     *
     * @param {Array} xTable The array of independent variables to use to interpolate.  The values
     * in this array must be in increasing order and the same value must not occur twice in the array.
     *
     * @param {Array} yTable The array of dependent variables to use to interpolate.  For a set of three
     * dependent values (p,q,w) and their derivatives (dp, dq, dw) at time 1 and time 2 this should be
     * as follows: {p1, q1, w1, dp1, dq1, dw1, p2, q2, w2, dp2, dq2, dw2}.
     *
     * @param {Number} yStride The number of dependent variable values in yTable corresponding to
     * each independent variable value in xTable.
     *
     * @returns An array of interpolated values.  The array contains at least yStride elements, each
     * of which is an interpolated dependent variable value.
     *
     * @see LagrangePolynomialApproximation
     * @see HermitePolynomialApproximation
     *
     *
     * @memberof LinearApproximation
     */
    LinearApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride) {
        if (xTable.length !== 2) {
            throw new DeveloperError('The xTable provided to the linear interpolator must have exactly two elements.');
        } else if (yStride <= 0) {
            throw new DeveloperError('There must be at least 1 dependent variable for each independent variable.');
        }

        var result = new Array(yStride), x0 = xTable[0], x1 = xTable[1], i, y0, y1;

        for (i = 0; i < yStride; i++) {
            //calculates the interpolated values

            y0 = yTable[i];
            y1 = yTable[i + yStride];

            result[i] = (((y1 - y0) * x) + (x1 * y0) - (x0 * y1)) / (x1 - x0);
        }

        return result;
    };

    return LinearApproximation;
});