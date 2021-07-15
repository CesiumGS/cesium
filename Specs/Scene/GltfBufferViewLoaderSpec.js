import {
  BufferLoader,
  GltfBufferViewLoader,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";

describe("Scene/GltfBufferViewLoader", function () {
  var gltfEmbedded = {
    buffers: [
      {
        byteLength: 8,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 2,
        byteLength: 3,
      },
    ],
  };

  var gltfExternal = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: 8,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 2,
        byteLength: 3,
      },
    ],
  };

  var bufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  var bufferArrayBuffer = bufferTypedArray.buffer;

  var gltfUri = "https://example.com/model.glb";
  var gltfResource = new Resource({
    url: gltfUri,
  });
  var bufferResource = new Resource({
    url: "https://example.com/external.bin",
  });

  afterEach(function () {
    ResourceCache.clearForSpecs();
  });

  it("throws if resourceCache is undefined", function () {
    expect(function () {
      return new GltfBufferViewLoader({
        resourceCache: undefined,
        gltf: gltfExternal,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("throws if gltf is undefined", function () {
    expect(function () {
      return new GltfBufferViewLoader({
        resourceCache: ResourceCache,
        gltf: undefined,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("throws if bufferViewId is undefined", function () {
    expect(function () {
      return new GltfBufferViewLoader({
        resourceCache: ResourceCache,
        gltf: gltfExternal,
        bufferViewId: undefined,
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("throws if gltfResource is undefined", function () {
    expect(function () {
      return new GltfBufferViewLoader({
        resourceCache: ResourceCache,
        gltf: gltfExternal,
        bufferViewId: 0,
        gltfResource: undefined,
        baseResource: gltfResource,
      });
    }).toThrowDeveloperError();
  });

  it("throws if baseResource is undefined", function () {
    expect(function () {
      return new GltfBufferViewLoader({
        resourceCache: ResourceCache,
        gltf: gltfExternal,
        bufferViewId: 0,
        gltfResource: gltfResource,
        baseResource: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("rejects promise if buffer fails to load", function () {
    var error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );

    var bufferViewLoader = new GltfBufferViewLoader({
      resourceCache: ResourceCache,
      gltf: gltfExternal,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    bufferViewLoader.load();

    return bufferViewLoader.promise
      .then(function (bufferViewLoader) {
        fail();
      })
      .otherwise(function (runtimeError) {
        expect(runtimeError.message).toBe(
          "Failed to load buffer view\nFailed to load external buffer: https://example.com/external.bin\n404 Not Found"
        );
      });
  });

  it("loads buffer view for embedded buffer", function () {
    ResourceCache.loadEmbeddedBuffer({
      parentResource: gltfResource,
      bufferId: 0,
      typedArray: bufferTypedArray,
    });

    var bufferViewLoader = new GltfBufferViewLoader({
      resourceCache: ResourceCache,
      gltf: gltfEmbedded,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    bufferViewLoader.load();

    return bufferViewLoader.promise.then(function (bufferViewLoader) {
      expect(bufferViewLoader.typedArray).toEqual(new Uint8Array([7, 15, 31]));
    });
  });

  it("loads buffer view for external buffer", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(bufferArrayBuffer)
    );

    var bufferViewLoader = new GltfBufferViewLoader({
      resourceCache: ResourceCache,
      gltf: gltfExternal,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });
    bufferViewLoader.load();

    return bufferViewLoader.promise.then(function (bufferViewLoader) {
      expect(bufferViewLoader.typedArray).toEqual(new Uint8Array([7, 15, 31]));
    });
  });

  it("destroys buffer view", function () {
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.resolve(bufferArrayBuffer)
    );

    var unloadBuffer = spyOn(
      BufferLoader.prototype,
      "unload"
    ).and.callThrough();

    var bufferViewLoader = new GltfBufferViewLoader({
      resourceCache: ResourceCache,
      gltf: gltfExternal,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(bufferViewLoader.typedArray).not.toBeDefined();

    bufferViewLoader.load();

    return bufferViewLoader.promise.then(function (bufferViewLoader) {
      expect(bufferViewLoader.typedArray).toEqual(new Uint8Array([7, 15, 31]));
      expect(bufferViewLoader.isDestroyed()).toBe(false);

      bufferViewLoader.destroy();

      expect(bufferViewLoader.typedArray).not.toBeDefined();
      expect(bufferViewLoader.isDestroyed()).toBe(true);
      expect(unloadBuffer).toHaveBeenCalled();
    });
  });

  function resolveAfterDestroy(reject) {
    var deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    // Load a copy of the buffer into the cache so that the buffer promise
    // resolves even if the buffer view loader is destroyed
    var bufferLoaderCopy = ResourceCache.loadExternalBuffer({
      resource: bufferResource,
    });

    var bufferViewLoader = new GltfBufferViewLoader({
      resourceCache: ResourceCache,
      gltf: gltfExternal,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    expect(bufferViewLoader.typedArray).not.toBeDefined();

    bufferViewLoader.load();
    bufferViewLoader.destroy();

    if (reject) {
      deferredPromise.reject(new Error());
    } else {
      deferredPromise.resolve(bufferArrayBuffer);
    }

    expect(bufferViewLoader.typedArray).not.toBeDefined();
    expect(bufferViewLoader.isDestroyed()).toBe(true);

    ResourceCache.unload(bufferLoaderCopy);
  }

  it("handles resolving buffer after destroy", function () {
    resolveAfterDestroy(false);
  });

  it("handles rejecting buffer after destroy", function () {
    resolveAfterDestroy(true);
  });
});
