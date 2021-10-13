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
});
