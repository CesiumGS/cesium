import { Cartesian3 } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";
import createPackableArraySpecs from "../createPackableArraySpecs.js";

describe("Core/Matrix3", function () {
  it("default constructor creates values array with all zeros.", function () {
    const matrix = new Matrix3();
    expect(matrix[Matrix3.COLUMN0ROW0]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN1ROW0]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN2ROW0]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN0ROW1]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN1ROW1]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN2ROW1]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN0ROW2]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN1ROW2]).toEqual(0.0);
    expect(matrix[Matrix3.COLUMN2ROW2]).toEqual(0.0);
  });

  it("constructor sets properties from parameters.", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(matrix[Matrix3.COLUMN0ROW0]).toEqual(1.0);
    expect(matrix[Matrix3.COLUMN1ROW0]).toEqual(2.0);
    expect(matrix[Matrix3.COLUMN2ROW0]).toEqual(3.0);
    expect(matrix[Matrix3.COLUMN0ROW1]).toEqual(4.0);
    expect(matrix[Matrix3.COLUMN1ROW1]).toEqual(5.0);
    expect(matrix[Matrix3.COLUMN2ROW1]).toEqual(6.0);
    expect(matrix[Matrix3.COLUMN0ROW2]).toEqual(7.0);
    expect(matrix[Matrix3.COLUMN1ROW2]).toEqual(8.0);
    expect(matrix[Matrix3.COLUMN2ROW2]).toEqual(9.0);
  });

  it("fromQuaternion works without a result parameter", function () {
    const sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
    const cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
    const sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
    const cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

    const tmp = Cartesian3.multiplyByScalar(
      new Cartesian3(0.0, 0.0, 1.0),
      sPiOver4,
      new Cartesian3()
    );
    const quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
    const expected = new Matrix3(
      cPiOver2,
      -sPiOver2,
      0.0,
      sPiOver2,
      cPiOver2,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const returnedResult = Matrix3.fromQuaternion(quaternion);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromQuaternion works with a result parameter", function () {
    const sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
    const cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
    const sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
    const cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

    const tmp = Cartesian3.multiplyByScalar(
      new Cartesian3(0.0, 0.0, 1.0),
      sPiOver4,
      new Cartesian3()
    );
    const quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
    const expected = new Matrix3(
      cPiOver2,
      -sPiOver2,
      0.0,
      sPiOver2,
      cPiOver2,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.fromQuaternion(quaternion, result);
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromHeadingPitchRoll works without a result parameter", function () {
    const sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
    const cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
    const sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
    const cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

    const tmp = Cartesian3.multiplyByScalar(
      new Cartesian3(0.0, 0.0, 1.0),
      sPiOver4,
      new Cartesian3()
    );
    const quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
    const headingPitchRoll = HeadingPitchRoll.fromQuaternion(quaternion);
    const expected = new Matrix3(
      cPiOver2,
      -sPiOver2,
      0.0,
      sPiOver2,
      cPiOver2,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const returnedResult = Matrix3.fromHeadingPitchRoll(headingPitchRoll);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromHeadingPitchRoll works with a result parameter", function () {
    const sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
    const cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
    const sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
    const cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

    const tmp = Cartesian3.multiplyByScalar(
      new Cartesian3(0.0, 0.0, 1.0),
      sPiOver4,
      new Cartesian3()
    );
    const quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
    const headingPitchRoll = HeadingPitchRoll.fromQuaternion(quaternion);
    const expected = new Matrix3(
      cPiOver2,
      -sPiOver2,
      0.0,
      sPiOver2,
      cPiOver2,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.fromHeadingPitchRoll(
      headingPitchRoll,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromHeadingPitchRoll computed correctly", function () {
    // Expected generated via STK Components
    const expected = new Matrix3(
      0.754406506735489,
      0.418940943945763,
      0.505330889696038,
      0.133022221559489,
      0.656295369162553,
      -0.742685314912828,
      -0.642787609686539,
      0.627506871597133,
      0.439385041770705
    );

    const headingPitchRoll = new HeadingPitchRoll(
      -CesiumMath.toRadians(10),
      -CesiumMath.toRadians(40),
      CesiumMath.toRadians(55)
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.fromHeadingPitchRoll(
      headingPitchRoll,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromScale works without a result parameter", function () {
    const expected = new Matrix3(7.0, 0.0, 0.0, 0.0, 8.0, 0.0, 0.0, 0.0, 9.0);
    const returnedResult = Matrix3.fromScale(new Cartesian3(7.0, 8.0, 9.0));
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromScale works with a result parameter", function () {
    const expected = new Matrix3(7.0, 0.0, 0.0, 0.0, 8.0, 0.0, 0.0, 0.0, 9.0);
    const result = new Matrix3();
    const returnedResult = Matrix3.fromScale(
      new Cartesian3(7.0, 8.0, 9.0),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromUniformScale works without a result parameter", function () {
    const expected = new Matrix3(2.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 2.0);
    const returnedResult = Matrix3.fromUniformScale(2.0);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromUniformScale works with a result parameter", function () {
    const expected = new Matrix3(2.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 2.0);
    const result = new Matrix3();
    const returnedResult = Matrix3.fromUniformScale(2.0, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("fromCrossProduct works without a result parameter", function () {
    const expected = new Matrix3(
      0.0,
      -3.0,
      -2.0,
      3.0,
      0.0,
      -1.0,
      2.0,
      1.0,
      0.0
    );
    const left = new Cartesian3(1.0, -2.0, 3.0);
    const returnedResult = Matrix3.fromCrossProduct(left);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);

    const right = new Cartesian3(2.0, 3.0, 4.0);
    const crossProductExpected = new Cartesian3(-17.0, 2.0, 7.0);

    let crossProductResult = new Cartesian3();
    // Check Cartesian3 cross product.
    crossProductResult = Cartesian3.cross(left, right, crossProductResult);
    expect(crossProductResult).toEqual(crossProductExpected);

    // Check Matrix3 cross product equivalent.
    crossProductResult = Matrix3.multiply(
      returnedResult,
      right,
      crossProductResult
    );
    expect(crossProductResult).toEqual(crossProductExpected);
  });

  it("fromCrossProduct works with a result parameter", function () {
    const expected = new Matrix3(
      0.0,
      -3.0,
      -2.0,
      3.0,
      0.0,
      -1.0,
      2.0,
      1.0,
      0.0
    );
    const left = new Cartesian3(1.0, -2.0, 3.0);
    const result = new Matrix3();
    const returnedResult = Matrix3.fromCrossProduct(left, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);

    const right = new Cartesian3(2.0, 3.0, 4.0);
    const crossProductExpected = new Cartesian3(-17.0, 2.0, 7.0);

    let crossProductResult = new Cartesian3();
    // Check Cartesian3 cross product.
    crossProductResult = Cartesian3.cross(left, right, crossProductResult);
    expect(crossProductResult).toEqual(crossProductExpected);

    // Check Matrix3 cross product equivalent.
    crossProductResult = Matrix3.multiply(
      returnedResult,
      right,
      crossProductResult
    );
    expect(crossProductResult).toEqual(crossProductExpected);
  });

  it("fromArray works without a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const matrix = Matrix3.fromArray([
      1.0,
      4.0,
      7.0,
      2.0,
      5.0,
      8.0,
      3.0,
      6.0,
      9.0,
    ]);
    expect(matrix).toEqual(expected);
  });

  it("fromArray works with a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromArray(
      [1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0],
      0,
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromArray works with an offset", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromArray(
      [0.0, 0.0, 0.0, 1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0],
      3,
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromRowMajorArray works without a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const matrix = Matrix3.fromRowMajorArray([
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
    ]);
    expect(matrix).toEqual(expected);
  });

  it("fromRowMajorArray works with a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromRowMajorArray(
      [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromColumnMajorArray works without a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const matrix = Matrix3.fromColumnMajorArray([
      1.0,
      4.0,
      7.0,
      2.0,
      5.0,
      8.0,
      3.0,
      6.0,
      9.0,
    ]);
    expect(matrix).toEqual(expected);
  });

  it("fromColumnMajorArray works with a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromColumnMajorArray(
      [1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0],
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromRotationX works without a result parameter", function () {
    const matrix = Matrix3.fromRotationX(0.0);
    expect(matrix).toEqual(Matrix3.IDENTITY);
  });

  it("fromRotationX works with a result parameter", function () {
    const expected = new Matrix3(1.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 1.0, 0.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromRotationX(CesiumMath.toRadians(90.0), result);
    expect(matrix).toBe(result);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromRotationY works without a result parameter", function () {
    const matrix = Matrix3.fromRotationY(0.0);
    expect(matrix).toEqual(Matrix3.IDENTITY);
  });

  it("fromRotationY works with a result parameter", function () {
    const expected = new Matrix3(0.0, 0.0, 1.0, 0.0, 1.0, 0.0, -1.0, 0.0, 0.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromRotationY(CesiumMath.toRadians(90.0), result);
    expect(matrix).toBe(result);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromRotationZ works without a result parameter", function () {
    const matrix = Matrix3.fromRotationZ(0.0);
    expect(matrix).toEqual(Matrix3.IDENTITY);
  });

  it("fromRotationZ works with a result parameter", function () {
    const expected = new Matrix3(0.0, -1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
    const result = new Matrix3();
    const matrix = Matrix3.fromRotationZ(CesiumMath.toRadians(90.0), result);
    expect(matrix).toBe(result);
    expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("clone works without a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const returnedResult = expected.clone();
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("clone works with a result parameter", function () {
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();
    const returnedResult = expected.clone(result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("toArray works without a result parameter", function () {
    const expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
    const returnedResult = Matrix3.toArray(
      Matrix3.fromColumnMajorArray(expected)
    );
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("toArray works with a result parameter", function () {
    const expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
    const result = [];
    const returnedResult = Matrix3.toArray(
      Matrix3.fromColumnMajorArray(expected),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("getElementIndex works", function () {
    let i = 0;
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        const index = Matrix3.getElementIndex(col, row);
        expect(index).toEqual(i);
        i++;
      }
    }
  });

  it("getColumn works", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const expectedColumn0 = new Cartesian3(1.0, 4.0, 7.0);
    const expectedColumn1 = new Cartesian3(2.0, 5.0, 8.0);
    const expectedColumn2 = new Cartesian3(3.0, 6.0, 9.0);

    const resultColumn0 = new Cartesian3();
    const resultColumn1 = new Cartesian3();
    const resultColumn2 = new Cartesian3();
    const returnedResultColumn0 = Matrix3.getColumn(matrix, 0, resultColumn0);
    const returnedResultColumn1 = Matrix3.getColumn(matrix, 1, resultColumn1);
    const returnedResultColumn2 = Matrix3.getColumn(matrix, 2, resultColumn2);

    expect(resultColumn0).toBe(returnedResultColumn0);
    expect(resultColumn0).toEqual(expectedColumn0);
    expect(resultColumn1).toBe(returnedResultColumn1);
    expect(resultColumn1).toEqual(expectedColumn1);
    expect(resultColumn2).toBe(returnedResultColumn2);
    expect(resultColumn2).toEqual(expectedColumn2);
  });

  it("setColumn works", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();

    let expected = new Matrix3(10.0, 2.0, 3.0, 11.0, 5.0, 6.0, 12.0, 8.0, 9.0);
    let returnedResult = Matrix3.setColumn(
      matrix,
      0,
      new Cartesian3(10.0, 11.0, 12.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix3(1.0, 13.0, 3.0, 4.0, 14.0, 6.0, 7.0, 15.0, 9.0);
    returnedResult = Matrix3.setColumn(
      matrix,
      1,
      new Cartesian3(13.0, 14.0, 15.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix3(1.0, 2.0, 16.0, 4.0, 5.0, 17.0, 7.0, 8.0, 18.0);
    returnedResult = Matrix3.setColumn(
      matrix,
      2,
      new Cartesian3(16.0, 17.0, 18.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("getRow works", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const expectedRow0 = new Cartesian3(1.0, 2.0, 3.0);
    const expectedRow1 = new Cartesian3(4.0, 5.0, 6.0);
    const expectedRow2 = new Cartesian3(7.0, 8.0, 9.0);

    const resultRow0 = new Cartesian3();
    const resultRow1 = new Cartesian3();
    const resultRow2 = new Cartesian3();
    const returnedResultRow0 = Matrix3.getRow(matrix, 0, resultRow0);
    const returnedResultRow1 = Matrix3.getRow(matrix, 1, resultRow1);
    const returnedResultRow2 = Matrix3.getRow(matrix, 2, resultRow2);

    expect(resultRow0).toBe(returnedResultRow0);
    expect(resultRow0).toEqual(expectedRow0);
    expect(resultRow1).toBe(returnedResultRow1);
    expect(resultRow1).toEqual(expectedRow1);
    expect(resultRow2).toBe(returnedResultRow2);
    expect(resultRow2).toEqual(expectedRow2);
  });

  it("setRow works", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();

    let expected = new Matrix3(10.0, 11.0, 12.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    let returnedResult = Matrix3.setRow(
      matrix,
      0,
      new Cartesian3(10.0, 11.0, 12.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix3(1.0, 2.0, 3.0, 13.0, 14.0, 15.0, 7.0, 8.0, 9.0);
    returnedResult = Matrix3.setRow(
      matrix,
      1,
      new Cartesian3(13.0, 14.0, 15.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 16.0, 17.0, 18.0);
    returnedResult = Matrix3.setRow(
      matrix,
      2,
      new Cartesian3(16.0, 17.0, 18.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("setScale works", function () {
    const matrix = Matrix3.clone(Matrix3.IDENTITY);
    const result = new Matrix3();
    const newScale = new Cartesian3(2.0, 3.0, 4.0);

    expect(Matrix3.getScale(matrix, new Cartesian3())).toEqual(Cartesian3.ONE);

    const returnedResult = Matrix3.setScale(matrix, newScale, result);

    expect(Matrix3.getScale(returnedResult, new Cartesian3())).toEqual(
      newScale
    );
    expect(result).toBe(returnedResult);
  });

  it("setUniformScale works", function () {
    const oldScale = new Cartesian3(2.0, 3.0, 4.0);
    const newScale = 5.0;

    const matrix = Matrix3.fromScale(oldScale, new Matrix3());
    const result = new Matrix3();

    expect(Matrix3.getScale(matrix, new Cartesian3())).toEqual(oldScale);

    const returnedResult = Matrix3.setUniformScale(matrix, newScale, result);

    expect(Matrix3.getScale(returnedResult, new Cartesian3())).toEqual(
      new Cartesian3(newScale, newScale, newScale)
    );
    expect(result).toBe(returnedResult);
  });

  it("getScale works", function () {
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const result = new Cartesian3();
    const computedScale = Matrix3.getScale(Matrix3.fromScale(scale), result);

    expect(computedScale).toBe(result);
    expect(computedScale).toEqualEpsilon(scale, CesiumMath.EPSILON14);
  });

  it("getMaximumScale works", function () {
    const m = Matrix3.fromScale(new Cartesian3(2.0, 3.0, 4.0));
    expect(Matrix3.getMaximumScale(m)).toEqualEpsilon(
      4.0,
      CesiumMath.EPSILON14
    );
  });

  it("setRotation works", function () {
    const scaleVec = new Cartesian3(2.0, 3.0, 4.0);
    const scale = Matrix3.fromScale(scaleVec, new Matrix3());
    const rotation = Matrix3.fromRotationX(0.5, new Matrix3());
    const scaleRotation = Matrix3.setRotation(scale, rotation, new Matrix3());

    const extractedScale = Matrix3.getScale(scaleRotation, new Cartesian3());
    const extractedRotation = Matrix3.getRotation(scaleRotation, new Matrix3());

    expect(extractedScale).toEqualEpsilon(scaleVec, CesiumMath.EPSILON14);
    expect(extractedRotation).toEqualEpsilon(rotation, CesiumMath.EPSILON14);
  });

  it("getRotation returns matrix without scale", function () {
    const matrix = Matrix3.fromColumnMajorArray([
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
    ]);
    const expectedRotation = Matrix3.fromArray([
      1.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0 + 3.0 * 3.0),
      2.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0 + 3.0 * 3.0),
      3.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0 + 3.0 * 3.0),
      4.0 / Math.sqrt(4.0 * 4.0 + 5.0 * 5.0 + 6.0 * 6.0),
      5.0 / Math.sqrt(4.0 * 4.0 + 5.0 * 5.0 + 6.0 * 6.0),
      6.0 / Math.sqrt(4.0 * 4.0 + 5.0 * 5.0 + 6.0 * 6.0),
      7.0 / Math.sqrt(7.0 * 7.0 + 8.0 * 8.0 + 9.0 * 9.0),
      8.0 / Math.sqrt(7.0 * 7.0 + 8.0 * 8.0 + 9.0 * 9.0),
      9.0 / Math.sqrt(7.0 * 7.0 + 8.0 * 8.0 + 9.0 * 9.0),
    ]);
    const rotation = Matrix3.getRotation(matrix, new Matrix3());
    expect(rotation).toEqualEpsilon(expectedRotation, CesiumMath.EPSILON14);
  });

  it("getRotation does not modify rotation matrix", function () {
    const matrix = Matrix3.fromColumnMajorArray([
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
    ]);
    const duplicateMatrix = Matrix3.clone(matrix, new Matrix3());
    const expectedRotation = Matrix3.fromArray([
      1.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0 + 3.0 * 3.0),
      2.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0 + 3.0 * 3.0),
      3.0 / Math.sqrt(1.0 * 1.0 + 2.0 * 2.0 + 3.0 * 3.0),
      4.0 / Math.sqrt(4.0 * 4.0 + 5.0 * 5.0 + 6.0 * 6.0),
      5.0 / Math.sqrt(4.0 * 4.0 + 5.0 * 5.0 + 6.0 * 6.0),
      6.0 / Math.sqrt(4.0 * 4.0 + 5.0 * 5.0 + 6.0 * 6.0),
      7.0 / Math.sqrt(7.0 * 7.0 + 8.0 * 8.0 + 9.0 * 9.0),
      8.0 / Math.sqrt(7.0 * 7.0 + 8.0 * 8.0 + 9.0 * 9.0),
      9.0 / Math.sqrt(7.0 * 7.0 + 8.0 * 8.0 + 9.0 * 9.0),
    ]);
    const result = Matrix3.getRotation(matrix, new Matrix3());
    expect(result).toEqualEpsilon(expectedRotation, CesiumMath.EPSILON14);
    expect(matrix).toEqual(duplicateMatrix);
    expect(matrix).not.toBe(result);
  });

  it("multiply works", function () {
    const left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
    const expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
    const result = new Matrix3();
    const returnedResult = Matrix3.multiply(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiply works with a result parameter that is an input result parameter", function () {
    const left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
    const expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
    const returnedResult = Matrix3.multiply(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("add works", function () {
    const left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
    const expected = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
    const result = new Matrix3();
    const returnedResult = Matrix3.add(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("add works with a result parameter that is an input result parameter", function () {
    const left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
    const expected = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
    const returnedResult = Matrix3.add(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("subtract works", function () {
    const left = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
    const right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
    const expected = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const result = new Matrix3();
    const returnedResult = Matrix3.subtract(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("subtract works with a result parameter that is an input result parameter", function () {
    const left = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
    const right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
    const expected = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const returnedResult = Matrix3.subtract(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("multiplyByScale works", function () {
    const m = new Matrix3(2, 3, 4, 6, 7, 8, 10, 11, 12);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const expected = Matrix3.multiply(
      m,
      Matrix3.fromScale(scale),
      new Matrix3()
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.multiplyByScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it('multiplyByScale works with "this" result parameter', function () {
    const m = new Matrix3(1, 2, 3, 5, 6, 7, 9, 10, 11);
    const scale = new Cartesian3(1.0, 2.0, 3.0);
    const expected = Matrix3.multiply(
      m,
      Matrix3.fromScale(scale),
      new Matrix3()
    );
    const returnedResult = Matrix3.multiplyByScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByUniformScale works", function () {
    const m = new Matrix3(2, 3, 4, 5, 6, 7, 8, 9, 10);
    const scale = 2.0;
    const expected = Matrix3.multiply(
      m,
      Matrix3.fromUniformScale(scale),
      new Matrix3()
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.multiplyByUniformScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it('multiplyByUniformScale works with "this" result parameter', function () {
    const m = new Matrix3(2, 3, 4, 5, 6, 7, 8, 9, 10);
    const scale = 2.0;
    const expected = Matrix3.multiply(
      m,
      Matrix3.fromUniformScale(scale),
      new Matrix3()
    );
    const returnedResult = Matrix3.multiplyByUniformScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByVector works", function () {
    const left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const right = new Cartesian3(10, 11, 12);
    const expected = new Cartesian3(68, 167, 266);
    const result = new Cartesian3();
    const returnedResult = Matrix3.multiplyByVector(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByScalar works", function () {
    const left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const right = 2;
    const expected = new Matrix3(2, 4, 6, 8, 10, 12, 14, 16, 18);
    const result = new Matrix3();
    const returnedResult = Matrix3.multiplyByScalar(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("negate works", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const expected = new Matrix3(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.negate(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("negate works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const expected = new Matrix3(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0
    );
    const returnedResult = Matrix3.negate(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("transpose works", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
    const result = new Matrix3();
    const returnedResult = Matrix3.transpose(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("inverseTranspose works", function () {
    const matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
    const expectedInverse = Matrix3.inverse(matrix, new Matrix3());
    const expectedInverseTranspose = Matrix3.transpose(
      expectedInverse,
      new Matrix3()
    );
    const result = Matrix3.inverseTranspose(matrix, new Matrix3());
    expect(result).toEqual(expectedInverseTranspose);
  });

  it("transpose works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
    const returnedResult = Matrix3.transpose(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("determinant works", function () {
    const matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
    const expected = -1.0;
    const result = Matrix3.determinant(matrix);
    expect(result).toEqual(expected);
  });

  it("inverse works", function () {
    const matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
    const expected = new Matrix3(
      -25.0,
      26.0,
      -33.0,
      4.0,
      -4.0,
      5.0,
      3.0,
      -3.0,
      4.0
    );
    const result = new Matrix3();
    const returnedResult = Matrix3.inverse(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("inverse works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
    const expected = new Matrix3(
      -25.0,
      26.0,
      -33.0,
      4.0,
      -4.0,
      5.0,
      3.0,
      -3.0,
      4.0
    );
    const returnedResult = Matrix3.inverse(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("computes eigenvalues and eigenvectors", function () {
    const a = new Matrix3(4.0, -1.0, 1.0, -1.0, 3.0, -2.0, 1.0, -2.0, 3.0);

    const expectedDiagonal = new Matrix3(
      3.0,
      0.0,
      0.0,
      0.0,
      6.0,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const decomposition = Matrix3.computeEigenDecomposition(a);
    expect(decomposition.diagonal).toEqualEpsilon(
      expectedDiagonal,
      CesiumMath.EPSILON14
    );

    let v = Matrix3.getColumn(decomposition.unitary, 0, new Cartesian3());
    let lambda = Matrix3.getColumn(decomposition.diagonal, 0, new Cartesian3())
      .x;
    expect(
      Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())
    ).toEqualEpsilon(
      Matrix3.multiplyByVector(a, v, new Cartesian3()),
      CesiumMath.EPSILON14
    );

    v = Matrix3.getColumn(decomposition.unitary, 1, new Cartesian3());
    lambda = Matrix3.getColumn(decomposition.diagonal, 1, new Cartesian3()).y;
    expect(
      Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())
    ).toEqualEpsilon(
      Matrix3.multiplyByVector(a, v, new Cartesian3()),
      CesiumMath.EPSILON14
    );

    v = Matrix3.getColumn(decomposition.unitary, 2, new Cartesian3());
    lambda = Matrix3.getColumn(decomposition.diagonal, 2, new Cartesian3()).z;
    expect(
      Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())
    ).toEqualEpsilon(
      Matrix3.multiplyByVector(a, v, new Cartesian3()),
      CesiumMath.EPSILON14
    );
  });

  it("computes eigenvalues and eigenvectors with result parameters", function () {
    const a = new Matrix3(4.0, -1.0, 1.0, -1.0, 3.0, -2.0, 1.0, -2.0, 3.0);

    const expectedDiagonal = new Matrix3(
      3.0,
      0.0,
      0.0,
      0.0,
      6.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = {
      unitary: new Matrix3(),
      diagonal: new Matrix3(),
    };

    const decomposition = Matrix3.computeEigenDecomposition(a, result);
    expect(decomposition).toBe(result);
    expect(decomposition.diagonal).toEqualEpsilon(
      expectedDiagonal,
      CesiumMath.EPSILON14
    );

    let v = Matrix3.getColumn(decomposition.unitary, 0, new Cartesian3());
    let lambda = Matrix3.getColumn(decomposition.diagonal, 0, new Cartesian3())
      .x;
    expect(
      Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())
    ).toEqualEpsilon(
      Matrix3.multiplyByVector(a, v, new Cartesian3()),
      CesiumMath.EPSILON14
    );

    v = Matrix3.getColumn(decomposition.unitary, 1, new Cartesian3());
    lambda = Matrix3.getColumn(decomposition.diagonal, 1, new Cartesian3()).y;
    expect(
      Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())
    ).toEqualEpsilon(
      Matrix3.multiplyByVector(a, v, new Cartesian3()),
      CesiumMath.EPSILON14
    );

    v = Matrix3.getColumn(decomposition.unitary, 2, new Cartesian3());
    lambda = Matrix3.getColumn(decomposition.diagonal, 2, new Cartesian3()).z;
    expect(
      Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())
    ).toEqualEpsilon(
      Matrix3.multiplyByVector(a, v, new Cartesian3()),
      CesiumMath.EPSILON14
    );
  });

  it("abs works", function () {
    let matrix = new Matrix3(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0
    );
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const result = new Matrix3();
    let returnedResult = Matrix3.abs(matrix, result);
    expect(returnedResult).toEqual(expected);

    matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    returnedResult = Matrix3.abs(matrix, result);
    expect(returnedResult).toEqual(expected);

    matrix = new Matrix3(1.0, -2.0, -3.0, 4.0, 5.0, -6.0, 7.0, -8.0, 9.0);
    returnedResult = Matrix3.abs(matrix, result);
    expect(returnedResult).toEqual(expected);
  });

  it("abs works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix3(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0
    );
    const expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    const returnedResult = Matrix3.abs(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("equals works in all cases", function () {
    let left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    let right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
    expect(Matrix3.equals(left, right)).toEqual(false);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
    expect(Matrix3.equals(left, right)).toEqual(false);
  });

  it("equals works with undefined", function () {
    expect(Matrix3.equals(undefined, undefined)).toEqual(true);
    expect(Matrix3.equals(new Matrix3(), undefined)).toEqual(false);
    expect(Matrix3.equals(undefined, new Matrix3())).toEqual(false);
  });

  it("equalsEpsilon works in all cases", function () {
    let left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    let right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 1.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
    expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);
  });

  it("equalsEpsilon works with undefined", function () {
    expect(Matrix3.equalsEpsilon(undefined, undefined, 1.0)).toEqual(true);
    expect(Matrix3.equalsEpsilon(new Matrix3(), undefined, 1.0)).toEqual(false);
    expect(Matrix3.equalsEpsilon(undefined, new Matrix3(), 1.0)).toEqual(false);
  });

  it("toString", function () {
    const matrix = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    expect(matrix.toString()).toEqual("(1, 2, 3)\n(4, 5, 6)\n(7, 8, 9)");
  });

  it("fromArray throws without an array", function () {
    expect(function () {
      Matrix3.fromArray();
    }).toThrowDeveloperError();
  });

  it("fromRowMajorArray throws with undefined parameter", function () {
    expect(function () {
      Matrix3.fromRowMajorArray(undefined);
    }).toThrowDeveloperError();
  });

  it("fromColumnMajorArray throws with undefined parameter", function () {
    expect(function () {
      Matrix3.fromColumnMajorArray(undefined);
    }).toThrowDeveloperError();
  });

  it("fromRotationX throws without angle", function () {
    expect(function () {
      Matrix3.fromRotationX();
    }).toThrowDeveloperError();
  });

  it("fromRotationY throws without angle", function () {
    expect(function () {
      Matrix3.fromRotationY();
    }).toThrowDeveloperError();
  });

  it("fromRotationZ throws without angle", function () {
    expect(function () {
      Matrix3.fromRotationZ();
    }).toThrowDeveloperError();
  });

  it("clone returns undefined without matrix parameter", function () {
    expect(Matrix3.clone(undefined)).toBeUndefined();
  });

  it("toArray throws without matrix parameter", function () {
    expect(function () {
      Matrix3.toArray(undefined);
    }).toThrowDeveloperError();
  });

  it("getElement throws without row parameter", function () {
    let row;
    const col = 0.0;
    expect(function () {
      Matrix3.getElementIndex(col, row);
    }).toThrowDeveloperError();
  });

  it("getElement throws without column parameter", function () {
    const row = 0.0;
    let col;
    expect(function () {
      Matrix3.getElementIndex(col, row);
    }).toThrowDeveloperError();
  });

  it("getColumn throws without matrix parameter", function () {
    expect(function () {
      Matrix3.getColumn(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("getColumn throws with out of range index parameter", function () {
    const matrix = new Matrix3();
    expect(function () {
      Matrix3.getColumn(matrix, 3);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without matrix parameter", function () {
    const cartesian = new Cartesian3();
    expect(function () {
      Matrix3.setColumn(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without cartesian parameter", function () {
    const matrix = new Matrix3();
    expect(function () {
      Matrix3.setColumn(matrix, 1, undefined);
    }).toThrowDeveloperError();
  });

  it("setColumn throws with out of range index parameter", function () {
    const matrix = new Matrix3();
    const cartesian = new Cartesian3();
    expect(function () {
      Matrix3.setColumn(matrix, 3, cartesian);
    }).toThrowDeveloperError();
  });

  it("getRow throws without matrix parameter", function () {
    expect(function () {
      Matrix3.getRow(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("getRow throws with out of range index parameter", function () {
    const matrix = new Matrix3();
    expect(function () {
      Matrix3.getRow(matrix, 3);
    }).toThrowDeveloperError();
  });

  it("setRow throws without matrix parameter", function () {
    const cartesian = new Cartesian3();
    expect(function () {
      Matrix3.setRow(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setRow throws without cartesian parameter", function () {
    const matrix = new Matrix3();
    expect(function () {
      Matrix3.setRow(matrix, 1, undefined);
    }).toThrowDeveloperError();
  });

  it("setRow throws with out of range index parameter", function () {
    const matrix = new Matrix3();
    const cartesian = new Cartesian3();
    expect(function () {
      Matrix3.setRow(matrix, 3, cartesian);
    }).toThrowDeveloperError();
  });

  it("setScale throws without a matrix", function () {
    expect(function () {
      Matrix3.setScale();
    }).toThrowDeveloperError();
  });

  it("setScale throws without a scale", function () {
    expect(function () {
      Matrix3.setScale(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a matrix", function () {
    expect(function () {
      Matrix3.setUniformScale();
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a scale", function () {
    expect(function () {
      Matrix3.setUniformScale(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("getScale throws without a matrix", function () {
    expect(function () {
      Matrix3.getScale();
    }).toThrowDeveloperError();
  });

  it("getMaximumScale throws without a matrix", function () {
    expect(function () {
      Matrix3.getMaximumScale();
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a matrix", function () {
    expect(function () {
      return Matrix3.setRotation();
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a rotation", function () {
    expect(function () {
      return Matrix3.setRotation(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("getRotation throws without a matrix", function () {
    expect(function () {
      return Matrix3.getRotation();
    }).toThrowDeveloperError();
  });

  it("multiply throws with no left parameter", function () {
    const right = new Matrix3();
    expect(function () {
      Matrix3.multiply(undefined, right);
    }).toThrowDeveloperError();
  });

  it("multiply throws with no right parameter", function () {
    const left = new Matrix3();
    expect(function () {
      Matrix3.multiply(left, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws with no matrix parameter", function () {
    expect(function () {
      Matrix3.multiplyByScale(undefined, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws with no scale parameter", function () {
    const m = new Matrix3();
    expect(function () {
      Matrix3.multiplyByScale(m, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws with no matrix parameter", function () {
    expect(function () {
      Matrix3.multiplyByUniformScale(undefined, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws with no scale parameter", function () {
    expect(function () {
      Matrix3.multiplyByUniformScale(new Matrix3(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws with no matrix parameter", function () {
    const cartesian = new Cartesian3();
    expect(function () {
      Matrix3.multiplyByVector(undefined, cartesian);
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws with no cartesian parameter", function () {
    const matrix = new Matrix3();
    expect(function () {
      Matrix3.multiplyByVector(matrix, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no matrix parameter", function () {
    expect(function () {
      Matrix3.multiplyByScalar(undefined, 2);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with non-numeric scalar parameter", function () {
    const matrix = new Matrix3();
    expect(function () {
      Matrix3.multiplyByScalar(matrix, {});
    }).toThrowDeveloperError();
  });

  it("negate throws without matrix parameter", function () {
    expect(function () {
      Matrix3.negate(undefined);
    }).toThrowDeveloperError();
  });

  it("transpose throws without matrix parameter", function () {
    expect(function () {
      Matrix3.transpose(undefined);
    }).toThrowDeveloperError();
  });

  it("abs throws without a matrix", function () {
    expect(function () {
      return Matrix3.abs();
    }).toThrowDeveloperError();
  });

  it("determinant throws without matrix parameter", function () {
    expect(function () {
      Matrix3.determinant(undefined);
    }).toThrowDeveloperError();
  });

  it("inverse throws without matrix parameter", function () {
    expect(function () {
      Matrix3.inverse(undefined);
    }).toThrowDeveloperError();
  });

  it("inverse throws when matrix is not invertible", function () {
    expect(function () {
      Matrix3.inverse(
        new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        new Matrix3()
      );
    }).toThrowDeveloperError();
  });

  it("computeEigenDecomposition throws without a matrix", function () {
    expect(function () {
      return Matrix3.computeEigenDecomposition();
    }).toThrowDeveloperError();
  });

  it("fromQuaternion throws without quaternion parameter", function () {
    expect(function () {
      Matrix3.fromQuaternion(undefined);
    }).toThrowDeveloperError();
  });

  it("fromHeadingPitchRoll throws without quaternion parameter", function () {
    expect(function () {
      Matrix3.fromHeadingPitchRoll(undefined);
    }).toThrowDeveloperError();
  });

  it("fromScale throws without scale parameter", function () {
    expect(function () {
      Matrix3.fromScale(undefined);
    }).toThrowDeveloperError();
  });

  it("fromUniformScale throws without scale parameter", function () {
    expect(function () {
      Matrix3.fromUniformScale(undefined);
    }).toThrowDeveloperError();
  });

  it("getColumn throws without a result parameter", function () {
    expect(function () {
      Matrix3.getColumn(new Matrix3(), 2);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without a result parameter", function () {
    expect(function () {
      Matrix3.setColumn(new Matrix3(), 2, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("getRow throws without a result parameter", function () {
    expect(function () {
      Matrix3.getRow(new Matrix3(), 2);
    }).toThrowDeveloperError();
  });

  it("setRow throws without a result parameter", function () {
    expect(function () {
      Matrix3.setRow(new Matrix3(), 2, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("setScale throws without a result parameter", function () {
    expect(function () {
      Matrix3.setScale(new Matrix3(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a result parameter", function () {
    expect(function () {
      Matrix3.setUniformScale(new Matrix3(), 1.0);
    }).toThrowDeveloperError();
  });

  it("getScale throws without a result parameter", function () {
    expect(function () {
      Matrix3.getScale(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a result parameter", function () {
    expect(function () {
      return Matrix3.setRotation(new Matrix3(), new Matrix3());
    }).toThrowDeveloperError();
  });

  it("getRotation throws without a result parameter", function () {
    expect(function () {
      return Matrix3.getRotation(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("multiply throws without a result parameter", function () {
    expect(function () {
      Matrix3.multiply(new Matrix3(), new Matrix3());
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws without a result parameter", function () {
    expect(function () {
      Matrix3.multiplyByScale(new Matrix3(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws without a result parameter", function () {
    expect(function () {
      Matrix3.multiplyByUniformScale(new Matrix3(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws without a result parameter", function () {
    expect(function () {
      Matrix3.multiplyByVector(new Matrix3(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws without a result parameter", function () {
    expect(function () {
      Matrix3.multiplyByScalar(new Matrix3(), 2);
    }).toThrowDeveloperError();
  });

  it("negate throws without a result parameter", function () {
    expect(function () {
      Matrix3.negate(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("transpose throws without a result parameter", function () {
    expect(function () {
      Matrix3.transpose(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("abs throws without a result parameter", function () {
    expect(function () {
      Matrix3.abs(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("inverse throws without a result parameter", function () {
    expect(function () {
      Matrix3.inverse(new Matrix3());
    }).toThrowDeveloperError();
  });

  it("Matrix3 objects can be used as array like objects", function () {
    const matrix = new Matrix3(1, 4, 7, 2, 5, 8, 3, 6, 9);
    expect(matrix.length).toEqual(9);
    const intArray = new Uint32Array(matrix.length);
    intArray.set(matrix);
    for (let index = 0; index < matrix.length; index++) {
      expect(intArray[index]).toEqual(index + 1);
    }
  });

  // prettier-ignore
  createPackableSpecs(
    Matrix3,
    new Matrix3(
      1, 2, 3,
      4, 5, 6,
      7, 8, 9
    ),
    [1, 4, 7, 2, 5, 8, 3, 6, 9,]
  );

  // prettier-ignore
  createPackableArraySpecs(
    Matrix3,
    [
      new Matrix3(
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
      ),
      new Matrix3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      ),
      new Matrix3(
        1, 2, 3,
        1, 2, 3,
        1, 2, 3
      ),
    ],
    [
      1, 0, 0, 0, 1, 0, 0, 0, 1,
      1, 4, 7, 2, 5, 8, 3, 6, 9,
      1, 1, 1, 2, 2, 2, 3, 3, 3,
    ],
    9
  );
});
