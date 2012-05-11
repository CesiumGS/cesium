/*global define*/
define(['./interpolateWithDegree'], function(interpolateWithDegree) {
    "use strict";

    var LinearApproximation = {
        type : 'Linear'
    };

    LinearApproximation.getRequiredDataPoints = function(degree) {
        if (degree !== 1) {
            throw 'Linear interpolation can only generate a first degree polynomial.';
        }
        return 2;
    };

    LinearApproximation.interpolateWithDegree = function(x, xTable, yTable, degree, yStride, inputOrder, outputOrder) {
        return interpolateWithDegree(x, xTable, yTable, degree, yStride, inputOrder, outputOrder, LinearApproximation);
    };

    LinearApproximation.interpolate = function(x, xTable, yTable, yStride, inputOrder, outputOrder, startIndex, length) {
        if (startIndex === undefined) {
            startIndex = 0;
        }
        if (length === undefined) {
            length = xTable.length;
        }

        if (length > 2) {
            throw 'The xTable provided to the linear interpolator must have exactly two elements.';
        } else if (startIndex > xTable.length - 2) {
            throw 'The startIndex must be within the bounds of xTable.';
        } else if (yStride <= 0) {
            throw 'There must be at least 1 dependent variable for each independent variable.';
        }

        var result = new Array((outputOrder + 1) * yStride);
        var x0 = xTable[startIndex];
        var x1 = xTable[startIndex + 1];

        var i, j, order, yIndex, y0, y1;
        var interpolationOrder = Math.min(inputOrder, outputOrder);
        for (order = 0; order <= interpolationOrder; order++) {
            yIndex = startIndex * yStride * (inputOrder + 1);
            for (j = 0; j < yStride; j++) {
                //calculates the interpolated values

                y0 = yTable[yIndex + order * yStride];
                y1 = yTable[yIndex + yStride * (inputOrder + 1 + order)];

                yIndex++;

                result[j + order * yStride] = (((y1 - y0) * x) + (x1 * y0) - (x0 * y1)) / (x1 - x0);
            }
        }

        if (outputOrder > inputOrder) {
            //calculates the derivatives of the interpolated values
            yIndex = startIndex * yStride * (inputOrder + 1) + yStride * inputOrder;

            for (i = 0; i < yStride; i++) {
                y0 = yTable[yIndex];
                y1 = yTable[yIndex + yStride * (inputOrder + 1)];

                result[i + order * yStride] = (y1 - y0) / (xTable[startIndex + 1] - xTable[startIndex]);

                yIndex += 1;
            }
            order++;

            if (outputOrder > inputOrder + 1) {
                //generates zeroes for all derivatives past the first degree.
                for (j = order * yStride; j < result.length; j++) {
                    result[j] = 0;
                }
            }
        }

        return result;
    };

    LinearApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride) {
        if (xTable.length !== 2) {
            throw 'The xTable provided to the linear interpolator must have exactly two elements.';
        } else if (yStride <= 0) {
            throw 'There must be at least 1 dependent variable for each independent variable.';
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