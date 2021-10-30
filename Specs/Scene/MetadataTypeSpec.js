import { MetadataType } from "../../Source/Cesium.js";

describe("Scene/MetadataType", function () {
  it("isVectorType works", function () {
    expect(MetadataType.isVectorType(MetadataType.VEC2)).toBe(true);
    expect(MetadataType.isVectorType(MetadataType.VEC3)).toBe(true);
    expect(MetadataType.isVectorType(MetadataType.VEC4)).toBe(true);
    expect(MetadataType.isVectorType(MetadataType.MAT2)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.MAT2)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.MAT2)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.SINGLE)).toBe(false);
    expect(MetadataType.isVectorType(MetadataType.ARRAY)).toBe(false);
  });

  it("isMatrixType works", function () {
    expect(MetadataType.isMatrixType(MetadataType.VEC2)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.VEC3)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.VEC4)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.MAT2)).toBe(true);
    expect(MetadataType.isMatrixType(MetadataType.MAT2)).toBe(true);
    expect(MetadataType.isMatrixType(MetadataType.MAT2)).toBe(true);
    expect(MetadataType.isMatrixType(MetadataType.SINGLE)).toBe(false);
    expect(MetadataType.isMatrixType(MetadataType.ARRAY)).toBe(false);
  });

  it("getComponentCount works", function () {
    expect(MetadataType.getComponentCount(MetadataType.VEC2)).toBe(2);
    expect(MetadataType.getComponentCount(MetadataType.VEC3)).toBe(3);
    expect(MetadataType.getComponentCount(MetadataType.VEC4)).toBe(4);
    expect(MetadataType.getComponentCount(MetadataType.MAT2)).toBe(4);
    expect(MetadataType.getComponentCount(MetadataType.MAT3)).toBe(9);
    expect(MetadataType.getComponentCount(MetadataType.MAT4)).toBe(16);
    expect(MetadataType.getComponentCount(MetadataType.SINGLE)).toBe(1);
    expect(
      MetadataType.getComponentCount(MetadataType.ARRAY)
    ).not.toBeDefined();
  });
});
