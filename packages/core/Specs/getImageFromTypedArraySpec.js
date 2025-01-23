import { getImageFromTypedArray } from "../../index.js";

describe("Core/getImageFromTypedArray", function () {
  const pixelArray3x2 = Array(6).fill([0, 255, 0, 255]);
  const typedArray = new Uint8Array(pixelArray3x2.flat());

  it("returns a Canvas of the expected size", function () {
    const canvas = getImageFromTypedArray(typedArray, 3, 2);
    expect(canvas.width).toBe(3);
    expect(canvas.height).toBe(2);
  });

  it("fills the Canvas with the expected colors", function () {
    const canvas = getImageFromTypedArray(typedArray, 3, 2);
    const imageData = canvas.getContext("2d").getImageData(0, 0, 3, 2);
    const inputData = new Uint8ClampedArray(typedArray.buffer);
    expect(imageData.data).toEqual(inputData);
  });
});
