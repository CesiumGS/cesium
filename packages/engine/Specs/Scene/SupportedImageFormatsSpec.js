import { SupportedImageFormats } from "../../Source/Cesium.js";

describe("Scene/SupportedImageFormats", function () {
  it("constructs with options", function () {
    const supportedImageFormats = new SupportedImageFormats({
      webp: true,
      basis: false,
    });
    expect(supportedImageFormats.webp).toBe(true);
    expect(supportedImageFormats.basis).toBe(false);
  });

  it("constructs with default values", function () {
    const supportedImageFormats = new SupportedImageFormats({});
    expect(supportedImageFormats.webp).toBe(false);
    expect(supportedImageFormats.basis).toBe(false);
  });
});
