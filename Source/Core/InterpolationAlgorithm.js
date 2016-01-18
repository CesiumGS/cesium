/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * The interface for interpolation algorithms.
     *
     * @exports InterpolationAlgorithm
     *
     * @see LagrangePolynomialApproximation
     * @see LinearApproximation
     * @see HermitePolynomialApproximation
     */
    var InterpolationAlgorithm = {};

    /**
     * Gets the name of this interpolation algorithm.
     * @type {String}
     */
    InterpolationAlgorithm.type = undefined;

    /**
     * Given the desired degree, returns the number of data points required for interpolation.
     * @function
     *
     * @param {Number} degree The desired degree of interpolation.
     * @returns {Number} The number of required data points needed for the desired degree of interpolation.
     */
    InterpolationAlgorithm.getRequiredDataPoints = DeveloperError.throwInstantiationError;

    /**
     * Performs zero order interpolation.
     * @function
     *
     * @param {Number} x The independent variable for which the dependent variables will be interpolated.
     * @param {Number[]} xTable The array of independent variables to use to interpolate.  The values
     * in this array must be in increasing order and the same value must not occur twice in the array.
     * @param {Number[]} yTable The array of dependent variables to use to interpolate.  For a set of three
     * dependent values (p,q,w) at time 1 and time 2 this should be as follows: {p1, q1, w1, p2, q2, w2}.
     * @param {Number} yStride The number of dependent variable values in yTable corresponding to
     * each independent variable value in xTable.
     * @param {Number[]} [result] An existing array into which to store the result.
     *
     * @returns {Number[]} The array of interpolated values, or the result parameter if one was provided.
     */
    InterpolationAlgorithm.interpolateOrderZero = DeveloperError.throwInstantiationError;

    /**
     * Performs higher order interpolation.  Not all interpolators need to support high-order interpolation,
     * if this function remains undefined on implementing objects, interpolateOrderZero will be used instead.
     * @function
     * @param {Number} x The independent variable for which the dependent variables will be interpolated.
     * @param {Number[]} xTable The array of independent variables to use to interpolate.  The values
     * in this array must be in increasing order and the same value must not occur twice in the array.
     * @param {Number[]} yTable The array of dependent variables to use to interpolate.  For a set of three
     * dependent values (p,q,w) at time 1 and time 2 this should be as follows: {p1, q1, w1, p2, q2, w2}.
     * @param {Number} yStride The number of dependent variable values in yTable corresponding to
     * each independent variable value in xTable.
     * @param {Number} inputOrder The number of derivatives supplied for input.
     * @param {Number} outputOrder The number of derivatives desired for output.
     * @param {Number[]} [result] An existing array into which to store the result.
     * @returns {Number[]} The array of interpolated values, or the result parameter if one was provided.
     */
    InterpolationAlgorithm.interpolate = DeveloperError.throwInstantiationError;

    return InterpolationAlgorithm;
});
