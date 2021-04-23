import {
  AttributeType,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Matrix2,
  Matrix3,
  Matrix4,
} from "../../Source/Cesium.js";

describe("Scene/AttributeType", function () {
  it("getMathType works", function () {
    expect(AttributeType.getMathType(AttributeType.SCALAR)).toBe(Number);
    expect(AttributeType.getMathType(AttributeType.VEC2)).toBe(Cartesian2);
    expect(AttributeType.getMathType(AttributeType.VEC3)).toBe(Cartesian3);
    expect(AttributeType.getMathType(AttributeType.VEC4)).toBe(Cartesian4);
    expect(AttributeType.getMathType(AttributeType.MAT2)).toBe(Matrix2);
    expect(AttributeType.getMathType(AttributeType.MAT3)).toBe(Matrix3);
    expect(AttributeType.getMathType(AttributeType.MAT4)).toBe(Matrix4);
  });

  it("getMathType throws with invalid type", function () {
    expect(function () {
      AttributeType.getMathType("Invalid");
    }).toThrowDeveloperError();
  });
});
