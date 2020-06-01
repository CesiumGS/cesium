import { PixelDatatype } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";

describe("Core/PixelFormat", function () {
  it("flipY works", function () {
    var width = 1;
    var height = 2;
    var values = [255, 0, 0, 0, 255, 0];
    var expectedValues = [0, 255, 0, 255, 0, 0];
    var dataBuffer = new Uint8Array(values);
    var expectedDataBuffer = new Uint8Array(expectedValues);

    var flipped = PixelFormat.flipY(
      dataBuffer,
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      width,
      height
    );
    expect(flipped).toEqual(expectedDataBuffer);
  });

  it("flipY returns early if height is 1", function () {
    var width = 1;
    var height = 1;
    var values = [255, 255, 255];
    var dataBuffer = new Uint8Array(values);

    var flipped = PixelFormat.flipY(
      dataBuffer,
      PixelFormat.RGB,
      PixelDatatype.UNSIGNED_BYTE,
      width,
      height
    );
    expect(flipped).toBe(dataBuffer);
  });
});
