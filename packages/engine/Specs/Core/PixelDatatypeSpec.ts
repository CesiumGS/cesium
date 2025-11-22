import { PixelDatatype } from "../../index.js";

describe("Core/PixelDatatype", function () {
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
