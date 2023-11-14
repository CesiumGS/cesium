import { PixelDatatype } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";

describe("Core/PixelFormat", function () {
  it("flipY works", function () {
    const width = 1;
    const height = 2;
    const values = [255, 0, 0, 0, 255, 0];
    const expectedValues = [0, 255, 0, 255, 0, 0];
    const dataBuffer = new Uint8Array(values);
    const expectedDataBuffer = new Uint8Array(expectedValues);

    const flipped = PixelFormat.flipY(
      dataBuffer,
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      width,
      height
    );
    expect(flipped).toEqual(expectedDataBuffer);
  });

  it("flipY returns early if height is 1", function () {
    const width = 1;
    const height = 1;
    const values = [255, 255, 255];
    const dataBuffer = new Uint8Array(values);

    const flipped = PixelFormat.flipY(
      dataBuffer,
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      width,
      height
    );
    expect(flipped).toBe(dataBuffer);
  });
});
