/*global define*/
define(['./interpolateWithDegree'], function(interpolateWithDegree) {
    "use strict";

    var LagrangePolynomialApproximation = {
        type : 'Lagrange'
    };

    LagrangePolynomialApproximation.getRequiredDataPoints = function(degree, inputOrder) {
        return Math.max(Math.ceil((degree + 1.0) / (inputOrder + 1.0)), 2);
    };

    LagrangePolynomialApproximation.interpolateWithDegree = function(x, xTable, yTable, degree, yStride, inputOrder, outputOrder) {
        return interpolateWithDegree(x, xTable, yTable, degree, yStride, inputOrder, outputOrder, LagrangePolynomialApproximation);
    };

    LagrangePolynomialApproximation.interpolate = function(x, xTable, yTable, yStride, inputOrder, outputOrder, startIndex, length) {
        if (startIndex === undefined) {
            startIndex = 0;
        }
        if (length === undefined) {
            length = xTable.length;
        }

        var i, j, m, order, derivOrder;

        //A Lagrange Polynomial made from "length" points is degree "length-1", so that is the
        //maximum number of nonzero derivatives.
        var maxNonZeroDerivatives = length - 1;

        //For all the orders <= inputOrder the coefficient will be the same (coefficients[0]),
        //after that each order will have a different coefficient.
        var numCoef = Math.min(Math.max(1, outputOrder - inputOrder + 1), maxNonZeroDerivatives + 1);

        var result = new Array(yStride * (outputOrder + 1));
        for (i = 0; i < result.length; i++) {
            result[i] = 0;
        }

        // The number of doubles in the yTable corresponding to each double in the xTable.
        var yPerX = yStride * (inputOrder + 1);

        var firstIndex = startIndex;
        var lastIndex = startIndex + length - 1;
        var reservedIndices = [];

        for (m = firstIndex; m <= lastIndex; m++) {
            reservedIndices.push(m);

            var coefficients = new Array(numCoef);
            coefficients[0] = 1;
            for (j = 1; j < numCoef; j++) {
                coefficients[j] = 0;
            }

            lagrangeInterpolateCoefficients(x, xTable, startIndex, lastIndex, reservedIndices, coefficients);
            reservedIndices.splice(0, 1);

            for (order = 0; order <= inputOrder && order <= outputOrder; order++) {
                for (i = 0; i < yStride; ++i) {
                    result[i + yStride * order] += coefficients[0] * yTable[m * yPerX + i + yStride * order];
                }
            }

            for (derivOrder = 1; derivOrder < coefficients.length; derivOrder++) {
                for (i = 0; i < yStride; i++) {
                    result[yStride * order + i] += coefficients[derivOrder] * yTable[m * yPerX + i + yStride * inputOrder];
                }
                order++;
            }
        }

        return result;
    };

    LagrangePolynomialApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride) {
        var i, j, length = xTable.length, result = new Array(yStride);

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

    function lagrangeInterpolateCoefficients(x, xTable, startIndex, lastIndex, reservedXIndices, coefficients) {
        var i, j, k;
        for (i = startIndex; i <= lastIndex; i++) {
            var reserved = false;
            for (j = 0; j < reservedXIndices.length && !reserved; j++) {
                if (i === reservedXIndices[j]) {
                    reserved = true;
                }
            }

            if (!reserved) {
                var childCoef = new Array(coefficients.length - 1);
                for (k = 0; k < childCoef.length; k++) {
                    childCoef[k] = 0;
                }

                if (childCoef.length > 0) {
                    childCoef[0] = 1;
                    reservedXIndices.push(i);
                    lagrangeInterpolateCoefficients(x, xTable, startIndex, lastIndex, reservedXIndices, childCoef);
                    reservedXIndices.splice(reservedXIndices.length - 1, 1);
                }

                var diffX = xTable[reservedXIndices[0]] - xTable[i];
                coefficients[0] *= (x - xTable[i]) / diffX;

                for (k = 0; k < childCoef.length; k++) {
                    coefficients[k + 1] += childCoef[k] / diffX;
                }
            }
        }
    }

    return LagrangePolynomialApproximation;
});