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

  it("getGlslType throws for invalid attribute type", function () {
    expect(function () {
      AttributeType.getGlslType(undefined);
    }).toThrowDeveloperError();
    expect(function () {
      AttributeType.getGlslType("");
    }).toThrowDeveloperError();
    expect(function () {
      AttributeType.getGlslType("int");
    }).toThrowDeveloperError();
  });

  it("getGlslType works", function () {
    expect(AttributeType.getGlslType(AttributeType.SCALAR)).toEqual("float");
    expect(AttributeType.getGlslType(AttributeType.VEC2)).toEqual("vec2");
    expect(AttributeType.getGlslType(AttributeType.VEC3)).toEqual("vec3");
    expect(AttributeType.getGlslType(AttributeType.VEC4)).toEqual("vec4");
    expect(AttributeType.getGlslType(AttributeType.MAT2)).toEqual("mat2");
    expect(AttributeType.getGlslType(AttributeType.MAT3)).toEqual("mat3");
    expect(AttributeType.getGlslType(AttributeType.MAT4)).toEqual("mat4");
  });

  it("getNumberOfComponents works", function () {
    expect(AttributeType.getNumberOfComponents(AttributeType.SCALAR)).toBe(1);
    expect(AttributeType.getNumberOfComponents(AttributeType.VEC2)).toBe(2);
    expect(AttributeType.getNumberOfComponents(AttributeType.VEC3)).toBe(3);
    expect(AttributeType.getNumberOfComponents(AttributeType.VEC4)).toBe(4);
    expect(AttributeType.getNumberOfComponents(AttributeType.MAT2)).toBe(4);
    expect(AttributeType.getNumberOfComponents(AttributeType.MAT3)).toBe(9);
    expect(AttributeType.getNumberOfComponents(AttributeType.MAT4)).toBe(16);
  });

  it("getAttributeLocationCount works", function () {
    expect(AttributeType.getNumberOfComponents(AttributeType.SCALAR)).toBe(1);
    expect(AttributeType.getNumberOfComponents(AttributeType.VEC2)).toBe(1);
    expect(AttributeType.getNumberOfComponents(AttributeType.VEC3)).toBe(1);
    expect(AttributeType.getNumberOfComponents(AttributeType.VEC4)).toBe(1);
    expect(AttributeType.getNumberOfComponents(AttributeType.MAT2)).toBe(2);
    expect(AttributeType.getNumberOfComponents(AttributeType.MAT3)).toBe(3);
    expect(AttributeType.getNumberOfComponents(AttributeType.MAT4)).toBe(4);
  });

  it("getNumberOfComponents throws with invalid type", function () {
    expect(function () {
      AttributeType.getNumberOfComponents("Invalid");
    }).toThrowDeveloperError();
  });
});
