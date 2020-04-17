import { loadKTX } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestErrorEvent } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";

describe("Core/loadKTX", function () {
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
  var validCompressedMipmap = new Uint8Array([
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
    100,
    141,
    0,
    0,
    7,
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
    3,
    0,
    0,
    0,
    52,
    0,
    0,
    0,
    19,
    0,
    0,
    0,
    67,
    82,
    78,
    76,
    73,
    66,
    95,
    70,
    79,
    85,
    82,
    67,
    67,
    0,
    69,
    84,
    67,
    49,
    0,
    0,
    23,
    0,
    0,
    0,
    75,
    84,
    88,
    111,
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
    0,
    0,
    8,
    0,
    0,
    0,
    255,
    0,
    0,
    0,
    255,
    255,
    0,
    0,
    8,
    0,
    0,
    0,
    255,
    0,
    0,
    0,
    255,
    255,
    0,
    0,
    8,
    0,
    0,
    0,
    255,
    0,
    0,
    0,
    255,
    255,
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
  var validUncompressedMipmap = new Uint8Array([
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
    7,
    25,
    0,
    0,
    81,
    128,
    0,
    0,
    7,
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
    3,
    0,
    0,
    0,
    52,
    0,
    0,
    0,
    19,
    0,
    0,
    0,
    67,
    82,
    78,
    76,
    73,
    66,
    95,
    70,
    79,
    85,
    82,
    67,
    67,
    0,
    82,
    71,
    66,
    120,
    0,
    0,
    23,
    0,
    0,
    0,
    75,
    84,
    88,
    111,
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
    0,
    0,
    48,
    0,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    12,
    0,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    255,
    0,
    0,
    3,
    0,
    0,
    0,
    255,
    0,
    0,
    0,
  ]);

  var fakeXHR;

  beforeEach(function () {
    fakeXHR = jasmine.createSpyObj("XMLHttpRequest", [
      "send",
      "open",
      "setRequestHeader",
      "abort",
      "getAllResponseHeaders",
    ]);
    fakeXHR.simulateLoad = function (response) {
      fakeXHR.simulateHttpResponse(200, response);
    };
    fakeXHR.simulateError = function () {
      fakeXHR.response = "";
      if (typeof fakeXHR.onerror === "function") {
        fakeXHR.onerror();
      }
    };
    fakeXHR.simulateHttpResponse = function (statusCode, response) {
      fakeXHR.status = statusCode;
      fakeXHR.response = response;
      if (typeof fakeXHR.onload === "function") {
        fakeXHR.onload();
      }
    };

    spyOn(window, "XMLHttpRequest").and.returnValue(fakeXHR);
  });

  it("throws with no url", function () {
    expect(function () {
      loadKTX();
    }).toThrowDeveloperError();
  });

  it("creates and sends request without any custom headers", function () {
    var testUrl = "http://example.invalid/testuri";
    loadKTX(testUrl);

    expect(fakeXHR.open).toHaveBeenCalledWith("GET", testUrl, true);
    expect(fakeXHR.setRequestHeader).not.toHaveBeenCalled();
    expect(fakeXHR.send).toHaveBeenCalled();
  });

  it("returns a promise that rejects when the request errors", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RequestErrorEvent);
        expect(error.statusCode).toBeUndefined();
        expect(error.response).toBeUndefined();
      });

    fakeXHR.simulateError();

    return promise;
  });

  it("returns a promise that rejects when the request results in an HTTP error code", function () {
    var errorMsg = "some error";
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RequestErrorEvent);
        expect(error.statusCode).toEqual(404);
        expect(error.response).toEqual(errorMsg);
      });

    fakeXHR.simulateHttpResponse(404, errorMsg);

    return promise;
  });

  it("returns a promise that resolves with undefined when the status code is 204", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl).then(function (value) {
      expect(value).toBeUndefined();
    });

    fakeXHR.simulateHttpResponse(204);
    return promise;
  });

  it("returns a promise that resolves to an uncompressed texture when the request loads", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl).then(function (value) {
      expect(value).toBeDefined();
      expect(value.width).toEqual(4);
      expect(value.height).toEqual(4);
      expect(PixelFormat.isCompressedFormat(value.internalFormat)).toEqual(
        false
      );
      expect(value.bufferView).toBeDefined();
    });

    fakeXHR.simulateLoad(validUncompressed.buffer);
    return promise;
  });

  it("returns a promise that resolves to an uncompressed texture containing all mip levels of the original texture", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl).then(function (value) {
      expect(value.length).toEqual(3);
      expect(value[0].width).toEqual(4);
      expect(value[0].height).toEqual(4);
      expect(PixelFormat.isCompressedFormat(value[0].internalFormat)).toEqual(
        false
      );
      expect(value[0].bufferView).toBeDefined();
    });

    fakeXHR.simulateLoad(validUncompressedMipmap.buffer);
    return promise;
  });

  it("returns a promise that resolves to a compressed texture when the request loads", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl).then(function (value) {
      expect(value).toBeDefined();
      expect(value.width).toEqual(4);
      expect(value.height).toEqual(4);
      expect(PixelFormat.isCompressedFormat(value.internalFormat)).toEqual(
        true
      );
      expect(value.bufferView).toBeDefined();
    });

    fakeXHR.simulateLoad(validCompressed.buffer);
    return promise;
  });

  it("returns a promise that resolves to a compressed texture containing the all mip levels of the original texture", function () {
    var testUrl = "http://example.invalid/testuri";
    var promise = loadKTX(testUrl).then(function (value) {
      expect(value).toBeDefined();
      expect(value.length).toEqual(3);
      expect(value[0].width).toEqual(4);
      expect(value[0].height).toEqual(4);
      expect(PixelFormat.isCompressedFormat(value[0].internalFormat)).toEqual(
        true
      );
      expect(value[0].bufferView).toBeDefined();
    });

    fakeXHR.simulateLoad(validCompressedMipmap.buffer);
    return promise;
  });

  it("cannot parse invalid KTX buffer", function () {
    var invalidKTX = new Uint8Array(validCompressed);
    invalidKTX[0] = 0;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual("Invalid KTX file.");
      });
  });

  it("cannot parse KTX buffer with invalid endianness", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[3] = 0x01020304;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual("File is the wrong endianness.");
      });
  });

  it("cannot parse KTX buffer with invalid internal format", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[7] = 0;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual(
          "glInternalFormat is not a valid format."
        );
      });
  });

  it("cannot parse KTX buffer with compressed texture and invalid type", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[4] = 15;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual(
          "glType must be zero when the texture is compressed."
        );
      });
  });

  it("cannot parse KTX buffer with compressed texture and invalid type size", function () {
    var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[5] = 15;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual(
          "The type size for compressed textures must be 1."
        );
      });
  });

  it("cannot parse KTX buffer with uncompressed texture and base format is not the same as format", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[8] = invalidKTX[6] + 1;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual(
          "The base internal format must be the same as the format for uncompressed textures."
        );
      });
  });

  it("3D textures are unsupported", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[11] = 15;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual("3D textures are unsupported.");
      });
  });

  it("texture arrays are unsupported", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var invalidKTX = new Uint32Array(reinterprestBuffer);
    invalidKTX[12] = 15;

    return loadKTX(invalidKTX.buffer)
      .then(fail)
      .catch(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toEqual("Texture arrays are unsupported.");
      });
  });

  it("cubemaps are supported", function () {
    var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
    var cubemapKTX = new Uint32Array(reinterprestBuffer);
    cubemapKTX[13] = 6;

    return loadKTX(cubemapKTX.buffer).then(function (value) {
      expect(value).toBeDefined();
    });
  });

  it("returns undefined if the request is throttled", function () {
    var oldMaximumRequests = RequestScheduler.maximumRequests;
    RequestScheduler.maximumRequests = 0;

    var promise = loadKTX(
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
