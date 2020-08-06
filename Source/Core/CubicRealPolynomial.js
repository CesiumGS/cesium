import DeveloperError from "./DeveloperError.js";
import QuadraticRealPolynomial from "./QuadraticRealPolynomial.js";

/**
 * Defines functions for 3rd order polynomial functions of one variable with only real coefficients.
 *
 * @namespace CubicRealPolynomial
 */
var CubicRealPolynomial = {};

/**
 * Provides the discriminant of the cubic equation from the supplied coefficients.
 *
 * @param {Number} a The coefficient of the 3rd order monomial.
 * @param {Number} b The coefficient of the 2nd order monomial.
 * @param {Number} c The coefficient of the 1st order monomial.
 * @param {Number} d The coefficient of the 0th order monomial.
 * @returns {Number} The value of the discriminant.
 */
CubicRealPolynomial.computeDiscriminant = function (a, b, c, d) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof a !== "number") {
    throw new DeveloperError("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError("c is a required number.");
  }
  if (typeof d !== "number") {
    throw new DeveloperError("d is a required number.");
  }
  //>>includeEnd('debug');

  var a2 = a * a;
  var b2 = b * b;
  var c2 = c * c;
  var d2 = d * d;

  var discriminant =
    18.0 * a * b * c * d +
    b2 * c2 -
    27.0 * a2 * d2 -
    4.0 * (a * c2 * c + b2 * b * d);
  return discriminant;
};

function computeRealRoots(a, b, c, d) {
  var A = a;
  var B = b / 3.0;
  var C = c / 3.0;
  var D = d;

  var AC = A * C;
  var BD = B * D;
  var B2 = B * B;
  var C2 = C * C;
  var delta1 = A * C - B2;
  var delta2 = A * D - B * C;
  var delta3 = B * D - C2;

  var discriminant = 4.0 * delta1 * delta3 - delta2 * delta2;
  var temp;
  var temp1;

  if (discriminant < 0.0) {
    var ABar;
    var CBar;
    var DBar;

    if (B2 * BD >= AC * C2) {
      ABar = A;
      CBar = delta1;
      DBar = -2.0 * B * delta1 + A * delta2;
    } else {
      ABar = D;
      CBar = delta3;
      DBar = -D * delta2 + 2.0 * C * delta3;
    }

    var s = DBar < 0.0 ? -1.0 : 1.0; // This is not Math.Sign()!
    var temp0 = -s * Math.abs(ABar) * Math.sqrt(-discriminant);
    temp1 = -DBar + temp0;

    var x = temp1 / 2.0;
    var p = x < 0.0 ? -Math.pow(-x, 1.0 / 3.0) : Math.pow(x, 1.0 / 3.0);
    var q = temp1 === temp0 ? -p : -CBar / p;

    temp = CBar <= 0.0 ? p + q : -DBar / (p * p + q * q + CBar);

    if (B2 * BD >= AC * C2) {
      return [(temp - B) / A];
    }

    return [-D / (temp + C)];
  }

  var CBarA = delta1;
  var DBarA = -2.0 * B * delta1 + A * delta2;

  var CBarD = delta3;
  var DBarD = -D * delta2 + 2.0 * C * delta3;

  var squareRootOfDiscriminant = Math.sqrt(discriminant);
  var halfSquareRootOf3 = Math.sqrt(3.0) / 2.0;

  var theta = Math.abs(Math.atan2(A * squareRootOfDiscriminant, -DBarA) / 3.0);
  temp = 2.0 * Math.sqrt(-CBarA);
  var cosine = Math.cos(theta);
  temp1 = temp * cosine;
  var temp3 = temp * (-cosine / 2.0 - halfSquareRootOf3 * Math.sin(theta));

  var numeratorLarge = temp1 + temp3 > 2.0 * B ? temp1 - B : temp3 - B;
  var denominatorLarge = A;

  var root1 = numeratorLarge / denominatorLarge;

  theta = Math.abs(Math.atan2(D * squareRootOfDiscriminant, -DBarD) / 3.0);
  temp = 2.0 * Math.sqrt(-CBarD);
  cosine = Math.cos(theta);
  temp1 = temp * cosine;
  temp3 = temp * (-cosine / 2.0 - halfSquareRootOf3 * Math.sin(theta));

  var numeratorSmall = -D;
  var denominatorSmall = temp1 + temp3 < 2.0 * C ? temp1 + C : temp3 + C;

  var root3 = numeratorSmall / denominatorSmall;

  var E = denominatorLarge * denominatorSmall;
  var F =
    -numeratorLarge * denominatorSmall - denominatorLarge * numeratorSmall;
  var G = numeratorLarge * numeratorSmall;

  var root2 = (C * F - B * G) / (-B * F + C * E);

  if (root1 <= root2) {
    if (root1 <= root3) {
      if (root2 <= root3) {
        return [root1, root2, root3];
      }
      return [root1, root3, root2];
    }
    return [root3, root1, root2];
  }
  if (root1 <= root3) {
    return [root2, root1, root3];
  }
  if (root2 <= root3) {
    return [root2, root3, root1];
  }
  return [root3, root2, root1];
}

