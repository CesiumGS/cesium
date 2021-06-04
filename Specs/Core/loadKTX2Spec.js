import { loadKTX2 } from "../../Source/Cesium.js";
import { KTX2Transcoder } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";

describe("Core/loadKTX2", function () {
  var validCompressed = new Uint8Array([
    171,
    75,
    84,
    88,
    32,
    49,
    49,
    187,
    13,
    10,
    26,
    10,
    1,
    2,
    3,
    4,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    241,
    131,
    0,
    0,
    8,
    25,
    0,
    0,
    4,
    0,
    0,
    0,
    4,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    8,
    0,
    0,
    0,
    224,
    7,
    224,
    7,
    0,
    0,
    0,
    0,
  ]);
  var validUncompressed = new Uint8Array([
    171,
    75,
    84,
    88,
    32,
    49,
    49,
    187,
    13,
    10,
    26,
    10,
    1,
    2,
    3,
    4,
    1,
    20,
    0,
    0,
    1,
    0,
    0,
    0,
    8,
    25,
    0,
    0,
    88,
    128,
    0,
    0,
    8,
    25,
    0,
    0,
    4,
    0,
    0,
    0,
    4,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    32,
    0,
    0,
    0,
    27,
    0,
    0,
    0,
    75,
    84,
    88,
    79,
    114,
    105,
    101,
    110,
    116,
    97,
    116,
    105,
    111,
    110,
    0,
    83,
    61,
    114,
    44,
    84,
    61,
    100,
    44,
    82,
    61,
    105,
    0,
    0,
    64,
    0,
    0,
    0,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
    0,
    255,
  ]);
  it("throws with no url", function () {
    expect(function () {
      loadKTX2();
    }).toThrowDeveloperError();
  });

  it("returns a promise that resolves to undefined when there is no data", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX2(testUrl);

    expect(promise).toBeDefined();

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeUndefined();
  });

  it("returns a promise that resolves to an uncompressed texture", function () {
    var resource = Resource.createIfNeeded("./Data/Images/Green4x4.ktx2");
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var promise = KTX2Transcoder.transcode(buffer, { pvrtc: true });
      expect(promise).toBeDefined();
      return promise.then(function (resolvedValue) {
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.width).toEqual(4);
        expect(resolvedValue.height).toEqual(4);
        expect(
          PixelFormat.isCompressedFormat(resolvedValue.internalFormat)
        ).toEqual(false);
        expect(resolvedValue.bufferView).toBeDefined();
      });
    });
  });

  it("returns a promise that resolves to an uncompressed texture containing all mip levels of the original texture", function () {
    var resource = Resource.createIfNeeded("./Data/Images/Green4x4Mipmap.ktx2");
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var promise = KTX2Transcoder.transcode(buffer, { pvrtc: true });
      expect(promise).toBeDefined();
      return promise.then(function (resolvedValue) {
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.length).toEqual(3);
        var dims = [4, 2, 1];
        for (var i = 0; i < resolvedValue.length; ++i) {
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

  it("returns a promise that resolves to a compressed texture", function () {
    var resource = Resource.createIfNeeded(
      "./Data/Images/Green4x4Compressed.ktx2"
    );
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var promise = KTX2Transcoder.transcode(buffer, { pvrtc: true });
      expect(promise).toBeDefined();
      return promise.then(function (resolvedValue) {
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.width).toEqual(4);
        expect(resolvedValue.height).toEqual(4);
        expect(
          PixelFormat.isCompressedFormat(resolvedValue.internalFormat)
        ).toEqual(true);
        expect(resolvedValue.bufferView).toBeDefined();
      });
    });
  });

  it("returns a promise that resolves to a compressed texture containing the all mip levels of the original texture", function () {
    var resource = Resource.createIfNeeded(
      "./Data/Images/Green4x4CompressedMipmap.ktx2"
    );
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var promise = KTX2Transcoder.transcode(buffer, { pvrtc: true });
      expect(promise).toBeDefined();
      return promise.then(function (resolvedValue) {
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.length).toEqual(3);
        var dims = [4, 2, 1];
        for (var i = 0; i < resolvedValue.length; ++i) {
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

  it("cannot parse invalid KTX buffer", function () {
    var invalidKTX = new Uint8Array(validCompressed);
    invalidKTX[0] = 0;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual("Invalid KTX file.");
  });

  it("cannot parse KTX2 buffer with invalid internal format", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[7] = 0;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual(
      "glInternalFormat is not a valid format."
    );
  });

  it("cannot parse KTX2 buffer with compressed texture and invalid type", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[4] = 15;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual(
      "glType must be zero when the texture is compressed."
    );
  });

  it("cannot parse KTX buffer with compressed texture and invalid type size", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[5] = 15;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual(
      "The type size for compressed textures must be 1."
    );
  });

  it("cannot parse KTX2 buffer with uncompressed texture and base format is not the same as format", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[8] = invalidKTX[6] + 1;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual(
      "The base internal format must be the same as the format for uncompressed textures."
    );
  });

  it("3D textures are unsupported", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[11] = 15;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual("3D textures are unsupported.");
  });

  it("texture arrays are unsupported", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[12] = 15;

    var promise = loadKTX2(invalidKTX.buffer);

    var resolvedValue;
    var rejectedError;
    promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
      }
    );

    expect(resolvedValue).toBeUndefined();
    expect(rejectedError).toBeInstanceOf(RuntimeError);
    expect(rejectedError.message).toEqual("Texture arrays are unsupported.");
  });

  it("cubemaps are supported", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var cubemapKTX = new Uint32Array(reinterprestBuffer);
    cubemapKTX[13] = 6;

    var promise = loadKTX2(cubemapKTX.buffer);

    promise.then(function (value) {
      expect(value).toBeDefined();
    });
  });

  it("returns undefined if the request is throttled", function () {
    var oldMaximumRequests = RequestScheduler.maximumRequests;
    RequestScheduler.maximumRequests = 0;

    var promise = loadKTX2(
      new Resource({
        url: "http://example.invalid/testuri",
        request: new Request({
          throttle: true,
        }),
      })
    );
    expect(promise).toBeUndefined();

    RequestScheduler.maximumRequests = oldMaximumRequests;
  });
});
