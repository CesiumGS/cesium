import { SupportedImageFormats } from "../../Source/Cesium.js";

describe("Scene/SupportedImageFormats", function () {
  it("constructs with options", function () {
    var supportedImageFormats = new SupportedImageFormats({
      webp: true,
      s3tc: false,
      pvrtc: true,
      etc1: false,
    });
    expect(supportedImageFormats.webp).toBe(true);
    expect(supportedImageFormats.s3tc).toBe(false);
    expect(supportedImageFormats.pvrtc).toBe(true);
    expect(supportedImageFormats.etc1).toBe(false);
  });

  it("constructs with default values", function () {
    var supportedImageFormats = new SupportedImageFormats({});
    expect(supportedImageFormats.webp).toBe(false);
    expect(supportedImageFormats.s3tc).toBe(false);
    expect(supportedImageFormats.pvrtc).toBe(false);
    expect(supportedImageFormats.etc1).toBe(false);
  });
});