/**
 * Provides the real valued roots of the cubic polynomial with the provided coefficients.
 *
 * @param {Number} a The coefficient of the 3rd order monomial.
 * @param {Number} b The coefficient of the 2nd order monomial.
 * @param {Number} c The coefficient of the 1st order monomial.
 * @param {Number} d The coefficient of the 0th order monomial.
 * @returns {Number[]} The real valued roots.
 */
CubicRealPolynomial.computeRealRoots = function (a, b, c, d) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof a !== "number") {
    throw new DeveloperError("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError("c is a required number.");
  }
  if (typeof d !== "number") {
    throw new DeveloperError("d is a required number.");
  }
  //>>includeEnd('debug');

  var roots;
  var ratio;
  if (a === 0.0) {
    // Quadratic function: b * x^2 + c * x + d = 0.
    return QuadraticRealPolynomial.computeRealRoots(b, c, d);
  } else if (b === 0.0) {
    if (c === 0.0) {
      if (d === 0.0) {
        // 3rd order monomial: a * x^3 = 0.
        return [0.0, 0.0, 0.0];
      }

      // a * x^3 + d = 0
      ratio = -d / a;
      var root =
        ratio < 0.0 ? -Math.pow(-ratio, 1.0 / 3.0) : Math.pow(ratio, 1.0 / 3.0);
      return [root, root, root];
    } else if (d === 0.0) {
      // x * (a * x^2 + c) = 0.
      roots = QuadraticRealPolynomial.computeRealRoots(a, 0, c);

      // Return the roots in ascending order.
      if (roots.Length === 0) {
        return [0.0];
      }
      return [roots[0], 0.0, roots[1]];
    }

    // Deflated cubic polynomial: a * x^3 + c * x + d= 0.
    return computeRealRoots(a, 0, c, d);
  } else if (c === 0.0) {
    if (d === 0.0) {
      // x^2 * (a * x + b) = 0.
      ratio = -b / a;
      if (ratio < 0.0) {
        return [ratio, 0.0, 0.0];
      }
      return [0.0, 0.0, ratio];
    }
    // a * x^3 + b * x^2 + d = 0.
    return computeRealRoots(a, b, 0, d);
  } else if (d === 0.0) {
    // x * (a * x^2 + b * x + c) = 0
    roots = QuadraticRealPolynomial.computeRealRoots(a, b, c);

    // Return the roots in ascending order.
    if (roots.length === 0) {
      return [0.0];
    } else if (roots[1] <= 0.0) {
      return [roots[0], roots[1], 0.0];
    } else if (roots[0] >= 0.0) {
      return [0.0, roots[0], roots[1]];
    }
    return [roots[0], 0.0, roots[1]];
  }

  return computeRealRoots(a, b, c, d);
};
export default CubicRealPolynomial;
