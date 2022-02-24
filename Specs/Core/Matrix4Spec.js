import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { TranslationRotationScale } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";
import createPackableArraySpecs from "../createPackableArraySpecs.js";

describe("Core/Matrix4", function () {
  it("default constructor creates values array with all zeros.", function () {
    const matrix = new Matrix4();
    expect(matrix[Matrix4.COLUMN0ROW0]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN1ROW0]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN2ROW0]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN3ROW0]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN0ROW1]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN1ROW1]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN2ROW1]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN3ROW1]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN0ROW2]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN1ROW2]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN2ROW2]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN3ROW2]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN0ROW3]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN1ROW3]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN2ROW3]).toEqual(0.0);
    expect(matrix[Matrix4.COLUMN3ROW3]).toEqual(0.0);
  });

  it("constructor sets properties from parameters.", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(matrix[Matrix4.COLUMN0ROW0]).toEqual(1.0);
    expect(matrix[Matrix4.COLUMN1ROW0]).toEqual(2.0);
    expect(matrix[Matrix4.COLUMN2ROW0]).toEqual(3.0);
    expect(matrix[Matrix4.COLUMN3ROW0]).toEqual(4.0);
    expect(matrix[Matrix4.COLUMN0ROW1]).toEqual(5.0);
    expect(matrix[Matrix4.COLUMN1ROW1]).toEqual(6.0);
    expect(matrix[Matrix4.COLUMN2ROW1]).toEqual(7.0);
    expect(matrix[Matrix4.COLUMN3ROW1]).toEqual(8.0);
    expect(matrix[Matrix4.COLUMN0ROW2]).toEqual(9.0);
    expect(matrix[Matrix4.COLUMN1ROW2]).toEqual(10.0);
    expect(matrix[Matrix4.COLUMN2ROW2]).toEqual(11.0);
    expect(matrix[Matrix4.COLUMN3ROW2]).toEqual(12.0);
    expect(matrix[Matrix4.COLUMN0ROW3]).toEqual(13.0);
    expect(matrix[Matrix4.COLUMN1ROW3]).toEqual(14.0);
    expect(matrix[Matrix4.COLUMN2ROW3]).toEqual(15.0);
    expect(matrix[Matrix4.COLUMN3ROW3]).toEqual(16.0);
  });

  it("fromArray works without a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const matrix = Matrix4.fromArray([
      1.0,
      5.0,
      9.0,
      13.0,
      2.0,
      6.0,
      10.0,
      14.0,
      3.0,
      7.0,
      11.0,
      15.0,
      4.0,
      8.0,
      12.0,
      16.0,
    ]);
    expect(matrix).toEqual(expected);
  });

  it("fromArray works with a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();
    const matrix = Matrix4.fromArray(
      [
        1.0,
        5.0,
        9.0,
        13.0,
        2.0,
        6.0,
        10.0,
        14.0,
        3.0,
        7.0,
        11.0,
        15.0,
        4.0,
        8.0,
        12.0,
        16.0,
      ],
      0,
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromArray works with a starting index", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();
    const matrix = Matrix4.fromArray(
      [
        0.0,
        0.0,
        0.0,
        1.0,
        5.0,
        9.0,
        13.0,
        2.0,
        6.0,
        10.0,
        14.0,
        3.0,
        7.0,
        11.0,
        15.0,
        4.0,
        8.0,
        12.0,
        16.0,
      ],
      3,
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromRowMajorArray works without a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const matrix = Matrix4.fromRowMajorArray([
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0,
    ]);
    expect(matrix).toEqual(expected);
  });

  it("fromRowMajorArray works with a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();
    const matrix = Matrix4.fromRowMajorArray(
      [
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        10.0,
        11.0,
        12.0,
        13.0,
        14.0,
        15.0,
        16.0,
      ],
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("fromColumnMajorArray works without a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const matrix = Matrix4.fromColumnMajorArray([
      1.0,
      5.0,
      9.0,
      13.0,
      2.0,
      6.0,
      10.0,
      14.0,
      3.0,
      7.0,
      11.0,
      15.0,
      4.0,
      8.0,
      12.0,
      16.0,
    ]);
    expect(matrix).toEqual(expected);
  });

  it("fromColumnMajorArray works with a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();
    const matrix = Matrix4.fromColumnMajorArray(
      [
        1.0,
        5.0,
        9.0,
        13.0,
        2.0,
        6.0,
        10.0,
        14.0,
        3.0,
        7.0,
        11.0,
        15.0,
        4.0,
        8.0,
        12.0,
        16.0,
      ],
      result
    );
    expect(matrix).toBe(result);
    expect(matrix).toEqual(expected);
  });

  it("clone works without a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const returnedResult = expected.clone();
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("clone works with a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();
    const returnedResult = expected.clone(result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromRotationTranslation works without a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      10.0,
      4.0,
      5.0,
      6.0,
      11.0,
      7.0,
      8.0,
      9.0,
      12.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const returnedResult = Matrix4.fromRotationTranslation(
      new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0),
      new Cartesian3(10.0, 11.0, 12.0)
    );
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromRotationTranslation works with a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      10.0,
      4.0,
      5.0,
      6.0,
      11.0,
      7.0,
      8.0,
      9.0,
      12.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.fromRotationTranslation(
      new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0),
      new Cartesian3(10.0, 11.0, 12.0),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromTranslation works without a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      0.0,
      0.0,
      10.0,
      0.0,
      1.0,
      0.0,
      11.0,
      0.0,
      0.0,
      1.0,
      12.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const returnedResult = Matrix4.fromTranslation(
      new Cartesian3(10.0, 11.0, 12.0)
    );
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromTranslationQuaternionRotationScale works without a result parameter", function () {
    const expected = new Matrix4(
      7.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      9.0,
      2.0,
      0.0,
      -8.0,
      0.0,
      3.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const returnedResult = Matrix4.fromTranslationQuaternionRotationScale(
      new Cartesian3(1.0, 2.0, 3.0), // translation
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.toRadians(-90.0)), // rotation
      new Cartesian3(7.0, 8.0, 9.0)
    ); // scale
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("fromTranslationQuaternionRotationScale works with a result parameter", function () {
    const expected = new Matrix4(
      7.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      9.0,
      2.0,
      0.0,
      -8.0,
      0.0,
      3.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.fromTranslationQuaternionRotationScale(
      new Cartesian3(1.0, 2.0, 3.0), // translation
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.toRadians(-90.0)), // rotation
      new Cartesian3(7.0, 8.0, 9.0), // scale
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("fromTranslationRotationScale works without a result parameter", function () {
    const expected = new Matrix4(
      7.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      9.0,
      2.0,
      0.0,
      -8.0,
      0.0,
      3.0,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const trs = new TranslationRotationScale(
      new Cartesian3(1.0, 2.0, 3.0),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.toRadians(-90.0)),
      new Cartesian3(7.0, 8.0, 9.0)
    );

    const returnedResult = Matrix4.fromTranslationRotationScale(trs);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("fromTranslationRotationScale works with a result parameter", function () {
    const expected = new Matrix4(
      7.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      9.0,
      2.0,
      0.0,
      -8.0,
      0.0,
      3.0,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const trs = new TranslationRotationScale(
      new Cartesian3(1.0, 2.0, 3.0),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.toRadians(-90.0)),
      new Cartesian3(7.0, 8.0, 9.0)
    );

    const result = new Matrix4();
    const returnedResult = Matrix4.fromTranslationRotationScale(trs, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON14);
  });

  it("fromTranslation works with a result parameter", function () {
    const expected = new Matrix4(
      1.0,
      0.0,
      0.0,
      10.0,
      0.0,
      1.0,
      0.0,
      11.0,
      0.0,
      0.0,
      1.0,
      12.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.fromTranslation(
      new Cartesian3(10.0, 11.0, 12.0),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromScale works without a result parameter", function () {
    const expected = new Matrix4(
      7.0,
      0.0,
      0.0,
      0.0,
      0.0,
      8.0,
      0.0,
      0.0,
      0.0,
      0.0,
      9.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const returnedResult = Matrix4.fromScale(new Cartesian3(7.0, 8.0, 9.0));
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromScale works with a result parameter", function () {
    const expected = new Matrix4(
      7.0,
      0.0,
      0.0,
      0.0,
      0.0,
      8.0,
      0.0,
      0.0,
      0.0,
      0.0,
      9.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.fromScale(
      new Cartesian3(7.0, 8.0, 9.0),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("fromUniformScale works without a result parameter", function () {
    const expected = new Matrix4(
      2.0,
      0.0,
      0.0,
      0.0,
      0.0,
      2.0,
      0.0,
      0.0,
      0.0,
      0.0,
      2.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const returnedResult = Matrix4.fromUniformScale(2.0);
    expect(returnedResult).toEqual(expected);
  });

  it("fromUniformScale works with a result parameter", function () {
    const expected = new Matrix4(
      2.0,
      0.0,
      0.0,
      0.0,
      0.0,
      2.0,
      0.0,
      0.0,
      0.0,
      0.0,
      2.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.fromUniformScale(2.0, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("fromRotation works without a result parameter", function () {
    const expected = Matrix4.fromColumnMajorArray([
      1.0,
      2.0,
      3.0,
      0.0,
      4.0,
      5.0,
      6.0,
      0.0,
      7.0,
      8.0,
      9.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    ]);
    const returnedResult = Matrix4.fromRotation(
      Matrix3.fromColumnMajorArray([
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
      ])
    );
    expect(returnedResult).toEqual(expected);
  });

  it("fromRotation works with a result parameter", function () {
    const expected = Matrix4.fromColumnMajorArray([
      1.0,
      2.0,
      3.0,
      0.0,
      4.0,
      5.0,
      6.0,
      0.0,
      7.0,
      8.0,
      9.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    ]);

    const result = new Matrix4();
    const returnedResult = Matrix4.fromRotation(
      Matrix3.fromColumnMajorArray([
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
      ]),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("computePerspectiveFieldOfView works", function () {
    const expected = new Matrix4(
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      -1.222222222222222,
      -2.222222222222222,
      0,
      0,
      -1,
      0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.computePerspectiveFieldOfView(
      CesiumMath.PI_OVER_TWO,
      1,
      1,
      10,
      result
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("fromCamera works without a result parameter", function () {
    const expected = Matrix4.IDENTITY;
    const returnedResult = Matrix4.fromCamera({
      position: Cartesian3.ZERO,
      direction: Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      up: Cartesian3.UNIT_Y,
    });
    expect(expected).toEqual(returnedResult);
  });

  it("fromCamera works with a result parameter", function () {
    const expected = Matrix4.IDENTITY;
    const result = new Matrix4();
    const returnedResult = Matrix4.fromCamera(
      {
        position: Cartesian3.ZERO,
        direction: Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
        up: Cartesian3.UNIT_Y,
      },
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("computeOrthographicOffCenter works", function () {
    const expected = new Matrix4(
      2,
      0,
      0,
      -1,
      0,
      2,
      0,
      -5,
      0,
      0,
      -2,
      -1,
      0,
      0,
      0,
      1
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.computeOrthographicOffCenter(
      0,
      1,
      2,
      3,
      0,
      1,
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("computeViewportTransformation works without a result parameter", function () {
    const expected = new Matrix4(
      2.0,
      0.0,
      0.0,
      2.0,
      0.0,
      3.0,
      0.0,
      3.0,
      0.0,
      0.0,
      1.0,
      1.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const returnedResult = Matrix4.computeViewportTransformation(
      {
        x: 0,
        y: 0,
        width: 4.0,
        height: 6.0,
      },
      0.0,
      2.0
    );
    expect(returnedResult).toEqual(expected);
  });

  it("computeViewportTransformation works with a result parameter", function () {
    const expected = new Matrix4(
      2.0,
      0.0,
      0.0,
      2.0,
      0.0,
      3.0,
      0.0,
      3.0,
      0.0,
      0.0,
      1.0,
      1.0,
      0.0,
      0.0,
      0.0,
      1.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.computeViewportTransformation(
      {
        x: 0,
        y: 0,
        width: 4.0,
        height: 6.0,
      },
      0.0,
      2.0,
      result
    );
    expect(returnedResult).toEqual(expected);
    expect(returnedResult).toBe(result);
  });

  it("computePerspectiveOffCenter works", function () {
    const expected = new Matrix4(
      2,
      0,
      3,
      0,
      0,
      2,
      5,
      0,
      0,
      0,
      -3,
      -4,
      0,
      0,
      -1,
      0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.computePerspectiveOffCenter(
      1,
      2,
      2,
      3,
      1,
      2,
      result
    );
    expect(returnedResult).toEqual(expected);
    expect(returnedResult).toBe(result);
  });

  it("computeInfinitePerspectiveOffCenter works", function () {
    const expected = new Matrix4(
      2,
      0,
      3,
      0,
      0,
      2,
      5,
      0,
      0,
      0,
      -1,
      -2,
      0,
      0,
      -1,
      0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.computeInfinitePerspectiveOffCenter(
      1,
      2,
      2,
      3,
      1,
      result
    );
    expect(returnedResult).toEqual(expected);
  });

  it("toArray works without a result parameter", function () {
    const expected = [
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0,
    ];
    const returnedResult = Matrix4.toArray(
      Matrix4.fromColumnMajorArray(expected)
    );
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("toArray works with a result parameter", function () {
    const expected = [
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0,
    ];
    const result = [];
    const returnedResult = Matrix4.toArray(
      Matrix4.fromColumnMajorArray(expected),
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).not.toBe(expected);
    expect(returnedResult).toEqual(expected);
  });

  it("getElementIndex works", function () {
    let i = 0;
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        const index = Matrix4.getElementIndex(col, row);
        expect(index).toEqual(i);
        i++;
      }
    }
  });

  it("getColumn works for each column", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const expectedColumn0 = new Cartesian4(1.0, 5.0, 9.0, 13.0);
    const expectedColumn1 = new Cartesian4(2.0, 6.0, 10.0, 14.0);
    const expectedColumn2 = new Cartesian4(3.0, 7.0, 11.0, 15.0);
    const expectedColumn3 = new Cartesian4(4.0, 8.0, 12.0, 16.0);

    const resultColumn0 = new Cartesian4();
    const resultColumn1 = new Cartesian4();
    const resultColumn2 = new Cartesian4();
    const resultColumn3 = new Cartesian4();
    const returnedResultColumn0 = Matrix4.getColumn(matrix, 0, resultColumn0);
    const returnedResultColumn1 = Matrix4.getColumn(matrix, 1, resultColumn1);
    const returnedResultColumn2 = Matrix4.getColumn(matrix, 2, resultColumn2);
    const returnedResultColumn3 = Matrix4.getColumn(matrix, 3, resultColumn3);

    expect(resultColumn0).toBe(returnedResultColumn0);
    expect(resultColumn0).toEqual(expectedColumn0);
    expect(resultColumn1).toBe(returnedResultColumn1);
    expect(resultColumn1).toEqual(expectedColumn1);
    expect(resultColumn2).toBe(returnedResultColumn2);
    expect(resultColumn2).toEqual(expectedColumn2);
    expect(resultColumn3).toBe(returnedResultColumn3);
    expect(resultColumn3).toEqual(expectedColumn3);
  });

  it("setColumn works for each column", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );

    const result = new Matrix4();

    let expected = new Matrix4(
      17.0,
      2.0,
      3.0,
      4.0,
      18.0,
      6.0,
      7.0,
      8.0,
      19.0,
      10.0,
      11.0,
      12.0,
      20.0,
      14.0,
      15.0,
      16.0
    );
    let returnedResult = Matrix4.setColumn(
      matrix,
      0,
      new Cartesian4(17.0, 18.0, 19.0, 20.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix4(
      1.0,
      17.0,
      3.0,
      4.0,
      5.0,
      18.0,
      7.0,
      8.0,
      9.0,
      19.0,
      11.0,
      12.0,
      13.0,
      20.0,
      15.0,
      16.0
    );
    returnedResult = Matrix4.setColumn(
      matrix,
      1,
      new Cartesian4(17.0, 18.0, 19.0, 20.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix4(
      1.0,
      2.0,
      17.0,
      4.0,
      5.0,
      6.0,
      18.0,
      8.0,
      9.0,
      10.0,
      19.0,
      12.0,
      13.0,
      14.0,
      20.0,
      16.0
    );
    returnedResult = Matrix4.setColumn(
      matrix,
      2,
      new Cartesian4(17.0, 18.0, 19.0, 20.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      17.0,
      5.0,
      6.0,
      7.0,
      18.0,
      9.0,
      10.0,
      11.0,
      19.0,
      13.0,
      14.0,
      15.0,
      20.0
    );
    returnedResult = Matrix4.setColumn(
      matrix,
      3,
      new Cartesian4(17.0, 18.0, 19.0, 20.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("setTranslation works", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const translation = new Cartesian3(-1.0, -2.0, -3.0);
    const result = new Matrix4();

    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      -1.0,
      5.0,
      6.0,
      7.0,
      -2.0,
      9.0,
      10.0,
      11.0,
      -3.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const returnedResult = Matrix4.setTranslation(matrix, translation, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("getRow works for each row", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const expectedRow0 = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const expectedRow1 = new Cartesian4(5.0, 6.0, 7.0, 8.0);
    const expectedRow2 = new Cartesian4(9.0, 10.0, 11.0, 12.0);
    const expectedRow3 = new Cartesian4(13.0, 14.0, 15.0, 16.0);

    const resultRow0 = new Cartesian4();
    const resultRow1 = new Cartesian4();
    const resultRow2 = new Cartesian4();
    const resultRow3 = new Cartesian4();
    const returnedResultRow0 = Matrix4.getRow(matrix, 0, resultRow0);
    const returnedResultRow1 = Matrix4.getRow(matrix, 1, resultRow1);
    const returnedResultRow2 = Matrix4.getRow(matrix, 2, resultRow2);
    const returnedResultRow3 = Matrix4.getRow(matrix, 3, resultRow3);

    expect(resultRow0).toBe(returnedResultRow0);
    expect(resultRow0).toEqual(expectedRow0);
    expect(resultRow1).toBe(returnedResultRow1);
    expect(resultRow1).toEqual(expectedRow1);
    expect(resultRow2).toBe(returnedResultRow2);
    expect(resultRow2).toEqual(expectedRow2);
    expect(resultRow3).toBe(returnedResultRow3);
    expect(resultRow3).toEqual(expectedRow3);
  });

  it("setRow works for each row", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();

    let expected = new Matrix4(
      91.0,
      92.0,
      93.0,
      94.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    let returnedResult = Matrix4.setRow(
      matrix,
      0,
      new Cartesian4(91.0, 92.0, 93.0, 94.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      95.0,
      96.0,
      97.0,
      98.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    returnedResult = Matrix4.setRow(
      matrix,
      1,
      new Cartesian4(95.0, 96.0, 97.0, 98.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      99.0,
      910.0,
      911.0,
      912.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    returnedResult = Matrix4.setRow(
      matrix,
      2,
      new Cartesian4(99.0, 910.0, 911.0, 912.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);

    expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      913.0,
      914.0,
      915.0,
      916.0
    );
    returnedResult = Matrix4.setRow(
      matrix,
      3,
      new Cartesian4(913.0, 914.0, 915.0, 916.0),
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("setScale works", function () {
    const matrix = Matrix4.clone(Matrix4.IDENTITY);
    const result = new Matrix4();
    const newScale = new Cartesian3(2.0, 3.0, 4.0);

    expect(Matrix4.getScale(matrix, new Cartesian3())).toEqual(Cartesian3.ONE);

    const returnedResult = Matrix4.setScale(matrix, newScale, result);

    expect(Matrix4.getScale(returnedResult, new Cartesian3())).toEqual(
      newScale
    );
    expect(result).toBe(returnedResult);
  });

  it("setUniformScale works", function () {
    const oldScale = new Cartesian3(2.0, 3.0, 4.0);
    const newScale = 5.0;

    const matrix = Matrix4.fromScale(oldScale, new Matrix4());
    const result = new Matrix4();

    expect(Matrix4.getScale(matrix, new Cartesian3())).toEqual(oldScale);

    const returnedResult = Matrix4.setUniformScale(matrix, newScale, result);

    expect(Matrix4.getScale(returnedResult, new Cartesian3())).toEqual(
      new Cartesian3(newScale, newScale, newScale)
    );
    expect(result).toBe(returnedResult);
  });

  it("getScale works", function () {
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const result = new Cartesian3();
    const computedScale = Matrix4.getScale(Matrix4.fromScale(scale), result);

    expect(computedScale).toBe(result);
    expect(computedScale).toEqualEpsilon(scale, CesiumMath.EPSILON14);
  });

  it("getMaximumScale works", function () {
    const m = Matrix4.fromScale(new Cartesian3(2.0, 3.0, 4.0));
    expect(Matrix4.getMaximumScale(m)).toEqualEpsilon(
      4.0,
      CesiumMath.EPSILON14
    );
  });

  it("setRotation works", function () {
    const scaleVec = new Cartesian3(2.0, 3.0, 4.0);
    const scale = Matrix4.fromScale(scaleVec, new Matrix3());
    const rotation = Matrix3.fromRotationX(0.5, new Matrix3());
    const scaleRotation = Matrix4.setRotation(scale, rotation, new Matrix4());

    const extractedScale = Matrix4.getScale(scaleRotation, new Cartesian3());
    const extractedRotation = Matrix4.getRotation(scaleRotation, new Matrix3());

    expect(extractedScale).toEqualEpsilon(scaleVec, CesiumMath.EPSILON14);
    expect(extractedRotation).toEqualEpsilon(rotation, CesiumMath.EPSILON14);
  });

  it("getRotation returns matrix without scale", function () {
    const matrix = Matrix4.fromRotation(
      Matrix3.fromColumnMajorArray([
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
      ])
    );
    const expectedRotation = Matrix3.fromColumnMajorArray([
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
    const rotation = Matrix4.getRotation(matrix, new Matrix3());
    expect(rotation).toEqualEpsilon(expectedRotation, CesiumMath.EPSILON14);
  });

  it("getRotation does not modify rotation matrix", function () {
    const matrix = Matrix4.fromRotation(
      Matrix3.fromColumnMajorArray([
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
      ])
    );
    const duplicateMatrix = Matrix4.clone(matrix, new Matrix4());
    const expectedRotation = Matrix3.fromColumnMajorArray([
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
    const result = Matrix4.getRotation(matrix, new Matrix3());
    expect(result).toEqualEpsilon(expectedRotation, CesiumMath.EPSILON14);
    expect(matrix).toEqual(duplicateMatrix);
    expect(matrix).not.toBe(result);
  });

  it("multiply works", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    );
    const expected = new Matrix4(
      250,
      260,
      270,
      280,
      618,
      644,
      670,
      696,
      986,
      1028,
      1070,
      1112,
      1354,
      1412,
      1470,
      1528
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.multiply(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiply works with a result parameter that is an input result parameter", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    );
    const expected = new Matrix4(
      250,
      260,
      270,
      280,
      618,
      644,
      670,
      696,
      986,
      1028,
      1070,
      1112,
      1354,
      1412,
      1470,
      1528
    );
    const returnedResult = Matrix4.multiply(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("add works", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    );
    const expected = new Matrix4(
      18,
      20,
      22,
      24,
      26,
      28,
      30,
      32,
      34,
      36,
      38,
      40,
      42,
      44,
      46,
      48
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.add(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("add works with a result parameter that is an input result parameter", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    );
    const expected = new Matrix4(
      18,
      20,
      22,
      24,
      26,
      28,
      30,
      32,
      34,
      36,
      38,
      40,
      42,
      44,
      46,
      48
    );
    const returnedResult = Matrix4.add(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("subtract works", function () {
    const left = new Matrix4(
      18,
      20,
      22,
      24,
      26,
      28,
      30,
      32,
      34,
      36,
      38,
      40,
      42,
      44,
      46,
      48
    );
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    );
    const expected = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.subtract(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("subtract works with a result parameter that is an input result parameter", function () {
    const left = new Matrix4(
      18,
      20,
      22,
      24,
      26,
      28,
      30,
      32,
      34,
      36,
      38,
      40,
      42,
      44,
      46,
      48
    );
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32
    );
    const expected = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const returnedResult = Matrix4.subtract(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("multiplyTransformation works", function () {
    const left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      0,
      0,
      0,
      1
    );
    const expected = new Matrix4(
      134,
      140,
      146,
      156,
      386,
      404,
      422,
      448,
      638,
      668,
      698,
      740,
      0,
      0,
      0,
      1
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.multiplyTransformation(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyTransformation works with a result parameter that is an input result parameter", function () {
    const left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
    const right = new Matrix4(
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      0,
      0,
      0,
      1
    );
    const expected = new Matrix4(
      134,
      140,
      146,
      156,
      386,
      404,
      422,
      448,
      638,
      668,
      698,
      740,
      0,
      0,
      0,
      1
    );
    const returnedResult = Matrix4.multiplyTransformation(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("multiplyByMatrix3 works", function () {
    const left = Matrix4.fromRotationTranslation(
      Matrix3.fromRotationZ(CesiumMath.toRadians(45.0)),
      new Cartesian3(1.0, 2.0, 3.0)
    );
    const rightRotation = Matrix3.fromRotationX(CesiumMath.toRadians(30.0));
    const right = Matrix4.fromRotationTranslation(rightRotation);
    const expected = new Matrix4.multiplyTransformation(
      left,
      right,
      new Matrix4()
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.multiplyByMatrix3(
      left,
      rightRotation,
      result
    );
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByMatrix3 works with a result parameter that is an input result parameter", function () {
    const left = Matrix4.fromRotationTranslation(
      Matrix3.fromRotationZ(CesiumMath.toRadians(45.0)),
      new Cartesian3(1.0, 2.0, 3.0)
    );
    const rightRotation = Matrix3.fromRotationX(CesiumMath.toRadians(30.0));
    const right = Matrix4.fromRotationTranslation(rightRotation);
    const expected = new Matrix4.multiplyTransformation(
      left,
      right,
      new Matrix4()
    );
    const returnedResult = Matrix4.multiplyByMatrix3(left, rightRotation, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expected);
  });

  it("multiplyByTranslation works", function () {
    const m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
    const translation = new Cartesian3(17, 18, 19);
    const expected = Matrix4.multiply(
      m,
      Matrix4.fromTranslation(translation),
      new Matrix4()
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.multiplyByTranslation(
      m,
      translation,
      result
    );
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByTranslation works with a result parameter that is an input result parameter", function () {
    const m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
    const translation = new Cartesian3(17, 18, 19);
    const expected = Matrix4.multiply(
      m,
      Matrix4.fromTranslation(translation),
      new Matrix4()
    );
    const returnedResult = Matrix4.multiplyByTranslation(m, translation, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByUniformScale works", function () {
    const m = Matrix4.fromColumnMajorArray([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
    ]);
    const scale = 2.0;
    const expected = Matrix4.fromColumnMajorArray([
      2 * scale,
      3 * scale,
      4 * scale,
      5,
      6 * scale,
      7 * scale,
      8 * scale,
      9,
      10 * scale,
      11 * scale,
      12 * scale,
      13,
      14,
      15,
      16,
      17,
    ]);
    const result = new Matrix4();
    const returnedResult = Matrix4.multiplyByUniformScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByUniformScale works with a result parameter that is an input result parameter", function () {
    const m = Matrix4.fromColumnMajorArray([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
    ]);
    const scale = 2.0;
    const expected = Matrix4.fromColumnMajorArray([
      2 * scale,
      3 * scale,
      4 * scale,
      5,
      6 * scale,
      7 * scale,
      8 * scale,
      9,
      10 * scale,
      11 * scale,
      12 * scale,
      13,
      14,
      15,
      16,
      17,
    ]);
    const returnedResult = Matrix4.multiplyByUniformScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByScale works", function () {
    let m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
    let scale = new Cartesian3(1.0, 1.0, 1.0);
    let expected = Matrix4.multiply(m, Matrix4.fromScale(scale), new Matrix4());
    let result = new Matrix4();
    let returnedResult = Matrix4.multiplyByScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);

    m = new Matrix4(2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 0, 0, 1);
    scale = new Cartesian3(2.0, 3.0, 4.0);
    expected = Matrix4.multiply(m, Matrix4.fromScale(scale), new Matrix4());
    result = new Matrix4();
    returnedResult = Matrix4.multiplyByScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it('multiplyByScale works with "this" result parameter', function () {
    const m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
    const scale = new Cartesian3(1.0, 2.0, 3.0);
    const expected = Matrix4.multiply(
      m,
      Matrix4.fromScale(scale),
      new Matrix4()
    );
    const returnedResult = Matrix4.multiplyByScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByUniformScale works", function () {
    const m = Matrix4.fromColumnMajorArray([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
    ]);
    const scale = 2.0;
    const expected = Matrix4.fromColumnMajorArray([
      2 * scale,
      3 * scale,
      4 * scale,
      5,
      6 * scale,
      7 * scale,
      8 * scale,
      9,
      10 * scale,
      11 * scale,
      12 * scale,
      13,
      14,
      15,
      16,
      17,
    ]);

    const result = new Matrix4();
    const returnedResult = Matrix4.multiplyByUniformScale(m, scale, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it('multiplyByUniformScale works with "this" result parameter', function () {
    const m = Matrix4.fromColumnMajorArray([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
    ]);
    const scale = 2.0;
    const expected = Matrix4.fromColumnMajorArray([
      2 * scale,
      3 * scale,
      4 * scale,
      5,
      6 * scale,
      7 * scale,
      8 * scale,
      9,
      10 * scale,
      11 * scale,
      12 * scale,
      13,
      14,
      15,
      16,
      17,
    ]);

    const returnedResult = Matrix4.multiplyByUniformScale(m, scale, m);
    expect(returnedResult).toBe(m);
    expect(m).toEqual(expected);
  });

  it("multiplyByVector works", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Cartesian4(17, 18, 19, 20);
    const expected = new Cartesian4(190, 486, 782, 1078);
    const result = new Cartesian4();
    const returnedResult = Matrix4.multiplyByVector(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByPoint works", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Cartesian3(17, 18, 19);
    const expected = new Cartesian3(114, 334, 554);
    const result = new Cartesian3();
    const returnedResult = Matrix4.multiplyByPoint(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByPointAsVector works", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = new Cartesian3(17, 18, 19);
    const expected = new Cartesian3(110, 326, 542);
    const result = new Cartesian3();
    const returnedResult = Matrix4.multiplyByPointAsVector(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("multiplyByScalar works", function () {
    const left = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const right = 2;
    const expected = new Matrix4(
      2,
      4,
      6,
      8,
      10,
      12,
      14,
      16,
      18,
      20,
      22,
      24,
      26,
      28,
      30,
      32
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.multiplyByScalar(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expected);
  });

  it("negate works", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const expected = new Matrix4(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0,
      -10.0,
      -11.0,
      -12.0,
      -13.0,
      -14.0,
      -15.0,
      -16.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.negate(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("negate works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const expected = new Matrix4(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0,
      -10.0,
      -11.0,
      -12.0,
      -13.0,
      -14.0,
      -15.0,
      -16.0
    );
    const returnedResult = Matrix4.negate(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("transpose works", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const expected = new Matrix4(
      1.0,
      5.0,
      9.0,
      13.0,
      2.0,
      6.0,
      10.0,
      14.0,
      3.0,
      7.0,
      11.0,
      15.0,
      4.0,
      8.0,
      12.0,
      16.0
    );
    const result = new Matrix4();
    const returnedResult = Matrix4.transpose(matrix, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expected);
  });

  it("inverseTranspose works", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      6.0,
      4.0,
      8.0,
      6.0,
      -7.0,
      8.0,
      9.0,
      -20.0,
      -11.0,
      12.0,
      13.0,
      -27.0,
      15.0,
      16.0
    );
    const expectedInverse = Matrix4.inverse(matrix, new Matrix4());
    const expectedInverseTranspose = Matrix4.transpose(
      expectedInverse,
      new Matrix4()
    );
    const result = Matrix4.inverseTranspose(matrix, new Matrix4());
    expect(result).toEqual(expectedInverseTranspose);
  });

  it("transpose works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const expected = new Matrix4(
      1.0,
      5.0,
      9.0,
      13.0,
      2.0,
      6.0,
      10.0,
      14.0,
      3.0,
      7.0,
      11.0,
      15.0,
      4.0,
      8.0,
      12.0,
      16.0
    );
    const returnedResult = Matrix4.transpose(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("equals works in all cases", function () {
    let left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    let right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equals(left, right)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
    expect(Matrix4.equals(left, right)).toEqual(false);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
    expect(Matrix4.equals(left, right)).toEqual(false);
  });

  it("equals works with undefined", function () {
    expect(Matrix4.equals(undefined, undefined)).toEqual(true);
    expect(Matrix4.equals(new Matrix4(), undefined)).toEqual(false);
    expect(Matrix4.equals(undefined, new Matrix4())).toEqual(false);
  });

  it("equalsEpsilon works in all cases", function () {
    let left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    let right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 1.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      5.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      6.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      7.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      8.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      9.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      10.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      11.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      12.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      13.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      14.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      15.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      16.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      17.0,
      14.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      18.0,
      15.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      19.0,
      16.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

    left = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    right = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      20.0
    );
    expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
    expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);
  });

  it("equalsEpsilon works with undefined", function () {
    expect(Matrix4.equalsEpsilon(undefined, undefined, 1.0)).toEqual(true);
    expect(Matrix4.equalsEpsilon(new Matrix4(), undefined, 1.0)).toEqual(false);
    expect(Matrix4.equalsEpsilon(undefined, new Matrix4(), 1.0)).toEqual(false);
  });

  it("toString", function () {
    const matrix = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    expect(matrix.toString()).toEqual(
      "(1, 2, 3, 4)\n(5, 6, 7, 8)\n(9, 10, 11, 12)\n(13, 14, 15, 16)"
    );
  });

  it("getTranslation works", function () {
    const matrix = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const expected = new Cartesian3(4, 8, 12);
    const result = new Cartesian3();
    const returnedResult = Matrix4.getTranslation(matrix, result);
    expect(returnedResult).toBe(result);
    expect(expected).toEqual(returnedResult);
  });

  it("getMatrix3 works", function () {
    const matrix = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    const expected = new Matrix3(1, 2, 3, 5, 6, 7, 9, 10, 11);
    const result = new Matrix3();
    const returnedResult = Matrix4.getMatrix3(matrix, result);
    expect(returnedResult).toBe(result);
    expect(expected).toEqual(returnedResult);
  });

  it("inverse works", function () {
    const matrix = new Matrix4(
      0.72,
      0.7,
      0.0,
      0.0,
      -0.4,
      0.41,
      0.82,
      0.0,
      0.57,
      -0.59,
      0.57,
      -3.86,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const expected = new Matrix4(
      0.7150830193944467,
      -0.3976559229803265,
      0.5720664155155574,
      2.2081763638900513,
      0.6930574657657118,
      0.40901752077976433,
      -0.5884111702445733,
      -2.271267117144053,
      0.0022922521876059163,
      0.8210249357172755,
      0.5732623731786561,
      2.2127927604696125,
      0.0,
      0.0,
      0.0,
      1.0
    );

    const result = new Matrix4();
    const returnedResult = Matrix4.inverse(matrix, result);
    expect(returnedResult).toBe(result);
    expect(expected).toEqualEpsilon(returnedResult, CesiumMath.EPSILON20);
    expect(
      Matrix4.multiply(returnedResult, matrix, new Matrix4())
    ).toEqualEpsilon(Matrix4.IDENTITY, CesiumMath.EPSILON15);
  });

  it("inverse translates zero scale matrix", function () {
    let matrix = Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
    matrix = Matrix4.multiplyByUniformScale(matrix, 0.0, matrix);
    let expected = Matrix4.fromTranslation(new Cartesian3(-1.0, -2.0, -3.0));
    expected = Matrix4.multiplyByUniformScale(expected, 0.0, expected);

    const result = Matrix4.inverse(matrix, new Matrix4());
    expect(expected).toEqualEpsilon(result, CesiumMath.EPSILON20);
  });

  it("inverse behaves acceptably with near single precision zero scale matrix", function () {
    const trs = new TranslationRotationScale(
      new Cartesian3(0.0, 0.0, 0.0),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0),
      new Cartesian3(1.0e-7, 1.0e-7, 1.1e-7)
    );

    const matrix = Matrix4.fromTranslationRotationScale(trs);

    const expected = new Matrix4(
      1e7,
      0,
      0,
      0,
      0,
      1e7,
      0,
      0,
      0,
      0,
      (1.0 / 1.1) * 1e7,
      0,
      0,
      0,
      0,
      1
    );

    const result = Matrix4.inverse(matrix, new Matrix4());
    expect(expected).toEqualEpsilon(result, CesiumMath.EPSILON15);
  });

  it("inverse behaves acceptably with single precision zero scale matrix", function () {
    const trs = new TranslationRotationScale(
      new Cartesian3(0.0, 0.0, 0.0),
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0),
      new Cartesian3(1.8e-8, 1.2e-8, 1.2e-8)
    );

    const matrix = Matrix4.fromTranslationRotationScale(trs);

    const expected = new Matrix4(
      0,
      0,
      0,
      -matrix[12],
      0,
      0,
      0,
      -matrix[13],
      0,
      0,
      0,
      -matrix[14],
      0,
      0,
      0,
      1
    );

    const result = Matrix4.inverse(matrix, new Matrix4());
    expect(expected).toEqualEpsilon(result, CesiumMath.EPSILON20);
  });

  it("inverseTransformation works", function () {
    const matrix = new Matrix4(
      1,
      0,
      0,
      10,
      0,
      0,
      1,
      20,
      0,
      1,
      0,
      30,
      0,
      0,
      0,
      1
    );

    const expected = new Matrix4(
      1,
      0,
      0,
      -10,
      0,
      0,
      1,
      -30,
      0,
      1,
      0,
      -20,
      0,
      0,
      0,
      1
    );

    const result = new Matrix4();
    const returnedResult = Matrix4.inverseTransformation(matrix, result);
    expect(returnedResult).toBe(result);
    expect(expected).toEqual(returnedResult);
    expect(Matrix4.multiply(returnedResult, matrix, new Matrix4())).toEqual(
      Matrix4.IDENTITY
    );
  });

  it("abs throws without a matrix", function () {
    expect(function () {
      return Matrix4.abs();
    }).toThrowDeveloperError();
  });

  it("abs works", function () {
    let matrix = new Matrix4(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0,
      -10.0,
      -11.0,
      -12.0,
      -13.0,
      -14.0,
      -15.0,
      -16.0
    );
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const result = new Matrix4();
    let returnedResult = Matrix4.abs(matrix, result);
    expect(returnedResult).toEqual(expected);

    matrix = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    returnedResult = Matrix4.abs(matrix, result);
    expect(returnedResult).toEqual(expected);

    matrix = new Matrix4(
      1.0,
      -2.0,
      -3.0,
      4.0,
      5.0,
      -6.0,
      7.0,
      -8.0,
      9.0,
      -10.0,
      11.0,
      -12.0,
      13.0,
      -14.0,
      15.0,
      -16.0
    );
    returnedResult = Matrix4.abs(matrix, result);
    expect(returnedResult).toEqual(expected);
  });

  it("abs works with a result parameter that is an input result parameter", function () {
    const matrix = new Matrix4(
      -1.0,
      -2.0,
      -3.0,
      -4.0,
      -5.0,
      -6.0,
      -7.0,
      -8.0,
      -9.0,
      -10.0,
      -11.0,
      -12.0,
      -13.0,
      -14.0,
      -15.0,
      -16.0
    );
    const expected = new Matrix4(
      1.0,
      2.0,
      3.0,
      4.0,
      5.0,
      6.0,
      7.0,
      8.0,
      9.0,
      10.0,
      11.0,
      12.0,
      13.0,
      14.0,
      15.0,
      16.0
    );
    const returnedResult = Matrix4.abs(matrix, matrix);
    expect(matrix).toBe(returnedResult);
    expect(matrix).toEqual(expected);
  });

  it("fromArray throws without an array", function () {
    expect(function () {
      return Matrix4.fromArray();
    }).toThrowDeveloperError();
  });

  it("fromRowMajorArray throws with undefined parameter", function () {
    expect(function () {
      Matrix4.fromRowMajorArray(undefined);
    }).toThrowDeveloperError();
  });

  it("fromColumnMajorArray throws with undefined parameter", function () {
    expect(function () {
      Matrix4.fromColumnMajorArray(undefined);
    }).toThrowDeveloperError();
  });

  it("fromRotationTranslation throws without rotation parameter", function () {
    expect(function () {
      Matrix4.fromRotationTranslation(undefined, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("fromTranslationQuaternionRotationScale throws without translation parameter", function () {
    expect(function () {
      Matrix4.fromTranslationQuaternionRotationScale(
        undefined,
        new Quaternion(),
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("fromTranslationQuaternionRotationScale throws without rotation parameter", function () {
    expect(function () {
      Matrix4.fromTranslationQuaternionRotationScale(
        new Matrix3(),
        undefined,
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("fromTranslationQuaternionRotationScale throws without scale parameter", function () {
    expect(function () {
      Matrix4.fromTranslationQuaternionRotationScale(
        new Matrix3(),
        new Quaternion(),
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("fromTranslation throws without translation parameter", function () {
    expect(function () {
      Matrix4.fromTranslation(undefined);
    }).toThrowDeveloperError();
  });

  it("fromScale throws without scale parameter", function () {
    expect(function () {
      Matrix4.fromScale(undefined);
    }).toThrowDeveloperError();
  });

  it("fromUniformScale throws without scale parameter", function () {
    expect(function () {
      Matrix4.fromUniformScale(undefined);
    }).toThrowDeveloperError();
  });

  it("fromRotation throws without rotation parameter", function () {
    expect(function () {
      Matrix4.fromRotation(undefined);
    }).toThrowDeveloperError();
  });

  it("fromCamera throws without camera", function () {
    expect(function () {
      Matrix4.fromCamera(undefined);
    }).toThrowDeveloperError();
  });

  it("fromCamera throws without position", function () {
    expect(function () {
      Matrix4.fromCamera({
        direction: Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
        up: Cartesian3.UNIT_Y,
      });
    }).toThrowDeveloperError();
  });

  it("fromCamera throws without direction", function () {
    expect(function () {
      Matrix4.fromCamera({
        position: Cartesian3.ZERO,
        up: Cartesian3.UNIT_Y,
      });
    }).toThrowDeveloperError();
  });

  it("fromCamera throws without up", function () {
    expect(function () {
      Matrix4.fromCamera({
        position: Cartesian3.ZERO,
        direction: Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      });
    }).toThrowDeveloperError();
  });

  it("computePerspectiveFieldOfView throws with out of range y field of view", function () {
    expect(function () {
      Matrix4.computePerspectiveFieldOfView(0, 1, 2, 3);
    }).toThrowDeveloperError();
  });

  it("computePerspectiveFieldOfView throws with out of range aspect", function () {
    expect(function () {
      Matrix4.computePerspectiveFieldOfView(1, 0, 2, 3);
    }).toThrowDeveloperError();
  });

  it("computePerspectiveFieldOfView throws with out of range near", function () {
    expect(function () {
      Matrix4.computePerspectiveFieldOfView(1, 1, 0, 3);
    }).toThrowDeveloperError();
  });

  it("computePerspectiveFieldOfView throws with out of range far", function () {
    expect(function () {
      Matrix4.computePerspectiveFieldOfView(1, 1, 2, 0);
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without left", function () {
    expect(function () {
      const right = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeOrthographicOffCenter(
        undefined,
        right,
        bottom,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without right", function () {
    expect(function () {
      const left = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeOrthographicOffCenter(
        left,
        undefined,
        bottom,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without bottom", function () {
    expect(function () {
      const left = 0,
        right = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeOrthographicOffCenter(
        left,
        right,
        undefined,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without top", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        near = 0,
        far = 0;
      Matrix4.computeOrthographicOffCenter(
        left,
        right,
        bottom,
        undefined,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without near", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        far = 0;
      Matrix4.computeOrthographicOffCenter(
        left,
        right,
        bottom,
        top,
        undefined,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without far", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        near = 0;
      Matrix4.computeOrthographicOffCenter(
        left,
        right,
        bottom,
        top,
        near,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without left", function () {
    expect(function () {
      const right = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computePerspectiveOffCenter(
        undefined,
        right,
        bottom,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without right", function () {
    expect(function () {
      const left = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computePerspectiveOffCenter(
        left,
        undefined,
        bottom,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without bottom", function () {
    expect(function () {
      const left = 0,
        right = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computePerspectiveOffCenter(
        left,
        right,
        undefined,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without top", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        near = 0,
        far = 0;
      Matrix4.computePerspectiveOffCenter(
        left,
        right,
        bottom,
        undefined,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without near", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        far = 0;
      Matrix4.computePerspectiveOffCenter(
        left,
        right,
        bottom,
        top,
        undefined,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without far", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        near = 0;
      Matrix4.computePerspectiveOffCenter(
        left,
        right,
        bottom,
        top,
        near,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("computeInfinitePerspectiveOffCenter throws without left", function () {
    expect(function () {
      const right = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeInfinitePerspectiveOffCenter(
        undefined,
        right,
        bottom,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeInfinitePerspectiveOffCenter throws without right", function () {
    expect(function () {
      const left = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeInfinitePerspectiveOffCenter(
        left,
        undefined,
        bottom,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeInfinitePerspectiveOffCenter throws without bottom", function () {
    expect(function () {
      const left = 0,
        right = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeInfinitePerspectiveOffCenter(
        left,
        right,
        undefined,
        top,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeInfinitePerspectiveOffCenter throws without top", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        near = 0,
        far = 0;
      Matrix4.computeInfinitePerspectiveOffCenter(
        left,
        right,
        bottom,
        undefined,
        near,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeInfinitePerspectiveOffCenter throws without near", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        far = 0;
      Matrix4.computeInfinitePerspectiveOffCenter(
        left,
        right,
        bottom,
        top,
        undefined,
        far
      );
    }).toThrowDeveloperError();
  });

  it("computeView throws without position", function () {
    expect(function () {
      const direction = Cartesian3.UNIT_Z;
      const up = Cartesian3.UNIT_Y;
      const right = Cartesian3.UNIT_X;
      Matrix4.computeView(undefined, direction, up, right, new Matrix4());
    }).toThrowDeveloperError();
  });

  it("computeView throws without direction", function () {
    expect(function () {
      const position = Cartesian3.ZERO;
      const up = Cartesian3.UNIT_Y;
      const right = Cartesian3.UNIT_X;
      Matrix4.computeView(position, undefined, up, right, new Matrix4());
    }).toThrowDeveloperError();
  });

  it("computeView throws without up", function () {
    expect(function () {
      const position = Cartesian3.ZERO;
      const direction = Cartesian3.UNIT_Z;
      const right = Cartesian3.UNIT_X;
      Matrix4.computeView(position, direction, undefined, right, new Matrix4());
    }).toThrowDeveloperError();
  });

  it("computeView throws without right", function () {
    expect(function () {
      const position = Cartesian3.ZERO;
      const direction = Cartesian3.UNIT_Z;
      const up = Cartesian3.UNIT_Y;
      Matrix4.computeView(position, direction, up, undefined, new Matrix4());
    }).toThrowDeveloperError();
  });

  it("clone returns undefined without matrix parameter", function () {
    expect(Matrix4.clone(undefined)).toBeUndefined();
  });

  it("toArray throws without matrix parameter", function () {
    expect(function () {
      Matrix4.toArray(undefined);
    }).toThrowDeveloperError();
  });

  it("getElement throws without row parameter", function () {
    let row;
    const col = 0.0;
    expect(function () {
      Matrix4.getElementIndex(col, row);
    }).toThrowDeveloperError();
  });

  it("getElement throws without column parameter", function () {
    const row = 0.0;
    let col;
    expect(function () {
      Matrix4.getElementIndex(col, row);
    }).toThrowDeveloperError();
  });

  it("getColumn throws without matrix parameter", function () {
    expect(function () {
      Matrix4.getColumn(undefined, 1);
    }).toThrowDeveloperError();
  });

  it("getColumn throws with out of range index parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.getColumn(matrix, 4);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without matrix parameter", function () {
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.setColumn(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without cartesian parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.setColumn(matrix, 1, undefined);
    }).toThrowDeveloperError();
  });

  it("setColumn throws with out of range index parameter", function () {
    const matrix = new Matrix4();
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.setColumn(matrix, 4, cartesian);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without matrix parameter", function () {
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.setColumn(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setTranslation throws without matrix parameter", function () {
    expect(function () {
      Matrix4.setTranslation(undefined, new Cartesian3(), new Matrix4());
    }).toThrowDeveloperError();
  });

  it("setTranslation throws without translation parameter", function () {
    expect(function () {
      Matrix4.setTranslation(new Matrix4(), undefined, new Matrix4());
    }).toThrowDeveloperError();
  });

  it("setTranslation throws without a result parameter", function () {
    expect(function () {
      Matrix4.setTranslation(new Matrix4(), new Cartesian3(), undefined);
    }).toThrowDeveloperError();
  });

  it("getRow throws with out of range index parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.getRow(matrix, 4);
    }).toThrowDeveloperError();
  });

  it("setRow throws without matrix parameter", function () {
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.setRow(undefined, 2, cartesian);
    }).toThrowDeveloperError();
  });

  it("setRow throws without cartesian parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.setRow(matrix, 1, undefined);
    }).toThrowDeveloperError();
  });

  it("setRow throws with out of range index parameter", function () {
    const matrix = new Matrix4();
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.setRow(matrix, 4, cartesian);
    }).toThrowDeveloperError();
  });

  it("setScale throws without a matrix", function () {
    expect(function () {
      Matrix4.setScale();
    }).toThrowDeveloperError();
  });

  it("setScale throws without a scale", function () {
    expect(function () {
      Matrix4.setScale(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a matrix", function () {
    expect(function () {
      Matrix4.setUniformScale();
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a scale", function () {
    expect(function () {
      Matrix4.setUniformScale(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("getScale throws without a matrix", function () {
    expect(function () {
      Matrix4.getScale();
    }).toThrowDeveloperError();
  });

  it("getMaximumScale throws without a matrix", function () {
    expect(function () {
      Matrix4.getMaximumScale();
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a matrix", function () {
    expect(function () {
      return Matrix4.setRotation();
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a rotation", function () {
    expect(function () {
      return Matrix4.setRotation(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("getRotation throws without a matrix", function () {
    expect(function () {
      return Matrix4.getRotation();
    }).toThrowDeveloperError();
  });

  it("multiply throws with no left parameter", function () {
    const right = new Matrix4();
    expect(function () {
      Matrix4.multiply(undefined, right);
    }).toThrowDeveloperError();
  });

  it("multiply throws with no right parameter", function () {
    const left = new Matrix4();
    expect(function () {
      Matrix4.multiply(left, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByTranslation throws with no matrix parameter", function () {
    const translation = new Cartesian3();
    expect(function () {
      Matrix4.multiplyByTranslation(undefined, translation);
    }).toThrowDeveloperError();
  });

  it("multiplyByTranslation throws with no translation parameter", function () {
    const m = new Matrix4();
    expect(function () {
      Matrix4.multiplyByTranslation(m, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws with no matrix parameter", function () {
    expect(function () {
      Matrix4.multiplyByScale();
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws with no scale parameter", function () {
    expect(function () {
      Matrix4.multiplyByScale(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws with no matrix parameter", function () {
    expect(function () {
      Matrix4.multiplyByUniformScale();
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws with no scale parameter", function () {
    expect(function () {
      Matrix4.multiplyByUniformScale(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws with no matrix parameter", function () {
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.multiplyByVector(undefined, cartesian);
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws with no cartesian parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.multiplyByVector(matrix, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByPoint throws with no matrix parameter", function () {
    const cartesian = new Cartesian4();
    expect(function () {
      Matrix4.multiplyByPoint(undefined, cartesian);
    }).toThrowDeveloperError();
  });

  it("multiplyByPoint throws with no cartesian parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.multiplyByPoint(matrix, undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no matrix parameter", function () {
    expect(function () {
      Matrix4.multiplyByScalar(undefined, 2);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with non-numeric scalar parameter", function () {
    const matrix = new Matrix4();
    expect(function () {
      Matrix4.multiplyByScalar(matrix, {});
    }).toThrowDeveloperError();
  });

  it("negate throws without matrix parameter", function () {
    expect(function () {
      Matrix4.negate(undefined);
    }).toThrowDeveloperError();
  });

  it("transpose throws without matrix parameter", function () {
    expect(function () {
      Matrix4.transpose(undefined);
    }).toThrowDeveloperError();
  });

  it("getTranslation throws without matrix parameter", function () {
    expect(function () {
      Matrix4.getTranslation(undefined);
    }).toThrowDeveloperError();
  });

  it("getMatrix3 throws without matrix parameter", function () {
    expect(function () {
      Matrix4.getMatrix3(undefined);
    }).toThrowDeveloperError();
  });

  it("inverse throws without matrix parameter", function () {
    expect(function () {
      Matrix4.inverse(undefined);
    }).toThrowDeveloperError();
  });

  it("inverse throws with non-inversable matrix", function () {
    const matrix = new Matrix4(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    );
    expect(function () {
      Matrix4.inverse(matrix, new Matrix4());
    }).toThrowRuntimeError();
  });

  it("inverseTransformation throws without matrix parameter", function () {
    expect(function () {
      Matrix4.inverseTransformation(undefined);
    }).toThrowDeveloperError();
  });

  it("getColumn throws without a result parameter", function () {
    expect(function () {
      Matrix4.getColumn(new Matrix4(), 2);
    }).toThrowDeveloperError();
  });

  it("setColumn throws without a result parameter", function () {
    expect(function () {
      Matrix4.setColumn(new Matrix4(), 2, new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("getRow throws without a result parameter", function () {
    expect(function () {
      Matrix4.getRow(new Matrix4(), 2);
    }).toThrowDeveloperError();
  });

  it("setRow throws without a result parameter", function () {
    expect(function () {
      Matrix4.setRow(new Matrix4(), 2, new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("setScale throws without a result parameter", function () {
    expect(function () {
      Matrix4.setScale(new Matrix4(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("setUniformScale throws without a result parameter", function () {
    expect(function () {
      Matrix4.setUniformScale(new Matrix4(), 1.0);
    }).toThrowDeveloperError();
  });

  it("getScale throws without a result parameter", function () {
    expect(function () {
      Matrix4.getScale(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("setRotation throws without a result parameter", function () {
    expect(function () {
      return Matrix4.setRotation(new Matrix4(), new Matrix3());
    }).toThrowDeveloperError();
  });

  it("getRotation throws without a result parameter", function () {
    expect(function () {
      return Matrix4.getRotation(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiply throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiply(new Matrix4(), new Matrix3());
    }).toThrowDeveloperError();
  });

  it("multiplyByVector throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyByVector(new Matrix4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyByScalar(new Matrix4(), 2);
    }).toThrowDeveloperError();
  });

  it("negate throws without a result parameter", function () {
    expect(function () {
      Matrix4.negate(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("transpose throws without a result parameter", function () {
    expect(function () {
      Matrix4.transpose(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("abs throws without a result parameter", function () {
    expect(function () {
      Matrix4.abs(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("inverse throws without a result parameter", function () {
    expect(function () {
      Matrix4.inverse(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyTransformation throws without left parameter", function () {
    expect(function () {
      Matrix4.multiplyTransformation();
    }).toThrowDeveloperError();
  });

  it("multiplyTransformation throws without right parameter", function () {
    expect(function () {
      Matrix4.multiplyTransformation(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyTransformation throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyTransformation(new Matrix4(), new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyByMatrix3 throws without left parameter", function () {
    expect(function () {
      Matrix4.multiplyByMatrix3();
    }).toThrowDeveloperError();
  });

  it("multiplyByMatrix3 throws without matrix parameter", function () {
    expect(function () {
      Matrix4.multiplyByMatrix3(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyByMatrix3 throws without rotation parameter", function () {
    expect(function () {
      Matrix4.multiplyByMatrix3(new Matrix4(), new Matrix3());
    }).toThrowDeveloperError();
  });

  it("multiplyByScale throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyByScale(new Matrix4(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByUniformScale throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyByUniformScale(new Matrix4(), 2);
    }).toThrowDeveloperError();
  });

  it("multiplyByPointAsVector throws without matrix parameter", function () {
    expect(function () {
      Matrix4.multiplyByPointAsVector();
    }).toThrowDeveloperError();
  });

  it("multiplyByPointAsVector throws without cartesian parameter", function () {
    expect(function () {
      Matrix4.multiplyByPointAsVector(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyByPointAsVector throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyByPointAsVector(new Matrix4(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("multiplyByPoint throws without matrix parameter", function () {
    expect(function () {
      Matrix4.multiplyByPoint(new Matrix4(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("getTranslation throws without a result parameter", function () {
    expect(function () {
      Matrix4.getTranslation(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("getMatrix3 throws without a result parameter", function () {
    expect(function () {
      Matrix4.getMatrix3(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("inverseTransformtation throws without a result parameter", function () {
    expect(function () {
      Matrix4.inverseTransformation(new Matrix4());
    }).toThrowDeveloperError();
  });

  it("multiplyByTranslation throws without a result parameter", function () {
    expect(function () {
      Matrix4.multiplyByTranslation(new Matrix4(), new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("computePerspectiveFieldOfView throws without a result parameter", function () {
    expect(function () {
      Matrix4.computePerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 10);
    }).toThrowDeveloperError();
  });

  it("computeOrthographicOffCenter throws without a result parameter", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computeOrthographicOffCenter(left, right, bottom, top, near, far);
    }).toThrowDeveloperError();
  });

  it("computePerspectiveOffCenter throws without a result parameter", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        near = 0,
        far = 0;
      Matrix4.computePerspectiveOffCenter(left, right, bottom, top, near, far);
    }).toThrowDeveloperError();
  });

  it("computeInfinitePerspectiveOffCenter throws without a result parameter", function () {
    expect(function () {
      const left = 0,
        right = 0,
        bottom = 0,
        top = 0,
        near = 0;
      Matrix4.computeInfinitePerspectiveOffCenter(
        left,
        right,
        bottom,
        top,
        near
      );
    }).toThrowDeveloperError();
  });

  it("computeView throws without a result paramter", function () {
    expect(function () {
      const position = Cartesian3.ONE;
      const direction = Cartesian3.UNIT_Z;
      const up = Cartesian3.UNIT_Y;
      const right = Cartesian3.UNIT_X;
      Matrix4.computeView(position, direction, up, right);
    }).toThrowDeveloperError();
  });

  it("Matrix4 objects can be used as array like objects", function () {
    const matrix = new Matrix4(
      1,
      5,
      9,
      13,
      2,
      6,
      10,
      14,
      3,
      7,
      11,
      15,
      4,
      8,
      12,
      16
    );
    expect(matrix.length).toEqual(16);
    const intArray = new Uint32Array(matrix.length);
    intArray.set(matrix);
    for (let index = 0; index < matrix.length; index++) {
      expect(intArray[index]).toEqual(index + 1);
    }
  });

  // prettier-ignore
  createPackableSpecs(
    Matrix4,
    new Matrix4(
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16
    ),
    [1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16]
  );

  // prettier-ignore
  createPackableArraySpecs(
    Matrix4,
    [
      new Matrix4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ),
      new Matrix4(
        1, 2, 3, 4,
        5, 6, 7, 8,
        9, 10, 11, 12,
        13, 14, 15, 16
      ),
      new Matrix4(
        1, 2, 3, 4, 
        1, 2, 3, 4,
        1, 2, 3, 4,
        1, 2, 3, 4
      ),
    ],
    [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16,
      1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4,
    ],
    16
  );
});
