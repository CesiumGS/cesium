import { DeveloperError, loadKTX2 } from "../../Source/Cesium.js";
import { KTX2Transcoder } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";

describe("Core/loadKTX2", function () {
  it("throws with no url", function () {
    expect(function () {
      loadKTX2();
    }).toThrowDeveloperError();
  });

  it("throws with unknown supported formats", function () {
    var promise = KTX2Transcoder.transcode(new Uint8Array());
    expect(promise).toBeDefined();

    var resolvedValue;
    var rejectedError;
    return promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeDefined();
        expect(rejectedError).toBeInstanceOf(DeveloperError);
      }
    );
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
      var promise = loadKTX2(buffer);
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
      var promise = loadKTX2(buffer);
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
      var promise = loadKTX2(buffer);
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
      var promise = loadKTX2(buffer);
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
    var invalidKTX = new Uint8Array([0, 1, 2, 3, 4, 5]);

    var resolvedValue;
    var rejectedError;
    var promise = loadKTX2(invalidKTX.buffer);
    expect(promise).toBeDefined();
    return promise.then(
      function (value) {
        resolvedValue = value;
      },
      function (error) {
        rejectedError = error;
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeInstanceOf(RuntimeError);
        expect(rejectedError.message).toEqual("Invalid KTX2 file.");
      }
    );
  });

  it("3D textures are unsupported", function () {
    var resource = Resource.createIfNeeded("./Data/Images/Green4x4.ktx2");
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var invalidKTX = new Uint32Array(buffer);
      invalidKTX[7] = 2; // Uint32 pixelDepth

      var resolvedValue;
      var rejectedError;
      var promise = loadKTX2(invalidKTX.buffer);
      expect(promise).toBeDefined();
      return promise.then(
        function (value) {
          resolvedValue = value;
        },
        function (error) {
          rejectedError = error;
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RuntimeError);
          expect(rejectedError.message).toEqual(
            "KTX2 3D textures are unsupported."
          );
        }
      );
    });
  });

  it("texture arrays are unsupported", function () {
    var resource = Resource.createIfNeeded("./Data/Images/Green4x4.ktx2");
    var loadPromise = resource.fetchArrayBuffer();
    return loadPromise.then(function (buffer) {
      var invalidKTX = new Uint32Array(buffer);
      invalidKTX[8] = 15; // Uint32 layerCount

      var resolvedValue;
      var rejectedError;
      var promise = loadKTX2(invalidKTX.buffer);
      expect(promise).toBeDefined();
      return promise.then(
        function (value) {
          resolvedValue = value;
        },
        function (error) {
          rejectedError = error;
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RuntimeError);
          expect(rejectedError.message).toEqual(
            "KTX2 texture arrays are not supported."
          );
        }
      );
    });
  });
});
