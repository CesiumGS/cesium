import defined from './defined.js';
import DeveloperError from './DeveloperError.js';

    /**
     * An {@link InterpolationAlgorithm} for performing linear interpolation.
     *
     * @exports LinearApproximation
     */
    var LinearApproximation = {
        type : 'Linear'
    };

    /**
     * Given the desired degree, returns the number of data points required for interpolation.
     * Since linear interpolation can only generate a first degree polynomial, this function
     * always returns 2.
     * @param {Number} degree The desired degree of interpolation.
     * @returns {Number} This function always returns 2.
     *
     */
    LinearApproximation.getRequiredDataPoints = function(degree) {
        return 2;
    };

    /**
     * Interpolates values using linear approximation.
     *
     * @param {Number} x The independent variable for which the dependent variables will be interpolated.
     * @param {Number[]} xTable The array of independent variables to use to interpolate.  The values
     * in this array must be in increasing order and the same value must not occur twice in the array.
     * @param {Number[]} yTable The array of dependent variables to use to interpolate.  For a set of three
     * dependent values (p,q,w) at time 1 and time 2 this should be as follows: {p1, q1, w1, p2, q2, w2}.
     * @param {Number} yStride The number of dependent variable values in yTable corresponding to
     * each independent variable value in xTable.
     * @param {Number[]} [result] An existing array into which to store the result.
     * @returns {Number[]} The array of interpolated values, or the result parameter if one was provided.
     */
    LinearApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride, result) {
        //>>includeStart('debug', pragmas.debug);
        if (xTable.length !== 2) {
            throw new DeveloperError('The xTable provided to the linear interpolator must have exactly two elements.');
        } else if (yStride <= 0) {
            throw new DeveloperError('There must be at least 1 dependent variable for each independent variable.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Array(yStride);
        }

        var i;
        var y0;
        var y1;
        var x0 = xTable[0];
        var x1 = xTable[1];

        //>>includeStart('debug', pragmas.debug);
        if (x0 === x1) {
            throw new DeveloperError('Divide by zero error: xTable[0] and xTable[1] are equal');
        }
        //>>includeEnd('debug');

        for (i = 0; i < yStride; i++) {
            y0 = yTable[i];
            y1 = yTable[i + yStride];
            result[i] = (((y1 - y0) * x) + (x1 * y0) - (x0 * y1)) / (x1 - x0);
        }

        return result;
    };
export default LinearApproximation;
