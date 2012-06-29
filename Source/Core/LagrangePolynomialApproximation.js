/*global define*/
define(function() {
    "use strict";

    /**
     * Functions for performing Lagrange interpolation.
     * @exports LagrangePolynomialApproximation
     *
     * @see LinearApproximation
     * @see HermitePolynomialApproximation
     */
    var LagrangePolynomialApproximation = {
        type : 'Lagrange'
    };

    /**
     * Given the desired degree, returns the number of data points required for interpolation.
     *
     * @memberof LagrangePolynomialApproximation
     *
     * @param degree The desired degree of interpolation.
     *
     * @returns The number of required data points needed for the desired degree of interpolation.
     */
    LagrangePolynomialApproximation.getRequiredDataPoints = function(degree) {
        return Math.max(degree + 1.0, 2);
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
     * @see LinearApproximation
     * @see HermitePolynomialApproximation
     *
     * @memberof LagrangePolynomialApproximation
     *
     */
    LagrangePolynomialApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride) {
        var i;
        var j;
        var length = xTable.length;
        var result = new Array(yStride);

        for (i = 0; i < yStride; i++) {
            result[i] = 0;
        }

        for (i = 0; i < length; i++) {
            var coefficient = 1;

            for (j = 0; j < length; j++) {
                if (j !== i) {
                    var diffX = xTable[i] - xTable[j];
                    coefficient *= (x - xTable[j]) / diffX;
                }
            }

            for (j = 0; j < yStride; j++) {
                result[j] += coefficient * yTable[i * yStride + j];
            }
        }

        return result;
    };

    return LagrangePolynomialApproximation;
});