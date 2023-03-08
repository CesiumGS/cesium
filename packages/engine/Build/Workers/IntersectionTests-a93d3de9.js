define(['exports', './Matrix3-315394f6', './defaultValue-0a909f67', './Check-666ab1a0', './Transforms-26539bce', './Math-2dbd6b93'], (function (exports, Matrix3, defaultValue, Check, Transforms, Math$1) { 'use strict';

  /**
   * Defines functions for 2nd order polynomial functions of one variable with only real coefficients.
   *
   * @namespace QuadraticRealPolynomial
   */
  const QuadraticRealPolynomial = {};

  /**
   * Provides the discriminant of the quadratic equation from the supplied coefficients.
   *
   * @param {Number} a The coefficient of the 2nd order monomial.
   * @param {Number} b The coefficient of the 1st order monomial.
   * @param {Number} c The coefficient of the 0th order monomial.
   * @returns {Number} The value of the discriminant.
   */
  QuadraticRealPolynomial.computeDiscriminant = function (a, b, c) {
    //>>includeStart('debug', pragmas.debug);
    if (typeof a !== "number") {
      throw new Check.DeveloperError("a is a required number.");
    }
    if (typeof b !== "number") {
      throw new Check.DeveloperError("b is a required number.");
    }
    if (typeof c !== "number") {
      throw new Check.DeveloperError("c is a required number.");
    }
    //>>includeEnd('debug');

    const discriminant = b * b - 4.0 * a * c;
    return discriminant;
  };

  function addWithCancellationCheck$1(left, right, tolerance) {
    const difference = left + right;
    if (
      Math$1.CesiumMath.sign(left) !== Math$1.CesiumMath.sign(right) &&
      Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance
    ) {
      return 0.0;
    }

    return difference;
  }

  /**
   * Provides the real valued roots of the quadratic polynomial with the provided coefficients.
   *
   * @param {Number} a The coefficient of the 2nd order monomial.
   * @param {Number} b The coefficient of the 1st order monomial.
   * @param {Number} c The coefficient of the 0th order monomial.
   * @returns {Number[]} The real valued roots.
   */
  QuadraticRealPolynomial.computeRealRoots = function (a, b, c) {
    //>>includeStart('debug', pragmas.debug);
    if (typeof a !== "number") {
      throw new Check.DeveloperError("a is a required number.");
    }
    if (typeof b !== "number") {
      throw new Check.DeveloperError("b is a required number.");
    }
    if (typeof c !== "number") {
      throw new Check.DeveloperError("c is a required number.");
    }
    //>>includeEnd('debug');

    let ratio;
    if (a === 0.0) {
      if (b === 0.0) {
        // Constant function: c = 0.
        return [];
      }

      // Linear function: b * x + c = 0.
      return [-c / b];
    } else if (b === 0.0) {
      if (c === 0.0) {
        // 2nd order monomial: a * x^2 = 0.
        return [0.0, 0.0];
      }

      const cMagnitude = Math.abs(c);
      const aMagnitude = Math.abs(a);

      if (
        cMagnitude < aMagnitude &&
        cMagnitude / aMagnitude < Math$1.CesiumMath.EPSILON14
      ) {
        // c ~= 0.0.
        // 2nd order monomial: a * x^2 = 0.
        return [0.0, 0.0];
      } else if (
        cMagnitude > aMagnitude &&
        aMagnitude / cMagnitude < Math$1.CesiumMath.EPSILON14
      ) {
        // a ~= 0.0.
        // Constant function: c = 0.
        return [];
      }

      // a * x^2 + c = 0
      ratio = -c / a;

      if (ratio < 0.0) {
        // Both roots are complex.
        return [];
      }

      // Both roots are real.
      const root = Math.sqrt(ratio);
      return [-root, root];
    } else if (c === 0.0) {
      // a * x^2 + b * x = 0
      ratio = -b / a;
      if (ratio < 0.0) {
        return [ratio, 0.0];
      }

      return [0.0, ratio];
    }

    // a * x^2 + b * x + c = 0
    const b2 = b * b;
    const four_ac = 4.0 * a * c;
    const radicand = addWithCancellationCheck$1(b2, -four_ac, Math$1.CesiumMath.EPSILON14);

    if (radicand < 0.0) {
      // Both roots are complex.
      return [];
    }

    const q =
      -0.5 *
      addWithCancellationCheck$1(
        b,
        Math$1.CesiumMath.sign(b) * Math.sqrt(radicand),
        Math$1.CesiumMath.EPSILON14
      );
    if (b > 0.0) {
      return [q / a, c / q];
    }

    return [c / q, q / a];
  };
  var QuadraticRealPolynomial$1 = QuadraticRealPolynomial;

  /**
   * Defines functions for 3rd order polynomial functions of one variable with only real coefficients.
   *
   * @namespace CubicRealPolynomial
   */
  const CubicRealPolynomial = {};

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
      throw new Check.DeveloperError("a is a required number.");
    }
    if (typeof b !== "number") {
      throw new Check.DeveloperError("b is a required number.");
    }
    if (typeof c !== "number") {
      throw new Check.DeveloperError("c is a required number.");
    }
    if (typeof d !== "number") {
      throw new Check.DeveloperError("d is a required number.");
    }
    //>>includeEnd('debug');

    const a2 = a * a;
    const b2 = b * b;
    const c2 = c * c;
    const d2 = d * d;

    const discriminant =
      18.0 * a * b * c * d +
      b2 * c2 -
      27.0 * a2 * d2 -
      4.0 * (a * c2 * c + b2 * b * d);
    return discriminant;
  };

  function computeRealRoots(a, b, c, d) {
    const A = a;
    const B = b / 3.0;
    const C = c / 3.0;
    const D = d;

    const AC = A * C;
    const BD = B * D;
    const B2 = B * B;
    const C2 = C * C;
    const delta1 = A * C - B2;
    const delta2 = A * D - B * C;
    const delta3 = B * D - C2;

    const discriminant = 4.0 * delta1 * delta3 - delta2 * delta2;
    let temp;
    let temp1;

    if (discriminant < 0.0) {
      let ABar;
      let CBar;
      let DBar;

      if (B2 * BD >= AC * C2) {
        ABar = A;
        CBar = delta1;
        DBar = -2.0 * B * delta1 + A * delta2;
      } else {
        ABar = D;
        CBar = delta3;
        DBar = -D * delta2 + 2.0 * C * delta3;
      }

      const s = DBar < 0.0 ? -1.0 : 1.0; // This is not Math.Sign()!
      const temp0 = -s * Math.abs(ABar) * Math.sqrt(-discriminant);
      temp1 = -DBar + temp0;

      const x = temp1 / 2.0;
      const p = x < 0.0 ? -Math.pow(-x, 1.0 / 3.0) : Math.pow(x, 1.0 / 3.0);
      const q = temp1 === temp0 ? -p : -CBar / p;

      temp = CBar <= 0.0 ? p + q : -DBar / (p * p + q * q + CBar);

      if (B2 * BD >= AC * C2) {
        return [(temp - B) / A];
      }

      return [-D / (temp + C)];
    }

    const CBarA = delta1;
    const DBarA = -2.0 * B * delta1 + A * delta2;

    const CBarD = delta3;
    const DBarD = -D * delta2 + 2.0 * C * delta3;

    const squareRootOfDiscriminant = Math.sqrt(discriminant);
    const halfSquareRootOf3 = Math.sqrt(3.0) / 2.0;

    let theta = Math.abs(Math.atan2(A * squareRootOfDiscriminant, -DBarA) / 3.0);
    temp = 2.0 * Math.sqrt(-CBarA);
    let cosine = Math.cos(theta);
    temp1 = temp * cosine;
    let temp3 = temp * (-cosine / 2.0 - halfSquareRootOf3 * Math.sin(theta));

    const numeratorLarge = temp1 + temp3 > 2.0 * B ? temp1 - B : temp3 - B;
    const denominatorLarge = A;

    const root1 = numeratorLarge / denominatorLarge;

    theta = Math.abs(Math.atan2(D * squareRootOfDiscriminant, -DBarD) / 3.0);
    temp = 2.0 * Math.sqrt(-CBarD);
    cosine = Math.cos(theta);
    temp1 = temp * cosine;
    temp3 = temp * (-cosine / 2.0 - halfSquareRootOf3 * Math.sin(theta));

    const numeratorSmall = -D;
    const denominatorSmall = temp1 + temp3 < 2.0 * C ? temp1 + C : temp3 + C;

    const root3 = numeratorSmall / denominatorSmall;

    const E = denominatorLarge * denominatorSmall;
    const F =
      -numeratorLarge * denominatorSmall - denominatorLarge * numeratorSmall;
    const G = numeratorLarge * numeratorSmall;

    const root2 = (C * F - B * G) / (-B * F + C * E);

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
      throw new Check.DeveloperError("a is a required number.");
    }
    if (typeof b !== "number") {
      throw new Check.DeveloperError("b is a required number.");
    }
    if (typeof c !== "number") {
      throw new Check.DeveloperError("c is a required number.");
    }
    if (typeof d !== "number") {
      throw new Check.DeveloperError("d is a required number.");
    }
    //>>includeEnd('debug');

    let roots;
    let ratio;
    if (a === 0.0) {
      // Quadratic function: b * x^2 + c * x + d = 0.
      return QuadraticRealPolynomial$1.computeRealRoots(b, c, d);
    } else if (b === 0.0) {
      if (c === 0.0) {
        if (d === 0.0) {
          // 3rd order monomial: a * x^3 = 0.
          return [0.0, 0.0, 0.0];
        }

        // a * x^3 + d = 0
        ratio = -d / a;
        const root =
          ratio < 0.0 ? -Math.pow(-ratio, 1.0 / 3.0) : Math.pow(ratio, 1.0 / 3.0);
        return [root, root, root];
      } else if (d === 0.0) {
        // x * (a * x^2 + c) = 0.
        roots = QuadraticRealPolynomial$1.computeRealRoots(a, 0, c);

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
      roots = QuadraticRealPolynomial$1.computeRealRoots(a, b, c);

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
  var CubicRealPolynomial$1 = CubicRealPolynomial;

  /**
   * Defines functions for 4th order polynomial functions of one variable with only real coefficients.
   *
   * @namespace QuarticRealPolynomial
   */
  const QuarticRealPolynomial = {};

  /**
   * Provides the discriminant of the quartic equation from the supplied coefficients.
   *
   * @param {Number} a The coefficient of the 4th order monomial.
   * @param {Number} b The coefficient of the 3rd order monomial.
   * @param {Number} c The coefficient of the 2nd order monomial.
   * @param {Number} d The coefficient of the 1st order monomial.
   * @param {Number} e The coefficient of the 0th order monomial.
   * @returns {Number} The value of the discriminant.
   */
  QuarticRealPolynomial.computeDiscriminant = function (a, b, c, d, e) {
    //>>includeStart('debug', pragmas.debug);
    if (typeof a !== "number") {
      throw new Check.DeveloperError("a is a required number.");
    }
    if (typeof b !== "number") {
      throw new Check.DeveloperError("b is a required number.");
    }
    if (typeof c !== "number") {
      throw new Check.DeveloperError("c is a required number.");
    }
    if (typeof d !== "number") {
      throw new Check.DeveloperError("d is a required number.");
    }
    if (typeof e !== "number") {
      throw new Check.DeveloperError("e is a required number.");
    }
    //>>includeEnd('debug');

    const a2 = a * a;
    const a3 = a2 * a;
    const b2 = b * b;
    const b3 = b2 * b;
    const c2 = c * c;
    const c3 = c2 * c;
    const d2 = d * d;
    const d3 = d2 * d;
    const e2 = e * e;
    const e3 = e2 * e;

    const discriminant =
      b2 * c2 * d2 -
      4.0 * b3 * d3 -
      4.0 * a * c3 * d2 +
      18 * a * b * c * d3 -
      27.0 * a2 * d2 * d2 +
      256.0 * a3 * e3 +
      e *
        (18.0 * b3 * c * d -
          4.0 * b2 * c3 +
          16.0 * a * c2 * c2 -
          80.0 * a * b * c2 * d -
          6.0 * a * b2 * d2 +
          144.0 * a2 * c * d2) +
      e2 *
        (144.0 * a * b2 * c -
          27.0 * b2 * b2 -
          128.0 * a2 * c2 -
          192.0 * a2 * b * d);
    return discriminant;
  };

  function original(a3, a2, a1, a0) {
    const a3Squared = a3 * a3;

    const p = a2 - (3.0 * a3Squared) / 8.0;
    const q = a1 - (a2 * a3) / 2.0 + (a3Squared * a3) / 8.0;
    const r =
      a0 -
      (a1 * a3) / 4.0 +
      (a2 * a3Squared) / 16.0 -
      (3.0 * a3Squared * a3Squared) / 256.0;

    // Find the roots of the cubic equations:  h^6 + 2 p h^4 + (p^2 - 4 r) h^2 - q^2 = 0.
    const cubicRoots = CubicRealPolynomial$1.computeRealRoots(
      1.0,
      2.0 * p,
      p * p - 4.0 * r,
      -q * q
    );

    if (cubicRoots.length > 0) {
      const temp = -a3 / 4.0;

      // Use the largest positive root.
      const hSquared = cubicRoots[cubicRoots.length - 1];

      if (Math.abs(hSquared) < Math$1.CesiumMath.EPSILON14) {
        // y^4 + p y^2 + r = 0.
        const roots = QuadraticRealPolynomial$1.computeRealRoots(1.0, p, r);

        if (roots.length === 2) {
          const root0 = roots[0];
          const root1 = roots[1];

          let y;
          if (root0 >= 0.0 && root1 >= 0.0) {
            const y0 = Math.sqrt(root0);
            const y1 = Math.sqrt(root1);

            return [temp - y1, temp - y0, temp + y0, temp + y1];
          } else if (root0 >= 0.0 && root1 < 0.0) {
            y = Math.sqrt(root0);
            return [temp - y, temp + y];
          } else if (root0 < 0.0 && root1 >= 0.0) {
            y = Math.sqrt(root1);
            return [temp - y, temp + y];
          }
        }
        return [];
      } else if (hSquared > 0.0) {
        const h = Math.sqrt(hSquared);

        const m = (p + hSquared - q / h) / 2.0;
        const n = (p + hSquared + q / h) / 2.0;

        // Now solve the two quadratic factors:  (y^2 + h y + m)(y^2 - h y + n);
        const roots1 = QuadraticRealPolynomial$1.computeRealRoots(1.0, h, m);
        const roots2 = QuadraticRealPolynomial$1.computeRealRoots(1.0, -h, n);

        if (roots1.length !== 0) {
          roots1[0] += temp;
          roots1[1] += temp;

          if (roots2.length !== 0) {
            roots2[0] += temp;
            roots2[1] += temp;

            if (roots1[1] <= roots2[0]) {
              return [roots1[0], roots1[1], roots2[0], roots2[1]];
            } else if (roots2[1] <= roots1[0]) {
              return [roots2[0], roots2[1], roots1[0], roots1[1]];
            } else if (roots1[0] >= roots2[0] && roots1[1] <= roots2[1]) {
              return [roots2[0], roots1[0], roots1[1], roots2[1]];
            } else if (roots2[0] >= roots1[0] && roots2[1] <= roots1[1]) {
              return [roots1[0], roots2[0], roots2[1], roots1[1]];
            } else if (roots1[0] > roots2[0] && roots1[0] < roots2[1]) {
              return [roots2[0], roots1[0], roots2[1], roots1[1]];
            }
            return [roots1[0], roots2[0], roots1[1], roots2[1]];
          }
          return roots1;
        }

        if (roots2.length !== 0) {
          roots2[0] += temp;
          roots2[1] += temp;

          return roots2;
        }
        return [];
      }
    }
    return [];
  }

  function neumark(a3, a2, a1, a0) {
    const a1Squared = a1 * a1;
    const a2Squared = a2 * a2;
    const a3Squared = a3 * a3;

    const p = -2.0 * a2;
    const q = a1 * a3 + a2Squared - 4.0 * a0;
    const r = a3Squared * a0 - a1 * a2 * a3 + a1Squared;

    const cubicRoots = CubicRealPolynomial$1.computeRealRoots(1.0, p, q, r);

    if (cubicRoots.length > 0) {
      // Use the most positive root
      const y = cubicRoots[0];

      const temp = a2 - y;
      const tempSquared = temp * temp;

      const g1 = a3 / 2.0;
      const h1 = temp / 2.0;

      const m = tempSquared - 4.0 * a0;
      const mError = tempSquared + 4.0 * Math.abs(a0);

      const n = a3Squared - 4.0 * y;
      const nError = a3Squared + 4.0 * Math.abs(y);

      let g2;
      let h2;

      if (y < 0.0 || m * nError < n * mError) {
        const squareRootOfN = Math.sqrt(n);
        g2 = squareRootOfN / 2.0;
        h2 = squareRootOfN === 0.0 ? 0.0 : (a3 * h1 - a1) / squareRootOfN;
      } else {
        const squareRootOfM = Math.sqrt(m);
        g2 = squareRootOfM === 0.0 ? 0.0 : (a3 * h1 - a1) / squareRootOfM;
        h2 = squareRootOfM / 2.0;
      }

      let G;
      let g;
      if (g1 === 0.0 && g2 === 0.0) {
        G = 0.0;
        g = 0.0;
      } else if (Math$1.CesiumMath.sign(g1) === Math$1.CesiumMath.sign(g2)) {
        G = g1 + g2;
        g = y / G;
      } else {
        g = g1 - g2;
        G = y / g;
      }

      let H;
      let h;
      if (h1 === 0.0 && h2 === 0.0) {
        H = 0.0;
        h = 0.0;
      } else if (Math$1.CesiumMath.sign(h1) === Math$1.CesiumMath.sign(h2)) {
        H = h1 + h2;
        h = a0 / H;
      } else {
        h = h1 - h2;
        H = a0 / h;
      }

      // Now solve the two quadratic factors:  (y^2 + G y + H)(y^2 + g y + h);
      const roots1 = QuadraticRealPolynomial$1.computeRealRoots(1.0, G, H);
      const roots2 = QuadraticRealPolynomial$1.computeRealRoots(1.0, g, h);

      if (roots1.length !== 0) {
        if (roots2.length !== 0) {
          if (roots1[1] <= roots2[0]) {
            return [roots1[0], roots1[1], roots2[0], roots2[1]];
          } else if (roots2[1] <= roots1[0]) {
            return [roots2[0], roots2[1], roots1[0], roots1[1]];
          } else if (roots1[0] >= roots2[0] && roots1[1] <= roots2[1]) {
            return [roots2[0], roots1[0], roots1[1], roots2[1]];
          } else if (roots2[0] >= roots1[0] && roots2[1] <= roots1[1]) {
            return [roots1[0], roots2[0], roots2[1], roots1[1]];
          } else if (roots1[0] > roots2[0] && roots1[0] < roots2[1]) {
            return [roots2[0], roots1[0], roots2[1], roots1[1]];
          }
          return [roots1[0], roots2[0], roots1[1], roots2[1]];
        }
        return roots1;
      }
      if (roots2.length !== 0) {
        return roots2;
      }
    }
    return [];
  }

  /**
   * Provides the real valued roots of the quartic polynomial with the provided coefficients.
   *
   * @param {Number} a The coefficient of the 4th order monomial.
   * @param {Number} b The coefficient of the 3rd order monomial.
   * @param {Number} c The coefficient of the 2nd order monomial.
   * @param {Number} d The coefficient of the 1st order monomial.
   * @param {Number} e The coefficient of the 0th order monomial.
   * @returns {Number[]} The real valued roots.
   */
  QuarticRealPolynomial.computeRealRoots = function (a, b, c, d, e) {
    //>>includeStart('debug', pragmas.debug);
    if (typeof a !== "number") {
      throw new Check.DeveloperError("a is a required number.");
    }
    if (typeof b !== "number") {
      throw new Check.DeveloperError("b is a required number.");
    }
    if (typeof c !== "number") {
      throw new Check.DeveloperError("c is a required number.");
    }
    if (typeof d !== "number") {
      throw new Check.DeveloperError("d is a required number.");
    }
    if (typeof e !== "number") {
      throw new Check.DeveloperError("e is a required number.");
    }
    //>>includeEnd('debug');

    if (Math.abs(a) < Math$1.CesiumMath.EPSILON15) {
      return CubicRealPolynomial$1.computeRealRoots(b, c, d, e);
    }
    const a3 = b / a;
    const a2 = c / a;
    const a1 = d / a;
    const a0 = e / a;

    let k = a3 < 0.0 ? 1 : 0;
    k += a2 < 0.0 ? k + 1 : k;
    k += a1 < 0.0 ? k + 1 : k;
    k += a0 < 0.0 ? k + 1 : k;

    switch (k) {
      case 0:
        return original(a3, a2, a1, a0);
      case 1:
        return neumark(a3, a2, a1, a0);
      case 2:
        return neumark(a3, a2, a1, a0);
      case 3:
        return original(a3, a2, a1, a0);
      case 4:
        return original(a3, a2, a1, a0);
      case 5:
        return neumark(a3, a2, a1, a0);
      case 6:
        return original(a3, a2, a1, a0);
      case 7:
        return original(a3, a2, a1, a0);
      case 8:
        return neumark(a3, a2, a1, a0);
      case 9:
        return original(a3, a2, a1, a0);
      case 10:
        return original(a3, a2, a1, a0);
      case 11:
        return neumark(a3, a2, a1, a0);
      case 12:
        return original(a3, a2, a1, a0);
      case 13:
        return original(a3, a2, a1, a0);
      case 14:
        return original(a3, a2, a1, a0);
      case 15:
        return original(a3, a2, a1, a0);
      default:
        return undefined;
    }
  };
  var QuarticRealPolynomial$1 = QuarticRealPolynomial;

  /**
   * Represents a ray that extends infinitely from the provided origin in the provided direction.
   * @alias Ray
   * @constructor
   *
   * @param {Cartesian3} [origin=Cartesian3.ZERO] The origin of the ray.
   * @param {Cartesian3} [direction=Cartesian3.ZERO] The direction of the ray.
   */
  function Ray(origin, direction) {
    direction = Matrix3.Cartesian3.clone(defaultValue.defaultValue(direction, Matrix3.Cartesian3.ZERO));
    if (!Matrix3.Cartesian3.equals(direction, Matrix3.Cartesian3.ZERO)) {
      Matrix3.Cartesian3.normalize(direction, direction);
    }

    /**
     * The origin of the ray.
     * @type {Cartesian3}
     * @default {@link Cartesian3.ZERO}
     */
    this.origin = Matrix3.Cartesian3.clone(defaultValue.defaultValue(origin, Matrix3.Cartesian3.ZERO));

    /**
     * The direction of the ray.
     * @type {Cartesian3}
     */
    this.direction = direction;
  }

  /**
   * Duplicates a Ray instance.
   *
   * @param {Ray} ray The ray to duplicate.
   * @param {Ray} [result] The object onto which to store the result.
   * @returns {Ray} The modified result parameter or a new Ray instance if one was not provided. (Returns undefined if ray is undefined)
   */
  Ray.clone = function (ray, result) {
    if (!defaultValue.defined(ray)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Ray(ray.origin, ray.direction);
    }
    result.origin = Matrix3.Cartesian3.clone(ray.origin);
    result.direction = Matrix3.Cartesian3.clone(ray.direction);
    return result;
  };

  /**
   * Computes the point along the ray given by r(t) = o + t*d,
   * where o is the origin of the ray and d is the direction.
   *
   * @param {Ray} ray The ray.
   * @param {Number} t A scalar value.
   * @param {Cartesian3} [result] The object in which the result will be stored.
   * @returns {Cartesian3} The modified result parameter, or a new instance if none was provided.
   *
   * @example
   * //Get the first intersection point of a ray and an ellipsoid.
   * const intersection = Cesium.IntersectionTests.rayEllipsoid(ray, ellipsoid);
   * const point = Cesium.Ray.getPoint(ray, intersection.start);
   */
  Ray.getPoint = function (ray, t, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("ray", ray);
    Check.Check.typeOf.number("t", t);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    result = Matrix3.Cartesian3.multiplyByScalar(ray.direction, t, result);
    return Matrix3.Cartesian3.add(ray.origin, result, result);
  };

  /**
   * Functions for computing the intersection between geometries such as rays, planes, triangles, and ellipsoids.
   *
   * @namespace IntersectionTests
   */
  const IntersectionTests = {};

  /**
   * Computes the intersection of a ray and a plane.
   *
   * @param {Ray} ray The ray.
   * @param {Plane} plane The plane.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
   */
  IntersectionTests.rayPlane = function (ray, plane, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(ray)) {
      throw new Check.DeveloperError("ray is required.");
    }
    if (!defaultValue.defined(plane)) {
      throw new Check.DeveloperError("plane is required.");
    }
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    const origin = ray.origin;
    const direction = ray.direction;
    const normal = plane.normal;
    const denominator = Matrix3.Cartesian3.dot(normal, direction);

    if (Math.abs(denominator) < Math$1.CesiumMath.EPSILON15) {
      // Ray is parallel to plane.  The ray may be in the polygon's plane.
      return undefined;
    }

    const t = (-plane.distance - Matrix3.Cartesian3.dot(normal, origin)) / denominator;

    if (t < 0) {
      return undefined;
    }

    result = Matrix3.Cartesian3.multiplyByScalar(direction, t, result);
    return Matrix3.Cartesian3.add(origin, result, result);
  };

  const scratchEdge0 = new Matrix3.Cartesian3();
  const scratchEdge1 = new Matrix3.Cartesian3();
  const scratchPVec = new Matrix3.Cartesian3();
  const scratchTVec = new Matrix3.Cartesian3();
  const scratchQVec = new Matrix3.Cartesian3();

  /**
   * Computes the intersection of a ray and a triangle as a parametric distance along the input ray. The result is negative when the triangle is behind the ray.
   *
   * Implements {@link https://cadxfem.org/inf/Fast%20MinimumStorage%20RayTriangle%20Intersection.pdf|
   * Fast Minimum Storage Ray/Triangle Intersection} by Tomas Moller and Ben Trumbore.
   *
   * @memberof IntersectionTests
   *
   * @param {Ray} ray The ray.
   * @param {Cartesian3} p0 The first vertex of the triangle.
   * @param {Cartesian3} p1 The second vertex of the triangle.
   * @param {Cartesian3} p2 The third vertex of the triangle.
   * @param {Boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
   *                  and return undefined for intersections with the back face.
   * @returns {Number} The intersection as a parametric distance along the ray, or undefined if there is no intersection.
   */
  IntersectionTests.rayTriangleParametric = function (
    ray,
    p0,
    p1,
    p2,
    cullBackFaces
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(ray)) {
      throw new Check.DeveloperError("ray is required.");
    }
    if (!defaultValue.defined(p0)) {
      throw new Check.DeveloperError("p0 is required.");
    }
    if (!defaultValue.defined(p1)) {
      throw new Check.DeveloperError("p1 is required.");
    }
    if (!defaultValue.defined(p2)) {
      throw new Check.DeveloperError("p2 is required.");
    }
    //>>includeEnd('debug');

    cullBackFaces = defaultValue.defaultValue(cullBackFaces, false);

    const origin = ray.origin;
    const direction = ray.direction;

    const edge0 = Matrix3.Cartesian3.subtract(p1, p0, scratchEdge0);
    const edge1 = Matrix3.Cartesian3.subtract(p2, p0, scratchEdge1);

    const p = Matrix3.Cartesian3.cross(direction, edge1, scratchPVec);
    const det = Matrix3.Cartesian3.dot(edge0, p);

    let tvec;
    let q;

    let u;
    let v;
    let t;

    if (cullBackFaces) {
      if (det < Math$1.CesiumMath.EPSILON6) {
        return undefined;
      }

      tvec = Matrix3.Cartesian3.subtract(origin, p0, scratchTVec);
      u = Matrix3.Cartesian3.dot(tvec, p);
      if (u < 0.0 || u > det) {
        return undefined;
      }

      q = Matrix3.Cartesian3.cross(tvec, edge0, scratchQVec);

      v = Matrix3.Cartesian3.dot(direction, q);
      if (v < 0.0 || u + v > det) {
        return undefined;
      }

      t = Matrix3.Cartesian3.dot(edge1, q) / det;
    } else {
      if (Math.abs(det) < Math$1.CesiumMath.EPSILON6) {
        return undefined;
      }
      const invDet = 1.0 / det;

      tvec = Matrix3.Cartesian3.subtract(origin, p0, scratchTVec);
      u = Matrix3.Cartesian3.dot(tvec, p) * invDet;
      if (u < 0.0 || u > 1.0) {
        return undefined;
      }

      q = Matrix3.Cartesian3.cross(tvec, edge0, scratchQVec);

      v = Matrix3.Cartesian3.dot(direction, q) * invDet;
      if (v < 0.0 || u + v > 1.0) {
        return undefined;
      }

      t = Matrix3.Cartesian3.dot(edge1, q) * invDet;
    }

    return t;
  };

  /**
   * Computes the intersection of a ray and a triangle as a Cartesian3 coordinate.
   *
   * Implements {@link https://cadxfem.org/inf/Fast%20MinimumStorage%20RayTriangle%20Intersection.pdf|
   * Fast Minimum Storage Ray/Triangle Intersection} by Tomas Moller and Ben Trumbore.
   *
   * @memberof IntersectionTests
   *
   * @param {Ray} ray The ray.
   * @param {Cartesian3} p0 The first vertex of the triangle.
   * @param {Cartesian3} p1 The second vertex of the triangle.
   * @param {Cartesian3} p2 The third vertex of the triangle.
   * @param {Boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
   *                  and return undefined for intersections with the back face.
   * @param {Cartesian3} [result] The <code>Cartesian3</code> onto which to store the result.
   * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
   */
  IntersectionTests.rayTriangle = function (
    ray,
    p0,
    p1,
    p2,
    cullBackFaces,
    result
  ) {
    const t = IntersectionTests.rayTriangleParametric(
      ray,
      p0,
      p1,
      p2,
      cullBackFaces
    );
    if (!defaultValue.defined(t) || t < 0.0) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    Matrix3.Cartesian3.multiplyByScalar(ray.direction, t, result);
    return Matrix3.Cartesian3.add(ray.origin, result, result);
  };

  const scratchLineSegmentTriangleRay = new Ray();

  /**
   * Computes the intersection of a line segment and a triangle.
   * @memberof IntersectionTests
   *
   * @param {Cartesian3} v0 The an end point of the line segment.
   * @param {Cartesian3} v1 The other end point of the line segment.
   * @param {Cartesian3} p0 The first vertex of the triangle.
   * @param {Cartesian3} p1 The second vertex of the triangle.
   * @param {Cartesian3} p2 The third vertex of the triangle.
   * @param {Boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
   *                  and return undefined for intersections with the back face.
   * @param {Cartesian3} [result] The <code>Cartesian3</code> onto which to store the result.
   * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
   */
  IntersectionTests.lineSegmentTriangle = function (
    v0,
    v1,
    p0,
    p1,
    p2,
    cullBackFaces,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(v0)) {
      throw new Check.DeveloperError("v0 is required.");
    }
    if (!defaultValue.defined(v1)) {
      throw new Check.DeveloperError("v1 is required.");
    }
    if (!defaultValue.defined(p0)) {
      throw new Check.DeveloperError("p0 is required.");
    }
    if (!defaultValue.defined(p1)) {
      throw new Check.DeveloperError("p1 is required.");
    }
    if (!defaultValue.defined(p2)) {
      throw new Check.DeveloperError("p2 is required.");
    }
    //>>includeEnd('debug');

    const ray = scratchLineSegmentTriangleRay;
    Matrix3.Cartesian3.clone(v0, ray.origin);
    Matrix3.Cartesian3.subtract(v1, v0, ray.direction);
    Matrix3.Cartesian3.normalize(ray.direction, ray.direction);

    const t = IntersectionTests.rayTriangleParametric(
      ray,
      p0,
      p1,
      p2,
      cullBackFaces
    );
    if (!defaultValue.defined(t) || t < 0.0 || t > Matrix3.Cartesian3.distance(v0, v1)) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    Matrix3.Cartesian3.multiplyByScalar(ray.direction, t, result);
    return Matrix3.Cartesian3.add(ray.origin, result, result);
  };

  function solveQuadratic(a, b, c, result) {
    const det = b * b - 4.0 * a * c;
    if (det < 0.0) {
      return undefined;
    } else if (det > 0.0) {
      const denom = 1.0 / (2.0 * a);
      const disc = Math.sqrt(det);
      const root0 = (-b + disc) * denom;
      const root1 = (-b - disc) * denom;

      if (root0 < root1) {
        result.root0 = root0;
        result.root1 = root1;
      } else {
        result.root0 = root1;
        result.root1 = root0;
      }

      return result;
    }

    const root = -b / (2.0 * a);
    if (root === 0.0) {
      return undefined;
    }

    result.root0 = result.root1 = root;
    return result;
  }

  const raySphereRoots = {
    root0: 0.0,
    root1: 0.0,
  };

  function raySphere(ray, sphere, result) {
    if (!defaultValue.defined(result)) {
      result = new Transforms.Interval();
    }

    const origin = ray.origin;
    const direction = ray.direction;

    const center = sphere.center;
    const radiusSquared = sphere.radius * sphere.radius;

    const diff = Matrix3.Cartesian3.subtract(origin, center, scratchPVec);

    const a = Matrix3.Cartesian3.dot(direction, direction);
    const b = 2.0 * Matrix3.Cartesian3.dot(direction, diff);
    const c = Matrix3.Cartesian3.magnitudeSquared(diff) - radiusSquared;

    const roots = solveQuadratic(a, b, c, raySphereRoots);
    if (!defaultValue.defined(roots)) {
      return undefined;
    }

    result.start = roots.root0;
    result.stop = roots.root1;
    return result;
  }

  /**
   * Computes the intersection points of a ray with a sphere.
   * @memberof IntersectionTests
   *
   * @param {Ray} ray The ray.
   * @param {BoundingSphere} sphere The sphere.
   * @param {Interval} [result] The result onto which to store the result.
   * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
   */
  IntersectionTests.raySphere = function (ray, sphere, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(ray)) {
      throw new Check.DeveloperError("ray is required.");
    }
    if (!defaultValue.defined(sphere)) {
      throw new Check.DeveloperError("sphere is required.");
    }
    //>>includeEnd('debug');

    result = raySphere(ray, sphere, result);
    if (!defaultValue.defined(result) || result.stop < 0.0) {
      return undefined;
    }

    result.start = Math.max(result.start, 0.0);
    return result;
  };

  const scratchLineSegmentRay = new Ray();

  /**
   * Computes the intersection points of a line segment with a sphere.
   * @memberof IntersectionTests
   *
   * @param {Cartesian3} p0 An end point of the line segment.
   * @param {Cartesian3} p1 The other end point of the line segment.
   * @param {BoundingSphere} sphere The sphere.
   * @param {Interval} [result] The result onto which to store the result.
   * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
   */
  IntersectionTests.lineSegmentSphere = function (p0, p1, sphere, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(p0)) {
      throw new Check.DeveloperError("p0 is required.");
    }
    if (!defaultValue.defined(p1)) {
      throw new Check.DeveloperError("p1 is required.");
    }
    if (!defaultValue.defined(sphere)) {
      throw new Check.DeveloperError("sphere is required.");
    }
    //>>includeEnd('debug');

    const ray = scratchLineSegmentRay;
    Matrix3.Cartesian3.clone(p0, ray.origin);
    const direction = Matrix3.Cartesian3.subtract(p1, p0, ray.direction);

    const maxT = Matrix3.Cartesian3.magnitude(direction);
    Matrix3.Cartesian3.normalize(direction, direction);

    result = raySphere(ray, sphere, result);
    if (!defaultValue.defined(result) || result.stop < 0.0 || result.start > maxT) {
      return undefined;
    }

    result.start = Math.max(result.start, 0.0);
    result.stop = Math.min(result.stop, maxT);
    return result;
  };

  const scratchQ = new Matrix3.Cartesian3();
  const scratchW = new Matrix3.Cartesian3();

  /**
   * Computes the intersection points of a ray with an ellipsoid.
   *
   * @param {Ray} ray The ray.
   * @param {Ellipsoid} ellipsoid The ellipsoid.
   * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
   */
  IntersectionTests.rayEllipsoid = function (ray, ellipsoid) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(ray)) {
      throw new Check.DeveloperError("ray is required.");
    }
    if (!defaultValue.defined(ellipsoid)) {
      throw new Check.DeveloperError("ellipsoid is required.");
    }
    //>>includeEnd('debug');

    const inverseRadii = ellipsoid.oneOverRadii;
    const q = Matrix3.Cartesian3.multiplyComponents(inverseRadii, ray.origin, scratchQ);
    const w = Matrix3.Cartesian3.multiplyComponents(
      inverseRadii,
      ray.direction,
      scratchW
    );

    const q2 = Matrix3.Cartesian3.magnitudeSquared(q);
    const qw = Matrix3.Cartesian3.dot(q, w);

    let difference, w2, product, discriminant, temp;

    if (q2 > 1.0) {
      // Outside ellipsoid.
      if (qw >= 0.0) {
        // Looking outward or tangent (0 intersections).
        return undefined;
      }

      // qw < 0.0.
      const qw2 = qw * qw;
      difference = q2 - 1.0; // Positively valued.
      w2 = Matrix3.Cartesian3.magnitudeSquared(w);
      product = w2 * difference;

      if (qw2 < product) {
        // Imaginary roots (0 intersections).
        return undefined;
      } else if (qw2 > product) {
        // Distinct roots (2 intersections).
        discriminant = qw * qw - product;
        temp = -qw + Math.sqrt(discriminant); // Avoid cancellation.
        const root0 = temp / w2;
        const root1 = difference / temp;
        if (root0 < root1) {
          return new Transforms.Interval(root0, root1);
        }

        return {
          start: root1,
          stop: root0,
        };
      }
      // qw2 == product.  Repeated roots (2 intersections).
      const root = Math.sqrt(difference / w2);
      return new Transforms.Interval(root, root);
    } else if (q2 < 1.0) {
      // Inside ellipsoid (2 intersections).
      difference = q2 - 1.0; // Negatively valued.
      w2 = Matrix3.Cartesian3.magnitudeSquared(w);
      product = w2 * difference; // Negatively valued.

      discriminant = qw * qw - product;
      temp = -qw + Math.sqrt(discriminant); // Positively valued.
      return new Transforms.Interval(0.0, temp / w2);
    }
    // q2 == 1.0. On ellipsoid.
    if (qw < 0.0) {
      // Looking inward.
      w2 = Matrix3.Cartesian3.magnitudeSquared(w);
      return new Transforms.Interval(0.0, -qw / w2);
    }

    // qw >= 0.0.  Looking outward or tangent.
    return undefined;
  };

  function addWithCancellationCheck(left, right, tolerance) {
    const difference = left + right;
    if (
      Math$1.CesiumMath.sign(left) !== Math$1.CesiumMath.sign(right) &&
      Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance
    ) {
      return 0.0;
    }

    return difference;
  }

  function quadraticVectorExpression(A, b, c, x, w) {
    const xSquared = x * x;
    const wSquared = w * w;

    const l2 = (A[Matrix3.Matrix3.COLUMN1ROW1] - A[Matrix3.Matrix3.COLUMN2ROW2]) * wSquared;
    const l1 =
      w *
      (x *
        addWithCancellationCheck(
          A[Matrix3.Matrix3.COLUMN1ROW0],
          A[Matrix3.Matrix3.COLUMN0ROW1],
          Math$1.CesiumMath.EPSILON15
        ) +
        b.y);
    const l0 =
      A[Matrix3.Matrix3.COLUMN0ROW0] * xSquared +
      A[Matrix3.Matrix3.COLUMN2ROW2] * wSquared +
      x * b.x +
      c;

    const r1 =
      wSquared *
      addWithCancellationCheck(
        A[Matrix3.Matrix3.COLUMN2ROW1],
        A[Matrix3.Matrix3.COLUMN1ROW2],
        Math$1.CesiumMath.EPSILON15
      );
    const r0 =
      w *
      (x *
        addWithCancellationCheck(A[Matrix3.Matrix3.COLUMN2ROW0], A[Matrix3.Matrix3.COLUMN0ROW2]) +
        b.z);

    let cosines;
    const solutions = [];
    if (r0 === 0.0 && r1 === 0.0) {
      cosines = QuadraticRealPolynomial$1.computeRealRoots(l2, l1, l0);
      if (cosines.length === 0) {
        return solutions;
      }

      const cosine0 = cosines[0];
      const sine0 = Math.sqrt(Math.max(1.0 - cosine0 * cosine0, 0.0));
      solutions.push(new Matrix3.Cartesian3(x, w * cosine0, w * -sine0));
      solutions.push(new Matrix3.Cartesian3(x, w * cosine0, w * sine0));

      if (cosines.length === 2) {
        const cosine1 = cosines[1];
        const sine1 = Math.sqrt(Math.max(1.0 - cosine1 * cosine1, 0.0));
        solutions.push(new Matrix3.Cartesian3(x, w * cosine1, w * -sine1));
        solutions.push(new Matrix3.Cartesian3(x, w * cosine1, w * sine1));
      }

      return solutions;
    }

    const r0Squared = r0 * r0;
    const r1Squared = r1 * r1;
    const l2Squared = l2 * l2;
    const r0r1 = r0 * r1;

    const c4 = l2Squared + r1Squared;
    const c3 = 2.0 * (l1 * l2 + r0r1);
    const c2 = 2.0 * l0 * l2 + l1 * l1 - r1Squared + r0Squared;
    const c1 = 2.0 * (l0 * l1 - r0r1);
    const c0 = l0 * l0 - r0Squared;

    if (c4 === 0.0 && c3 === 0.0 && c2 === 0.0 && c1 === 0.0) {
      return solutions;
    }

    cosines = QuarticRealPolynomial$1.computeRealRoots(c4, c3, c2, c1, c0);
    const length = cosines.length;
    if (length === 0) {
      return solutions;
    }

    for (let i = 0; i < length; ++i) {
      const cosine = cosines[i];
      const cosineSquared = cosine * cosine;
      const sineSquared = Math.max(1.0 - cosineSquared, 0.0);
      const sine = Math.sqrt(sineSquared);

      //const left = l2 * cosineSquared + l1 * cosine + l0;
      let left;
      if (Math$1.CesiumMath.sign(l2) === Math$1.CesiumMath.sign(l0)) {
        left = addWithCancellationCheck(
          l2 * cosineSquared + l0,
          l1 * cosine,
          Math$1.CesiumMath.EPSILON12
        );
      } else if (Math$1.CesiumMath.sign(l0) === Math$1.CesiumMath.sign(l1 * cosine)) {
        left = addWithCancellationCheck(
          l2 * cosineSquared,
          l1 * cosine + l0,
          Math$1.CesiumMath.EPSILON12
        );
      } else {
        left = addWithCancellationCheck(
          l2 * cosineSquared + l1 * cosine,
          l0,
          Math$1.CesiumMath.EPSILON12
        );
      }

      const right = addWithCancellationCheck(
        r1 * cosine,
        r0,
        Math$1.CesiumMath.EPSILON15
      );
      const product = left * right;

      if (product < 0.0) {
        solutions.push(new Matrix3.Cartesian3(x, w * cosine, w * sine));
      } else if (product > 0.0) {
        solutions.push(new Matrix3.Cartesian3(x, w * cosine, w * -sine));
      } else if (sine !== 0.0) {
        solutions.push(new Matrix3.Cartesian3(x, w * cosine, w * -sine));
        solutions.push(new Matrix3.Cartesian3(x, w * cosine, w * sine));
        ++i;
      } else {
        solutions.push(new Matrix3.Cartesian3(x, w * cosine, w * sine));
      }
    }

    return solutions;
  }

  const firstAxisScratch = new Matrix3.Cartesian3();
  const secondAxisScratch = new Matrix3.Cartesian3();
  const thirdAxisScratch = new Matrix3.Cartesian3();
  const referenceScratch = new Matrix3.Cartesian3();
  const bCart = new Matrix3.Cartesian3();
  const bScratch = new Matrix3.Matrix3();
  const btScratch = new Matrix3.Matrix3();
  const diScratch = new Matrix3.Matrix3();
  const dScratch = new Matrix3.Matrix3();
  const cScratch = new Matrix3.Matrix3();
  const tempMatrix = new Matrix3.Matrix3();
  const aScratch = new Matrix3.Matrix3();
  const sScratch = new Matrix3.Cartesian3();
  const closestScratch = new Matrix3.Cartesian3();
  const surfPointScratch = new Matrix3.Cartographic();

  /**
   * Provides the point along the ray which is nearest to the ellipsoid.
   *
   * @param {Ray} ray The ray.
   * @param {Ellipsoid} ellipsoid The ellipsoid.
   * @returns {Cartesian3} The nearest planetodetic point on the ray.
   */
  IntersectionTests.grazingAltitudeLocation = function (ray, ellipsoid) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(ray)) {
      throw new Check.DeveloperError("ray is required.");
    }
    if (!defaultValue.defined(ellipsoid)) {
      throw new Check.DeveloperError("ellipsoid is required.");
    }
    //>>includeEnd('debug');

    const position = ray.origin;
    const direction = ray.direction;

    if (!Matrix3.Cartesian3.equals(position, Matrix3.Cartesian3.ZERO)) {
      const normal = ellipsoid.geodeticSurfaceNormal(position, firstAxisScratch);
      if (Matrix3.Cartesian3.dot(direction, normal) >= 0.0) {
        // The location provided is the closest point in altitude
        return position;
      }
    }

    const intersects = defaultValue.defined(this.rayEllipsoid(ray, ellipsoid));

    // Compute the scaled direction vector.
    const f = ellipsoid.transformPositionToScaledSpace(
      direction,
      firstAxisScratch
    );

    // Constructs a basis from the unit scaled direction vector. Construct its rotation and transpose.
    const firstAxis = Matrix3.Cartesian3.normalize(f, f);
    const reference = Matrix3.Cartesian3.mostOrthogonalAxis(f, referenceScratch);
    const secondAxis = Matrix3.Cartesian3.normalize(
      Matrix3.Cartesian3.cross(reference, firstAxis, secondAxisScratch),
      secondAxisScratch
    );
    const thirdAxis = Matrix3.Cartesian3.normalize(
      Matrix3.Cartesian3.cross(firstAxis, secondAxis, thirdAxisScratch),
      thirdAxisScratch
    );
    const B = bScratch;
    B[0] = firstAxis.x;
    B[1] = firstAxis.y;
    B[2] = firstAxis.z;
    B[3] = secondAxis.x;
    B[4] = secondAxis.y;
    B[5] = secondAxis.z;
    B[6] = thirdAxis.x;
    B[7] = thirdAxis.y;
    B[8] = thirdAxis.z;

    const B_T = Matrix3.Matrix3.transpose(B, btScratch);

    // Get the scaling matrix and its inverse.
    const D_I = Matrix3.Matrix3.fromScale(ellipsoid.radii, diScratch);
    const D = Matrix3.Matrix3.fromScale(ellipsoid.oneOverRadii, dScratch);

    const C = cScratch;
    C[0] = 0.0;
    C[1] = -direction.z;
    C[2] = direction.y;
    C[3] = direction.z;
    C[4] = 0.0;
    C[5] = -direction.x;
    C[6] = -direction.y;
    C[7] = direction.x;
    C[8] = 0.0;

    const temp = Matrix3.Matrix3.multiply(
      Matrix3.Matrix3.multiply(B_T, D, tempMatrix),
      C,
      tempMatrix
    );
    const A = Matrix3.Matrix3.multiply(
      Matrix3.Matrix3.multiply(temp, D_I, aScratch),
      B,
      aScratch
    );
    const b = Matrix3.Matrix3.multiplyByVector(temp, position, bCart);

    // Solve for the solutions to the expression in standard form:
    const solutions = quadraticVectorExpression(
      A,
      Matrix3.Cartesian3.negate(b, firstAxisScratch),
      0.0,
      0.0,
      1.0
    );

    let s;
    let altitude;
    const length = solutions.length;
    if (length > 0) {
      let closest = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, closestScratch);
      let maximumValue = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < length; ++i) {
        s = Matrix3.Matrix3.multiplyByVector(
          D_I,
          Matrix3.Matrix3.multiplyByVector(B, solutions[i], sScratch),
          sScratch
        );
        const v = Matrix3.Cartesian3.normalize(
          Matrix3.Cartesian3.subtract(s, position, referenceScratch),
          referenceScratch
        );
        const dotProduct = Matrix3.Cartesian3.dot(v, direction);

        if (dotProduct > maximumValue) {
          maximumValue = dotProduct;
          closest = Matrix3.Cartesian3.clone(s, closest);
        }
      }

      const surfacePoint = ellipsoid.cartesianToCartographic(
        closest,
        surfPointScratch
      );
      maximumValue = Math$1.CesiumMath.clamp(maximumValue, 0.0, 1.0);
      altitude =
        Matrix3.Cartesian3.magnitude(
          Matrix3.Cartesian3.subtract(closest, position, referenceScratch)
        ) * Math.sqrt(1.0 - maximumValue * maximumValue);
      altitude = intersects ? -altitude : altitude;
      surfacePoint.height = altitude;
      return ellipsoid.cartographicToCartesian(surfacePoint, new Matrix3.Cartesian3());
    }

    return undefined;
  };

  const lineSegmentPlaneDifference = new Matrix3.Cartesian3();

  /**
   * Computes the intersection of a line segment and a plane.
   *
   * @param {Cartesian3} endPoint0 An end point of the line segment.
   * @param {Cartesian3} endPoint1 The other end point of the line segment.
   * @param {Plane} plane The plane.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The intersection point or undefined if there is no intersection.
   *
   * @example
   * const origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
   * const normal = ellipsoid.geodeticSurfaceNormal(origin);
   * const plane = Cesium.Plane.fromPointNormal(origin, normal);
   *
   * const p0 = new Cesium.Cartesian3(...);
   * const p1 = new Cesium.Cartesian3(...);
   *
   * // find the intersection of the line segment from p0 to p1 and the tangent plane at origin.
   * const intersection = Cesium.IntersectionTests.lineSegmentPlane(p0, p1, plane);
   */
  IntersectionTests.lineSegmentPlane = function (
    endPoint0,
    endPoint1,
    plane,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(endPoint0)) {
      throw new Check.DeveloperError("endPoint0 is required.");
    }
    if (!defaultValue.defined(endPoint1)) {
      throw new Check.DeveloperError("endPoint1 is required.");
    }
    if (!defaultValue.defined(plane)) {
      throw new Check.DeveloperError("plane is required.");
    }
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    const difference = Matrix3.Cartesian3.subtract(
      endPoint1,
      endPoint0,
      lineSegmentPlaneDifference
    );
    const normal = plane.normal;
    const nDotDiff = Matrix3.Cartesian3.dot(normal, difference);

    // check if the segment and plane are parallel
    if (Math.abs(nDotDiff) < Math$1.CesiumMath.EPSILON6) {
      return undefined;
    }

    const nDotP0 = Matrix3.Cartesian3.dot(normal, endPoint0);
    const t = -(plane.distance + nDotP0) / nDotDiff;

    // intersection only if t is in [0, 1]
    if (t < 0.0 || t > 1.0) {
      return undefined;
    }

    // intersection is endPoint0 + t * (endPoint1 - endPoint0)
    Matrix3.Cartesian3.multiplyByScalar(difference, t, result);
    Matrix3.Cartesian3.add(endPoint0, result, result);
    return result;
  };

  /**
   * Computes the intersection of a triangle and a plane
   *
   * @param {Cartesian3} p0 First point of the triangle
   * @param {Cartesian3} p1 Second point of the triangle
   * @param {Cartesian3} p2 Third point of the triangle
   * @param {Plane} plane Intersection plane
   * @returns {Object} An object with properties <code>positions</code> and <code>indices</code>, which are arrays that represent three triangles that do not cross the plane. (Undefined if no intersection exists)
   *
   * @example
   * const origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
   * const normal = ellipsoid.geodeticSurfaceNormal(origin);
   * const plane = Cesium.Plane.fromPointNormal(origin, normal);
   *
   * const p0 = new Cesium.Cartesian3(...);
   * const p1 = new Cesium.Cartesian3(...);
   * const p2 = new Cesium.Cartesian3(...);
   *
   * // convert the triangle composed of points (p0, p1, p2) to three triangles that don't cross the plane
   * const triangles = Cesium.IntersectionTests.trianglePlaneIntersection(p0, p1, p2, plane);
   */
  IntersectionTests.trianglePlaneIntersection = function (p0, p1, p2, plane) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(p0) || !defaultValue.defined(p1) || !defaultValue.defined(p2) || !defaultValue.defined(plane)) {
      throw new Check.DeveloperError("p0, p1, p2, and plane are required.");
    }
    //>>includeEnd('debug');

    const planeNormal = plane.normal;
    const planeD = plane.distance;
    const p0Behind = Matrix3.Cartesian3.dot(planeNormal, p0) + planeD < 0.0;
    const p1Behind = Matrix3.Cartesian3.dot(planeNormal, p1) + planeD < 0.0;
    const p2Behind = Matrix3.Cartesian3.dot(planeNormal, p2) + planeD < 0.0;
    // Given these dots products, the calls to lineSegmentPlaneIntersection
    // always have defined results.

    let numBehind = 0;
    numBehind += p0Behind ? 1 : 0;
    numBehind += p1Behind ? 1 : 0;
    numBehind += p2Behind ? 1 : 0;

    let u1, u2;
    if (numBehind === 1 || numBehind === 2) {
      u1 = new Matrix3.Cartesian3();
      u2 = new Matrix3.Cartesian3();
    }

    if (numBehind === 1) {
      if (p0Behind) {
        IntersectionTests.lineSegmentPlane(p0, p1, plane, u1);
        IntersectionTests.lineSegmentPlane(p0, p2, plane, u2);

        return {
          positions: [p0, p1, p2, u1, u2],
          indices: [
            // Behind
            0,
            3,
            4,

            // In front
            1,
            2,
            4,
            1,
            4,
            3,
          ],
        };
      } else if (p1Behind) {
        IntersectionTests.lineSegmentPlane(p1, p2, plane, u1);
        IntersectionTests.lineSegmentPlane(p1, p0, plane, u2);

        return {
          positions: [p0, p1, p2, u1, u2],
          indices: [
            // Behind
            1,
            3,
            4,

            // In front
            2,
            0,
            4,
            2,
            4,
            3,
          ],
        };
      } else if (p2Behind) {
        IntersectionTests.lineSegmentPlane(p2, p0, plane, u1);
        IntersectionTests.lineSegmentPlane(p2, p1, plane, u2);

        return {
          positions: [p0, p1, p2, u1, u2],
          indices: [
            // Behind
            2,
            3,
            4,

            // In front
            0,
            1,
            4,
            0,
            4,
            3,
          ],
        };
      }
    } else if (numBehind === 2) {
      if (!p0Behind) {
        IntersectionTests.lineSegmentPlane(p1, p0, plane, u1);
        IntersectionTests.lineSegmentPlane(p2, p0, plane, u2);

        return {
          positions: [p0, p1, p2, u1, u2],
          indices: [
            // Behind
            1,
            2,
            4,
            1,
            4,
            3,

            // In front
            0,
            3,
            4,
          ],
        };
      } else if (!p1Behind) {
        IntersectionTests.lineSegmentPlane(p2, p1, plane, u1);
        IntersectionTests.lineSegmentPlane(p0, p1, plane, u2);

        return {
          positions: [p0, p1, p2, u1, u2],
          indices: [
            // Behind
            2,
            0,
            4,
            2,
            4,
            3,

            // In front
            1,
            3,
            4,
          ],
        };
      } else if (!p2Behind) {
        IntersectionTests.lineSegmentPlane(p0, p2, plane, u1);
        IntersectionTests.lineSegmentPlane(p1, p2, plane, u2);

        return {
          positions: [p0, p1, p2, u1, u2],
          indices: [
            // Behind
            0,
            1,
            4,
            0,
            4,
            3,

            // In front
            2,
            3,
            4,
          ],
        };
      }
    }

    // if numBehind is 3, the triangle is completely behind the plane;
    // otherwise, it is completely in front (numBehind is 0).
    return undefined;
  };
  var IntersectionTests$1 = IntersectionTests;

  exports.IntersectionTests = IntersectionTests$1;
  exports.Ray = Ray;

}));
