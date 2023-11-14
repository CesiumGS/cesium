import { Cartesian3 } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/Quaternion", function () {
  it("construct with default values", function () {
    const quaternion = new Quaternion();
    expect(quaternion.x).toEqual(0.0);
    expect(quaternion.y).toEqual(0.0);
    expect(quaternion.z).toEqual(0.0);
    expect(quaternion.w).toEqual(0.0);
  });

  it("construct with all values", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    expect(quaternion.x).toEqual(1.0);
    expect(quaternion.y).toEqual(2.0);
    expect(quaternion.z).toEqual(3.0);
    expect(quaternion.w).toEqual(4.0);
  });

  it("fromAxisAngle works without a result parameter", function () {
    const axis = new Cartesian3(0.0, 0.0, 1.0);
    const angle = CesiumMath.PI_OVER_TWO;
    const s = Math.sin(angle / 2.0);
    const c = Math.cos(angle / 2.0);
    const a = Cartesian3.multiplyByScalar(axis, s, new Cartesian3());
    const expected = new Quaternion(a.x, a.y, a.z, c);
    const returnedResult = Quaternion.fromAxisAngle(axis, angle);
    expect(returnedResult).toEqual(expected);
  });

  it("fromAxisAngle works with a result parameter", function () {
    const axis = new Cartesian3(0.0, 0.0, 1.0);
    const angle = CesiumMath.PI_OVER_TWO;
    const s = Math.sin(angle / 2.0);
    const c = Math.cos(angle / 2.0);
    const a = Cartesian3.multiplyByScalar(axis, s, new Cartesian3());
    const result = new Quaternion();
    const expected = new Quaternion(a.x, a.y, a.z, c);
    const returnedResult = Quaternion.fromAxisAngle(axis, angle, result);
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expected);
  });

  it("fromRotationMatrix works when m22 is max", function () {
    const q = Quaternion.fromAxisAngle(
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      Math.PI
    );
    const rotation = new Matrix3(-1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 1.0);
    expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(
      q,
      CesiumMath.EPSILON15
    );
  });

  it("fromRotationMatrix works when m11 is max", function () {
    const q = Quaternion.fromAxisAngle(
      Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()),
      Math.PI
    );
    const rotation = new Matrix3(-1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, -1.0);
    expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(
      q,
      CesiumMath.EPSILON15
    );
  });

  it("fromRotationMatrix works when m00 is max", function () {
    const q = Quaternion.fromAxisAngle(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      Math.PI
    );
    const rotation = new Matrix3(1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, -1.0);
    expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(
      q,
      CesiumMath.EPSILON15
    );
  });

  it("fromRotationMatrix works when trace is greater than zero", function () {
    const rotation = new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
    const q = new Quaternion(0.0, 0.0, 0.0, 1.0);
    expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(
      q,
      CesiumMath.EPSILON15
    );
  });

  it("fromRotationMatrix works with result parameter", function () {
    const rotation = new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
    const q = new Quaternion(0.0, 0.0, 0.0, 1.0);
    const result = new Quaternion();
    const returnedResult = Quaternion.fromRotationMatrix(rotation, result);
    expect(returnedResult).toEqualEpsilon(q, CesiumMath.EPSILON15);
    expect(returnedResult).toBe(result);
  });

  it("fromRotationMatrix using a view matrix", function () {
    const direction = new Cartesian3(
      -0.2349326833984488,
      0.8513513009480378,
      0.46904967396353314
    );
    const up = new Cartesian3(
      0.12477198625717335,
      -0.4521499177166376,
      0.8831717858696695
    );
    const right = new Cartesian3(
      0.9639702203483635,
      0.26601017702986895,
      6.456422901079747e-10
    );
    const matrix = new Matrix3(
      right.x,
      right.y,
      right.z,
      up.x,
      up.y,
      up.z,
      -direction.x,
      -direction.y,
      -direction.z
    );
    const quaternion = Quaternion.fromRotationMatrix(matrix);
    expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(
      matrix,
      CesiumMath.EPSILON12
    );
  });

  it("fromHeadingPitchRoll with just heading", function () {
    const angle = CesiumMath.toRadians(20.0);
    const hpr = new HeadingPitchRoll(angle, 0.0, 0.0);
    const quaternion = Quaternion.fromHeadingPitchRoll(hpr);
    expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(
      Matrix3.fromRotationZ(-angle),
      CesiumMath.EPSILON11
    );
  });

  it("fromHeadingPitchRoll with just pitch", function () {
    const angle = CesiumMath.toRadians(20.0);
    const hpr = new HeadingPitchRoll(0.0, angle, 0.0);
    const quaternion = Quaternion.fromHeadingPitchRoll(hpr);
    expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(
      Matrix3.fromRotationY(-angle),
      CesiumMath.EPSILON11
    );
  });

  it("fromHeadingPitchRoll with just roll", function () {
    const angle = CesiumMath.toRadians(20.0);
    const hpr = new HeadingPitchRoll(0.0, 0.0, angle);
    const quaternion = Quaternion.fromHeadingPitchRoll(hpr);
    expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(
      Matrix3.fromRotationX(angle),
      CesiumMath.EPSILON11
    );
  });

  it("fromHeadingPitchRoll with all angles (1)", function () {
    const angle = CesiumMath.toRadians(20.0);
    const hpr = new HeadingPitchRoll(angle, angle, angle);
    const quaternion = Quaternion.fromHeadingPitchRoll(hpr);
    const expected = Matrix3.fromRotationX(angle);
    Matrix3.multiply(Matrix3.fromRotationY(-angle), expected, expected);
    Matrix3.multiply(Matrix3.fromRotationZ(-angle), expected, expected);
    expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON11
    );
  });

  it("fromHeadingPitchRoll with all angles (2)", function () {
    const heading = CesiumMath.toRadians(180.0);
    const pitch = CesiumMath.toRadians(-45.0);
    const roll = CesiumMath.toRadians(45.0);
    const hpr = new HeadingPitchRoll(heading, pitch, roll);
    const quaternion = Quaternion.fromHeadingPitchRoll(hpr);
    const expected = Matrix3.fromRotationX(roll);
    Matrix3.multiply(Matrix3.fromRotationY(-pitch), expected, expected);
    Matrix3.multiply(Matrix3.fromRotationZ(-heading), expected, expected);
    expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON11
    );
  });

  it("fromHeadingPitchRoll works with result parameter", function () {
    const angle = CesiumMath.toRadians(20.0);
    const hpr = new HeadingPitchRoll(0.0, 0.0, angle);
    const result = new Quaternion();
    const quaternion = Quaternion.fromHeadingPitchRoll(hpr, result);
    const expected = Quaternion.fromRotationMatrix(
      Matrix3.fromRotationX(angle)
    );
    expect(quaternion).toBe(result);
    expect(quaternion).toEqualEpsilon(expected, CesiumMath.EPSILON11);
  });

  it("clone without a result parameter", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const result = quaternion.clone();
    expect(quaternion).not.toBe(result);
    expect(quaternion).toEqual(result);
  });

  it("clone with a result parameter", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const result = new Quaternion();
    const returnedResult = quaternion.clone(result);
    expect(quaternion).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(quaternion).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const returnedResult = quaternion.clone(quaternion);
    expect(quaternion).toBe(returnedResult);
  });

  it("conjugate works", function () {
    const expected = new Quaternion(-1.0, -2.0, -3.0, 4.0);
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const result = new Quaternion();
    const returnedResult = Quaternion.conjugate(quaternion, result);
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqual(expected);
  });

  it("conjugate works with a result parameter that is an input parameter", function () {
    const expected = new Quaternion(-1.0, -2.0, -3.0, 4.0);
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const returnedResult = Quaternion.conjugate(quaternion, quaternion);
    expect(quaternion).toBe(returnedResult);
    expect(quaternion).toEqual(expected);
  });

  it("magnitudeSquared computes correct result", function () {
    const expected = 2 * 2 + 3 * 3 + 4 * 4 + 5 * 5;
    const quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
    const result = Quaternion.magnitudeSquared(quaternion);
    expect(result).toEqual(expected);
  });

  it("norm computes correct result", function () {
    const expected = Math.sqrt(2 * 2 + 3 * 3 + 4 * 4 + 5 * 5);
    const quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
    const result = Quaternion.magnitude(quaternion);
    expect(result).toEqual(expected);
  });

  it("normalize works", function () {
    const quaternion = new Quaternion(2.0, 0.0, 0.0, 0.0);
    const expectedResult = new Quaternion(1.0, 0.0, 0.0, 0.0);
    const result = new Quaternion();
    const returnedResult = Quaternion.normalize(quaternion, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("normalize works with a result parameter that is an input parameter", function () {
    const quaternion = new Quaternion(2.0, 0.0, 0.0, 0.0);
    const expectedResult = new Quaternion(1.0, 0.0, 0.0, 0.0);
    const returnedResult = Quaternion.normalize(quaternion, quaternion);
    expect(quaternion).toBe(returnedResult);
    expect(quaternion).toEqual(expectedResult);
  });

  it("inverse works", function () {
    const quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
    const magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
    const expected = new Quaternion(
      -2.0 / magnitudeSquared,
      -3.0 / magnitudeSquared,
      -4.0 / magnitudeSquared,
      5.0 / magnitudeSquared
    );
    const result = new Quaternion();
    const returnedResult = Quaternion.inverse(quaternion, result);
    expect(returnedResult).toEqual(expected);
    expect(returnedResult).toBe(result);
  });

  it("inverse works with a result parameter that is an input parameter", function () {
    const quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
    const magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
    const expected = new Quaternion(
      -2.0 / magnitudeSquared,
      -3.0 / magnitudeSquared,
      -4.0 / magnitudeSquared,
      5.0 / magnitudeSquared
    );
    const returnedResult = Quaternion.inverse(quaternion, quaternion);
    expect(returnedResult).toEqual(expected);
    expect(returnedResult).toBe(quaternion);
  });

  it("dot", function () {
    const left = new Quaternion(2.0, 3.0, 6.0, 8.0);
    const right = new Quaternion(4.0, 5.0, 7.0, 9.0);
    const expectedResult = 137.0;
    const result = Quaternion.dot(left, right);
    expect(result).toEqual(expectedResult);
  });

  it("multiply works", function () {
    const left = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const right = new Quaternion(8.0, 7.0, 6.0, 5.0);

    const expected = new Quaternion(28.0, 56.0, 30.0, -20.0);
    const result = new Quaternion();
    const returnedResult = Quaternion.multiply(left, right, result);
    expect(returnedResult).toEqual(expected);
    expect(result).toBe(returnedResult);
  });

  it("multiply works with a result parameter that is an input parameter", function () {
    const left = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const right = new Quaternion(8.0, 7.0, 6.0, 5.0);

    const expected = new Quaternion(28.0, 56.0, 30.0, -20.0);
    const returnedResult = Quaternion.multiply(left, right, left);
    expect(returnedResult).toEqual(expected);
    expect(left).toBe(returnedResult);
  });

  it("add works", function () {
    const left = new Quaternion(2.0, 3.0, 6.0, 8.0);
    const right = new Quaternion(4.0, 5.0, 7.0, 9.0);
    const result = new Quaternion();
    const expectedResult = new Quaternion(6.0, 8.0, 13.0, 17.0);
    const returnedResult = Quaternion.add(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("add works with a result parameter that is an input parameter", function () {
    const left = new Quaternion(2.0, 3.0, 6.0, 8.0);
    const right = new Quaternion(4.0, 5.0, 7.0, 9.0);
    const expectedResult = new Quaternion(6.0, 8.0, 13.0, 17.0);
    const returnedResult = Quaternion.add(left, right, left);
    expect(left).toBe(returnedResult);
    expect(left).toEqual(expectedResult);
  });

  it("subtract works", function () {
    const left = new Quaternion(2.0, 3.0, 4.0, 8.0);
    const right = new Quaternion(1.0, 5.0, 7.0, 9.0);
    const result = new Quaternion();
    const expectedResult = new Quaternion(1.0, -2.0, -3.0, -1.0);
    const returnedResult = Quaternion.subtract(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("subtract works with this result parameter", function () {
    const left = new Quaternion(2.0, 3.0, 4.0, 8.0);
    const right = new Quaternion(1.0, 5.0, 7.0, 9.0);
    const expectedResult = new Quaternion(1.0, -2.0, -3.0, -1.0);
    const returnedResult = Quaternion.subtract(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expectedResult);
  });

  it("multiplyByScalar works ", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const result = new Quaternion();
    const scalar = 2;
    const expectedResult = new Quaternion(2.0, 4.0, 6.0, 8.0);
    const returnedResult = Quaternion.multiplyByScalar(
      quaternion,
      scalar,
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("multiplyByScalar works with a result parameter that is an input parameter", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const scalar = 2;
    const expectedResult = new Quaternion(2.0, 4.0, 6.0, 8.0);
    const returnedResult = Quaternion.multiplyByScalar(
      quaternion,
      scalar,
      quaternion
    );
    expect(quaternion).toBe(returnedResult);
    expect(quaternion).toEqual(expectedResult);
  });

  it("divideByScalar works", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const result = new Quaternion();
    const scalar = 2;
    const expectedResult = new Quaternion(0.5, 1.0, 1.5, 2.0);
    const returnedResult = Quaternion.divideByScalar(
      quaternion,
      scalar,
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("divideByScalar works with a result parameter that is an input parameter", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    const scalar = 2;
    const expectedResult = new Quaternion(0.5, 1.0, 1.5, 2.0);
    const returnedResult = Quaternion.divideByScalar(
      quaternion,
      scalar,
      quaternion
    );
    expect(quaternion).toBe(returnedResult);
    expect(quaternion).toEqual(expectedResult);
  });

  it("axis works", function () {
    // 60 degrees is used here to ensure that the sine and cosine of the half angle are not equal.
    const angle = Math.PI / 3.0;
    const cos = Math.cos(angle / 2.0);
    const sin = Math.sin(angle / 2.0);
    const expected = Cartesian3.normalize(
      new Cartesian3(2.0, 3.0, 6.0),
      new Cartesian3()
    );
    const quaternion = new Quaternion(
      sin * expected.x,
      sin * expected.y,
      sin * expected.z,
      cos
    );
    const result = new Cartesian3();
    const returnedResult = Quaternion.computeAxis(quaternion, result);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    expect(result).toBe(returnedResult);
  });

  it("axis returns Cartesian3 0 when w equals 1.0", function () {
    const expected = new Cartesian3(0.0, 0.0, 0.0);
    const quaternion = new Quaternion(4.0, 2.0, 3.0, 1.0);
    const result = new Cartesian3(1, 2, 3);
    const returnedResult = Quaternion.computeAxis(quaternion, result);
    expect(returnedResult).toEqual(expected);
    expect(result).toBe(returnedResult);
  });

  it("angle works", function () {
    // 60 degrees is used here to ensure that the sine and cosine of the half angle are not equal.
    const angle = Math.PI / 3.0;
    const cos = Math.cos(angle / 2.0);
    const sin = Math.sin(angle / 2.0);
    const axis = Cartesian3.normalize(
      new Cartesian3(2.0, 3.0, 6.0),
      new Cartesian3()
    );
    const quaternion = new Quaternion(
      sin * axis.x,
      sin * axis.y,
      sin * axis.z,
      cos
    );
    const result = Quaternion.computeAngle(quaternion);
    expect(result).toEqualEpsilon(angle, CesiumMath.EPSILON15);
  });

  it("negate works", function () {
    const quaternion = new Quaternion(1.0, -2.0, -5.0, 4.0);
    const result = new Quaternion();
    const expectedResult = new Quaternion(-1.0, 2.0, 5.0, -4.0);
    const returnedResult = Quaternion.negate(quaternion, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("negate works with a result parameter that is an input parameter", function () {
    const quaternion = new Quaternion(1.0, -2.0, -5.0);
    const expectedResult = new Quaternion(-1.0, 2.0, 5.0);
    const returnedResult = Quaternion.negate(quaternion, quaternion);
    expect(quaternion).toBe(returnedResult);
    expect(quaternion).toEqual(expectedResult);
  });

  it("lerp works", function () {
    const start = new Quaternion(4.0, 8.0, 10.0, 20.0);
    const end = new Quaternion(8.0, 20.0, 20.0, 30.0);
    const t = 0.25;
    const result = new Quaternion();
    const expectedResult = new Quaternion(5.0, 11.0, 12.5, 22.5);
    const returnedResult = Quaternion.lerp(start, end, t, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("lerp works with a result parameter that is an input parameter", function () {
    const start = new Quaternion(4.0, 8.0, 10.0, 20.0);
    const end = new Quaternion(8.0, 20.0, 20.0, 30.0);
    const t = 0.25;
    const expectedResult = new Quaternion(5.0, 11.0, 12.5, 22.5);
    const returnedResult = Quaternion.lerp(start, end, t, start);
    expect(start).toBe(returnedResult);
    expect(start).toEqual(expectedResult);
  });

  it("lerp extrapolate forward", function () {
    const start = new Quaternion(4.0, 8.0, 10.0, 20.0);
    const end = new Quaternion(8.0, 20.0, 20.0, 30.0);
    const t = 2.0;
    const expectedResult = new Quaternion(12.0, 32.0, 30.0, 40.0);
    const result = Quaternion.lerp(start, end, t, new Quaternion());
    expect(result).toEqual(expectedResult);
  });

  it("lerp extrapolate backward", function () {
    const start = new Quaternion(4.0, 8.0, 10.0, 20.0);
    const end = new Quaternion(8.0, 20.0, 20.0, 30.0);
    const t = -1.0;
    const expectedResult = new Quaternion(0.0, -4.0, 0.0, 10.0);
    const result = Quaternion.lerp(start, end, t, new Quaternion());
    expect(result).toEqual(expectedResult);
  });

  it("slerp works", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, 1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );
    const expected = new Quaternion(
      0.0,
      0.0,
      Math.sin(Math.PI / 8.0),
      Math.cos(Math.PI / 8.0)
    );

    const result = new Quaternion();
    const returnedResult = Quaternion.slerp(start, end, 0.5, result);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    expect(result).toBe(returnedResult);
  });

  it("slerp works with a result parameter that is an input parameter", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, 1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );
    const expected = new Quaternion(
      0.0,
      0.0,
      Math.sin(Math.PI / 8.0),
      Math.cos(Math.PI / 8.0)
    );

    const returnedResult = Quaternion.slerp(start, end, 0.5, start);
    expect(start).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    expect(start).toBe(returnedResult);
  });

  it("slerp works with obtuse angles", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, -1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );
    const expected = new Quaternion(
      0.0,
      0.0,
      -Math.sin(Math.PI / 8.0),
      -Math.cos(Math.PI / 8.0)
    );
    expect(Quaternion.slerp(start, end, 0.5, new Quaternion())).toEqualEpsilon(
      expected,
      CesiumMath.EPSILON15
    );
  });

  it("slerp uses lerp when dot product is close to 1", function () {
    const start = new Quaternion(0.0, 0.0, 0.0, 1.0);
    const end = new Quaternion(1.0, 2.0, 3.0, 1.0);
    const expected = new Quaternion(0.5, 1.0, 1.5, 1.0);
    const result = new Quaternion();
    expect(Quaternion.slerp(start, end, 0.0, result)).toEqual(start);
    expect(Quaternion.slerp(start, end, 1.0, result)).toEqual(end);
    expect(Quaternion.slerp(start, end, 0.5, result)).toEqual(expected);
  });

  it("slerp uses lerp when dot product is close to 1 and a result parameter", function () {
    const start = new Quaternion(0.0, 0.0, 0.0, 1.0);
    const end = new Quaternion(1.0, 2.0, 3.0, 1.0);

    const result = new Quaternion();
    const actual = Quaternion.slerp(start, end, 0.0, result);
    expect(actual).toBe(result);
    expect(result).toEqual(start);
  });

  it("log works", function () {
    const axis = Cartesian3.normalize(
      new Cartesian3(1.0, -1.0, 1.0),
      new Cartesian3()
    );
    const angle = CesiumMath.PI_OVER_FOUR;
    const quat = Quaternion.fromAxisAngle(axis, angle);

    const result = new Cartesian3();
    const log = Quaternion.log(quat, result);
    const expected = Cartesian3.multiplyByScalar(
      axis,
      angle * 0.5,
      new Cartesian3()
    );
    expect(log).toBe(result);
    expect(log).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("exp works", function () {
    const axis = Cartesian3.normalize(
      new Cartesian3(1.0, -1.0, 1.0),
      new Cartesian3()
    );
    const angle = CesiumMath.PI_OVER_FOUR;
    const cartesian = Cartesian3.multiplyByScalar(
      axis,
      angle * 0.5,
      new Cartesian3()
    );

    const result = new Quaternion();
    const exp = Quaternion.exp(cartesian, result);
    const expected = Quaternion.fromAxisAngle(axis, angle);
    expect(exp).toBe(result);
    expect(exp).toEqualEpsilon(expected, CesiumMath.EPSILON15);
  });

  it("squad and computeInnerQuadrangle work", function () {
    const q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
    const q1 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      CesiumMath.PI_OVER_FOUR
    );
    const q2 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    const q3 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      -CesiumMath.PI_OVER_FOUR
    );

    const s1Result = new Quaternion();
    const s1 = Quaternion.computeInnerQuadrangle(q0, q1, q2, s1Result);
    expect(s1).toBe(s1Result);

    const s2 = Quaternion.computeInnerQuadrangle(q1, q2, q3, new Quaternion());

    const squadResult = new Quaternion();
    const squad = Quaternion.squad(q1, q2, s1, s2, 0.0, squadResult);
    expect(squad).toBe(squadResult);
    expect(squad).toEqualEpsilon(q1, CesiumMath.EPSILON15);
  });

  it("fastSlerp works", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, 1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );
    const expected = new Quaternion(
      0.0,
      0.0,
      Math.sin(Math.PI / 8.0),
      Math.cos(Math.PI / 8.0)
    );

    const result = new Quaternion();
    const returnedResult = Quaternion.fastSlerp(start, end, 0.5, result);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    expect(result).toBe(returnedResult);
  });

  it("fastSlerp works with a result parameter that is an input parameter", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, 1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );
    const expected = new Quaternion(
      0.0,
      0.0,
      Math.sin(Math.PI / 8.0),
      Math.cos(Math.PI / 8.0)
    );

    const returnedResult = Quaternion.fastSlerp(start, end, 0.5, start);
    expect(start).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    expect(start).toBe(returnedResult);
  });

  it("fastSlerp works with obtuse angles", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, -1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );
    const expected = new Quaternion(
      0.0,
      0.0,
      -Math.sin(Math.PI / 8.0),
      -Math.cos(Math.PI / 8.0)
    );
    expect(
      Quaternion.fastSlerp(start, end, 0.5, new Quaternion())
    ).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("fastSlerp vs slerp", function () {
    const start = Quaternion.normalize(
      new Quaternion(0.0, 0.0, 0.0, 1.0),
      new Quaternion()
    );
    const end = new Quaternion(
      0.0,
      0.0,
      Math.sin(CesiumMath.PI_OVER_FOUR),
      Math.cos(CesiumMath.PI_OVER_FOUR)
    );

    let expected = Quaternion.slerp(start, end, 0.25, new Quaternion());
    let actual = Quaternion.fastSlerp(start, end, 0.25, new Quaternion());
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

    expected = Quaternion.slerp(start, end, 0.5, new Quaternion());
    actual = Quaternion.fastSlerp(start, end, 0.5, new Quaternion());
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

    expected = Quaternion.slerp(start, end, 0.75, new Quaternion());
    actual = Quaternion.fastSlerp(start, end, 0.75, new Quaternion());
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("fastSquad works", function () {
    const q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
    const q1 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      CesiumMath.PI_OVER_FOUR
    );
    const q2 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    const q3 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      -CesiumMath.PI_OVER_FOUR
    );

    const s1 = Quaternion.computeInnerQuadrangle(q0, q1, q2, new Quaternion());
    const s2 = Quaternion.computeInnerQuadrangle(q1, q2, q3, new Quaternion());

    const squadResult = new Quaternion();
    const squad = Quaternion.fastSquad(q1, q2, s1, s2, 0.0, squadResult);
    expect(squad).toBe(squadResult);
    expect(squad).toEqualEpsilon(q1, CesiumMath.EPSILON6);
  });

  it("fastSquad vs squad", function () {
    const q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
    const q1 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      CesiumMath.PI_OVER_FOUR
    );
    const q2 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_Z,
      CesiumMath.PI_OVER_FOUR
    );
    const q3 = Quaternion.fromAxisAngle(
      Cartesian3.UNIT_X,
      -CesiumMath.PI_OVER_FOUR
    );

    const s1 = Quaternion.computeInnerQuadrangle(q0, q1, q2, new Quaternion());
    const s2 = Quaternion.computeInnerQuadrangle(q1, q2, q3, new Quaternion());

    let actual = Quaternion.fastSquad(q1, q2, s1, s2, 0.25, new Quaternion());
    let expected = Quaternion.squad(q1, q2, s1, s2, 0.25, new Quaternion());
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

    actual = Quaternion.fastSquad(q1, q2, s1, s2, 0.5, new Quaternion());
    expected = Quaternion.squad(q1, q2, s1, s2, 0.5, new Quaternion());
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

    actual = Quaternion.fastSquad(q1, q2, s1, s2, 0.75, new Quaternion());
    expected = Quaternion.squad(q1, q2, s1, s2, 0.75, new Quaternion());
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
  });

  it("equals", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    expect(
      Quaternion.equals(quaternion, new Quaternion(1.0, 2.0, 3.0, 4.0))
    ).toEqual(true);
    expect(
      Quaternion.equals(quaternion, new Quaternion(2.0, 2.0, 3.0, 4.0))
    ).toEqual(false);
    expect(
      Quaternion.equals(quaternion, new Quaternion(2.0, 1.0, 3.0, 4.0))
    ).toEqual(false);
    expect(
      Quaternion.equals(quaternion, new Quaternion(1.0, 2.0, 4.0, 4.0))
    ).toEqual(false);
    expect(
      Quaternion.equals(quaternion, new Quaternion(1.0, 2.0, 3.0, 5.0))
    ).toEqual(false);
    expect(Quaternion.equals(quaternion, undefined)).toEqual(false);
  });

  it("equalsEpsilon", function () {
    const quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 2.0, 3.0, 4.0),
        0.0
      )
    ).toEqual(true);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 2.0, 3.0, 4.0),
        1.0
      )
    ).toEqual(true);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(2.0, 2.0, 3.0, 4.0),
        1.0
      )
    ).toEqual(true);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 3.0, 3.0, 4.0),
        1.0
      )
    ).toEqual(true);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 2.0, 4.0, 4.0),
        1.0
      )
    ).toEqual(true);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 2.0, 3.0, 5.0),
        1.0
      )
    ).toEqual(true);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(2.0, 2.0, 3.0, 4.0),
        0.99999
      )
    ).toEqual(false);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 3.0, 3.0, 4.0),
        0.99999
      )
    ).toEqual(false);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 2.0, 4.0, 4.0),
        0.99999
      )
    ).toEqual(false);
    expect(
      Quaternion.equalsEpsilon(
        quaternion,
        new Quaternion(1.0, 2.0, 3.0, 5.0),
        0.99999
      )
    ).toEqual(false);
    expect(Quaternion.equalsEpsilon(quaternion, undefined, 1)).toEqual(false);
  });

  it("toString", function () {
    const quaternion = new Quaternion(1.123, 2.345, 6.789, 6.123);
    expect(quaternion.toString()).toEqual("(1.123, 2.345, 6.789, 6.123)");
  });

  it("fromAxisAngle throws with undefined axis", function () {
    expect(function () {
      Quaternion.fromAxisAngle(undefined, 1.0);
    }).toThrowDeveloperError();
  });

  it("fromAxisAngle throws with non-numeric angle", function () {
    expect(function () {
      Quaternion.fromAxisAngle(Cartesian3.UNIT_X, {});
    }).toThrowDeveloperError();
  });

  it("fromRotationMatrix throws with undefined matrix", function () {
    expect(function () {
      Quaternion.fromRotationMatrix(undefined);
    }).toThrowDeveloperError();
  });

  it("clone returns undefined with no parameter", function () {
    expect(Quaternion.clone()).toBeUndefined();
  });

  it("conjugate throws with no parameter", function () {
    expect(function () {
      Quaternion.conjugate();
    }).toThrowDeveloperError();
  });

  it("magnitudeSquared throws with no parameter", function () {
    expect(function () {
      Quaternion.magnitudeSquared();
    }).toThrowDeveloperError();
  });

  it("magnitude throws with no parameter", function () {
    expect(function () {
      Quaternion.magnitude();
    }).toThrowDeveloperError();
  });

  it("normalize throws with no parameter", function () {
    expect(function () {
      Quaternion.normalize();
    }).toThrowDeveloperError();
  });

  it("inverse throws with no parameter", function () {
    expect(function () {
      Quaternion.inverse();
    }).toThrowDeveloperError();
  });

  it("dot throws with no left parameter", function () {
    expect(function () {
      Quaternion.dot(undefined, new Quaternion());
    }).toThrowDeveloperError();
  });

  it("dot throws with no right parameter", function () {
    expect(function () {
      Quaternion.dot(new Quaternion(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiply throws with no right parameter", function () {
    expect(function () {
      Quaternion.multiply(new Quaternion(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiply throws with no left parameter", function () {
    expect(function () {
      Quaternion.multiply(undefined, new Quaternion());
    }).toThrowDeveloperError();
  });

  it("add throws with no left parameter", function () {
    expect(function () {
      Quaternion.add(undefined, new Quaternion());
    }).toThrowDeveloperError();
  });

  it("add throws with no right parameter", function () {
    expect(function () {
      Quaternion.add(new Quaternion(), undefined);
    }).toThrowDeveloperError();
  });

  it("subtract throws with no left parameter", function () {
    expect(function () {
      Quaternion.subtract(undefined, new Quaternion());
    }).toThrowDeveloperError();
  });

  it("subtract throws with no right parameter", function () {
    expect(function () {
      Quaternion.subtract(new Quaternion(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no quaternion parameter", function () {
    expect(function () {
      Quaternion.multiplyByScalar(undefined, 2.0);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no scalar parameter", function () {
    expect(function () {
      Quaternion.multiplyByScalar(new Quaternion(), undefined);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no quaternion parameter", function () {
    expect(function () {
      Quaternion.divideByScalar(undefined, 2.0);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no scalar parameter", function () {
    expect(function () {
      Quaternion.divideByScalar(new Quaternion(), undefined);
    }).toThrowDeveloperError();
  });

  it("axis throws with no parameter", function () {
    expect(function () {
      Quaternion.computeAxis(undefined);
    }).toThrowDeveloperError();
  });

  it("angle throws with no parameter", function () {
    expect(function () {
      Quaternion.computeAngle(undefined);
    }).toThrowDeveloperError();
  });

  it("negate throws with no quaternion parameter", function () {
    expect(function () {
      Quaternion.negate(undefined);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no start parameter", function () {
    const end = new Quaternion(8.0, 20.0, 6.0);
    const t = 0.25;
    expect(function () {
      Quaternion.lerp(undefined, end, t);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no end parameter", function () {
    const start = new Quaternion(4.0, 8.0, 6.0);
    const t = 0.25;
    expect(function () {
      Quaternion.lerp(start, undefined, t);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no t parameter", function () {
    const start = new Quaternion(4.0, 8.0, 6.0, 7.0);
    const end = new Quaternion(8.0, 20.0, 6.0, 7.0);
    expect(function () {
      Quaternion.lerp(start, end, undefined);
    }).toThrowDeveloperError();
  });

  it("slerp throws with no start parameter", function () {
    const end = new Quaternion(8.0, 20.0, 6.0);
    const t = 0.25;
    expect(function () {
      Quaternion.slerp(undefined, end, t);
    }).toThrowDeveloperError();
  });

  it("slerp throws with no end parameter", function () {
    const start = new Quaternion(4.0, 8.0, 6.0);
    const t = 0.25;
    expect(function () {
      Quaternion.slerp(start, undefined, t);
    }).toThrowDeveloperError();
  });

  it("slerp throws with no t parameter", function () {
    const start = new Quaternion(4.0, 8.0, 6.0, 7.0);
    const end = new Quaternion(8.0, 20.0, 6.0, 7.0);
    expect(function () {
      Quaternion.slerp(start, end, undefined);
    }).toThrowDeveloperError();
  });

  it("log throws with no quaternion parameter", function () {
    expect(function () {
      Quaternion.log();
    }).toThrowDeveloperError();
  });

  it("exp throws with no cartesian parameter", function () {
    expect(function () {
      Quaternion.exp();
    }).toThrowDeveloperError();
  });

  it("computeInnerQuadrangle throws without q0, q1, or q2 parameter", function () {
    expect(function () {
      Quaternion.computeInnerQuadrangle();
    }).toThrowDeveloperError();
  });

  it("squad throws without q0, q1, s0, or s1 parameter", function () {
    expect(function () {
      Quaternion.squad();
    }).toThrowDeveloperError();
  });

  it("squad throws without t parameter", function () {
    expect(function () {
      Quaternion.squad(
        new Quaternion(),
        new Quaternion(),
        new Quaternion(),
        new Quaternion()
      );
    }).toThrowDeveloperError();
  });

  it("conjugate throws with no result", function () {
    expect(function () {
      Quaternion.conjugate(new Quaternion());
    }).toThrowDeveloperError();
  });

  it("add throws with no result", function () {
    expect(function () {
      Quaternion.add(new Quaternion(), new Quaternion());
    }).toThrowDeveloperError();
  });

  it("subtract throws with no result", function () {
    expect(function () {
      Quaternion.subtract(new Quaternion(), new Quaternion());
    }).toThrowDeveloperError();
  });

  it("negate throws with no result", function () {
    expect(function () {
      Quaternion.negate(new Quaternion());
    }).toThrowDeveloperError();
  });

  it("multiply throws with no result", function () {
    expect(function () {
      Quaternion.multiply(new Quaternion(), new Quaternion());
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no result", function () {
    expect(function () {
      Quaternion.multiplyByScalar(new Quaternion(), 3);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no result", function () {
    expect(function () {
      Quaternion.divideByScalar(new Quaternion(), 3);
    }).toThrowDeveloperError();
  });

  it("axis throws with no result", function () {
    expect(function () {
      Quaternion.computeAxis(new Quaternion());
    }).toThrowDeveloperError();
  });

  it("lerp throws with no result", function () {
    expect(function () {
      Quaternion.lerp(new Quaternion(), new Quaternion(), 2);
    }).toThrowDeveloperError();
  });

  it("slerp throws with no result", function () {
    expect(function () {
      Quaternion.slerp(new Quaternion(), new Quaternion(), 2);
    }).toThrowDeveloperError();
  });

  it("log throws with no result", function () {
    expect(function () {
      Quaternion.log(new Quaternion());
    }).toThrowDeveloperError();
  });

  it("exp throws with no result", function () {
    expect(function () {
      Quaternion.exp(new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("computeInnerQuadrangle throws with no result", function () {
    expect(function () {
      Quaternion.computeInnerQuadrangle(
        new Quaternion(),
        new Quaternion(),
        new Quaternion()
      );
    }).toThrowDeveloperError();
  });

  it("squad throws with no result", function () {
    expect(function () {
      Quaternion.squad(
        new Quaternion(),
        new Quaternion(),
        new Quaternion(),
        new Quaternion(),
        3
      );
    }).toThrowDeveloperError();
  });

  it("fastSlerp throws with no start", function () {
    expect(function () {
      Quaternion.fastSlerp();
    }).toThrowDeveloperError();
  });

  it("fastSlerp throws with no end", function () {
    expect(function () {
      Quaternion.fastSlerp(new Quaternion());
    }).toThrowDeveloperError();
  });

  it("fastSlerp throws with no t", function () {
    expect(function () {
      Quaternion.fastSlerp(new Quaternion(), new Quaternion());
    }).toThrowDeveloperError();
  });

  it("fastSlerp throws with no result", function () {
    expect(function () {
      Quaternion.fastSlerp(new Quaternion(), new Quaternion(), 2);
    }).toThrowDeveloperError();
  });

  it("fastSquad throws with no q0", function () {
    expect(function () {
      Quaternion.fastSquad();
    }).toThrowDeveloperError();
  });

  it("fastSquad throws with no q1", function () {
    expect(function () {
      Quaternion.fastSquad(new Quaternion());
    }).toThrowDeveloperError();
  });

  it("fastSquad throws with no s0", function () {
    expect(function () {
      Quaternion.fastSquad(new Quaternion(), new Quaternion());
    }).toThrowDeveloperError();
  });

  it("fastSquad throws with no s1", function () {
    expect(function () {
      Quaternion.fastSquad(
        new Quaternion(),
        new Quaternion(),
        new Quaternion()
      );
    }).toThrowDeveloperError();
  });

  it("fastSquad throws with no t", function () {
    expect(function () {
      Quaternion.fastSquad(
        new Quaternion(),
        new Quaternion(),
        new Quaternion(),
        new Quaternion()
      );
    }).toThrowDeveloperError();
  });

  it("fastSquad throws with no result", function () {
    expect(function () {
      Quaternion.fastSquad(
        new Quaternion(),
        new Quaternion(),
        new Quaternion(),
        new Quaternion(),
        3
      );
    }).toThrowDeveloperError();
  });

  const q = new Quaternion(1, 2, 3, 4);
  Quaternion.normalize(q, q);
  createPackableSpecs(Quaternion, q, [q.x, q.y, q.z, q.w]);
});
