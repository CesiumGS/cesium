import { Math as CesiumMath } from "../../Source/Cesium.js";
import { QuadraticRealPolynomial } from "../../Source/Cesium.js";

describe("Core/QuadraticRealPolynomial", function () {
  it("discriminant throws without a", function () {
    expect(function () {
      QuadraticRealPolynomial.computeDiscriminant();
    }).toThrowDeveloperError();
  });

  it("discriminant throws without b", function () {
    expect(function () {
      QuadraticRealPolynomial.computeDiscriminant(1.0);
    }).toThrowDeveloperError();
  });

  it("discriminant throws without c", function () {
    expect(function () {
      QuadraticRealPolynomial.computeDiscriminant(1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("discriminant", function () {
    var discriminant = QuadraticRealPolynomial.computeDiscriminant(
      1.0,
      2.0,
      3.0
    );
    expect(discriminant).toEqual(-8.0);
  });

  it("real roots throws without a", function () {
    expect(function () {
      QuadraticRealPolynomial.computeRealRoots();
    }).toThrowDeveloperError();
  });

  it("real roots throws without b", function () {
    expect(function () {
      QuadraticRealPolynomial.computeRealRoots(1.0);
    }).toThrowDeveloperError();
  });

  it("real roots throws without c", function () {
    expect(function () {
      QuadraticRealPolynomial.computeRealRoots(1.0, 1.0);
    }).toThrowDeveloperError();
  });

  it("negative b", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(2.0, -4.0, -6.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(-1.0);
    expect(roots[1]).toEqual(3.0);
  });

  it("positive b", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(2.0, 4.0, -6.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(-3.0);
    expect(roots[1]).toEqual(1.0);
  });

  it("marginally negative radical case", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(
      2.0,
      -3.999999999999999,
      2
    );
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
    expect(roots[1]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
  });

  it("complex roots", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(2.0, -4.0, 6.0);
    expect(roots.length).toEqual(0);
  });

  it("intractable case", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(0.0, 0.0, -3.0);
    expect(roots.length).toEqual(0);
  });

  it("linear case", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(0.0, 2.0, 8.0);
    expect(roots.length).toEqual(1);
    expect(roots[0]).toEqual(-4.0);
  });

  it("2nd order monomial case", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(3.0, 0.0, 0.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(0.0);
    expect(roots[1]).toEqual(0.0);
  });

  it("parabolic case with complex roots", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(3.0, 0.0, 18.0);
    expect(roots.length).toEqual(0);
  });

  it("parabolic case with real roots", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(2.0, 0.0, -18.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(-3.0);
    expect(roots[1]).toEqual(3.0);
  });

  it("zero and negative root case", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(2.0, 6.0, 0.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(-3.0);
    expect(roots[1]).toEqual(0.0);
  });

  it("zero and positive root case", function () {
    var roots = QuadraticRealPolynomial.computeRealRoots(2.0, -6.0, 0.0);
    expect(roots.length).toEqual(2);
    expect(roots[0]).toEqual(0.0);
    expect(roots[1]).toEqual(3.0);
  });
});
