import { Cartesian2, Matrix2 } from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;
import createPackableArraySpecs from "../../../../Specs/createPackableArraySpecs.js";;

describe("Core/Matrix2", function () {
  it("default constructor creates values array with all zeros.", function () {
    const matrix = new Matrix2();
    expect(matrix[Matrix2.COLUMN0ROW0]).toEqual(0.0);
    expect(matrix[Matrix2.COLUMN1ROW0]).toEqual(0.0);
    expect(matrix[Matrix2.COLUMN0ROW1]).toEqual(0.0);
    expect(matrix[Matrix2.COLUMN1ROW1]).toEqual(0.0);
  });

  it("constructor sets properties from parameters.", function () {
    const matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
    expect(matrix[Matrix2.COLUMN0ROW0]).toEqual(1.0);
    expect(matrix[Matrix2.COLUMN1ROW0]).toEqual(2.0);
    expect(matrix[Matrix2.COLUMN0ROW1]).toEqual(3.0);
    expect(matrix[Matrix2.COLUMN1ROW1]).toEqual(4.0);
  });

  it("fromArray works without a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const matrix = Matrix2.fromArray([1.0, 3.0, 2.0, 4.0]);
    expect(matrix).toEqual(expected);
  });

  it("fromArray works with a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();
    const matrix = Matrix2.fromArray([1.0, 3.0, 2.0, 4.0], 0, result);
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromArray works with a starting index", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();
    const matrix = Matrix2.fromArray(
      [0.0, 0.0, 0.0, 1.0, 3.0, 2.0, 4.0],
      3,
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromRowMajorArray works without a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const matrix = Matrix2.fromRowMajorArray([1.0, 2.0, 3.0, 4.0]);
    expect(matrix).toEqual(expected);
  });

  it("fromRowMajorArray works with a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();
    const matrix = Matrix2.fromRowMajorArray([1.0, 2.0, 3.0, 4.0], result);
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromColumnMajorArray works without a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const matrix = Matrix2.fromColumnMajorArray([1.0, 3.0, 2.0, 4.0]);
    expect(matrix).toEqual(expected);
  });

  it("fromColumnMajorArray works with a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();
    const matrix = Matrix2.fromColumnMajorArray([1.0, 3.0, 2.0, 4.0], result);
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromScale works without a result parameter", function () {
    const expected = new Matrix2(7.0, 0.0, 0.0, 8.0);
    const returnedResult = Matrix2.fromScale(new Cartesian2(7.0, 8.0));
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromScale works with a result parameter", function () {
    const expected = new Matrix2(7.0, 0.0, 0.0, 8.0);
    const result = new Matrix2();
    const returnedResult = Matrix2.fromScale(new Cartesian2(7.0, 8.0), result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("fromUniformScale works without a result parameter", function () {
    const expected = new Matrix2(2.0, 0.0, 0.0, 2.0);
    const returnedResult = Matrix2.fromUniformScale(2.0);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromUniformScale works with a result parameter", function () {
    const expected = new Matrix2(2.0, 0.0, 0.0, 2.0);
    const result = new Matrix2();
    const returnedResult = Matrix2.fromUniformScale(2.0, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("fromRotation works without a result parameter", function () {
    const matrix = Matrix2.fromRotation(0.0);
    expect(matrix).toEqual(Matrix2.IDENTITY);
  });

  it("fromRotation works with a result parameter", function () {
    const expected = new Matrix2(0.0, -1.0, 1.0, 0.0);
    const result = new Matrix2();
    const matrix = Matrix2.fromRotation(CesiumMath.toRadians(90.0), result);
    expect(matrix).toBe(result);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("clone works without a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const returnedResult = expected.clone();
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("clone works with a result parameter", function () {
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();
    const returnedResult = expected.clone(result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("toArray works without a result parameter", function () {
    const expected = [1.0, 2.0, 3.0, 4.0];
    const returnedResult = Matrix2.toArray(
      Matrix2.fromColumnMajorArray(expected)
    );
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("toArray works with a result parameter", function () {
    const expected = [1.0, 2.0, 3.0, 4.0];
    const result = [];
    const returnedResult = Matrix2.toArray(
      Matrix2.fromColumnMajorArray(expected),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("getElementIndex works", function () {
    let i = 0;
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 2; row++) {
        const index = Matrix2.getElementIndex(col, row);
        expect(index).toEqual(i);
        i++;
      }
    }
  });

  it("getColumn works", function () {
    const matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const expectedColumn0 = new Cartesian2(1.0, 3.0);
    const expectedColumn1 = new Cartesian2(2.0, 4.0);

    const resultColumn0 = new Cartesian2();
    const resultColumn1 = new Cartesian2();
    const returnedResultColumn0 = Matrix2.getColumn(matrix, 0, resultColumn0);
    const returnedResultColumn1 = Matrix2.getColumn(matrix, 1, resultColumn1);

    expect(resultColumn0).toBe(returnedResultColumn0);
    expect(resultColumn0).toEqual(expectedColumn0);
    expect(resultColumn1).toBe(returnedResultColumn1);
    expect(resultColumn1).toEqual(expectedColumn1);
  });

  it("setColumn works", function () {
    const matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();

    let expected = new Matrix2(5.0, 2.0, 6.0, 4.0);
    let returnedResult = Matrix2.setColumn(
      matrix,
      0,
      new Cartesian2(5.0, 6.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix2(1.0, 7.0, 3.0, 8.0);
    returnedResult = Matrix2.setColumn(
      matrix,
      1,
      new Cartesian2(7.0, 8.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("getRow works", function () {
    const matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const expectedRow0 = new Cartesian2(1.0, 2.0);
    const expectedRow1 = new Cartesian2(3.0, 4.0);

    const resultRow0 = new Cartesian2();
    const resultRow1 = new Cartesian2();
    const returnedResultRow0 = Matrix2.getRow(matrix, 0, resultRow0);
    const returnedResultRow1 = Matrix2.getRow(matrix, 1, resultRow1);

    expect(resultRow0).toBe(returnedResultRow0);
    expect(resultRow0).toEqual(expectedRow0);
    expect(resultRow1).toBe(returnedResultRow1);
    expect(resultRow1).toEqual(expectedRow1);
  });

  it("setRow works", function () {
    const matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();

    let expected = new Matrix2(5.0, 6.0, 3.0, 4.0);
    let returnedResult = Matrix2.setRow(
      matrix,
      0,
      new Cartesian2(5.0, 6.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix2(1.0, 2.0, 7.0, 8.0);
    returnedResult = Matrix2.setRow(
      matrix,
      1,
      new Cartesian2(7.0, 8.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("setScale works", function () {
    const oldScale = new Cartesian2(2.0, 3.0);
    const newScale = new Cartesian2(4.0, 5.0);

    const matrix = Matrix2.fromScale(oldScale, new Matrix2());
    const result = new Matrix2();

    expect(Matrix2.getScale(matrix, new Cartesian2())).toEqual(oldScale);

    const returnedResult = Matrix2.setScale(matrix, newScale, result);

    expect(Matrix2.getScale(returnedResult, new Cartesian2())).toEqual(
      newScale
    );
    expect(result).toBe(returnedResult);
  });

  it("setUniformScale works", function () {
    const oldScale = new Cartesian2(2.0, 3.0);
    const newScale = 4.0;

    const matrix = Matrix2.fromScale(oldScale, new Matrix2());
    const result = new Matrix2();

    expect(Matrix2.getScale(matrix, new Cartesian2())).toEqual(oldScale);

    const returnedResult = Matrix2.setUniformScale(matrix, newScale, result);

    expect(Matrix2.getScale(returnedResult, new Cartesian2())).toEqual(
      new Cartesian2(newScale, newScale)
    );
    expect(result).toBe(returnedResult);
  });

  it("getScale works", function () {
    const scale = new Cartesian2(2.0, 3.0);
    const result = new Cartesian2();
    const computedScale = Matrix2.getScale(Matrix2.fromScale(scale), result);

    expect(computedScale).toBe(result);
    expect(computedScale).toEqualEpsilon(scale, CesiumMath.EPSILON14);
  });

  it("getMaximumScale works", function () {
    const m = Matrix2.fromScale(new Cartesian2(2.0, 3.0));
    expect(Matrix2.getMaximumScale(m)).toEqualEpsilon(
      3.0,
      CesiumMath.EPSILON14
    );
  });

  it("setRotation works", function () {
    const scaleVec = new Cartesian2(2.0, 3.0);
    const scale = Matrix2.fromScale(scaleVec, new Matrix2());
    const rotation = Matrix2.fromRotation(0.5, new Matrix2());
    const scaleRotation = Matrix2.setRotation(scale, rotation, new Matrix2());

    const extractedScale = Matrix2.getScale(scaleRotation, new Cartesian2());
    const extractedRotation = Matrix2.getRotation(scaleRotation, new Matrix2());

    expect(extractedScale).toEqualEpsilon(scaleVec, CesiumMath.EPSILON14);
    expect(extractedRotation).toEqualEpsilon(rotation, CesiumMath.EPSILON14);
  });

  it("getRotation returns matrix without scale", function () {
    const matrix = Matrix2.fromColumnMajorArray([1.0, 2.0, 3.0, 4.0]);
    const expectedRotation = Matrix2.fromArray([
      1.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0),
      2.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0),
      3.0 / Math.sqrt(3.0 * 3.0 + 4.0 * 4.0),
      4.0 / Math.sqrt(3.0 * 3.0 + 4.0 * 4.0),
    ]);
    const rotation = Matrix2.getRotation(matrix, new Matrix2());
    expect(rotation).toEqualEpsilon(expectedRotation, CesiumMath.EPSILON14);
  });

  it("getRotation does not modify rotation matrix", function () {
    const matrix = Matrix2.fromColumnMajorArray([1.0, 2.0, 3.0, 4.0]);
    const duplicateMatrix = Matrix2.clone(matrix, new Matrix2());
    const expectedRotation = Matrix2.fromArray([
      1.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0),
      2.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0),
      3.0 / Math.sqrt(3.0 * 3.0 + 4.0 * 4.0),
      4.0 / Math.sqrt(3.0 * 3.0 + 4.0 * 4.0),
    ]);
    const result = Matrix2.getRotation(matrix, new Matrix2());
    expect(result).toEqualEpsilon(expectedRotation, CesiumMath.EPSILON14);
    expect(matrix).toEqual(duplicateMatrix);
    expect(matrix).not.toBe(result);
  });

  it("multiply works", function () {
    const left = new Matrix2(1, 2, 3, 4);
    const right = new Matrix2(5, 6, 7, 8);
    const expected = new Matrix2(19, 22, 43, 50);
    const result = new Matrix2();
    const returnedResult = Matrix2.multiply(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiply works with a result parameter that is an input result parameter", function () {
    const left = new Matrix2(1, 2, 3, 4);
    const right = new Matrix2(5, 6, 7, 8);
    const expected = new Matrix2(19, 22, 43, 50);
    const returnedResult = Matrix2.multiply(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("add works", function () {
    const left = new Matrix2(1, 2, 3, 4);
    const right = new Matrix2(10, 11, 12, 13);
    const expected = new Matrix2(11, 13, 15, 17);
    const result = new Matrix2();
    const returnedResult = Matrix2.add(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("add works with a result parameter that is an input result parameter", function () {
    const left = new Matrix2(1, 2, 3, 4);
    const right = new Matrix2(10, 11, 12, 13);
    const expected = new Matrix2(11, 13, 15, 17);
    const returnedResult = Matrix2.add(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("subtract works", function () {
    const left = new Matrix2(11, 13, 15, 17);
    const right = new Matrix2(10, 11, 12, 13);
    const expected = new Matrix2(1, 2, 3, 4);
    const result = new Matrix2();
    const returnedResult = Matrix2.subtract(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("subtract works with a result parameter that is an input result parameter", function () {
    const left = new Matrix2(11, 13, 15, 17);
    const right = new Matrix2(10, 11, 12, 13);
    const expected = new Matrix2(1, 2, 3, 4);
    const returnedResult = Matrix2.subtract(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("multiplyByScale works", function () {
    const m = new Matrix2(2, 3, 6, 7);
    const scale = new Cartesian2(2.0, 3.0);
    const expected = Matrix2.multiply(
      m,
      Matrix2.fromScale(scale),
      new Matrix2()
    );
    const result = new Matrix2();
    const returnedResult = Matrix2.multiplyByScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it('multiplyByScale works with "this" result parameter', function () {
    const m = new Matrix2(1, 2, 5, 6);
    const scale = new Cartesian2(1.0, 2.0);
    const expected = Matrix2.multiply(
      m,
      Matrix2.fromScale(scale),
      new Matrix2()
    );
    const returnedResult = Matrix2.multiplyByScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByUniformScale works", function () {
    const m = new Matrix2(2, 3, 4, 5);
    const scale = 2.0;
    const expected = Matrix2.multiply(
      m,
      Matrix2.fromUniformScale(scale),
      new Matrix2()
    );
    const result = new Matrix2();
    const returnedResult = Matrix2.multiplyByUniformScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it('multiplyByUniformScale works with "this" result parameter', function () {
    const m = new Matrix2(2, 3, 4, 5);
    const scale = 2.0;
    const expected = Matrix2.multiply(
      m,
      Matrix2.fromUniformScale(scale),
      new Matrix2()
    );
    const returnedResult = Matrix2.multiplyByUniformScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByVector works", function () {
    const left = new Matrix2(1, 2, 3, 4);
    const right = new Cartesian2(5, 6);
    const expected = new Cartesian2(17, 39);
    const result = new Cartesian2();
    const returnedResult = Matrix2.multiplyByVector(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByScalar works", function () {
    const left = new Matrix2(1, 2, 3, 4);
    const right = 2;
    const expected = new Matrix2(2, 4, 6, 8);
    const result = new Matrix2();
    const returnedResult = Matrix2.multiplyByScalar(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("negate works", function () {
    const matrix = new Matrix2(1, 2, 3, 4);
    const expected = new Matrix2(-1, -2, -3, -4);
    const result = new Matrix2();
    const returnedResult = Matrix2.negate(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("negate works with a result parameter that is an input parameter", function () {
    const matrix = new Matrix2(1, 2, 3, 4);
    const expected = new Matrix2(-1, -2, -3, -4);
    const returnedResult = Matrix2.negate(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("transpose works", function () {
    const matrix = new Matrix2(1, 2, 3, 4);
    const expected = new Matrix2(1, 3, 2, 4);
    const result = new Matrix2();
    const returnedResult = Matrix2.transpose(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("transpose works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix2(1, 2, 3, 4);
    const expected = new Matrix2(1, 3, 2, 4);
    const returnedResult = Matrix2.transpose(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("abs works", function () {
    let matrix = new Matrix2(-1.0, -2.0, -3.0, -4.0);
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const result = new Matrix2();
    let returnedResult = Matrix2.abs(matrix, result);
    expect(returnedResult).toEqual(expected);

    matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
    returnedResult = Matrix2.abs(matrix, result);
    expect(returnedResult).toEqual(expected);

    matrix = new Matrix2(1.0, -2.0, -3.0, 4.0);
    returnedResult = Matrix2.abs(matrix, result);
    expect(returnedResult).toEqual(expected);
  });

  it("abs works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix2(-1.0, -2.0, -3.0, -4.0);
    const expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
    const returnedResult = Matrix2.abs(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("equals works in all cases", function () {
    let left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    let right = new Matrix2(1.0, 2.0, 3.0, 4.0);
    expect(Matrix2.equals(left, right)).toEqual(true);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(5.0, 2.0, 3.0, 4.0);
    expect(Matrix2.equals(left, right)).toEqual(false);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(1.0, 6.0, 3.0, 4.0);
    expect(Matrix2.equals(left, right)).toEqual(false);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(1.0, 2.0, 7.0, 4.0);
    expect(Matrix2.equals(left, right)).toEqual(false);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(1.0, 2.0, 3.0, 8.0);
    expect(Matrix2.equals(left, right)).toEqual(false);
  });

  it("equals works with undefined", function () {
    expect(Matrix2.equals(undefined, undefined)).toEqual(true);
    expect(Matrix2.equals(new Matrix2(), undefined)).toEqual(false);
    expect(Matrix2.equals(undefined, new Matrix2())).toEqual(false);
  });

  it("equalsEpsilon works in all cases", function () {
    let left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    let right = new Matrix2(1.0, 2.0, 3.0, 4.0);
    expect(Matrix2.equalsEpsilon(left, right, 1.0)).toEqual(true);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(5.0, 2.0, 3.0, 4.0);
    expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(1.0, 6.0, 3.0, 4.0);
    expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(1.0, 2.0, 7.0, 4.0);
    expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix2(1.0, 2.0, 3.0, 4.0);
    right = new Matrix2(1.0, 2.0, 3.0, 8.0);
    expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);
  });

  it("equalsEpsilon works with undefined", function () {
    expect(Matrix2.equalsEpsilon(undefined, undefined, 1.0)).toEqual(true);
    expect(Matrix2.equalsEpsilon(new Matrix2(), undefined, 1.0)).toEqual(false);
    expect(Matrix2.equalsEpsilon(undefined, new Matrix2(), 1.0)).toEqual(false);
  });

  it("toString", function () {
    const matrix = new Matrix2(1, 2, 3, 4);
    expect(matrix.toString()).toEqual("(1, 2)\n(3, 4)");
  });

  it("fromArray throws without an array", function () {
    expect(function () {
      Matrix2.fromArray();
    }).toThrowDeveloperError();
  });

  it("fromRowMajorArray throws with undefined parameter", function () {
    expect(function () {
      Matrix2.fromRowMajorArray(undefined);
    }).toThrowDeveloperError();
  });

  it("fromColumnMajorArray throws with undefined parameter", function () {
    expect(function () {
      Matrix2.fromColumnMajorArray(undefined);
    }).toThrowDeveloperError();
  });

  it("fromScale throws without scale parameter", function () {
    expect(function () {
      Matrix2.fromScale(undefined);
    }).toThrowDeveloperError();
  });

  it("fromUniformScale throws without scale parameter", function () {
    expect(function () {
      Matrix2.fromUniformScale(undefined);
    }).toThrowDeveloperError();
  });

  it("fromRotation throws without angle", function () {
    expect(function () {
      Matrix2.fromRotation();
    }).toThrowDeveloperError();
  });

  it("clone returns undefined without matrix parameter", function () {
    expect(Matrix2.clone(undefined)).toBeUndefined();
  });

  it("toArray throws without matrix parameter", function () {
    expect(function () {
      Matrix2.toArray(undefined);
    }).toThrowDeveloperError();
  });

  it("getColumn throws without matrix parameter", function () {
    expect(function () {
      Matrix2.getColumn(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("getElement throws without row parameter", function () {
    let row;
    const col = 0.0;
    expect(function () {
      Matrix2.getElementIndex(col, row);
    }).toThrowDeveloperError();
  });

  it("getElement throws without column parameter", function () {
    const row = 0.0;
    let col;
    expect(function () {
      Matrix2.getElementIndex(col, row);
    }).toThrowDeveloperError();
  });

  it("getColumn throws with out of range index parameter", function () {
    const matrix = new Matrix2();
    expect(function () {
      Matrix2.getColumn(matrix, 2);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without matrix parameter", function () {
    const cartesian = new Cartesian2();
    expect(function () {
      Matrix2.setColumn(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without cartesian parameter", function () {
    const matrix = new Matrix2();
    expect(function () {
      Matrix2.setColumn(matrix, 1, undefined);
    }).toThrowDeveloperError();
  });

  it("setColumn throws with out of range index parameter", function () {
    const matrix = new Matrix2();
    const cartesian = new Cartesian2();
    expect(function () {
      Matrix2.setColumn(matrix, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("getRow throws without matrix parameter", function () {
    expect(function () {
      Matrix2.getRow(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("getRow throws with out of range index parameter", function () {
    const matrix = new Matrix2();
    expect(function () {
      Matrix2.getRow(matrix, 2);
    }).toThrowDeveloperError();
  });

  it("setRow throws without matrix parameter", function () {
    const cartesian = new Cartesian2();
    expect(function () {
      Matrix2.setRow(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setRow throws without cartesian parameter", function () {
    const matrix = new Matrix2();
    expect(function () {
      Matrix2.setRow(matrix, 1, undefined);
    }).toThrowDeveloperError();
  });

  it("setRow throws with out of range index parameter", function () {
    const matrix = new Matrix2();
    const cartesian = new Cartesian2();
    expect(function () {
      Matrix2.setRow(matrix, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setScale throws without a matrix", function () {
    expect(function () {
      Matrix2.setScale();
    }).toThrowDeveloperError();
  });

  it("setScale throws without a scale", function () {
    expect(function () {
      Matrix2.setScale(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a matrix", function () {
    expect(function () {
      Matrix2.setUniformScale();
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a scale", function () {
    expect(function () {
      Matrix2.setUniformScale(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("getScale throws without a matrix", function () {
    expect(function () {
      Matrix2.getScale();
    }).toThrowDeveloperError();
  });

  it("getMaximumScale throws without a matrix", function () {
    expect(function () {
      Matrix2.getMaximumScale();
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a matrix", function () {
    expect(function () {
      return Matrix2.setRotation();
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a rotation", function () {
    expect(function () {
      return Matrix2.setRotation(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("getRotation throws without a matrix", function () {
    expect(function () {
      return Matrix2.getRotation();
    }).toThrowDeveloperError();
  });

  it("multiply throws with no left parameter", function () {
    const right = new Matrix2();
    expect(function () {
      Matrix2.multiply(undefined, right);
    }).toThrowDeveloperError();
  });

  it("multiply throws with no right parameter", function () {
    const left = new Matrix2();
    expect(function () {
      Matrix2.multiply(left, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws with no matrix parameter", function () {
    expect(function () {
      Matrix2.multiplyByScale(undefined, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws with no scale parameter", function () {
    const m = new Matrix2();
    expect(function () {
      Matrix2.multiplyByScale(m, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws with no matrix parameter", function () {
    expect(function () {
      Matrix2.multiplyByUniformScale(undefined, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws with no scale parameter", function () {
    const m = new Matrix2();
    expect(function () {
      Matrix2.multiplyByUniformScale(m, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws with no matrix parameter", function () {
    const cartesian = new Cartesian2();
    expect(function () {
      Matrix2.multiplyByVector(undefined, cartesian);
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws with no cartesian parameter", function () {
    const matrix = new Matrix2();
    expect(function () {
      Matrix2.multiplyByVector(matrix, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no matrix parameter", function () {
    expect(function () {
      Matrix2.multiplyByScalar(undefined, 2);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with non-numeric scalar parameter", function () {
    const matrix = new Matrix2();
    expect(function () {
      Matrix2.multiplyByScalar(matrix, {});
    }).toThrowDeveloperError();
  });

  it("negate throws with matrix parameter", function () {
    expect(function () {
      Matrix2.negate(undefined);
    }).toThrowDeveloperError();
  });

  it("transpose throws with matrix parameter", function () {
    expect(function () {
      Matrix2.transpose(undefined);
    }).toThrowDeveloperError();
  });

  it("abs throws without a matrix", function () {
    expect(function () {
      return Matrix2.abs();
    }).toThrowDeveloperError();
  });

  it("getColumn throws without a result parameter", function () {
    expect(function () {
      Matrix2.getColumn(new Matrix2(), 1);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without a result parameter", function () {
    expect(function () {
      Matrix2.setColumn(new Matrix2(), 1, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("getRow throws without a result parameter", function () {
    expect(function () {
      Matrix2.getRow(new Matrix2(), 1);
    }).toThrowDeveloperError();
  });

  it("setRow throws without a result parameter", function () {
    expect(function () {
      Matrix2.setRow(new Matrix2(), 1, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("setScale throws without a result parameter", function () {
    expect(function () {
      Matrix2.setScale(new Matrix2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a result parameter", function () {
    expect(function () {
      Matrix2.setUniformScale(new Matrix2(), 1.0);
    }).toThrowDeveloperError();
  });

  it("getScale throws without a result parameter", function () {
    expect(function () {
      Matrix2.getScale(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a result parameter", function () {
    expect(function () {
      return Matrix2.setRotation(new Matrix2(), new Matrix2());
    }).toThrowDeveloperError();
  });

  it("getRotation throws without a result parameter", function () {
    expect(function () {
      return Matrix2.getRotation(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("multiply throws without a result parameter", function () {
    expect(function () {
      Matrix2.multiply(new Matrix2(), new Matrix2());
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws without a result parameter", function () {
    expect(function () {
      Matrix2.multiplyByScale(new Matrix2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws without a result parameter", function () {
    expect(function () {
      Matrix2.multiplyByUniformScale(new Matrix2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws without a result parameter", function () {
    expect(function () {
      Matrix2.multiplyByVector(new Matrix2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws without a result parameter", function () {
    expect(function () {
      Matrix2.multiplyByScalar(new Matrix2(), 2);
    }).toThrowDeveloperError();
  });

  it("negate throws without a result parameter", function () {
    expect(function () {
      Matrix2.negate(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("transpose throws without a result parameter", function () {
    expect(function () {
      Matrix2.transpose(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("abs throws without a result parameter", function () {
    expect(function () {
      Matrix2.abs(new Matrix2());
    }).toThrowDeveloperError();
  });

  it("Matrix2 objects can be used as array like objects", function () {
    const matrix = new Matrix2(1, 3, 2, 4);
    expect(matrix.length).toEqual(4);
    const intArray = new Uint32Array(matrix.length);
    intArray.set(matrix);
    for (let index = 0; index < matrix.length; index++) {
      expect(intArray[index]).toEqual(index + 1);
    }
  });

  createPackableSpecs(Matrix2, new Matrix2(0, -1, 1, 0), [0, 1, -1, 0]);
  createPackableArraySpecs(
    Matrix2,
    [
      new Matrix2(1, 0, 0, 1),
      new Matrix2(1, 2, 3, 4),
      new Matrix2(0, 1, -1, 0),
    ],
    [1, 0, 0, 1, 1, 3, 2, 4, 0, -1, 1, 0],
    4
  );
});
