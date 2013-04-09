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
     * Interpolates values using linear approximation.
     * </p>
     *
     * @param {Number} x The independent variable for which the dependent variables will be interpolated.
     *
     * @param {Array} xTable The array of independent variables to use to interpolate.  The values
     * in this array must be in increasing order and the same value must not occur twice in the array.
     *
     * @param {Array} yTable The array of dependent variables to use to interpolate.  For a set of three
     * dependent values (p,q,w) at time 1 and time 2 this should be as follows: {p1, q1, w1, p2, q2, w2}.
     *
     * @param {Number} yStride The number of dependent variable values in yTable corresponding to
     * each independent variable value in xTable.
     *
     * @param {Array} [result] An existing array into which to store the result.
     *
     * @returns The array of interpolated values, or the result parameter if one was provided.
     *
     * @see LagrangePolynomialApproximation
     * @see HermitePolynomialApproximation
     *
     * @memberof LinearApproximation
     */
    LinearApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride, result) {
        if (xTable.length !== 2) {
            throw new DeveloperError('The xTable provided to the linear interpolator must have exactly two elements.');
        } else if (yStride <= 0) {
            throw new DeveloperError('There must be at least 1 dependent variable for each independent variable.');
        }

        if (typeof result === 'undefined') {
            result = new Array(yStride);
        }

        var i;
        var y0;
        var y1;
        var x0 = xTable[0];
        var x1 = xTable[1];

        for (i = 0; i < yStride; i++) {
            y0 = yTable[i];
            y1 = yTable[i + yStride];
            result[i] = (((y1 - y0) * x) + (x1 * y0) - (x0 * y1)) / (x1 - x0);
        }

        return result;
    };

    return LinearApproximation;
});