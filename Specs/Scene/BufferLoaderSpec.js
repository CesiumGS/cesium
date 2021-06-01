import {
  BufferLoader,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";

describe("Scene/BufferLoader", function () {
  var typedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  var arrayBuffer = typedArray.buffer;
  var resource = new Resource({ url: "https://example.com/external.bin" });

  afterEach(function () {
    ResourceCache.clearForSpecs();
  });

  it("throws if neither options.typedArray nor options.resource are defined", function () {
    expect(function () {
      return new BufferLoader({
        typedArray: undefined,
        resource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("throws if both options.typedArray and options.resource are defined", function () {
    expect(function () {
      return new BufferLoader({
        typedArray: typedArray,
        resource: resource,
      });
    }).toThrowDeveloperError();
  });

  it("rejects promise if buffer cannot be fetched", function () {
    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );

    var bufferLoader = new BufferLoader({
      resource: resource,
    });

    bufferLoader.load();

    return bufferLoader.promise
      .then(function (bufferLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("loads buffer from typed array", function () {
    var bufferLoader = new BufferLoader({
      typedArray: typedArray,
    });
    bufferLoader.load();

    return bufferLoader.promise.then(function (bufferLoader) {
      expect(bufferLoader.typedArray).toBe(typedArray);
    });
  });

  it("loads external buffer", function () {
    var fetchBuffer = spyOn(
      Resource.prototype,
      "fetchArrayBuffer"
    ).and.returnValue(when.resolve(arrayBuffer));

    var bufferLoader = new BufferLoader({
      resource: resource,
    });

    bufferLoader.load();

    return bufferLoader.promise.then(function (bufferLoader) {
      expect(fetchBuffer).toHaveBeenCalled();
      expect(bufferLoader.typedArray.buffer).toBe(arrayBuffer);
    });
  });

  it("destroys buffer", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(arrayBuffer)
    );

    var bufferLoader = new BufferLoader({
      resource: resource,
    });

    expect(bufferLoader.typedArray).not.toBeDefined();

    bufferLoader.load();

    return bufferLoader.promise.then(function (bufferLoader) {
      expect(bufferLoader.typedArray.buffer).toBe(arrayBuffer);
      expect(bufferLoader.isDestroyed()).toBe(false);

      bufferLoader.destroy();
      expect(bufferLoader.typedArray).not.toBeDefined();
      expect(bufferLoader.isDestroyed()).toBe(true);
    });
  });

  function resolveAfterDestroy(reject) {
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    var bufferLoader = new BufferLoader({
      resource: resource,
    });

    expect(bufferLoader.typedArray).not.toBeDefined();

    bufferLoader.load();
    bufferLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(arrayBuffer);
    }

    expect(bufferLoader.typedArray).not.toBeDefined();
    expect(bufferLoader.isDestroyed()).toBe(true);
  }

  it("handles resolving uri after destroy", function () {
    resolveAfterDestroy(false);
  });

  it("handles rejecting uri after destroy", function () {
    resolveAfterDestroy(true);
  });
});
