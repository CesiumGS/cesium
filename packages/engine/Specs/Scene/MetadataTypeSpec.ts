import {
  MetadataType,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Matrix2,
  Matrix3,
  Matrix4,
} from "../../index.js";

describe("Scene/MetadataType", function () {
  it("isVectorType works", function () {
    expect(MetadataType.isVectorType(MetadataType.VEC2)).toBe(true);
    expect(MetadataType.isVectorType(MetadataType.VEC3)).toBe(true);
    expect(MetadataType.isVectorType(MetadataType.VEC4)).toBe(true);
    expect(MetadataType.isVectorType(MetadataType.MAT2)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.MAT2)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.MAT2)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.SCALAR)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.ENUM)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.BOOLEAN)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.STRING)).toBe(false);
  });

  it("isMatrixType works", function () {
    expect(MetadataType.isMatrixType(MetadataType.VEC2)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.VEC3)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.VEC4)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.MAT2)).toBe(true);
    expect(MetadataType.isMatrixType(MetadataType.MAT2)).toBe(true);
    expect(MetadataType.isMatrixType(MetadataType.MAT2)).toBe(true);
    expect(MetadataType.isMatrixType(MetadataType.SCALAR)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.ENUM)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.BOOLEAN)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.STRING)).toBe(false);
  });

  it("getComponentCount works", function () {
    expect(MetadataType.getComponentCount(MetadataType.VEC2)).toBe(2);
    expect(MetadataType.getComponentCount(MetadataType.VEC3)).toBe(3);
    expect(MetadataType.getComponentCount(MetadataType.VEC4)).toBe(4);
    expect(MetadataType.getComponentCount(MetadataType.MAT2)).toBe(4);
    expect(MetadataType.getComponentCount(MetadataType.MAT3)).toBe(9);
    expect(MetadataType.getComponentCount(MetadataType.MAT4)).toBe(16);
    expect(MetadataType.getComponentCount(MetadataType.SCALAR)).toBe(1);
    expect(MetadataType.getComponentCount(MetadataType.ENUM)).toBe(1);
    expect(MetadataType.getComponentCount(MetadataType.BOOLEAN)).toBe(1);
    expect(MetadataType.getComponentCount(MetadataType.STRING)).toBe(1);
  });

  it("getComponentCount throws for invalid type", function () {
    expect(function () {
      return MetadataType.getComponentCount("NOT_A_TYPE");
    }).toThrowDeveloperError();
  });

  it("getMathType works", function () {
    expect(MetadataType.getMathType(MetadataType.VEC2)).toBe(Cartesian2);
    expect(MetadataType.getMathType(MetadataType.VEC3)).toBe(Cartesian3);
    expect(MetadataType.getMathType(MetadataType.VEC4)).toBe(Cartesian4);
    expect(MetadataType.getMathType(MetadataType.MAT2)).toBe(Matrix2);
    expect(MetadataType.getMathType(MetadataType.MAT3)).toBe(Matrix3);
    expect(MetadataType.getMathType(MetadataType.MAT4)).toBe(Matrix4);
    expect(MetadataType.getMathType(MetadataType.SCALAR)).not.toBeDefined();
    expect(MetadataType.getMathType(MetadataType.ENUM)).not.toBeDefined();
    expect(MetadataType.getMathType(MetadataType.BOOLEAN)).not.toBeDefined();
    expect(MetadataType.getMathType(MetadataType.STRING)).not.toBeDefined();
  });
});
