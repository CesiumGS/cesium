import {
  BufferLoader,
  GltfBufferViewLoader,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";

describe("Scene/GltfBufferViewLoader", function () {
  const gltfEmbedded = {
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

  const gltfExternal = {
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

  const meshoptGltfEmbedded = {
    buffers: [{ byteLength: 29 }, { byteLength: 360 }],
    bufferViews: [
      {
        buffer: 1,
        byteOffset: 96,
        byteLength: 192,
        byteStride: 8,
        target: 34962,
        extensions: {
          EXT_meshopt_compression: {
            buffer: 0,
            byteOffset: 0,
            byteLength: 124,
            byteStride: 8,
            mode: "ATTRIBUTES",
            count: 24,
          },
        },
      },
      {
        buffer: 1,
        byteOffset: 288,
        byteLength: 72,
        target: 34963,
        extensions: {
          EXT_meshopt_compression: {
            buffer: 0,
            byteOffset: 0,
            byteLength: 29,
            byteStride: 2,
            mode: "TRIANGLES",
            count: 36,
          },
        },
      },
    ],
  };

  function getBase64FromTypedArray(typedArray) {
    return btoa(String.fromCharCode.apply(null, typedArray));
  }

  function getTypedArrayFromBase64(base64) {
    return Uint8Array.from(atob(base64), function (c) {
      return c.charCodeAt(0);
    });
  }

  const fallbackPositionBufferBase64 =
    "AAD/P/8/AAD/P/8//z8AAAAA/z8AAAAA/z//PwAAAAD/P/8//z8AAAAA/z//PwAA/z8AAP8/AAAAAAAA/z8AAP8//z8AAAAA/z//P/8/AAD/PwAAAAAAAP8/AAD/PwAAAAD/PwAAAAD/P/8/AAAAAAAAAAAAAAAA/z8AAAAAAAAAAP8//z8AAAAA/z8AAAAAAAAAAP8/AAAAAAAAAAAAAAAAAAD/PwAAAAAAAAAAAAD/PwAA/z8AAP8/AAAAAAAA";
  const meshoptPositionBufferBase64 =
    "oAUZJkCZgAQAAAU/P8D/fn1+fX59fn1+fX7ADAAAfX4FAAhISEgAAAAFAAzMzH1+fX59zAAAAH59BQhAmYBmZgAABQzA/8B9fn1+fX59//8AAH59fn1+fX59AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8//z8AAA==";
  const meshoptPositionTypedArray = getTypedArrayFromBase64(
    meshoptPositionBufferBase64
  );

  const bufferTypedArray = new Uint8Array([1, 3, 7, 15, 31, 63, 127, 255]);
  const bufferArrayBuffer = bufferTypedArray.buffer;

  const gltfUri = "https://example.com/model.glb";
  const gltfResource = new Resource({
    url: gltfUri,
  });
  const bufferResource = new Resource({
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
    const error = new Error("404 Not Found");
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      when.reject(error)
    );

    const bufferViewLoader = new GltfBufferViewLoader({
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

    const bufferViewLoader = new GltfBufferViewLoader({
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

    const bufferViewLoader = new GltfBufferViewLoader({
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

    const unloadBuffer = spyOn(
      BufferLoader.prototype,
      "unload"
    ).and.callThrough();

    const bufferViewLoader = new GltfBufferViewLoader({
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

  it("decodes positions with EXT_meshopt_compression", function () {
    ResourceCache.loadEmbeddedBuffer({
      parentResource: gltfResource,
      bufferId: 0,
      typedArray: meshoptPositionTypedArray,
    });

    const bufferViewLoader = new GltfBufferViewLoader({
      resourceCache: ResourceCache,
      gltf: meshoptGltfEmbedded,
      bufferViewId: 0,
      gltfResource: gltfResource,
      baseResource: gltfResource,
    });

    bufferViewLoader.load();
    bufferViewLoader.process({});

    return bufferViewLoader.promise.then(function (bufferViewLoader) {
      const decodedPositionBase64 = getBase64FromTypedArray(
        bufferViewLoader.typedArray
      );
      expect(decodedPositionBase64).toEqual(fallbackPositionBufferBase64);
    });
  });

  function resolveAfterDestroy(reject) {
    const deferredPromise = when.defer();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      deferredPromise.promise
    );

    // Load a copy of the buffer into the cache so that the buffer promise
    // resolves even if the buffer view loader is destroyed
    const bufferLoaderCopy = ResourceCache.loadExternalBuffer({
      resource: bufferResource,
    });

    const bufferViewLoader = new GltfBufferViewLoader({
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
