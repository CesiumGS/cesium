import { BufferLoader, Resource, ResourceCache } from "../../Source/Cesium.js";

describe("Scene/BufferLoader", function () {
  const typedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  const arrayBuffer = typedArray.buffer;
  const resource = new Resource({ url: "https://example.com/external.bin" });

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
    const error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      return Promise.reject(error);
    });

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    bufferLoader.load();

    return bufferLoader.promise
      .then(function (bufferLoader) {
        fail();
      })
      .catch(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("loads buffer from typed array", function () {
    const bufferLoader = new BufferLoader({
      typedArray: typedArray,
    });
    bufferLoader.load();

    return bufferLoader.promise.then(function (bufferLoader) {
      expect(bufferLoader.typedArray).toBe(typedArray);
    });
  });

  it("loads external buffer", function () {
    const fetchBuffer = spyOn(
      Resource.prototype,
      "fetchArrayBuffer"
    ).and.returnValue(Promise.resolve(arrayBuffer));

    const bufferLoader = new BufferLoader({
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
      Promise.resolve(arrayBuffer)
    );

    const bufferLoader = new BufferLoader({
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

  function resolveAfterDestroy(rejectPromise) {
    const fetchPromise = new Promise(function (resolve, reject) {
      if (rejectPromise) {
        reject(new Error());
      } else {
        resolve(arrayBuffer);
      }
    });
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(fetchPromise);

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    expect(bufferLoader.typedArray).not.toBeDefined();

    const loadPromise = bufferLoader.load();
    bufferLoader.destroy();

    return loadPromise.finally(function () {
      expect(bufferLoader.typedArray).not.toBeDefined();
      expect(bufferLoader.isDestroyed()).toBe(true);
    });
  }

  it("handles resolving uri after destroy", function () {
    return resolveAfterDestroy(false);
  });

  it("handles rejecting uri after destroy", function () {
    return resolveAfterDestroy(true);
  });
});
