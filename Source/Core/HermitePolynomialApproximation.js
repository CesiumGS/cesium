import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

var factorial = CesiumMath.factorial;

function calculateCoefficientTerm(
  x,
  zIndices,
  xTable,
  derivOrder,
  termOrder,
  reservedIndices
) {
  var result = 0;
  var reserved;
  var i;
  var j;

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
        result += calculateCoefficientTerm(
          x,
          zIndices,
          xTable,
          derivOrder - 1,
          termOrder,
          reservedIndices
        );
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

/**
 * An {@link InterpolationAlgorithm} for performing Hermite interpolation.
 *
 * @namespace HermitePolynomialApproximation
 */
var HermitePolynomialApproximation = {
  type: "Hermite",
};

/**
 * Given the desired degree, returns the number of data points required for interpolation.
 *
 * @param {Number} degree The desired degree of interpolation.
 * @param {Number} [inputOrder=0]  The order of the inputs (0 means just the data, 1 means the data and its derivative, etc).
 * @returns {Number} The number of required data points needed for the desired degree of interpolation.
 * @exception {DeveloperError} degree must be 0 or greater.
 * @exception {DeveloperError} inputOrder must be 0 or greater.
 */
HermitePolynomialApproximation.getRequiredDataPoints = function (
  degree,
  inputOrder
) {
  inputOrder = defaultValue(inputOrder, 0);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(degree)) {
    throw new DeveloperError("degree is required.");
  }
  if (degree < 0) {
    throw new DeveloperError("degree must be 0 or greater.");
  }
  if (inputOrder < 0) {
    throw new DeveloperError("inputOrder must be 0 or greater.");
  }
  //>>includeEnd('debug');

  return Math.max(Math.floor((degree + 1) / (inputOrder + 1)), 2);
};

/**
 * Interpolates values using Hermite Polynomial Approximation.
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
HermitePolynomialApproximation.interpolateOrderZero = function (
  x,
  xTable,
  yTable,
  yStride,
  result
) {
  if (!defined(result)) {
    result = new Array(yStride);
  }

  var i;
  var j;
  var d;
  var s;
  var len;
  var index;
  var length = xTable.length;
  var coefficients = new Array(yStride);

  for (i = 0; i < yStride; i++) {
    result[i] = 0;

    var l = new Array(length);
    coefficients[i] = l;
    for (j = 0; j < length; j++) {
      l[j] = [];
    }
  }

  var zIndicesLength = length,
    zIndices = new Array(zIndicesLength);

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
          numerator = coefficients[s][i - 1][j + 1] - coefficients[s][i - 1][j];
          coefficients[s][i].push(numerator / (zn - zj));
        }
        nonZeroCoefficients = nonZeroCoefficients || numerator !== 0;
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

var arrayScratch = [];

/**
 * Interpolates values using Hermite Polynomial Approximation.
 *
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
 *
 * @returns {Number[]} The array of interpolated values, or the result parameter if one was provided.
 */
HermitePolynomialApproximation.interpolate = function (
  x,
  xTable,
  yTable,
  yStride,
  inputOrder,
  outputOrder,
  result
) {
  var resultLength = yStride * (outputOrder + 1);
  if (!defined(result)) {
    result = new Array(resultLength);
  }
  for (var r = 0; r < resultLength; r++) {
    result[r] = 0;
  }

  var length = xTable.length;
  // The zIndices array holds copies of the addresses of the xTable values
  // in the range we're looking at. Even though this just holds information already
  // available in xTable this is a much more convenient format.
  var zIndices = new Array(length * (inputOrder + 1));
  var i;
  for (i = 0; i < length; i++) {
    for (var j = 0; j < inputOrder + 1; j++) {
      zIndices[i * (inputOrder + 1) + j] = i;
    }
  }

  var zIndiceslength = zIndices.length;
  var coefficients = arrayScratch;
  var highestNonZeroCoef = fillCoefficientList(
    coefficients,
    zIndices,
    xTable,
    yTable,
    yStride,
    inputOrder
  );
  var reservedIndices = [];

  var tmp = (zIndiceslength * (zIndiceslength + 1)) / 2;
  var loopStop = Math.min(highestNonZeroCoef, outputOrder);
  for (var d = 0; d <= loopStop; d++) {
    for (i = d; i <= highestNonZeroCoef; i++) {
      reservedIndices.length = 0;
      var tempTerm = calculateCoefficientTerm(
        x,
        zIndices,
        xTable,
        d,
        i,
        reservedIndices
      );
      var dimTwo = Math.floor((i * (1 - i)) / 2) + zIndiceslength * i;

      for (var s = 0; s < yStride; s++) {
        var dimOne = Math.floor(s * tmp);
        var coef = coefficients[dimOne + dimTwo];
        result[s + d * yStride] += coef * tempTerm;
      }
    }
  }

  return result;
};

function fillCoefficientList(
  coefficients,
  zIndices,
  xTable,
  yTable,
  yStride,
  inputOrder
) {
  var j;
  var index;
  var highestNonZero = -1;
  var zIndiceslength = zIndices.length;
  var tmp = (zIndiceslength * (zIndiceslength + 1)) / 2;

  for (var s = 0; s < yStride; s++) {
    var dimOne = Math.floor(s * tmp);

    for (j = 0; j < zIndiceslength; j++) {
      index = zIndices[j] * yStride * (inputOrder + 1) + s;
      coefficients[dimOne + j] = yTable[index];
    }

    for (var i = 1; i < zIndiceslength; i++) {
      var coefIndex = 0;
      var dimTwo = Math.floor((i * (1 - i)) / 2) + zIndiceslength * i;
      var nonZeroCoefficients = false;

      for (j = 0; j < zIndiceslength - i; j++) {
        var zj = xTable[zIndices[j]];
        var zn = xTable[zIndices[j + i]];

        var numerator;
        var coefficient;
        if (zn - zj <= 0) {
          index = zIndices[j] * yStride * (inputOrder + 1) + yStride * i + s;
          numerator = yTable[index];
          coefficient = numerator / CesiumMath.factorial(i);
          coefficients[dimOne + dimTwo + coefIndex] = coefficient;
          coefIndex++;
        } else {
          var dimTwoMinusOne =
            Math.floor(((i - 1) * (2 - i)) / 2) + zIndiceslength * (i - 1);
          numerator =
            coefficients[dimOne + dimTwoMinusOne + j + 1] -
            coefficients[dimOne + dimTwoMinusOne + j];
          coefficient = numerator / (zn - zj);
          coefficients[dimOne + dimTwo + coefIndex] = coefficient;
          coefIndex++;
        }
        nonZeroCoefficients = nonZeroCoefficients || numerator !== 0.0;
      }

      if (nonZeroCoefficients) {
        highestNonZero = Math.max(highestNonZero, i);
      }
    }
  }

  return highestNonZero;
}
export default HermitePolynomialApproximation;
