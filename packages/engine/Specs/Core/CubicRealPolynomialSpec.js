import { CubicRealPolynomial } from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/CubicRealPolynomial", function () {
  it("discriminant throws without a", function () {
    expect(function () {
      CubicRealPolynomial.computeDiscriminant();
    }).toThrowDeveloperError();
  });

  it("discriminant throws without b", function () {
    expect(function () {
      CubicRealPolynomial.computeDiscriminant(1.0);
    }).toThrowDeveloperError();
  });

  it("discriminant throws without c", function () {
    expect(function () {
      CubicRealPolynomial.computeDiscriminant(1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("discriminant throws without d", function () {
    expect(function () {
      CubicRealPolynomial.computeDiscriminant(1.0, 1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("discriminant", function () {
    const a = 3.0;
    const b = 2.0;
    const c = 1.0;
    const d = 1.0;
    const expected =
      b * b * c * c -
      4 * a * c * c * c -
      4 * b * b * b * d -
      27 * a * a * d * d +
      18 * a * b * c * d;
    const actual = CubicRealPolynomial.computeDiscriminant(a, b, c, d);
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("real roots throws without a", function () {
    expect(function () {
      CubicRealPolynomial.computeRealRoots();
    }).toThrowDeveloperError();
  });

  it("real roots throws without b", function () {
    expect(function () {
      CubicRealPolynomial.computeRealRoots(1.0);
    }).toThrowDeveloperError();
  });

  it("real roots throws without c", function () {
    expect(function () {
      CubicRealPolynomial.computeRealRoots(1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("real roots throws without d", function () {
    expect(function () {
      CubicRealPolynomial.computeRealRoots(1.0, 1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("three repeated roots", function () {
    const roots = CubicRealPolynomial.computeRealRoots(2.0, -12.0, 24.0, -16.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
    expect(roots[1]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
    expect(roots[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
  });

  it("one unique and two repeated roots", function () {
    const roots = CubicRealPolynomial.computeRealRoots(2.0, 2.0, -2.0, -2.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqualEpsilon(-1.0, CesiumMath.EPSILON15);
    expect(roots[1]).toEqualEpsilon(-1.0, CesiumMath.EPSILON15);
    expect(roots[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
  });

  it("three unique roots", function () {
    const roots = CubicRealPolynomial.computeRealRoots(2.0, 6.0, -26.0, -30.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqualEpsilon(-5.0, CesiumMath.EPSILON15);
    expect(roots[1]).toEqualEpsilon(-1.0, CesiumMath.EPSILON15);
    expect(roots[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON15);
  });

  it("complex roots", function () {
    const roots = CubicRealPolynomial.computeRealRoots(2.0, -6.0, 10.0, -6.0);
    expect(roots.length).toEqual(1);
    expect(roots[0]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
  });

  it("quadratic case", function () {
    const roots = CubicRealPolynomial.computeRealRoots(0.0, 2.0, -4.0, -6.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(-1.0);
    expect(roots[1]).toEqual(3.0);
  });

  it("deflated case", function () {
    let roots = CubicRealPolynomial.computeRealRoots(1.0, 0.0, 1.0, 2.0);
    expect(roots.length).toEqual(1);
    expect(roots[0]).toEqualEpsilon(-1.0, CesiumMath.EPSILON14);

    roots = CubicRealPolynomial.computeRealRoots(1.0, 0.0, 0.0, -8.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqualEpsilon(2.0, CesiumMath.EPSILON14);

    roots = CubicRealPolynomial.computeRealRoots(1.0, 0.0, -1.0, 0.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqual(-1.0);
    expect(roots[1]).toEqual(0.0);
    expect(roots[2]).toEqual(1.0);

    roots = CubicRealPolynomial.computeRealRoots(1.0, 1.0, 0.0, 0.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqual(-1.0);
    expect(roots[1]).toEqual(0.0);
    expect(roots[2]).toEqual(0.0);

    roots = CubicRealPolynomial.computeRealRoots(1.0, -1.0, 0.0, 0.0);
    expect(roots.length).toEqual(3);
    expect(roots[0]).toEqual(0.0);
    expect(roots[1]).toEqual(0.0);
    expect(roots[2]).toEqual(1.0);

    roots = CubicRealPolynomial.computeRealRoots(1.0, 1.0, 1.0, 0.0);
    expect(roots.length).toEqual(1);
    expect(roots[0]).toEqual(0.0);
  });
});
