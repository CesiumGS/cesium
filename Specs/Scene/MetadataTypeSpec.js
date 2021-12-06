import { MetadataCompoundType } from "../../Source/Cesium.js";

describe("Scene/MetadataCompoundType", function () {
  it("isVectorType works", function () {
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.VEC2)).toBe(
      true
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.VEC3)).toBe(
      true
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.VEC4)).toBe(
      true
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.MAT2)).toBe(
      false
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.MAT2)).toBe(
      false
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.MAT2)).toBe(
      false
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.SINGLE)).toBe(
      false
    );
    expect(MetadataCompoundType.isVectorType(MetadataCompoundType.ARRAY)).toBe(
      false
    );
  });

  it("isMatrixType works", function () {
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.VEC2)).toBe(
      false
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.VEC3)).toBe(
      false
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.VEC4)).toBe(
      false
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.MAT2)).toBe(
      true
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.MAT2)).toBe(
      true
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.MAT2)).toBe(
      true
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.SINGLE)).toBe(
      false
    );
    expect(MetadataCompoundType.isMatrixType(MetadataCompoundType.ARRAY)).toBe(
      false
    );
  });

  it("getComponentCount works", function () {
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.VEC2)
    ).toBe(2);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.VEC3)
    ).toBe(3);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.VEC4)
    ).toBe(4);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.MAT2)
    ).toBe(4);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.MAT3)
    ).toBe(9);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.MAT4)
    ).toBe(16);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.SINGLE)
    ).toBe(1);
    expect(
      MetadataCompoundType.getComponentCount(MetadataCompoundType.ARRAY)
    ).not.toBeDefined();
  });
});
