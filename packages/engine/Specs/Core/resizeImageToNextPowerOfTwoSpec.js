import { resizeImageToNextPowerOfTwo } from "../../Source/Cesium.js";

describe("Core/resizeImageToNextPowerOfTwo", function () {
  const canvas = document.createElement("canvas");

  it("resizes an image so its width is a power of two", function () {
    canvas.width = 3;
    canvas.height = 2;
    const resizedImage = resizeImageToNextPowerOfTwo(canvas);
    expect(resizedImage.width).toBe(4);
    expect(resizedImage.height).toBe(2);
  });

  it("resizes an image so its height is a power of two", function () {
    canvas.width = 4;
    canvas.height = 3;
    const resizedImage = resizeImageToNextPowerOfTwo(canvas);
    expect(resizedImage.width).toBe(4);
    expect(resizedImage.height).toBe(4);
  });

  it("keeps original image size if both dimensions are already powers of two", function () {
    canvas.width = 8;
    canvas.height = 8;
    const resizedImage = resizeImageToNextPowerOfTwo(canvas);
    expect(resizedImage.width).toBe(8);
    expect(resizedImage.height).toBe(8);
  });
});
