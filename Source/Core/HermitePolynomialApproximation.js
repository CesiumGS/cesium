define(['./interpolateWithDegree'], function(interpolateWithDegree) {
    "use strict";

    var HermitePolynomialApproximation = {
        type : 'Hermite'
    };

    HermitePolynomialApproximation.getRequiredDataPoints = function(degree, inputOrder) {
        return Math.max(Math.ceil((degree + 1) / (inputOrder + 1)), 2);
    };

    HermitePolynomialApproximation.interpolateWithDegree = function(x, xTable, yTable, degree, yStride, inputOrder, outputOrder) {
        return interpolateWithDegree(x, xTable, yTable, degree, yStride, inputOrder, outputOrder, HermitePolynomialApproximation);
    };

    HermitePolynomialApproximation.interpolate = function(x, xTable, yTable, yStride, inputOrder, outputOrder, startIndex, length) {
        if (startIndex === undefined) {
            startIndex = 0;
        }
        if (length === undefined) {
            length = xTable.length;
        }

        var i, j, d, s, len;

        var result = new Array(yStride * (outputOrder + 1));
        for (i = 0; i < result.length; i++) {
            result[i] = 0;
        }

        var zIndices = new Array(length * (inputOrder + 1));
        for (i = 0; i < length; i++) {
            for (j = 0; j < (inputOrder + 1); j++) {
                zIndices[i * (inputOrder + 1) + j] = startIndex + i;
            }
        }

        var coefficients = new Array(yStride);
        for (j = 0; j < yStride; j++) {
            var l = new Array(zIndices.length);
            coefficients[j] = l;
            for (i = zIndices.length, d = 0; i > 0; i--, d++) {
                l[d] = [];
            }
        }

        var highestNonZeroCoef = fillCoefficientList(coefficients, zIndices, xTable, yTable, yStride, inputOrder);

        for (d = 0, len = Math.min(highestNonZeroCoef, outputOrder); d <= len; d++) {
            for (i = d; i <= highestNonZeroCoef; i++) {
                var tempTerm = calculateCoefficientTerm(x, zIndices, xTable, d, i, []);
                for (s = 0; s < yStride; s++) {
                    var coeff = coefficients[s][i][0];
                    result[s + d * yStride] += coeff * tempTerm;
                }
            }
        }

        return result;
    };

    HermitePolynomialApproximation.interpolateOrderZero = function(x, xTable, yTable, yStride) {
        var length = xTable.length, i, j, d, s, len, index, result = new Array(yStride), coefficients = new Array(yStride);

        for (i = 0; i < yStride; i++) {
            result[i] = 0;

            var l = new Array(length);
            coefficients[i] = l;
            for (j = 0; j < length; j++) {
                l[j] = [];
            }
        }

        var zIndicesLength = length, zIndices = new Array(zIndicesLength);

        for (i = 0; i < zIndicesLength; i++) {
            zIndices[i] = i;
        }

        var highestNonZeroCoef = length - 1;
        for (s = 0; s < yStride; s++) {
            for (j = 0; j < zIndicesLength; j++) {
                index = zIndices[j] * yStride + s;
                coefficients[s][0].push(yTable[index]);
            }

            for (i = 1; i < zIndicesLength; i++) {
                var nonZeroCoefficients = false;
                for (j = 0; j < zIndicesLength - i; j++) {
                    var zj = xTable[zIndices[j]];
                    var zn = xTable[zIndices[j + i]];

                    var numerator;
                    if (zn - zj <= 0) {
                        index = zIndices[j] * yStride + yStride * i + s;
                        numerator = yTable[index];
                        coefficients[s][i].push(numerator / factorial(i));
                    } else {
                        numerator = (coefficients[s][i - 1][j + 1] - coefficients[s][i - 1][j]);
                        coefficients[s][i].push(numerator / (zn - zj));
                    }
                    nonZeroCoefficients = nonZeroCoefficients || (numerator !== 0);
                }

                if (!nonZeroCoefficients) {
                    highestNonZeroCoef = i - 1;
                }
            }
        }

        for (d = 0, len = 0; d <= len; d++) {
            for (i = d; i <= highestNonZeroCoef; i++) {
                var tempTerm = calculateCoefficientTerm(x, zIndices, xTable, d, i, []);
                for (s = 0; s < yStride; s++) {
                    var coeff = coefficients[s][i][0];
                    result[s + d * yStride] += coeff * tempTerm;
                }
            }
        }

        return result;
    };

    function fillCoefficientList(coefficients, zIndices, xTable, yTable, yStride, inputOrder) {
        var i, s, j, index;
        var highestNonZero = zIndices.length - 1;
        for (s = 0; s < yStride; s++) {
            for (j = 0; j < zIndices.length; j++) {
                index = zIndices[j] * yStride * (inputOrder + 1) + s;
                coefficients[s][0].push(yTable[index]);
            }

            for (i = 1; i < zIndices.length; i++) {
                var nonZeroCoefficients = false;
                for (j = 0; j < zIndices.length - i; j++) {
                    var zj = xTable[zIndices[j]];
                    var zn = xTable[zIndices[j + i]];

                    var numerator;
                    if (zn - zj <= 0) {
                        index = zIndices[j] * yStride * (inputOrder + 1) + yStride * i + s;
                        numerator = yTable[index];
                        coefficients[s][i].push(numerator / factorial(i));
                    } else {
                        numerator = (coefficients[s][i - 1][j + 1] - coefficients[s][i - 1][j]);
                        coefficients[s][i].push(numerator / (zn - zj));
                    }
                    nonZeroCoefficients = nonZeroCoefficients || (numerator !== 0);
                }

                if (!nonZeroCoefficients) {
                    highestNonZero = i - 1;
                }
            }
        }

        return highestNonZero;
    }

    function calculateCoefficientTerm(x, zIndices, xTable, derivOrder, termOrder, reservedIndices) {
        var result = 0, i, j, reserved;

        if (derivOrder > 0) {
            for (i = 0; i < termOrder; i++) {
                reserved = false;
                for (j = 0; j < reservedIndices.length && !reserved; j++) {
                    if (i === reservedIndices[j]) {
                        reserved = true;
                    }
                }

                if (!reserved) {
                    reservedIndices.push(i);
                    result += calculateCoefficientTerm(x, zIndices, xTable, derivOrder - 1, termOrder, reservedIndices);
                    reservedIndices.splice(reservedIndices.length - 1, 1);
                }
            }

            return result;
        }

        result = 1;
        for (i = 0; i < termOrder; i++) {
            reserved = false;
            for (j = 0; j < reservedIndices.length && !reserved; j++) {
                if (i === reservedIndices[j]) {
                    reserved = true;
                }
            }

            if (!reserved) {
                result *= x - xTable[zIndices[i]];
            }
        }

        return result;
    }

    function factorial(num) {
        var sum = 1;
        for ( var i = 2; i <= num; i++) {
            sum *= i;
        }
        return sum;
    }

    return HermitePolynomialApproximation;
});