import {
  BufferLoader,
  Resource,
  ResourceCache,
  RuntimeError,
} from "../../index.js";

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

  it("load throws if buffer cannot be fetched", async function () {
    const error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      return Promise.reject(error);
    });

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    await expectAsync(bufferLoader.load()).toBeRejectedWithError(
      RuntimeError,
      "Failed to load external buffer: https://example.com/external.bin\n404 Not Found"
    );
  });

  it("loads buffer from typed array", async function () {
    const bufferLoader = new BufferLoader({
      typedArray: typedArray,
    });

    await bufferLoader.load();

    expect(bufferLoader.typedArray).toBe(typedArray);
  });

  it("loads external buffer", async function () {
    const fetchBuffer = spyOn(
      Resource.prototype,
      "fetchArrayBuffer"
    ).and.returnValue(Promise.resolve(arrayBuffer));

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    await bufferLoader.load();

    expect(fetchBuffer).toHaveBeenCalled();
    expect(bufferLoader.typedArray.buffer).toBe(arrayBuffer);
  });

  it("destroys buffer", async function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    expect(bufferLoader.typedArray).not.toBeDefined();

    await bufferLoader.load();

    expect(bufferLoader.typedArray.buffer).toBe(arrayBuffer);
    expect(bufferLoader.isDestroyed()).toBe(false);

    bufferLoader.destroy();
    expect(bufferLoader.typedArray).not.toBeDefined();
    expect(bufferLoader.isDestroyed()).toBe(true);
  });

  it("handles asynchronous load after destroy", async function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.resolve(arrayBuffer)
    );

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    expect(bufferLoader.typedArray).not.toBeDefined();

    const loadPromise = bufferLoader.load();
    bufferLoader.destroy();

    await expectAsync(loadPromise).toBeResolved();
    expect(bufferLoader.typedArray).not.toBeDefined();
    expect(bufferLoader.isDestroyed()).toBe(true);
  });

  it("handles asynchronous error after destroy", async function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      Promise.reject(new Error())
    );

    const bufferLoader = new BufferLoader({
      resource: resource,
    });

    expect(bufferLoader.typedArray).not.toBeDefined();

    const loadPromise = bufferLoader.load();
    bufferLoader.destroy();

    await expectAsync(loadPromise).toBeResolved();
    expect(bufferLoader.typedArray).not.toBeDefined();
    expect(bufferLoader.isDestroyed()).toBe(true);
  });
});
