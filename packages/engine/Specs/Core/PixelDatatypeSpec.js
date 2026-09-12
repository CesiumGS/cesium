import { PixelDatatype, WebGLConstants } from "../../index.js";

describe("Core/PixelDatatype", function () {
  it("toWebGLConstant returns the expected WebGL constant", function () {
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_BYTE, true),
    ).toBe(WebGLConstants.UNSIGNED_BYTE);
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_SHORT, true),
    ).toBe(WebGLConstants.UNSIGNED_SHORT);
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_INT, true),
    ).toBe(WebGLConstants.UNSIGNED_INT);
    expect(PixelDatatype.toWebGLConstant(PixelDatatype.FLOAT, true)).toBe(
      WebGLConstants.FLOAT,
    );
    expect(PixelDatatype.toWebGLConstant(PixelDatatype.HALF_FLOAT, true)).toBe(
      WebGLConstants.HALF_FLOAT,
    );
    expect(PixelDatatype.toWebGLConstant(PixelDatatype.HALF_FLOAT, false)).toBe(
      WebGLConstants.HALF_FLOAT_OES,
    );
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_INT_24_8, true),
    ).toBe(WebGLConstants.UNSIGNED_INT_24_8);
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_SHORT_4_4_4_4, true),
    ).toBe(WebGLConstants.UNSIGNED_SHORT_4_4_4_4);
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_SHORT_5_5_5_1, true),
    ).toBe(WebGLConstants.UNSIGNED_SHORT_5_5_5_1);
    expect(
      PixelDatatype.toWebGLConstant(PixelDatatype.UNSIGNED_SHORT_5_6_5, true),
    ).toBe(WebGLConstants.UNSIGNED_SHORT_5_6_5);
  });

  it("isPacked returns the expected value", function () {
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_BYTE)).toBe(false);
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_SHORT)).toBe(false);
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_INT)).toBe(false);
    expect(PixelDatatype.isPacked(PixelDatatype.FLOAT)).toBe(false);
    expect(PixelDatatype.isPacked(PixelDatatype.HALF_FLOAT)).toBe(false);
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_INT_24_8)).toBe(true);
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_SHORT_4_4_4_4)).toBe(
      true,
    );
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_SHORT_5_5_5_1)).toBe(
      true,
    );
    expect(PixelDatatype.isPacked(PixelDatatype.UNSIGNED_SHORT_5_6_5)).toBe(
      true,
    );
  });

  it("sizeInBytes returns the expected size", function () {
    expect(PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_BYTE)).toBe(1);
    expect(PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_SHORT)).toBe(2);
    expect(
      PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_SHORT_4_4_4_4),
    ).toBe(2);
    expect(
      PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_SHORT_5_5_5_1),
    ).toBe(2);
    expect(PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_SHORT_5_6_5)).toBe(
      2,
    );
    expect(PixelDatatype.sizeInBytes(PixelDatatype.HALF_FLOAT)).toBe(2);
    expect(PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_INT)).toBe(4);
    expect(PixelDatatype.sizeInBytes(PixelDatatype.FLOAT)).toBe(4);
    expect(PixelDatatype.sizeInBytes(PixelDatatype.UNSIGNED_INT_24_8)).toBe(4);
  });

  it("validate returns the expected value", function () {
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_BYTE)).toBe(true);
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_SHORT)).toBe(true);
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_INT)).toBe(true);
    expect(PixelDatatype.validate(PixelDatatype.FLOAT)).toBe(true);
    expect(PixelDatatype.validate(PixelDatatype.HALF_FLOAT)).toBe(true);
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_INT_24_8)).toBe(true);
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_SHORT_4_4_4_4)).toBe(
      true,
    );
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_SHORT_5_5_5_1)).toBe(
      true,
    );
    expect(PixelDatatype.validate(PixelDatatype.UNSIGNED_SHORT_5_6_5)).toBe(
      true,
    );
    expect(PixelDatatype.validate(undefined)).toBe(false);
  });

  it("getTypedArrayConstructor returns the expected constructor", function () {
    expect(
      PixelDatatype.getTypedArrayConstructor(PixelDatatype.UNSIGNED_BYTE),
    ).toBe(Uint8Array);
    expect(
      PixelDatatype.getTypedArrayConstructor(PixelDatatype.UNSIGNED_SHORT),
    ).toBe(Uint16Array);
    expect(
      PixelDatatype.getTypedArrayConstructor(PixelDatatype.UNSIGNED_INT),
    ).toBe(Uint32Array);
    expect(PixelDatatype.getTypedArrayConstructor(PixelDatatype.FLOAT)).toBe(
      Float32Array,
    );
  });
});
