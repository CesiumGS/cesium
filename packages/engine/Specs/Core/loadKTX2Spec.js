import {
  loadKTX2,
  KTX2Transcoder,
  PixelFormat,
  Resource,
  RuntimeError,
} from "../../index.js";

describe("Core/loadKTX2", function () {
  it("throws with no url", function () {
    expect(function () {
      loadKTX2();
    }).toThrowDeveloperError();
  });

  it("throws with unknown supported formats", function () {
    expect(function () {
      KTX2Transcoder.transcode(new Uint8Array());
    }).toThrowDeveloperError();
  });

  it("throws if loadKTX2 is called with invalid url", function () {
    const testUrl = "http://example.invalid/testuri";
    const promise = loadKTX2(testUrl);
    return promise
      .then(function (value) {
        fail();
      })
      .catch(function (error) {
        expect(error).toBeDefined();
      });
  });

  function expectKTX2TranscodeResult(
    url,
    supportedFormats,
    width,
    height,
    isCompressed
  ) {
    const resource = Resource.createIfNeeded(url);
    const loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      const promise = KTX2Transcoder.transcode(buffer, supportedFormats);
      return promise.then(function (result) {
        expect(result).toBeDefined();
        expect(result.width).toEqual(width);
        expect(result.height).toEqual(height);
        expect(PixelFormat.isCompressedFormat(result.internalFormat)).toEqual(
          isCompressed
        );
        expect(result.bufferView).toBeDefined();
      });
    });
  }

  it("transcodes ETC1S ktx2 to etc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4_ETC1S.ktx2",
      { etc: true },
      4,
      4,
      true
    );
  });

  it("transcodes UASTC ktx2 to etc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Logo32x32_UASTC_Zstd.ktx2",
      { etc: true },
      32,
      32,
      true
    );
  });

  it("transcodes ETC1S ktx2 to etc1", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4_ETC1S.ktx2",
      { etc1: true },
      4,
      4,
      true
    );
  });

  it("transcodes UASTC ktx2 to etc1", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Logo32x32_UASTC_Zstd.ktx2",
      { etc1: true },
      32,
      32,
      true
    );
  });

  it("transcodes ETC1S ktx2 to astc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4_ETC1S.ktx2",
      { astc: true },
      4,
      4,
      true
    );
  });

  it("transcodes UASTC ktx2 to astc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Logo32x32_UASTC_Zstd.ktx2",
      { astc: true },
      32,
      32,
      true
    );
  });

  it("transcodes ETC1S ktx2 to pvrtc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4_ETC1S.ktx2",
      { pvrtc: true },
      4,
      4,
      true
    );
  });

  it("transcodes UASTC ktx2 to pvrtc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Logo32x32_UASTC_Zstd.ktx2",
      { pvrtc: true },
      32,
      32,
      true
    );
  });

  it("transcodes ETC1S ktx2 to s3tc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4_ETC1S.ktx2",
      { s3tc: true },
      4,
      4,
      true
    );
  });

  it("transcodes UASTC ktx2 to s3tc", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Logo32x32_UASTC_Zstd.ktx2",
      { s3tc: true },
      32,
      32,
      true
    );
  });

  it("transcodes ETC1S ktx2 to bc7", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4_ETC1S.ktx2",
      { bc7: true },
      4,
      4,
      true
    );
  });

  it("transcodes UASTC ktx2 to bc7", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Logo32x32_UASTC_Zstd.ktx2",
      { bc7: true },
      32,
      32,
      true
    );
  });

  it("returns a promise that resolves to an uncompressed texture", function () {
    return expectKTX2TranscodeResult(
      "./Data/Images/Green4x4.ktx2",
      { s3tc: true },
      4,
      4,
      false
    );
  });

  it("returns a promise that resolves to an uncompressed texture containing all mip levels of the original texture", function () {
    const resource = Resource.createIfNeeded(
      "./Data/Images/Green4x4Mipmap.ktx2"
    );
    const loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      const promise = KTX2Transcoder.transcode(buffer, {});
      return promise.then(function (resolvedValue) {
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.length).toEqual(3);
        const dims = [4, 2, 1];
        for (let i = 0; i < resolvedValue.length; ++i) {
          expect(resolvedValue[i].width).toEqual(dims[i]);
          expect(resolvedValue[i].height).toEqual(dims[i]);
          expect(
            PixelFormat.isCompressedFormat(resolvedValue[i].internalFormat)
          ).toEqual(false);
          expect(resolvedValue[i].bufferView).toBeDefined();
        }
      });
    });
  });

  it("returns a promise that resolves to a compressed texture containing all mip levels of the original texture", function () {
    const resource = Resource.createIfNeeded(
      "./Data/Images/Green4x4Mipmap_ETC1S.ktx2"
    );
    const loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      const promise = KTX2Transcoder.transcode(buffer, { etc1: true });
      return promise.then(function (resolvedValue) {
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.length).toEqual(3);
        const dims = [4, 2, 1];
        for (let i = 0; i < resolvedValue.length; ++i) {
          expect(resolvedValue[i].width).toEqual(dims[i]);
          expect(resolvedValue[i].height).toEqual(dims[i]);
          expect(
            PixelFormat.isCompressedFormat(resolvedValue[i].internalFormat)
          ).toEqual(true);
          expect(resolvedValue[i].bufferView).toBeDefined();
        }
      });
    });
  });

  it("cannot parse invalid KTX2 buffer", function () {
    const invalidKTX = new Uint8Array([0, 1, 2, 3, 4, 5]);
    let resolvedValue;
    let rejectedError;
    const promise = loadKTX2(invalidKTX.buffer);
    return promise
      .then(function (value) {
        fail();
      })
      .catch(function (error) {
        rejectedError = error;
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeInstanceOf(RuntimeError);
        expect(rejectedError.message).toEqual("Invalid KTX2 file.");
      });
  });

  it("3D textures are unsupported", function () {
    const resource = Resource.createIfNeeded("./Data/Images/Green4x4.ktx2");
    const loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      const invalidKTX = new Uint32Array(buffer);
      invalidKTX[7] = 2; // Uint32 pixelDepth

      let resolvedValue;
      let rejectedError;
      const promise = loadKTX2(invalidKTX.buffer);
      return promise
        .then(function (value) {
          fail();
        })
        .catch(function (error) {
          rejectedError = error;
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RuntimeError);
          expect(rejectedError.message).toEqual(
            "KTX2 3D textures are unsupported."
          );
        });
    });
  });

  it("texture arrays are unsupported", function () {
    const resource = Resource.createIfNeeded("./Data/Images/Green4x4.ktx2");
    const loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      const invalidKTX = new Uint32Array(buffer);
      invalidKTX[8] = 15; // Uint32 layerCount

      let resolvedValue;
      let rejectedError;
      const promise = loadKTX2(invalidKTX.buffer);
      return promise
        .then(function (value) {
          fail();
        })
        .catch(function (error) {
          rejectedError = error;
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RuntimeError);
          expect(rejectedError.message).toEqual(
            "KTX2 texture arrays are not supported."
          );
        });
    });
  });
});
